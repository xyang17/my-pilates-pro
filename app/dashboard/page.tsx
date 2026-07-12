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
      { icon: '👥', title: t('学员管理', 'Clients'), desc: t('查看学员列表和课程记录', 'Manage client profiles and history'), href: '/dashboard/clients' },
    ] : []),
    ...(userRole === 'ADMIN' ? [
      { icon: '🔑', title: t('邀请码管理', 'Invite Codes'), desc: t('生成邀请码，邀请教练或学员注册', 'Generate codes to invite trainers & clients'), href: '/dashboard/invite-codes' },
    ] : []),
    { icon: '👤', title: t('我的主页', 'My Profile'), desc: t('查看个人信息', 'View your profile'), href: '/dashboard/profile' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header — 白底，底部细线 */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.2px' }}>
          MyFitnessPro
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
            {user.user_metadata?.name || user.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              background: 'var(--c-fill-light)',
              color: 'var(--c-text-primary)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
            }}
          >
            {t('退出', '退出')}
          </button>
        </div>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 960, margin: '0 auto' }}>
        {/* 角色信息条 */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-md)',
          padding: 'var(--sp-3) var(--sp-5)',
          marginBottom: 'var(--sp-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-3)',
        }}>
          <span style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            background: 'var(--c-fill-light)',
            color: 'var(--c-brand)',
            border: '1px solid var(--c-border-em)',
            borderRadius: 'var(--r-full)',
            padding: '2px 10px',
          }}>
            {userRole}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
            {user.email}
          </span>
        </div>

        {/* 功能卡片网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)' }}>
          {cards.map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--c-card-bg)',
                  padding: 'var(--sp-5)',
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--c-border)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  height: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                  e.currentTarget.style.borderColor = 'var(--c-border-em)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.borderColor = 'var(--c-border)'
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 'var(--sp-3)' }}>{card.icon}</div>
                <h3 style={{ margin: '0 0 var(--sp-1)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
                  {card.title}
                </h3>
                <p style={{ margin: '0 0 var(--sp-4)', fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)', lineHeight: 'var(--leading-normal)' }}>
                  {card.desc}
                </p>
                <span style={{ color: 'var(--c-brand)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                  {t('进入', '进入')} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
