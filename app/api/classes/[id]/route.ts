import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Get single class with exercises
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = params.id

    // Get class
    const { data: classData, error: classError } = await supabaseAdmin
      .from('class')
      .select('*')
      .eq('id', classId)
      .single()

    if (classError) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get exercises in class
    const { data: exercises, error: exercisesError } = await supabaseAdmin
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
        updated_at,
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

    if (exercisesError) {
      return NextResponse.json({ error: exercisesError.message }, { status: 400 })
    }

    return NextResponse.json({
      ...classData,
      exercises: exercises || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update class
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classId = params.id
    const { name, date, duration, type, assignedTo, notes, feedback, status } =
      await req.json()

    // Verify ownership
    const { data: classData } = await supabaseAdmin
      .from('class')
      .select('created_by')
      .eq('id', classId)
      .single()

    if (classData?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('class')
      .update({
        name,
        date,
        duration,
        type,
        assigned_to: assignedTo,
        notes,
        feedback,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', classId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
