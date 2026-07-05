'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClassItem {
  id: string
  name: string
  date: string
  duration: number
  type: string
  discipline?: string
  status: 'planned' | 'in_progress' | 'completed'
  created_by: string
  assigned_to: string | null
  created_at: string
}

// 单色紫系状态配置
const STATUS_CONFIG: Record<string, { bar: string; bg: string; color: string; border: string; label: string; dot: string }> = {
  planned:     { bar: '#C2AFCC', bg: '#EDE6F4', color: '#9888B0', border: '1px solid #C2AFCC', label: '未开始', dot: '○' },
  in_progress: { bar: '#9880B8', bg: '#C2AFCC', color: '#fff',    border: '1px solid #9880B8', label: '进行中', dot: '●' },
  completed:   { bar: '#9880B8', bg: '#EDE6F4', color: '#5A4878', border: '1.5px solid #9880B8', label: '已完成', dot: '✓' },
}

export default function ClassesPage() {
  const { user, userRole, loading } = useAuth()
  const { t, lang } = useLang()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (user && userRole) fetchClasses()
  }, [user, userRole, loading])

  const fetchClasses = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/classes', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (!res.ok) throw new Error('获取课程失败')
      setClasses(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClass = async (cls: ClassItem) => {
    if (!window.confirm(`确定删除课程「${cls.name}」？此操作无法撤销。`)) return
    setDeletingId(cls.id)
    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClasses(prev => prev.filter(c => c.id !== cls.id))
      else {
        const d = await res.json().catch(() => ({}))
        alert(d.error || '删除失败')
      }
    } catch {
      alert('网络错误，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const S = (s: string) => STATUS_CONFIG[s] || STATUS_CONFIG.planned

  if (loading || isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--c-fill-mid)', borderTopColor: 'var(--c-brand)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          课程训练
        </h1>
        <Link href="/dashboard/classes/new" style={{
          padding: '7px 16px',
          background: 'var(--c-brand)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 'var(--r-sm)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}>
          + 新建
        </Link>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 720, margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'var(--c-error-bg)',
            border: '1px solid var(--c-error)',
            color: '#8C4A4A',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--r-sm)',
            marginBottom: 'var(--sp-4)',
            fontSize: 'var(--text-sm)',
          }}>{error}</div>
        )}

        {classes.length === 0 ? (
          <div style={{
            background: 'var(--c-card-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-10)',
            textAlign: 'center',
          }}>
            <p style={{ color: 'var(--c-text-hint)', marginBottom: 'var(--sp-4)', fontSize: 'var(--text-base)' }}>
              暂无课程
            </p>
            <Link href="/dashboard/classes/new" style={{ color: 'var(--c-brand)', fontWeight: 500, textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
              新建第一节课 →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
            {classes.map(cls => {
              const cfg = S(cls.status)
              const isDeleting = deletingId === cls.id
              return (
                <div key={cls.id} style={{ position: 'relative' }}>
                  <div
                    onClick={() => router.push(`/dashboard/classes/${cls.id}`)}
                    style={{
                      background: 'var(--c-card-bg)',
                      border: '1px solid var(--c-border)',
                      borderRadius: 'var(--r-lg)',
                      padding: 'var(--sp-4) var(--sp-5)',
                      paddingRight: isTrainer ? '68px' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-4)',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
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
                    {/* 状态色条 */}
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: cfg.bar, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 var(--sp-1)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cls.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
                        {new Date(cls.date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        {' · '}{cls.duration} 分钟
                        {cls.discipline && ` · ${cls.discipline}`}
                      </p>
                    </div>

                    {/* 状态标签 */}
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      padding: '3px 10px',
                      borderRadius: 'var(--r-full)',
                      background: cfg.bg,
                      color: cfg.color,
                      border: cfg.border,
                      fontWeight: 500,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}>
                      <span>{cfg.dot}</span>{cfg.label}
                    </span>

                    {!isTrainer && <span style={{ color: 'var(--c-text-hint)', fontSize: 'var(--text-base)', flexShrink: 0 }}>›</span>}
                  </div>

                  {/* Delete button — trainer only, absolute positioned */}
                  {isTrainer && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteClass(cls) }}
                      disabled={isDeleting}
                      title="删除课程"
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        width: 30, height: 30, border: 'none', borderRadius: '50%',
                        background: 'transparent', color: '#ccc',
                        fontSize: 15, cursor: isDeleting ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s, color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}
                    >
                      {isDeleting ? '…' : '✕'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
