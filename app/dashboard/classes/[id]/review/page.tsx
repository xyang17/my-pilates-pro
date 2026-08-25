'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { generateReviewShareCard } from '@/lib/shareCard'

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
}

interface SetDetail {
  id?: string
  set_no: number
  reps: number | ''
  weight: number | ''
  weight_unit: string
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
  // 每组明细（训练容量）——默认不填，展开才有；填了就是每组的真实次数/重量
  set_details: SetDetail[]
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
  assigned_to?: string
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
  const [isEditing, setIsEditing] = useState(false)
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({})
  const [clientName, setClientName] = useState('')
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const [shareBlob, setShareBlob] = useState<Blob | null>(null)
  const [generatingShare, setGeneratingShare] = useState(false)
  const [shareError, setShareError] = useState('')
  const [shareLang, setShareLang] = useState<'zh' | 'en'>('zh')

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

  // 私教课有明确的学员（assigned_to），拿来给分享卡片抬头用；
  // 团课没有单一学员，改拿报名名单拼名字。仅用于页面上展示，
  // 生成图片时会重新现查一次，不依赖这里的时机，避免"刚进页面就点生成"时名字还没查到。
  useEffect(() => {
    if (classData?.assigned_to && user) {
      fetch(`/api/clients/${classData.assigned_to}`, {
        headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.name) setClientName(data.name) })
        .catch(() => {})
    }
  }, [classData?.assigned_to, user, userRole])

  // 生成图片前现查一次学员姓名，不依赖上面那个 useEffect 有没有查完——
  // 避免"复盘页刚加载完，手一快就点生成"时标题显示成占位符而不是真名字。
  const resolveClientName = async (): Promise<string> => {
    if (!classData || !user) return ''
    if (classData.assigned_to) {
      try {
        const res = await fetch(`/api/clients/${classData.assigned_to}`, {
          headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
        })
        const data = res.ok ? await res.json() : null
        if (data?.name) return data.name
      } catch {}
      return clientName // 现查失败就退回已有的（如果有）
    }
    // 团课：拿报名名单拼名字
    try {
      const res = await fetch(`/api/classes/${classId}/enrollments`, { headers: { 'x-user-id': user.id } })
      const list = res.ok ? await res.json() : []
      const names = (list || []).map((e: any) => e.student?.name).filter(Boolean)
      if (names.length === 0) return ''
      if (names.length <= 2) return names.join('、')
      return `${names.slice(0, 2).join('、')} 等${names.length}人`
    } catch {
      return ''
    }
  }

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
          set_details: (ex.set_details || [])
            .map((s: any) => ({
              id: s.id,
              set_no: s.set_no,
              reps: s.reps ?? '',
              weight: s.weight ?? '',
              weight_unit: s.weight_unit || 'kg',
            }))
            .sort((a: SetDetail, b: SetDetail) => a.set_no - b.set_no),
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

  // 保存"每组明细"：把当前这个动作的整组数组传给后端，后端负责增删改。
  // 顺便把 actual_sets 同步成明细的组数——填了明细就不用再手动改一遍组数了。
  const saveSets = useCallback(async (ex: ExerciseReview) => {
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/classes/${classId}/exercises/${ex.id}/sets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          sets: ex.set_details.map(s => ({
            set_no: s.set_no,
            reps: s.reps === '' ? null : Number(s.reps),
            weight: s.weight === '' ? null : Number(s.weight),
            weight_unit: s.weight_unit,
          })),
        }),
      })
      if (!res.ok) { setSaveStatus('idle'); return }

      // 组数明细数量同步回 actual_sets，省得再手动改一遍
      const newActualSets = ex.set_details.length > 0 ? ex.set_details.length : ''
      updateExercise(ex.id, 'actual_sets', newActualSets)
      await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ actual_sets: newActualSets === '' ? null : Number(newActualSets) }),
      })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch {
      setSaveStatus('idle')
    }
  }, [classId, user])

  const toggleSetDetails = (ex: ExerciseReview) => {
    const willExpand = !expandedSets[ex.id]
    setExpandedSets(prev => ({ ...prev, [ex.id]: willExpand }))

    // 第一次展开、还没有任何明细时，按"计划/已填组数"自动生成对应行数，
    // 每行预填实际（或计划）次数/重量——教练只需要改有变化的那一组，不用从零开始填。
    if (willExpand && ex.set_details.length === 0) {
      const count = Number(ex.actual_sets) || Number(ex.sets) || 1
      const reps = ex.actual_reps !== '' ? ex.actual_reps : (ex.reps ?? '')
      const weight = ex.actual_weight !== '' ? ex.actual_weight : (ex.weight ?? '')
      const rows: SetDetail[] = Array.from({ length: count }, (_, i) => ({
        set_no: i + 1, reps, weight, weight_unit: ex.weight_unit || 'kg',
      }))
      updateExercise(ex.id, 'set_details', rows)
    }
  }

  const addSet = (ex: ExerciseReview) => {
    const last = ex.set_details[ex.set_details.length - 1]
    const row: SetDetail = last
      ? { ...last, set_no: last.set_no + 1 }
      : { set_no: 1, reps: ex.reps ?? '', weight: ex.weight ?? '', weight_unit: ex.weight_unit || 'kg' }
    const updated = [...ex.set_details, row]
    updateExercise(ex.id, 'set_details', updated)
    saveSets({ ...ex, set_details: updated })
  }

  const removeSet = (ex: ExerciseReview, setNo: number) => {
    const updated = ex.set_details
      .filter(s => s.set_no !== setNo)
      .map((s, i) => ({ ...s, set_no: i + 1 })) // 重新编号，组号不留空
    updateExercise(ex.id, 'set_details', updated)
    saveSets({ ...ex, set_details: updated })
  }

  const updateSetField = (ex: ExerciseReview, setNo: number, field: 'reps' | 'weight', value: string) => {
    const updated = ex.set_details.map(s => s.set_no === setNo ? { ...s, [field]: value } : s)
    updateExercise(ex.id, 'set_details', updated)
  }

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

  // 生成一张可以直接发微信的复盘分享图。右下角带二维码，
  // 扫码跳到官网登录页——客户想看更详细的历史记录/趋势，扫一下就能进来。
  const handleGenerateShare = async () => {
    if (!classData) return
    setGeneratingShare(true)
    setShareError('')
    try {
      const resolvedName = await resolveClientName()
      if (resolvedName) setClientName(resolvedName)

      const blob = await generateReviewShareCard({
        lang: shareLang,
        studioName: 'MyFitnessPro',
        clientName: resolvedName,
        className: classData.name,
        date: new Date(classData.date),
        exercises: exercises.map(ex => ({
          name_cn: ex.master_exercise.name_cn || ex.master_exercise.name_en,
          name_en: ex.master_exercise.name_en,
          sets: ex.sets, reps: ex.reps, weight: ex.weight, weightUnit: ex.weight_unit,
          actualSets: ex.actual_sets === '' ? null : Number(ex.actual_sets),
          actualReps: ex.actual_reps === '' ? null : Number(ex.actual_reps),
          actualWeight: ex.actual_weight === '' ? null : Number(ex.actual_weight),
          setDetails: ex.set_details.length > 0
            ? ex.set_details.map(s => ({ set_no: s.set_no, reps: s.reps === '' ? null : Number(s.reps), weight: s.weight === '' ? null : Number(s.weight) }))
            : undefined,
          note: ex.post_note || undefined,
        })),
        summary: postSummary,
        qrUrl: 'https://myfitnesspro.co',
      })
      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl)
      setShareBlob(blob)
      setShareImageUrl(URL.createObjectURL(blob))
    } catch (err: any) {
      setShareError(err.message || '生成图片失败，请重试')
    } finally {
      setGeneratingShare(false)
    }
  }

  const handleDownloadShare = () => {
    if (!shareImageUrl || !classData) return
    const a = document.createElement('a')
    a.href = shareImageUrl
    a.download = `${classData.name}_训练记录.png`
    a.click()
  }

  const handleShareNative = async () => {
    if (!shareBlob || !classData) return
    const file = new File([shareBlob], `${classData.name}_训练记录.png`, { type: 'image/png' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: classData.name })
      } catch {
        // 用户取消分享，不用报错
      }
    } else {
      handleDownloadShare()
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
  const readOnly = isCompleted && !isEditing

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
                      disabled={readOnly}
                      onChange={(e) => updateExercise(ex.id, 'actual_sets', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: readOnly ? '#fafafa' : 'white',
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
                      disabled={readOnly}
                      onChange={(e) => updateExercise(ex.id, 'actual_reps', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: readOnly ? '#fafafa' : 'white',
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
                      disabled={readOnly}
                      onChange={(e) => updateExercise(ex.id, 'actual_weight', e.target.value)}
                      onBlur={() => saveExercise(ex)}
                      style={{
                        width: '100%',
                        padding: '7px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        backgroundColor: readOnly ? '#fafafa' : 'white',
                      }}
                    />
                  </div>
                </div>

                {/* 每组明细（训练容量）：默认收起，不影响原来的填写方式 */}
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => toggleSetDetails(ex)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      color: 'var(--c-brand)', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {expandedSets[ex.id]
                      ? '▾ 收起每组明细'
                      : ex.set_details.length > 0
                        ? `▸ 已记录 ${ex.set_details.length} 组明细`
                        : '▸ 每组次数/重量不一样？点这里记录'}
                  </button>

                  {expandedSets[ex.id] && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ex.set_details.map((s) => (
                        <div key={s.set_no} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#999', width: '38px', flexShrink: 0 }}>第{s.set_no}组</span>
                          <input
                            type="number" min="0"
                            placeholder="次数"
                            value={s.reps}
                            disabled={readOnly}
                            onChange={(e) => updateSetField(ex, s.set_no, 'reps', e.target.value)}
                            onBlur={() => saveSets(ex)}
                            style={{ width: '70px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                          />
                          <span style={{ fontSize: '12px', color: '#bbb' }}>次</span>
                          <input
                            type="number" min="0" step="0.5"
                            placeholder="重量"
                            value={s.weight}
                            disabled={readOnly}
                            onChange={(e) => updateSetField(ex, s.set_no, 'weight', e.target.value)}
                            onBlur={() => saveSets(ex)}
                            style={{ width: '70px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                          />
                          <span style={{ fontSize: '12px', color: '#bbb' }}>{s.weight_unit || 'kg'}</span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => removeSet(ex, s.set_no)}
                              style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '14px', marginLeft: '2px' }}
                              title="删除这一组"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => addSet(ex)}
                          style={{
                            alignSelf: 'flex-start', marginTop: '2px',
                            background: 'var(--c-fill-light)', border: '1px solid var(--c-border)',
                            borderRadius: '6px', padding: '5px 10px', fontSize: '12px',
                            color: 'var(--c-text-secondary)', cursor: 'pointer',
                          }}
                        >
                          + 加一组
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Per-exercise note */}
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#999' }}>动作备注</p>
                  <textarea
                    rows={2}
                    placeholder="例：右侧髋关节有点紧，下次注意..."
                    value={ex.post_note}
                    disabled={readOnly}
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
                      backgroundColor: readOnly ? '#fafafa' : 'white',
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
            {!readOnly && (
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
            disabled={readOnly}
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
              backgroundColor: readOnly ? '#fafafa' : 'white',
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
        ) : isEditing ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => {
                setIsSaving(true)
                try {
                  await Promise.all(
                    exercises.map((ex) =>
                      fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
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
                  await fetch(`/api/classes/${classId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
                    body: JSON.stringify({ post_summary: postSummary || null }),
                  })
                  setIsEditing(false)
                  setSaveStatus('saved')
                  setTimeout(() => setSaveStatus('idle'), 1500)
                } catch {
                  setError('保存失败，请重试')
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={isSaving}
              style={{
                flex: 1,
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
              {isSaving ? '保存中...' : '✓ 保存修改'}
            </button>
            <button
              onClick={() => { setIsEditing(false); fetchClassData() }}
              style={{
                padding: '14px 20px',
                backgroundColor: 'var(--c-fill-light)',
                color: 'var(--c-text-secondary)',
                border: '1px solid var(--c-border)',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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

            {/* 分享图片语言选择 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--c-text-secondary)' }}>
              <span>分享图片语言：</span>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--c-fill-light)', borderRadius: '999px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setShareLang('zh')}
                  style={{
                    padding: '4px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: shareLang === 'zh' ? 'var(--c-brand)' : 'transparent',
                    color: shareLang === 'zh' ? 'white' : 'var(--c-text-secondary)',
                    fontWeight: shareLang === 'zh' ? 600 : 400,
                  }}
                >
                  中文
                </button>
                <button
                  type="button"
                  onClick={() => setShareLang('en')}
                  style={{
                    padding: '4px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: shareLang === 'en' ? 'var(--c-brand)' : 'transparent',
                    color: shareLang === 'en' ? 'white' : 'var(--c-text-secondary)',
                    fontWeight: shareLang === 'en' ? 600 : 400,
                  }}
                >
                  English
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateShare}
              disabled={generatingShare}
              style={{
                padding: '12px',
                backgroundColor: generatingShare ? '#bbb' : 'var(--c-brand)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: generatingShare ? 'not-allowed' : 'pointer',
              }}
            >
              {generatingShare ? '生成中…' : '📤 生成分享图片，发给学员'}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '10px',
                backgroundColor: 'var(--c-fill-light)',
                color: 'var(--c-text-secondary)',
                border: '1px solid var(--c-border)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              ✏️ 编辑修改
            </button>
          </div>
        )}

        {shareError && (
          <div style={{ marginTop: '12px', padding: '10px 12px', background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '8px', fontSize: '13px', color: '#E65100' }}>
            ⚠️ {shareError}
          </div>
        )}

        {/* 分享图片预览 */}
        {shareImageUrl && (
          <div style={{ marginTop: '16px', background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 'bold', color: '#444', fontSize: '14px' }}>预览</p>
            <img
              src={shareImageUrl}
              alt="训练记录分享图"
              style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--c-border)', display: 'block', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleShareNative}
                style={{
                  flex: 1, padding: '12px', backgroundColor: 'var(--c-brand)', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                }}
              >
                分享 / 保存到相册
              </button>
              <button
                onClick={handleDownloadShare}
                style={{
                  padding: '12px 16px', backgroundColor: 'var(--c-fill-light)', color: 'var(--c-text-secondary)',
                  border: '1px solid var(--c-border)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                }}
              >
                下载
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#999' }}>
              长按图片可直接保存/转发到微信；桌面浏览器点"下载"存到电脑。
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
