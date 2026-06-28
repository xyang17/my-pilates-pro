'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
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
  default_duration?: number
  default_duration_unit?: string
  created_by: string
}

export default function EditExercisePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    nameEN: '',
    nameCN: '',
    descriptionEN: '',
    descriptionCN: '',
    instructionsEN: '',
    instructionsCN: '',
    typeEN: '',
    typeCN: '',
    difficultyEN: '',
    difficultyCN: '',
    targetMusclesEN: '',
    targetMusclesCN: '',
    featuredImageUrl: '',
    defaultSets: '',
    defaultReps: '',
    defaultWeight: '',
    defaultWeightUnit: 'kg',
    defaultDuration: '',
    defaultDurationUnit: 'minutes',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && exerciseId) {
      fetchExercise()
    }
  }, [user, authLoading, exerciseId])

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

      // Verify ownership
      if (data.created_by !== user?.id) {
        setError('You do not have permission to edit this exercise')
        return
      }

      setExercise(data)
      setFormData({
        nameEN: data.name_en || '',
        nameCN: data.name_cn || '',
        descriptionEN: data.description_en || '',
        descriptionCN: data.description_cn || '',
        instructionsEN: data.instructions_en || '',
        instructionsCN: data.instructions_cn || '',
        typeEN: data.type_en || '',
        typeCN: data.type_cn || '',
        difficultyEN: data.difficulty_en || '',
        difficultyCN: data.difficulty_cn || '',
        targetMusclesEN: data.target_muscles_en || '',
        targetMusclesCN: data.target_muscles_cn || '',
        featuredImageUrl: data.featured_image_url || '',
        defaultSets: data.default_sets || '',
        defaultReps: data.default_reps || '',
        defaultWeight: data.default_weight || '',
        defaultWeightUnit: data.default_weight_unit || 'kg',
        defaultDuration: data.default_duration || '',
        defaultDurationUnit: data.default_duration_unit || 'minutes',
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update exercise')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/exercises/${exerciseId}`)
      }, 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  }

  if (error && !success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', padding: '40px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
          <Link href="/dashboard/exercises" style={{ color: 'var(--c-brand)' }}>
            ← Back to Exercises
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href={`/dashboard/exercises/${exerciseId}`} style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
          ← 返回
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>编辑动作</h1>
        <div></div>
      </header>

      {/* Form */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        {success && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #4caf50',
          }}>
            ✅ Exercise updated successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} style={{
          background: 'var(--c-card-bg)',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          {/* Names */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Exercise Names</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 English Name
                </label>
                <input
                  type="text"
                  value={formData.nameEN}
                  onChange={(e) => handleInputChange('nameEN', e.target.value)}
                  required
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Chinese Name
                </label>
                <input
                  type="text"
                  value={formData.nameCN}
                  onChange={(e) => handleInputChange('nameCN', e.target.value)}
                  required
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
            </div>
          </div>

          {/* Descriptions */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Descriptions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 English Description
                </label>
                <textarea
                  value={formData.descriptionEN}
                  onChange={(e) => handleInputChange('descriptionEN', e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Chinese Description
                </label>
                <textarea
                  value={formData.descriptionCN}
                  onChange={(e) => handleInputChange('descriptionCN', e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Instructions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 English Instructions
                </label>
                <textarea
                  value={formData.instructionsEN}
                  onChange={(e) => handleInputChange('instructionsEN', e.target.value)}
                  rows={6}
                  placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Chinese Instructions
                </label>
                <textarea
                  value={formData.instructionsCN}
                  onChange={(e) => handleInputChange('instructionsCN', e.target.value)}
                  rows={6}
                  placeholder="1. 第一步&#10;2. 第二步&#10;3. 第三步"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Type & Difficulty */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Type & Difficulty</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 Type (English)
                </label>
                <input
                  type="text"
                  value={formData.typeEN}
                  onChange={(e) => handleInputChange('typeEN', e.target.value)}
                  placeholder="e.g., Pilates Mat, Reformer, Fitness"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Type (Chinese)
                </label>
                <input
                  type="text"
                  value={formData.typeCN}
                  onChange={(e) => handleInputChange('typeCN', e.target.value)}
                  placeholder="e.g., 普拉提垫上"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 Difficulty (English)
                </label>
                <select
                  value={formData.difficultyEN}
                  onChange={(e) => handleInputChange('difficultyEN', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select Difficulty</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Difficulty (Chinese)
                </label>
                <select
                  value={formData.difficultyCN}
                  onChange={(e) => handleInputChange('difficultyCN', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select Difficulty</option>
                  <option value="初级">初级</option>
                  <option value="中级">中级</option>
                  <option value="高级">高级</option>
                </select>
              </div>
            </div>
          </div>

          {/* Target Muscles */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Target Muscles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇬🇧 English
                </label>
                <input
                  type="text"
                  value={formData.targetMusclesEN}
                  onChange={(e) => handleInputChange('targetMusclesEN', e.target.value)}
                  placeholder="e.g., Core, Chest, Arms"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  🇨🇳 Chinese
                </label>
                <input
                  type="text"
                  value={formData.targetMusclesCN}
                  onChange={(e) => handleInputChange('targetMusclesCN', e.target.value)}
                  placeholder="e.g., 核心, 胸部, 手臂"
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
            </div>
          </div>

          {/* Default Parameters */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Default Parameters</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Sets
                </label>
                <input
                  type="number"
                  value={formData.defaultSets}
                  onChange={(e) => handleInputChange('defaultSets', e.target.value)}
                  min="1"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Reps
                </label>
                <input
                  type="number"
                  value={formData.defaultReps}
                  onChange={(e) => handleInputChange('defaultReps', e.target.value)}
                  min="1"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Weight
                </label>
                <input
                  type="number"
                  value={formData.defaultWeight}
                  onChange={(e) => handleInputChange('defaultWeight', e.target.value)}
                  step="0.5"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Weight Unit
                </label>
                <select
                  value={formData.defaultWeightUnit}
                  onChange={(e) => handleInputChange('defaultWeightUnit', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                  <option value="bodyweight">bodyweight</option>
                  <option value="spring">spring</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Duration
                </label>
                <input
                  type="number"
                  value={formData.defaultDuration}
                  onChange={(e) => handleInputChange('defaultDuration', e.target.value)}
                  min="1"
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Duration Unit
                </label>
                <select
                  value={formData.defaultDurationUnit}
                  onChange={(e) => handleInputChange('defaultDurationUnit', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="minutes">minutes</option>
                  <option value="seconds">seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Link
              href={`/dashboard/exercises/${exerciseId}`}
              style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#f0f0f0',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '4px',
                border: '1px solid #ddd',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '12px',
                backgroundColor: 'var(--c-brand)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
