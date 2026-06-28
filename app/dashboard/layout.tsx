'use client'

import { useLang } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard/calendar', icon: '📅', zh: '课表', en: 'Schedule', matchPaths: ['/dashboard/calendar', '/dashboard/schedule', '/dashboard/classes'] },
  { href: '/dashboard/clients', icon: '👥', zh: '学员', en: 'Clients', matchPaths: ['/dashboard/clients'], trainerOnly: true },
  { href: '/dashboard/exercises', icon: '💪', zh: '动作库', en: 'Exercises', matchPaths: ['/dashboard/exercises'] },
  { href: '/dashboard/workouts', icon: '📋', zh: '作业', en: 'Homework', matchPaths: ['/dashboard/workouts'] },
  { href: '/dashboard/profile', icon: '👤', zh: '我的', en: 'Profile', matchPaths: ['/dashboard/profile'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()
  const { userRole } = useAuth()
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(item => !item.trainerOnly || userRole === 'ADMIN' || userRole === 'TRAINER')

  return (
    <>
      {/* Page content — bottom padding so nav doesn't cover content */}
      <div style={{ paddingBottom: '64px' }}>
        {children}
      </div>

      {/* Bottom navigation bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        zIndex: 200,
        height: '60px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      }}>
        {visibleItems.map(item => {
          const isActive = item.matchPaths.some(p => pathname.startsWith(p))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                textDecoration: 'none',
                color: isActive ? '#9B7DB5' : '#bbb',
                borderTop: `2px solid ${isActive ? '#9B7DB5' : 'transparent'}`,
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '400' }}>
                {lang === 'zh' ? item.zh : item.en}
              </span>
            </Link>
          )
        })}

        {/* Language toggle — compact slot on the right */}
        <button
          onClick={toggleLang}
          title={lang === 'zh' ? 'Switch to English' : '切换中文'}
          style={{
            width: '48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            border: 'none',
            borderTop: '2px solid transparent',
            backgroundColor: 'white',
            cursor: 'pointer',
            color: '#bbb',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>🌐</span>
          <span style={{ fontSize: '9px', fontWeight: '500' }}>{lang === 'zh' ? 'EN' : '中'}</span>
        </button>
      </nav>
    </>
  )
}
