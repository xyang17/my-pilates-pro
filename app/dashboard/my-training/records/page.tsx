'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PersonalWorkout, WorkoutType, TYPE_META, exerciseSummary } from '@/components/personal-workout/types'

// 教练自己的训练记录列表（按月分组，日期倒序）

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

export default function MyTrainingRecordsPage() {
  const { user, userRole } = useAuth()
  const { lang, t } = useLang()
  const [list, setList] = useState<PersonalWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<WorkoutType | ''>('')

  useEffect(() => {
    if (!user) return
    fetch('/api/personal-workouts', { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(async r => {
        const d = await r.json().catch(() => [])
        if (!r.ok) throw new Error(d.error || '加载失败')
        setList(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [user, userRole])

  const groups = useMemo(() => {
    const shown = filter ? list.filter(w => w.type === filter) : list
    const m = new Map<string, PersonalWorkout[]>()
    for (const w of shown) {
      const k = w.date.slice(0, 7)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(w)
    }
    return [...m.entries()]
  }, [list, filter])

  const fmtMonth = (ym: string) => {
    const [y, mo] = ym.split('-').map(Number)
    return lang === 'zh' ? `${y}年${mo}月` : `${y}-${String(mo).padStart(2, '0')}`
  }
  const fmtDay = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return lang === 'zh'
      ? `${dt.getMonth() + 1}月${dt.getDate()}日 周${WEEKDAY_ZH[dt.getDay()]}`
      : dt.toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center',
        gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← {t('返回', 'Back')}</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {t('训练记录', 'My workouts')}
        </h1>
        <Link href="/dashboard/my-training/records/new"
          style={{ background: 'var(--c-brand)', color: 'white', padding: '7px 14px', borderRadius: 18, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          ＋ {t('记一次', 'Log')}
        </Link>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 640, margin: '0 auto' }}>
        {list.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {(['', 'strength', 'pilates', 'other'] as const).map(k => {
              const on = filter === k
              const label = k === '' ? t('全部', 'All') : (lang === 'zh' ? TYPE_META[k].zh : TYPE_META[k].en)
              return (
                <button key={k || 'all'} onClick={() => setFilter(k)}
                  style={{
                    padding: '5px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--c-brand)' : 'var(--c-border)'}`,
                    background: on ? 'var(--c-brand)' : 'var(--c-card-bg)', color: on ? 'white' : 'var(--c-text-secondary)',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: '#8C4A4A', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', padding: 40 }}>{t('加载中…', 'Loading…')}</p>
        ) : list.length === 0 && !error ? (
          <div style={{ ...card, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
            <p style={{ margin: '0 0 6px', color: 'var(--c-text-secondary)', fontSize: 15 }}>{t('还没有训练记录', 'No workouts yet')}</p>
            <p style={{ margin: '0 0 18px', color: '#bbb', fontSize: 12, lineHeight: 1.7 }}>
              {t('力量、普拉提，练完都记一笔。这些只有你自己能看到，不会算进课时统计。', 'Log your own training. Only you can see it; it never counts toward class stats.')}
            </p>
            <Link href="/dashboard/my-training/records/new"
              style={{ background: 'var(--c-brand)', color: 'white', padding: '10px 22px', borderRadius: 20, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              {t('记第一次', 'Log your first')}
            </Link>
          </div>
        ) : groups.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, padding: 30 }}>{t('这个类型还没有记录', 'Nothing of this type yet')}</p>
        ) : (
          groups.map(([ym, items]) => (
            <section key={ym} style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 13, color: 'var(--c-text-secondary)', fontWeight: 600, margin: '0 0 8px 4px' }}>
                {fmtMonth(ym)} <span style={{ fontWeight: 400 }}>· {items.length} {t('次', '')}</span>
              </h2>
              <div style={{ ...card, overflow: 'hidden' }}>
                {items.map((w, i) => {
                  const meta = TYPE_META[w.type] || TYPE_META.other
                  const exNames = w.exercises.slice(0, 3).map(e => {
                    const sm = exerciseSummary(e, lang)
                    return sm ? `${e.name} ${sm}` : e.name
                  })
                  return (
                    <Link key={w.id} href={`/dashboard/my-training/records/${w.id}`}
                      style={{ display: 'block', padding: '12px 14px', textDecoration: 'none', borderBottom: i < items.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: meta.bg, color: meta.color, fontWeight: 600 }}>
                          {lang === 'zh' ? meta.zh : meta.en}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.title || (lang === 'zh' ? `${meta.zh}训练` : `${meta.en} workout`)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--c-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDay(w.date)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', lineHeight: 1.6 }}>
                        {[
                          w.duration_min ? (lang === 'zh' ? `${w.duration_min} 分钟` : `${w.duration_min} min`) : null,
                          w.exercises.length ? (lang === 'zh' ? `${w.exercises.length} 个动作` : `${w.exercises.length} exercises`) : null,
                        ].filter(Boolean).join(' · ')}
                        {exNames.length > 0 && (
                          <div style={{ color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {exNames.join('，')}{w.exercises.length > 3 ? ' …' : ''}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
