import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/plan-exercises/[exId]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ exId: string }> }) {
  try {
    const { exId } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { sets, reps, weight, weight_unit, duration_sec, rest_sec, notes } = body

    const { data, error } = await supabaseAdmin
      .from('training_plan_exercise')
      .update({ sets, reps, weight: weight || null, weight_unit: weight_unit || 'kg', duration_sec, rest_sec, notes })
      .eq('id', exId)
      .select('*, master_exercise(id, name_cn, name_en)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/plan-exercises/[exId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ exId: string }> }) {
  try {
    const { exId } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('training_plan_exercise')
      .delete()
      .eq('id', exId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
