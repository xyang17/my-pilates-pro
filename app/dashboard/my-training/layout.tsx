'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// 「我的训练」整个板块只给教练/管理员。学员的自我练习走另一套（class 表 self_practice），
// 学员端一个像素都不变——学员直接输网址进来也会被送回首页。
// 接口那边（/api/personal-workouts）也会从数据库查角色再拒一次，这里只是界面上的门。
export default function MyTrainingLayout({ children }: { children: React.ReactNode }) {
  const { userRole, loading } = useAuth()
  const router = useRouter()
  const allowed = userRole === 'TRAINER' || userRole === 'ADMIN'

  useEffect(() => {
    if (!loading && !allowed) router.replace('/dashboard')
  }, [loading, allowed, router])

  if (loading || !allowed) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  return <>{children}</>
}
