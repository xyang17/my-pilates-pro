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
  equipment_setup_en?: string
  equipment_setup_cn?: string
  body_position_en?: string
  body_position_cn?: string
  secondary_muscles_en?: string
  secondary_muscles_cn?: string
  cues_en?: string
  cues_cn?: string
  contraindications_en?: string
  contraindications_cn?: string
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
  // 用否定前瞻而不是排除数字字符类，避免句子中间出现的数字（如"重复5次"）把步骤截断
  const numbered = text.match(/\d+\.\s(?:(?!\d+\.\s)[\s\S])*/g)
  if (numbered && numbered.length > 1) return numbered.map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  // 否则按句号/。拆
  return text.split(/[。\.]\s+/).map(s => s.trim()).filter(Boolean)
}

/* ────────────────────────────────────────────────────────────
   通用可编辑字段：非编辑态点击即可进入编辑，失焦/回车保存
   仅 isOwner 为 true 时才可点击编辑
──────────────────────────────────────────────────────────── */
function EditableField({
  value,
  editable,
  placeholder = '点击填写',
  multiline = false,
  onSave,
  renderView,
  displayStyle,
  inputStyle,
}: {
  value: string
  editable: boolean
  placeholder?: string
  multiline?: boolean
  onSave: (v: string) => Promise<void>
  renderView?: (v: string) => React.ReactNode
  displayStyle?: React.CSSProperties
  inputStyle?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!editing) setDraft(value || '') }, [value, editing])

  const commit = async () => {
    if (draft === (value || '')) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    const baseInputStyle: React.CSSProperties = {
      width: '100%', padding: '6px 8px', borderRadius: 6,
      border: '1px solid var(--c-brand)', fontSize: 14,
      fontFamily: 'inherit', color: 'var(--c-text-primary)',
      background: 'var(--c-card-bg)', boxSizing: 'border-box',
      ...inputStyle,
    }
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit() }
        }}
        rows={4}
        style={{ ...baseInputStyle, resize: 'vertical' }}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false)
          if (e.key === 'Enter') { e.preventDefault(); commit() }
        }}
        style={baseInputStyle}
      />
    )
  }

  return (
    <div
      onClick={() => editable && setEditing(true)}
      title={editable ? '点击编辑' : undefined}
      style={{
        cursor: editable ? 'text' : 'default',
        borderRadius: 6,
        padding: editable ? '2px 4px' : 0,
        margin: editable ? '-2px -4px' : 0,
        transition: 'background 0.15s',
        opacity: saving ? 0.5 : 1,
        ...displayStyle,
      }}
      onMouseEnter={e => { if (editable) e.currentTarget.style.background = 'var(--c-fill-light)' }}
      onMouseLeave={e => { if (editable) e.currentTarget.style.background = 'transparent' }}
    >
      {value
        ? (renderView ? renderView(value) : value)
        : <span style={{ color: 'var(--c-text-hint)', fontStyle: 'italic' }}>{editable ? placeholder : ''}</span>}
    </div>
  )
}

