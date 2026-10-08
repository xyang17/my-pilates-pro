'use client'

import Link from 'next/link'

// 学员卡片（教练端）。数据来自服务端 lib/clientSummary.ts，这里只负责显示。
//   ClientRowCard     —— 学员管理列表里的一行
//   ClientStatusPanel —— 学员详情页顶部的状态区
// 两处显示同一套信息：付费方式 / 课时包剩余 / 满赠进度 / 最近上课 / 下次课 / 提醒。

export interface ClientSummary {
  billable_completed: number
  self_practice_completed: number
  last_class_date: string | null
  last_self_practice_date: string | null
  next_class: { date: string; start_time: string | null } | null
  payment: { mode: 'package' | 'per_session'; remaining: number; granted: number; used: number; nearest_expiry: string | null }
  loyalty: { enabled: boolean; threshold: number; bonus: number; source?: 'default' | 'custom' | 'off'; base: number; total: number; to_next: number; pending: number }
  alerts: { kind: 'bonus_due' | 'package_low' | 'package_empty' | 'package_expiring' | 'inactive'; text: string }[]
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const pad = (n: number) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const diffDays = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

export function agoText(date: string | null) {
  if (!date) return '还没上过课'
  const d = diffDays(date, todayStr())
  if (d <= 0) return '今天'
  if (d === 1) return '昨天'
  if (d < 30) return `${d} 天前`
  if (d < 365) return `${Math.floor(d / 30)} 个月前`
  return `${Math.floor(d / 365)} 年前`
}
export function nextText(n: ClientSummary['next_class']) {
  if (!n) return null
  const d = diffDays(todayStr(), n.date)
  const t = n.start_time ? ` ${n.start_time.slice(0, 5)}` : ''
  if (d === 0) return `今天${t}`
  if (d === 1) return `明天${t}`
  const dt = new Date(`${n.date}T00:00:00`)
  return `${dt.getMonth() + 1}/${dt.getDate()} 周${WEEK[dt.getDay()]}${t}`
}

const ALERT_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  bonus_due:        { color: '#8A5A00', bg: '#FFF1D6', icon: '🎁' },
  package_low:      { color: '#A0403C', bg: '#FDECEA', icon: '⏳' },
  package_empty:    { color: '#A0403C', bg: '#FDECEA', icon: '⛔' },
  package_expiring: { color: '#A0403C', bg: '#FDECEA', icon: '📅' },
  inactive:         { color: '#6B6B80', bg: '#EEEEF3', icon: '💤' },
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg, color, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function PaymentPill({ s }: { s: ClientSummary }) {
  if (s.payment.mode === 'per_session') return <Pill color="#6B6B80" bg="#EEEEF3">单次付费</Pill>
  const low = s.payment.remaining <= 2
  return (
    <Pill color={low ? '#A0403C' : '#7A6398'} bg={low ? '#FDECEA' : '#EDE6F4'}>
      课时包 剩 {s.payment.remaining}/{s.payment.granted}
    </Pill>
  )
}

function Avatar({ name, photo, size }: { name: string; photo?: string | null; size: number }) {
  return photo ? (
    <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--c-fill-light)', border: '1.5px solid var(--c-pink-mist)', color: 'var(--c-brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600,
    }}>
      {name?.[0] || '?'}
    </div>
  )
}

