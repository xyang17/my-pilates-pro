'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function NewExercisePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    nameEN: '',
    nameCN: '',
    description: '',
    instructions: '',
    featuredImageUrl: '',
    type: '',
    difficulty: 'Intermediate',
    targetMuscles: '',
    defaultSets: '',
    defaultReps: '',
    defaultWeight: '',
    defaultWeightUnit: 'kg',
    defaultDuration: '',
    defaultDurationUnit: 'minutes',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!formData.nameEN || !formData.nameCN) {
        throw new Error('English and Chinese names are required')
      }

      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          nameEN: formData.nameEN,
          nameCN: formData.nameCN,
          description: formData.description,
          instructions: formData.instructions,
          featuredImageUrl: formData.featuredImageUrl || null,
          type: formData.type || null,
          difficulty: formData.difficulty,
          targetMuscles: formData.targetMuscles || null,
          defaultSets: formData.defaultSets ? parseInt(formData.defaultSets) : null,
          defaultReps: formData.defaultReps ? parseInt(formData.defaultReps) : null,
          defaultWeight: formData.defaultWeight ? parseFloat(formData.defaultWeight) : null,
          defaultWeightUnit: formData.defaultWeightUnit,
          defaultDuration: formData.defaultDuration ? parseInt(formData.defaultDuration) : null,
          defaultDurationUnit: formData.defaultDurationUnit,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create exercise')
      }

      const newExercise = await response.json()
      router.push(`/dashboard/exercises/${newExercise.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#9B7DB5',
        color: 'white',
        padding: '20px',
      }}>
        <h1>Create New Exercise</h1>
      </header>

      {/* Form */}
      <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
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

        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
        }}>
          <h2 style={{ marginTop: 0 }}>Basic Information</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Exercise Name (English) *
            </label>
            <input
              type="text"
              name="nameEN"
              value={formData.nameEN}
              onChange={handleChange}
              required
              placeholder="e.g., Pilates Push-up"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Exercise Name (Chinese) *
            </label>
            <input
              type="text"
              name="nameCN"
              value={formData.nameCN}
              onChange={handleChange}
              required
              placeholder="e.g., 普拉提俯卧撑"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px',
              }}
            />
          </div>

          <h2>Description & Instructions</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the exercise..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px',
                fontFamily: 'sans-serif',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              placeholder="Step-by-step instructions on how to perform this exercise..."
              rows={5}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px',
                fontFamily: 'sans-serif',
              }}
            />
          </div>

          <h2>Exercise Attributes</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              >
                <option value="">Select type...</option>
                <option value="Pilates Reformer">Pilates Reformer</option>
                <option value="Pilates Mat">Pilates Mat</option>
                <option value="Pilates Cadillac">Pilates Cadillac</option>
                <option value="Fitness">Fitness</option>
                <option value="Stretching">Stretching</option>
                <option value="Strength">Strength</option>
                <option value="Cardio">Cardio</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Difficulty Level *
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Target Muscles
              </label>
              <input
                type="text"
                name="targetMuscles"
                value={formData.targetMuscles}
                onChange={handleChange}
                placeholder="e.g., Core, Glutes, Hamstrings"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              />
              <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
                Comma-separated muscle groups
              </p>
            </div>
          </div>

          <h2>Default Parameters</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Default Sets
              </label>
              <input
                type="number"
                name="defaultSets"
                value={formData.defaultSets}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 3"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Default Reps
              </label>
              <input
                type="number"
                name="defaultReps"
                value={formData.defaultReps}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 12"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Default Weight
              </label>
              <input
                type="number"
                name="defaultWeight"
                value={formData.defaultWeight}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="e.g., 5"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Weight Unit
              </label>
              <select
                name="defaultWeightUnit"
                value={formData.defaultWeightUnit}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
                <option value="bodyweight">Bodyweight</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Default Duration
              </label>
              <input
                type="number"
                name="defaultDuration"
                value={formData.defaultDuration}
                onChange={handleChange}
                min="0"
                placeholder="e.g., 60"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                Duration Unit
              </label>
              <select
                name="defaultDurationUnit"
                value={formData.defaultDurationUnit}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  fontSize: '14px',
                }}
              >
                <option value="minutes">Minutes</option>
                <option value="seconds">Seconds</option>
              </select>
            </div>
          </div>

          <h2>Media</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Featured Image URL
            </label>
            <input
              type="url"
              name="featuredImageUrl"
              value={formData.featuredImageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '14px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', margin: '5px 0 0 0' }}>
              💡 This will be shown on the exercise card. You can add more images later!
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <Link
              href="/dashboard/exercises"
              style={{
                padding: '12px',
                textAlign: 'center',
                backgroundColor: '#f0f0f0',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '4px',
                border: '1px solid #ddd',
                cursor: 'pointer',
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px',
                backgroundColor: '#9B7DB5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Creating...' : 'Create Exercise'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
