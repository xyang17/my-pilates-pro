'use client'

import { fmtUnits } from '@/lib/sessionUnits'
import { useEffect, useState } from 'react'
import { useLang } from '@/context/LanguageContext'

// 学员首页「我的课时」卡片。
// 有课时包 → 显示剩几节；参加了满赠 → 显示再上几节送几节。两样都没有就整张不显示（返回 null）。
// 数据来自 /api/my-sessions，只含学员自己该看的部分（不含价格）。

interface MySessions {
  has_anything: boolean
  package: { remaining: number; granted: number; used: number; expires_at: string | null } | null
  loyalty: { threshold: number; bonus: number; progress: number; to_next: number; pending_sessions: number } | null
}

const pad = (n: number) => String(n).padStart(2, '0')
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const daysUntil = (date: string) =>
  Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${todayStr()}T00:00:00Z`).getTime()) / 86400000)
const fmtDate = (date: string, lang: 'zh' | 'en') => lang === 'zh'
  ? `${Number(date.slice(0, 4))}年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`
  : new Date(`${date}T00:00:00`).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div style={{ height: 8, borderRadius: 4, background: 'var(--c-fill-light)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  )
}

export function MySessionsCard({ userId, userRole }: { userId: string; userRole: string }) {
  const { lang, t } = useLang()
  const [data, setData] = useState<MySessions | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch('/api/my-sessions', { headers: { 'x-user-id': userId, 'x-user-role': userRole } })
      .then(r => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {})
  }, [userId, userRole])

  // 加载中、出错、或者两样都没有：什么都不显示，首页保持原样
  if (!data || !data.has_anything) return null

  const P = data.package
  const L = data.loyalty
  const expDays = P?.expires_at ? daysUntil(P.expires_at) : null
  const low = !!P && P.remaining <= 2

  return (
    <section style={{
      background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 14,
      padding: '16px 18px', marginBottom: 24,
    }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 14px' }}>{t('我的课时', 'My sessions')}</h2>

      {P && (
        <div style={{ marginBottom: L ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{t('课时包', 'Package')}</span>
            <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>
              {t('还剩', '')} <b style={{ fontSize: 22, color: low ? '#C0504D' : 'var(--c-brand)' }}>{fmtUnits(P.remaining)}</b> {t('节', 'left')}
              <span style={{ color: 'var(--c-text-hint)' }}> / {t(`共 ${fmtUnits(P.granted)} 节`, `of ${fmtUnits(P.granted)}`)}</span>
            </span>
          </div>
          <Bar value={P.used} max={P.granted} color={low ? '#D98080' : 'var(--c-brand)'} />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--c-text-hint)' }}>
            {t(`已上 ${fmtUnits(P.used)} 节`, `${fmtUnits(P.used)} done`)}
            {P.expires_at && (
              <span style={{ color: expDays !== null && expDays <= 14 ? '#C0504D' : undefined }}>
                {' · '}{expDays !== null && expDays <= 0 ? t('今天到期', 'expires today') : expDays !== null && expDays <= 14 ? t(`${expDays} 天后到期`, `expires in ${expDays} days`) : t(`${fmtDate(P.expires_at, 'zh')}到期`, `expires ${fmtDate(P.expires_at, 'en')}`)}
              </span>
            )}
            {low && <span style={{ color: '#C0504D' }}> · {t('快用完啦', 'almost used up')}</span>}
          </p>
        </div>
      )}

      {L && (
        <div style={{ paddingTop: P ? 14 : 0, borderTop: P ? '1px solid var(--c-border)' : 'none' }}>
          {L.pending_sessions > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FFF6E5', borderRadius: 10 }}>
              <span style={{ fontSize: 22 }}>🎁</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#8A5A00' }}>{t(`你获得了 ${L.pending_sessions} 节赠课`, `You’ve earned ${L.pending_sessions} free session(s)`)}</div>
                <div style={{ fontSize: 12, color: '#A0803A', marginTop: 2 }}>{t('教练会帮你加到课时里', 'Your trainer will add them for you')}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>🎁 {t(`满 ${L.threshold} 节送 ${L.bonus} 节`, `Every ${L.threshold} → ${L.bonus} free`)}</span>
                <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>
                  <b style={{ fontSize: 18, color: '#C99A3E' }}>{L.progress}</b> / {L.threshold}
                </span>
              </div>
              <Bar value={L.progress} max={L.threshold} color="#D9A441" />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--c-text-hint)' }}>
                {t('再上', '')} <b style={{ color: '#C99A3E' }}>{L.to_next}</b> {t(`节就送你 ${L.bonus} 节课`, `more to get ${L.bonus} free`)}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
