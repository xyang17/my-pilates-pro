'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Exercise {
  id: string
  name_en: string
  name_cn: string
  type_en?: string
  type_cn?: string
  series_cn?: string
  series_en?: string
  difficulty_en?: string
  difficulty_cn?: string
  target_muscles_en?: string
  target_muscles_cn?: string
  featured_image_url?: string
  default_sets?: number
  default_reps?: number
  created_at: string
}

const DIFF_COLOR: Record<string, string> = {
  Beginner: '#82E0AA', Intermediate: '#F7DC6F', Advanced: '#F1948A',
  '初级': '#82E0AA', '中级': '#F7DC6F', '高级': '#F1948A',
}
const DIFF_TEXT: Record<string, string> = {
  Beginner: '#1E8449', Intermediate: '#9A7D0A', Advanced: '#922B21',
  '初级': '#1E8449', '中级': '#9A7D0A', '高级': '#922B21',
}

export default function ExercisesPage() {
  const { user, loading } = useAuth()
  const { lang, t } = useLang()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('__all__')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterMuscle, setFilterMuscle] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (user) fetchExercises()
  }, [user, loading])

  const fetchExercises = async () => {
    try {
      const res = await fetch('/api/exercises', { headers: { 'x-user-id': user?.id || '' } })
      if (res.ok) setExercises(await res.json())
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t(`确认删除「${name}」？此操作不可撤销。`, `Delete "${name}"? This cannot be undone.`))) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/exercises/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        setExercises(prev => prev.filter(ex => ex.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const exName = (ex: Exercise) => lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)
  const exNameSub = (ex: Exercise) => lang === 'zh' ? ex.name_en : ex.name_cn
  const exDiff = (ex: Exercise) => lang === 'zh' ? (ex.difficulty_cn || ex.difficulty_en || '') : (ex.difficulty_en || ex.difficulty_cn || '')
  const exMuscles = (ex: Exercise) => lang === 'zh' ? (ex.target_muscles_cn || ex.target_muscles_en || '') : (ex.target_muscles_en || ex.target_muscles_cn || '')
  const exSeries = (ex: Exercise) => lang === 'zh' ? (ex.series_cn || ex.series_en || '') : (ex.series_en || ex.series_cn || '')

  const catKey = (ex: Exercise) => ex.type_en || ex.type_cn || '__other__'
  const catLabel = (ex: Exercise) => {
    if (!ex.type_en && !ex.type_cn) return t('其他', 'Other')
    return lang === 'zh' ? (ex.type_cn || ex.type_en || '') : (ex.type_en || ex.type_cn || '')
  }

  const categories = Array.from(new Map(
    exercises.map(ex => [catKey(ex), catLabel(ex)])
  ).entries()).sort((a, b) => a[1].localeCompare(b[1]))

  // Difficulty options sorted by level
  const difficultyOrder: Record<string, number> = { '初级': 0, 'Beginner': 0, '中级': 1, 'Intermediate': 1, '高级': 2, 'Advanced': 2 }
  const allDifficulties = Array.from(new Set(exercises.flatMap(ex => [ex.difficulty_cn, ex.difficulty_en].filter(Boolean) as string[])))
    .sort((a, b) => (difficultyOrder[a] ?? 9) - (difficultyOrder[b] ?? 9))
  // Show only zh or en depending on lang
  const difficultyOptions = lang === 'zh'
    ? Array.from(new Set(exercises.map(ex => ex.difficulty_cn).filter(Boolean) as string[])).sort((a, b) => (difficultyOrder[a] ?? 9) - (difficultyOrder[b] ?? 9))
    : Array.from(new Set(exercises.map(ex => ex.difficulty_en).filter(Boolean) as string[])).sort((a, b) => (difficultyOrder[a] ?? 9) - (difficultyOrder[b] ?? 9))

  // Muscle options split by comma, lang-aware
  const muscleOptions = Array.from(new Set(
    exercises.flatMap(ex => {
      const src = lang === 'zh' ? (ex.target_muscles_cn || ex.target_muscles_en || '') : (ex.target_muscles_en || ex.target_muscles_cn || '')
      return src.split(',').map((s: string) => s.trim()).filter(Boolean)
    })
  )).sort()

  const filtered = exercises.filter(ex => {
    const matchSearch = !searchTerm ||
      (ex.name_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.name_cn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.target_muscles_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.target_muscles_cn || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchCat = activeCategory === '__all__' || catKey(ex) === activeCategory

    const matchDiff = !filterDifficulty ||
      ex.difficulty_cn === filterDifficulty || ex.difficulty_en === filterDifficulty

    const matchMuscle = !filterMuscle ||
      (ex.target_muscles_cn || '').split(',').map((s: string) => s.trim()).includes(filterMuscle) ||
      (ex.target_muscles_en || '').split(',').map((s: string) => s.trim()).includes(filterMuscle)

    return matchSearch && matchCat && matchDiff && matchMuscle
  })

  const isGrouped = activeCategory === '__all__' && !searchTerm && !filterDifficulty && !filterMuscle
  const grouped: Record<string, { label: string; items: Exercise[] }> = {}
  if (isGrouped) {
    filtered.forEach(ex => {
      const key = catKey(ex)
      const label = catLabel(ex)
      if (!grouped[key]) grouped[key] = { label, items: [] }
      grouped[key].items.push(ex)
    })
  }

  if (loading || isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-3)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('动作库', 'Exercise Library')}</h1>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Link href="/dashboard/exercises/import" style={{
            padding: '7px 14px',
            background: 'var(--c-fill-light)',
            color: 'var(--c-text-secondary)',
            textDecoration: 'none',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--c-border)',
            fontSize: 'var(--text-sm)',
          }}>
            📥 {t('导入', 'Import')}
          </Link>
          <Link href="/dashboard/exercises/new" style={{
            padding: '7px 14px',
            background: 'var(--c-brand)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}>
            + {t('新建', 'New')}
          </Link>
        </div>
      </header>

      <main style={{ padding: 'var(--sp-4)', maxWidth: '800px', margin: '0 auto' }}>
        {/* Search */}
        <input
          type="text"
          placeholder={t('搜索动作名称、目标肌群...', 'Search name or muscles...')}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setActiveCategory('__all__') }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '10px' }}
        />

        {/* Filters row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${filterDifficulty ? 'var(--c-brand)' : '#ddd'}`, fontSize: '13px', backgroundColor: filterDifficulty ? '#f0eaf8' : 'white', color: filterDifficulty ? 'var(--c-brand)' : '#555', cursor: 'pointer' }}
          >
            <option value="">{t('全部难度', 'All Levels')}</option>
            {difficultyOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={filterMuscle}
            onChange={e => setFilterMuscle(e.target.value)}
            style={{ flex: 2, padding: '8px 12px', borderRadius: '8px', border: `1px solid ${filterMuscle ? 'var(--c-brand)' : '#ddd'}`, fontSize: '13px', backgroundColor: filterMuscle ? '#f0eaf8' : 'white', color: filterMuscle ? 'var(--c-brand)' : '#555', cursor: 'pointer' }}
          >
            <option value="">{t('全部肌群', 'All Muscles')}</option>
            {muscleOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {(filterDifficulty || filterMuscle) && (
            <button
              onClick={() => { setFilterDifficulty(''); setFilterMuscle('') }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer', background: 'var(--c-card-bg)', color: '#999' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
          <button
            onClick={() => { setActiveCategory('__all__'); setSearchTerm('') }}
            style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, backgroundColor: activeCategory === '__all__' ? 'var(--c-brand)' : 'white', color: activeCategory === '__all__' ? 'white' : '#666', fontWeight: activeCategory === '__all__' ? 'bold' : 'normal' }}
          >
            {t('全部', 'All')} ({exercises.length})
          </button>
          {categories.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setSearchTerm('') }}
              style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, backgroundColor: activeCategory === key ? 'var(--c-brand)' : 'white', color: activeCategory === key ? 'white' : '#666', fontWeight: activeCategory === key ? 'bold' : 'normal' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#999' }}>
            {exercises.length === 0 ? (
              <>
                <p style={{ marginBottom: '12px' }}>{t('暂无动作，点击新建或从 Excel 导入', 'No exercises yet. Create one or import from Excel.')}</p>
                <Link href="/dashboard/exercises/new" style={{ color: 'var(--c-brand)', fontWeight: 'bold' }}>+ {t('新建第一个动作', 'Create First Exercise')} →</Link>
              </>
            ) : t('没有匹配的动作', 'No matching exercises')}
          </div>
        ) : isGrouped ? (
          Object.entries(grouped).map(([key, { label, items }]) => (
            <div key={key} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '14px', color: 'var(--c-brand)', fontWeight: 'bold' }}>{label}</h2>
                <span style={{ fontSize: '12px', color: '#bbb' }}>{items.length} {t('个', '')}</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e8dff5' }} />
              </div>
              <ExerciseRows items={items} exName={exName} exNameSub={exNameSub} exDiff={exDiff} exMuscles={exMuscles} exSeries={exSeries} onDelete={handleDelete} deletingId={deletingId} />
            </div>
          ))
        ) : (
          <ExerciseRows items={filtered} exName={exName} exNameSub={exNameSub} exDiff={exDiff} exMuscles={exMuscles} exSeries={exSeries} onDelete={handleDelete} deletingId={deletingId} />
        )}
      </main>
    </div>
  )
}

function ExerciseRows({ items, exName, exNameSub, exDiff, exMuscles, exSeries, onDelete, deletingId }: {
  items: Exercise[]
  exName: (ex: Exercise) => string
  exNameSub: (ex: Exercise) => string
  exDiff: (ex: Exercise) => string
  exMuscles: (ex: Exercise) => string
  exSeries: (ex: Exercise) => string
  onDelete?: (id: string, name: string) => void
  deletingId?: string | null
}) {
  return (
    <div style={{ background: 'var(--c-card-bg)', borderRadius: '10px', overflow: 'hidden' }}>
      {items.map((ex, idx) => {
        const diff = exDiff(ex)
        const isDeleting = deletingId === ex.id
        return (
          <div key={ex.id} style={{ display: 'flex', alignItems: 'center', borderBottom: idx < items.length - 1 ? '1px solid #f5f5f5' : 'none', opacity: isDeleting ? 0.4 : 1 }}>
            <Link href={`/dashboard/exercises/${ex.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'var(--c-fill-light)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ex.featured_image_url
                    ? <img src={ex.featured_image_url} alt={ex.name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '22px' }}>🏋️</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                      {exName(ex)}
                    </p>
                    {exSeries(ex) && (
                      <span style={{ flexShrink: 0, fontSize: '10px', padding: '1px 7px', borderRadius: '10px', background: '#EDE6F4', color: '#7B5EA7', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {exSeries(ex)}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exNameSub(ex)}{exMuscles(ex) && ` · ${exMuscles(ex)}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                  {diff && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: DIFF_COLOR[diff] || '#eee', color: DIFF_TEXT[diff] || '#666' }}>
                      {diff}
                    </span>
                  )}
                  {ex.default_sets && ex.default_reps && (
                    <span style={{ fontSize: '11px', color: '#bbb' }}>{ex.default_sets}×{ex.default_reps}</span>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--c-brand)' }}>→</span>
                </div>
              </div>
            </Link>
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(ex.id, exName(ex)) }}
                disabled={isDeleting}
                title="删除动作"
                style={{
                  flexShrink: 0,
                  width: '32px',
                  height: '32px',
                  marginRight: '10px',
                  border: 'none',
                  borderRadius: '50%',
                  background: 'transparent',
                  color: '#ccc',
                  fontSize: '15px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#ccc' }}
              >
                {isDeleting ? '…' : '✕'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