const ATTR_CELL: React.CSSProperties = {
  border: '1px solid var(--c-border)', borderRadius: 10,
  padding: '10px 14px', minWidth: 0,
}
const ATTR_LABEL: React.CSSProperties = {
  fontSize: 11, color: 'var(--c-text-hint)', marginBottom: 4,
  textTransform: 'uppercase', letterSpacing: '0.04em',
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

  const isOwner = !!(user && exercise && user.id === exercise.created_by)

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

  // 单字段保存：只发送这一个字段，后端会保留其他字段不变
  const NUMBER_FIELDS = new Set(['default_sets', 'default_reps', 'default_weight', 'default_duration'])
  const saveField = async (dbKey: string, value: string) => {
    try {
      let payloadValue: string | number | null = value
      if (NUMBER_FIELDS.has(dbKey)) {
        if (value.trim() === '') {
          payloadValue = null
        } else {
          const n = dbKey === 'default_weight' ? parseFloat(value) : parseInt(value, 10)
          if (Number.isNaN(n)) { alert('请输入有效数字'); return }
          payloadValue = n
        }
      }
      const res = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ [dbKey]: payloadValue }),
      })
      if (!res.ok) throw new Error('保存失败')
      const updated = await res.json()
      setExercise(prev => prev ? { ...prev, ...updated } : prev)
    } catch (err: any) {
      alert(err.message || '保存失败，请重试')
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

  const suffix = lang === 'cn' ? '_cn' : '_en'
  const name    = lang === 'cn' ? (exercise.name_cn || exercise.name_en) : exercise.name_en
  const nameAlt = lang === 'cn' ? exercise.name_en : (exercise.name_cn || '')
  const type    = (lang === 'cn' ? exercise.type_cn    : exercise.type_en) || ''
  const equip   = (lang === 'cn' ? exercise.equipment_cn : exercise.equipment_en) || ''
  const equipSetup = (lang === 'cn' ? exercise.equipment_setup_cn : exercise.equipment_setup_en) || ''
  const position = (lang === 'cn' ? exercise.body_position_cn : exercise.body_position_en) || ''
  const muscle  = (lang === 'cn' ? exercise.target_muscles_cn : exercise.target_muscles_en) || ''
  const muscle2 = (lang === 'cn' ? exercise.secondary_muscles_cn : exercise.secondary_muscles_en) || ''
  const diff    = (lang === 'cn' ? exercise.difficulty_cn : exercise.difficulty_en) || ''
  const descr   = (lang === 'cn' ? exercise.description_cn  : exercise.description_en) || ''
  const instrRaw = (lang === 'cn' ? exercise.instructions_cn : exercise.instructions_en) || ''
  const cues    = (lang === 'cn' ? exercise.cues_cn : exercise.cues_en) || ''
  const contraindications = (lang === 'cn' ? exercise.contraindications_cn : exercise.contraindications_en) || ''
  const mediaUrl = exercise.gif_url || exercise.featured_image_url || exercise.images?.[0]?.image_url

  const diffColor = diff === '初级' || diff === 'Beginner' ? '#16a34a'
    : diff === '中级' || diff === 'Intermediate' ? '#d97706'
    : diff ? '#dc2626' : 'var(--c-text-primary)'

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
          {isOwner && (
            <span style={{ fontSize: 11, color: 'var(--c-text-hint)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✎ 点击内容可直接编辑
            </span>
          )}
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
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--c-text-hint)' }}>{nameAlt}</p>
          )}

          {/* ── 属性网格：类型/体位/器械/目标肌群/次要肌群/难度，逐项可编辑 ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10, marginBottom: 12,
          }}>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>类型 / Type</div>
              <EditableField
                value={type} editable={isOwner}
                onSave={v => saveField(`type${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}
              />
            </div>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>体位 / Position</div>
              <EditableField
                value={position} editable={isOwner}
                onSave={v => saveField(`body_position${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}
              />
            </div>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>器械 / Equipment</div>
              <EditableField
                value={equip} editable={isOwner}
                onSave={v => saveField(`equipment${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}
              />
            </div>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>目标肌群 / Target Muscles</div>
              <EditableField
                value={muscle} editable={isOwner}
                onSave={v => saveField(`target_muscles${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}
              />
            </div>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>次要肌群 / Secondary</div>
              <EditableField
                value={muscle2} editable={isOwner}
                onSave={v => saveField(`secondary_muscles${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}
              />
            </div>
            <div style={ATTR_CELL}>
              <div style={ATTR_LABEL}>难度 / Difficulty</div>
              <EditableField
                value={diff} editable={isOwner}
                onSave={v => saveField(`difficulty${suffix}`, v)}
                displayStyle={{ fontSize: 14, fontWeight: 700, color: diffColor }}
              />
            </div>
          </div>

          {/* 器械配置 — 内容可能较长，单独一行 */}
          {(equipSetup || isOwner) && (
            <div style={{ ...ATTR_CELL, marginBottom: 20 }}>
              <div style={ATTR_LABEL}>器械配置 / Setup</div>
              <EditableField
                value={equipSetup} editable={isOwner} multiline
                onSave={v => saveField(`equipment_setup${suffix}`, v)}
                displayStyle={{ fontSize: 13, lineHeight: 1.6, color: 'var(--c-text-primary)' }}
              />
            </div>
          )}
        </div>

        {/* ── 禁忌 / 慎用人群 — 永远置顶展示，安全信息优先 ── */}
        {(contraindications || isOwner) && (
          <div style={{
            margin: '0 var(--sp-5) 16px',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--r-lg)', padding: '14px 18px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>⚠️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>禁忌 / 慎用人群</h3>
              <EditableField
                value={contraindications} editable={isOwner} multiline
                placeholder="点击填写禁忌 / 慎用人群"
                onSave={v => saveField(`contraindications${suffix}`, v)}
                displayStyle={{ fontSize: 13, lineHeight: 1.6, color: '#991b1b' }}
              />
            </div>
          </div>
        )}

        {/* ── Content card ── */}
        <div style={{ margin: '0 var(--sp-5)', background: 'var(--c-card-bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 16 }}>

          {/* Default params */}
          {(exercise.default_sets || exercise.default_reps || exercise.default_weight || exercise.default_duration || isOwner) && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <EditableField
                  value={exercise.default_sets ? String(exercise.default_sets) : ''}
                  editable={isOwner} placeholder="—"
                  onSave={v => saveField('default_sets', v)}
                  displayStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)', textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>组</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <EditableField
                  value={exercise.default_reps ? String(exercise.default_reps) : ''}
                  editable={isOwner} placeholder="—"
                  onSave={v => saveField('default_reps', v)}
                  displayStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)', textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>次</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <EditableField
                  value={exercise.default_weight ? String(exercise.default_weight) : ''}
                  editable={isOwner} placeholder="—"
                  onSave={v => saveField('default_weight', v)}
                  displayStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)', textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>{exercise.default_weight_unit || 'kg'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <EditableField
                  value={exercise.default_duration ? String(exercise.default_duration) : ''}
                  editable={isOwner} placeholder="—"
                  onSave={v => saveField('default_duration', v)}
                  displayStyle={{ fontSize: 20, fontWeight: 700, color: 'var(--c-brand)', textAlign: 'center' }}
                />
                <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>{exercise.default_duration_unit || '秒'}</div>
              </div>
            </div>
          )}

          {/* Description */}
          {(descr || isOwner) && (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                动作说明
              </h3>
              <EditableField
                value={descr} editable={isOwner} multiline
                placeholder="点击填写动作说明"
                onSave={v => saveField(`description${suffix}`, v)}
                displayStyle={{ fontSize: 14, lineHeight: 1.7, color: 'var(--c-text-primary)' }}
              />
            </div>
          )}

          {/* Instructions */}
          {(instrRaw || isOwner) && (
            <div style={{ padding: '16px 20px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                动作步骤
              </h3>
              <EditableField
                value={instrRaw} editable={isOwner} multiline
                placeholder="点击填写动作步骤（可用「1. xxx」编号）"
                onSave={v => saveField(`instructions${suffix}`, v)}
                renderView={v => {
                  const steps = parseSteps(v)
                  if (steps.length === 0) return <span>{v}</span>
                  return (
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
                  )
                }}
              />
            </div>
          )}

          {/* Teaching cues */}
          {(cues || isOwner) && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--c-border)', background: 'var(--c-fill-light)' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--c-text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                💬 教学提示语
              </h3>
              <EditableField
                value={cues} editable={isOwner} multiline
                placeholder="点击填写教学提示语（每行一条）"
                onSave={v => saveField(`cues${suffix}`, v)}
                renderView={v => {
                  const cueList = parseSteps(v)
                  if (cueList.length === 0) return <span style={{ fontStyle: 'italic' }}>"{v}"</span>
                  return (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {cueList.map((cue, i) => (
                        <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-text-primary)', fontStyle: 'italic' }}>
                          "{cue}"
                        </li>
                      ))}
                    </ul>
                  )
                }}
              />
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
