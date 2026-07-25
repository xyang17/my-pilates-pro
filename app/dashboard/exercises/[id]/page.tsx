'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExerciseImage {
  id: string
  image_url: string
  caption?: string
  order: number
}

interface ExerciseNote {
  id: string
  author_id: string
  author_type: string
  author_name: string
  content: string
  created_at: string
}

interface MasterExercise {
  id: string
  name_en: string
  name_cn: string
  description_en?: string
  description_cn?: string
  instructions_en?: string
  instructions_cn?: string
  featured_image_url?: string
  gif_url?: string
  type_en?: string
  type_cn?: string
  difficulty_en?: string
  difficulty_cn?: string
  target_muscles_en?: string
  target_muscles_cn?: string
  equipment_en?: string
  equipment_cn?: string
  default_sets?: number
  default_reps?: number
  default_weight?: number
  default_weight_unit?: string
  default_duration?: number
  default_duration_unit?: string
  created_by: string
  created_at: string
  images?: ExerciseImage[]
  notes?: ExerciseNote[]
}

// 把长段指导语按句子拆成步骤列表
function parseSteps(text: string): string[] {
  if (!text) return []
  // 先尝试按数字序号拆（"1. xxx 2. xxx"）
  const numbered = text.match(/\d+\.\s[^0-9]+/g)
  if (numbered && numbered.length > 1) return numbered.map(s => s.replace(/^\d+\.\s*/, '').trim())
  // 否则按句号/。拆
  return text.split(/[。\.]\s+/).map(s => s.trim()).filter(Boolean)
}

const TAG_STYLE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 20,
  fontSize: 12, fontWeight: 500,
  background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)',
  whiteSpace: 'nowrap',
}

