'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Trainer {
  id: string
  name: string
  bio?: string
  photo_url?: string
  certificate?: string
}

interface Client {
  id: string
  name: string
  email: string
}

const DISCIPLINES = [
  { value: 'Pilates',             en: 'Pilates',             cn: '综合普拉提' },
  { value: 'Pilates Reformer',    en: 'Pilates Reformer',    cn: '普拉提床' },
  { value: 'Pilates Mat',         en: 'Pilates Mat',         cn: '垫上普拉提' },
  { value: 'Resistance Training', en: 'Resistance Training', cn: '抗阻力训练' },
  { value: 'Fitness',             en: 'Fitness',             cn: '综合健身' },
]

const LEVELS = [
  { value: 'beginner',     en: 'Beginner',     cn: '初级' },
  { value: 'intermediate', en: 'Intermediate', cn: '中级' },
  { value: 'advanced',     en: 'Advanced',     cn: '高级' },
]

const COLORS = ['var(--c-brand)', '#E8A87C', '#85C1E9', '#82E0AA', '#F1948A', '#F7DC6F', '#A9CCE3']

const s = {
  section: {
    background: 'var(--c-card-bg)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
  } as React.CSSProperties,
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    fontWeight: 'bold' as const,
    color: '#333',
    borderBottom: '2px solid #f3eef9',
    paddingBottom: '10px',
  } as React.CSSProperties,
  field: { marginBottom: '16px' } as React.CSSProperties,
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#444',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
}

