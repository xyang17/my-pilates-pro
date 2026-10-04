'use client'

import { useAuth } from '@/context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Play, NotebookPen, Activity, Moon, ChevronRight, Plus } from 'lucide-react'
import { PersonalWorkout, TYPE_META, WorkoutType, localToday } from '@/components/personal-workout/types'

// 「我的训练」板块首页（教练专用，外层 my-training/layout.tsx 拦学员）
// 见 docs/交接-导航重构与个人训练.md 3.3：
//   开始练 → 计时器（教练练完会记进个人训练记录）
//   本周 / 本月练了几次，按类型分
//   训练记录 / 身体数据（自己的体测）/ 生理周期（教练端新增入口；「我的主页」那份保留不动）

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))

function countByType(list: PersonalWorkout[]) {
  const c: Record<WorkoutType, number> = { strength: 0, pilates: 0, other: 0 }
  for (const w of list) c[w.type] = (c[w.type] || 0) + 1
  return c
}

function Breakdown({ list }: { list: PersonalWorkout[] }) {
  const c = countByType(list)
  const parts = (Object.keys(TYPE_META) as WorkoutType[]).filter(k => c[k] > 0)
  if (parts.length === 0) return <span style={{ color: 'var(--c-text-hint)' }}>还没练</span>
  return (
    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
      {parts.map(k => (
        <span key={k} style={{ fontSize: 12, padding: '1px 8px', borderRadius: 8, background: TYPE_META[k].bg, color: TYPE_META[k].color, fontWeight: 600 }}>
          {TYPE_META[k].zh} {c[k]}
        </span>
      ))}
    </span>
  )
}

function Row({ href, icon: Icon, label, hint, last }: {
  href: string; icon: React.ElementType; label: string; hint?: string; last?: boolean
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', textDecoration: 'none',
      borderBottom: last ? 'none' : '1px solid var(--c-border)',
    }}>
      <Icon size={18} color="var(--c-brand)" />
      <span style={{ flex: 1, fontSize: 15, color: 'var(--c-text-primary)', fontWeight: 500 }}>{label}</span>
      {hint && <span style={{ fontSize: 12, color: 'var(--c-text-hint)' }}>{hint}</span>}
      <ChevronRight size={16} color="var(--c-text-hint)" />
    </Link>
  )
}

export default function MyTrainingPage() {
  const { user, userRole } = useAuth()
  const [list, setList] = useState<PersonalWorkout[] | null>(null)

  const today = useMemo(localToday, [])
  const weekStart = mondayOf(today)
  const monthStart = today.slice(0, 7) + '-01'
  const from = weekStart < monthStart ? weekStart : monthStart

  useEffect(() => {
    if (!user) return
    fetch(`/api/personal-workouts?from=${from}`, { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(r => (r.ok ? r.json() : []))
      .then(setList)
      .catch(() => setList([]))
  }, [user, userRole, from])

  const week = (list || []).filter(w => w.date >= weekStart && w.date <= today)
  const month = (list || []).filter(w => w.date >= monthStart && w.date <= today)
  const last = (list || [])[0]

  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 14 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <main style={{ padding: '20px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 4px' }}>我的训练</h1>
        <p style={{ fontSize: 12, color: 'var(--c-text-hint)', margin: '0 0 16px' }}>只有你自己能看到，不算进课时统计</p>

        {/* 开始练 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10, marginBottom: 12 }}>
          <Link href="/dashboard/timer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '18px 12px',
            borderRadius: 14, background: 'var(--c-brand)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700,
          }}>
            <Play size={18} fill="#fff" /> 开始练
          </Link>
          <Link href="/dashboard/my-training/records/new" style={{
            ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '18px 12px',
            color: 'var(--c-brand)', textDecoration: 'none', fontSize: 15, fontWeight: 600,
          }}>
            <Plus size={16} /> 补记一次
          </Link>
        </div>

        {/* 频次 */}
        <div style={{ ...card, padding: '14px 16px', marginBottom: 12 }}>
          {list === null ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-hint)' }}>加载中…</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', width: 34 }}>本周</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text-primary)', width: 56 }}>{week.length}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>次</span></span>
                <Breakdown list={week} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--c-text-secondary)', width: 34 }}>本月</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text-primary)', width: 56 }}>{month.length}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>次</span></span>
                <Breakdown list={month} />
              </div>
            </>
          )}
        </div>

        <div style={{ ...card, overflow: 'hidden' }}>
          <Row href="/dashboard/my-training/records" icon={NotebookPen} label="训练记录"
            hint={last ? `上次 ${Number(last.date.slice(5, 7))}/${Number(last.date.slice(8, 10))}` : undefined} />
          <Row href={user ? `/dashboard/assessments/${user.id}` : '/dashboard'} icon={Activity} label="身体数据" />
          <Row href="/dashboard/my-training/cycle" icon={Moon} label="生理周期" last />
        </div>
      </main>
    </div>
  )
}
