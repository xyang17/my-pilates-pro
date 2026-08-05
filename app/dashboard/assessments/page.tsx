'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email: string
  photo_url?: string
}

interface RecentMeasurement {
  client_id: string
  measured_at: string
}

export default function AssessmentsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [lastAssessed, setLastAssessed] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (!authLoading && userRole === 'CLIENT') { router.push('/dashboard'); return }
    if (user && userRole) loadData()
  }, [user, userRole, authLoading])

  const loadData = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch('/api/clients', {
          headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        }),
        fetch('/api/l0/metrics?limit=500', {
          headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        }),
      ])
      if (cRes.ok) setClients(await cRes.json())
      if (aRes.ok) {
        const measurements: RecentMeasurement[] = await aRes.json()
        // clientId -> 最近一次 measured_at
        const map: Record<string, string> = {}
        for (const m of measurements) {
          if (!map[m.client_id] || m.measured_at > map[m.client_id]) {
            map[m.client_id] = m.measured_at
          }
        }
        setLastAssessed(map)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>身体测试</h1>
        <div style={{ width: 60 }} />
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 680, margin: '0 auto' }}>

        {/* 搜索 */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <input
            type="text"
            placeholder="搜索学员姓名…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px',
              border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)',
              fontSize: 14, boxSizing: 'border-box', background: 'var(--c-card-bg)',
            }}
          />
        </div>

        {/* 学员列表 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
              {clients.length === 0 ? '还没有学员' : '没有匹配的学员'}
            </div>
          ) : (
            filtered.map((c, i) => {
              const last = lastAssessed[c.id]
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/assessments/${c.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--c-border)' : 'none',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--c-lavender)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0, overflow: 'hidden',
                  }}>
                    {c.photo_url
                      ? <img src={c.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={c.name} />
                      : c.name[0]?.toUpperCase()
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                      {last
                        ? `上次测试：${new Date(last).toLocaleDateString('zh-CN')}`
                        : '尚未测试'
                      }
                    </div>
                  </div>

                  {/* 状态标记 */}
                  <div style={{
                    fontSize: 11, padding: '3px 8px', borderRadius: 10,
                    background: last ? '#E8F5E9' : '#FFF8E1',
                    color: last ? '#4CAF50' : '#F9A825',
                    fontWeight: 500, flexShrink: 0,
                  }}>
                    {last ? '有记录' : '待测试'}
                  </div>

                  <span style={{ color: 'var(--c-text-hint)', fontSize: 18 }}>›</span>
                </Link>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
