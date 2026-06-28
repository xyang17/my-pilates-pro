'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
}

interface ClassExercise {
  id: string
  exercise_id: string
  sets?: number
  reps?: number
  weight?: number
  weight_unit: string
  duration?: number
  duration_unit: string
  order: number
  instance_notes?: string
  actual_sets?: number
  actual_reps?: number
  actual_weight?: number
  post_note?: string
  master_exercise: MasterExercise
}

interface StudentNote {
  id: string
  exercise_instance_id: string
  student_id: string
  student_name?: string
  content: string
  created_at: string
}

interface TrainerInfo {
  id: string
  name: string
  bio?: string
  photo_url?: string
  certificate?: string
}

interface ClassData {
  id: string
  name: string
  date: string
  start_time?: string
  duration: number
  type: string
  discipline?: string
  class_type: 'private' | 'group'
  level?: string
  description?: string
  max_capacity?: number
  price?: number
  color?: string
  cover_image_url?: string
  trainer_id?: string
  assigned_to?: string
  status: 'planned' | 'in_progress' | 'completed'
  notes?: string
  post_summary?: string
  completed_at?: string
  exercises: ClassExercise[]
  created_by: string
}

const STATUS_COLOR: Record<string, string> = {
  planned: '#9B7DB5',
  in_progress: '#FF9800',
  completed: '#4CAF50',
}

const STATUS_LABEL: Record<string, string> = {
  planned: '未开始',
  in_progress: '进行中',
  completed: '已完成',
}

