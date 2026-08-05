import { NextRequest, NextResponse } from 'next/server'
import { canWriteClientData, supabaseAdmin } from '@/lib/l0-server'

// B22 运动禁忌。框架定位：动作库的硬过滤条件，而非仅作展示。
const WRITABLE = [
  'body_region', 'side', 'condition_type', 'severity', 'status',
  'onset_date', 'resolved_date', 'description', 'avoid_patterns',
]

// POST /api/l0/contraindications
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const targetUser = body.user_id
    if (!targetUser) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    if (!canWriteClientData(userId, userRole, targetUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!body.body_region) return NextResponse.json({ error: 'body_region required' }, { status: 400 })

    const payload: Record<string, any> = { user_id: targetUser, recorded_by: userId }
    for (const k of WRITABLE) if (k in body) payload[k] = body[k] === '' ? null : body[k]

    const { data, error } = await supabaseAdmin
      .from('client_contraindication').insert(payload).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/l0/contraindications  body: { id, ...fields }
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('client_contraindication').select('user_id').eq('id', body.id).single()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canWriteClientData(userId, userRole, row.user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload: Record<string, any> = {}
    for (const k of WRITABLE) if (k in body) payload[k] = body[k] === '' ? null : body[k]

    const { data, error } = await supabaseAdmin
      .from('client_contraindication').update(payload).eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/l0/contraindications?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('client_contraindication').select('user_id').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canWriteClientData(userId, userRole, row.user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.from('client_contraindication').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
