'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Assessment {
  id: string
  client_id: string
  trainer_id: string
  assessed_at: string
  notes: string | null
  photo_urls: string[]
  // Body comp
  weight: number | null; weight_unit: string | null
  height: number | null; height_unit: string | null
  bmi: number | null; body_fat_pct: number | null
  muscle_mass: number | null; bone_mass: number | null
  water_pct: number | null; visceral_fat: number | null
  bmr: number | null; body_age: number | null
  // Cardio
  resting_hr: number | null; bp_systolic: number | null; bp_diastolic: number | null
  vo2_max: number | null; six_min_walk: number | null; step_test: number | null
  // Strength
  pushup_count: number | null; situp_count: number | null
  grip_left: number | null; grip_right: number | null
  plank_sec: number | null; squat_count: number | null; sit_reach_cm: number | null
}

interface ClientInfo { id: string; name: string; email: string; photo_url?: string }

const EMPTY_FORM: Partial<Assessment> = {
  assessed_at: new Date().toISOString().slice(0, 10),
  notes: '',
  photo_urls: [],
  weight: null, weight_unit: 'kg',
  height: null, height_unit: 'cm',
  bmi: null, body_fat_pct: null, muscle_mass: null, bone_mass: null,
  water_pct: null, visceral_fat: null, bmr: null, body_age: null,
  resting_hr: null, bp_systolic: null, bp_diastolic: null,
  vo2_max: null, six_min_walk: null, step_test: null,
  pushup_count: null, situp_count: null, grip_left: null, grip_right: null,
  plank_sec: null, squat_count: null, sit_reach_cm: null,
}

// ─── Field definitions ──────────────────────────────────────────────────────

const BODY_COMP_FIELDS = [
  { key: 'weight', label: '体重', unit: 'kg', step: 0.1 },
  { key: 'height', label: '身高', unit: 'cm', step: 0.1 },
  { key: 'bmi', label: 'BMI', unit: '', step: 0.1 },
  { key: 'body_fat_pct', label: '体脂率', unit: '%', step: 0.1 },
  { key: 'muscle_mass', label: '肌肉量', unit: 'kg', step: 0.1 },
  { key: 'bone_mass', label: '骨量', unit: 'kg', step: 0.1 },
  { key: 'water_pct', label: '水分率', unit: '%', step: 0.1 },
  { key: 'visceral_fat', label: '内脏脂肪', unit: '', step: 1 },
  { key: 'bmr', label: '基础代谢', unit: 'kcal', step: 1 },
  { key: 'body_age', label: '身体年龄', unit: '岁', step: 1 },
]

const CARDIO_FIELDS = [
  { key: 'resting_hr', label: '静息心率', unit: 'bpm', step: 1 },
  { key: 'bp_systolic', label: '收缩压', unit: 'mmHg', step: 1 },
  { key: 'bp_diastolic', label: '舒张压', unit: 'mmHg', step: 1 },
  { key: 'vo2_max', label: 'VO₂ Max', unit: 'ml/kg/min', step: 0.1 },
  { key: 'six_min_walk', label: '六分钟步行', unit: 'm', step: 1 },
  { key: 'step_test', label: '台阶测试', unit: '分', step: 0.1 },
]

