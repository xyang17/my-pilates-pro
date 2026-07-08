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
  notes?: string        // trainer's instruction (read-only)
  client_note?: string  // client's own note (editable)
  order_num: number
  master_exercise: {
    id: string
    name_cn: string
    name_en: string
    featured_image_url?: string
    type_cn?: string
    type_en?: string
    difficulty_cn?: string
    difficulty_en?: string
    target_muscles_cn?: string
    target_muscles_en?: string
    description_cn?: string
    description_en?: string
    instructions_cn?: string
    instructions_en?: string
  }
}

interface ExerciseDetail {
  id: string
  name_cn: string
  name_en: string
  featured_image_url?: string
  type_cn?: string
  type_en?: string
  difficulty_cn?: string
  difficulty_en?: string
  target_muscles_cn?: string
  target_muscles_en?: string
  description_cn?: string
  description_en?: string
  instructions_cn?: string
  instructions_en?: string
  default_sets?: number
  default_reps?: number
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
  const [deletingHwId, setDeletingHwId] = useState<string | null>(null)
  // Exercise detail drawer
  const [detailExercise, setDetailExercise] = useState<ExerciseDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Client notes per exercise (keyed by homework_exercise.id)
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({})
  const [savingNoteIds, setSavingNoteIds] = useState<Set<string>>(new Set())

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

