'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang, FontSize } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, userRole, loading, logout } = useAuth()
  const { lang, setLang, fontSize, setFontSize, t } = useLang()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )

  const name = user.user_metadata?.name || user.email?.split('@')[0] || '—'
  const ROLE_LABEL: Record<string, string> = lang === 'zh'
    ? { ADMIN: '管理员', TRAINER: '教练', CLIENT: '学员' }
    : { ADMIN: 'Admin', TRAINER: 'Trainer', CLIENT: 'Client' }

  // Pill toggle helper
  const PillToggle = ({ value, options, onChange }: {
    value: string
    options: { key: string; label: string }[]
    onChange: (k: string) => void
  }) => (
    <div style={{ display: 'flex', gap: 3, background: 'var(--c-fill-light)', borderRadius: 'var(--r-full)', padding: '3px' }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '4px 12px',
          borderRadius: 'var(--r-full)',
          border: 'none',
          background: value === o.key ? 'var(--c-card-bg)' : 'transparent',
          color: value === o.key ? 'var(--c-brand)' : 'var(--c-text-hint)',
          fontSize: 'var(--text-xs)',
          fontWeight: value === o.key ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.12s',
          boxShadow: value === o.key ? 'var(--shadow-sm)' : 'none',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{label}</span>
      {children}
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
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
          {t('← 返回', '← Back')}
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {t('我的', 'Profile')}
        </h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 500, margin: '0 auto' }}>
        {/* Avatar + name */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-8)',
          marginBottom: 'var(--sp-4)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--c-fill-light)',
            border: '2px solid var(--c-pink-mist)',
            color: 'var(--c-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-2xl)', fontWeight: 700,
            margin: '0 auto var(--sp-3)',
          }}>
            {name[0]?.toUpperCase() || '?'}
          </div>
          <h2 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
            {name}
          </h2>
          <span style={{
            fontSize: 'var(--text-sm)', padding: '4px 14px',
            borderRadius: 'var(--r-full)',
            background: 'var(--c-fill-light)',
            color: 'var(--c-brand)',
            border: '1px solid var(--c-border)',
          }}>
            {ROLE_LABEL[userRole || ''] || userRole}
          </span>
        </div>

        {/* Account info */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          <p style={{ margin: '0', padding: 'var(--sp-4) 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('账号信息', 'Account')}
          </p>
          {[
            { label: t('邮箱', 'Email'), val: user.email },
            { label: t('注册时间', 'Joined'), val: new Date(user.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--sp-4) 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--c-border)' : 'none',
            }}>
              <span style={{ color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Settings section */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          <p style={{ margin: '0', padding: 'var(--sp-4) 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('偏好设置', 'Preferences')}
          </p>

          {/* Language */}
          <div style={{ borderBottom: '1px solid var(--c-border)' }}>
            <SettingRow label={t('语言', 'Language')}>
              <PillToggle
                value={lang}
                options={[{ key: 'zh', label: '中文' }, { key: 'en', label: 'English' }]}
                onChange={k => setLang(k as 'zh' | 'en')}
              />
            </SettingRow>
          </div>

          {/* Font size */}
          <div style={{ borderBottom: '1px solid var(--c-border)' }}>
            <SettingRow label={t('字体大小', 'Text Size')}>
              <PillToggle
                value={fontSize}
                options={[
                  { key: 'sm', label: t('小', 'S') },
                  { key: 'md', label: t('中', 'M') },
                  { key: 'lg', label: t('大', 'L') },
                ]}
                onChange={k => setFontSize(k as FontSize)}
              />
            </SettingRow>
          </div>

          {/* About */}
          <SettingRow label={t('版本', 'Version')}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>v1.0</span>
          </SettingRow>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: 'var(--sp-4)',
            background: 'var(--c-card-bg)',
            color: 'var(--c-text-secondary)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            fontSize: 'var(--text-base)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {t('退出登录', 'Logout')}
        </button>
      </main>
    </div>
  )
}
