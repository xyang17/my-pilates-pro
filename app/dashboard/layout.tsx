'use client'

import { useAuth } from '@/context/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Calendar,
  Dumbbell,
  Users,
  ClipboardList,
  Activity,
  BookOpen,
  Trophy,
  Ticket,
  User,
  LogOut,
  Home,
} from 'lucide-react'

interface NavGroup {
  label?: string
  items: { label: string; href: string; icon: React.ElementType }[]
}

const trainerNav: NavGroup[] = [
  {
    items: [
      { label: '今日概览', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: '教学',
    items: [
      { label: '课程日历',  href: '/dashboard/calendar',    icon: Calendar },
      { label: '课程训练',  href: '/dashboard/classes',     icon: Dumbbell },
      { label: '学员管理',  href: '/dashboard/clients',     icon: Users },
      { label: '身体测试',  href: '/dashboard/assessments', icon: Activity },
    ],
  },
  {
    label: '内容',
    items: [
      { label: '动作库',   href: '/dashboard/exercises',  icon: BookOpen },
      { label: '我的计划', href: '/dashboard/plans',      icon: ClipboardList },
      { label: '训练方案', href: '/dashboard/programs',   icon: Trophy },
      { label: '课后作业', href: '/dashboard/workouts',   icon: ClipboardList },
    ],
  },
]

const clientNav: NavGroup[] = [
  {
    items: [
      { label: '首页',     href: '/dashboard',           icon: Home },
      { label: '我的课程', href: '/dashboard/classes',   icon: Dumbbell },
      { label: '训练方案', href: '/dashboard/programs',  icon: Trophy },
      { label: '我的主页', href: '/dashboard/profile',   icon: User },
    ],
  },
]

const trainerTabs = [
  { label: '首页',  href: '/dashboard',          icon: LayoutDashboard },
  { label: '课程',  href: '/dashboard/calendar', icon: Calendar },
  { label: '学员',  href: '/dashboard/clients',  icon: Users },
  { label: '计划',  href: '/dashboard/plans',    icon: ClipboardList },
  { label: '我的',  href: '/dashboard/profile',  icon: User },
]

const clientTabs = [
  { label: '首页',  href: '/dashboard',          icon: Home },
  { label: '课程',  href: '/dashboard/classes',  icon: Dumbbell },
  { label: '方案',  href: '/dashboard/programs', icon: Trophy },
  { label: '我的',  href: '/dashboard/profile',  icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--c-text-secondary)' }}>
      加载中…
    </div>
  )
  if (!user) return null

  const isTrainer = userRole === 'TRAINER' || userRole === 'ADMIN'
  const navGroups = isTrainer ? trainerNav : clientNav
  const tabs = isTrainer ? trainerTabs : clientTabs
  const displayName = user.user_metadata?.name || user.email || ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <SidebarProvider>
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar className="hidden md:flex">
        <SidebarHeader className="px-5 py-4 border-b border-sidebar-border">
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>
            MyFitnessPro
          </span>
        </SidebarHeader>

        <SidebarContent className="py-2">
          {navGroups.map((group, gi) => (
            <SidebarGroup key={gi}>
              {group.label && (
                <SidebarGroupLabel style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--c-text-hint)', padding: '8px 16px 2px' }}>
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link
                        href={item.href}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 12px', borderRadius: 8, margin: '1px 4px',
                          fontSize: 13, fontWeight: active ? 600 : 400,
                          color: active ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                          background: active ? 'var(--c-fill-light)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuItem>
                  )
                })}
                {/* 邀请码 — ADMIN only */}
                {gi === navGroups.length - 1 && userRole === 'ADMIN' && (() => {
                  const active = isActive('/dashboard/invite-codes')
                  return (
                    <SidebarMenuItem>
                      <Link
                        href="/dashboard/invite-codes"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 12px', borderRadius: 8, margin: '1px 4px',
                          fontSize: 13, fontWeight: active ? 600 : 400,
                          color: active ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                          background: active ? 'var(--c-fill-light)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        <Ticket size={15} />
                        <span>邀请码</span>
                      </Link>
                    </SidebarMenuItem>
                  )
                })()}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="px-4 py-3 border-t border-sidebar-border">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/dashboard/profile">
              <Avatar style={{ width: 30, height: 30, cursor: 'pointer' }}>
                <AvatarFallback style={{ background: 'var(--c-fill-mid)', color: 'var(--c-brand)', fontSize: 11, fontWeight: 600 }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {displayName}
              </p>
              <p style={{ fontSize: 11, color: 'var(--c-text-hint)', margin: 0 }}>{userRole}</p>
            </div>
            <button
              onClick={handleLogout}
              title="退出"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-hint)', padding: 4, display: 'flex' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main content */}
      <SidebarInset style={{ flex: 1, minHeight: '100vh', background: 'var(--c-page-bg)', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        className="md:pb-0">
        {children}
      </SidebarInset>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
          background: 'var(--c-card-bg)',
          borderTop: '1px solid var(--c-border)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -2px 8px rgba(152,128,184,0.08)',
        }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                flex: 1, height: 60,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, textDecoration: 'none',
                color: active ? 'var(--c-brand)' : 'var(--c-text-hint)',
                borderTop: `2px solid ${active ? 'var(--c-brand)' : 'transparent'}`,
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </SidebarProvider>
  )
}
