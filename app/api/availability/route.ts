import { NextRequest, NextResponse } from 'next/server'
import { canManageTrainer, supabaseAdmin } from '@/lib/db'

// 教练每周可约时段。会员端要靠它算出「哪些空档能约」，所以读取对所有登录用户开放。
const WRITABLE = ['weekday', 'start_time', 'end_time', 'slot_minutes',
  'effective_from', 'effective_to', 'is_active']

// GET /api/availability?trainerId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = new URL(req.url).searchParams.get('trainerId')
    if (!trainerId) return NextResponse.json({ error: 'trainerId required' }, { status: 400 })

    const [{ data: slots, error: e1 }, { data: exceptions, error: e2 }] = await Promise.all([
      supabaseAdmin.from('trainer_availability').select('*')
        .eq('trainer_id', trainerId).order('weekday').order('start_time'),
      supabaseAdmin.from('trainer_availability_exception').select('*')
        .eq('trainer_id', trainerId)
        .gte('date', new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10))
        .order('date'),
    ])
    if (e1 || e2) return NextResponse.json({ error: (e1 || e2)!.message }, { status: 500 })

    return NextResponse.json({ slots: slots ?? [], exceptions: exceptions ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/availability — 新增一个可约时段
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const trainerId = body.trainer_id || userId
    if (!canManageTrainer(userId, userRole, trainerId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (body.weekday == null || !body.start_time || !body.end_time) {
      return NextResponse.json({ error: 'weekday / start_time / end_time required' }, { status: 400 })
    }
    if (body.end_time <= body.start_time) {
      return NextResponse.json({ error: '结束时间必须晚于开始时间' }, { status: 400 })
    }

    // 同一天的时段不允许重叠，否则展开成可约空档时会算重
    const { data: existing } = await supabaseAdmin
      .from('trainer_availability').select('id, start_time, end_time')
      .eq('trainer_id', trainerId).eq('weekday', body.weekday).eq('is_active', true)
    const overlap = (existing ?? []).some(
      (s: any) => body.start_time < s.end_time && body.end_time > s.start_time)
    if (overlap) {
      return NextResponse.json({ error: '与已有时段重叠，请先调整或删除原时段' }, { status: 409 })
    }

    const payload: Record<string, any> = { trainer_id: trainerId }
    for (const k of WRITABLE) if (k in body) payload[k] = body[k] === '' ? null : body[k]

    const { data, error } = await supabaseAdmin
      .from('trainer_availability').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/availability  body: { id, ...fields }
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('trainer_availability').select('trainer_id').eq('id', body.id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageTrainer(userId, userRole, row.trainer_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload: Record<string, any> = {}
    for (const k of WRITABLE) if (k in body) payload[k] = body[k] === '' ? null : body[k]

    const { data, error } = await supabaseAdmin
      .from('trainer_availability').update(payload).eq('id', body.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/availability?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('trainer_availability').select('trainer_id').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageTrainer(userId, userRole, row.trainer_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.from('trainer_availability').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
