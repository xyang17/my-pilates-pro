'use client'

// ============================================================
// 教练排班 —— 设置每周可被约的时段
//
// 会员端的「约TA」就是从这里展开出来的：
//   每周固定时段 − 临时停排 + 临时加开 − 已被约走的 = 会员能看到的空档
// ============================================================

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'

interface Slot {
  id: string
  trainer_id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
}

interface Exception {
  id: string
  trainer_id: string
  date: string
  kind: 'OFF' | 'EXTRA'
  start_time: string | null
  end_time: string | null
  reason: string | null
}

interface Trainer { id: string; name: string; email: string; role?: string }

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const SLOT_OPTIONS = [30, 45, 60, 90]

export default function AvailabilityPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [slots, setSlots] = useState<Slot[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [targetId, setTargetId] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // 新增时段的草稿，按星期几各存一份
  const [draft, setDraft] = useState<Record<number, { start: string; end: string; slot: number }>>({})
  // 临时调整草稿
  const [excDraft, setExcDraft] = useState({
    date: '', kind: 'OFF' as 'OFF' | 'EXTRA', start_time: '', end_time: '', reason: '',
  })

  const isAdmin = userRole === 'ADMIN'
  const isStaff = userRole === 'ADMIN' || userRole === 'TRAINER'
  const headers = useMemo(
    () => ({ 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }),
    [user?.id, userRole],
  )

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (!authLoading && user && !isStaff) { router.push('/dashboard'); return }
    if (user && userRole && isStaff) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, authLoading])

  const init = async () => {
    let tid = user!.id
    if (isAdmin) {
      const res = await fetch('/api/trainers', { headers })
      if (res.ok) {
        const list: Trainer[] = await res.json()
        setTrainers(list)
        // 管理员默认看自己；自己不在教练列表里就看第一个
        tid = list.some(t => t.id === user!.id) ? user!.id : (list[0]?.id ?? user!.id)
      }
    }
    setTargetId(tid)
    await load(tid)
    setLoading(false)
  }

  const load = async (tid: string) => {
    const res = await fetch(`/api/availability?trainerId=${tid}`, { headers })
    if (res.ok) {
      const d = await res.json()
      setSlots(d.slots); setExceptions(d.exceptions)
    }
  }

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800) }

  const switchTrainer = async (tid: string) => {
    setTargetId(tid); setLoading(true); await load(tid); setLoading(false)
  }

  const addSlot = async (weekday: number) => {
    const d = draft[weekday]
    if (!d?.start || !d?.end) { flash('请先填开始和结束时间'); return }
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainer_id: targetId, weekday,
        start_time: d.start, end_time: d.end, slot_minutes: d.slot || 60,
      }),
    })
    if (!res.ok) { flash((await res.json()).error || '添加失败'); return }
    const created: Slot = await res.json()
    setSlots(prev => [...prev, created])
    setDraft(prev => ({ ...prev, [weekday]: { start: '', end: '', slot: d.slot || 60 } }))
  }

  const removeSlot = async (id: string) => {
    const res = await fetch(`/api/availability?id=${id}`, { method: 'DELETE', headers })
    if (res.ok) setSlots(prev => prev.filter(s => s.id !== id))
  }

  const addException = async () => {
    if (!excDraft.date) { flash('请选日期'); return }
    const res = await fetch('/api/availability/exceptions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainer_id: targetId, ...excDraft }),
    })
    if (!res.ok) { flash((await res.json()).error || '添加失败'); return }
    const created: Exception = await res.json()
    setExceptions(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
    setExcDraft({ date: '', kind: 'OFF', start_time: '', end_time: '', reason: '' })
  }

  const removeException = async (id: string) => {
    const res = await fetch(`/api/availability/exceptions?id=${id}`, { method: 'DELETE', headers })
    if (res.ok) setExceptions(prev => prev.filter(e => e.id !== id))
  }

  // ── 样式 ──
  const card = {
    background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
    borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)',
  } as const
  const input = {
    padding: '7px 9px', border: '1px solid var(--c-border)', borderRadius: 6,
    fontSize: 13, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
    boxSizing: 'border-box' as const,
  }
  const label = { display: 'block', fontSize: 11.5, color: '#999', marginBottom: 4 } as const

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  const hm = (t: string) => t.slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>可约时段</div>
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
        <div style={{ ...card, fontSize: 12.5, color: 'var(--c-text-secondary)', lineHeight: 1.7 }}>
          在这里设置每周固定可以被约的时段。会员看到的空档 =
          <strong style={{ color: 'var(--c-text-primary)' }}>每周时段 − 临时停排 + 临时加开 − 已被约走的</strong>。
          留空不设，会员就约不到你的私教。
        </div>

        {isAdmin && trainers.length > 0 && (
          <div style={card}>
            <label style={label}>正在编辑</label>
            <select value={targetId} onChange={e => switchTrainer(e.target.value)}
              style={{ ...input, width: '100%' }}>
              {trainers.map(t => (
                <option key={t.id} value={t.id}>{t.name || t.email}</option>
              ))}
            </select>
          </div>
        )}

        {/* 每周固定时段 */}
        <div style={card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 14px', color: 'var(--c-text-primary)' }}>
            每周固定时段
          </h3>

          {WEEKDAYS.map((name, wd) => {
            const daySlots = slots.filter(s => s.weekday === wd)
            const d = draft[wd] || { start: '', end: '', slot: 60 }
            return (
              <div key={wd} style={{
                paddingBottom: 12, marginBottom: 12,
                borderBottom: wd < 6 ? '1px solid var(--c-border)' : 'none',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 8 }}>
                  {name}
                </div>

                {daySlots.length === 0 && (
                  <div style={{ fontSize: 12, color: '#c0c0c0', marginBottom: 8 }}>未排班</div>
                )}

                {daySlots.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                    padding: '7px 10px', borderRadius: 6, background: 'var(--c-fill-light)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-primary)', fontWeight: 500 }}>
                      {hm(s.start_time)} – {hm(s.end_time)}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>每 {s.slot_minutes} 分钟一档</span>
                    <button onClick={() => removeSlot(s.id)} title="删除"
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c05050', display: 'flex', padding: 2 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 }}>
                  <div>
                    <label style={label}>开始</label>
                    <input type="time" value={d.start} style={{ ...input, width: 108 }}
                      onChange={e => setDraft(p => ({ ...p, [wd]: { ...d, start: e.target.value } }))} />
                  </div>
                  <div>
                    <label style={label}>结束</label>
                    <input type="time" value={d.end} style={{ ...input, width: 108 }}
                      onChange={e => setDraft(p => ({ ...p, [wd]: { ...d, end: e.target.value } }))} />
                  </div>
                  <div>
                    <label style={label}>时长</label>
                    <select value={d.slot} style={{ ...input, width: 92 }}
                      onChange={e => setDraft(p => ({ ...p, [wd]: { ...d, slot: parseInt(e.target.value) } }))}>
                      {SLOT_OPTIONS.map(m => <option key={m} value={m}>{m} 分钟</option>)}
                    </select>
                  </div>
                  <button onClick={() => addSlot(wd)} style={{
                    padding: '7px 12px', border: '1px solid var(--c-border-em)', borderRadius: 6,
                    background: 'var(--c-fill-light)', color: 'var(--c-brand)', cursor: 'pointer',
                    fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Plus size={13} /> 添加
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 临时调整 */}
        <div style={card}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: 'var(--c-text-primary)' }}>
            临时调整
          </h3>
          <div style={{ fontSize: 11.5, color: '#b0b0b0', marginBottom: 14, lineHeight: 1.5 }}>
            某天请假或额外加开。不填时间表示整天。
          </div>

          {exceptions.map(e => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
              padding: '8px 10px', borderRadius: 6, background: 'var(--c-fill-light)',
            }}>
              <span style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 4,
                background: e.kind === 'OFF' ? '#fff0f0' : '#e8f5e9',
                color: e.kind === 'OFF' ? '#c05050' : '#2e7d32',
              }}>{e.kind === 'OFF' ? '停排' : '加开'}</span>
              <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{e.date}</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>
                {e.start_time ? `${hm(e.start_time)}–${hm(e.end_time || '')}` : '整天'}
                {e.reason ? ` · ${e.reason}` : ''}
              </span>
              <button onClick={() => removeException(e.id)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c05050', display: 'flex', padding: 2 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {exceptions.length === 0 && (
            <div style={{ fontSize: 12, color: '#c0c0c0', marginBottom: 10 }}>暂无</div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
            <div>
              <label style={label}>日期</label>
              <input type="date" value={excDraft.date} style={{ ...input, width: 140 }}
                onChange={e => setExcDraft(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={label}>类型</label>
              <select value={excDraft.kind} style={{ ...input, width: 88 }}
                onChange={e => setExcDraft(p => ({ ...p, kind: e.target.value as 'OFF' | 'EXTRA' }))}>
                <option value="OFF">停排</option>
                <option value="EXTRA">加开</option>
              </select>
            </div>
            <div>
              <label style={label}>开始</label>
              <input type="time" value={excDraft.start_time} style={{ ...input, width: 104 }}
                onChange={e => setExcDraft(p => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <label style={label}>结束</label>
              <input type="time" value={excDraft.end_time} style={{ ...input, width: 104 }}
                onChange={e => setExcDraft(p => ({ ...p, end_time: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={label}>原因（可选）</label>
              <input type="text" value={excDraft.reason} placeholder="出差 / 加班…"
                style={{ ...input, width: '100%' }}
                onChange={e => setExcDraft(p => ({ ...p, reason: e.target.value }))} />
            </div>
            <button onClick={addException} style={{
              padding: '7px 12px', border: '1px solid var(--c-border-em)', borderRadius: 6,
              background: 'var(--c-fill-light)', color: 'var(--c-brand)', cursor: 'pointer',
              fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Plus size={13} /> 添加
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
