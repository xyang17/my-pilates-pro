'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Plan {
  id: string
  title: string
  description: string | null
  goal: string | null
  level: string | null
  duration_desc: string | null
  is_published: boolean
  created_at: string
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: '初级', intermediate: '中级', advanced: '高级',
}
const LEVEL_COLOR: Record<string, { bg: string; color: string }> = {
  beginner:     { bg: '#E8F5E9', color: '#2E7D32' },
  intermediate: { bg: '#FFF8E1', color: '#F57F17' },
  advanced:     { bg: '#FCE4EC', color: '#C62828' },
}

export default function ProgramsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dayData, setDayData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchPlans()
  }, [user, authLoading])

  const fetchPlans = async () => {
    const res = await fetch('/api/plans?published=1', {
      headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
    })
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }

  const handleExpand = async (planId: string) => {
    if (expanded === planId) { setExpanded(null); return }
    setExpanded(planId)
    if (dayData[planId]) return
    const res = await fetch(`/api/plans/${planId}`, {
      headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
    })
    if (res.ok) {
      const data = await res.json()
      setDayData(prev => ({ ...prev, [planId]: data.days }))
    }
  }

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600 }}>训练方案</h1>
        {(userRole === 'TRAINER' || userRole === 'ADMIN') && (
          <Link href="/dashboard/plans" style={{ fontSize: 13, color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>管理</Link>
        )}
        {userRole === 'CLIENT' && <div style={{ width: 40 }} />}
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 720, margin: '0 auto' }}>
        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15 }}>暂无公开的训练方案</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map(p => {
              const isOpen = expanded === p.id
              const lvl = LEVEL_COLOR[p.level || '']
              const days = dayData[p.id] || []
              return (
                <div key={p.id} style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  {/* Card header — click to expand */}
                  <div
                    onClick={() => handleExpand(p.id)}
                    style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                  >
                    {/* Icon */}
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c-lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      💪
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-primary)' }}>{p.title}</span>
                        {p.level && lvl && (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: lvl.bg, color: lvl.color, fontWeight: 500 }}>
                            {LEVEL_LABEL[p.level]}
                          </span>
                        )}
                      </div>
                      {p.description && <p style={{ margin: '0 0 6px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>{p.description}</p>}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {p.goal && <span style={{ fontSize: 12, color: '#888' }}>🎯 {p.goal}</span>}
                        {p.duration_desc && <span style={{ fontSize: 12, color: '#888' }}>⏱ {p.duration_desc}</span>}
                      </div>
                    </div>
                    <span style={{ color: '#bbb', fontSize: 18, flexShrink: 0, marginTop: 2 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded: training days */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--c-border)' }}>
                      {days.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>暂无训练日内容</div>
                      ) : (
                        days.map((day: any, di: number) => (
                          <div key={day.id} style={{ borderBottom: di < days.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                            {/* Day label */}
                            <div style={{ padding: '10px 20px', background: 'var(--c-fill-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--c-brand)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{di + 1}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>{day.label}</span>
                              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>{day.exercises.length} 个动作</span>
                            </div>
                            {/* Exercises */}
                            {day.exercises.map((ex: any, ei: number) => (
                              <div key={ex.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px',
                                borderBottom: ei < day.exercises.length - 1 ? '1px solid var(--c-border)' : 'none',
                                background: 'var(--c-card-bg)',
                              }}>
                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--c-fill-mid)', color: 'var(--c-text-secondary)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ei + 1}</span>
                                <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                                  {ex.master_exercise?.name_cn || '动作'}
                                </span>
                                <span style={{ fontSize: 12, color: '#aaa' }}>
                                  {[
                                    ex.sets && `${ex.sets}组`,
                                    ex.reps && `×${ex.reps}次`,
                                    ex.weight && `${ex.weight}kg`,
                                    ex.rest_sec && `休息${ex.rest_sec}s`,
                                  ].filter(Boolean).join(' · ') || '按指导执行'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
