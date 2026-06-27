import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/homework — list homework for current user
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let query = supabaseAdmin
      .from('homework')
      .select(`
        *,
        class:class_id(id, name, date, discipline),
        homework_exercise(
          id, sets, reps, weight, weight_unit, duration, duration_unit, notes, order_num,
          master_exercise:exercise_id(id, name_cn, name_en, featured_image_url, type_cn, type_en)
        )
      `)
      .order('created_at', { ascending: false })

    if (userRole === 'ADMIN' || userRole === 'TRAINER') {
      query = query.eq('created_by', userId)
    } else {
      query = query.eq('student_id', userId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/homework — create homework assignment
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { class_id, student_id, title, due_date, notes, exercises } = body

    if (!student_id || !title || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create homework record
    const { data: hw, error: hwErr } = await supabaseAdmin
      .from('homework')
      .insert([{ class_id: class_id || null, student_id, created_by: userId, title, due_date: due_date || null, notes: notes || null }])
      .select()
      .single()

    if (hwErr) return NextResponse.json({ error: hwErr.message }, { status: 400 })

    // Insert exercises
    const exRows = exercises.map((ex: any) => ({
      homework_id: hw.id,
      exercise_id: ex.exercise_id,
      class_instance_id: ex.class_instance_id || null,
      sets: ex.sets || null,
      reps: ex.reps || null,
      weight: ex.weight || null,
      weight_unit: ex.weight_unit || 'kg',
      duration: ex.duration || null,
      duration_unit: ex.duration_unit || 'minutes',
      notes: ex.notes || null,
      order_num: ex.order_num || 1,
    }))

    const { error: exErr } = await supabaseAdmin.from('homework_exercise').insert(exRows)
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 })

    return NextResponse.json(hw, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
