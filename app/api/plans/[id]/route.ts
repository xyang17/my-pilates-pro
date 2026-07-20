import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/plans/[id] — full plan with days + exercises
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: plan, error } = await supabaseAdmin
      .from('training_plan')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    const { data: days } = await supabaseAdmin
      .from('training_plan_day')
      .select('*')
      .eq('plan_id', id)
      .order('order_num')

    const dayIds = (days || []).map((d: any) => d.id)
    let exercises: any[] = []
    if (dayIds.length > 0) {
      const { data: exData } = await supabaseAdmin
        .from('training_plan_exercise')
        .select('*, master_exercise(id, name_cn, name_en, category, series_cn, series_en)')
        .in('plan_day_id', dayIds)
        .order('order_num')
      exercises = exData || []
    }

    const daysWithExercises = (days || []).map((d: any) => ({
      ...d,
      exercises: exercises.filter((e: any) => e.plan_day_id === d.id),
    }))

    return NextResponse.json({ ...plan, days: daysWithExercises })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/plans/[id] — update plan metadata
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, description, goal, level, duration_desc, is_published, cover_image_url } = body

    const { data, error } = await supabaseAdmin
      .from('training_plan')
      .update({ title, description, goal, level, duration_desc, is_published, cover_image_url })
      .eq('id', id)
      .eq('trainer_id', userId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/plans/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabaseAdmin
      .from('training_plan')
      .delete()
      .eq('id', id)
      .eq('trainer_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