export default function ExerciseDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<MasterExercise | null>(null)
  const [notes, setNotes] = useState<ExerciseNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [lang, setLang] = useState<'cn' | 'en'>('cn')
  const [gifPaused, setGifPaused] = useState(false)

  const isOwner = user && exercise && user.id === exercise.created_by

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchExercise()
  }, [user, authLoading])

  const fetchExercise = async () => {
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setExercise(data)
      setNotes(data.notes || [])
    } catch (err: any) {
      setFetchError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setIsSubmittingNote(true)
    try {
      const res = await fetch(`/api/exercises/${exerciseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-name': user?.user_metadata?.name || user?.email || '匿名',
        },
        body: JSON.stringify({ content: newNote, authorType: 'trainer' }),
      })
      if (!res.ok) throw new Error('添加失败')
      const added = await res.json()
      setNotes(prev => [added, ...prev])
      setNewNote('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmittingNote(false)
    }
  }

  /* ── Loading ── */
  if (authLoading || isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--c-text-hint)' }}>
        加载中…
      </div>
    )
  }

  /* ── Error / Not Found ── */
  if (fetchError || !exercise) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', margin: '0 0 8px' }}>
          找不到该动作
        </p>
        {fetchError && (
          <p style={{ fontSize: 12, color: 'var(--c-text-hint)', margin: '0 0 20px' }}>
            {fetchError}
          </p>
        )}
        <Link href="/dashboard/exercises" style={{ color: 'var(--c-brand)', fontSize: 14, textDecoration: 'none' }}>
          ← 返回动作库
        </Link>
      </div>
    )
  }

  const name    = lang === 'cn' ? (exercise.name_cn || exercise.name_en) : exercise.name_en
  const nameAlt = lang === 'cn' ? exercise.name_en : (exercise.name_cn || '')
  const type    = lang === 'cn' ? exercise.type_cn    : exercise.type_en
  const equip   = lang === 'cn' ? exercise.equipment_cn : exercise.equipment_en
  const muscle  = lang === 'cn' ? exercise.target_muscles_cn : exercise.target_muscles_en
  const diff    = lang === 'cn' ? exercise.difficulty_cn : exercise.difficulty_en
  const descr   = lang === 'cn' ? exercise.description_cn  : exercise.description_en
  const instrRaw = lang === 'cn' ? exercise.instructions_cn : exercise.instructions_en
  const steps   = instrRaw ? parseSteps(instrRaw) : []
  const mediaUrl = exercise.gif_url || exercise.featured_image_url || exercise.images?.[0]?.image_url

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/exercises" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 13, flexShrink: 0 }}>
          ← 动作库
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {/* Language toggle */}
          <div style={{ display: 'flex', background: 'var(--c-fill-light)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['cn', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '3px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                background: lang === l ? 'var(--c-card-bg)' : 'transparent',
                color: lang === l ? 'var(--c-brand)' : 'var(--c-text-hint)',
                fontWeight: lang === l ? 600 : 400,
              }}>
                {l === 'cn' ? '中文' : 'EN'}
              </button>
            ))}
          </div>
          {isOwner && (
            <Link href={`/dashboard/exercises/${exercise.id}/edit`} style={{
              padding: '5px 12px', background: 'var(--c-fill-light)',
              color: 'var(--c-text-secondary)', textDecoration: 'none',
              borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 13,
            }}>
              编辑
            </Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 80px' }}>

        {/* ── Media ── */}
        {mediaUrl ? (
          <div style={{
            background: 'var(--c-fill-light)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: 260, overflow: 'hidden',
            cursor: exercise.gif_url ? 'pointer' : 'default',
          }}
            onClick={() => exercise.gif_url && setGifPaused(p => !p)}
            title={exercise.gif_url ? '点击暂停/播放' : undefined}
          >
            <img
              src={gifPaused && exercise.gif_url ? (exercise.featured_image_url || exercise.images?.[0]?.image_url || mediaUrl) : mediaUrl}
              alt={name}
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div style={{ background: 'var(--c-fill-light)', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>
            暂无图片
          </div>
        )}

        {/* ── Name block ── */}
        <div style={{ padding: '20px var(--sp-5) 0' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--c-text-primary)' }}>
            {name}
          </h2>
          {nameAlt && (
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--c-text-hint)' }}>{nameAlt}</p>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {type   && <span style={TAG_STYLE}>🏷 {type}</span>}
            {equip  && <span style={TAG_STYLE}>🏋️ {equip}</span>}
            {muscle && <span style={TAG_STYLE}>💪 {muscle}</span>}
            {diff   && (
              <span style={{
                ...TAG_STYLE,
                color: diff === '初级' || diff === 'Beginner' ? '#16a34a'
                  : diff === '中级' || diff === 'Intermediate' ? '#d97706' : '#dc2626',
                background: diff === '初级' || diff === 'Beginner' ? '#dcfce7'
                  : diff === '中级' || diff === 'Intermediate' ? '#fef3c7' : '#fee2e2',
              }}>⚡ {diff}</span>
            )}
          </div>
        </div>

        {/* ── Content card ── */}
        <div style={{ margin: '0 var(--sp-5)', background: 'var(--c-card-bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 16 }}>

          {/* Default params */}
          {(exercise.default_sets || exercise.default_reps || exercise.default_weight || exercise.default_duration) && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {exercise.default_sets && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)' }}>{exercise.default_sets}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>组</div>
                </div>
              )}
              {exercise.default_reps && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)' }}>{exercise.default_reps}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>次</div>
                </div>
              )}
              {exercise.default_weight && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)' }}>{exercise.default_weight}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>{exercise.default_weight_unit || 'kg'}</div>
                </div>
              )}
              {exercise.default_duration && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)' }}>{exercise.default_duration}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>{exercise.default_duration_unit || '秒'}</div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {descr && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                动作说明
              </h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--c-text-primary)' }}>{descr}</p>
            </div>
          )}

          {/* Instructions */}
          {steps.length > 0 && (
            <div style={{ padding: '16px 20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                动作步骤
              </h3>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map((step, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--c-brand)', color: '#fff',
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--c-text-primary)', paddingTop: 3 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Fallback if no description or instructions */}
          {!descr && steps.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>
              暂无详细说明
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        <div style={{ margin: '0 var(--sp-5)', background: 'var(--c-card-bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>备注 & 心得</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-text-hint)' }}>教练和学员都可以留言</p>
            </div>
            <span style={{ fontSize: 12, color: 'var(--c-text-hint)' }}>{notes.length} 条</span>
          </div>

          {/* Add note */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-fill-light)' }}>
            <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="分享你的心得、注意事项…"
                rows={2}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--c-border)', fontSize: 13,
                  background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
                  resize: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={!newNote.trim() || isSubmittingNote}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--c-brand)', color: '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: newNote.trim() && !isSubmittingNote ? 'pointer' : 'not-allowed',
                  opacity: newNote.trim() && !isSubmittingNote ? 1 : 0.4,
                  alignSelf: 'flex-end',
                }}
              >
                {isSubmittingNote ? '…' : '发送'}
              </button>
            </form>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>
              还没有备注，来第一个留言吧
            </div>
          ) : (
            <div>
              {notes.map((note, i) => (
                <div key={note.id} style={{
                  padding: '14px 20px',
                  borderBottom: i < notes.length - 1 ? '1px solid var(--c-border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: note.author_type === 'trainer' ? 'var(--c-lavender)' : 'var(--c-fill-mid)',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {note.author_name?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>{note.author_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--c-text-hint)', marginLeft: 6 }}>
                        {note.author_type === 'trainer' ? '教练' : '学员'} · {new Date(note.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--c-text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
