import { NextRequest, NextResponse } from 'next/server'
import { inheritHeight, sanitizeL0Payload, supabaseAdmin } from '@/lib/l0-server'

// GET /api/l0/metrics?clientId=xxx&limit=100
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500)

    // 读视图而非表，以便一并拿到 age_at_measurement 与 HRmax
    let query = supabaseAdmin
      .from('l0_body_metric_full')
      .select('*')
      .order('measured_at', { ascending: false })
      .limit(limit)

    if (userRole === 'CLIENT') query = query.eq('client_id', userId)
    else if (clientId) query = query.eq('client_id', clientId)
    else query = query.eq('recorded_by', userId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 列表页需要会员姓名
    const ids = [...new Set((data || []).map((r: any) => r.client_id))]
    const nameMap: Record<string, string> = {}
    if (ids.length) {
      const { data: users } = await supabaseAdmin
        .from('user').select('id, name, email').in('id', ids)
      for (const u of users || []) nameMap[u.id] = u.name || u.email
    }

    return NextResponse.json((data || []).map((r: any) => ({
      ...r, client_name: nameMap[r.client_id] || '',
    })))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/l0/metrics — 新建一次测量记录
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const clientId = body.client_id
    if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

    const payload = sanitizeL0Payload(body)
    await inheritHeight(clientId, payload)

    const { data, error } = await supabaseAdmin
      .from('l0_body_metric')
      .insert({ ...payload, client_id: clientId, recorded_by: userId })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 回读视图，让前端一次拿到派生值与 HRmax
    const { data: full } = await supabaseAdmin
      .from('l0_body_metric_full').select('*').eq('id', data.id).single()

    return NextResponse.json(full ?? data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
