import { NextRequest, NextResponse } from 'next/server'
import { isStaff, supabaseAdmin } from '@/lib/db'
import { judgeCancel, periodStart, toStudioISO, hm } from '@/lib/booking'

/** 会员可为自己预约；教练与管理员可代任何会员预约。 */
function canBookFor(userId: string, role: string | null, clientId: string) {
  if (role === 'CLIENT') return userId === clientId
  return isStaff(role)
}

async function getRule(classType: 'group' | 'private') {
  const { data } = await supabaseAdmin
    .from('booking_rule').select('*').eq('class_type', classType).maybeSingle()
  return data
}

// GET /api/bookings?clientId=&scope=upcoming|past
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = new URL(req.url).searchParams
    const scope = sp.get('scope') ?? 'upcoming'
    const clientId = userRole === 'CLIENT' ? userId : (sp.get('clientId') || null)

    let q = supabaseAdmin.from('booking').select('*').order('starts_at', { ascending: scope === 'upcoming' })
    if (clientId) q = q.eq('client_id', clientId)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 补上课程与教练信息，方便前端直接渲染
    const classIds = [...new Set((data ?? []).map(b => b.class_id).filter(Boolean))]
    const trainerIds = [...new Set((data ?? []).map(b => b.trainer_id).filter(Boolean))]
    const [cls, trs] = await Promise.all([
      classIds.length
        ? supabaseAdmin.from('class').select('id, name, date, start_time, duration, class_type, trainer_id').in('id', classIds)
        : Promise.resolve({ data: [] as any[] }),
      trainerIds.length
        ? supabaseAdmin.from('user').select('id, name, email').in('id', trainerIds)
        : Promise.resolve({ data: [] as any[] }),
    ])
    const clsMap = Object.fromEntries((cls.data ?? []).map((c: any) => [c.id, c]))
    const trMap = Object.fromEntries((trs.data ?? []).map((t: any) => [t.id, t.name || t.email]))

    return NextResponse.json((data ?? []).map(b => ({
      ...b,
      class: b.class_id ? clsMap[b.class_id] ?? null : null,
      trainer_name: b.trainer_id ? trMap[b.trainer_id] ?? '' : '',
    })))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/bookings — 预约
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const clientId = body.client_id || userId
    if (!canBookFor(userId, userRole, clientId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const type = body.booking_type === 'SLOT' ? 'SLOT' : 'CLASS'

    // ─── 私教时段 ───────────────────────────────────────────
    if (type === 'SLOT') {
      const { trainer_id, starts_at, ends_at } = body
      if (!trainer_id || !starts_at || !ends_at) {
        return NextResponse.json({ error: 'trainer_id / starts_at / ends_at required' }, { status: 400 })
      }
      const rule = await getRule('private')
      const cutoffMs = Date.now() + (rule?.book_cutoff_minutes ?? 60) * 60_000
      if (new Date(starts_at).getTime() < cutoffMs) {
        return NextResponse.json({ error: '已过预约截止时间' }, { status: 409 })
      }

      const { data, error } = await supabaseAdmin.from('booking').insert({
        client_id: clientId, booking_type: 'SLOT', trainer_id,
        starts_at, ends_at, status: 'CONFIRMED',
        booking_date: new Date().toISOString(), notes: body.notes || null,
      }).select().single()

      // 唯一索引挡住并发抢同一时段
      if (error) {
        const msg = error.code === '23505' ? '这个时段刚被约走了，换一个吧' : error.message
        return NextResponse.json({ error: msg }, { status: error.code === '23505' ? 409 : 500 })
      }
      return NextResponse.json(data, { status: 201 })
    }

    // ─── 已排好的课 ─────────────────────────────────────────
    const classId = body.class_id
    if (!classId) return NextResponse.json({ error: 'class_id required' }, { status: 400 })

    const { data: cls } = await supabaseAdmin
      .from('class').select('id, date, start_time, duration, class_type, capacity, status')
      .eq('id', classId).maybeSingle()
    if (!cls) return NextResponse.json({ error: '课程不存在' }, { status: 404 })
    if (cls.status === 'completed') {
      return NextResponse.json({ error: '这节课已经结束' }, { status: 409 })
    }

    const rule = await getRule((cls.class_type as any) === 'private' ? 'private' : 'group')
    const startISO = toStudioISO(cls.date, cls.start_time || '00:00')
    if (new Date(startISO).getTime() < Date.now() + (rule?.book_cutoff_minutes ?? 30) * 60_000) {
      return NextResponse.json({ error: '已过预约截止时间' }, { status: 409 })
    }

    // 名额：booking 与既有的 class_enrollment 合并计算
    const [{ count: booked }, { count: enrolled }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('booking').select('id', { count: 'exact', head: true })
        .eq('class_id', classId).in('status', ['CONFIRMED', 'ATTENDED']),
      supabaseAdmin.from('class_enrollment').select('id', { count: 'exact', head: true })
        .eq('class_id', classId),
      supabaseAdmin.from('studio_settings').select('default_class_capacity').limit(1).maybeSingle(),
    ])
    const cap = cls.capacity ?? settings?.default_class_capacity ?? null
    const taken = (booked ?? 0) + (enrolled ?? 0)

    let status: 'CONFIRMED' | 'WAITLISTED' = 'CONFIRMED'
    let waitlistPos: number | null = null
    if (cap != null && taken >= cap) {
      if (!rule?.waitlist_enabled) {
        return NextResponse.json({ error: '这节课已满员' }, { status: 409 })
      }
      const { count: wl } = await supabaseAdmin.from('booking')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId).eq('status', 'WAITLISTED')
      if (rule.waitlist_max != null && (wl ?? 0) >= rule.waitlist_max) {
        return NextResponse.json({ error: '候补队列也满了' }, { status: 409 })
      }
      status = 'WAITLISTED'
      waitlistPos = (wl ?? 0) + 1
    }

    const endMin = (() => {
      const [h, m] = hm(cls.start_time || '00:00').split(':').map(Number)
      return h * 60 + m + (cls.duration || 60)
    })()

    const { data, error } = await supabaseAdmin.from('booking').insert({
      client_id: clientId, booking_type: 'CLASS', class_id: classId,
      trainer_id: body.trainer_id ?? null,
      starts_at: startISO,
      ends_at: toStudioISO(cls.date, `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`),
      status, waitlist_pos: waitlistPos,
      booking_date: new Date().toISOString(), notes: body.notes || null,
    }).select().single()

    if (error) {
      const msg = error.code === '23505' ? '你已经约过这节课了' : error.message
      return NextResponse.json({ error: msg }, { status: error.code === '23505' ? 409 : 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/bookings — 取消。body: { id, reason?, preview? }
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { data: bk } = await supabaseAdmin
      .from('booking').select('*').eq('id', body.id).maybeSingle()
    if (!bk) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canBookFor(userId, userRole, bk.client_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (bk.status === 'CANCELLED') {
      return NextResponse.json({ error: '这条预约已经取消过了' }, { status: 409 })
    }

    const classType = bk.booking_type === 'SLOT' ? 'private' : 'group'
    const rule = await getRule(classType)

    // 统计周期内已用掉的免费取消次数
    const since = periodStart((rule?.limit_period ?? 'MONTH') as 'WEEK' | 'MONTH')
    const { count: usedFree } = await supabaseAdmin
      .from('booking').select('id', { count: 'exact', head: true })
      .eq('client_id', bk.client_id).eq('status', 'CANCELLED')
      .eq('is_late_cancel', false)
      .gte('cancelled_at', `${since}T00:00:00+08:00`)

    const verdict = judgeCancel(
      bk.starts_at,
      {
        cancel_window_hours: rule?.cancel_window_hours ?? 12,
        free_cancel_limit: rule?.free_cancel_limit ?? null,
        limit_period: (rule?.limit_period ?? 'MONTH') as 'WEEK' | 'MONTH',
        late_cancel_deducts: rule?.late_cancel_deducts ?? true,
      },
      usedFree ?? 0,
    )

    // preview = 只问后果，不真取消。前端用它做二次确认。
    if (body.preview) return NextResponse.json({ verdict, applied: false })

    const { data, error } = await supabaseAdmin.from('booking').update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
      cancellation_reason: body.reason || null,
      is_late_cancel: verdict.isLate,
      // 扣次留到接卡时执行，这里先记结论
      deducted: false,
    }).eq('id', body.id).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 团课有人退出时，把候补第一位转正
    if (bk.class_id && bk.status === 'CONFIRMED') {
      const { data: next } = await supabaseAdmin.from('booking').select('id')
        .eq('class_id', bk.class_id).eq('status', 'WAITLISTED')
        .order('waitlist_pos').limit(1).maybeSingle()
      if (next) {
        await supabaseAdmin.from('booking')
          .update({ status: 'CONFIRMED', waitlist_pos: null }).eq('id', next.id)
      }
    }

    return NextResponse.json({ booking: data, verdict, applied: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
