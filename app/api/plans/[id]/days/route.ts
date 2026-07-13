import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/plans/[id]/days — add a training day
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: planId } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { label, notes, order_num } = await req.json()
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })

    // Verify trainer owns this plan
    const { data: plan } = await supabaseAdmin
      .from('training_plan').select('trainer_id').eq('id', planId).single()
    if (!plan || plan.trainer_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current max order_num if not provided
    let orderNum = order_num
    if (orderNum === undefined) {
      const { data: existing } = await supabaseAdmin
        .from('training_plan_day').select('order_num').eq('plan_id', planId).order('order_num', { ascending: false }).limit(1)
      orderNum = existing?.[0]?.order_num !== undefined ? existing[0].order_num + 1 : 0
    }

    const { data, error } = await supabaseAdmin
      .from('training_plan_day')
      .insert({ plan_id: planId, label, notes: notes || null, order_num: orderNum })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ...data, exercises: [] }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
