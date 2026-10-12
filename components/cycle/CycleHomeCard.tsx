'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'
import { studioToday, addDaysStr } from '@/lib/time'

// 首页的「生理周期」卡片：学员首页和教练首页共用。
// 只给性别是女的账户显示（跟 /api/cycle-logs 的限制一致），其他人返回 null。
//
// 三种状态：
//   经期中（最近一条没写结束日、开始不超过 10 天）→ 经期第 N 天 + 「结束了」+ 补量/痛感
//   不在经期 → 上次几号开始、预计下次（≥2 条记录才估算）+ 「今天来了」
//   没有记录 → 「今天来了」
// 完整列表、改错、补记以前的，点「全部记录」去原来的页面（学员：我的主页；教练：我的训练 → 生理周期）。

interface Log {
  id: string
  start_date: string
  end_date?: string | null
  flow_level?: string | null
  pain_level?: string | null
  notes?: string | null
}

const FLOW = { LIGHT: ['量少', 'Light'], MEDIUM: ['量中', 'Medium'], HEAVY: ['量多', 'Heavy'] } as const
const PAIN = { NONE: ['无痛感', 'None'], MILD: ['轻微', 'Mild'], MODERATE: ['中等', 'Moderate'], SEVERE: ['严重', 'Severe'] } as const

const days = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)
const md = (d: string, lang: string) => {
  const m = Number(d.slice(5, 7)), dd = Number(d.slice(8, 10))
  return lang === 'zh' ? `${m}月${dd}日` : `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${dd}`
}

// 平均周期：相邻两次开始日的间隔，只取 15–60 天之间的（漏记一个月的不算），最近 6 次
function avgCycle(logs: Log[]): number | null {
  const starts = logs.map(l => l.start_date).sort().reverse().slice(0, 7)
  const gaps: number[] = []
  for (let i = 0; i < starts.length - 1; i++) {
    const g = days(starts[i + 1], starts[i])
    if (g >= 15 && g <= 60) gaps.push(g)
  }
  if (!gaps.length) return null
  return Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
}

function Chip({ on, children, onClick, disabled }: { on?: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 14, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${on ? '#C46A7A' : 'var(--c-border)'}`,
        background: on ? '#C46A7A' : 'transparent', color: on ? '#fff' : 'var(--c-text-secondary)', fontWeight: on ? 600 : 400,
      }}>
      {children}
    </button>
  )
}

export function CycleHomeCard({ userId, userRole, historyHref }: { userId: string; userRole: string; historyHref: string }) {
  const { lang, t } = useLang()
  const [female, setFemale] = useState<boolean | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const headers = { 'x-user-id': userId, 'x-user-role': userRole }

  useEffect(() => {
    if (!userId) return
    let alive = true
    fetch(`/api/users/${userId}`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(u => {
        if (!alive) return
        const isF = u?.sex === 'FEMALE'
        setFemale(isF)
        if (isF) {
          fetch(`/api/cycle-logs?userId=${userId}`, { headers })
            .then(r => (r.ok ? r.json() : []))
            .then(d => { if (alive) setLogs(Array.isArray(d) ? d : []) })
            .catch(() => {})
        }
      })
      .catch(() => { if (alive) setFemale(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole])

  if (!female) return null

  const today = studioToday()
  const sorted = [...logs].sort((a, b) => b.start_date.localeCompare(a.start_date))
  const last = sorted[0]
  const ongoing = !!last && !last.end_date && days(last.start_date, today) >= 0 && days(last.start_date, today) <= 10
  const cycle = avgCycle(sorted)
  const nextDate = last && cycle ? addDaysStr(last.start_date, cycle) : null

  const call = async (fn: () => Promise<Response>, apply: (d: any) => void) => {
    if (busy) return
    setBusy(true); setErr('')
    try {
      const res = await fn()
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || t('保存失败', 'Save failed'))
      apply(d)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const startToday = () => call(
    () => fetch('/api/cycle-logs', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, start_date: today }),
    }),
    d => setLogs(prev => [d, ...prev]),
  )
  const patch = (body: Record<string, unknown>) => last && call(
    () => fetch(`/api/cycle-logs/${last.id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    d => setLogs(prev => prev.map(l => (l.id === d.id ? { ...l, ...d } : l))),
  )

  const L = (pair: readonly [string, string]) => (lang === 'zh' ? pair[0] : pair[1])

  return (
    <section style={{
      background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 14,
      padding: '16px 18px', marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>🌸 {t('生理周期', 'Cycle')}</h2>
        <Link href={historyHref} style={{ fontSize: 12, color: 'var(--c-text-secondary)', textDecoration: 'none' }}>
          {t('全部记录 / 补记 ›', 'History / add past ›')}
        </Link>
      </div>

      {ongoing && last ? (
        <>
          <div style={{ fontSize: 15, color: 'var(--c-text-primary)', marginBottom: 10 }}>
            {t('经期第', 'Day')} <b style={{ fontSize: 22, color: '#C46A7A' }}>{days(last.start_date, today) + 1}</b> {t('天', 'of period')}
            <span style={{ fontSize: 12, color: 'var(--c-text-hint)', marginLeft: 8 }}>
              {t(`${md(last.start_date, lang)}开始`, `since ${md(last.start_date, lang)}`)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--c-text-hint)', width: 34 }}>{t('流量', 'Flow')}</span>
            {(Object.keys(FLOW) as (keyof typeof FLOW)[]).map(k => (
              <Chip key={k} on={last.flow_level === k} disabled={busy} onClick={() => patch({ flow_level: last.flow_level === k ? null : k })}>{L(FLOW[k])}</Chip>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--c-text-hint)', width: 34 }}>{t('痛感', 'Pain')}</span>
            {(Object.keys(PAIN) as (keyof typeof PAIN)[]).map(k => (
              <Chip key={k} on={last.pain_level === k} disabled={busy} onClick={() => patch({ pain_level: last.pain_level === k ? null : k })}>{L(PAIN[k])}</Chip>
            ))}
          </div>
          <button onClick={() => patch({ end_date: today })} disabled={busy}
            style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #C46A7A', background: 'transparent', color: '#C46A7A', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {busy ? '…' : t('今天结束了', 'Ended today')}
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--c-text-secondary)', lineHeight: 1.7 }}>
            {!last
              ? t('还没有记录。来了的那天点一下就行，教练安排训练时会参考。', 'No records yet. Tap the button on the first day — your coach uses it when planning training.')
              : <>
                  {t(`上次 ${md(last.start_date, lang)} 开始，已经 ${days(last.start_date, today)} 天`,
                     `Last started ${md(last.start_date, lang)}, ${days(last.start_date, today)} days ago`)}
                  {nextDate && (
                    <><br />{days(today, nextDate) >= 0
                      ? t(`预计下次 ${md(nextDate, lang)} 左右（平均 ${cycle} 天）`, `Next expected around ${md(nextDate, lang)} (avg ${cycle} days)`)
                      : t(`比预计晚了 ${-days(today, nextDate)} 天（平均 ${cycle} 天）`, `${-days(today, nextDate)} days later than expected (avg ${cycle} days)`)}</>
                  )}
                </>}
          </p>
          <button onClick={startToday} disabled={busy}
            style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: '#C46A7A', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {busy ? '…' : t('今天来了', 'Started today')}
          </button>
        </>
      )}
      {err && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#C0504D' }}>{err}</p>}
    </section>
  )
}
