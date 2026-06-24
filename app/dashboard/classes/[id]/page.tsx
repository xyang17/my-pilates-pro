'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
  description?: string
  instructions?: string
  image_url?: string
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
  master_exercise: MasterExercise
}

interface ClassData {
  id: string
  name: string
  date: string
  duration: number
  type: string
  status: string
  notes?: string
  feedback?: string
  exercises: ClassExercise[]
  created_by: string
}

export default function ClassDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classId = params.id as string

  const [classData, setClassData] = useState<ClassData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [selectedExerciseId, setSelectedExerciseId] = useState('')
  const [availableExercises, setAvailableExercises] = useState<MasterExercise[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user) {
      fetchClassData()
      fetchExercises()
    }
  }, [user, authLoading])

  const fetchClassData = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        headers: {
          'x-user-id': user?.id || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch class')
      }

      const data = await response.json()
      setClassData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

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
      setAvailableExercises(data)
    } catch (err: any) {
      console.error('Error fetching exercises:', err)
    }
  }

  const handleAddExercise = async () => {
    if (!selectedExerciseId) return

    try {
      const response = await fetch(`/api/classes/${classId}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          exerciseId: selectedExerciseId,
          weightUnit: 'kg',
          durationUnit: 'minutes',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add exercise')
      }

      setShowAddExercise(false)
      setSelectedExerciseId('')
      fetchClassData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveExercise = async (exerciseInstanceId: string) => {
    if (!confirm('Remove this exercise from the class?')) return

    try {
      const response = await fetch(
        `/api/classes/${classId}/exercises/${exerciseInstanceId}`,
        {
          method: 'DELETE',
          headers: {
            'x-user-id': user?.id || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to remove exercise')
      }

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
        <p>Class not found</p>
        <Link href="/dashboard/classes" style={{ color: '#9B7DB5' }}>
          ← Back to Classes
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
      }}>
        <Link href="/dashboard/classes" style={{ color: 'white', textDecoration: 'none' }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0 }}>{classData.name}</h1>
        <div></div>
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

        {/* Class Info */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>DATE</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                {new Date(classData.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>DURATION</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                {classData.duration} minutes
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>TYPE</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                {classData.type}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>STATUS</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#9B7DB5' }}>
                {classData.status}
              </p>
            </div>
          </div>

          {classData.notes && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '12px' }}>NOTES</p>
              <p style={{ margin: 0 }}>{classData.notes}</p>
            </div>
          )}
        </div>

        {/* Exercises */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ddd',
          }}>
            <h2 style={{ margin: 0 }}>Exercises ({classData.exercises.length})</h2>
            <button
              onClick={() => setShowAddExercise(!showAddExercise)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#9B7DB5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {showAddExercise ? '✕ Cancel' : '+ Add Exercise'}
            </button>
          </div>

          {/* Add Exercise Form */}
          {showAddExercise && (
            <div style={{ padding: '20px', borderBottom: '1px solid #ddd', backgroundColor: '#fafafa' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  style={{
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select an exercise...</option>
                  {availableExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name_en} ({exercise.name_cn})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddExercise}
                  disabled={!selectedExerciseId}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: selectedExerciseId ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    opacity: selectedExerciseId ? 1 : 0.5,
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Exercise List */}
          {classData.exercises.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No exercises yet. Add your first exercise to the class!
            </div>
          ) : (
            <div>
              {classData.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < classData.exercises.length - 1 ? '1px solid #eee' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr auto',
                    alignItems: 'start',
                    gap: '20px',
                  }}
                >
                  <div style={{
                    backgroundColor: '#9B7DB5',
                    color: 'white',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}>
                    {index + 1}
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>
                      {exercise.master_exercise.name_en}
                      <span style={{ color: '#999', fontSize: '14px', marginLeft: '10px' }}>
                        {exercise.master_exercise.name_cn}
                      </span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '10px', fontSize: '14px' }}>
                      {exercise.sets !== null && <p style={{ margin: 0 }}>Sets: <strong>{exercise.sets}</strong></p>}
                      {exercise.reps !== null && <p style={{ margin: 0 }}>Reps: <strong>{exercise.reps}</strong></p>}
                      {exercise.weight !== null && <p style={{ margin: 0 }}>Weight: <strong>{exercise.weight} {exercise.weight_unit}</strong></p>}
                      {exercise.duration !== null && <p style={{ margin: 0 }}>Duration: <strong>{exercise.duration} {exercise.duration_unit}</strong></p>}
                    </div>
                    {exercise.instance_notes && (
                      <p style={{ margin: '10px 0 0 0', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                        💡 {exercise.instance_notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveExercise(exercise.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffebee',
                      color: '#c62828',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