// ── Inline Calendar ──────────────────────────────────────────────
function InlineCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const parseDate = (v: string) => v ? new Date(v + 'T12:00:00') : new Date()
  const [view, setView] = useState(() => {
    const d = parseDate(value)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const selected = value ? new Date(value + 'T12:00:00') : null
  const todayMs = (() => { const t = new Date(); t.setHours(0,0,0,0); return t.getTime() })()

  const firstDow = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const navToMonth = (delta: number) => setView(prev => {
    const d = new Date(prev.year, prev.month + delta, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const select = (day: number) => {
    const d = new Date(view.year, view.month, day)
    const pad = (n: number) => String(n).padStart(2, '0')
    onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }

  const CN_MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

  return (
    <div style={{ border: '1px solid #e0d5f0', borderRadius: '10px', overflow: 'hidden', background: 'var(--c-card-bg)' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f9f6fd' }}>
        <button type="button" onClick={() => navToMonth(-1)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--c-brand)', lineHeight: 1 }}>‹</button>
        <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>
          {view.year} {CN_MONTHS[view.month]}
        </span>
        <button type="button" onClick={() => navToMonth(1)}
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--c-brand)', lineHeight: 1 }}>›</button>
      </div>
      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 10px 0' }}>
        {['日','一','二','三','四','五','六'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: '#bbb', paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>
      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 10px 12px', gap: '2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const thisMs = new Date(view.year, view.month, day).getTime()
          const isSel = selected &&
            selected.getFullYear() === view.year &&
            selected.getMonth() === view.month &&
            selected.getDate() === day
          const isToday = thisMs === todayMs
          return (
            <button key={i} type="button" onClick={() => select(day)} style={{
              padding: '7px 0', border: 'none', borderRadius: '50%', cursor: 'pointer',
              fontSize: '13px', textAlign: 'center',
              backgroundColor: isSel ? 'var(--c-brand)' : 'transparent',
              color: isSel ? 'white' : isToday ? 'var(--c-brand)' : '#333',
              fontWeight: isSel || isToday ? 'bold' : 'normal',
              outline: isToday && !isSel ? '1.5px solid var(--c-brand)' : 'none',
            }}>{day}</button>
          )
        })}
      </div>
    </div>
  )
}

// ── Time Slot Picker ──────────────────────────────────────────────
function TimeSlotPicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const slots: string[] = []
  for (let h = 6; h <= 21; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
    slots.push(`${String(h).padStart(2,'0')}:30`)
  }
  const isCustom = value && !slots.includes(value)
  const [showCustom, setShowCustom] = useState(isCustom)

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {slots.map(slot => (
          <button key={slot} type="button" onClick={() => { onChange(slot); setShowCustom(false) }} style={{
            padding: '6px 12px',
            border: `1.5px solid ${value === slot ? 'var(--c-brand)' : '#ddd'}`,
            borderRadius: '20px',
            backgroundColor: value === slot ? 'var(--c-brand)' : 'white',
            color: value === slot ? 'white' : '#555',
            cursor: 'pointer', fontSize: '13px',
            fontWeight: value === slot ? 'bold' : 'normal',
          }}>{slot}</button>
        ))}
        <button type="button" onClick={() => setShowCustom(true)} style={{
          padding: '6px 12px',
          border: `1.5px solid ${showCustom ? 'var(--c-brand)' : '#ddd'}`,
          borderRadius: '20px',
          backgroundColor: showCustom ? '#f3eef9' : 'white',
          color: showCustom ? 'var(--c-brand)' : '#999',
          cursor: 'pointer', fontSize: '13px',
        }}>其他 Other…</button>
      </div>
      {showCustom && (
        <input
          type="time" value={isCustom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          style={{
            padding: '8px 12px', border: '1.5px solid var(--c-brand)',
            borderRadius: '8px', fontSize: '14px', width: '160px',
          }}
        />
      )}
    </div>
  )
}

function BiLabel({ cn, en, note }: { cn: string; en: string; note?: string }) {
  return (
    <span>
      {cn} <span style={{ color: '#999', fontSize: '12px', fontWeight: 'normal' }}>{en}</span>
      {note && <span style={{ color: '#bbb', fontSize: '11px', fontWeight: 'normal', marginLeft: '6px' }}>{note}</span>}
    </span>
  )
}

export default function NewClassPage() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name:            '',
    date:            new Date().toISOString().split('T')[0],
    start_time:      '09:00',
    duration:        60,
    discipline:      'Pilates',
    class_type:      'private' as 'private' | 'group',
    level:           'beginner',
    description:     '',
    max_capacity:    10,
    price:           '',
    color:           'var(--c-brand)',
    cover_image_url: '',
    trainer_id:      '',
    assigned_to:     '',
    notes:           '',
  })

  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (user) fetchTrainers()
  }, [user])

  useEffect(() => {
    if (user && userRole) fetchClients()
  }, [user, userRole])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClients(await res.json())
    } catch {}
  }

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/trainers', {
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) {
        const data: Trainer[] = await res.json()
        setTrainers(data)
        const me = data.find((t) => t.id === user?.id)
        const defaultTrainer = me || data[0]
        if (defaultTrainer) {
          setFormData((prev) => ({ ...prev, trainer_id: defaultTrainer.id }))
          setSelectedTrainer(defaultTrainer)
        }
      }
    } catch {}
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' || name === 'max_capacity' ? parseInt(value) : value,
    }))
  }

  const handleTrainerChange = (id: string) => {
    setFormData((prev) => ({ ...prev, trainer_id: id }))
    setSelectedTrainer(trainers.find((t) => t.id === id) || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const photos = photoUrls.filter((u) => u.trim())
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'x-user-role': userRole || 'TRAINER',
        },
        body: JSON.stringify({ ...formData, photos }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || '创建失败 Failed to create class')
      }
      const newClass = await res.json()
      router.push(`/dashboard/classes/${newClass.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard/classes" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
          ← 返回
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>新建课程</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
        {error && (
          <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ── Section 1: Basic Info ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>基本信息 Basic Info</h2>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="课程名称" en="Class Name" /> *</label>
              <input
                type="text" name="name" value={formData.name}
                onChange={handleChange} required
                placeholder="e.g., Morning Reformer Flow"
                style={s.input}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="课程类别" en="Discipline" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {DISCIPLINES.map((d) => (
                  <button
                    key={d.value} type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, discipline: d.value }))}
                    style={{
                      padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
                      border: `2px solid ${formData.discipline === d.value ? 'var(--c-brand)' : '#ddd'}`,
                      borderRadius: '8px',
                      backgroundColor: formData.discipline === d.value ? '#f3eef9' : 'white',
                      color: formData.discipline === d.value ? 'var(--c-brand)' : '#555',
                      fontWeight: formData.discipline === d.value ? 'bold' : 'normal',
                    }}
                  >
                    <div style={{ fontSize: '12px' }}>{d.en}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{d.cn}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="课程形式" en="Format" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['private', 'group'] as const).map((ct) => (
                  <button
                    key={ct} type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, class_type: ct }))}
                    style={{
                      padding: '12px', cursor: 'pointer', fontSize: '14px',
                      border: `2px solid ${formData.class_type === ct ? 'var(--c-brand)' : '#ddd'}`,
                      borderRadius: '8px',
                      backgroundColor: formData.class_type === ct ? '#f3eef9' : 'white',
                      color: formData.class_type === ct ? 'var(--c-brand)' : '#555',
                      fontWeight: formData.class_type === ct ? 'bold' : 'normal',
                    }}
                  >
                    {ct === 'private' ? '🧘 私教课 Private' : '👥 团课 Group'}
                  </button>
                ))}
              </div>
            </div>

            {/* Student selector — only for private class */}
            {formData.class_type === 'private' && (
              <div style={s.field}>
                <label style={s.label}><BiLabel cn="学员" en="Student" note="私教课 Private class" /></label>
                <select
                  value={formData.assigned_to}
                  onChange={e => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  style={s.input}
                >
                  <option value="">-- 选择学员 Select student --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="难度等级" en="Level" /></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {LEVELS.map((l) => (
                  <button
                    key={l.value} type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, level: l.value }))}
                    style={{
                      padding: '10px', cursor: 'pointer', fontSize: '13px',
                      border: `2px solid ${formData.level === l.value ? 'var(--c-brand)' : '#ddd'}`,
                      borderRadius: '8px',
                      backgroundColor: formData.level === l.value ? '#f3eef9' : 'white',
                      color: formData.level === l.value ? 'var(--c-brand)' : '#555',
                      fontWeight: formData.level === l.value ? 'bold' : 'normal',
                    }}
                  >
                    {l.en} <span style={{ color: '#999', fontWeight: 'normal' }}>{l.cn}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 2: Schedule ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>时间安排 Schedule</h2>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="日期" en="Date" /> *</label>
              <InlineCalendar
                value={formData.date}
                onChange={(d) => setFormData((prev) => ({ ...prev, date: d }))}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="开始时间" en="Start Time" /></label>
              <TimeSlotPicker
                value={formData.start_time}
                onChange={(t) => setFormData((prev) => ({ ...prev, start_time: t }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: formData.class_type === 'group' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px' }}>
              <div style={s.field}>
                <label style={s.label}><BiLabel cn="时长（分钟）" en="Duration (min)" /></label>
                <input type="number" name="duration" value={formData.duration}
                  onChange={handleChange} min="1" max="480" style={s.input} />
              </div>
              {formData.class_type === 'group' && (
                <div style={s.field}>
                  <label style={s.label}><BiLabel cn="最大人数" en="Max Capacity" /></label>
                  <input type="number" name="max_capacity" value={formData.max_capacity}
                    onChange={handleChange} min="1" max="100" style={s.input} />
                </div>
              )}
              <div style={s.field}>
                <label style={s.label}><BiLabel cn="价格" en="Price (¥)" /></label>
                <input type="number" name="price" value={formData.price}
                  onChange={handleChange} min="0" step="0.01" placeholder="0" style={s.input} />
              </div>
            </div>
          </section>

          {/* ── Section 3: Trainer ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>授课教练 Trainer</h2>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="选择教练" en="Select Trainer" /></label>
              <select
                value={formData.trainer_id}
                onChange={(e) => handleTrainerChange(e.target.value)}
                style={s.input}
              >
                <option value="">-- 选择教练 Select Trainer --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTrainer && (
              <div style={{
                backgroundColor: '#f9f6fd', border: '1px solid #e0d5f0',
                borderRadius: '10px', padding: '16px',
                display: 'flex', gap: '14px', alignItems: 'flex-start',
              }}>
                {selectedTrainer.photo_url ? (
                  <img src={selectedTrainer.photo_url} alt={selectedTrainer.name}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: 'var(--c-brand)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', fontWeight: 'bold',
                  }}>
                    {selectedTrainer.name?.[0] || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '15px' }}>{selectedTrainer.name}</p>
                  {selectedTrainer.certificate && (
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--c-brand)' }}>
                      🏆 {selectedTrainer.certificate}
                    </p>
                  )}
                  {selectedTrainer.bio && (
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                      {selectedTrainer.bio.length > 120
                        ? selectedTrainer.bio.slice(0, 120) + '...'
                        : selectedTrainer.bio}
                    </p>
                  )}
                  <Link href={`/dashboard/trainers/${selectedTrainer.id}`}
                    style={{ fontSize: '12px', color: 'var(--c-brand)', textDecoration: 'none' }}>
                    查看详情 View Profile →
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* ── Section 4: Description ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>课程描述 Description</h2>

            <div style={s.field}>
              <label style={s.label}><BiLabel cn="课程介绍" en="About This Class" /></label>
              <textarea
                name="description" value={formData.description}
                onChange={handleChange} rows={4}
                placeholder="描述这节课的内容、特色、适合人群... / Describe what students will experience..."
                style={{ ...s.input, fontFamily: 'sans-serif', resize: 'vertical' }}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>
                <BiLabel cn="内部备注" en="Internal Notes" note="仅教练可见 Trainer only" />
              </label>
              <textarea
                name="notes" value={formData.notes}
                onChange={handleChange} rows={2}
                placeholder="课程特殊安排、客户注意事项等... / Special arrangements, client notes..."
                style={{ ...s.input, fontFamily: 'sans-serif', resize: 'vertical' }}
              />
            </div>
          </section>

          {/* ── Section 5: Media ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>课程图片 Media</h2>

            <div style={s.field}>
              <label style={s.label}>
                <BiLabel cn="封面图" en="Cover Image" note="粘贴图片链接 Paste image URL" />
              </label>
              <input
                type="url" name="cover_image_url" value={formData.cover_image_url}
                onChange={handleChange} placeholder="https://..."
                style={s.input}
              />
              {formData.cover_image_url && (
                <img
                  src={formData.cover_image_url} alt="cover preview"
                  style={{ marginTop: '8px', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '6px' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>
                <BiLabel cn="课程照片" en="Photos" note="最多5张 Up to 5" />
              </label>
              {photoUrls.map((url, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="url" value={url}
                    onChange={(e) => {
                      const next = [...photoUrls]
                      next[i] = e.target.value
                      setPhotoUrls(next)
                    }}
                    placeholder={`照片链接 Photo URL ${i + 1}`}
                    style={{ ...s.input, margin: 0, flex: 1 }}
                  />
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ padding: '8px 12px', border: 'none', background: '#ffebee', color: '#c62828', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 }}
                    >✕</button>
                  )}
                </div>
              ))}
              {photoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setPhotoUrls((prev) => [...prev, ''])}
                  style={{ padding: '8px 16px', border: '1px dashed var(--c-brand)', backgroundColor: 'transparent', color: 'var(--c-brand)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  + 添加照片 Add Photo
                </button>
              )}
            </div>
          </section>

          {/* ── Section 6: Color Tag ── */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>颜色标签 Color Tag</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, color: c }))}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: c, cursor: 'pointer',
                    border: formData.color === c ? '3px solid #333' : '3px solid transparent',
                    outline: formData.color === c ? '2px solid white' : 'none',
                    outlineOffset: '-4px',
                  }}
                />
              ))}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
              用于日历视图区分课程 Used to distinguish classes in calendar view
            </p>
          </section>

          {/* ── Submit ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', paddingBottom: '40px' }}>
            <Link
              href="/dashboard/classes"
              style={{ padding: '14px', textAlign: 'center', backgroundColor: '#f0f0f0', color: '#333', textDecoration: 'none', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' }}
            >
              取消 Cancel
            </Link>
            <button
              type="submit" disabled={isLoading}
              style={{ padding: '14px', backgroundColor: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px', opacity: isLoading ? 0.6 : 1 }}
            >
              {isLoading ? '创建中... Creating...' : '创建课程 Create Class'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}
