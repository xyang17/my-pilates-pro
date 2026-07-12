'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface InviteCode {
  id: string
  code: string
  role: 'TRAINER' | 'CLIENT'
  label: string | null
  used_by: string | null
  used_by_name: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
}

export default function InviteCodesPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()

  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newRole, setNewRole] = useState<'CLIENT' | 'TRAINER'>('CLIENT')
  const [newLabel, setNewLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const isAdmin = userRole === 'ADMIN'

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push('/dashboard')
  }, [user, authLoading, isAdmin])

  useEffect(() => {
    if (user && isAdmin) fetchCodes()
  }, [user, isAdmin])

  const fetchCodes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/invite-codes', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setCodes(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ role: newRole, label: newLabel, expiresInDays: 30 }),
      })
      if (res.ok) {
        const code = await res.json()
        setCodes(prev => [code, ...prev])
        setNewLabel('')
      }
    } finally {
      setGenerating(false)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const isExpired = (expires_at: string | null) =>
    expires_at ? new Date(expires_at) < new Date() : false

  const statusLabel = (c: InviteCode) => {
    if (c.used_by) return { text: '已使用', color: '#999', bg: '#f5f5f5' }
    if (isExpired(c.expires_at)) return { text: '已过期', color: '#e53935', bg: '#ffebee' }
    return { text: '有效', color: '#4CAF50', bg: '#E8F5E9' }
  }

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>邀请码管理</h1>
        <div style={{ width: 60 }} />
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 680, margin: '0 auto' }}>

        {/* 生成新邀请码 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', marginBottom: 'var(--sp-5)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 'var(--text-base)', fontWeight: 600 }}>生成新邀请码</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: 6 }}>邀请角色</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'CLIENT' | 'TRAINER')}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 14 }}
              >
                <option value="CLIENT">🧑 学员</option>
                <option value="TRAINER">🏋️ 教练</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: 6 }}>备注（可选）</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="例：给张三的邀请码"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '9px 20px', background: generating ? 'var(--c-lavender)' : 'var(--c-brand)',
              color: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
              fontSize: 14, fontWeight: 500, cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? '生成中…' : '🔑 生成邀请码'}
          </button>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#999' }}>有效期 30 天，每个码只能使用一次</p>
        </div>

        {/* 已生成的码列表 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>已生成的邀请码</h2>
          </div>

          {codes.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
              还没有邀请码，点上方按钮生成
            </div>
          ) : (
            <div>
              {codes.map((c, i) => {
                const st = statusLabel(c)
                return (
                  <div key={c.id} style={{
                    padding: '14px 20px',
                    borderBottom: i < codes.length - 1 ? '1px solid var(--c-border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: c.used_by || isExpired(c.expires_at) ? 0.6 : 1,
                  }}>
                    {/* Code */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--c-text-primary)' }}>
                          {c.code}
                        </span>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 500 }}>
                          {st.text}
                        </span>
                        <span style={{ fontSize: 11, color: '#999', background: '#f5f5f5', padding: '2px 7px', borderRadius: 10 }}>
                          {c.role === 'TRAINER' ? '🏋️ 教练' : '🧑 学员'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>
                        {c.label && <span style={{ marginRight: 10 }}>📝 {c.label}</span>}
                        {c.expires_at && <span>到期：{new Date(c.expires_at).toLocaleDateString('zh-CN')}</span>}
                        {c.used_by_name && <span style={{ marginLeft: 10 }}>→ {c.used_by_name}</span>}
                        {c.used_at && <span style={{ marginLeft: 6 }}>({new Date(c.used_at).toLocaleDateString('zh-CN')})</span>}
                      </div>
                    </div>

                    {/* Copy button */}
                    {!c.used_by && !isExpired(c.expires_at) && (
                      <button
                        onClick={() => copyCode(c.code)}
                        style={{
                          padding: '6px 14px', border: '1px solid var(--c-border-em)',
                          borderRadius: 6, background: copied === c.code ? '#E8F5E9' : 'var(--c-fill-light)',
                          color: copied === c.code ? '#4CAF50' : 'var(--c-brand)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0,
                        }}
                      >
                        {copied === c.code ? '✓ 已复制' : '复制'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
