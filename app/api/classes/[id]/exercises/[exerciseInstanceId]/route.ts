import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT: Update exercise in class
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; exerciseInstanceId: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classId = params.id
    const exerciseInstanceId = params.exerciseInstanceId

    const { sets, reps, weight, weightUnit, duration, durationUnit, instanceNotes, order: orderVal } =
      await req.json()

    // Verify class ownership
    const { data: classData } = await supabaseAdmin
      .from('class')
      .select('created_by')
      .eq('id', classId)
      .single()

    if (classData?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {
      sets,
      reps,
      weight,
      weight_unit: weightUnit,
      duration,
      duration_unit: durationUnit,
      instance_notes: instanceNotes,
      updated_at: new Date().toISOString(),
    }

    if (orderVal !== undefined) {
      updateData.order = orderVal
    }

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
      .update(updateData)
      .eq('id', exerciseInstanceId)
      .eq('class_id', classId)
      .select(`
        id,
        class_id,
        exercise_id,
        sets,
        reps,
        weight,
        weight_unit,
        duration,
        duration_unit,
        order,
        instance_notes,
        master_exercise (
          id,
          name_en,
          name_cn,
          description,
          instructions,
          image_url
        )
      `)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Remove exercise from class
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; exerciseInstanceId: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classId = params.id
    const exerciseInstanceId = params.exerciseInstanceId

    // Verify class ownership
    const { data: classData } = await supabaseAdmin
      .from('class')
      .select('created_by')
      .eq('id', classId)
      .single()

    if (classData?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('class_exercise_instance')
      .delete()
      .eq('id', exerciseInstanceId)
      .eq('class_id', classId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
