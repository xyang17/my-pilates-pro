'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Exercise {
  id: string
  name_en: string
  name_cn: string
  description_en?: string
  description_cn?: string
  instructions_en?: string
  instructions_cn?: string
  type_en?: string
  type_cn?: string
  difficulty_en?: string
  difficulty_cn?: string
  target_muscles_en?: string
  target_muscles_cn?: string
  featured_image_url?: string
  default_sets?: number
  default_reps?: number
  default_weight?: number
  default_weight_unit?: string
  created_at: string
}

export default function ExercisesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchExercises()
    }
  }, [user, loading])

  const fetchExercises = async () => {
    try {
      const response = await fetch('/api/exercises', {
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch exercises')
      }

      const data = await response.json()
      setExercises(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredExercises = exercises.filter((ex) =>
    ex.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.name_cn.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
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
        gap: '10px',
      }}>
        <h1>Exercise Library</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/dashboard/exercises/import"
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              border: '1px solid white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            📥 Import from Excel
          </Link>
          <Link
            href="/dashboard/exercises/new"
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              border: '1px solid white',
              cursor: 'pointer',
            }}
          >
            + New Exercise
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
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

        {/* Search */}
        <div style={{ marginBottom: '30px' }}>
          <input
            type="text"
            placeholder="Search exercises by English or Chinese name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Exercise Grid */}
        {filteredExercises.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <p>{exercises.length === 0 ? 'No exercises yet. Create your first exercise!' : 'No exercises match your search.'}</p>
            {exercises.length === 0 && (
              <Link
                href="/dashboard/exercises/new"
                style={{
                  color: '#9B7DB5',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                Create First Exercise →
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {filteredExercises.map((exercise) => (
              <Link
                key={exercise.id}
                href={`/dashboard/exercises/${exercise.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  height: '100%',
                }} onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
                }} onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                }}>
                  {/* Image placeholder */}
                  <div style={{
                    backgroundColor: '#f0f0f0',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                  }}>
                    {exercise.featured_image_url ? (
                      <img src={exercise.featured_image_url} alt={exercise.name_en} style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }} />
                    ) : (
                      '🏋️'
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '15px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                      {exercise.name_en}
                    </h3>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#999' }}>
                      {exercise.name_cn}
                    </p>

                    {/* Type & Difficulty */}
                    {(exercise.type_en || exercise.difficulty_en) && (
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        flexWrap: 'wrap'
                      }}>
                        {exercise.type_en && (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            padding: '3px 8px',
                            borderRadius: '3px',
                          }}>
                            {exercise.type_en}
                          </span>
                        )}
                        {exercise.difficulty_en && (
                          <span style={{
                            backgroundColor: '#fff3e0',
                            color: '#f57c00',
                            padding: '3px 8px',
                            borderRadius: '3px',
                          }}>
                            {exercise.difficulty_en}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Target Muscles */}
                    {exercise.target_muscles_en && (
                      <p style={{
                        margin: '8px 0',
                        fontSize: '12px',
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        <strong>Muscles:</strong> {exercise.target_muscles_en}
                      </p>
                    )}

                    {/* Description */}
                    {exercise.description_en && (
                      <p style={{
                        margin: '8px 0 0 0',
                        fontSize: '13px',
                        color: '#666',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {exercise.description_en}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
