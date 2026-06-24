'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExerciseImage {
  id: string
  image_url: string
  caption?: string
  order: number
}

interface ExerciseNote {
  id: string
  author_id: string
  author_type: string
  author_name: string
  content: string
  created_at: string
}

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
  description_en?: string
  description_cn?: string
  instructions_en?: string
  instructions_cn?: string
  featured_image_url?: string
  type_en?: string
  type_cn?: string
  difficulty_en?: string
  difficulty_cn?: string
  target_muscles_en?: string
  target_muscles_cn?: string
  default_sets?: number
  default_reps?: number
  default_weight?: number
  default_weight_unit?: string
  default_duration?: number
  default_duration_unit?: string
  created_by: string
  created_at: string
  images?: ExerciseImage[]
  notes?: ExerciseNote[]
}

export default function ExerciseDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<MasterExercise | null>(null)
  const [notes, setNotes] = useState<ExerciseNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [noteAuthorType, setNoteAuthorType] = useState<'trainer' | 'client'>('trainer')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [language, setLanguage] = useState<'en' | 'zh'>('en') // Language toggle: English or Chinese
  const isOwner = user && exercise && user.id === exercise.created_by

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchExercise()
    }
  }, [user, authLoading])

  const fetchExercise = async () => {
    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch exercise')
      }

      const data = await response.json()
      setExercise(data)
      setNotes(data.notes || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsSubmittingNote(true)

    try {
      const response = await fetch(`/api/exercises/${exerciseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-name': user?.user_metadata?.name || user?.email || 'Anonymous',
        },
        body: JSON.stringify({
          content: newNote,
          authorType: noteAuthorType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      const addedNote = await response.json()
      setNotes((prev) => [addedNote, ...prev])
      setNewNote('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  if (authLoading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (!exercise) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Exercise not found</p>
        <Link href="/dashboard/exercises" style={{ color: '#9B7DB5' }}>
          ← Back to Exercises
        </Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#9B7DB5',
        color: 'white',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
      }}>
        <Link href="/dashboard/exercises" style={{ color: 'white', textDecoration: 'none' }}>
          ← Back
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>
            {language === 'en' ? exercise.name_en : exercise.name_cn}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Language Toggle */}
          <div style={{ display: 'flex', gap: '5px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', padding: '5px' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '5px 12px',
                backgroundColor: language === 'en' ? 'white' : 'transparent',
                color: language === 'en' ? '#9B7DB5' : 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setLanguage('zh')}
              style={{
                padding: '5px 12px',
                backgroundColor: language === 'zh' ? 'white' : 'transparent',
                color: language === 'zh' ? '#9B7DB5' : 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              🇨🇳 中文
            </button>
          </div>

          {/* Edit Button (only for owner) */}
          {isOwner && (
            <Link
              href={`/dashboard/exercises/${exercise.id}/edit`}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                border: '1px solid white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              ✏️ Edit
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {/* Exercise Info */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '30px',
        }}>
          {/* Image Gallery */}
          {exercise.images && exercise.images.length > 0 ? (
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '20px',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <img
                src={exercise.images[0].image_url}
                alt={exercise.name_en}
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  marginBottom: '15px',
                  borderRadius: '4px',
                }}
              />
              {exercise.images[0].caption && (
                <p style={{ margin: 0, fontSize: '13px', color: '#666', textAlign: 'center' }}>
                  {exercise.images[0].caption}
                </p>
              )}
              {exercise.images.length > 1 && (
                <div style={{ marginTop: '15px', fontSize: '12px', color: '#999' }}>
                  {exercise.images.length} images available
                </div>
              )}
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#999',
            }}>
              📸 No images yet
            </div>
          )}

          {/* Info */}
          <div style={{ padding: '30px' }}>
            {/* Exercise Attributes */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '20px',
              paddingBottom: '20px',
              borderBottom: '1px solid #eee',
            }}>
              {language === 'en' ? exercise.type_en : exercise.type_cn && (
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>TYPE</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                    {language === 'en' ? exercise.type_en : exercise.type_cn}
                  </p>
                </div>
              )}
              {language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn && (
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>DIFFICULTY</p>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: (language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn) === 'Beginner' || (language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn) === '初级' ? '#4CAF50' : (language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn) === 'Intermediate' || (language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn) === '中级' ? '#FF9800' : '#F44336',
                  }}>
                    {language === 'en' ? exercise.difficulty_en : exercise.difficulty_cn}
                  </p>
                </div>
              )}
              {language === 'en' ? exercise.target_muscles_en : exercise.target_muscles_cn && (
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>TARGET MUSCLES</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                    {language === 'en' ? exercise.target_muscles_en : exercise.target_muscles_cn}
                  </p>
                </div>
              )}
            </div>

            {language === 'en' ? exercise.description_en : exercise.description_cn && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Description</h3>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{language === 'en' ? exercise.description_en : exercise.description_cn}</p>
              </div>
            )}

            {language === 'en' ? exercise.instructions_en : exercise.instructions_cn && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>{language === 'en' ? 'How to Perform' : '如何执行'}</h3>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {language === 'en' ? exercise.instructions_en : exercise.instructions_cn}
                </p>
              </div>
            )}

            {(exercise.default_sets || exercise.default_reps || exercise.default_weight || exercise.default_duration) && (
              <div style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #eee',
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Default Parameters</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '15px',
                }}>
                  {exercise.default_sets && (
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>SETS</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                        {exercise.default_sets}
                      </p>
                    </div>
                  )}
                  {exercise.default_reps && (
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>REPS</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                        {exercise.default_reps}
                      </p>
                    </div>
                  )}
                  {exercise.default_weight && (
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>WEIGHT</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                        {exercise.default_weight} {exercise.default_weight_unit}
                      </p>
                    </div>
                  )}
                  {exercise.default_duration && (
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>DURATION</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                        {exercise.default_duration} {exercise.default_duration_unit}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p style={{ margin: '20px 0 0 0', fontSize: '12px', color: '#999' }}>
              Created: {new Date(exercise.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderBottom: '1px solid #ddd',
          }}>
            <h2 style={{ margin: 0 }}>Notes & Feedback ({notes.length})</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
              Trainer and client notes are visible to all. Share tips and improvements here!
            </p>
          </div>

          {/* Add Note Form */}
          <div style={{ padding: '20px', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa' }}>
            <form onSubmit={handleAddNote}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '13px' }}>
                Add Your Note
              </label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Share tips, improvements, or observations..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                  marginBottom: '10px',
                  fontFamily: 'sans-serif',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <select
                  value={noteAuthorType}
                  onChange={(e) => setNoteAuthorType(e.target.value as 'trainer' | 'client')}
                  style={{
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="trainer">Trainer Note</option>
                  <option value="client">Client Note</option>
                </select>
                <button
                  type="submit"
                  disabled={!newNote.trim() || isSubmittingNote}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#9B7DB5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: newNote.trim() && !isSubmittingNote ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    opacity: newNote.trim() && !isSubmittingNote ? 1 : 0.5,
                    fontSize: '13px',
                  }}
                >
                  {isSubmittingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No notes yet. Be the first to add feedback!
            </div>
          ) : (
            <div>
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < notes.length - 1 ? '1px solid #eee' : 'none',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '10px',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>
                        {note.author_name}
                      </p>
                      <p style={{
                        margin: '2px 0 0 0',
                        fontSize: '12px',
                        color: '#999',
                      }}>
                        {note.author_type === 'trainer' ? '👨‍🏫 Trainer' : '👤 Client'} • {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p style={{
                    margin: 0,
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                  }}>
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