  const saveClientNote = async (hwId: string, exId: string, note: string) => {
    setSavingNoteIds(prev => new Set(prev).add(exId))
    try {
      await fetch(`/api/homework/${hwId}/exercises/${exId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ client_note: note || null }),
      })
      // Update local list so it persists without re-fetch
      setHomeworkList(prev => prev.map(h => h.id !== hwId ? h : {
        ...h,
        homework_exercise: h.homework_exercise.map(e => e.id !== exId ? e : { ...e, client_note: note || undefined })
      }))
    } catch { /* silent */ }
    finally { setSavingNoteIds(prev => { const s = new Set(prev); s.delete(exId); return s }) }
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

  const handleDeleteHomework = async (hw: Homework) => {
    if (!window.confirm(`确定删除作业「${hw.title}」？此操作无法撤销。`)) return
    setDeletingHwId(hw.id)
    try {
      const res = await fetch(`/api/homework/${hw.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) setHomeworkList(prev => prev.filter(h => h.id !== hw.id))
      else alert('删除失败，请重试')
    } catch {
      alert('网络错误，请重试')
    } finally {
      setDeletingHwId(null)
    }
  }

  const openDetail = async (exerciseId: string) => {
    setLoadingDetail(true)
    setDetailExercise(null)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) setDetailExercise(await res.json())
    } catch { /* non-critical */ }
    finally { setLoadingDetail(false) }
  }

  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'

  // Translate legacy "作业" suffix in stored titles when in English mode
  const displayTitle = (title: string) => {
    if (lang === 'zh') return title
    return title.replace(/\s*作业$/, ' Homework')
  }

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
                        {displayTitle(hw.title)}
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
                    {/* Delete button — trainer only */}
                    {isTrainer && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteHomework(hw) }}
                        disabled={deletingHwId === hw.id}
                        title={t('删除作业', 'Delete homework')}
                        style={{
                          width: 28, height: 28, border: 'none', borderRadius: '50%',
                          background: 'transparent', color: '#ccc', fontSize: 14,
                          cursor: deletingHwId === hw.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.15s, color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}
                      >
                        {deletingHwId === hw.id ? '…' : '✕'}
                      </button>
                    )}
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
                      {[...hw.homework_exercise].sort((a, b) => a.order_num - b.order_num).map((ex, i) => {
                        const noteKey = ex.id
                        const localNote = localNotes[noteKey] ?? (ex.client_note || '')
                        const hasNote = localNote.trim().length > 0
                        const isSavingNote = savingNoteIds.has(noteKey)
                        return (
                          <div key={ex.id} style={{
                            borderBottom: i < hw.homework_exercise.length - 1 ? '1px solid var(--c-border)' : 'none',
                          }}>
                            {/* Exercise row — tap to open detail */}
                            <div
                              onClick={() => openDetail(ex.master_exercise.id)}
                              style={{ display: 'flex', gap: 'var(--sp-3)', padding: 'var(--sp-3) var(--sp-4)', alignItems: 'center', cursor: 'pointer' }}>
                              <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--c-fill-light)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-brand)', flexShrink: 0 }}>{t('详情', 'Details')} ›</span>
                            </div>

                            {/* Client note row — stop propagation so it doesn't open detail */}
                            <div onClick={e => e.stopPropagation()} style={{ padding: '0 var(--sp-4) var(--sp-3)', paddingLeft: 'calc(var(--sp-4) + 36px + var(--sp-3))' }}>
                              <textarea
                                value={localNote}
                                onChange={e => setLocalNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                onBlur={() => {
                                  if (localNote !== (ex.client_note || '')) {
                                    saveClientNote(hw.id, ex.id, localNote)
                                  }
                                }}
                                placeholder={t('添加备注（弹簧调整、感受等）', 'Add note (spring, feedback…)')}
                                rows={hasNote ? 2 : 1}
                                style={{
                                  width: '100%', boxSizing: 'border-box',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid var(--c-border)',
                                  background: 'var(--c-fill-light)',
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--c-text-primary)',
                                  resize: 'none',
                                  outline: 'none',
                                  fontFamily: 'inherit',
                                  lineHeight: 1.5,
                                  opacity: isSavingNote ? 0.6 : 1,
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}

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

      {/* Exercise Detail Drawer */}
      {(loadingDetail || detailExercise) && (
        <div
          onClick={() => setDetailExercise(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--c-card-bg)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

            {/* Drawer handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--c-fill-mid)' }} />
            </div>

            {loadingDetail ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--c-fill-mid)', borderTopColor: 'var(--c-brand)', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
              </div>
            ) : detailExercise && (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {/* Header */}
                <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--c-text-primary)' }}>
                        {lang === 'zh' ? (detailExercise.name_cn || detailExercise.name_en) : (detailExercise.name_en || detailExercise.name_cn)}
                      </p>
                      {detailExercise.name_cn && detailExercise.name_en && (
                        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>
                          {lang === 'zh' ? detailExercise.name_en : detailExercise.name_cn}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setDetailExercise(null)}
                      style={{ background: 'var(--c-fill-light)', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)', flexShrink: 0 }}>✕</button>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {(lang === 'zh' ? detailExercise.type_cn : detailExercise.type_en) && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--c-fill-light)', color: 'var(--c-brand)', fontWeight: 600 }}>
                        {lang === 'zh' ? detailExercise.type_cn : detailExercise.type_en}
                      </span>
                    )}
                    {(lang === 'zh' ? detailExercise.difficulty_cn : detailExercise.difficulty_en) && (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)' }}>
                        {lang === 'zh' ? detailExercise.difficulty_cn : detailExercise.difficulty_en}
                      </span>
                    )}
                  </div>
                </div>

                {/* Featured image */}
                {detailExercise.featured_image_url && (
                  <div style={{ background: 'var(--c-fill-light)' }}>
                    <img src={detailExercise.featured_image_url} alt={detailExercise.name_en}
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Target muscles */}
                  {(lang === 'zh' ? detailExercise.target_muscles_cn : detailExercise.target_muscles_en) && (
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t('目标肌群', 'Target Muscles')}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', lineHeight: 1.6 }}>
                        {lang === 'zh' ? detailExercise.target_muscles_cn : detailExercise.target_muscles_en}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {(lang === 'zh' ? detailExercise.description_cn : detailExercise.description_en) && (
                    <div>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t('动作说明', 'Description')}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {lang === 'zh' ? detailExercise.description_cn : detailExercise.description_en}
                      </p>
                    </div>
                  )}

                  {/* Instructions / Key points */}
                  {(lang === 'zh' ? detailExercise.instructions_cn : detailExercise.instructions_en) && (
                    <div style={{ background: 'var(--c-fill-light)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--c-brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        📌 {t('动作要点', 'Key Points')}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {lang === 'zh' ? detailExercise.instructions_cn : detailExercise.instructions_en}
                      </p>
                    </div>
                  )}

                  {!detailExercise.description_cn && !detailExercise.description_en &&
                   !detailExercise.instructions_cn && !detailExercise.instructions_en && (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-hint)', textAlign: 'center', padding: '20px 0' }}>
                      {t('暂无详细说明', 'No details added yet')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
