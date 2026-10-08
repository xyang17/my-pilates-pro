'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell, ChevronLeft, ChevronRight, Clock, Plus, Calendar,
  CalendarCheck, Dumbbell, ClipboardCheck, Activity, BookOpen, ClipboardList, Trophy,
  BarChart3, Ticket,
} from 'lucide-react'

// 教练首页（学员首页在 app/dashboard/page.tsx 里，保持原样不动）
//
// 布局见 docs/交接-导航重构与个人训练.md 3.2：
//   日期 + 消息铃铛
//   周视图横条（有课的日子标点，默认选中今天；整月去「月历 ›」）
//   （原来的「N 节课待复盘」提醒条已按用户要求去掉；单节课上的「待复盘」小标签保留）
//   选中那天的课
//   全部功能（教学 / 内容 / 经营）
//
// 去掉了「本月课程 / 学员数」两张数字卡：月初本月课程几乎总是 0，学员数几个月不变，没信息量。

interface ClassItem {
  id: string
  name: string
  date: string
  start_time?: string | null
  duration: number
  status: string
  post_summary: string | null
  client_names?: string[]
}

interface DashboardData {
  today_classes: ClassItem[]
  pending_review: number
  date: string
  view_date?: string
  week_counts?: Record<string, number>
}

const WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日']
const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const STATUS_LABEL: Record<string, { text: string; bg: string; color: string }> = {
  planned:     { text: '待上课', bg: '#EDE6F4', color: '#9880B8' },
  scheduled:   { text: '待上课', bg: '#EDE6F4', color: '#9880B8' },
  in_progress: { text: '进行中', bg: '#FFF8E1', color: '#F57F17' },
  completed:   { text: '已完成', bg: '#E8F5E9', color: '#2E7D32' },
  cancelled:   { text: '已取消', bg: '#F5EDED', color: '#C4A4A4' },
}

// ── 纯字符串日期运算（YYYY-MM-DD），不受时区影响 ──
const pad = (n: number) => String(n).padStart(2, '0')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()
const mondayOf = (date: string) => addDays(date, -((weekday(date) + 6) % 7))
const dayNum = (date: string) => Number(date.slice(8, 10))
const fmtMD = (date: string) => `${Number(date.slice(5, 7))}月${dayNum(date)}日`

