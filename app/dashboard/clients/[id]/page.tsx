'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClientClass {
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

interface Client {
  id: string
  name: string
  email: string
  photo_url?: string
  bio?: string
  created_at: string
  classes: ClientClass[]
}

const LEVEL_LABEL: Record<string, string> = { beginner: '初级', intermediate: '中级', advanced: '高级' }
const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
const STATUS_COLOR: Record<string, string> = { planned: '#85C1E9', in_progress: '#F7DC6F', completed: '#82E0AA' }

export default function ClientDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchClient()
  }, [user, authLoading])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClient(await res.json())
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  if (!client) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>学员未找到</p>
      <Link href="/dashboard/clients" style={{ color: '#9B7DB5' }}>← 返回</Link>
    </div>
  )

  const upcoming = client.classes.filter(c => c.status !== 'completed')
  const past = client.classes.filter(c => c.status === 'completed')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer' }}>← 返回 Back</button>
        <h1 style={{ margin: 0, fontSize: '18px' }}>学员详情 Client Profile</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Profile */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {client.photo_url ? (
              <img src={client.photo_url} alt={client.name}
                style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#E8A87C', color: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' }}>
                {client.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '20px' }}>{client.name}</h2>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '13px' }}>📧 {client.email}</p>
              <p style={{ margin: 0, color: '#bbb', fontSize: '12px' }}>
                加入时间 Joined: {new Date(client.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            {[
              { cn: '总课程', en: 'Total', val: client.classes.length },
              { cn: '即将上课', en: 'Upcoming', val: upcoming.length },
              { cn: '已完成', en: 'Completed', val: past.length },
            ].map(s => (
              <div key={s.en} style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9f6fc', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold', color: '#9B7DB5' }}>{s.val}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>{s.cn}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#bbb' }}>{s.en}</p>
              </div>
            ))}
          </div>

          {client.bio && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '12px' }}>备注 Notes</p>
              <p style={{ margin: 0, color: '#444', fontSize: '14px', lineHeight: '1.6' }}>{client.bio}</p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
              即将上课 Upcoming ({upcoming.length})
            </h3>
            {upcoming.map(c => <ClassRow key={c.id} c={c} />)}
          </div>
        )}

        {/* History */}
        {past.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
              课程记录 History ({past.length})
            </h3>
            {past.map(c => <ClassRow key={c.id} c={c} />)}
          </div>
        )}

        {client.classes.length === 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#999' }}>
            暂无课程记录
          </div>
        )}
      </main>
    </div>
  )
}

function ClassRow({ c }: { c: ClientClass }) {
  const STATUS_COLOR: Record<string, string> = { planned: '#85C1E9', in_progress: '#F7DC6F', completed: '#82E0AA' }
  const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
  const LEVEL_LABEL: Record<string, string> = { beginner: '初级', intermediate: '中级', advanced: '高级' }
  return (
    <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ width: '4px', height: '44px', borderRadius: '2px', backgroundColor: c.color || '#9B7DB5', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '14px' }}>{c.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            {new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN')}
            {c.start_time && ` · ${c.start_time.slice(0, 5)}`}
            {c.discipline && ` · ${c.discipline}`}
          </p>
        </div>
        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', backgroundColor: STATUS_COLOR[c.status] || '#ddd', color: '#444' }}>
          {STATUS_LABEL[c.status] || c.status}
        </span>
      </div>
    </Link>
  )
}
