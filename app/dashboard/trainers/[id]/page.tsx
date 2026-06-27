'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TrainerClass {
  id: string
  name: string
  date: string
  start_time?: string
  duration: number
  discipline?: string
  class_type: string
  level?: string
  status: string
  color?: string
}

interface Trainer {
  id: string
  name: string
  email: string
  bio?: string
  photo_url?: string
  certificate?: string
  classes: TrainerClass[]
}

const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
const LEVEL_LABEL: Record<string, string> = { beginner: '初级', intermediate: '中级', advanced: '高级' }

export default function TrainerProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const trainerId = params.id as string

  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchTrainer()
  }, [user, authLoading])

  const fetchTrainer = async () => {
    try {
      const res = await fetch(`/api/trainers/${trainerId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) throw new Error('教练未找到')
      setTrainer(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  if (!trainer) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>{error || '教练未找到'}</p>
      <Link href="/dashboard" style={{ color: '#9B7DB5' }}>← 返回</Link>
    </div>
  )

  const upcoming = trainer.classes.filter(c => c.status !== 'completed')
  const past = trainer.classes.filter(c => c.status === 'completed')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer' }}>← 返回 Back</button>
        <h1 style={{ margin: 0, fontSize: '18px' }}>教练主页 Trainer Profile</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Profile card */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {trainer.photo_url ? (
              <img src={trainer.photo_url} alt={trainer.name}
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#9B7DB5', color: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                {trainer.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '20px' }}>{trainer.name}</h2>
              {trainer.certificate && (
                <p style={{ margin: '0 0 8px 0', color: '#9B7DB5', fontSize: '13px' }}>🏆 {trainer.certificate}</p>
              )}
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '13px' }}>📧 {trainer.email}</p>
            </div>
          </div>
          {trainer.bio && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '12px' }}>简介 Bio</p>
              <p style={{ margin: 0, color: '#444', lineHeight: '1.7', fontSize: '14px' }}>{trainer.bio}</p>
            </div>
          )}
        </div>

        {/* Upcoming classes */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
            即将上课 Upcoming ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>暂无排课</p>
          ) : (
            upcoming.map(c => <ClassRow key={c.id} c={c} />)
          )}
        </div>

        {/* Past classes */}
        {past.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
              历史课程 History ({past.length})
            </h3>
            {past.map(c => <ClassRow key={c.id} c={c} />)}
          </div>
        )}
      </main>
    </div>
  )
}

function ClassRow({ c }: { c: TrainerClass }) {
  const LEVEL_LABEL: Record<string, string> = { beginner: '初级', intermediate: '中级', advanced: '高级' }
  return (
    <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ width: '4px', height: '40px', borderRadius: '2px', backgroundColor: c.color || '#9B7DB5', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px' }}>{c.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            {new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN')}
            {c.start_time && ` · ${c.start_time.slice(0, 5)}`}
            {c.discipline && ` · ${c.discipline}`}
            {c.level && ` · ${LEVEL_LABEL[c.level] || c.level}`}
          </p>
        </div>
        <span style={{ fontSize: '12px', color: '#9B7DB5' }}>→</span>
      </div>
    </Link>
  )
}
