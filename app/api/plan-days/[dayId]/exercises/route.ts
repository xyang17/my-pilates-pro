import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/plan-days/[dayId]/exercises — add exercise to day
export async function POST(req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  try {
    const { dayId } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { master_exercise_id, sets, reps, weight, weight_unit, duration_sec, rest_sec, notes } = body

    const { data: existing } = await supabaseAdmin
      .from('training_plan_exercise').select('order_num').eq('plan_day_id', dayId).order('order_num', { ascending: false }).limit(1)
    const order_num = existing?.[0]?.order_num !== undefined ? existing[0].order_num + 1 : 0

    const { data, error } = await supabaseAdmin
      .from('training_plan_exercise')
      .insert({
        plan_day_id: dayId,
        master_exercise_id: master_exercise_id || null,
        sets, reps,
        weight: weight || null,
        weight_unit: weight_unit || 'kg',
        duration_sec: duration_sec || null,
        rest_sec: rest_sec || null,
        notes: notes || null,
        order_num,
      })
      .select('*, master_exercise(id, name_cn, name_en, category)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
