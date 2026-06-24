'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, userRole, loading, logout } = useAuth()
  const router = useRouter()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
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
        <h1>MyPilatesPro Dashboard</h1>
        <div>
          <span style={{ marginRight: '20px' }}>
            {user.user_metadata?.name || user.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid white',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h2>Welcome to Your Dashboard</h2>
          <p>User Email: {user.email}</p>
          <p>User Role: {userRole}</p>
          <p>User ID: {user.id}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3>🏋️ Exercise Library</h3>
            <p>Manage and view all exercises (bilingual, with notes & media)</p>
            <Link
              href="/dashboard/exercises"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Go to Exercises →
            </Link>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3>📚 Class Training</h3>
            <p>Create classes and log exercises (trainer & client training)</p>
            <Link
              href="/dashboard/classes"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Go to Classes →
            </Link>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3>📋 Homework Assignments</h3>
            <p>Assign exercises from classes as homework (coming soon)</p>
            <Link
              href="/dashboard/workouts"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Go to Homework →
            </Link>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3>📅 Class Schedule</h3>
            <p>View your upcoming pilates classes (coming soon)</p>
            <Link
              href="/dashboard/schedule"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              View Schedule →
            </Link>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h3>👤 My Profile</h3>
            <p>Update your profile information (coming soon)</p>
            <Link
              href="/dashboard/profile"
              style={{
                color: '#9B7DB5',
                textDecoration: 'none',
                fontWeight: 'bold',
              }}
            >
              Go to Profile →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
