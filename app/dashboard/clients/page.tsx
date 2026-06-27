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

interface NewClientForm {
  name: string
  email: string
  password: string
  phone: string
}

export default function ClientListPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewClientForm>({ name: '', email: '', password: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

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

  const handleCreate = async () => {
    setFormError('')
    if (!form.name || !form.email || !form.password) {
      setFormError('姓名、邮箱、密码为必填项')
      return
    }
    if (form.password.length < 6) {
      setFormError('密码至少 6 位')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || '创建失败'); return }

      // Update phone if provided
      if (form.phone) {
        // phone can be updated later; skip for now as signup doesn't support it
      }

      setShowModal(false)
      setForm({ name: '', email: '', password: '', phone: '' })
      await fetchClients()
    } catch {
      setFormError('网络错误，请重试')
    } finally {
      setSubmitting(false)
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
        <button
          onClick={() => { setShowModal(true); setFormError('') }}
          style={{ backgroundColor: 'white', color: '#9B7DB5', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + 新建学员
        </button>
      </header>

      <main style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="搜索学员 Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#999' }}>
            {search ? '未找到匹配学员' : '暂无学员，点击右上角新建'}
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden' }}>
            {filtered.map((client, idx) => (
              <Link key={client.id} href={`/dashboard/clients/${client.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
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

      {/* Create modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '17px' }}>新建学员</h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#999' }}>Create New Client</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            {[
              { field: 'name', label: '姓名', en: 'Name', type: 'text', placeholder: '学员姓名', required: true },
              { field: 'email', label: '邮箱', en: 'Email', type: 'email', placeholder: 'example@email.com', required: true },
              { field: 'password', label: '密码', en: 'Password', type: 'password', placeholder: '至少 6 位 / Min 6 chars', required: true },
              { field: 'phone', label: '手机号', en: 'Phone', type: 'tel', placeholder: '选填 Optional', required: false },
            ].map(f => (
              <div key={f.field} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#555' }}>
                  {f.label} <span style={{ color: '#bbb', fontSize: '11px' }}>{f.en}</span>
                  {f.required && <span style={{ color: '#F1948A', marginLeft: '3px' }}>*</span>}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.field as keyof NewClientForm]}
                  onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {formError && (
              <p style={{ color: '#E8A87C', fontSize: '13px', margin: '0 0 12px 0' }}>⚠ {formError}</p>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px' }}
              >
                取消 Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#9B7DB5', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? '创建中...' : '创建账号 Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
