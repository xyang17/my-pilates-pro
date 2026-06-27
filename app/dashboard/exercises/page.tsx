'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Exercise {
  id: string
  name_en: string
  name_cn: string
  type_en?: string
  type_cn?: string
  difficulty_en?: string
  difficulty_cn?: string
  target_muscles_en?: string
  target_muscles_cn?: string
  featured_image_url?: string
  default_sets?: number
  default_reps?: number
  created_at: string
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: '#82E0AA', Intermediate: '#F7DC6F', Advanced: '#F1948A',
  '初级': '#82E0AA', '中级': '#F7DC6F', '高级': '#F1948A',
}
const DIFFICULTY_TEXT: Record<string, string> = {
  Beginner: '#1E8449', Intermediate: '#9A7D0A', Advanced: '#922B21',
  '初级': '#1E8449', '中级': '#9A7D0A', '高级': '#922B21',
}

export default function ExercisesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('全部 All')

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

  // Build category list from data
  const categories = ['全部 All', ...Array.from(new Set(
    exercises.map(e => e.type_cn ? `${e.type_cn} ${e.type_en || ''}`.trim() : (e.type_en || '其他 Other'))
  )).sort()]

  const filtered = exercises.filter(ex => {
    const matchSearch = !searchTerm ||
      ex.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.name_cn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.target_muscles_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.target_muscles_cn || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchCat = activeCategory === '全部 All' ||
      (`${ex.type_cn || ''} ${ex.type_en || ''}`.trim() === activeCategory) ||
      (!ex.type_cn && !ex.type_en && activeCategory === '其他 Other')

    return matchSearch && matchCat
  })

  // Group by category for display
  const grouped: Record<string, Exercise[]> = {}
  if (activeCategory === '全部 All' && !searchTerm) {
    filtered.forEach(ex => {
      const cat = ex.type_cn ? `${ex.type_cn} ${ex.type_en || ''}`.trim() : '其他 Other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(ex)
    })
  } else {
    grouped['results'] = filtered
  }

  if (loading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>动作库 Exercise Library</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/dashboard/exercises/import" style={{ padding: '7px 14px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '13px' }}>
            📥 导入 Import
          </Link>
          <Link href="/dashboard/exercises/new" style={{ padding: '7px 14px', backgroundColor: 'white', color: '#9B7DB5', textDecoration: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
            + 新建
          </Link>
        </div>
      </header>

      <main style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Search */}
        <input
          type="text"
          placeholder="搜索动作名称、目标肌群... Search name or muscles..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setActiveCategory('全部 All') }}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' }}
        />

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setSearchTerm('') }}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                backgroundColor: activeCategory === cat ? '#9B7DB5' : 'white',
                color: activeCategory === cat ? 'white' : '#666',
                fontWeight: activeCategory === cat ? 'bold' : 'normal',
              }}
            >
              {cat}
              {cat === '全部 All' && ` (${exercises.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#999' }}>
            {exercises.length === 0 ? (
              <>
                <p style={{ marginBottom: '12px' }}>暂无动作，点击新建或从 Excel 导入</p>
                <Link href="/dashboard/exercises/new" style={{ color: '#9B7DB5', fontWeight: 'bold' }}>+ 新建第一个动作 →</Link>
              </>
            ) : '没有匹配的动作'}
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '24px' }}>
              {/* Category header (only in grouped mode) */}
              {activeCategory === '全部 All' && !searchTerm && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '14px', color: '#9B7DB5', fontWeight: 'bold' }}>{cat}</h2>
                  <span style={{ fontSize: '12px', color: '#bbb' }}>{items.length} 个</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#e8dff5' }} />
                </div>
              )}

              {/* Exercise rows */}
              <div style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden' }}>
                {items.map((ex, idx) => (
                  <Link key={ex.id} href={`/dashboard/exercises/${ex.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                      borderBottom: idx < items.length - 1 ? '1px solid #f5f5f5' : 'none',
                    }}>
                      {/* Thumbnail */}
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#f0eaf8', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ex.featured_image_url
                          ? <img src={ex.featured_image_url} alt={ex.name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '22px' }}>🏋️</span>
                        }
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex.name_cn || ex.name_en}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex.name_en}
                          {ex.target_muscles_cn && ` · ${ex.target_muscles_cn}`}
                        </p>
                      </div>

                      {/* Tags */}
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                        {ex.difficulty_cn && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: DIFFICULTY_COLOR[ex.difficulty_cn] || '#eee', color: DIFFICULTY_TEXT[ex.difficulty_cn] || '#666' }}>
                            {ex.difficulty_cn}
                          </span>
                        )}
                        {ex.default_sets && ex.default_reps && (
                          <span style={{ fontSize: '11px', color: '#bbb' }}>{ex.default_sets}×{ex.default_reps}</span>
                        )}
                        <span style={{ fontSize: '12px', color: '#9B7DB5' }}>→</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
