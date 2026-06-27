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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>{t('← 返回', '← Back')}</Link>
        <h1 style={{ margin: 0, fontSize: '18px' }}>{t('我的主页', 'My Profile')}</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
        {/* Avatar + name */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '28px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#9B7DB5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', margin: '0 auto 12px' }}>
            {name[0]?.toUpperCase() || '?'}
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '20px' }}>{name}</h2>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '12px', backgroundColor: '#f3eef9', color: '#9B7DB5' }}>
            {ROLE_LABEL[userRole || ''] || userRole}
          </span>
        </div>

        {/* Info */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          {[
            { label: t('邮箱', 'Email'), val: user.email },
            { label: t('账号ID', 'User ID'), val: user.id },
            { label: t('注册时间', 'Joined'), val: new Date(user.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ color: '#999', fontSize: '13px' }}>{row.label}</span>
              <span style={{ fontSize: '13px', color: '#444', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{ width: '100%', padding: '14px', backgroundColor: 'white', color: '#E8A87C', border: '1px solid #E8A87C', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}
        >
          {t('退出登录', 'Logout')}
        </button>
      </main>
    </div>
  )
}
