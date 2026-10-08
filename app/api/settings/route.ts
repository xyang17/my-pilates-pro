import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 工作室设置。studio_setting 是个键值表，加新设置不用改表结构。
//
// 目前只有赠课规则：每满 N 节赠 M 节。两个数都由教练自己定。
export const SETTING_DEFAULTS: Record<string, string> = {
  loyalty_bonus_threshold: '20',   // 每满多少节
  loyalty_bonus_sessions: '1',     // 赠几节
  loyalty_bonus_enabled: 'true',   // 关掉就不再提醒
}

/** 读设置，缺的键用默认值补齐——这样前端永远拿得到完整的一份 */
export async function readSettings(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from('studio_setting').select('key, value')
  const out = { ...SETTING_DEFAULTS }
  ;(data || []).forEach((r: any) => {
    if (r.value !== null && r.value !== undefined) out[r.key] = String(r.value)
  })
  return out
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json(await readSettings())
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/settings —— 只更新传过来的那几个键，没传的不动
export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const rows = Object.keys(SETTING_DEFAULTS)
      .filter(k => body[k] !== undefined)
      .map(k => ({ key: k, value: String(body[k]), updated_at: new Date().toISOString() }))

    if (rows.length === 0) return NextResponse.json(await readSettings())

    const { error } = await supabaseAdmin
      .from('studio_setting')
      .upsert(rows, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(await readSettings())
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
