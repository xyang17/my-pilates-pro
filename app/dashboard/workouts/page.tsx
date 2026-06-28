'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HomeworkExercise {
  id: string
  sets?: number
  reps?: number
  weight?: number
  weight_unit: string
  duration?: number
  duration_unit: string
  notes?: string
  order_num: number
  master_exercise: {
    id: string
    name_cn: string
    name_en: string
    featured_image_url?: string
  }
}

interface Homework {
  id: string
  title: string
  due_date?: string
  notes?: string
  status: 'assigned' | 'completed'
  created_at: string
  class?: { id: string; name: string; date: string; discipline?: string }
  homework_exercise: HomeworkExercise[]
}

export default function WorkoutsPage() {
  const { user, userRole, loading } = useAuth()
  const { t, lang } = useLang()
  const router = useRouter()
  const [homeworkList, setHomeworkList] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (user) fetchHomework()
  }, [user, loading])

  const fetchHomework = async () => {
    try {
      const res = await fetch('/api/homework', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setHomeworkList(await res.json())
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async (hw: Homework) => {
    setCompleting(hw.id)
    try {
      const newStatus = hw.status === 'completed' ? 'assigned' : 'completed'
      const res = await fetch(`/api/homework/${hw.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchHomework()
    } finally {
      setCompleting(null)
    }
  }

  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'

  if (loading || isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--c-fill-mid)', borderTopColor: 'var(--c-brand)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← {t('返回', 'Back')}</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {t('课后作业', 'Homework')}
        </h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 700, margin: '0 auto' }}>
        {isTrainer && (
          <div style={{
            background: 'var(--c-fill-light)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-3) var(--sp-4)',
            marginBottom: 'var(--sp-4)',
            fontSize: 'var(--text-sm)',
            color: 'var(--c-text-secondary)',
          }}>
            {t('你正在以教练身份查看自己布置的作业。在课程详情页点击「布置作业」给学员分配。', 'Viewing homework you assigned. Go to a class detail page and click "Assign Homework" to create one.')}
          </div>
        )}

        {homeworkList.length === 0 ? (
          <div style={{
            background: 'var(--c-card-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-10) var(--sp-6)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 'var(--sp-4)' }}>📋</div>
            <h2 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
              {t('暂无作业', 'No Homework Yet')}
            </h2>
            <p style={{ margin: '0 0 var(--sp-5)', color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>
              {isTrainer
                ? t('在课程详情页点击「布置作业」开始分配', 'Go to a class and click "Assign Homework" to get started')
                : t('教练还没有给你布置作业', 'Your trainer hasn\'t assigned any homework yet')}
            </p>
            {isTrainer && (
              <Link href="/dashboard/classes" style={{ color: 'var(--c-brand)', fontWeight: 500, fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
                → {t('去课程列表', 'Go to Classes')}
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
            {homeworkList.map(hw => {
              const isExpanded = expandedId === hw.id
              const isDone = hw.status === 'completed'
              const isOverdue = hw.due_date && !isDone && new Date(hw.due_date) < new Date()
              return (
                <div key={hw.id} style={{
                  background: 'var(--c-card-bg)',
                  borderRadius: 'var(--r-lg)',
                  overflow: 'hidden',
                  border: isDone
                    ? '1px solid var(--c-border-em)'
                    : isOverdue
                    ? '1px solid var(--c-error)'
                    : '1px solid var(--c-border)',
                }}>
                  {/* Header row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : hw.id)}
                    style={{ padding: 'var(--sp-4)', cursor: 'pointer', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--r-md)',
                      background: isDone ? 'var(--c-fill-light)' : 'var(--c-fill-mid)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                      color: 'var(--c-brand)',
                    }}>
                      {isDone ? '✓' : '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: '0 0 3px', fontWeight: 600, fontSize: 'var(--text-base)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        color: isDone ? 'var(--c-text-hint)' : 'var(--c-text-primary)',
                      }}>
                        {hw.title}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
                        {hw.homework_exercise.length} {t('个动作', 'exercises')}
                        {hw.class && ` · ${hw.class.name}`}
                        {hw.due_date && (
                          <span style={{ color: isOverdue ? 'var(--c-error)' : 'var(--c-text-hint)' }}>
                            {' · '}{t('截止', 'Due')} {new Date(hw.due_date + 'T12:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                            {isOverdue && ` (${t('已逾期', 'Overdue')})`}
                          </span>
                        )}
                      </p>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--c-border)' }}>
                      {hw.notes && (
                        <div style={{
                          padding: 'var(--sp-3) var(--sp-4)',
                          background: 'var(--c-fill-light)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--c-text-secondary)',
                          borderBottom: '1px solid var(--c-border)',
                        }}>
                          💬 {hw.notes}
                        </div>
                      )}

                      {/* Exercise list */}
                      {[...hw.homework_exercise].sort((a, b) => a.order_num - b.order_num).map((ex, i) => (
                        <div key={ex.id} style={{
                          display: 'flex', gap: 'var(--sp-3)',
                          padding: 'var(--sp-3) var(--sp-4)',
                          borderBottom: i < hw.homework_exercise.length - 1 ? '1px solid var(--c-border)' : 'none',
                          alignItems: 'center',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--r-md)',
                            background: 'var(--c-fill-light)',
                            overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {ex.master_exercise.featured_image_url
                              ? <img src={ex.master_exercise.featured_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 16 }}>🏋️</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>
                              {lang === 'zh' ? (ex.master_exercise.name_cn || ex.master_exercise.name_en) : (ex.master_exercise.name_en || ex.master_exercise.name_cn)}
                            </p>
                            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
                              {[
                                ex.sets && `${ex.sets} ${t('组', 'sets')}`,
                                ex.reps && `× ${ex.reps} ${t('次', 'reps')}`,
                                ex.weight && `${ex.weight} ${ex.weight_unit}`,
                                ex.duration && `${ex.duration} ${ex.duration_unit === 'seconds' ? t('秒', 'sec') : t('分钟', 'min')}`,
                              ].filter(Boolean).join(' · ') || t('按个人节奏完成', 'At your own pace')}
                            </p>
                            {ex.notes && <p style={{ margin: '3px 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-brand)', fontStyle: 'italic' }}>📌 {ex.notes}</p>}
                          </div>
                          <Link href={`/dashboard/exercises/${ex.master_exercise.id}`}
                            style={{ fontSize: 'var(--text-xs)', color: 'var(--c-brand)', textDecoration: 'none', flexShrink: 0 }}>
                            {t('详情', 'Detail')} →
                          </Link>
                        </div>
                      ))}

                      {/* Complete button (student only) */}
                      {!isTrainer && (
                        <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                          <button
                            onClick={() => handleComplete(hw)}
                            disabled={completing === hw.id}
                            style={{
                              width: '100%', padding: 'var(--sp-3)',
                              borderRadius: 'var(--r-md)',
                              border: isDone ? '1px solid var(--c-border)' : 'none',
                              cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-base)',
                              background: isDone ? 'var(--c-fill-light)' : 'var(--c-brand)',
                              color: isDone ? 'var(--c-text-secondary)' : '#fff',
                            }}>
                            {completing === hw.id ? '…' : isDone ? `✓ ${t('已完成 · 取消', 'Completed · Undo')}` : t('✓ 标记完成', '✓ Mark Complete')}
                          </button>
                        </div>
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
