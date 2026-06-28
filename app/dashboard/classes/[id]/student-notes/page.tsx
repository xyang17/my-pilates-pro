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

interface ExerciseItem {
  id: string
  order: number
  master_exercise: MasterExercise
}

interface StudentNote {
  id: string
  exercise_instance_id: string
  content: string
  created_at: string
}

export default function StudentNotesPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [className, setClassName] = useState('')
  const [classDate, setClassDate] = useState('')
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({}) // instanceId -> content
  const [savedNotes, setSavedNotes] = useState<Record<string, StudentNote>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }
    if (user) fetchData()
  }, [user, authLoading])

  const fetchData = async () => {
    try {
      const [classRes, notesRes] = await Promise.all([
        fetch(`/api/classes/${classId}`, {
          headers: { 'x-user-id': user?.id || '' },
        }),
        fetch(`/api/classes/${classId}/student-notes`, {
          headers: {
            'x-user-id': user?.id || '',
            'x-user-role': userRole || 'CLIENT',
          },
        }),
      ])

      if (!classRes.ok) throw new Error('课程未找到')
      const classData = await classRes.json()
      setClassName(classData.name)
      setClassDate(classData.date)
      setExercises(classData.exercises || [])

      if (notesRes.ok) {
        const notesData: StudentNote[] = await notesRes.json()
        // Index by exercise_instance_id
        const noteMap: Record<string, StudentNote> = {}
        const contentMap: Record<string, string> = {}
        notesData.forEach((n) => {
          noteMap[n.exercise_instance_id] = n
          contentMap[n.exercise_instance_id] = n.content
        })
        setSavedNotes(noteMap)
        setNotes(contentMap)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNote = async (instanceId: string) => {
    const content = notes[instanceId]?.trim()
    if (!content) return

    setSavingId(instanceId)
    try {
      const res = await fetch(`/api/classes/${classId}/student-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-role': userRole || 'CLIENT',
        },
        body: JSON.stringify({
          exercise_instance_id: instanceId,
          content,
          student_name: user?.user_metadata?.name || user?.email || '学员',
        }),
      })
      if (!res.ok) throw new Error('保存失败')
      const saved = await res.json()
      setSavedNotes((prev) => ({ ...prev, [instanceId]: saved }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const handleDeleteNote = async (instanceId: string) => {
    const note = savedNotes[instanceId]
    if (!note) return
    try {
      await fetch(`/api/classes/${classId}/student-notes?note_id=${note.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      setSavedNotes((prev) => {
        const next = { ...prev }
        delete next[instanceId]
        return next
      })
      setNotes((prev) => ({ ...prev, [instanceId]: '' }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (authLoading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href={`/dashboard/classes/${classId}`} style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
          ← 返回
        </Link>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)' }}>我的课后笔记</h1>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
            {className} · {new Date(classDate).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div style={{ width: 60 }} />
      </header>

      <main style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        {error && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <p style={{ color: '#666', fontSize: '13px', margin: '0 0 16px 0' }}>
          记录每个动作的感受或教练提醒，下课后随时可以补充。
        </p>

        {exercises.length === 0 ? (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#999' }}>
            这节课暂无动作记录
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {exercises.map((ex, i) => {
              const isSaved = !!savedNotes[ex.id]
              const currentContent = notes[ex.id] || ''
              const hasChanged = isSaved ? currentContent !== savedNotes[ex.id]?.content : currentContent.trim() !== ''

              return (
                <div key={ex.id} style={{ background: 'var(--c-card-bg)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
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
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{ex.master_exercise.name_en}</span>
                      <span style={{ color: '#999', fontSize: '13px', marginLeft: '8px' }}>{ex.master_exercise.name_cn}</span>
                    </div>
                    {isSaved && (
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#4CAF50' }}>✓ 已记录</span>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="例：今天做这个动作时感觉左边比右边紧，教练提醒我呼气时再放松..."
                    value={currentContent}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'sans-serif',
                      resize: 'vertical',
                    }}
                  />

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                    {isSaved && (
                      <button
                        onClick={() => handleDeleteNote(ex.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        删除
                      </button>
                    )}
                    <button
                      onClick={() => handleSaveNote(ex.id)}
                      disabled={!hasChanged || savingId === ex.id || !currentContent.trim()}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: hasChanged && currentContent.trim() ? 'var(--c-brand)' : '#eee',
                        color: hasChanged && currentContent.trim() ? 'white' : '#999',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: hasChanged && currentContent.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    >
                      {savingId === ex.id ? '保存中...' : isSaved ? '更新' : '保存'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
