'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function WorkoutsPage() {
  const { user, loading } = useAuth()
  const { t } = useLang()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  if (loading || !user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>{t('← 返回', '← Back')}</Link>
        <h1 style={{ margin: 0, fontSize: '18px' }}>{t('课后作业', 'Homework')}</h1>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#333' }}>{t('功能开发中', 'Coming Soon')}</h2>
          <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>{t('课程作业即将上线', 'Homework Assignments — Coming Soon')}</p>
          <p style={{ margin: '0 0 28px 0', color: '#999', fontSize: '13px' }}>
            {t('教练可在课程结束后给学员布置练习作业，功能即将上线。', 'Trainers can assign practice exercises after class. Feature coming soon.')}
          </p>
          <Link href="/dashboard/classes" style={{ color: '#9B7DB5', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
            → 查看课程 Go to Classes
          </Link>
        </div>
      </main>
    </div>
  )
}
