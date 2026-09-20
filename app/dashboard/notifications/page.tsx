'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// 站内消息。教练和学员收到的是完全分开的两套：
//   教练：self_practice（学员练完自我练习）、period_forecast（学员预计生理期前一周）
//   学员：homework_assigned（新作业）、class_scheduled（新课）、class_updated（课程改期）
// 收件人角色由 lib/notifications 在写入时强制校验，发错角色会被拒绝。

interface Notice {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  related_user_id?: string | null
  read_at?: string | null
  created_at: string
}

// 教练收到的和学员收到的是两套消息类型，互不混用（lib/notifications 里按角色强制校验）
const TYPE_STYLE: Record<string, { icon: string; color: string }> = {
  // → 教练
  self_practice:     { icon: '🏃', color: '#66BB6A' },
  period_forecast:   { icon: '🌙', color: '#C2AFCC' },
  // → 学员
  homework_assigned: { icon: '📋', color: '#9880B8' },
  class_scheduled:   { icon: '📅', color: '#64B5F6' },
  class_updated:     { icon: '🔄', color: '#FFB74D' },
}

function timeAgo(iso: string) {
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h} 小时前`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function NotificationsPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const [list, setList] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'
  const headers = { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) load()
  }, [user, authLoading])

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', { headers })
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()
      setList(data.notifications || [])
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers })
      setList(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    } finally {
      setBusy(false)
    }
  }

  const openOne = async (n: Notice) => {
    if (!n.read_at) {
      // 先跳转不等接口，标已读失败也无所谓，下次进来还能再标
      fetch(`/api/notifications/${n.id}`, { method: 'PATCH', headers }).catch(() => {})
      setList(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    }
    if (n.link) router.push(n.link)
  }

  const removeOne = async (id: string) => {
    setList(prev => prev.filter(n => n.id !== id))
    fetch(`/api/notifications/${id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  const unread = list.filter(n => !n.read_at).length

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center',
        gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          消息{unread > 0 && <span style={{ color: 'var(--c-brand)', fontSize: 13, marginLeft: 6 }}>{unread} 条未读</span>}
        </h1>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={busy}
            style={{ background: 'none', border: 'none', color: 'var(--c-brand)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
            全部已读
          </button>
        )}
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 640, margin: '0 auto' }}>
        {error && (
          <div style={{ background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: '#8C4A4A', padding: '12px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {list.length === 0 ? (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ margin: '0 0 6px', color: 'var(--c-text-secondary)', fontSize: 15 }}>暂时没有消息</p>
            <p style={{ margin: 0, color: '#bbb', fontSize: 12, lineHeight: 1.7 }}>
              {isTrainer
                ? '学员练完自我练习、或者快到预计生理期时，这里会收到提醒'
                : '教练给你布置作业、排课或改课程时间时，这里会收到提醒'}
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {list.map((n, i) => {
              const st = TYPE_STYLE[n.type] || { icon: '🔔', color: 'var(--c-lavender)' }
              const isUnread = !n.read_at
              return (
                <div key={n.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < list.length - 1 ? '1px solid var(--c-border)' : 'none',
                  background: isUnread ? 'var(--c-fill-light)' : 'transparent',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {st.icon}
                  </div>

                  <div
                    onClick={() => openOne(n)}
                    style={{ flex: 1, minWidth: 0, cursor: n.link ? 'pointer' : 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <p style={{
                        margin: 0, fontSize: 14, color: 'var(--c-text-primary)',
                        fontWeight: isUnread ? 700 : 500,
                      }}>
                        {n.title}
                      </p>
                      {isUnread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--c-brand)', flexShrink: 0 }} />}
                    </div>
                    {n.body && (
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--c-text-secondary)', lineHeight: 1.6 }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>
                      {timeAgo(n.created_at)}
                      {n.link && <span style={{ color: 'var(--c-brand)', marginLeft: 8 }}>查看 ›</span>}
                    </p>
                  </div>

                  <button onClick={() => removeOne(n.id)} title="删除"
                    style={{
                      width: 26, height: 26, border: 'none', borderRadius: '50%', flexShrink: 0,
                      background: 'transparent', color: '#ccc', fontSize: 13, cursor: 'pointer',
                    }}>
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