const STRENGTH_FIELDS = [
  { key: 'pushup_count', label: '俯卧撑', unit: '个', step: 1 },
  { key: 'situp_count', label: '仰卧起坐', unit: '个', step: 1 },
  { key: 'grip_left', label: '握力（左）', unit: 'kg', step: 0.1 },
  { key: 'grip_right', label: '握力（右）', unit: 'kg', step: 0.1 },
  { key: 'plank_sec', label: '平板支撑', unit: '秒', step: 1 },
  { key: 'squat_count', label: '深蹲', unit: '个', step: 1 },
  { key: 'sit_reach_cm', label: '坐位体前屈', unit: 'cm', step: 0.1 },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientAssessmentPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [history, setHistory] = useState<Assessment[]>([])
  const [selectedId, setSelectedId] = useState<string | 'new'>('new')
  const [form, setForm] = useState<Partial<Assessment>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'body' | 'cardio' | 'strength'>('body')
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user && userRole) loadAll()
  }, [user, userRole, authLoading])

  const loadAll = async () => {
    const headers = { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }
    const [cRes, aRes] = await Promise.all([
      fetch(`/api/clients/${clientId}`, { headers }),
      fetch(`/api/assessments?clientId=${clientId}`, { headers }),
    ])
    if (cRes.ok) setClientInfo(await cRes.json())
    if (aRes.ok) {
      const list: Assessment[] = await aRes.json()
      setHistory(list)
      if (list.length > 0) {
        setSelectedId(list[0].id)
        setForm(list[0])
      }
    }
    setLoading(false)
  }

  const selectAssessment = (id: string | 'new') => {
    setSelectedId(id)
    if (id === 'new') {
      setForm({ ...EMPTY_FORM, assessed_at: new Date().toISOString().slice(0, 10) })
    } else {
      const found = history.find(a => a.id === id)
      if (found) setForm(found)
    }
  }

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value === '' ? null : value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || '',
      'x-user-role': userRole || '',
    }
    try {
      let res: Response
      if (selectedId === 'new') {
        res = await fetch('/api/assessments', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...form, client_id: clientId }),
        })
      } else {
        res = await fetch(`/api/assessments/${selectedId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(form),
        })
      }
      if (res.ok) {
        const saved: Assessment = await res.json()
        if (selectedId === 'new') {
          setHistory(prev => [saved, ...prev])
          setSelectedId(saved.id)
          setForm(saved)
        } else {
          setHistory(prev => prev.map(a => a.id === saved.id ? saved : a))
          setForm(saved)
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (files: FileList) => {
    if (!files.length) return
    // Must save first to get an ID
    let assessmentId = selectedId
    if (selectedId === 'new') {
      setSaving(true)
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ ...form, client_id: clientId }),
      })
      if (res.ok) {
        const saved: Assessment = await res.json()
        setHistory(prev => [saved, ...prev])
        setSelectedId(saved.id)
        setForm(saved)
        assessmentId = saved.id
      }
      setSaving(false)
    }

    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/assessments/${assessmentId}/photos`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: fd,
      })
      if (res.ok) {
        const { url } = await res.json()
        setForm(prev => ({ ...prev, photo_urls: [...(prev.photo_urls || []), url] }))
        setHistory(prev => prev.map(a =>
          a.id === assessmentId ? { ...a, photo_urls: [...a.photo_urls, url] } : a
        ))
      }
    }
    setUploading(false)
  }

  const handleDeletePhoto = async (url: string) => {
    if (selectedId === 'new') return
    await fetch(`/api/assessments/${selectedId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      body: JSON.stringify({ url }),
    })
    setForm(prev => ({ ...prev, photo_urls: (prev.photo_urls || []).filter(u => u !== url) }))
  }

  const isReadOnly = userRole === 'CLIENT'

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 16px', border: 'none', borderRadius: 'var(--r-sm)',
    background: active ? 'var(--c-brand)' : 'transparent',
    color: active ? '#fff' : 'var(--c-text-secondary)',
    fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
  })

  const inputStyle = (disabled?: boolean) => ({
    width: '100%', padding: '8px 10px',
    border: '1px solid var(--c-border)', borderRadius: 6,
    fontSize: 14, boxSizing: 'border-box' as const,
    background: disabled ? 'var(--c-fill-light)' : 'var(--c-card-bg)',
    color: 'var(--c-text-primary)',
  })

  const renderFields = (fields: typeof BODY_COMP_FIELDS) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {fields.map(f => (
        <div key={f.key}>
          <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>
            {f.label}{f.unit ? ` (${f.unit})` : ''}
          </label>
          <input
            type="number"
            step={f.step}
            value={(form as any)[f.key] ?? ''}
            onChange={e => setField(f.key, e.target.value === '' ? null : parseFloat(e.target.value))}
            disabled={isReadOnly}
            style={inputStyle(isReadOnly)}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link
          href={isReadOnly ? '/dashboard/profile' : '/dashboard/assessments'}
          style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}
        >← 返回</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
            身体测试
          </div>
          {clientInfo && (
            <div style={{ fontSize: 12, color: '#aaa' }}>{clientInfo.name}</div>
          )}
        </div>
        <div style={{ width: 60 }} />
      </header>

      <main style={{ padding: 'var(--sp-4)', maxWidth: 780, margin: '0 auto', display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>

        {/* Left: history sidebar */}
        <div style={{ width: 160, flexShrink: 0 }}>
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)', fontSize: 12, color: '#999', fontWeight: 500 }}>历史记录</div>

            {!isReadOnly && (
              <button
                onClick={() => selectAssessment('new')}
                style={{
                  width: '100%', padding: '10px 12px', border: 'none', textAlign: 'left',
                  background: selectedId === 'new' ? 'var(--c-fill-mid)' : 'transparent',
                  color: selectedId === 'new' ? 'var(--c-brand)' : 'var(--c-text-primary)',
                  fontSize: 13, cursor: 'pointer', fontWeight: selectedId === 'new' ? 600 : 400,
                  borderBottom: '1px solid var(--c-border)',
                }}
              >
                ＋ 新建测试
              </button>
            )}

            {history.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: 12, color: '#aaa', textAlign: 'center' }}>暂无记录</div>
            )}

            {history.map(a => (
              <button
                key={a.id}
                onClick={() => selectAssessment(a.id)}
                style={{
                  width: '100%', padding: '10px 12px', border: 'none', textAlign: 'left',
                  background: selectedId === a.id ? 'var(--c-fill-mid)' : 'transparent',
                  color: selectedId === a.id ? 'var(--c-brand)' : 'var(--c-text-primary)',
                  fontSize: 13, cursor: 'pointer', fontWeight: selectedId === a.id ? 600 : 400,
                  borderBottom: '1px solid var(--c-border)',
                }}
              >
                {new Date(a.assessed_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </button>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Date & notes */}
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>测试日期</label>
                <input
                  type="date"
                  value={(form.assessed_at || '').slice(0, 10)}
                  onChange={e => setField('assessed_at', e.target.value)}
                  disabled={isReadOnly}
                  style={inputStyle(isReadOnly)}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 5 }}>备注</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setField('notes', e.target.value)}
                disabled={isReadOnly}
                rows={2}
                placeholder="记录状态、特殊情况等…"
                style={{ ...inputStyle(isReadOnly), resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--sp-3)', background: 'var(--c-fill-light)', padding: 4, borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)' }}>
            <button style={tabStyle(activeTab === 'body')} onClick={() => setActiveTab('body')}>🏃 身体成分</button>
            <button style={tabStyle(activeTab === 'cardio')} onClick={() => setActiveTab('cardio')}>❤️ 心肺功能</button>
            <button style={tabStyle(activeTab === 'strength')} onClick={() => setActiveTab('strength')}>💪 抗阻测试</button>
          </div>

          {/* Fields */}
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)' }}>
            {activeTab === 'body' && renderFields(BODY_COMP_FIELDS)}
            {activeTab === 'cardio' && renderFields(CARDIO_FIELDS)}
            {activeTab === 'strength' && renderFields(STRENGTH_FIELDS)}
          </div>

          {/* Photos */}
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>📷 照片 / 截图</span>
              {!isReadOnly && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    padding: '6px 14px', border: '1px solid var(--c-border-em)',
                    borderRadius: 6, background: 'var(--c-fill-light)',
                    color: 'var(--c-brand)', cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {uploading ? '上传中…' : '上传'}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => e.target.files && handlePhotoUpload(e.target.files)}
              />
            </div>

            {(form.photo_urls || []).length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
                还没有照片
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {(form.photo_urls || []).map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img
                      src={url}
                      alt=""
                      style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--c-border)' }}
                      onClick={() => window.open(url, '_blank')}
                    />
                    {!isReadOnly && (
                      <button
                        onClick={() => handleDeletePhoto(url)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: '50%',
                          background: '#e53935', color: '#fff', border: 'none',
                          fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '13px',
                background: saving ? 'var(--c-lavender)' : 'var(--c-brand)',
                color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '保存中…' : selectedId === 'new' ? '创建测试记录' : '保存更改'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
