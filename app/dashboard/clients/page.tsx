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
  created_at: string
}

export default function ClientListPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user && userRole) {
      if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
        router.push('/dashboard'); return
      }
      fetchClients()
    }
  }, [user, userRole, authLoading])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClients(await res.json())
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (authLoading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← 返回 Back</Link>
        <h1 style={{ margin: 0, fontSize: '18px', flex: 1 }}>学员管理 Clients</h1>
        <span style={{ fontSize: '14px', opacity: 0.85 }}>{clients.length} 人</span>
      </header>

      <main style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Search */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="搜索学员 Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#999' }}>
            {search ? '未找到匹配学员' : '暂无学员'}
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden' }}>
            {filtered.map((client, idx) => (
              <Link key={client.id} href={`/dashboard/clients/${client.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                  transition: 'background 0.15s',
                }}>
                  {client.photo_url ? (
                    <img src={client.photo_url} alt={client.name}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#E8A87C', color: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                      {client.name?.[0] || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '15px' }}>{client.name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#bbb' }}>
                      加入 {new Date(client.created_at).toLocaleDateString('zh-CN', { month: 'short', year: 'numeric' })}
                    </p>
                    <span style={{ fontSize: '12px', color: '#9B7DB5' }}>→</span>
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
