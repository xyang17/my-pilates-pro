'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
}

interface ExerciseReview {
  id: string
  order: number
  sets?: number
  reps?: number
  weight?: number
  weight_unit: string
  duration?: number
  duration_unit: string
  instance_notes?: string
  // Review fields (editable)
  actual_sets: number | ''
  actual_reps: number | ''
  actual_weight: number | ''
  post_note: string
  master_exercise: MasterExercise
}

interface ClassData {
  id: string
  name: string
  date: string
  duration: number
  type: string
  class_type: string
  status: string
  notes?: string
  post_summary?: string
  exercises: any[]
}

export default function ClassReviewPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [exercises, setExercises] = useState<ExerciseReview[]>([])
  const [postSummary, setPostSummary] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')

  const { lang } = useLang()
  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (!authLoading && !isTrainer) {
      router.push('/dashboard/classes')
      return
    }
    if (user) fetchClassData()
  }, [user, authLoading, userRole])

  const fetchClassData = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('课程未找到')
      const data: ClassData = await res.json()
      setClassData(data)
      setPostSummary(data.post_summary || '')

      // Map exercises to review state
      setExercises(
        data.exercises.map((ex: any) => ({
          id: ex.id,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          weight_unit: ex.weight_unit || 'kg',
          duration: ex.duration,
          duration_unit: ex.duration_unit || 'minutes',
          instance_notes: ex.instance_notes,
          actual_sets: ex.actual_sets ?? '',
          actual_reps: ex.actual_reps ?? '',
          actual_weight: ex.actual_weight ?? '',
          // Pre-fill from planned notes if no post_note yet
          post_note: ex.post_note ?? ex.instance_notes ?? '',
          master_exercise: ex.master_exercise,
        }))
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateExercise = (id: string, field: keyof ExerciseReview, value: any) => {
    setExercises((prev) => prev.map((ex) => ex.id === id ? { ...ex, [field]: value } : ex))
  }

  // Auto-save individual exercise on blur
  const saveExercise = useCallback(async (ex: ExerciseReview) => {
    setSaveStatus('saving')
    try {
      await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          actual_sets:    ex.actual_sets   === '' ? null : Number(ex.actual_sets),
          actual_reps:    ex.actual_reps   === '' ? null : Number(ex.actual_reps),
          actual_weight:  ex.actual_weight === '' ? null : Number(ex.actual_weight),
          post_note:      ex.post_note || null,
          // Keep instance_notes in sync — edits here update the plan too
          instance_notes: ex.post_note || null,
        }),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('idle')
    }
  }, [classId, user])

  const handleComplete = async () => {
    if (isSaving) return
    setIsSaving(true)
    setError('')

    try {
      // Save all exercises first
      await Promise.all(
        exercises.map((ex) =>
          fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user?.id || '',
            },
            body: JSON.stringify({
              actual_sets:    ex.actual_sets   === '' ? null : Number(ex.actual_sets),
              actual_reps:    ex.actual_reps   === '' ? null : Number(ex.actual_reps),
              actual_weight:  ex.actual_weight === '' ? null : Number(ex.actual_weight),
              post_note:      ex.post_note || null,
              instance_notes: ex.post_note || null,
            }),
          })
        )
      )

      // Mark class as completed
      const res = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          status: 'completed',
          post_summary: postSummary || null,
          completed_at: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('保存失败')
      router.push(`/dashboard/classes/${classId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAIGenerateSummary = async () => {
    if (aiGenerating) return
    setAiGenerating(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          type: 'summary',
          lang,
          exercises: exercises.map(ex => ({
            name_cn: ex.master_exercise.name_cn,
            name_en: ex.master_exercise.name_en,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            weight_unit: ex.weight_unit,
            actual_sets: ex.actual_sets,
            actual_reps: ex.actual_reps,
            actual_weight: ex.actual_weight,
            instance_notes: ex.instance_notes,
            post_note: ex.post_note,
          })),
          classNotes: classData?.notes || '',
        }),
      })
      const data = await res.json()
      if (data.result) {
        setPostSummary(data.result)
      } else {
        setAiError(data.error || 'AI 生成失败，请重试')
      }
    } catch {
      setAiError('AI 请求失败，请检查网络后重试')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSaveDraft = async () => {
    setSaveStatus('saving')
    try {
      await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ post_summary: postSummary || null }),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('idle')
    }
  }

  if (authLoading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (!classData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>{error || '课程未找到'}</p>
        <Link href="/dashboard/classes" style={{ color: 'var(--c-brand)' }}>← 返回</Link>
      </div>
    )
  }

  const isCompleted = classData.status === 'completed'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href={`/dashboard/classes/${classId}`} style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
          ← 返回
        </Link>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{isCompleted ? '课后记录' : '课后复盘'}</h1>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
            {classData.name} · {new Date(classData.date).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: saveStatus === 'saved' ? 'var(--c-brand)' : 'var(--c-text-hint)', flexShrink: 0 }}>
          {saveStatus === 'saving' ? '保存中…' : saveStatus === 'saved' ? '✓ 已保存' : ''}
        </div>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
        {error && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Exercise list */}
        {exercises.length === 0 ? (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999', marginBottom: '16px' }}>
            <p>这节课没有预设动作</p>
            <p style={{ fontSize: '13px' }}>课后总结直接在下方填写即可</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {exercises.map((ex, i) => (
              <div key={ex.id} style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px' }}>
                {/* Exercise title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '26px', height: '26px',
                    backgroundColor: 'var(--c-brand)', color: 'white',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{ex.master_exercise.name_en}</span>
                    <span style={{ color: '#999', fontSize: '13px', marginLeft: '8px' }}>{ex.master_exercise.name_cn}</span>
                  </div>
                </div>

                {/* Planned vs Actual */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  {/* Sets */}
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999' }}>
                      组数 {ex.sets != null ? <span style={{ color: '#bbb' }}>计划 {ex.sets}</span> : ''}
                    </p>
                    <input
                      type="number"
                      min="0"
                      placeholder={ex.sets != null ? String(ex.sets) : '—'}
                      value={ex.actual_sets}
                      disabled={isCompleted}
                      onChange={(e) => updateExercise(ex.id, 'actual_sets', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: isCompleted ? '#fafafa' : 'white',
                      }}
                    />
                  </div>
                  {/* Reps */}
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999' }}>
                      次数 {ex.reps != null ? <span style={{ color: '#bbb' }}>计划 {ex.reps}</span> : ''}
                    </p>
                    <input
                      type="number"
                      min="0"
                      placeholder={ex.reps != null ? String(ex.reps) : '—'}
                      value={ex.actual_reps}
                      disabled={isCompleted}
                      onChange={(e) => updateExercise(ex.id, 'actual_reps', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: isCompleted ? '#fafafa' : 'white',
                      }}
                    />
                  </div>
                  {/* Weight */}
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999' }}>
                      重量(kg) {ex.weight != null ? <span style={{ color: '#bbb' }}>计划 {ex.weight}</span> : ''}
                    </p>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={ex.weight != null ? String(ex.weight) : '—'}
                      value={ex.actual_weight}
                      disabled={isCompleted}
                      onChange={(e) => updateExercise(ex.id, 'actual_weight', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: isCompleted ? '#fafafa' : 'white',
                      }}
                    />
                  </div>
                </div>

                {/* Per-exercise note */}
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999' }}>动作备注</p>
                  <textarea
                    rows={2}
                    placeholder="例：右侧髋关节有点紧，下次注意..."
                    value={ex.post_note}
                    disabled={isCompleted}
                    onChange={(e) => updateExercise(ex.id, 'post_note', e.target.value)}
                    onBlur={() => saveExercise(ex)}
                    style={{
                      width: '100%',
                      padding: '7px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'sans-serif',
                      resize: 'vertical',
                      backgroundColor: isCompleted ? '#fafafa' : 'white',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overall summary */}
        <div style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#444' }}>整体课程总结</p>
            {!isCompleted && (
              <button
                onClick={handleAIGenerateSummary}
                disabled={aiGenerating}
                style={{
                  padding: '5px 12px',
                  border: '1px solid var(--c-border-em)',
                  borderRadius: '6px',
                  background: aiGenerating ? '#f0edf7' : 'var(--c-fill-light)',
                  color: 'var(--c-brand)',
                  cursor: aiGenerating ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {aiGenerating ? '✨ 生成中…' : '✨ AI生成总结'}
              </button>
            )}
          </div>
          <textarea
            rows={5}
            placeholder="例：学员今天状态很好，核心力量明显进步。下次可以增加难度，尝试单腿训练..."
            value={postSummary}
            disabled={isCompleted}
            onChange={(e) => setPostSummary(e.target.value)}
            onBlur={handleSaveDraft}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'sans-serif',
              resize: 'vertical',
              backgroundColor: isCompleted ? '#fafafa' : 'white',
            }}
          />
          {aiGenerating && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--c-brand)', opacity: 0.7 }}>
              AI 正在分析课程数据并生成总结…
            </p>
          )}
          {aiError && (
            <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 6, fontSize: 12, color: '#e65100' }}>
              ⚠️ {aiError}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isCompleted ? (
          <button
            onClick={handleComplete}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: isSaving ? '#bbb' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? '保存中...' : '✓ 完成本课'}
          </button>
        ) : (
          <div style={{
            padding: '14px',
            backgroundColor: '#E8F5E9',
            color: '#2E7D32',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
          }}>
            ✓ 本课已完成记录
          </div>
        )}
      </main>
    </div>
  )
}
