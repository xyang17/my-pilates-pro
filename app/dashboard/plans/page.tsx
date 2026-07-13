'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Plan {
  id: string
  title: string
  description: string | null
  goal: string | null
  level: string | null
  duration_desc: string | null
  is_published: boolean
  created_at: string
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: '初级', intermediate: '中级', advanced: '高级',
}

export default function PlansPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (!authLoading && userRole === 'CLIENT') { router.push('/dashboard'); return }
    if (user) fetchPlans()
  }, [user, userRole, authLoading])

  const fetchPlans = async () => {
    const res = await fetch('/api/plans', {
      headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
    })
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null }),
    })
    if (res.ok) {
      const plan = await res.json()
      router.push(`/dashboard/plans/${plan.id}`)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除「${title}」？此操作无法撤销。`)) return
    await fetch(`/api/plans/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
    })
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600 }}>我的训练计划</h1>
        <button
          onClick={() => setShowNew(true)}
          style={{ padding: '6px 16px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >＋ 新建</button>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 720, margin: '0 auto' }}>

        {/* New plan modal */}
        {showNew && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}>
            <div style={{ background: 'var(--c-card-bg)', borderRadius: 'var(--r-lg)', padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600 }}>新建训练计划</h2>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 6 }}>计划名称 *</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="例：12周减脂塑形计划"
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--c-border)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 6 }}>简介（可选）</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="一句话描述这个计划的目标…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowNew(false); setNewTitle(''); setNewDesc('') }}
                  style={{ padding: '8px 18px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 14 }}>取消</button>
                <button onClick={handleCreate} disabled={creating || !newTitle.trim()}
                  style={{ padding: '8px 20px', background: creating || !newTitle.trim() ? 'var(--c-lavender)' : 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                  {creating ? '创建中…' : '创建并编辑'}
                </button>
              </div>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#bbb' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15, marginBottom: 20 }}>还没有训练计划</p>
            <button onClick={() => setShowNew(true)}
              style={{ padding: '10px 24px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              ＋ 创建第一个计划
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plans.map(p => (
              <div key={p.id} style={{
                background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
                borderRadius: 'var(--r-lg)', padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>{p.title}</span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                      background: p.is_published ? '#E8F5E9' : '#F5F5F5',
                      color: p.is_published ? '#4CAF50' : '#999',
                    }}>
                      {p.is_published ? '🌐 公开' : '🔒 仅自己'}
                    </span>
                    {p.level && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#EDE6F4', color: 'var(--c-brand)' }}>
                        {LEVEL_LABEL[p.level] || p.level}
                      </span>
                    )}
                  </div>
                  {p.description && <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666', lineHeight: 1.5 }}>{p.description}</p>}
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {p.duration_desc && <span>{p.duration_desc} · </span>}
                    {new Date(p.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/dashboard/plans/${p.id}`}
                    style={{ padding: '7px 16px', background: 'var(--c-fill-light)', border: '1px solid var(--c-border)', borderRadius: 8, color: 'var(--c-brand)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                    编辑
                  </Link>
                  <button onClick={() => handleDelete(p.id, p.title)}
                    style={{ padding: '7px 12px', background: 'none', border: '1px solid #eee', borderRadius: 8, color: '#ccc', cursor: 'pointer', fontSize: 13 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f44336'; e.currentTarget.style.color = '#f44336' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.color = '#ccc' }}>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
