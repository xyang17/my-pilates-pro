'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type PeriodType = 'week' | 'month' | 'quarter' | 'year'
type Scope = 'own' | 'store'

interface TypeStat { count: number; revenue: number }
interface Summary {
  totalScheduled: number
  completed: number
  cancelled: number
  revenue: number
  private: TypeStat
  group: TypeStat
}
interface TrendPoint { label: string; classes: number; revenue: number }
interface TrainerStat extends Summary { trainer_id: string; name: string }
interface StatsResponse {
  range: { start: string; end: string; label: string }
  scope: Scope
  summary: Summary
  trend: TrendPoint[]
  byTrainer: TrainerStat[]
}
interface TrainerRow {
  id: string
  name: string
  role: string
  can_view_store_stats: boolean
}

const PERIOD_TABS: { key: PeriodType; zh: string; en: string }[] = [
  { key: 'week', zh: '周', en: 'Week' },
  { key: 'month', zh: '月', en: 'Month' },
  { key: 'quarter', zh: '季', en: 'Quarter' },
  { key: 'year', zh: '年', en: 'Year' },
]

const fmtMoney = (n: number) => `¥${Math.round(n || 0).toLocaleString()}`

export default function StatsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { lang, t } = useLang()

  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)
  const [scope, setScope] = useState<Scope>('own')
  const [canViewStore, setCanViewStore] = useState(false)
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'revenue' | 'classes'>('revenue')

  const [trainerList, setTrainerList] = useState<TrainerRow[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (!authLoading && userRole === 'CLIENT') { router.push('/dashboard'); return }
  }, [user, userRole, authLoading, router])

  // 拉取教练列表，判断自己是否有权限查看全店数据，ADMIN 用来做权限管理面板
  useEffect(() => {
    if (!user || !userRole || userRole === 'CLIENT') return
    fetch('/api/trainers', { headers: { 'x-user-id': user.id, 'x-user-role': userRole } })
      .then(res => res.ok ? res.json() : [])
      .then((list: TrainerRow[]) => {
        setTrainerList(Array.isArray(list) ? list : [])
        const me = (Array.isArray(list) ? list : []).find(t => t.id === user.id)
        const allowed = userRole === 'ADMIN' || !!me?.can_view_store_stats
        setCanViewStore(allowed)
        setScope(userRole === 'ADMIN' ? 'store' : 'own')
      })
      .catch(() => {})
  }, [user, userRole])

  const fetchStats = useCallback(async () => {
    if (!user || !userRole || userRole === 'CLIENT') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: periodType, offset: String(offset), scope })
      const res = await fetch(`/api/stats?${params}`, {
        headers: { 'x-user-id': user.id, 'x-user-role': userRole },
      })
      if (res.ok) {
        setData(await res.json())
      } else if (res.status === 403) {
        setScope('own')
      }
    } finally {
      setLoading(false)
    }
  }, [user, userRole, periodType, offset, scope])

  useEffect(() => { fetchStats() }, [fetchStats])

  const changePeriodType = (pt: PeriodType) => { setPeriodType(pt); setOffset(0) }

  const togglePermission = async (trainerId: string, next: boolean) => {
    if (!user) return
    setSavingId(trainerId)
    try {
      const res = await fetch(`/api/trainers/${trainerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({ can_view_store_stats: next }),
      })
      if (res.ok) {
        setTrainerList(prev => prev.map(t => t.id === trainerId ? { ...t, can_view_store_stats: next } : t))
      }
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || !user || userRole === 'CLIENT') return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>{t('加载中…', 'Loading…')}</span>
    </div>
  )

  const summary = data?.summary
  const trend = data?.trend || []
  const byTrainer = data?.byTrainer || []
  const managedTrainers = trainerList.filter(tr => tr.role === 'TRAINER')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
          {t('← 返回', '← Back')}
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {t('统计', 'Stats')}
        </h1>
      </header>

      <main style={{ padding: 'var(--sp-4)', maxWidth: 760, margin: '0 auto' }}>

        {/* 周期切换 + 我的/全店 切换 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {PERIOD_TABS.map(p => (
                <button key={p.key} onClick={() => changePeriodType(p.key)} style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer',
                  background: periodType === p.key ? 'var(--c-brand)' : 'var(--c-fill-light)',
                  color: periodType === p.key ? '#fff' : 'var(--c-text-secondary)',
                  fontWeight: periodType === p.key ? 600 : 400,
                }}>{t(p.zh, p.en)}</button>
              ))}
            </div>

            {canViewStore && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['own', 'store'] as Scope[]).map(s => (
                  <button key={s} onClick={() => setScope(s)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${scope === s ? 'var(--c-brand)' : 'var(--c-border)'}`,
                    background: scope === s ? 'var(--c-fill-light)' : 'transparent',
                    color: scope === s ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                    fontWeight: scope === s ? 600 : 400,
                  }}>{s === 'own' ? t('我的数据', 'My Data') : t('全店数据', 'Whole Studio')}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 'var(--sp-4)' }}>
            <button onClick={() => setOffset(o => o - 1)} style={{
              background: 'var(--c-fill-light)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)',
              width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)',
            }}>‹</button>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)', minWidth: 160, textAlign: 'center' }}>
              {data?.range.label || '…'}
            </span>
            <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} style={{
              background: 'var(--c-fill-light)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)',
              width: 30, height: 30, cursor: offset >= 0 ? 'not-allowed' : 'pointer', fontSize: 16,
              color: offset >= 0 ? 'var(--c-border)' : 'var(--c-text-secondary)',
            }}>›</button>
          </div>
          {loading && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text-hint)', margin: '6px 0 0' }}>{t('加载中…', 'Loading…')}</p>}
        </div>

        {/* KPI 卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 'var(--sp-4)' }}>
          <KpiCard label={t('已完成节数', 'Classes Completed')} value={`${summary?.completed ?? 0}`} sub={t(`共排课 ${summary?.totalScheduled ?? 0} 节 · 取消 ${summary?.cancelled ?? 0} 节`, `${summary?.totalScheduled ?? 0} scheduled · ${summary?.cancelled ?? 0} cancelled`)} highlight />
          <KpiCard label={t('总收入', 'Revenue')} value={fmtMoney(summary?.revenue || 0)} sub={t('仅统计已完成课程', 'Completed classes only')} />
          <KpiCard label={t('私教', 'Private')} value={`${summary?.private.count ?? 0} ${t('节', '')}`} sub={fmtMoney(summary?.private.revenue || 0)} />
          <KpiCard label={t('团课', 'Group')} value={`${summary?.group.count ?? 0} ${t('节', '')}`} sub={fmtMoney(summary?.group.revenue || 0)} />
        </div>

        {/* 趋势图 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('趋势', 'Trend')}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['revenue', 'classes'] as const).map(m => (
                <button key={m} onClick={() => setMetric(m)} style={{
                  padding: '4px 10px', borderRadius: 14, border: 'none', fontSize: 11, cursor: 'pointer',
                  background: metric === m ? 'var(--c-brand)' : 'var(--c-fill-light)',
                  color: metric === m ? '#fff' : 'var(--c-text-secondary)',
                }}>{m === 'revenue' ? t('收入', 'Revenue') : t('节数', 'Classes')}</button>
              ))}
            </div>
          </div>
          <TrendChart data={trend} metric={metric} />
        </div>

        {/* 教练对比（仅全店视角） */}
        {scope === 'store' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('教练对比', 'By Trainer')}</h3>
            {byTrainer.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 'var(--text-sm)', padding: '16px 0', margin: 0 }}>
                {t('本周期暂无数据', 'No data this period')}
              </p>
            ) : byTrainer.map(tr => (
              <div key={tr.trainer_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{tr.name}</p>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
                    {t(`私教 ${tr.private.count} · 团课 ${tr.group.count}`, `Private ${tr.private.count} · Group ${tr.group.count}`)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--c-brand)' }}>{fmtMoney(tr.revenue)}</p>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>{t(`${tr.completed} 节`, `${tr.completed} classes`)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADMIN 权限管理面板 */}
        {userRole === 'ADMIN' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('教练统计权限管理', 'Trainer Stats Permissions')}</h3>
            <p style={{ margin: '0 0 10px', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>
              {t('默认教练只能看自己的统计数据；勾选后该教练可以在自己的统计页切换查看全店数据。', 'By default trainers only see their own stats. Check to let a trainer view whole-studio data.')}
            </p>
            {managedTrainers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 'var(--text-sm)', padding: '12px 0', margin: 0 }}>
                {t('暂无其他教练', 'No other trainers yet')}
              </p>
            ) : managedTrainers.map(tr => (
              <label key={tr.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={tr.can_view_store_stats}
                  disabled={savingId === tr.id}
                  onChange={e => togglePermission(tr.id, e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{tr.name}</span>
                {savingId === tr.id && <span style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>{t('保存中…', 'Saving…')}</span>}
              </label>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: 'var(--c-card-bg)',
      border: `1px solid ${highlight ? 'var(--c-brand)' : 'var(--c-border)'}`,
      borderRadius: 12, padding: '14px 16px',
    }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--c-text-hint)' }}>{label}</p>
      <p style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 700, color: highlight ? 'var(--c-brand)' : 'var(--c-text-primary)' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: 'var(--c-text-hint)' }}>{sub}</p>}
    </div>
  )
}

function TrendChart({ data, metric }: { data: TrendPoint[]; metric: 'revenue' | 'classes' }) {
  const { t } = useLang()
  if (data.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 'var(--text-sm)', padding: '30px 0', margin: 0 }}>{t('暂无数据', 'No data')}</p>
  }
  const values = data.map(d => metric === 'revenue' ? d.revenue : d.classes)
  const max = Math.max(1, ...values)
  const showLabels = data.length <= 14

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 20 ? 1 : data.length > 10 ? 3 : 8, height: 150, padding: '8px 2px 0' }}>
      {data.map((d, i) => {
        const val = metric === 'revenue' ? d.revenue : d.classes
        const h = max > 0 ? Math.max(2, Math.round((val / max) * 118)) : 2
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0, height: '100%', justifyContent: 'flex-end' }}>
            <div
              title={`${d.label}: ${metric === 'revenue' ? fmtMoney(val) : t(`${val} 节`, `${val} classes`)}`}
              style={{
                width: '100%', maxWidth: 22, height: h, borderRadius: '3px 3px 0 0',
                background: val > 0 ? 'var(--c-brand)' : 'var(--c-border)',
              }}
            />
            {showLabels && <span style={{ fontSize: 9, color: 'var(--c-text-hint)', whiteSpace: 'nowrap' }}>{d.label}</span>}
          </div>
        )
      })}
    </div>
  )
}
