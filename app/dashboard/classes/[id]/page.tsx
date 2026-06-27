'use client'

import { useAuth } from '@/context/AuthContext'
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
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [availableExercises, setAvailableExercises] = useState<any[]>([])
  const [exSearch, setExSearch] = useState('')
  const [exFilterAll, setExFilterAll] = useState(false)
  const [activeTab, setActiveTab] = useState<'exercises' | 'student-notes'>('exercises')
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{sets:string,reps:string,weight:string,weight_unit:string,duration:string,duration_unit:string,instance_notes:string}>({sets:'',reps:'',weight:'',weight_unit:'kg',duration:'',duration_unit:'minutes',instance_notes:''})
  const [editSaving, setEditSaving] = useState(false)
  const [showHomework, setShowHomework] = useState(false)
  const [homeworkSelected, setHomeworkSelected] = useState<Set<string>>(new Set())
  const [homeworkDueDate, setHomeworkDueDate] = useState('')
  const [homeworkNotes, setHomeworkNotes] = useState('')
  const [homeworkStudentId, setHomeworkStudentId] = useState('')
  const [homeworkSubmitting, setHomeworkSubmitting] = useState(false)

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
        // Sort: matching discipline first
        setAvailableExercises(data)
      }
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

  const startEdit = (ex: ClassExercise) => {
    setEditingId(ex.id)
    setEditForm({
      sets: ex.sets?.toString() || '',
      reps: ex.reps?.toString() || '',
      weight: ex.weight?.toString() || '',
      weight_unit: ex.weight_unit || 'kg',
      duration: ex.duration?.toString() || '',
      duration_unit: ex.duration_unit || 'minutes',
      instance_notes: ex.instance_notes || '',
    })
  }

  const handleSaveEdit = async (instanceId: string) => {
    setEditSaving(true)
    try {
      const body: Record<string, unknown> = {
        sets: editForm.sets ? parseInt(editForm.sets) : null,
        reps: editForm.reps ? parseInt(editForm.reps) : null,
        weight: editForm.weight ? parseFloat(editForm.weight) : null,
        weight_unit: editForm.weight_unit,
        duration: editForm.duration ? parseInt(editForm.duration) : null,
        duration_unit: editForm.duration_unit,
        instance_notes: editForm.instance_notes || null,
      }
      const res = await fetch(`/api/classes/${classId}/exercises/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      setEditingId(null)
      fetchClassData()
    } catch (err: any) { setError(err.message) }
    finally { setEditSaving(false) }
  }

  const handleCreateHomework = async () => {
    if (!homeworkStudentId || homeworkSelected.size === 0) return
    setHomeworkSubmitting(true)
    try {
      const exercises = Array.from(homeworkSelected).map((instanceId, i) => {
        const ex = classData?.exercises.find(e => e.id === instanceId)
        return {
          exercise_id: ex?.exercise_id,
          class_instance_id: instanceId,
          sets: ex?.sets, reps: ex?.reps, weight: ex?.weight,
          weight_unit: ex?.weight_unit || 'kg', notes: ex?.instance_notes || '',
          order_num: i + 1,
        }
      })
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          class_id: classId,
          student_id: homeworkStudentId,
          title: `${classData?.name} 作业`,
          due_date: homeworkDueDate || null,
          notes: homeworkNotes || null,
          exercises,
        }),
      })
      if (!res.ok) throw new Error('Failed to create homework')
      setShowHomework(false)
      setHomeworkSelected(new Set())
      setHomeworkStudentId('')
      setHomeworkDueDate('')
      setHomeworkNotes('')
      alert('作业已布置！')
    } catch (err: any) { setError(err.message) }
    finally { setHomeworkSubmitting(false) }
  }

  const handleAddExercise = async () => {
    if (!selectedExerciseId) return
    try {
      const res = await fetch(`/api/classes/${classId}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ exercise_id: selectedExerciseId }),
      })
      if (!res.ok) throw new Error('Failed to add exercise')
      setShowAddExercise(false)
      setSelectedExerciseId('')
      fetchClassData()
    } catch (err: any) {
      setError(err.message)
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
      setError(err.message)
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
        {!canReview && !canAddStudentNote && <div style={{ width: 80 }} />}
      </header>

      <main style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {error && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

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
          <div style={{ backgroundColor: 'white', borderRadius: isTrainer && isGroupClass ? '0 0 8px 8px' : '8px', overflow: 'hidden' }}>
            {isTrainer && classData.status !== 'completed' && (
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 'bold', color: '#444' }}>动作列表</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                {classData.exercises.length > 0 && (
                  <button onClick={() => setShowHomework(true)}
                    style={{ padding: '6px 14px', backgroundColor: '#E8A87C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                    📋 布置作业
                  </button>
                )}
                <button
                  onClick={() => setShowAddExercise(!showAddExercise)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: showAddExercise ? '#eee' : '#9B7DB5',
                    color: showAddExercise ? '#333' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {showAddExercise ? '✕ 取消' : '+ 添加动作'}
                </button>
                </div>
              </div>
            )}

            {showAddExercise && (() => {
              // Discipline → exercise type matching
              const discipline = classData.discipline || ''
              const filtered = availableExercises.filter(ex => {
                const matchDiscipline = exFilterAll || !discipline ||
                  (ex.type_en || '').toLowerCase().includes(discipline.toLowerCase()) ||
                  discipline.toLowerCase().includes((ex.type_en || '').toLowerCase())
                const matchSearch = !exSearch ||
                  (ex.name_cn || '').includes(exSearch) ||
                  (ex.name_en || '').toLowerCase().includes(exSearch.toLowerCase()) ||
                  (ex.target_muscles_cn || '').includes(exSearch) ||
                  (ex.target_muscles_en || '').toLowerCase().includes(exSearch.toLowerCase())
                return matchDiscipline && matchSearch
              })

              return (
                <div style={{ borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                  {/* Search bar */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="搜索动作名称或肌群... Search"
                      value={exSearch}
                      onChange={e => { setExSearch(e.target.value); setSelectedExerciseId('') }}
                      autoFocus
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
                    />
                    {discipline && (
                      <button
                        onClick={() => setExFilterAll(v => !v)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: exFilterAll ? '#f0f0f0' : '#f3eef9', color: exFilterAll ? '#666' : '#9B7DB5', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {exFilterAll ? '全部动作' : `仅 ${discipline}`}
                      </button>
                    )}
                  </div>

                  {/* Exercise list */}
                  <div style={{ maxHeight: '240px', overflowY: 'auto', borderTop: '1px solid #eee' }}>
                    {filtered.length === 0 ? (
                      <p style={{ padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '13px', margin: 0 }}>
                        没有匹配动作
                        {!exFilterAll && discipline && <span> · <button onClick={() => setExFilterAll(true)} style={{ background: 'none', border: 'none', color: '#9B7DB5', cursor: 'pointer', fontSize: '13px' }}>查看全部</button></span>}
                      </p>
                    ) : filtered.map(ex => (
                      <div
                        key={ex.id}
                        onClick={() => setSelectedExerciseId(ex.id === selectedExerciseId ? '' : ex.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                          cursor: 'pointer', borderBottom: '1px solid #f5f5f5',
                          backgroundColor: selectedExerciseId === ex.id ? '#f3eef9' : 'white',
                        }}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selectedExerciseId === ex.id ? '#9B7DB5' : '#ddd'}`, backgroundColor: selectedExerciseId === ex.id ? '#9B7DB5' : 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedExerciseId === ex.id && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: '0 0 1px 0', fontSize: '13px', fontWeight: 'bold' }}>{ex.name_cn || ex.name_en}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                            {ex.name_en}
                            {ex.target_muscles_cn && ` · ${ex.target_muscles_cn}`}
                          </p>
                        </div>
                        {ex.type_cn && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#f0eaf8', color: '#9B7DB5', flexShrink: 0 }}>{ex.type_cn}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Add button */}
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={() => { setShowAddExercise(false); setSelectedExerciseId(''); setExSearch('') }}
                      style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                      取消
                    </button>
                    <button
                      onClick={() => { handleAddExercise(); setExSearch(''); setSelectedExerciseId('') }}
                      disabled={!selectedExerciseId}
                      style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#9B7DB5', color: 'white', cursor: selectedExerciseId ? 'pointer' : 'not-allowed', opacity: selectedExerciseId ? 1 : 0.5, fontWeight: 'bold', fontSize: '13px' }}
                    >
                      + 添加动作
                    </button>
                  </div>
                </div>
              )
            })()}

            {classData.exercises.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                暂无动作。{isTrainer ? '点击上方"添加动作"开始计划课程。' : ''}
              </div>
            ) : (
              classData.exercises.map((ex, i) => (
                <div key={ex.id} style={{ borderBottom: i < classData.exercises.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  {editingId === ex.id ? (
                    /* ── EDIT MODE ── */
                    <div style={{ padding: '16px 20px', backgroundColor: '#faf8fd' }}>
                      <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#9B7DB5' }}>
                        {ex.master_exercise.name_cn || ex.master_exercise.name_en}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', color: '#666' }}>
                          组数 Sets
                          <input type="number" min="0" value={editForm.sets}
                            onChange={e => setEditForm(f => ({...f, sets: e.target.value}))}
                            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px', color: '#666' }}>
                          次数 Reps
                          <input type="number" min="0" value={editForm.reps}
                            onChange={e => setEditForm(f => ({...f, reps: e.target.value}))}
                            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px', color: '#666' }}>
                          配重 Weight
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <input type="number" min="0" step="0.5" value={editForm.weight}
                              onChange={e => setEditForm(f => ({...f, weight: e.target.value}))}
                              style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                            <select value={editForm.weight_unit} onChange={e => setEditForm(f => ({...f, weight_unit: e.target.value}))}
                              style={{ padding: '7px 4px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }}>
                              <option value="kg">kg</option>
                              <option value="lb">lb</option>
                            </select>
                          </div>
                        </label>
                        <label style={{ fontSize: '12px', color: '#666' }}>
                          时长 Duration
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <input type="number" min="0" value={editForm.duration}
                              onChange={e => setEditForm(f => ({...f, duration: e.target.value}))}
                              style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                            <select value={editForm.duration_unit} onChange={e => setEditForm(f => ({...f, duration_unit: e.target.value}))}
                              style={{ padding: '7px 4px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }}>
                              <option value="seconds">秒</option>
                              <option value="minutes">分</option>
                            </select>
                          </div>
                        </label>
                        <label style={{ fontSize: '12px', color: '#666', gridColumn: 'span 2' }}>
                          备注 Notes
                          <input type="text" value={editForm.instance_notes}
                            onChange={e => setEditForm(f => ({...f, instance_notes: e.target.value}))}
                            placeholder="教练提示、注意事项..."
                            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '7px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingId(null)} style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }}>取消</button>
                        <button onClick={() => handleSaveEdit(ex.id)} disabled={editSaving}
                          style={{ padding: '7px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#9B7DB5', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', opacity: editSaving ? 0.6 : 1 }}>
                          {editSaving ? '保存中...' : '✓ 保存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── VIEW MODE ── */
                    <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: '12px', alignItems: 'start' }}>
                      <div style={{ width: '28px', height: '28px', backgroundColor: '#9B7DB5', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '14px' }}>
                          {ex.master_exercise.name_cn || ex.master_exercise.name_en}
                          <span style={{ color: '#bbb', fontSize: '12px', marginLeft: '8px', fontWeight: 'normal' }}>{ex.master_exercise.name_en}</span>
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '13px' }}>
                          {ex.sets != null && <span style={{ color: '#555' }}>{ex.sets} 组</span>}
                          {ex.reps != null && <span style={{ color: '#555' }}>× {ex.reps} 次</span>}
                          {ex.weight != null && <span style={{ color: '#555' }}>{ex.weight} {ex.weight_unit}</span>}
                          {ex.duration != null && <span style={{ color: '#555' }}>{ex.duration} {ex.duration_unit === 'seconds' ? '秒' : '分'}</span>}
                          {!ex.sets && !ex.reps && !ex.weight && !ex.duration && (
                            <span style={{ color: '#ccc', fontSize: '12px' }}>未设置参数</span>
                          )}
                        </div>
                        {(ex.actual_sets != null || ex.actual_reps != null || ex.actual_weight != null) && (
                          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#4CAF50', marginTop: '3px' }}>
                            <span>✓ 实际：</span>
                            {ex.actual_sets != null && <span>{ex.actual_sets} 组</span>}
                            {ex.actual_reps != null && <span>× {ex.actual_reps} 次</span>}
                            {ex.actual_weight != null && <span>{ex.actual_weight} kg</span>}
                          </div>
                        )}
                        {ex.instance_notes && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>📌 {ex.instance_notes}</p>}
                        {ex.post_note && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9B7DB5', fontStyle: 'italic' }}>💬 {ex.post_note}</p>}
                      </div>
                      {isTrainer && classData.status !== 'completed' && (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => startEdit(ex)}
                            style={{ padding: '4px 10px', backgroundColor: '#f0eaf8', color: '#9B7DB5', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            编辑
                          </button>
                          <button onClick={() => handleRemoveExercise(ex.id)}
                            style={{ padding: '4px 10px', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            移除
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
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
      {showHomework && classData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px' }}>📋 布置课后作业</h2>
              <button onClick={() => setShowHomework(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#888' }}>选择要布置的动作（可多选），学员将在作业页查看：</p>

              {/* Exercise selection */}
              <div style={{ backgroundColor: '#f9f6fc', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                {classData.exercises.map((ex, i) => (
                  <div key={ex.id}
                    onClick={() => {
                      const s = new Set(homeworkSelected)
                      s.has(ex.id) ? s.delete(ex.id) : s.add(ex.id)
                      setHomeworkSelected(s)
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: i < classData.exercises.length - 1 ? '1px solid #eee' : 'none', backgroundColor: homeworkSelected.has(ex.id) ? '#f0eaf8' : 'white' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${homeworkSelected.has(ex.id) ? '#9B7DB5' : '#ddd'}`, backgroundColor: homeworkSelected.has(ex.id) ? '#9B7DB5' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {homeworkSelected.has(ex.id) && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px' }}>{ex.master_exercise.name_cn || ex.master_exercise.name_en}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                        {[ex.sets && `${ex.sets}组`, ex.reps && `${ex.reps}次`, ex.weight && `${ex.weight}${ex.weight_unit}`].filter(Boolean).join(' · ') || '未设置参数'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Student + due date */}
              <div style={{ display: 'grid', gap: '12px' }}>
                <label style={{ fontSize: '13px', color: '#666' }}>
                  分配给学员 ID（暂用 UUID，后续改为下拉）
                  <input type="text" value={homeworkStudentId} onChange={e => setHomeworkStudentId(e.target.value)}
                    placeholder="学员 User ID"
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '13px', color: '#666' }}>
                  截止日期（选填）
                  <input type="date" value={homeworkDueDate} onChange={e => setHomeworkDueDate(e.target.value)}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '13px', color: '#666' }}>
                  备注（选填）
                  <textarea value={homeworkNotes} onChange={e => setHomeworkNotes(e.target.value)}
                    placeholder="给学员的提示或说明..."
                    rows={2}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }} />
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowHomework(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '14px' }}>取消</button>
              <button
                onClick={handleCreateHomework}
                disabled={homeworkSelected.size === 0 || !homeworkStudentId || homeworkSubmitting}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#E8A87C', color: 'white', cursor: homeworkSelected.size > 0 && homeworkStudentId ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', opacity: homeworkSelected.size > 0 && homeworkStudentId ? 1 : 0.5 }}>
                {homeworkSubmitting ? '布置中...' : `布置作业（${homeworkSelected.size} 个动作）`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
