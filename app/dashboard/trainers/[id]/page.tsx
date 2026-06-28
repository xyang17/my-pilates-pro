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

  if (authLoading || isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )
  if (!trainer) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ color: 'var(--c-text-secondary)' }}>{error || '教练未找到'}</p>
      <Link href="/dashboard" style={{ color: 'var(--c-brand)' }}>← 返回</Link>
    </div>
  )

  const upcoming = trainer.classes.filter(c => c.status !== 'completed')
  const past = trainer.classes.filter(c => c.status === 'completed')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>教练主页</h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: '700px', margin: '0 auto' }}>
        {/* Profile card */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-6)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start' }}>
            {trainer.photo_url ? (
              <img src={trainer.photo_url} alt={trainer.name}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--c-fill-light)', border: '2px solid var(--c-pink-mist)', color: 'var(--c-brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
                {trainer.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{trainer.name}</h2>
              {trainer.certificate && (
                <p style={{ margin: '0 0 8px', color: 'var(--c-brand)', fontSize: 'var(--text-sm)' }}>🏆 {trainer.certificate}</p>
              )}
              <p style={{ margin: '0 0 4px', color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>📧 {trainer.email}</p>
            </div>
          </div>
          {trainer.bio && (
            <div style={{ marginTop: 'var(--sp-4)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--c-border)' }}>
              <p style={{ margin: '0 0 6px', color: 'var(--c-text-hint)', fontSize: 'var(--text-xs)' }}>简介</p>
              <p style={{ margin: 0, color: 'var(--c-text-primary)', lineHeight: '1.7', fontSize: 'var(--text-sm)' }}>{trainer.bio}</p>
            </div>
          )}
        </div>

        {/* Upcoming classes */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 var(--sp-4)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)', borderBottom: '1px solid var(--c-border)', paddingBottom: 'var(--sp-3)' }}>
            即将上课 ({upcoming.length})
          </h3>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--c-text-hint)', textAlign: 'center', padding: 'var(--sp-5) 0', fontSize: 'var(--text-sm)' }}>暂无排课</p>
          ) : (
            upcoming.map(c => <ClassRow key={c.id} c={c} />)
          )}
        </div>

        {/* Past classes */}
        {past.length > 0 && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)' }}>
            <h3 style={{ margin: '0 0 var(--sp-4)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)', borderBottom: '1px solid var(--c-border)', paddingBottom: 'var(--sp-3)' }}>
              历史课程 ({past.length})
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--c-border)' }}>
        <div style={{ width: 4, height: 40, borderRadius: 2, background: 'var(--c-lavender)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{c.name}</p>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-secondary)' }}>
            {new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN')}
            {c.start_time && ` · ${c.start_time.slice(0, 5)}`}
            {c.discipline && ` · ${c.discipline}`}
            {c.level && ` · ${LEVEL_LABEL[c.level] || c.level}`}
          </p>
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-hint)' }}>→</span>
      </div>
    </Link>
  )
}
