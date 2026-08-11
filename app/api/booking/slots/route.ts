import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { addDays, expandOpenSlots, hm, type BusyInterval } from '@/lib/booking'

// GET /api/booking/slots?trainerId=xxx&from=YYYY-MM-DD&days=7
// 返回该教练在这段时间内还能被约的私教空档。
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = new URL(req.url).searchParams
    const trainerId = sp.get('trainerId')
    if (!trainerId) return NextResponse.json({ error: 'trainerId required' }, { status: 400 })

    const from = sp.get('from') || new Date().toISOString().slice(0, 10)
    const days = Math.min(Number(sp.get('days') ?? 14), 60)
    const to = addDays(from, days - 1)

    const [rulesRes, excRes, ruleRow, slotBookings, trainerClasses] = await Promise.all([
      supabaseAdmin.from('trainer_availability').select('*')
        .eq('trainer_id', trainerId).eq('is_active', true),
      supabaseAdmin.from('trainer_availability_exception').select('*')
        .eq('trainer_id', trainerId).gte('date', from).lte('date', to),
      supabaseAdmin.from('booking_rule').select('*').eq('class_type', 'private').maybeSingle(),
      // 已被约走的私教时段
      supabaseAdmin.from('booking').select('starts_at, ends_at')
        .eq('trainer_id', trainerId).eq('booking_type', 'SLOT')
        .in('status', ['CONFIRMED', 'ATTENDED'])
        .gte('starts_at', `${from}T00:00:00+08:00`),
      // 教练已经要带的课，同样不能再被约私教
      supabaseAdmin.from('class').select('date, start_time, duration')
        .eq('trainer_id', trainerId).gte('date', from).lte('date', to),
    ])

    if (rulesRes.error) return NextResponse.json({ error: rulesRes.error.message }, { status: 500 })

    const busy: BusyInterval[] = []
    for (const b of slotBookings.data ?? []) {
      const s = new Date(b.starts_at), e = new Date(b.ends_at)
      const iso = (d: Date) => new Date(d.getTime() + 8 * 3600_000).toISOString()
      busy.push({
        date: iso(s).slice(0, 10),
        start_time: iso(s).slice(11, 16),
        end_time: iso(e).slice(11, 16),
      })
    }
    for (const c of trainerClasses.data ?? []) {
      if (!c.start_time) continue
      const [h, m] = hm(c.start_time).split(':').map(Number)
      const endMin = h * 60 + m + (c.duration || 60)
      busy.push({
        date: c.date,
        start_time: hm(c.start_time),
        end_time: `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
      })
    }

    const rule = ruleRow.data
    const slots = expandOpenSlots({
      rules: (rulesRes.data ?? []) as any,
      exceptions: (excRes.data ?? []) as any,
      busy,
      from, to,
      openDays: rule?.book_open_days ?? 14,
      cutoffMinutes: rule?.book_cutoff_minutes ?? 60,
    })

    return NextResponse.json({ slots, rule })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