export default function ClassDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null)
  const [classPhotos, setClassPhotos] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [availableExercises, setAvailableExercises] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'exercises' | 'student-notes'>('exercises')
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])
  // Spreadsheet inline editing
  const [localParams, setLocalParams] = useState<Record<string, {sets:string,reps:string,weight:string,weight_unit:string,duration:string,duration_unit:string,instance_notes:string}>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  // Quick-add search
  const [addSearch, setAddSearch] = useState('')
  const [addFilterAll, setAddFilterAll] = useState(false)
  const [adding, setAdding] = useState(false)
  // Homework modal
  const [showHomework, setShowHomework] = useState(false)
  const [homeworkSelected, setHomeworkSelected] = useState<Set<string>>(new Set())
  const [homeworkDueDate, setHomeworkDueDate] = useState('')
  const [homeworkNotes, setHomeworkNotes] = useState('')
  const [homeworkStudentId, setHomeworkStudentId] = useState('')
  const [homeworkSubmitting, setHomeworkSubmitting] = useState(false)
  // Homework extra exercises (non-class)
  const [hwExtraSearch, setHwExtraSearch] = useState('')
  const [hwExtraSelected, setHwExtraSelected] = useState<Set<string>>(new Set())
  const [showHwLibrary, setShowHwLibrary] = useState(false)
  const [hwLibSearch, setHwLibSearch] = useState('')
  const [hwLibFilterType, setHwLibFilterType] = useState('')
  const [hwLibFilterDiff, setHwLibFilterDiff] = useState('')
  const [hwLibFilterMuscle, setHwLibFilterMuscle] = useState('')
  // Client list for student dropdown
  const [clientList, setClientList] = useState<{id:string,name:string,email:string}[]>([])
  // Exercise library (inline)
  const [libSearch, setLibSearch] = useState('')
  const [libFilterType, setLibFilterType] = useState('')
  const [libFilterDiff, setLibFilterDiff] = useState('')
  const [libFilterMuscle, setLibFilterMuscle] = useState('')
  // Class copy
  const [copying, setCopying] = useState(false)

  const { lang, t } = useLang()
  const { showToast } = useToast()
  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'
  const isGroupClass = classData?.class_type === 'group'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) {
      fetchClassData()
      if (isTrainer) fetchAvailableExercises()
    }
  }, [user, authLoading])

  // Fetch student notes when switching to that tab
  useEffect(() => {
    if (activeTab === 'student-notes' && classData) {
      fetchStudentNotes()
    }
  }, [activeTab, classData])

  const fetchClassData = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('Failed to fetch class')
      const data: ClassData = await res.json()
      setClassData(data)

      // Fetch trainer info if trainer_id exists
      if (data.trainer_id) {
        const tRes = await fetch(`/api/trainers/${data.trainer_id}`, {
          headers: { 'x-user-id': user?.id || '' },
        })
        if (tRes.ok) {
          const t = await tRes.json()
          setTrainerInfo({ id: t.id, name: t.name, bio: t.bio, photo_url: t.photo_url, certificate: t.certificate })
        }
      }

      // Fetch class photos
      const pRes = await fetch(`/api/classes/${classId}/photos`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (pRes.ok) {
        const photos = await pRes.json()
        setClassPhotos(photos.map((p: any) => p.url))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableExercises = async () => {
    try {
      const res = await fetch('/api/exercises', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableExercises(data)
      }
    } catch { /* non-critical */ }
  }

  const fetchClients = async () => {
    if (clientList.length > 0) return // already loaded
    try {
      const res = await fetch('/api/clients', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClientList(await res.json())
    } catch { /* non-critical */ }
  }

  const fetchStudentNotes = async () => {
    try {
      const res = await fetch(`/api/classes/${classId}/student-notes`, {
        headers: {
          'x-user-id': user?.id || '',
          'x-user-role': userRole || '',
        },
      })
      if (res.ok) setStudentNotes(await res.json())
    } catch { /* non-critical */ }
  }

  // Spreadsheet helpers
  const getLocal = (ex: ClassExercise) => localParams[ex.id] || {
    sets: ex.sets?.toString() || '',
    reps: ex.reps?.toString() || '',
    weight: ex.weight?.toString() || '',
    weight_unit: ex.weight_unit || 'kg',
    duration: ex.duration?.toString() || '',
    duration_unit: ex.duration_unit || 'minutes',
    instance_notes: ex.instance_notes || '',
  }

  const updateLocal = (id: string, field: string, value: string) => {
    setLocalParams(prev => ({
      ...prev,
      [id]: { ...((prev[id]) || {}), [field]: value } as any
    }))
  }

  const saveField = async (ex: ClassExercise) => {
    const p = getLocal(ex)
    // Skip if nothing changed
    if (
      (p.sets === (ex.sets?.toString() || '')) &&
      (p.reps === (ex.reps?.toString() || '')) &&
      (p.weight === (ex.weight?.toString() || '')) &&
      (p.weight_unit === (ex.weight_unit || 'kg')) &&
      (p.duration === (ex.duration?.toString() || '')) &&
      (p.duration_unit === (ex.duration_unit || 'minutes')) &&
      (p.instance_notes === (ex.instance_notes || ''))
    ) return

    setSavingIds(prev => new Set(prev).add(ex.id))
    try {
      await fetch(`/api/classes/${classId}/exercises/${ex.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({
          sets: p.sets ? parseInt(p.sets) : null,
          reps: p.reps ? parseInt(p.reps) : null,
          weight: p.weight ? parseFloat(p.weight) : null,
          weight_unit: p.weight_unit,
          duration: p.duration ? parseInt(p.duration) : null,
          duration_unit: p.duration_unit,
          instance_notes: p.instance_notes || null,
        }),
      })
      // Refresh silently
      const res = await fetch(`/api/classes/${classId}`, { headers: { 'x-user-id': user?.id || '' } })
      if (res.ok) { const d = await res.json(); setClassData(d) }
    } catch { /* non-critical */ }
    finally { setSavingIds(prev => { const s = new Set(prev); s.delete(ex.id); return s }) }
  }

  const handleAddExercise = async (exerciseId: string) => {
    if (!exerciseId || adding) return
    setAdding(true)
    try {
      const res = await fetch(`/api/classes/${classId}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ exercise_id: exerciseId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      setAddSearch('')
      fetchClassData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleCreateHomework = async () => {
    const totalSelected = homeworkSelected.size + hwExtraSelected.size
    if (!homeworkStudentId || totalSelected === 0) return
    setHomeworkSubmitting(true)
    try {
      // Class exercises
      const classExercises = Array.from(homeworkSelected).map((instanceId, i) => {
        const ex = classData?.exercises.find(e => e.id === instanceId)
        return {
          exercise_id: ex?.exercise_id,
          class_instance_id: instanceId,
          sets: ex?.sets, reps: ex?.reps, weight: ex?.weight,
          weight_unit: ex?.weight_unit || 'kg', notes: ex?.instance_notes || '',
          order_num: i + 1,
        }
      })
      // Extra exercises from library
      const extraExercises = Array.from(hwExtraSelected).map((exId, i) => {
        const ex = availableExercises.find(e => e.id === exId)
        return {
          exercise_id: exId,
          class_instance_id: null,
          sets: ex?.default_sets || null, reps: ex?.default_reps || null, weight: ex?.default_weight || null,
          weight_unit: ex?.default_weight_unit || 'kg', notes: '',
          order_num: classExercises.length + i + 1,
        }
      })
      const exercises = [...classExercises, ...extraExercises]
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          class_id: classId, student_id: homeworkStudentId,
          title: `${classData?.name} 作业`,
          due_date: homeworkDueDate || null, notes: homeworkNotes || null, exercises,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create homework')
      }
      setShowHomework(false)
      setHomeworkSelected(new Set())
      setHwExtraSelected(new Set())
      setHwExtraSearch('')
      setHomeworkStudentId('')
      setHomeworkDueDate('')
      setHomeworkNotes('')
      showToast(t('作业已布置！', 'Homework assigned!'))
    } catch (err: any) { showToast(err.message, 'error') }
    finally { setHomeworkSubmitting(false) }
  }

  const handleCopyClass = async () => {
    if (!classData || copying) return
    setCopying(true)
    try {
      // Step 1: create new class with same metadata, today's date as placeholder
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          name: `${classData.name} (复制)`,
          date: today,
          start_time: classData.start_time || null,
          duration: classData.duration,
          discipline: classData.discipline || classData.type,
          class_type: classData.class_type,
          level: classData.level || 'beginner',
          description: classData.description || null,
          max_capacity: classData.max_capacity || null,
          price: classData.price || null,
          color: classData.color || null,
          trainer_id: classData.trainer_id || null,
          assigned_to: classData.assigned_to || null,
          notes: classData.notes || null,
        }),
      })
      if (!res.ok) throw new Error('复制课程失败')
      const newClass = await res.json()

      // Step 2: copy all exercises to new class
      for (const ex of classData.exercises) {
        await fetch(`/api/classes/${newClass.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
          body: JSON.stringify({
            exercise_id: ex.exercise_id,
            sets: ex.sets || null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            weight_unit: ex.weight_unit || 'kg',
            duration: ex.duration || null,
            duration_unit: ex.duration_unit || 'minutes',
            instance_notes: ex.instance_notes || null,
          }),
        })
      }

      showToast(t('课程已复制！正在跳转…', 'Class copied! Redirecting…'))
      setTimeout(() => router.push(`/dashboard/classes/${newClass.id}`), 800)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setCopying(false)
    }
  }

  const handleRemoveExercise = async (instanceId: string) => {
    if (!confirm('确认移除这个动作？')) return
    try {
      // Fixed: use path param instead of query param
      const res = await fetch(`/api/classes/${classId}/exercises/${instanceId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('Failed to remove exercise')
      fetchClassData()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  if (authLoading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (!classData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>课程未找到</p>
        <Link href="/dashboard/classes" style={{ color: '#9B7DB5' }}>← 返回课程列表</Link>
      </div>
    )
  }

  const canReview = isTrainer && classData.class_type === 'private'
  const canAddStudentNote = !isTrainer && classData.class_type === 'group'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#9B7DB5',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/dashboard/classes" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>
          ← 返回
        </Link>
        <h1 style={{ margin: 0, fontSize: '18px' }}>{classData.name}</h1>
        {/* Action button based on status and role */}
        {canReview && classData.status !== 'completed' && (
          <Link
            href={`/dashboard/classes/${classId}/review`}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.25)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            开始复盘 →
          </Link>
        )}
        {canReview && classData.status === 'completed' && (
          <Link
            href={`/dashboard/classes/${classId}/review`}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            查看复盘
          </Link>
        )}
        {canAddStudentNote && (
          <Link
            href={`/dashboard/classes/${classId}/student-notes`}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.25)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            记录笔记 ✍️
          </Link>
        )}
        {isTrainer && (
          <button
            onClick={handleCopyClass}
            disabled={copying}
            title={t('复制此课程计划', 'Copy class plan')}
            style={{
              padding: '6px 14px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: copying ? 'wait' : 'pointer',
              opacity: copying ? 0.7 : 1,
            }}
          >
            {copying ? '…' : t('复制计划', 'Copy')}
          </button>
        )}
        {!isTrainer && !canAddStudentNote && <div style={{ width: 80 }} />}
      </header>

      <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>

        {/* Cover image */}
        {classData.cover_image_url && (
          <div style={{ marginBottom: '16px', borderRadius: '10px', overflow: 'hidden', maxHeight: '220px' }}>
            <img src={classData.cover_image_url} alt={classData.name}
              style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
          </div>
        )}

        {/* Class Info */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
          {/* Color stripe */}
          {classData.color && (
            <div style={{ height: '4px', backgroundColor: classData.color, borderRadius: '2px', marginBottom: '16px' }} />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>日期 Date</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{new Date(classData.date + 'T12:00:00').toLocaleDateString('zh-CN')}</p>
            </div>
            {classData.start_time && (
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>时间 Time</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.start_time.slice(0, 5)}</p>
              </div>
            )}
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>时长 Duration</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.duration} 分钟</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>类别 Discipline</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.discipline || classData.type || '—'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>形式 Format</p>
              <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.class_type === 'group' ? '👥 团课' : '🧘 私教'}</p>
            </div>
            {classData.level && (
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>难度 Level</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {{ beginner: '初级', intermediate: '中级', advanced: '高级' }[classData.level] || classData.level}
                </p>
              </div>
            )}
            {classData.price != null && (
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>价格 Price</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>¥{classData.price}</p>
              </div>
            )}
            {classData.class_type === 'group' && classData.max_capacity && (
              <div>
                <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>人数上限</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{classData.max_capacity} 人</p>
              </div>
            )}
            <div>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>状态 Status</p>
              <span style={{
                display: 'inline-block', padding: '3px 10px',
                backgroundColor: STATUS_COLOR[classData.status] || '#999',
                color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
              }}>
                {STATUS_LABEL[classData.status] || classData.status}
              </span>
            </div>
          </div>

          {classData.description && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '11px' }}>课程介绍 Description</p>
              <p style={{ margin: 0, color: '#444', lineHeight: '1.6' }}>{classData.description}</p>
            </div>
          )}

          {classData.notes && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>备注 Notes</p>
              <p style={{ margin: 0, color: '#444' }}>{classData.notes}</p>
            </div>
          )}

          {classData.post_summary && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '11px' }}>课后总结 Post Summary</p>
              <p style={{ margin: 0, color: '#444' }}>{classData.post_summary}</p>
            </div>
          )}
        </div>

        {/* Trainer card */}
        {trainerInfo && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            {trainerInfo.photo_url ? (
              <img src={trainerInfo.photo_url} alt={trainerInfo.name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#9B7DB5', color: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                {trainerInfo.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '15px' }}>{trainerInfo.name}</p>
              {trainerInfo.certificate && <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9B7DB5' }}>🏆 {trainerInfo.certificate}</p>}
              {trainerInfo.bio && <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>{trainerInfo.bio.length > 100 ? trainerInfo.bio.slice(0, 100) + '...' : trainerInfo.bio}</p>}
              <Link href={`/dashboard/trainers/${trainerInfo.id}`} style={{ fontSize: '12px', color: '#9B7DB5', textDecoration: 'none' }}>查看教练主页 →</Link>
            </div>
          </div>
        )}

        {/* Photos gallery */}
        {classPhotos.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {classPhotos.map((url, i) => (
                <img key={i} src={url} alt={`photo ${i + 1}`}
                  style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              ))}
            </div>
          </div>
        )}

        {/* Tabs (group class trainer view shows student notes tab) */}
        {isTrainer && isGroupClass && (
          <div style={{ display: 'flex', gap: '2px', marginBottom: '0', borderBottom: '2px solid #eee' }}>
            {(['exercises', 'student-notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  color: activeTab === tab ? '#9B7DB5' : '#666',
                  borderBottom: activeTab === tab ? '2px solid #9B7DB5' : '2px solid transparent',
                  marginBottom: '-2px',
                  fontSize: '14px',
                }}
              >
                {tab === 'exercises' ? `动作列表 (${classData.exercises.length})` : `学员笔记 (${studentNotes.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Exercise List */}
        {activeTab === 'exercises' && (
          <div style={{ backgroundColor: 'white', borderRadius: isTrainer && isGroupClass ? '0 0 10px 10px' : '10px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#444', fontSize: '14px' }}>
                {t('动作列表', 'Exercises')}
                {classData.exercises.length > 0 && <span style={{ color: '#bbb', fontWeight: 'normal', marginLeft: '6px' }}>({classData.exercises.length})</span>}
              </span>
              {isTrainer && classData.exercises.length > 0 && (
                <button onClick={() => {
                    setShowHomework(true)
                    fetchClients()
                    if (classData?.assigned_to) setHomeworkStudentId(classData.assigned_to)
                  }}
                  style={{ padding: '5px 12px', backgroundColor: '#E8A87C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  📋 {t('布置作业', 'Assign HW')}
                </button>
              )}
            </div>

            {/* Spreadsheet header row */}
            {classData.exercises.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 56px 56px 90px 1fr 28px', gap: '6px', padding: '6px 14px', backgroundColor: '#faf8fd', borderBottom: '1px solid #f0f0f0' }}>
                <div />
                <div style={{ fontSize: '11px', color: '#aaa' }}>{t('动作', 'Exercise')}</div>
                <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center' }}>{t('组', 'Sets')}</div>
                <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center' }}>{t('次', 'Reps')}</div>
                <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center' }}>{t('配重', 'Weight')}</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>{t('备注', 'Notes')}</div>
                <div />
              </div>
            )}

            {/* Exercise rows */}
            {classData.exercises.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
                {t('暂无动作，在下方搜索添加', 'No exercises yet. Search below to add.')}
              </div>
            ) : (
              classData.exercises.map((ex, i) => {
                const p = getLocal(ex)
                const isSaving = savingIds.has(ex.id)
                return (
                  <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 56px 56px 90px 1fr 28px', gap: '6px', padding: '8px 14px', borderBottom: i < classData.exercises.length - 1 ? '1px solid #f8f8f8' : 'none', alignItems: 'center', backgroundColor: isSaving ? '#fffef5' : 'white' }}>
                    {/* Index */}
                    <div style={{ width: '22px', height: '22px', backgroundColor: '#9B7DB5', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                      {i + 1}
                    </div>

                    {/* Name */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lang === 'zh' ? (ex.master_exercise.name_cn || ex.master_exercise.name_en) : (ex.master_exercise.name_en || ex.master_exercise.name_cn)}
                      </p>
                      {(ex.actual_sets != null || ex.actual_weight != null) && (
                        <p style={{ margin: '1px 0 0 0', fontSize: '11px', color: '#4CAF50' }}>
                          ✓ {[ex.actual_sets && `${ex.actual_sets}组`, ex.actual_reps && `×${ex.actual_reps}`, ex.actual_weight && `${ex.actual_weight}kg`].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>

                    {/* Sets */}
                    <input
                      type="number" min="0" max="99" value={p.sets}
                      disabled={!isTrainer}
                      onChange={e => updateLocal(ex.id, 'sets', e.target.value)}
                      onBlur={() => saveField(ex)}
                      style={{ width: '100%', padding: '5px 4px', border: '1px solid #e8e0f0', borderRadius: '6px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box', backgroundColor: isTrainer ? 'white' : '#f9f9f9', color: '#333' }}
                    />

                    {/* Reps */}
                    <input
                      type="number" min="0" max="999" value={p.reps}
                      disabled={!isTrainer}
                      onChange={e => updateLocal(ex.id, 'reps', e.target.value)}
                      onBlur={() => saveField(ex)}
                      style={{ width: '100%', padding: '5px 4px', border: '1px solid #e8e0f0', borderRadius: '6px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box', backgroundColor: isTrainer ? 'white' : '#f9f9f9', color: '#333' }}
                    />

                    {/* Weight + unit */}
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <input
                        type="number" min="0" step="0.5" value={p.weight}
                        disabled={!isTrainer}
                        onChange={e => updateLocal(ex.id, 'weight', e.target.value)}
                        onBlur={() => saveField(ex)}
                        style={{ width: '100%', padding: '5px 4px', border: '1px solid #e8e0f0', borderRadius: '6px 0 0 6px', fontSize: '13px', textAlign: 'center', boxSizing: 'border-box', backgroundColor: isTrainer ? 'white' : '#f9f9f9', color: '#333' }}
                      />
                      <select value={p.weight_unit} disabled={!isTrainer}
                        onChange={e => { updateLocal(ex.id, 'weight_unit', e.target.value); }}
                        onBlur={() => saveField(ex)}
                        style={{ padding: '5px 2px', border: '1px solid #e8e0f0', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: '11px', backgroundColor: '#f9f9f9', color: '#666', cursor: 'pointer' }}>
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <input
                      type="text" value={p.instance_notes}
                      disabled={!isTrainer}
                      onChange={e => updateLocal(ex.id, 'instance_notes', e.target.value)}
                      onBlur={() => saveField(ex)}
                      placeholder={t('备注...', 'Notes...')}
                      style={{ width: '100%', padding: '5px 8px', border: '1px solid #e8e0f0', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box', backgroundColor: isTrainer ? 'white' : '#f9f9f9', color: '#333' }}
                    />

                    {/* Remove */}
                    {isTrainer ? (
                      <button onClick={() => handleRemoveExercise(ex.id)}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fee', border: 'none', color: '#c62828', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        ✕
                      </button>
                    ) : <div />}
                  </div>
                )
              })
            )}

            {/* Inline exercise library (trainer only) */}
            {isTrainer && (() => {
              const alreadyAdded = new Set(classData.exercises.map(e => e.exercise_id))
              const allTypes = [...new Set(availableExercises.map(e => e.type_en).filter(Boolean))].sort() as string[]
              const allDiffs = [...new Set(availableExercises.map(e => e.difficulty_en).filter(Boolean))].sort() as string[]
              const allMuscles = [...new Set(
                availableExercises.flatMap(e => (e.target_muscles_en || '').split(',').map((m: string) => m.trim())).filter(Boolean)
              )].sort() as string[]

              const libResults = availableExercises.filter(ex => {
                if (libFilterType && ex.type_en !== libFilterType) return false
                if (libFilterDiff && ex.difficulty_en !== libFilterDiff) return false
                if (libFilterMuscle && !(ex.target_muscles_en || '').split(',').map((m: string) => m.trim()).includes(libFilterMuscle)) return false
                if (libSearch) {
                  const q = libSearch.toLowerCase()
                  return (
                    (ex.name_cn || '').includes(libSearch) ||
                    (ex.name_en || '').toLowerCase().includes(q) ||
                    (ex.target_muscles_cn || '').includes(libSearch) ||
                    (ex.target_muscles_en || '').toLowerCase().includes(q)
                  )
                }
                return true
              })

              const activeFilterCount = [libFilterType, libFilterDiff, libFilterMuscle].filter(Boolean).length

              return (
                <div style={{ borderTop: '2px dashed #e8dff5', backgroundColor: '#faf8fd', borderRadius: '0 0 8px 8px' }}>
                  {/* Search + filters */}
                  <div style={{ padding: '10px 14px 8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder={t('搜索动作名称、肌肉...', 'Search name, muscles...')}
                        value={libSearch}
                        onChange={e => setLibSearch(e.target.value)}
                        style={{ flex: 1, padding: '7px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: 'white' }}
                      />
                      <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>{libResults.length} {t('个', '')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                      <select value={libFilterType} onChange={e => setLibFilterType(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterType ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterType ? '#f0eaf8' : 'white', color: libFilterType ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部分类', 'All types')}</option>
                        {allTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                      </select>
                      <select value={libFilterDiff} onChange={e => setLibFilterDiff(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterDiff ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterDiff ? '#f0eaf8' : 'white', color: libFilterDiff ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部难度', 'All levels')}</option>
                        {allDiffs.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select value={libFilterMuscle} onChange={e => setLibFilterMuscle(e.target.value)}
                        style={{ padding: '5px 8px', border: `1px solid ${libFilterMuscle ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: libFilterMuscle ? '#f0eaf8' : 'white', color: libFilterMuscle ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                        <option value="">{t('全部肌肉', 'All muscles')}</option>
                        {allMuscles.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setLibFilterType(''); setLibFilterDiff(''); setLibFilterMuscle('') }}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '16px', fontSize: '11px', backgroundColor: 'white', color: '#999', cursor: 'pointer', flexShrink: 0 }}>
                          {t('清除', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Results list */}
                  <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '0 14px 10px' }}>
                    {libResults.length === 0 && (
                      <p style={{ textAlign: 'center', color: '#bbb', padding: '20px 0', fontSize: '13px', margin: 0 }}>{t('没有匹配动作', 'No matches')}</p>
                    )}
                    {libResults.map(ex => {
                      const added = alreadyAdded.has(ex.id)
                      return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600', color: added ? '#bbb' : '#333' }}>
                              {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                            </p>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {ex.type_cn && <span style={{ fontSize: '10px', color: '#9B7DB5', backgroundColor: '#f0eaf8', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.type_cn : ex.type_en}</span>}
                              {ex.difficulty_cn && <span style={{ fontSize: '10px', color: '#888', backgroundColor: '#f5f5f5', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.difficulty_cn : ex.difficulty_en}</span>}
                              {ex.target_muscles_cn && <span style={{ fontSize: '10px', color: '#aaa' }}>{lang === 'zh' ? ex.target_muscles_cn : ex.target_muscles_en}</span>}
                            </div>
                          </div>
                          {(ex.default_sets || ex.default_reps) && (
                            <span style={{ fontSize: '11px', color: '#bbb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {[ex.default_sets && `${ex.default_sets}×`, ex.default_reps].filter(Boolean).join('')}
                            </span>
                          )}
                          {added ? (
                            <span style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}>✓</span>
                          ) : (
                            <button onClick={() => handleAddExercise(ex.id)} disabled={adding}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', backgroundColor: '#9B7DB5', color: 'white', cursor: adding ? 'wait' : 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>
                              +
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

                {/* Student Notes Tab (trainer view of group class) */}
        {activeTab === 'student-notes' && (
          <div style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px', padding: '20px' }}>
            {studentNotes.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>暂无学员笔记</p>
            ) : (
              studentNotes.map((note) => {
                const exercise = classData.exercises.find((e) => e.id === note.exercise_instance_id)
                return (
                  <div key={note.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#999' }}>
                      {note.student_name || '学员'} · {exercise ? `${exercise.master_exercise.name_en}` : '动作'} ·{' '}
                      {new Date(note.created_at).toLocaleString('zh-CN')}
                    </p>
                    <p style={{ margin: 0, color: '#333' }}>{note.content}</p>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* Homework Modal */}
      {showHomework && classData && (() => {
        const totalSelected = homeworkSelected.size + hwExtraSelected.size
        const alreadyInClass = new Set(classData.exercises.map(e => e.exercise_id))

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '17px' }}>📋 {t('布置课后作业', 'Assign Homework')}</h2>
                <button onClick={() => { setShowHomework(false); setHwExtraSearch(''); setHwExtraSelected(new Set()) }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

                {/* Student dropdown */}
                <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '16px' }}>
                  {t('分配给学员', 'Assign to student')}
                  <select value={homeworkStudentId} onChange={e => setHomeworkStudentId(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: 'white' }}>
                    <option value="">{t('选择学员...', 'Select student...')}</option>
                    {clientList.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                    ))}
                  </select>
                </label>

                {/* Class exercises selection */}
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#888', fontWeight: '600' }}>{t('本课动作', 'Class exercises')}</p>
                <div style={{ backgroundColor: '#f9f6fc', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                  {classData.exercises.length === 0 && (
                    <p style={{ margin: 0, padding: '16px', fontSize: '13px', color: '#bbb', textAlign: 'center' }}>{t('本课暂无动作', 'No exercises in this class')}</p>
                  )}
                  {classData.exercises.map((ex, i) => {
                    const selected = homeworkSelected.has(ex.id)
                    return (
                      <div key={ex.id}
                        onClick={() => {
                          setHomeworkSelected(prev => {
                            const next = new Set(prev)
                            next.has(ex.id) ? next.delete(ex.id) : next.add(ex.id)
                            return next
                          })
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: i < classData.exercises.length - 1 ? '1px solid #eee' : 'none', backgroundColor: selected ? '#f0eaf8' : 'white' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selected ? '#9B7DB5' : '#ddd'}`, backgroundColor: selected ? '#9B7DB5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px' }}>{ex.master_exercise.name_cn || ex.master_exercise.name_en}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                            {[ex.sets && `${ex.sets}组`, ex.reps && `${ex.reps}次`, ex.weight && `${ex.weight}${ex.weight_unit}`].filter(Boolean).join(' · ') || t('未设置参数', 'No params')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Extra exercises from library */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888', fontWeight: '600' }}>{t('额外添加动作', 'Add extra exercises')}</p>
                  <button
                    onClick={() => setShowHwLibrary(true)}
                    style={{ padding: '6px 14px', backgroundColor: '#9B7DB5', color: 'white', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    + {t('从动作库选', 'Browse library')}
                  </button>
                </div>
                {hwExtraSelected.size > 0 ? (
                  <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.from(hwExtraSelected).map(id => {
                      const ex = availableExercises.find(e => e.id === id)
                      if (!ex) return null
                      return (
                        <span key={id} style={{ padding: '4px 10px', backgroundColor: '#f0eaf8', borderRadius: '12px', fontSize: '12px', color: '#9B7DB5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                          <button onClick={() => setHwExtraSelected(prev => { const n = new Set(prev); n.delete(id); return n })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9B7DB5', fontSize: '12px', padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#bbb' }}>{t('未选择额外动作', 'No extra exercises selected')}</p>
                )}

                {/* Due date + notes */}
                <div style={{ display: 'grid', gap: '12px' }}>
                  <label style={{ fontSize: '13px', color: '#666' }}>
                    {t('截止日期（选填）', 'Due date (optional)')}
                    <input type="date" value={homeworkDueDate} onChange={e => setHomeworkDueDate(e.target.value)}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ fontSize: '13px', color: '#666' }}>
                    {t('备注（选填）', 'Notes (optional)')}
                    <textarea value={homeworkNotes} onChange={e => setHomeworkNotes(e.target.value)}
                      placeholder={t('给学员的提示或说明...', 'Instructions for the student...')}
                      rows={2}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }} />
                  </label>
                </div>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowHomework(false); setHwExtraSelected(new Set()) }} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>{t('取消', 'Cancel')}</button>
                <button
                  onClick={handleCreateHomework}
                  disabled={totalSelected === 0 || !homeworkStudentId || homeworkSubmitting}
                  style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#E8A87C', color: 'white', cursor: totalSelected > 0 && homeworkStudentId ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', opacity: totalSelected > 0 && homeworkStudentId ? 1 : 0.5 }}>
                  {homeworkSubmitting ? t('布置中...', 'Saving...') : `${t('布置作业', 'Assign')}（${totalSelected} ${t('个动作', 'exercises')}）`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Hw Library Sub-dialog */}
      {showHwLibrary && classData && (() => {
        const alreadyInClass = new Set(classData.exercises.map(e => e.exercise_id))
        const allTypes = [...new Set(availableExercises.map(e => e.type_en).filter(Boolean))].sort() as string[]
        const allDiffs = [...new Set(availableExercises.map(e => e.difficulty_en).filter(Boolean))].sort() as string[]
        const allMuscles = [...new Set(
          availableExercises.flatMap(e => (e.target_muscles_en || '').split(',').map((m: string) => m.trim())).filter(Boolean)
        )].sort() as string[]

        const hwLibResults = availableExercises.filter(ex => {
          if (alreadyInClass.has(ex.id)) return false
          if (hwLibFilterType && ex.type_en !== hwLibFilterType) return false
          if (hwLibFilterDiff && ex.difficulty_en !== hwLibFilterDiff) return false
          if (hwLibFilterMuscle && !(ex.target_muscles_en || '').split(',').map((m: string) => m.trim()).includes(hwLibFilterMuscle)) return false
          if (hwLibSearch) {
            const q = hwLibSearch.toLowerCase()
            return (
              (ex.name_cn || '').includes(hwLibSearch) ||
              (ex.name_en || '').toLowerCase().includes(q) ||
              (ex.target_muscles_cn || '').includes(hwLibSearch) ||
              (ex.target_muscles_en || '').toLowerCase().includes(q)
            )
          }
          return true
        })

        return (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '16px' }}>💪 {t('从动作库选择', 'Browse Exercise Library')}</h2>
                <button onClick={() => { setShowHwLibrary(false); setHwLibSearch(''); setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle('') }}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
              </div>

              {/* Search + filters */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="text"
                  placeholder={t('搜索动作名称、肌肉...', 'Search name, muscles...')}
                  value={hwLibSearch}
                  onChange={e => setHwLibSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  <select value={hwLibFilterType} onChange={e => setHwLibFilterType(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterType ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterType ? '#f0eaf8' : 'white', color: hwLibFilterType ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部分类', 'All types')}</option>
                    {allTypes.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                  </select>
                  <select value={hwLibFilterDiff} onChange={e => setHwLibFilterDiff(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterDiff ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterDiff ? '#f0eaf8' : 'white', color: hwLibFilterDiff ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部难度', 'All levels')}</option>
                    {allDiffs.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={hwLibFilterMuscle} onChange={e => setHwLibFilterMuscle(e.target.value)}
                    style={{ padding: '5px 8px', border: `1px solid ${hwLibFilterMuscle ? '#9B7DB5' : '#ddd'}`, borderRadius: '16px', fontSize: '11px', backgroundColor: hwLibFilterMuscle ? '#f0eaf8' : 'white', color: hwLibFilterMuscle ? '#9B7DB5' : '#666', cursor: 'pointer', flexShrink: 0 }}>
                    <option value="">{t('全部肌肉', 'All muscles')}</option>
                    {allMuscles.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {(hwLibFilterType || hwLibFilterDiff || hwLibFilterMuscle) && (
                    <button onClick={() => { setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle('') }}
                      style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: '16px', fontSize: '11px', backgroundColor: 'white', color: '#999', cursor: 'pointer', flexShrink: 0 }}>
                      {t('清除', 'Clear')}
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                <p style={{ margin: '8px 0 4px 0', fontSize: '11px', color: '#bbb' }}>{hwLibResults.length} {t('个动作', 'exercises')}</p>
                {hwLibResults.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#bbb', padding: '30px 0', fontSize: '13px' }}>{t('没有匹配动作', 'No matches')}</p>
                )}
                {hwLibResults.map(ex => {
                  const sel = hwExtraSelected.has(ex.id)
                  return (
                    <div key={ex.id}
                      onClick={() => setHwExtraSelected(prev => { const n = new Set(prev); n.has(ex.id) ? n.delete(ex.id) : n.add(ex.id); return n })}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${sel ? '#9B7DB5' : '#ddd'}`, backgroundColor: sel ? '#9B7DB5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
                          {lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)}
                        </p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {ex.type_cn && <span style={{ fontSize: '10px', color: '#9B7DB5', backgroundColor: '#f0eaf8', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.type_cn : ex.type_en}</span>}
                          {ex.difficulty_cn && <span style={{ fontSize: '10px', color: '#888', backgroundColor: '#f5f5f5', padding: '1px 6px', borderRadius: '6px' }}>{lang === 'zh' ? ex.difficulty_cn : ex.difficulty_en}</span>}
                          {ex.target_muscles_cn && <span style={{ fontSize: '10px', color: '#aaa' }}>{lang === 'zh' ? ex.target_muscles_cn : ex.target_muscles_en}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: '13px', color: '#888' }}>
                  {hwExtraSelected.size > 0 ? `${t('已选', 'Selected')} ${hwExtraSelected.size} ${t('个', '')}` : t('点击动作选择', 'Tap to select')}
                </span>
                <button
                  onClick={() => { setShowHwLibrary(false); setHwLibSearch(''); setHwLibFilterType(''); setHwLibFilterDiff(''); setHwLibFilterMuscle('') }}
                  style={{ padding: '10px 24px', backgroundColor: '#9B7DB5', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {t('确认', 'Done')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
