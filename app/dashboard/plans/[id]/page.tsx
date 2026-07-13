'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface Exercise {
  id: string
  sets: number | null
  reps: number | null
  weight: number | null
  weight_unit: string
  duration_sec: number | null
  rest_sec: number | null
  notes: string | null
  order_num: number
  master_exercise: { id: string; name_cn: string; name_en: string; category: string } | null
}

interface Day {
  id: string
  label: string
  notes: string | null
  order_num: number
  exercises: Exercise[]
}

interface Plan {
  id: string
  title: string
  description: string | null
  goal: string | null
  level: string | null
  duration_desc: string | null
  is_published: boolean
  days: Day[]
}

interface MasterExercise {
  id: string
  name_cn: string
  name_en: string
  category: string
}

const LEVEL_OPTIONS = [
  { value: '', label: '不指定' },
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
]

export default function PlanEditorPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string

  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [metaEditing, setMetaEditing] = useState(false)
  const [metaForm, setMetaForm] = useState({ title: '', description: '', goal: '', level: '', duration_desc: '' })

  // Add day
  const [addingDay, setAddingDay] = useState(false)
  const [newDayLabel, setNewDayLabel] = useState('')

  // Add exercise picker
  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [exercises, setExercises] = useState<MasterExercise[]>([])
  const [exSearch, setExSearch] = useState('')

  // Publishing toggle
  const [publishing, setPublishing] = useState(false)

  const headers = { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (!authLoading && userRole === 'CLIENT') { router.push('/dashboard'); return }
    if (user) loadPlan()
  }, [user, userRole, authLoading])

  const loadPlan = async () => {
    const res = await fetch(`/api/plans/${planId}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setPlan(data)
      setMetaForm({
        title: data.title || '',
        description: data.description || '',
        goal: data.goal || '',
        level: data.level || '',
        duration_desc: data.duration_desc || '',
      })
    }
    setLoading(false)
  }

  const loadExercises = async () => {
    if (exercises.length > 0) return
    const res = await fetch('/api/exercises', { headers })
    if (res.ok) setExercises(await res.json())
  }

  const handleSaveMeta = async () => {
    setSaving(true)
    const res = await fetch(`/api/plans/${planId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...metaForm, is_published: plan?.is_published }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPlan(prev => prev ? { ...prev, ...updated } : prev)
      setMetaEditing(false)
    }
    setSaving(false)
  }

  const handleTogglePublish = async () => {
    if (!plan) return
    setPublishing(true)
    const newVal = !plan.is_published
    const res = await fetch(`/api/plans/${planId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...metaForm, is_published: newVal }),
    })
    if (res.ok) setPlan(prev => prev ? { ...prev, is_published: newVal } : prev)
    setPublishing(false)
  }

  const handleAddDay = async () => {
    if (!newDayLabel.trim()) return
    setAddingDay(true)
    const res = await fetch(`/api/plans/${planId}/days`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newDayLabel.trim() }),
    })
    if (res.ok) {
      const day = await res.json()
      setPlan(prev => prev ? { ...prev, days: [...prev.days, day] } : prev)
      setNewDayLabel('')
    }
    setAddingDay(false)
  }

  const handleDeleteDay = async (dayId: string, label: string) => {
    if (!confirm(`删除「${label}」及其所有动作？`)) return
    await fetch(`/api/plan-days/${dayId}`, { method: 'DELETE', headers })
    setPlan(prev => prev ? { ...prev, days: prev.days.filter(d => d.id !== dayId) } : prev)
  }

  const handleAddExercise = async (dayId: string, ex: MasterExercise) => {
    const res = await fetch(`/api/plan-days/${dayId}/exercises`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_exercise_id: ex.id, sets: 3, reps: 10 }),
    })
    if (res.ok) {
      const newEx = await res.json()
      setPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          days: prev.days.map(d => d.id === dayId ? { ...d, exercises: [...d.exercises, newEx] } : d),
        }
      })
    }
    setExSearch('')
  }

  const handleUpdateExercise = async (exId: string, dayId: string, field: string, value: any) => {
    const day = plan?.days.find(d => d.id === dayId)
    const ex = day?.exercises.find(e => e.id === exId)
    if (!ex) return
    const updated = { ...ex, [field]: value === '' ? null : value }
    await fetch(`/api/plan-exercises/${exId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        days: prev.days.map(d => d.id === dayId
          ? { ...d, exercises: d.exercises.map(e => e.id === exId ? { ...e, [field]: value === '' ? null : value } : e) }
          : d
        ),
      }
    })
  }

  const handleDeleteExercise = async (exId: string, dayId: string) => {
    await fetch(`/api/plan-exercises/${exId}`, { method: 'DELETE', headers })
    setPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        days: prev.days.map(d => d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d),
      }
    })
  }

  const filteredEx = exercises.filter(e =>
    e.name_cn.includes(exSearch) || e.name_en.toLowerCase().includes(exSearch.toLowerCase())
  ).slice(0, 20)

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>
  if (!plan) return <div style={{ padding: 40, textAlign: 'center' }}>计划未找到</div>

  const inputSm = {
    padding: '7px 10px', border: '1px solid var(--c-border)', borderRadius: 6,
    fontSize: 13, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/plans" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {plan.title}
        </span>
        {/* Publish toggle */}
        <button
          onClick={handleTogglePublish}
          disabled={publishing}
          style={{
            padding: '6px 14px', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: plan.is_published ? '#E8F5E9' : 'var(--c-fill-light)',
            color: plan.is_published ? '#2E7D32' : 'var(--c-text-secondary)',
          }}
        >
          {publishing ? '…' : plan.is_published ? '🌐 已公开' : '🔒 仅自己'}
        </button>
      </header>

      <main style={{ padding: 'var(--sp-4)', maxWidth: 740, margin: '0 auto' }}>

        {/* Meta info card */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          {metaEditing ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>计划名称 *</label>
                  <input value={metaForm.title} onChange={e => setMetaForm(p => ({ ...p, title: e.target.value }))}
                    style={{ ...inputSm, width: '100%', boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>简介</label>
                  <textarea value={metaForm.description} onChange={e => setMetaForm(p => ({ ...p, description: e.target.value }))}
                    rows={2} style={{ ...inputSm, width: '100%', boxSizing: 'border-box' as const, resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>训练目标</label>
                  <input value={metaForm.goal} onChange={e => setMetaForm(p => ({ ...p, goal: e.target.value }))}
                    placeholder="例：减脂 / 增肌 / 提升体能" style={{ ...inputSm, width: '100%', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>周期</label>
                  <input value={metaForm.duration_desc} onChange={e => setMetaForm(p => ({ ...p, duration_desc: e.target.value }))}
                    placeholder="例：12周 / 3个月" style={{ ...inputSm, width: '100%', boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>难度级别</label>
                  <select value={metaForm.level} onChange={e => setMetaForm(p => ({ ...p, level: e.target.value }))}
                    style={{ ...inputSm, width: '100%', boxSizing: 'border-box' as const }}>
                    {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveMeta} disabled={saving}
                  style={{ padding: '7px 18px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button onClick={() => setMetaEditing(false)}
                  style={{ padding: '7px 14px', border: '1px solid var(--c-border)', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'none' }}>
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--c-text-primary)' }}>{plan.title}</h2>
                {plan.description && <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666', lineHeight: 1.6 }}>{plan.description}</p>}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {plan.goal && <span style={{ fontSize: 12, color: '#888' }}>🎯 {plan.goal}</span>}
                  {plan.duration_desc && <span style={{ fontSize: 12, color: '#888' }}>⏱ {plan.duration_desc}</span>}
                  {plan.level && <span style={{ fontSize: 12, color: '#888' }}>📊 {LEVEL_OPTIONS.find(o => o.value === plan.level)?.label}</span>}
                  {plan.days.length > 0 && <span style={{ fontSize: 12, color: '#888' }}>📅 {plan.days.length} 个训练日</span>}
                </div>
              </div>
              <button onClick={() => setMetaEditing(true)}
                style={{ padding: '5px 12px', border: '1px solid var(--c-border)', borderRadius: 6, background: 'none', color: 'var(--c-brand)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
                ✏️ 编辑
              </button>
            </div>
          )}
        </div>

        {/* Training days */}
        {plan.days.map(day => (
          <div key={day.id} style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-3)', overflow: 'hidden' }}>
            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-fill-light)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-primary)', flex: 1 }}>{day.label}</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>{day.exercises.length} 个动作</span>
              <button
                onClick={() => { setActiveDayId(activeDayId === day.id ? null : day.id); setExSearch(''); loadExercises() }}
                style={{ padding: '4px 12px', background: 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                ＋ 动作
              </button>
              <button onClick={() => handleDeleteDay(day.id, day.label)}
                style={{ padding: '4px 8px', background: 'none', border: '1px solid #eee', borderRadius: 6, color: '#ccc', cursor: 'pointer', fontSize: 12 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f44336'; e.currentTarget.style.borderColor = '#f44336' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#eee' }}>
                删除
              </button>
            </div>

            {/* Exercise picker */}
            {activeDayId === day.id && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--c-border)', background: '#fafafa' }}>
                <input
                  autoFocus
                  value={exSearch}
                  onChange={e => setExSearch(e.target.value)}
                  placeholder="搜索动作名称…"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {filteredEx.length === 0 && <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>{exercises.length === 0 ? '加载中…' : '没有匹配的动作'}</p>}
                  {filteredEx.map(ex => (
                    <button key={ex.id} onClick={() => handleAddExercise(day.id, ex)}
                      style={{ textAlign: 'left', padding: '6px 10px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 13 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--c-fill-mid)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight: 500 }}>{ex.name_cn}</span>
                      {ex.name_cn !== ex.name_en && <span style={{ color: '#aaa', marginLeft: 6, fontSize: 11 }}>{ex.name_en}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exercises */}
            {day.exercises.length === 0 && activeDayId !== day.id && (
              <div style={{ padding: '16px', fontSize: 13, color: '#bbb', textAlign: 'center' }}>点击「＋ 动作」添加训练内容</div>
            )}
            {day.exercises.map((ex, i) => (
              <div key={ex.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderBottom: i < day.exercises.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--c-lavender)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {ex.master_exercise?.name_cn || '未知动作'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: '组', field: 'sets', val: ex.sets },
                      { label: '次', field: 'reps', val: ex.reps },
                    ].map(f => (
                      <label key={f.field} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <input
                          type="number" min={0} value={f.val ?? ''}
                          onChange={e => handleUpdateExercise(ex.id, day.id, f.field, e.target.value === '' ? null : parseInt(e.target.value))}
                          style={{ width: 48, ...inputSm, padding: '4px 6px' }}
                        />
                        <span style={{ color: '#999' }}>{f.label}</span>
                      </label>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <input
                        type="number" min={0} step={0.5} value={ex.weight ?? ''}
                        onChange={e => handleUpdateExercise(ex.id, day.id, 'weight', e.target.value === '' ? null : parseFloat(e.target.value))}
                        style={{ width: 56, ...inputSm, padding: '4px 6px' }}
                        placeholder="重量"
                      />
                      <span style={{ color: '#999' }}>kg</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <input
                        type="number" min={0} value={ex.rest_sec ?? ''}
                        onChange={e => handleUpdateExercise(ex.id, day.id, 'rest_sec', e.target.value === '' ? null : parseInt(e.target.value))}
                        style={{ width: 48, ...inputSm, padding: '4px 6px' }}
                        placeholder="休息"
                      />
                      <span style={{ color: '#999' }}>秒</span>
                    </label>
                    <input
                      type="text" value={ex.notes ?? ''}
                      onChange={e => handleUpdateExercise(ex.id, day.id, 'notes', e.target.value)}
                      placeholder="备注…"
                      style={{ ...inputSm, padding: '4px 8px', fontSize: 12, width: 100 }}
                    />
                  </div>
                </div>
                <button onClick={() => handleDeleteExercise(ex.id, day.id)}
                  style={{ width: 24, height: 24, border: 'none', borderRadius: '50%', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}

        {/* Add day */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px dashed var(--c-border)', borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={newDayLabel}
            onChange={e => setNewDayLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddDay()}
            placeholder="新训练日名称，例：推力日 / Day A / 周一…"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--c-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button onClick={handleAddDay} disabled={addingDay || !newDayLabel.trim()}
            style={{ padding: '8px 18px', background: newDayLabel.trim() ? 'var(--c-brand)' : 'var(--c-lavender)', color: '#fff', border: 'none', borderRadius: 6, cursor: newDayLabel.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
            {addingDay ? '…' : '＋ 添加训练日'}
          </button>
        </div>

        {/* Preview link */}
        {plan.is_published && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Link href="/dashboard/programs" style={{ fontSize: 13, color: '#aaa', textDecoration: 'none' }}>
              → 在客户展示页查看效果
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
