import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 课时包。
//
// 剩余节数不存计数器，统一从 package_balance 视图读——那里是「数已完成的课」算出来的，
// 删课改课之后自动跟着对。任何地方都不要自己再算一遍剩余，不然迟早对不上。

// GET /api/packages?clientId=xxx —— 某个学员的所有课时包（含余额）
// 不传 clientId：教练看全部（用于总览）
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const clientId = req.nextUrl.searchParams.get('clientId')

    // 学员只能看自己的
    if (!isStaff(userRole) && clientId && clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabaseAdmin
      .from('package_balance')
      .select('*')
      .order('purchased_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    else if (!isStaff(userRole)) query = query.eq('client_id', userId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/packages —— 新建课时包（教练/管理员）
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(userRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const num = (v: any, fallback = 0) => {
      const n = Number(v)
      return Number.isFinite(n) ? n : fallback
    }

    if (!body.client_id) {
      return NextResponse.json({ error: '缺少学员' }, { status: 400 })
    }

    const total = Math.max(0, Math.floor(num(body.total_sessions)))
    const bonus = Math.max(0, Math.floor(num(body.bonus_sessions)))
    if (total + bonus <= 0) {
      return NextResponse.json({ error: '节数至少要有 1 节' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('session_package')
      .insert([{
        client_id: body.client_id,
        created_by: userId,
        total_sessions: total,
        bonus_sessions: bonus,
        price: body.price === '' || body.price == null ? null : num(body.price),
        source: body.source === 'loyalty' ? 'loyalty' : 'purchase',
        purchased_at: body.purchased_at || new Date().toISOString().slice(0, 10),
        expires_at: body.expires_at || null,
        notes: body.notes || null,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 返回带余额的那份，前端拿到就能直接显示剩余
    const { data: withBalance } = await supabaseAdmin
      .from('package_balance').select('*').eq('id', data.id).single()

    return NextResponse.json(withBalance || data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
