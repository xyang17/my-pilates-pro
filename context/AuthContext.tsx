'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ⚠️ 这里有一条必须守住的规矩：
//
//     onAuthStateChange 的回调里，绝对不能调用任何 supabase 方法。
//
// 原因是 supabase-js 内部用 Web Locks 给认证状态上锁，而这个回调是在「锁还握着」
// 的时候被调用的。如果回调里再去 await 另一个 supabase 查询，那个查询也要拿同一把锁，
// 就会互相死等：
//
//     signInWithPassword 拿到锁
//       → 触发 SIGNED_IN，回调执行（锁未释放）
//         → 回调里 await supabase.from('user')，排队等锁
//           → 死锁，登录请求永远不返回
//
// 表现出来就是登录按钮一直转圈，最后被登录页那个 15 秒兜底超时打断，
// 提示「登录超时，请刷新重试」。手机上更容易触发（网络慢、切后台、
// Safari 对 Web Locks 更严格），多开标签页会加剧，因为锁是跨标签页共享的。
//
// 所以下面拆成两步：
//   1. 回调是同步的，只往 React state 里塞 session，碰都不碰 supabase
//   2. 查角色放在另一个 effect 里，那时锁早就释放了，怎么查都安全

type Role = 'CLIENT' | 'ADMIN' | 'TRAINER'

interface AuthContextType {
  user: User | null
  userRole: Role | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)
  // 分成两个就绪标记：session 确定了、角色也确定了，才算加载完。
  // 不能只等 session——页面拿 userRole 判断权限，角色还没到就放行的话，
  // 教练会被当成学员弹走（比如复盘页的 isTrainer 判断）。
  const [authReady, setAuthReady] = useState(false)
  const [roleReady, setRoleReady] = useState(false)

  // ── 第一步：只管 session ──────────────────────────────────
  useEffect(() => {
    let alive = true

    supabase.auth.getUser()
      .then(({ data }) => { if (alive) setUser(data.user ?? null) })
      .catch(err => {
        console.error('Auth check failed:', err)
        if (alive) setUser(null)
      })
      .finally(() => { if (alive) setAuthReady(true) })

    // 注意：回调不能是 async，里面也不能有任何 supabase 调用（原因见顶部注释）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      alive = false
      subscription?.unsubscribe()
    }
  }, [])

  // ── 第二步：查角色。在回调之外，不会跟 auth 锁打架 ────────
  useEffect(() => {
    if (!authReady) return

    if (!user) {
      setUserRole(null)
      setRoleReady(true)
      return
    }

    let alive = true
    setRoleReady(false)

    ;(async () => {
      try {
        const { data } = await supabase
          .from('user')
          .select('role')
          .eq('id', user.id)
          .single()
        if (alive) setUserRole((data?.role as Role) || 'CLIENT')
      } catch (err) {
        console.error('Failed to fetch user role:', err)
        if (alive) setUserRole('CLIENT')
      } finally {
        if (alive) setRoleReady(true)
      }
    })()

    return () => { alive = false }
  }, [authReady, user?.id])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading: !authReady || !roleReady, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
