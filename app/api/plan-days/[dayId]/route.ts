import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/plan-days/[dayId] — rename/update day
export async function PUT(req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  try {
    const { dayId } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { label, notes } = await req.json()
    const { data, error } = await supabaseAdmin
      .from('training_plan_day')
      .update({ label, notes })
      .eq('id', dayId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/plan-days/[dayId]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  try {
    const { dayId } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('training_plan_day')
      .delete()
      .eq('id', dayId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
