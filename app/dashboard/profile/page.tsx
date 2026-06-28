'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, userRole, loading, logout } = useAuth()
  const { lang, t } = useLang()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  const name = user.user_metadata?.name || user.email?.split('@')[0] || '—'
  const ROLE_LABEL: Record<string, string> = lang === 'zh' ? { ADMIN: '管理员', TRAINER: '教练', CLIENT: '学员' } : { ADMIN: 'Admin', TRAINER: 'Trainer', CLIENT: 'Client' }

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
          {t('我的主页', 'My Profile')}
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

        {/* Info */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          {[
            { label: t('邮箱', 'Email'), val: user.email },
            { label: t('账号ID', 'User ID'), val: user.id },
            { label: t('注册时间', 'Joined'), val: new Date(user.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--sp-4) 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--c-border)' : 'none',
            }}>
              <span style={{ color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{row.val}</span>
            </div>
          ))}
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
