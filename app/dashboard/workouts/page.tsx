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

  if (loading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#E8A87C', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← {t('返回', 'Back')}</Link>
        <h1 style={{ margin: 0, fontSize: '18px' }}>📋 {t('课后作业', 'Homework')}</h1>
      </header>

      <main style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
        {isTrainer && (
          <div style={{ backgroundColor: '#fff8f3', border: '1px solid #fde8d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#a0643a' }}>
            {t('你正在以教练身份查看自己布置的作业。在课程详情页点击「布置作业」给学员分配。', 'Viewing homework you assigned. Go to a class detail page and click "Assign Homework" to create one.')}
          </div>
        )}

        {homeworkList.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '17px', color: '#333' }}>{t('暂无作业', 'No Homework Yet')}</h2>
            <p style={{ margin: '0 0 20px 0', color: '#999', fontSize: '13px' }}>
              {isTrainer
                ? t('在课程详情页点击「布置作业」开始分配', 'Go to a class and click "Assign Homework" to get started')
                : t('教练还没有给你布置作业', 'Your trainer hasn\'t assigned any homework yet')}
            </p>
            {isTrainer && (
              <Link href="/dashboard/classes" style={{ color: '#E8A87C', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
                → {t('去课程列表', 'Go to Classes')}
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {homeworkList.map(hw => {
              const isExpanded = expandedId === hw.id
              const isDone = hw.status === 'completed'
              const isOverdue = hw.due_date && !isDone && new Date(hw.due_date) < new Date()
              return (
                <div key={hw.id} style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', border: isDone ? '1px solid #c8f0d4' : isOverdue ? '1px solid #ffd0cc' : '1px solid #eee' }}>
                  {/* Header row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : hw.id)}
                    style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isDone ? '#EAFAF1' : '#fff8f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      {isDone ? '✅' : '📋'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#aaa' : '#333' }}>
                        {hw.title}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        {hw.homework_exercise.length} {t('个动作', 'exercises')}
                        {hw.class && ` · ${hw.class.name}`}
                        {hw.due_date && (
                          <span style={{ color: isOverdue ? '#E74C3C' : '#aaa' }}>
                            {' · '}{t('截止', 'Due')} {new Date(hw.due_date + 'T12:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                            {isOverdue && ` (${t('已逾期', 'Overdue')})`}
                          </span>
                        )}
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#bbb', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f5f5f5' }}>
                      {hw.notes && (
                        <div style={{ padding: '10px 16px', backgroundColor: '#fafafa', fontSize: '13px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                          💬 {hw.notes}
                        </div>
                      )}

                      {/* Exercise list */}
                      {[...hw.homework_exercise].sort((a, b) => a.order_num - b.order_num).map((ex, i) => (
                        <div key={ex.id} style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: i < hw.homework_exercise.length - 1 ? '1px solid #f5f5f5' : 'none', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0eaf8', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {ex.master_exercise.featured_image_url
                              ? <img src={ex.master_exercise.featured_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: '16px' }}>🏋️</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px' }}>
                              {lang === 'zh' ? (ex.master_exercise.name_cn || ex.master_exercise.name_en) : (ex.master_exercise.name_en || ex.master_exercise.name_cn)}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                              {[
                                ex.sets && `${ex.sets} ${t('组', 'sets')}`,
                                ex.reps && `× ${ex.reps} ${t('次', 'reps')}`,
                                ex.weight && `${ex.weight} ${ex.weight_unit}`,
                                ex.duration && `${ex.duration} ${ex.duration_unit === 'seconds' ? t('秒', 'sec') : t('分钟', 'min')}`,
                              ].filter(Boolean).join(' · ') || t('按个人节奏完成', 'At your own pace')}
                            </p>
                            {ex.notes && <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#9B7DB5', fontStyle: 'italic' }}>📌 {ex.notes}</p>}
                          </div>
                          <Link href={`/dashboard/exercises/${ex.master_exercise.id}`}
                            style={{ fontSize: '11px', color: '#9B7DB5', textDecoration: 'none', flexShrink: 0 }}>
                            {t('详情', 'Detail')} →
                          </Link>
                        </div>
                      ))}

                      {/* Complete button (student only) */}
                      {!isTrainer && (
                        <div style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => handleComplete(hw)}
                            disabled={completing === hw.id}
                            style={{
                              width: '100%', padding: '11px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                              backgroundColor: isDone ? '#f5f5f5' : '#E8A87C',
                              color: isDone ? '#999' : 'white',
                            }}>
                            {completing === hw.id ? '...' : isDone ? `✓ ${t('已完成 · 取消', 'Completed · Undo')}` : t('✓ 标记完成', '✓ Mark Complete')}
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
