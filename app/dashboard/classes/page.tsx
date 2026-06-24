'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClassItem {
  id: string
  name: string
  date: string
  duration: number
  type: string
  status: 'planned' | 'in_progress' | 'completed'
  created_by: string
  assigned_to: string | null
  created_at: string
}

export default function ClassesPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (user && userRole) {
      fetchClasses()
    }
  }, [user, userRole, loading])

  const fetchClasses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/classes', {
        headers: {
          'x-user-id': user?.id || '',
          'x-user-role': userRole || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }

      const data = await response.json()
      setClasses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return '#9B7DB5'
      case 'in_progress':
        return '#FF9800'
      case 'completed':
        return '#4CAF50'
      default:
        return '#999'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned':
        return 'Planned'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

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
      }}>
        <h1>Class Training</h1>
        <Link
          href="/dashboard/classes/new"
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
          + New Class
        </Link>
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

        {classes.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <p>No classes yet. Start by creating your first class!</p>
            <Link
              href="/dashboard/classes/new"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Create First Class →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/dashboard/classes/${cls.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: '20px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }} onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)'
                }} onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px 0' }}>{cls.name}</h3>
                    <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                      📅 {new Date(cls.date).toLocaleDateString()} • ⏱️ {cls.duration} min • 🏋️ {cls.type}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                  }}>
                    <span style={{
                      padding: '6px 12px',
                      backgroundColor: getStatusColor(cls.status),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {getStatusLabel(cls.status)}
                    </span>
                    <span style={{ color: '#999' }}>→</span>
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
