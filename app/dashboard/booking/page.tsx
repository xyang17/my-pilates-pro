'use client'

// ============================================================
// 约课 —— 会员挑教练的空档预约私教
//
// 本阶段只做私教时段预约。团课仍走原来的报名流程（教练把学员加进课里），
// 两套名单是否合并留待后续决定。
//
// 文案面向会员，一律说人话。
// ============================================================

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface Trainer { id: string; name: string; email?: string; photo_url?: string; bio?: string }
interface OpenSlot { date: string; start_time: string; end_time: string; starts_at: string; ends_at: string }
interface Booking {
  id: string
  client_id: string
  booking_type: 'CLASS' | 'SLOT'
  trainer_id: string | null
  trainer_name?: string
  starts_at: string
  ends_at: string
  status: string
  is_late_cancel: boolean
  class?: { name: string; date: string; start_time: string } | null
}
interface Client { id: string; name: string; email: string }

const WEEK_ZH = ['日', '一', '二', '三', '四', '五', '六']
const DAYS_AHEAD = 14

export default function BookingPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [trainerId, setTrainerId] = useState('')
  const [slots, setSlots] = useState<OpenSlot[]>([])
  const [rule, setRule] = useState<any>(null)
  const [activeDate, setActiveDate] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [bookFor, setBookFor] = useState('')          // 教练代会员约时的目标会员
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const isStaff = userRole === 'TRAINER' || userRole === 'ADMIN'
  const headers = useMemo(
    () => ({ 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }),
    [user?.id, userRole],
  )

  // 未来 14 天
  const dates = useMemo(() => {
    const out: string[] = []
    const d = new Date()
    for (let i = 0; i < DAYS_AHEAD; i++) {
      out.push(new Date(d.getTime() + i * 864e5).toISOString().slice(0, 10))
    }
    return out
  }, [])

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user && userRole) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, authLoading])

  const init = async () => {
    setActiveDate(dates[0])
    const reqs: Promise<Response>[] = [
      fetch('/api/trainers', { headers }),
      fetch('/api/bookings?scope=upcoming', { headers }),
    ]
    if (isStaff) reqs.push(fetch('/api/clients', { headers }))

    const [tRes, bRes, cRes] = await Promise.all(reqs)
    if (tRes.ok) {
      const list: Trainer[] = await tRes.json()
      setTrainers(list)
      if (list.length) { setTrainerId(list[0].id); loadSlots(list[0].id) }
    }
    if (bRes.ok) setBookings(await bRes.json())
    if (cRes?.ok) setClients(await cRes.json())
    setLoading(false)
  }

  const loadSlots = async (tid: string) => {
    const res = await fetch(
      `/api/booking/slots?trainerId=${tid}&from=${dates[0]}&days=${DAYS_AHEAD}`, { headers })
    if (res.ok) { const d = await res.json(); setSlots(d.slots); setRule(d.rule) }
  }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200) }

  const pickTrainer = async (tid: string) => {
    setTrainerId(tid); setSlots([]); await loadSlots(tid)
  }

  const book = async (slot: OpenSlot) => {
    const targetClient = isStaff ? bookFor : user!.id
    if (isStaff && !targetClient) { flash('请先选择要给哪位会员约'); return }

    const who = isStaff ? (clients.find(c => c.id === targetClient)?.name ?? '该会员') : '你'
    if (!confirm(`确认为${isStaff ? ' ' + who + ' ' : ''}预约 ${slot.date} ${slot.start_time}–${slot.end_time}？`)) return

    setBusy(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_type: 'SLOT', trainer_id: trainerId,
          starts_at: slot.starts_at, ends_at: slot.ends_at,
          client_id: targetClient,
        }),
      })
      if (!res.ok) { flash((await res.json()).error || '预约失败'); return }
      flash('预约成功')
      await Promise.all([loadSlots(trainerId), reloadBookings()])
    } finally { setBusy(false) }
  }

  const reloadBookings = async () => {
    const res = await fetch('/api/bookings?scope=upcoming', { headers })
    if (res.ok) setBookings(await res.json())
  }

  const cancel = async (b: Booking) => {
    // 先问后果，再让用户确认 —— 超时取消会扣课时，不能悄悄执行
    const pre = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, preview: true }),
    })
    if (!pre.ok) { flash((await pre.json()).error || '操作失败'); return }
    const { verdict } = await pre.json()
    if (!confirm(`${verdict.message}\n\n确定取消这次预约吗？`)) return

    setBusy(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: b.id }),
      })
      if (!res.ok) { flash((await res.json()).error || '取消失败'); return }
      flash('已取消')
      await Promise.all([reloadBookings(), trainerId ? loadSlots(trainerId) : Promise.resolve()])
    } finally { setBusy(false) }
  }

  // ── 样式 ──
  const card = {
    background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
    borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)',
  } as const
  const h3 = {
    fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)',
    margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--c-border)',
  } as const

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  const daySlots = slots.filter(s => s.date === activeDate)
  const fmt = (iso: string) => {
    const d = new Date(iso)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK_ZH[d.getDay()]} ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>约课</div>
        <div style={{ width: 60 }} />
      </header>

      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'var(--c-text-primary)', color: '#fff', padding: '8px 18px',
          borderRadius: 20, fontSize: 13, maxWidth: '86%', textAlign: 'center',
        }}>{toast}</div>
      )}

      <main style={{ padding: 'var(--sp-4)', maxWidth: 720, margin: '0 auto' }}>

        {/* 教练代约时，先选会员 */}
        {isStaff && (
          <div style={card}>
            <h3 style={h3}>给谁约</h3>
            <select value={bookFor} onChange={e => setBookFor(e.target.value)}
              style={{
                width: '100%', padding: '9px 10px', border: '1px solid var(--c-border)',
                borderRadius: 6, fontSize: 14, background: 'var(--c-card-bg)',
                color: 'var(--c-text-primary)', boxSizing: 'border-box',
              }}>
              <option value="">请选择会员…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
            </select>
          </div>
        )}

        {/* 选教练 */}
        <div style={card}>
          <h3 style={h3}>选教练</h3>
          {trainers.length === 0 ? (
            <div style={{ fontSize: 13, color: '#bbb', padding: '10px 0' }}>暂无可约教练</div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {trainers.map(t => {
                const on = t.id === trainerId
                return (
                  <button key={t.id} onClick={() => pickTrainer(t.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--c-brand)' : 'var(--c-border)'}`,
                    background: on ? 'var(--c-fill-light)' : 'var(--c-card-bg)',
                    color: on ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                    fontSize: 13, fontWeight: on ? 600 : 400,
                  }}>
                    {t.photo_url
                      ? <img src={t.photo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      : <span style={{
                          width: 24, height: 24, borderRadius: '50%', background: 'var(--c-lavender)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#fff',
                        }}>{(t.name || 'T')[0]}</span>}
                    {t.name || t.email}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 日期 + 空档 */}
        <div style={card}>
          <h3 style={h3}>选时间</h3>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
            {dates.map((d, i) => {
              const on = d === activeDate
              const count = slots.filter(s => s.date === d).length
              const dt = new Date(`${d}T12:00:00`)
              return (
                <button key={d} onClick={() => setActiveDate(d)} style={{
                  flexShrink: 0, minWidth: 56, padding: '8px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${on ? 'var(--c-brand)' : 'var(--c-border)'}`,
                  background: on ? 'var(--c-brand)' : 'var(--c-card-bg)',
                  color: on ? '#fff' : 'var(--c-text-secondary)',
                }}>
                  <div style={{ fontSize: 10.5 }}>{i === 0 ? '今天' : `周${WEEK_ZH[dt.getDay()]}`}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, margin: '2px 0' }}>{dt.getDate()}</div>
                  <div style={{ fontSize: 9.5, opacity: on ? 0.9 : 0.6 }}>
                    {count > 0 ? `${count} 档` : '—'}
                  </div>
                </button>
              )
            })}
          </div>

          {daySlots.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#bbb', fontSize: 13, lineHeight: 1.7 }}>
              这一天没有可约的时段<br />
              <span style={{ fontSize: 11.5, color: '#ccc' }}>换个日期看看，或联系教练加开</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
              {daySlots.map(s => (
                <button key={s.starts_at} onClick={() => book(s)} disabled={busy} style={{
                  padding: '11px 6px', borderRadius: 8, cursor: busy ? 'not-allowed' : 'pointer',
                  border: '1px solid var(--c-border-em)', background: 'var(--c-fill-light)',
                  color: 'var(--c-text-primary)', fontSize: 13, fontWeight: 500,
                }}>
                  {s.start_time}–{s.end_time}
                </button>
              ))}
            </div>
          )}

          {rule && (
            <div style={{ fontSize: 10.5, color: '#b0b0b0', marginTop: 14, lineHeight: 1.6 }}>
              最多可提前 {rule.book_open_days} 天预约，开始前 {rule.book_cutoff_minutes} 分钟截止。
              提前 {rule.cancel_window_hours} 小时以上取消不扣课时
              {rule.free_cancel_limit != null && `，每${rule.limit_period === 'WEEK' ? '周' : '月'}最多 ${rule.free_cancel_limit} 次`}。
            </div>
          )}
        </div>

        {/* 我的预约 */}
        <div style={card}>
          <h3 style={h3}>{isStaff ? '即将到来的预约' : '我的预约'}</h3>
          {bookings.filter(b => b.status !== 'CANCELLED').length === 0 ? (
            <div style={{ padding: '18px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>还没有预约</div>
          ) : bookings.filter(b => b.status !== 'CANCELLED').map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderTop: '1px solid var(--c-border)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--c-text-primary)', fontWeight: 500 }}>
                  {b.booking_type === 'SLOT' ? '私教' : b.class?.name || '课程'}
                  {b.trainer_name && <span style={{ color: '#aaa', fontWeight: 400 }}> · {b.trainer_name}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {fmt(b.starts_at)}
                  {b.status === 'WAITLISTED' && <span style={{ color: '#a06030', marginLeft: 6 }}>候补中</span>}
                </div>
              </div>
              <button onClick={() => cancel(b)} disabled={busy} style={{
                padding: '5px 12px', border: '1px solid #e0c0c0', borderRadius: 6,
                background: 'transparent', color: '#c05050', cursor: 'pointer', fontSize: 12,
              }}>取消</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
