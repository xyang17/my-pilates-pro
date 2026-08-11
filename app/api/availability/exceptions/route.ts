import { NextRequest, NextResponse } from 'next/server'
import { canManageTrainer, supabaseAdmin } from '@/lib/db'

// 排班例外：某天临时停排（教练请假）或常规排班外临时加开。
// start_time 为空表示整天。

// POST /api/availability/exceptions
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
    if (!body.date || !body.kind) {
      return NextResponse.json({ error: 'date / kind required' }, { status: 400 })
    }
    if (body.kind === 'EXTRA' && (!body.start_time || !body.end_time)) {
      return NextResponse.json({ error: '临时加开必须填起止时间' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('trainer_availability_exception')
      .insert({
        trainer_id: trainerId,
        date: body.date,
        kind: body.kind,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        reason: body.reason || null,
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/availability/exceptions?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('trainer_availability_exception').select('trainer_id').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageTrainer(userId, userRole, row.trainer_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('trainer_availability_exception').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