// ── 列表里的一行 ───────────────────────────────────────────
export function ClientRowCard({ id, name, email, photo, s, last }: {
  id: string; name: string; email: string; photo?: string | null; s?: ClientSummary; last: boolean
}) {
  const next = s ? nextText(s.next_class) : null
  return (
    <Link href={`/dashboard/clients/${id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--c-border)' }}>
        <Avatar name={name} photo={photo} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            {s && <span style={{ fontSize: 12, color: 'var(--c-text-hint)', whiteSpace: 'nowrap' }}>已上 {s.billable_completed} 节</span>}
          </div>
          {s ? (
            <>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                <PaymentPill s={s} />
                {s.loyalty.enabled && s.loyalty.pending === 0 && (
                  <Pill color="#8A6D3B" bg="#FBF4E6">满赠 {s.loyalty.total % s.loyalty.threshold}/{s.loyalty.threshold}</Pill>
                )}
                {s.alerts.map(a => {
                  const st = ALERT_STYLE[a.kind]
                  return <Pill key={a.kind} color={st.color} bg={st.bg}>{st.icon} {a.text}</Pill>
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', marginTop: 5 }}>
                上次 {agoText(s.last_class_date)}
                {next ? <span> · <b style={{ color: 'var(--c-brand)', fontWeight: 600 }}>下次 {next}</b></span> : <span style={{ color: 'var(--c-text-hint)' }}> · 没有排课</span>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--c-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          )}
        </div>
        <span style={{ color: 'var(--c-text-hint)', alignSelf: 'center' }}>›</span>
      </div>
    </Link>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--c-fill-light)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  )
}

// ── 详情页顶部的状态区 ─────────────────────────────────────
export function ClientStatusPanel({ s, onOpenPackages }: { s: ClientSummary; onOpenPackages?: () => void }) {
  const next = nextText(s.next_class)
  const L = s.loyalty
  const inCycle = L.total % L.threshold
  const box: React.CSSProperties = { background: '#FAF8FD', border: '1px solid var(--c-border)', borderRadius: 12, padding: '12px 14px' }

  return (
    <div style={{ marginTop: 16 }}>
      {s.alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {s.alerts.map(a => {
            const st = ALERT_STYLE[a.kind]
            return (
              <button key={a.kind} onClick={a.kind === 'inactive' ? undefined : onOpenPackages}
                style={{ border: 'none', cursor: a.kind === 'inactive' ? 'default' : 'pointer', fontSize: 12, padding: '5px 10px', borderRadius: 14, background: st.bg, color: st.color, fontWeight: 600 }}>
                {st.icon} {a.text}{a.kind !== 'inactive' ? ' ›' : ''}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* 付费方式 / 课时包 */}
        <div style={{ ...box, cursor: onOpenPackages ? 'pointer' : 'default' }} onClick={onOpenPackages}>
          <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginBottom: 4 }}>付费方式</div>
          {s.payment.mode === 'per_session' ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-primary)' }}>单次付费</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 4 }}>每节课按课程价格计</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.payment.remaining <= 2 ? '#A0403C' : 'var(--c-text-primary)' }}>
                还剩 {s.payment.remaining} 节
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-secondary)' }}> / 共 {s.payment.granted}</span>
              </div>
              <div style={{ margin: '6px 0 4px' }}><Bar value={s.payment.used} max={s.payment.granted} color="var(--c-brand)" /></div>
              <div style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>
                已用 {s.payment.used} 节{s.payment.nearest_expiry ? ` · ${s.payment.nearest_expiry} 到期` : ' · 不限期'}
              </div>
            </>
          )}
        </div>

        {/* 满赠 */}
        <div style={box}>
          <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginBottom: 4 }}>满赠进度</div>
          {!L.enabled ? (
            <div style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{L.source === 'off' ? '不参加满赠' : '未开启'}</div>
          ) : L.pending > 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#8A5A00' }}>🎁 {L.pending * L.bonus} 节待发</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 4 }}>累计 {L.total} 节，每满 {L.threshold} 送 {L.bonus}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-primary)' }}>
                {inCycle} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--c-text-secondary)' }}>/ {L.threshold} 节</span>
              </div>
              <div style={{ margin: '6px 0 4px' }}><Bar value={inCycle} max={L.threshold} color="#D9A441" /></div>
              <div style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>
                再上 {L.to_next} 节送 {L.bonus} 节 · 累计 {L.total}{L.source === 'custom' ? ' · 单独设' : ''}
              </div>
            </>
          )}
        </div>

        {/* 上课情况 */}
        <div style={box}>
          <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginBottom: 4 }}>已上课</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text-primary)' }}>{s.billable_completed} 节</div>
          <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 4 }}>
            上次 {agoText(s.last_class_date)}
            {s.self_practice_completed > 0 ? ` · 自我练习 ${s.self_practice_completed} 次（不计费）` : ''}
          </div>
        </div>

        <div style={box}>
          <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginBottom: 4 }}>下次课</div>
          {next ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-brand)' }}>{next}</div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-secondary)' }}>没有排课</div>
              <Link href="/dashboard/classes/new" style={{ fontSize: 11, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 600 }}>＋ 去排课</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { Avatar as ClientAvatar }
