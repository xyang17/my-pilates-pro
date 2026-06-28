'use client'

import { useLang } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const TRAINER_NAV = [
  { href: '/dashboard/calendar', icon: '📅', zh: '课表', en: 'Schedule', matchPaths: ['/dashboard/calendar', '/dashboard/schedule', '/dashboard/classes'] },
  { href: '/dashboard/clients', icon: '👥', zh: '学员', en: 'Clients', matchPaths: ['/dashboard/clients'] },
  { href: '/dashboard/exercises', icon: '💪', zh: '动作库', en: 'Exercises', matchPaths: ['/dashboard/exercises'] },
  { href: '/dashboard/workouts', icon: '📋', zh: '作业', en: 'Homework', matchPaths: ['/dashboard/workouts'] },
  { href: '/dashboard/profile', icon: '👤', zh: '我的', en: 'Profile', matchPaths: ['/dashboard/profile'] },
]

const CLIENT_NAV = [
  { href: '/dashboard/calendar', icon: '📅', zh: '我的课程', en: 'My Classes', matchPaths: ['/dashboard/calendar', '/dashboard/schedule', '/dashboard/classes'] },
  { href: '/dashboard/workouts', icon: '📋', zh: '我的作业', en: 'My Homework', matchPaths: ['/dashboard/workouts'] },
  { href: '/dashboard/exercises', icon: '💪', zh: '动作库', en: 'Exercises', matchPaths: ['/dashboard/exercises'] },
  { href: '/dashboard/profile', icon: '👤', zh: '我的', en: 'Profile', matchPaths: ['/dashboard/profile'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useLang()
  const { userRole } = useAuth()
  const pathname = usePathname()

  const isClient = userRole === 'CLIENT'
  const navItems = isClient ? CLIENT_NAV : TRAINER_NAV

  return (
    <>
      {/* Page content — bottom padding accounts for nav + iOS safe area */}
      <div style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </div>

      {/* Bottom navigation bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--c-card-bg)',
        borderTop: '1px solid var(--c-border)',
        display: 'flex',
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -2px 8px rgba(152,128,184,0.08)',
      }}>
        {navItems.map(item => {
          const isActive = item.matchPaths.some(p => pathname.startsWith(p))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                height: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                textDecoration: 'none',
                color: isActive ? 'var(--c-brand)' : 'var(--c-text-hint)',
                borderTop: `2px solid ${isActive ? 'var(--c-brand)' : 'transparent'}`,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 400 }}>
                {lang === 'zh' ? item.zh : item.en}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
