import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function canAccess(requesterId: string | null, requesterRole: string | null, logId: string) {
  if (!requesterId) return { ok: false, status: 401 as const }
  const { data: log, error } = await supabaseAdmin
    .from('menstrual_cycle_log')
    .select('user_id')
    .eq('id', logId)
    .single()
  if (error || !log) return { ok: false, status: 404 as const }
  if (requesterId !== log.user_id && !isStaff(requesterRole)) return { ok: false, status: 403 as const }
  return { ok: true as const }
}

// PUT /api/cycle-logs/[id] —— 修改一条周期记录（部分更新）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const requesterId = req.headers.get('x-user-id')
    const requesterRole = req.headers.get('x-user-role')

    const check = await canAccess(requesterId, requesterRole, id)
    if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

    const body = await req.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.start_date !== undefined) updates.start_date = body.start_date
    if (body.end_date   !== undefined) updates.end_date   = body.end_date || null
    if (body.flow_level !== undefined) updates.flow_level = body.flow_level || null
    if (body.pain_level !== undefined) updates.pain_level = body.pain_level || null
    if (body.notes      !== undefined) updates.notes      = body.notes || null

    const { data, error } = await supabaseAdmin
      .from('menstrual_cycle_log')
      .update(updates)
      .eq('id', id)
      .select('id, start_date, end_date, flow_level, pain_level, notes, recorded_by, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/cycle-logs/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const requesterId = req.headers.get('x-user-id')
    const requesterRole = req.headers.get('x-user-role')

    const check = await canAccess(requesterId, requesterRole, id)
    if (!check.ok) return NextResponse.json({ error: 'Forbidden' }, { status: check.status })

    const { error } = await supabaseAdmin.from('menstrual_cycle_log').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
