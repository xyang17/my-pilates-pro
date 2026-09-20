import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'
import { generatePeriodForecasts } from '@/lib/notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/notifications —— 自己的站内消息
//
// 顺带按需生成「生理期预测」类消息：这类消息没有触发事件，
// 与其挂个定时任务，不如在教练打开消息的时候现算一遍。
// 重复生成由 dedupe_key 的唯一索引挡住。
// ?count=1 只要未读数（导航小红点用，不跑生成逻辑，省一次开销）
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const countOnly = req.nextUrl.searchParams.get('count') === '1'

    if (countOnly) {
      const { count, error } = await supabaseAdmin
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ unread: count || 0 })
    }

    if (isStaff(userRole)) {
      // 生成失败不该让整个消息页打不开
      try { await generatePeriodForecasts(userId) }
      catch (e: any) { console.error('[notifications] forecast failed:', e?.message) }
    }

    const { data, error } = await supabaseAdmin
      .from('notification')
      .select('id, type, title, body, link, related_user_id, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const list = data || []
    return NextResponse.json({
      notifications: list,
      unread: list.filter(n => !n.read_at).length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/notifications —— 全部标记已读
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabaseAdmin
      .from('notification')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
