import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Add exercise to class
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classId = params.id
    const {
      exerciseId,
      sets,
      reps,
      weight,
      weightUnit,
      duration,
      durationUnit,
      instanceNotes,
      order,
    } = await req.json()

    if (!exerciseId) {
      return NextResponse.json({ error: 'Exercise ID is required' }, { status: 400 })
    }

    // Verify class ownership
    const { data: classData } = await supabaseAdmin
      .from('class')
      .select('created_by')
      .eq('id', classId)
      .single()

    if (classData?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get max order
    const { data: maxOrderData } = await supabaseAdmin
      .from('class_exercise_instance')
      .select('"order"')
      .eq('class_id', classId)
      .order('order', { ascending: false })
      .limit(1)

    const nextOrder = (maxOrderData?.[0]?.order || 0) + 1

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
      .insert([
        {
          class_id: classId,
          exercise_id: exerciseId,
          sets,
          reps,
          weight,
          weight_unit: weightUnit || 'kg',
          duration,
          duration_unit: durationUnit || 'minutes',
          instance_notes: instanceNotes,
          order: order ?? nextOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
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

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: List exercises in class
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
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
        created_at,
        master_exercise (
          id,
          name_en,
          name_cn,
          description,
          instructions,
          image_url
        )
      `)
      .eq('class_id', classId)
      .order('"order"', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
