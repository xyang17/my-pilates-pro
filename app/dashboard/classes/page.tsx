'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClassItem {
  id: string
  name: string
  date: string
  duration: number
  type: string
  discipline?: string
  status: 'planned' | 'in_progress' | 'completed'
  created_by: string
  assigned_to: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = { planned: '#9B7DB5', in_progress: '#FF9800', completed: '#4CAF50' }
const STATUS_ZH: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
const STATUS_EN: Record<string, string> = { planned: 'Planned', in_progress: 'In Progress', completed: 'Completed' }

export default function ClassesPage() {
  const { user, userRole, loading } = useAuth()
  const { t, lang } = useLang()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (user && userRole) fetchClasses()
  }, [user, userRole, loading])

  const fetchClasses = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/classes', { headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' } })
      if (!res.ok) throw new Error('Failed to fetch classes')
      setClasses(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const statusLabel = (s: string) => lang === 'zh' ? (STATUS_ZH[s] || s) : (STATUS_EN[s] || s)

  if (loading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>{t('课程训练', 'Class Training')}</h1>
        <Link href="/dashboard/classes/new" style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '13px' }}>
          + {t('新建课程', 'New Class')}
        </Link>
      </header>

      <main style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        {error && <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

        {classes.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
            <p style={{ color: '#999', marginBottom: '12px' }}>{t('暂无课程，点击新建开始', 'No classes yet. Create your first one!')}</p>
            <Link href="/dashboard/classes/new" style={{ color: '#9B7DB5', fontWeight: 'bold' }}>{t('新建第一节课', 'Create First Class')} →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {classes.map(cls => (
              <Link key={cls.id} href={`/dashboard/classes/${cls.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(155,125,181,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ width: '4px', height: '52px', borderRadius: '2px', backgroundColor: STATUS_COLOR[cls.status] || '#ccc', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '15px' }}>{cls.name}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                      📅 {new Date(cls.date + 'T12:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })}
                      {' · '}⏱️ {cls.duration}{t('分钟', 'min')}
                      {cls.discipline && ` · ${cls.discipline}`}
                    </p>
                  </div>
                  <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '10px', backgroundColor: STATUS_COLOR[cls.status] + '22', color: STATUS_COLOR[cls.status], fontWeight: 'bold', flexShrink: 0 }}>
                    {statusLabel(cls.status)}
                  </span>
                  <span style={{ color: '#9B7DB5', fontSize: '14px' }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
