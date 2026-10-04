'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { StatsDetail, ClassDetail } from '@/components/stats/StatsDetail'

type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'
type Scope = 'own' | 'store'

interface TypeStat { count: number; revenue: number }
interface Summary {
  totalScheduled: number
  completed: number
  cancelled: number
  revenue: number
  private: TypeStat
  group: TypeStat
  notDone?: number
  avgPrice?: number
  minutes?: number
  missingPrice?: number
  activeClients?: number
}
interface TrendPoint { label: string; classes: number; revenue: number }
interface TrainerStat extends Summary { trainer_id: string; name: string }
interface ClientStat { client_id: string; name: string; classes: number; revenue: number }
interface StatsResponse {
  range: { start: string; end: string; label: string }
  scope: Scope
  summary: Summary
  trend: TrendPoint[]
  byTrainer: TrainerStat[]
  byClient: ClientStat[]
  prev?: { completed: number; revenue: number }
  classes?: ClassDetail[]
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
  { key: 'custom', zh: '自定义', en: 'Custom' },
]

const fmtMoney = (n: number) => `¥${Math.round(n || 0).toLocaleString()}`

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const daysAgoStr = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StatsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { lang, t } = useLang()

  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)
  const [customStart, setCustomStart] = useState(daysAgoStr(29))
  const [customEnd, setCustomEnd] = useState(todayStr())
  const [scope, setScope] = useState<Scope>('own')
  const [canViewStore, setCanViewStore] = useState(false)
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'revenue' | 'classes'>('revenue')
  // 课程明细的筛选（点客户排行、点「没填价格」提醒时会联动）
  const [clientFilter, setClientFilter] = useState<string | null>(null)
  const [detailStatus, setDetailStatus] = useState<'all' | 'completed' | 'notDone' | 'cancelled' | 'problem'>('all')

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

  const fetchStats = useCallback(async (silent = false) => {
    if (!user || !userRole || userRole === 'CLIENT') return
    if (periodType === 'custom' && (!customStart || !customEnd || customStart > customEnd)) return
    if (!silent) setLoading(true)
    try {
      const params = periodType === 'custom'
        ? new URLSearchParams({ type: 'custom', start: customStart, end: customEnd, scope })
        : new URLSearchParams({ type: periodType, offset: String(offset), scope })
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
  }, [user, userRole, periodType, offset, scope, customStart, customEnd])

  useEffect(() => { fetchStats() }, [fetchStats])
  // 换了周期/视角，明细里的「只看某学员」就不一定还有意义了，清掉
  useEffect(() => { setClientFilter(null) }, [periodType, offset, scope, customStart, customEnd])

  // 明细里改完一节课的价格：先就地更新这一行，再静默重拉一次，让上面的总数、排行跟着变
  const handlePriceSaved = (id: string, price: number | null) => {
    setData(prev => prev && prev.classes ? {
      ...prev,
      classes: prev.classes.map(c => c.id === id ? { ...c, price, flag: c.flag === 'missing' && price ? null : c.flag } : c),
    } : prev)
    fetchStats(true)
  }
  const jumpToDetail = () => {
    setTimeout(() => document.getElementById('class-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

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
  const byClient = data?.byClient || []
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

          {periodType === 'custom' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={e => setCustomStart(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', fontSize: 13 }}
              />
              <span style={{ color: 'var(--c-text-hint)', fontSize: 13 }}>{t('至', 'to')}</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={todayStr()}
                onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', fontSize: 13 }}
              />
            </div>
          ) : (
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
          )}
          {loading && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--c-text-hint)', margin: '6px 0 0' }}>{t('加载中…', 'Loading…')}</p>}
        </div>

        {/* KPI 卡片 */}
        {(() => {
          const prev = data?.prev
          const showPrev = periodType !== 'custom' || !!prev
          const change = (cur: number, before: number | undefined) => {
            if (!showPrev || before === undefined) return undefined
            if (before === 0) return cur > 0 ? t('上期为 0', 'prev 0') : undefined
            const pct = Math.round(((cur - before) / before) * 100)
            return `${t('比上期', 'vs prev')} ${pct >= 0 ? '↑' : '↓'}${Math.abs(pct)}%`
          }
          const hours = (summary?.minutes || 0) / 60
          const done = summary?.completed ?? 0
          const sched = (summary?.totalScheduled ?? 0)
          return (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <KpiCard label={t('总收入', 'Revenue')} value={fmtMoney(summary?.revenue || 0)}
                  sub={[change(summary?.revenue || 0, prev?.revenue), t('只算已完成的课', 'Completed only')].filter(Boolean).join(' · ')} highlight />
                <KpiCard label={t('已完成', 'Completed')} value={`${done} ${t('节', '')}`}
                  sub={[change(done, prev?.completed), t(`共 ${hours % 1 ? hours.toFixed(1) : hours} 小时`, `${hours.toFixed(1)} h`)].filter(Boolean).join(' · ')} />
                <KpiCard label={t('私教', 'Private')} value={`${summary?.private.count ?? 0} ${t('节', '')}`} sub={fmtMoney(summary?.private.revenue || 0)} />
                <KpiCard label={t('团课', 'Group')} value={`${summary?.group.count ?? 0} ${t('节', '')}`} sub={fmtMoney(summary?.group.revenue || 0)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 'var(--sp-4)' }}>
                <MiniStat label={t('平均单价', 'Avg price')} value={summary?.avgPrice ? fmtMoney(summary.avgPrice) : '—'} />
                <MiniStat label={t('上课学员', 'Clients')} value={`${summary?.activeClients ?? 0} ${t('人', '')}`} />
                <MiniStat label={t('未上 / 取消', 'Pending / Cancelled')} value={`${summary?.notDone ?? 0} / ${summary?.cancelled ?? 0}`}
                  sub={sched ? t(`完成率 ${Math.round((done / sched) * 100)}%`, `${Math.round((done / sched) * 100)}% done`) : undefined} />
              </div>
              {(summary?.missingPrice ?? 0) > 0 && (
                <button onClick={() => { setClientFilter(null); setDetailStatus('problem'); jumpToDetail() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', marginBottom: 'var(--sp-4)',
                    background: '#FFF4F3', border: '1px solid #EBC3C0', borderRadius: 12, color: '#A0403C', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <span style={{ fontSize: 16 }}>⚠</span>
                  <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                    <b>{summary?.missingPrice} 节已完成的课没填价格</b>，收入少算了。点这里逐个补上
                  </span>
                  <span>›</span>
                </button>
              )}
            </>
          )
        })()}

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

        {/* 客户对比：上课节数 + 收入贡献排名 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('客户对比', 'By Client')}</h3>
          <p style={{ margin: '0 0 10px', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>
            {t('按收入贡献排名；团课收入按当次报名人数平摊。点某个学员可以看他每一节课', 'Ranked by revenue; group revenue split among enrolled. Tap a client to see their classes')}
          </p>
          {byClient.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 'var(--text-sm)', padding: '16px 0', margin: 0 }}>
              {t('本周期暂无数据', 'No data this period')}
            </p>
          ) : byClient.map((c, i) => (
            <div key={c.client_id}
              onClick={() => { setClientFilter(c.client_id); setDetailStatus('all'); jumpToDetail() }}
              title={t('看这个学员的每一节课', 'See this client\'s classes')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--c-border)', cursor: 'pointer' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? 'var(--c-brand)' : 'var(--c-fill-light)',
                color: i < 3 ? '#fff' : 'var(--c-text-hint)',
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--c-brand)' }}>{fmtMoney(c.revenue)}</p>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>{t(`${c.classes} 节`, `${c.classes} classes`)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 课程明细：每一节课，价格可以直接改 */}
        {data?.classes && (
          <StatsDetail
            classes={data.classes}
            userId={user.id}
            userRole={userRole || ''}
            showTrainer={scope === 'store'}
            clientFilter={clientFilter}
            clientName={byClient.find(c => c.client_id === clientFilter)?.name}
            onClearClient={() => setClientFilter(null)}
            statusFilter={detailStatus}
            setStatusFilter={setDetailStatus}
            onSaved={handlePriceSaved}
          />
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

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '10px 12px' }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--c-text-hint)' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--c-text-primary)' }}>{value}</p>
      {sub && <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--c-text-hint)' }}>{sub}</p>}
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