function FeatureGroup({ title, items }: {
  title: string
  items: { label: string; href: string; icon: React.ElementType }[]
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--c-text-hint)', margin: '0 0 8px 2px', fontWeight: 600, letterSpacing: '0.04em' }}>{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {items.map(item => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 12,
                padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                height: '100%', boxSizing: 'border-box',
              }}>
                <Icon size={20} color="var(--c-brand)" />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text-primary)', textAlign: 'center', lineHeight: 1.3 }}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function TrainerHome({ userId, userRole, displayName }: {
  userId: string
  userRole: string
  displayName: string
}) {
  const today = useMemo(localToday, [])
  const [selected, setSelected] = useState(today)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)

  const headers = { 'x-user-id': userId, 'x-user-role': userRole }

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/dashboard?date=${selected}`, { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setData(d) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, userId, userRole])

  useEffect(() => {
    fetch('/api/notifications?count=1', { headers })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setUnread(d.unread || 0) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole])

  const weekStart = mondayOf(selected)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekCounts = data?.week_counts || {}
  const classes = data && (data.view_date ?? data.date) === selected ? data.today_classes : []

  // 换周：保持同一个星期几；回到本周时直接选今天
  const shiftWeek = (n: -1 | 1) => {
    const next = addDays(selected, n * 7)
    setSelected(mondayOf(next) === mondayOf(today) ? today : next)
  }

  const dayTitle = selected === today ? '今天的课'
    : selected === addDays(today, 1) ? '明天的课'
    : selected === addDays(today, -1) ? '昨天的课'
    : `${fmtMD(selected)} ${WEEKDAY_ZH[weekday(selected)]}的课`

  const teach = [
    { label: '约课',     href: '/dashboard/booking',      icon: CalendarCheck },
    { label: '可约时段', href: '/dashboard/availability', icon: Clock },
    { label: '课程训练', href: '/dashboard/classes',      icon: Dumbbell },
    { label: '课后作业', href: '/dashboard/workouts',     icon: ClipboardCheck },
    // 身体测试在这里也留入口：有时候做体测本身就是一节课的内容（学员详情页里也能进）
    { label: '身体测试', href: '/dashboard/assessments',  icon: Activity },
  ]
  const content = [
    { label: '动作库',   href: '/dashboard/exercises', icon: BookOpen },
    { label: '教案模板', href: '/dashboard/plans',     icon: ClipboardList },
    { label: '训练方案', href: '/dashboard/programs',  icon: Trophy },
  ]
  const business = [
    { label: '统计', href: '/dashboard/stats', icon: BarChart3 },
    ...(userRole === 'ADMIN' ? [{ label: '邀请码', href: '/dashboard/invite-codes', icon: Ticket }] : []),
  ]

  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 12 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <main style={{ padding: '20px 16px 24px', maxWidth: 760, margin: '0 auto' }}>
        {/* 日期 + 铃铛 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--c-text-hint)', margin: '0 0 2px' }}>
              {fmtMD(today)} {WEEKDAY_ZH[weekday(today)]}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>
              你好，{displayName.split('@')[0]}
            </h1>
          </div>
          <Link href="/dashboard/notifications" aria-label="消息"
            style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={18} color="var(--c-text-secondary)" />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8, background: '#D9534F', color: '#fff', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
        </div>

        {/* 周视图 */}
        <div style={{ ...card, padding: '10px 6px 8px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px 6px' }}>
            <button onClick={() => shiftWeek(-1)} aria-label="上一周"
              style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', color: 'var(--c-text-hint)', display: 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--c-text-secondary)', flex: 1, textAlign: 'center' }}>
              {Number(weekStart.slice(5, 7))}月{dayNum(weekStart)}日 – {fmtMD(weekDays[6])}
            </span>
            <button onClick={() => shiftWeek(1)} aria-label="下一周"
              style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', color: 'var(--c-text-hint)', display: 'flex' }}>
              <ChevronRight size={16} />
            </button>
            <Link href="/dashboard/calendar"
              style={{ marginLeft: 6, fontSize: 12, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
              月历 ›
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((d, i) => {
              const isSel = d === selected
              const isToday = d === today
              const n = weekCounts[d] || 0
              return (
                <button key={d} onClick={() => setSelected(d)}
                  style={{ border: 'none', background: 'none', padding: '2px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>{WEEK_HEAD[i]}</span>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: isSel || isToday ? 700 : 500,
                    background: isSel ? 'var(--c-brand)' : 'transparent',
                    color: isSel ? '#fff' : isToday ? 'var(--c-brand)' : 'var(--c-text-primary)',
                    border: isToday && !isSel ? '1.5px solid var(--c-brand)' : '1.5px solid transparent',
                  }}>
                    {dayNum(d)}
                  </span>
                  <span style={{ height: 5, display: 'flex', gap: 2 }}>
                    {Array.from({ length: Math.min(n, 3) }, (_, k) => (
                      <span key={k} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--c-brand)', opacity: 0.75 }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 选中那天的课 */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>
              {dayTitle}{classes.length ? ` (${classes.length})` : ''}
            </h2>
            <Link href="/dashboard/classes/new" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>
              <Plus size={14} /> 新建
            </Link>
          </div>

          {loading && !classes.length ? (
            <div style={{ ...card, padding: '24px 20px', textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>加载中…</div>
          ) : !classes.length ? (
            <div style={{ ...card, padding: '24px 20px', textAlign: 'center' }}>
              <Calendar size={24} color="var(--c-text-hint)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 13, color: 'var(--c-text-hint)', margin: 0 }}>这天没有课程安排</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: loading ? 0.6 : 1 }}>
              {classes.map(cls => {
                const st = STATUS_LABEL[cls.status] || STATUS_LABEL.scheduled
                const time = cls.start_time ? cls.start_time.slice(0, 5) : '待定'
                const needsReview = cls.status === 'completed' && !cls.post_summary
                const names = cls.client_names ?? []
                return (
                  <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ ...card, border: `1px solid ${needsReview ? 'var(--c-brand)' : 'var(--c-border)'}`, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-primary)', width: 44, flexShrink: 0 }}>{time}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                            {names.length ? `${names.slice(0, 2).join('、')}${names.length > 2 ? ` 等${names.length}人` : ''} · ` : ''}{cls.name}
                          </span>
                          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 500 }}>{st.text}</span>
                          {needsReview && (
                            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: '#EDE6F4', color: '#9880B8', fontWeight: 500 }}>待复盘</span>
                          )}
                        </div>
                        {cls.duration ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--c-text-hint)' }}>
                            <Clock size={11} /> {cls.duration} 分钟
                          </span>
                        ) : null}
                      </div>
                      <ChevronRight size={16} color="var(--c-text-hint)" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* 全部功能：手机上底栏只有 4 个，其余入口都在这里。电脑上左侧边栏已经有，不重复。 */}
        <section className="md:hidden">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 12px' }}>全部功能</h2>
          <FeatureGroup title="教学" items={teach} />
          <FeatureGroup title="内容" items={content} />
          <FeatureGroup title="经营" items={business} />
        </section>
      </main>
    </div>
  )
}
