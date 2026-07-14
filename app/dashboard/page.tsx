'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, Clock, Users, ClipboardCheck, Plus } from 'lucide-react'

interface DashboardData {
  today_classes: {
    id: string
    name: string
    date: string
    duration: number
    type: string
    class_type: string
    status: string
    post_summary: string | null
    client_names: string[]
  }[]
  month_count: number
  pending_review: number
  client_count: number
  date: string
}

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const STATUS_LABEL: Record<string, { text: string; bg: string; color: string }> = {
  scheduled:   { text: '待上课', bg: '#EDE6F4', color: '#9880B8' },
  in_progress: { text: '进行中', bg: '#FFF8E1', color: '#F57F17' },
  completed:   { text: '已完成', bg: '#E8F5E9', color: '#2E7D32' },
  cancelled:   { text: '已取消', bg: '#F5EDED', color: '#C4A4A4' },
}

export default function DashboardPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (user) fetchDashboard()
  }, [user, loading])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setData(await res.json())
    } finally {
      setFetching(false)
    }
  }

  if (loading || fetching) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--c-text-secondary)' }}>
      加载中…
    </div>
  )

  const isTrainer = userRole === 'TRAINER' || userRole === 'ADMIN'
  const now = new Date()
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 · ${WEEKDAY_ZH[now.getDay()]}`
  const displayName = user?.user_metadata?.name || user?.email || ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Mobile top header */}
      <header
        className="md:hidden"
        style={{
          background: 'var(--c-card-bg)',
          borderBottom: '1px solid var(--c-border)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>MyFitnessPro</span>
        <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--c-fill-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--c-brand)',
          }}>
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </Link>
      </header>

      <main style={{ padding: '24px 20px', maxWidth: 760, margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--c-text-hint)', margin: '0 0 2px' }}>{dateLabel}</p>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>
            你好，{displayName.split('@')[0]} 👋
          </h1>
        </div>

        {/* Stats — trainer only */}
        {isTrainer && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { label: '本月课程', value: data?.month_count ?? 0,   icon: Calendar,       href: '/dashboard/calendar', highlight: false },
              { label: '学员数',   value: data?.client_count ?? 0,  icon: Users,          href: '/dashboard/clients',  highlight: false },
              { label: '待复盘',   value: data?.pending_review ?? 0, icon: ClipboardCheck, href: '/dashboard/classes',  highlight: (data?.pending_review ?? 0) > 0 },
            ].map(stat => (
              <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--c-card-bg)',
                  border: `1px solid ${stat.highlight ? 'var(--c-brand)' : 'var(--c-border)'}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                }}>
                  <stat.icon size={14} color={stat.highlight ? 'var(--c-brand)' : 'var(--c-text-hint)'} />
                  <p style={{ fontSize: 22, fontWeight: 700, color: stat.highlight ? 'var(--c-brand)' : 'var(--c-text-primary)', margin: '6px 0 2px' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--c-text-hint)', margin: 0 }}>{stat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Today's classes */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: 0 }}>
              今日课程{data?.today_classes.length ? ` (${data.today_classes.length})` : ''}
            </h2>
            {isTrainer && (
              <Link href="/dashboard/classes/new" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>
                <Plus size={14} /> 新建
              </Link>
            )}
          </div>

          {!data?.today_classes.length ? (
            <div style={{ background: 'var(--c-card-bg)', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
              <Calendar size={28} color="var(--c-text-hint)" style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ fontSize: 14, color: 'var(--c-text-hint)', margin: 0 }}>今天没有课程安排</p>
              {isTrainer && (
                <Link href="/dashboard/classes/new" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>
                  + 新建课程
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.today_classes.map(cls => {
                const st = STATUS_LABEL[cls.status] || STATUS_LABEL.scheduled
                const time = new Date(cls.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                const needsReview = cls.status === 'completed' && !cls.post_summary
                return (
                  <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'var(--c-card-bg)',
                      border: `1px solid ${needsReview ? 'var(--c-brand)' : 'var(--c-border)'}`,
                      borderRadius: 12, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14,
                    }}>
                      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: st.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>{cls.name}</span>
                          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 500 }}>
                            {st.text}
                          </span>
                          {needsReview && (
                            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: '#EDE6F4', color: '#9880B8', fontWeight: 500 }}>
                              待复盘
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--c-text-hint)' }}>
                            <Clock size={11} /> {time}
                          </span>
                          {cls.duration && (
                            <span style={{ fontSize: 12, color: 'var(--c-text-hint)' }}>{cls.duration} 分钟</span>
                          )}
                          {cls.client_names?.length > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--c-text-hint)' }}>
                              <Users size={11} />
                              {cls.client_names.slice(0, 2).join('、')}{cls.client_names.length > 2 ? ` 等${cls.client_names.length}人` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={16} color="var(--c-text-hint)" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick links — trainer only */}
        {isTrainer && (
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 12px' }}>快捷入口</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: '课程日历',  href: '/dashboard/calendar',    emoji: '📅' },
                { label: '学员管理',  href: '/dashboard/clients',     emoji: '👥' },
                { label: '身体测试',  href: '/dashboard/assessments', emoji: '🧪' },
                { label: '我的计划',  href: '/dashboard/plans',       emoji: '📋' },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--c-card-bg)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)' }}>{item.label}</span>
                    <ChevronRight size={14} color="var(--c-text-hint)" style={{ marginLeft: 'auto' }} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
