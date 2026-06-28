'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
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

const FIELD_STYLE = {
  width: '100%',
  padding: '11px var(--sp-4)',
  fontSize: 'var(--text-base)',
  boxSizing: 'border-box' as const,
}

export default function ClientListPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { t } = useLang()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewClientForm>({ name: '', email: '', password: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countryCode, setCountryCode] = useState('+86')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user && userRole) {
      if (userRole !== 'ADMIN' && userRole !== 'TRAINER') { router.push('/dashboard'); return }
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
    if (!form.name || !form.email || !form.password) { setFormError('姓名、邮箱、密码为必填项'); return }
    if (form.password.length < 6) { setFormError('密码至少 6 位'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone ? `${countryCode}${form.phone}` : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || '创建失败'); return }
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

  if (authLoading || isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
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
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          学员管理
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--c-text-hint)', marginLeft: 'var(--sp-2)' }}>
            {clients.length} 人
          </span>
        </h1>
        <button
          onClick={() => { setShowModal(true); setFormError(''); setShowPassword(false) }}
          style={{
            padding: '7px 16px',
            background: 'var(--c-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + 新建学员
        </button>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 700, margin: '0 auto' }}>
        {/* 搜索框 */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <input
            type="text"
            placeholder="搜索学员姓名或邮箱…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '11px var(--sp-4)', fontSize: 'var(--text-base)', boxSizing: 'border-box' }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{
            background: 'var(--c-card-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-10)',
            textAlign: 'center',
            color: 'var(--c-text-hint)',
            fontSize: 'var(--text-base)',
          }}>
            {search ? '未找到匹配学员' : '暂无学员，点击右上角新建'}
          </div>
        ) : (
          <div style={{
            background: 'var(--c-card-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
          }}>
            {filtered.map((client, idx) => (
              <Link key={client.id} href={`/dashboard/clients/${client.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-4)',
                    padding: 'var(--sp-4) var(--sp-5)',
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--c-border)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--c-fill-light)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* 头像 */}
                  {client.photo_url ? (
                    <img src={client.photo_url} alt={client.name}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--c-fill-light)',
                      border: '1.5px solid var(--c-pink-mist)',
                      color: 'var(--c-brand)',
                      flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 'var(--text-lg)', fontWeight: 600,
                    }}>
                      {client.name?.[0] || '?'}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--c-text-primary)' }}>
                      {client.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client.email}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>
                      加入 {new Date(client.created_at).toLocaleDateString('zh-CN', { month: 'short', year: 'numeric' })}
                    </p>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-hint)' }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* 新建学员 Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(45, 30, 64, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 'var(--sp-5)',
        }}>
          <div style={{
            background: 'var(--c-card-bg)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-6)',
            width: '100%', maxWidth: 420,
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--c-text-primary)' }}>新建学员</h2>
              <button
                onClick={() => { setShowModal(false); setShowPassword(false) }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--c-text-hint)', lineHeight: 1 }}
              >×</button>
            </div>

            {/* 姓名 */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                姓名 <span style={{ color: 'var(--c-error)' }}>*</span>
              </label>
              <input type="text" placeholder="学员姓名" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                style={FIELD_STYLE} />
            </div>

            {/* 邮箱 */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                邮箱 <span style={{ color: 'var(--c-error)' }}>*</span>
              </label>
              <input type="email" placeholder="example@email.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                style={FIELD_STYLE} />
            </div>

            {/* 密码 */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                  密码 <span style={{ color: 'var(--c-error)' }}>*</span>
                </label>
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ background: 'none', border: 'none', color: 'var(--c-brand)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 }}>
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="至少 6 位"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={FIELD_STYLE}
              />
            </div>

            {/* 手机号 */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--sp-2)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)' }}>
                手机号 <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 400 }}>选填</span>
              </label>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                  style={{ padding: '11px var(--sp-3)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+852">🇭🇰 +852</option>
                  <option value="+886">🇹🇼 +886</option>
                  <option value="+60">🇲🇾 +60</option>
                </select>
                <input type="tel" placeholder="手机号码" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  style={{ flex: 1, padding: '11px var(--sp-4)', fontSize: 'var(--text-base)' }} />
              </div>
            </div>

            {formError && (
              <div style={{
                background: 'var(--c-error-bg)',
                border: '1px solid var(--c-error)',
                color: '#8C4A4A',
                borderRadius: 'var(--r-sm)',
                padding: 'var(--sp-3) var(--sp-4)',
                marginBottom: 'var(--sp-4)',
                fontSize: 'var(--text-sm)',
              }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '12px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--c-border)',
                background: 'var(--c-fill-light)',
                color: 'var(--c-text-secondary)',
                cursor: 'pointer',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
              }}>
                取消
              </button>
              <button onClick={handleCreate} disabled={submitting} style={{
                flex: 2, padding: '12px',
                borderRadius: 'var(--r-md)',
                border: 'none',
                background: submitting ? 'var(--c-lavender)' : 'var(--c-brand)',
                color: '#fff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-base)',
                fontWeight: 500,
              }}>
                {submitting ? '创建中…' : '创建账号'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
