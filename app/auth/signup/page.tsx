'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [inviteRole, setInviteRole] = useState<string>('')
  const [inviteId, setInviteId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { lang, setLang, t } = useLang()

  const checkInviteCode = async (code: string) => {
    if (code.trim().length < 4) { setInviteStatus('idle'); return }
    setInviteStatus('checking')
    try {
      const res = await fetch('/api/invite-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        setInviteStatus('valid')
        setInviteRole(data.role)
        setInviteId(data.inviteId)
      } else {
        setInviteStatus('invalid')
        setError(data.error || t('邀请码无效', 'Invalid invite code'))
      }
    } catch {
      setInviteStatus('invalid')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteStatus !== 'valid') {
      setError(t('请输入有效的邀请码', 'Please enter a valid invite code'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Mark invite code as used
      if (data.userId) {
        await fetch('/api/invite-codes/validate', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteId, userId: data.userId }),
        })
      }

      router.push('/auth/login?registered=1')
    } catch (err: any) {
      setError(err.message || t('注册失败', 'Sign up failed'))
    } finally {
      setLoading(false)
    }
  }

  const inviteBorderColor = inviteStatus === 'valid' ? '#4CAF50' : inviteStatus === 'invalid' ? '#e53935' : 'var(--c-border)'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-page-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-5)',
      position: 'relative',
    }}>
      {/* Language toggle */}
      <div style={{ position: 'absolute', top: 'var(--sp-5)', right: 'var(--sp-5)', display: 'flex', gap: 4, background: 'var(--c-card-bg)', borderRadius: 'var(--r-full)', border: '1px solid var(--c-border)', padding: '4px 6px' }}>
        <button onClick={() => setLang('zh')} style={{ padding: '3px 10px', borderRadius: 'var(--r-full)', border: 'none', background: lang === 'zh' ? 'var(--c-fill-mid)' : 'transparent', color: lang === 'zh' ? 'var(--c-brand)' : 'var(--c-text-hint)', fontSize: 'var(--text-xs)', fontWeight: lang === 'zh' ? 600 : 400, cursor: 'pointer' }}>中</button>
        <button onClick={() => setLang('en')} style={{ padding: '3px 10px', borderRadius: 'var(--r-full)', border: 'none', background: lang === 'en' ? 'var(--c-fill-mid)' : 'transparent', color: lang === 'en' ? 'var(--c-brand)' : 'var(--c-text-hint)', fontSize: 'var(--text-xs)', fontWeight: lang === 'en' ? 600 : 400, cursor: 'pointer' }}>EN</button>
      </div>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
        <img
          src="/logo.png"
          alt="MyFitnessPro"
          style={{
            width: 56, height: 56, borderRadius: 'var(--r-lg)',
            margin: '0 auto var(--sp-4)', display: 'block', objectFit: 'cover',
          }}
        />
        <h1 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.3px' }}>
          MyFitnessPro
        </h1>
        <p style={{ margin: 'var(--sp-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
          {t('教练与学员专属平台', 'For Trainers & Clients')}
        </p>
      </div>

      {/* 注册卡片 */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--c-card-bg)', borderRadius: 'var(--r-lg)',
        border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-card)',
        padding: 'var(--sp-8) var(--sp-6)',
      }}>
        <h2 style={{ margin: '0 0 var(--sp-6)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
          {t('创建账号', 'Create Account')}
        </h2>

        <form onSubmit={handleSignup}>

          {/* 邀请码 */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)', marginBottom: 'var(--sp-2)' }}>
              {t('邀请码', 'Invite Code')} <span style={{ color: '#e53935' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={inviteCode}
                onChange={e => {
                  const v = e.target.value.toUpperCase()
                  setInviteCode(v)
                  setInviteStatus('idle')
                  setError('')
                }}
                onBlur={() => checkInviteCode(inviteCode)}
                placeholder="MFP-CLT-XXX-XXX"
                maxLength={15}
                required
                style={{
                  width: '100%', padding: '12px var(--sp-4)',
                  fontSize: 'var(--text-base)', letterSpacing: '2px',
                  border: `1.5px solid ${inviteBorderColor}`,
                  borderRadius: 'var(--r-sm)', boxSizing: 'border-box',
                  outline: 'none', fontFamily: 'monospace',
                }}
              />
              {inviteStatus === 'checking' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#999' }}>{t('验证中…', 'Checking…')}</span>
              )}
              {inviteStatus === 'valid' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#4CAF50' }}>
                  ✓ {inviteRole === 'TRAINER' ? t('教练账号', 'Trainer account') : inviteRole === 'ADMIN' ? t('管理员账号', 'Admin account') : t('学员账号', 'Client account')}
                </span>
              )}
              {inviteStatus === 'invalid' && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#e53935' }}>✕</span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--c-text-hint)' }}>
              {t('请联系你的教练获取邀请码', 'Contact your trainer to get an invite code')}
            </p>
          </div>

          {/* 姓名 */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)', marginBottom: 'var(--sp-2)' }}>
              {t('姓名', 'Name')}
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t('你的名字', 'Your name')} required
              style={{ width: '100%', padding: '12px var(--sp-4)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)', marginBottom: 'var(--sp-2)' }}>
              {t('邮箱', 'Email')}
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              style={{ width: '100%', padding: '12px var(--sp-4)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* 密码 */}
          <div style={{ marginBottom: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--c-text-primary)' }}>{t('密码', 'Password')}</label>
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', color: 'var(--c-brand)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 }}>
                {showPassword ? t('隐藏', 'Hide') : t('显示', 'Show')}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder={t('至少 6 位', 'At least 6 characters')} required
              style={{ width: '100%', padding: '12px var(--sp-4)', fontSize: 'var(--text-base)' }}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              background: 'var(--c-error-bg)', border: '1px solid var(--c-error)',
              borderRadius: 'var(--r-sm)', padding: 'var(--sp-3) var(--sp-4)',
              marginTop: 'var(--sp-4)', fontSize: 'var(--text-sm)', color: '#8C4A4A',
            }}>
              {error}
            </div>
          )}

          {/* 注册按钮 */}
          <button
            type="submit" disabled={loading || inviteStatus !== 'valid'}
            style={{
              width: '100%', padding: '13px', marginTop: 'var(--sp-6)',
              background: loading || inviteStatus !== 'valid' ? 'var(--c-lavender)' : 'var(--c-brand)',
              color: 'var(--c-text-on-brand)', border: 'none',
              borderRadius: 'var(--r-md)', fontSize: 'var(--text-base)',
              fontWeight: 500, cursor: loading || inviteStatus !== 'valid' ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', letterSpacing: '0.2px',
            }}
          >
            {loading ? t('注册中…', 'Signing up…') : t('注册', 'Sign Up')}
          </button>
        </form>

        <p style={{ marginTop: 'var(--sp-6)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
          {t('已有账号？', 'Already have an account? ')}{' '}
          <Link href="/auth/login" style={{ color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>{t('直接登录', 'Sign in')}</Link>
        </p>
      </div>
    </div>
  )
}
