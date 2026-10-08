import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/packages/[id] —— 改课时包（部分更新，只改传了的字段）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    // 部分更新：没传的字段一律不碰。
    // 全量覆盖会把没填的字段清空，这个坑这个项目踩过（动作库导入覆盖数据那次）。
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const int = (v: any) => Math.max(0, Math.floor(Number(v) || 0))

    if (body.total_sessions !== undefined) updates.total_sessions = int(body.total_sessions)
    if (body.bonus_sessions !== undefined) updates.bonus_sessions = int(body.bonus_sessions)
    if (body.price          !== undefined) updates.price = body.price === '' || body.price == null ? null : Number(body.price)
    if (body.purchased_at   !== undefined) updates.purchased_at = body.purchased_at
    if (body.expires_at     !== undefined) updates.expires_at = body.expires_at || null
    if (body.status         !== undefined) updates.status = body.status
    if (body.notes          !== undefined) updates.notes = body.notes || null

    const { error } = await supabaseAdmin
      .from('session_package').update(updates).eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('package_balance').select('*').eq('id', id).single()

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/packages/[id]
//
// 包删了，挂在它上面的课不能跟着没——数据库那边是 ON DELETE SET NULL，
// 那些课会退回「单次付费」。所以这里先告诉前端会影响几节课，让教练心里有数。
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    const { count } = await supabaseAdmin
      .from('class')
      .select('id', { count: 'exact', head: true })
      .eq('package_id', id)

    const { error } = await supabaseAdmin.from('session_package').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, unlinked_classes: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
