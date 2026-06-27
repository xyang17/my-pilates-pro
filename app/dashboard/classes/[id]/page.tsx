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
  const [availableExercises, setAvailableExercises] = useState<MasterExercise[]>([])
  const [activeTab, setActiveTab] = useState<'exercises' | 'student-notes'>('exercises')
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([])

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
      if (res.ok) setAvailableExercises(await res.json())
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
            )}

            {showAddExercise && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', backgroundColor: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                  <select
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                    style={{ padding: '9px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  >
                    <option value="">选择动作...</option>
                    {availableExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name_en}（{ex.name_cn}）
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddExercise}
                    disabled={!selectedExerciseId}
                    style={{
                      padding: '9px 18px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: selectedExerciseId ? 'pointer' : 'not-allowed',
                      opacity: selectedExerciseId ? 1 : 0.5,
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>
            )}

            {classData.exercises.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                暂无动作。{isTrainer ? '点击上方"添加动作"开始计划课程。' : ''}
              </div>
            ) : (
              classData.exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: i < classData.exercises.length - 1 ? '1px solid #f0f0f0' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto',
                    gap: '14px',
                    alignItems: 'start',
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px',
                    backgroundColor: '#9B7DB5', color: 'white',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>

                  <div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>
                      {ex.master_exercise.name_en}
                      <span style={{ color: '#999', fontSize: '13px', marginLeft: '8px' }}>
                        {ex.master_exercise.name_cn}
                      </span>
                    </p>
                    {/* Planned params */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#555' }}>
                      {ex.sets != null && <span>计划 {ex.sets} 组</span>}
                      {ex.reps != null && <span>× {ex.reps} 次</span>}
                      {ex.weight != null && <span>{ex.weight} {ex.weight_unit}</span>}
                      {ex.duration != null && <span>{ex.duration} {ex.duration_unit}</span>}
                    </div>
                    {/* Actual params (from review) */}
                    {(ex.actual_sets != null || ex.actual_reps != null || ex.actual_weight != null) && (
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#4CAF50', marginTop: '4px' }}>
                        <span>实际：</span>
                        {ex.actual_sets != null && <span>{ex.actual_sets} 组</span>}
                        {ex.actual_reps != null && <span>× {ex.actual_reps} 次</span>}
                        {ex.actual_weight != null && <span>{ex.actual_weight} kg</span>}
                      </div>
                    )}
                    {ex.instance_notes && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>
                        📌 {ex.instance_notes}
                      </p>
                    )}
                    {ex.post_note && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9B7DB5', fontStyle: 'italic' }}>
                        💬 {ex.post_note}
                      </p>
                    )}
                  </div>

                  {isTrainer && classData.status !== 'completed' && (
                    <button
                      onClick={() => handleRemoveExercise(ex.id)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flexShrink: 0,
                      }}
                    >
                      移除
                    </button>
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
    </div>
  )
}
