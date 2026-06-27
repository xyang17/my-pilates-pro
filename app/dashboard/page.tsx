'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, userRole, loading, logout } = useAuth()
  const { t } = useLang()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  if (!user) return null

  const cards = [
    { icon: '🏋️', title: t('动作库', 'Exercise Library'), desc: t('管理和查看所有课程动作', 'Manage and view all exercises'), href: '/dashboard/exercises' },
    { icon: '📚', title: t('课程训练', 'Class Training'), desc: t('创建课程并记录训练动作', 'Create classes and log exercises'), href: '/dashboard/classes' },
    { icon: '📅', title: t('课程日历', 'Calendar'), desc: t('按月查看所有课程排班', 'Monthly class schedule view'), href: '/dashboard/calendar' },
    { icon: '📋', title: t('课后作业', 'Homework'), desc: t('布置课后练习任务（开发中）', 'Assign homework exercises (coming soon)'), href: '/dashboard/workouts' },
    ...(userRole === 'ADMIN' || userRole === 'TRAINER' ? [
      { icon: '👥', title: t('学员管理', 'Clients'), desc: t('查看学员列表和课程记录', 'Manage client profiles and history'), href: '/dashboard/clients' }
    ] : []),
    { icon: '👤', title: t('我的主页', 'My Profile'), desc: t('查看个人信息', 'View your profile'), href: '/dashboard/profile' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>MyPilatesPro</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', opacity: 0.9 }}>{user.user_metadata?.name || user.email}</span>
          <button onClick={handleLogout} style={{ padding: '7px 14px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            {t('退出', 'Logout')}
          </button>
        </div>
      </header>

      <main style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', marginBottom: '20px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {t('角色', 'Role')}: <strong style={{ color: '#9B7DB5' }}>{userRole}</strong>
            <span style={{ margin: '0 12px', color: '#ddd' }}>|</span>
            {user.email}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {cards.map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #eee', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(155,125,181,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{card.icon}</div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#333' }}>{card.title}</h3>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#888' }}>{card.desc}</p>
                <span style={{ color: '#9B7DB5', fontSize: '13px', fontWeight: 'bold' }}>{t('进入', 'Open')} →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
