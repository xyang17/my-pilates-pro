'use client'

// ============================================================
// 身体测试 · L0 基础数据层录入页
// 参考框架 V4 Sheet 01 / Sheet 06（展示设计）/ Sheet 07（合规）
//
// 本页不打分、不评级。L0 的定位是记录事实与趋势，
// 为 L1 能力评估提供标准化的分母。
// ============================================================

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BODY_REGION_LABELS, CONDITION_TYPE_LABELS, CONTRA_STATUS_LABELS,
  DEVICE_TYPE_LABELS, L0_BASIC_FIELDS, L0_COMPOSITION_FIELDS, L0_GIRTH_FIELDS,
  L0_SEGMENTAL_FIELDS, L0_VITALS_FIELDS, MEASUREMENT_CONTEXT_LABELS,
  SEVERITY_LABELS, SEX_LABELS, SIDE_LABELS, TEST_TIER_LABELS, WAIST_LANDMARK_LABELS,
  bloodPressureGate, dataCompleteness, diffMeasurements, referenceNotes,
  type L0FieldConfig,
} from '@/lib/l0'
import type {
  ClientProfile, Contraindication, L0BodyMetricFull, L0FieldMeta,
} from '@/types/l0'

interface ClientInfo { id: string; name: string; email: string; photo_url?: string }

type Tab = 'basic' | 'composition' | 'segmental' | 'girth' | 'vitals' | 'profile'

const TABS: { key: Tab; label: string }[] = [
  { key: 'basic', label: '基础' },
  { key: 'composition', label: '体成分' },
  { key: 'segmental', label: '节段分析' },
  { key: 'girth', label: '围度' },
  { key: 'vitals', label: '生理基线' },
  { key: 'profile', label: '档案与禁忌' },
]

const emptyForm = (): Record<string, any> => ({
  measured_at: new Date().toISOString().slice(0, 10),
  measured_time: null,
  test_tier: 'T1',
  device_type: null,
  device_model: null,
  measurement_context: 'UNKNOWN',
  waist_landmark: 'ILIAC_CREST',
  notes: '',
  photo_urls: [],
})

export default function ClientL0Page() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.clientId as string

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [meta, setMeta] = useState<L0FieldMeta[]>([])
  const [history, setHistory] = useState<L0BodyMetricFull[]>([])
  const [profile, setProfile] = useState<Partial<ClientProfile>>({})
  const [contras, setContras] = useState<Contraindication[]>([])

  const [selectedId, setSelectedId] = useState<string | 'new'>('new')
  const [form, setForm] = useState<Record<string, any>>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('basic')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isReadOnly = userRole === 'CLIENT'
  const headers = useMemo(
    () => ({ 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }),
    [user?.id, userRole],
  )

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user && userRole) loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, authLoading])

  const loadAll = async () => {
    const [cRes, mRes, hRes, pRes] = await Promise.all([
      fetch(`/api/clients/${clientId}`, { headers }),
      fetch('/api/l0/meta', { headers }),
      fetch(`/api/l0/metrics?clientId=${clientId}`, { headers }),
      fetch(`/api/l0/profile/${clientId}`, { headers }),
    ])
    if (cRes.ok) setClientInfo(await cRes.json())
    if (mRes.ok) setMeta(await mRes.json())
    if (pRes.ok) {
      const p = await pRes.json()
      setProfile(p.profile ?? {})
      setContras(p.contraindications ?? [])
    }
    if (hRes.ok) {
      const list: L0BodyMetricFull[] = await hRes.json()
      setHistory(list)
      if (list.length > 0) { setSelectedId(list[0].id); setForm(list[0] as any) }
    }
    setLoading(false)
  }

  // ── 派生的界面状态 ────────────────────────────────────────
  const metaByColumn = useMemo(() => {
    const map: Record<string, L0FieldMeta> = {}
    for (const m of meta) if (m.column_name) map[m.column_name] = m
    return map
  }, [meta])

  /** 与上一次测量的对比。低于 MDC 的一律判为「基本持平」。 */
  const changes = useMemo(() => {
    if (selectedId === 'new' || !meta.length) return []
    const idx = history.findIndex(h => h.id === selectedId)
    if (idx < 0 || idx + 1 >= history.length) return []
    return diffMeasurements(history[idx + 1] as any, history[idx] as any, meta)
      .filter(c => c.previous !== null)
  }, [selectedId, history, meta])

  const notes = useMemo(
    () => referenceNotes(form as any, (profile.sex ?? null) as any),
    [form, profile.sex],
  )
  const bpGate = useMemo(
    () => bloodPressureGate(form.bp_systolic, form.bp_diastolic),
    [form.bp_systolic, form.bp_diastolic],
  )
  const completeness = useMemo(() => dataCompleteness(form, meta), [form, meta])

  // ── 操作 ──────────────────────────────────────────────────
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const selectRecord = (id: string | 'new') => {
    setSelectedId(id)
    if (id === 'new') setForm(emptyForm())
    else {
      const found = history.find(h => h.id === id)
      if (found) setForm(found as any)
    }
  }

  const setField = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value === '' ? null : value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = selectedId === 'new' ? '/api/l0/metrics' : `/api/l0/metrics/${selectedId}`
      const res = await fetch(url, {
        method: selectedId === 'new' ? 'POST' : 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedId === 'new' ? { ...form, client_id: clientId } : form),
      })
      if (!res.ok) { flash('保存失败：' + ((await res.json()).error ?? res.status)); return }
      const saved: L0BodyMetricFull = await res.json()
      setForm(saved as any)
      if (selectedId === 'new') {
        setHistory(prev => [saved, ...prev].sort((a, b) => b.measured_at.localeCompare(a.measured_at)))
        setSelectedId(saved.id)
      } else {
        setHistory(prev => prev.map(h => (h.id === saved.id ? saved : h)))
      }
      flash('已保存')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (selectedId === 'new') return
    if (!confirm('确定删除这条测量记录？')) return
    const res = await fetch(`/api/l0/metrics/${selectedId}`, { method: 'DELETE', headers })
    if (res.ok) {
      setHistory(prev => prev.filter(h => h.id !== selectedId))
      selectRecord('new')
      flash('已删除')
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/l0/profile/${clientId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (res.ok) { setProfile(await res.json()); flash('档案已保存') }
      else flash('档案保存失败')
    } finally { setSavingProfile(false) }
  }

  const addContra = async () => {
    const res = await fetch('/api/l0/contraindications', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: clientId, body_region: 'LUMBAR', condition_type: 'INJURY', status: 'ACTIVE',
      }),
    })
    if (!res.ok) { flash('添加失败'); return }
    const created: Contraindication = await res.json()
    setContras(prev => [created, ...prev])
  }

  const updateContra = async (id: string, patch: Partial<Contraindication>) => {
    setContras(prev => prev.map(c => (c.id === id ? { ...c, ...patch } as Contraindication : c)))
    await fetch('/api/l0/contraindications', {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
  }

  const removeContra = async (id: string) => {
    setContras(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/l0/contraindications?id=${id}`, { method: 'DELETE', headers })
  }

  const handlePhotoUpload = async (files: FileList) => {
    if (!files.length) return
    if (selectedId === 'new') { flash('请先保存记录，再上传照片'); return }
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/l0/metrics/${selectedId}/photos`, { method: 'POST', headers, body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setForm(prev => ({ ...prev, photo_urls: [...(prev.photo_urls || []), url] }))
      }
    }
    setUploading(false)
  }

  const handleDeletePhoto = async (url: string) => {
    if (selectedId === 'new') return
    await fetch(`/api/l0/metrics/${selectedId}/photos`, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setForm(prev => ({ ...prev, photo_urls: (prev.photo_urls || []).filter((u: string) => u !== url) }))
  }

  // ── 样式 ──────────────────────────────────────────────────
  const card = {
    background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
    borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)',
  } as const

  const inputStyle = (disabled?: boolean) => ({
    width: '100%', padding: '8px 10px',
    border: '1px solid var(--c-border)', borderRadius: 6,
    fontSize: 14, boxSizing: 'border-box' as const,
    background: disabled ? 'var(--c-fill-light)' : 'var(--c-card-bg)',
    color: disabled ? 'var(--c-text-secondary)' : 'var(--c-text-primary)',
  })

  const tabStyle = (active: boolean) => ({
    padding: '7px 12px', border: 'none', borderRadius: 'var(--r-sm)',
    background: active ? 'var(--c-brand)' : 'transparent',
    color: active ? '#fff' : 'var(--c-text-secondary)',
    fontSize: 13, fontWeight: active ? 600 : 400,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
  })

  const labelStyle = { display: 'block', fontSize: 12, color: '#999', marginBottom: 5 } as const
  const hintStyle = { fontSize: 10.5, color: '#b0b0b0', marginTop: 4, lineHeight: 1.45 } as const

  // ── 渲染工具 ──────────────────────────────────────────────
  const renderFields = (fields: L0FieldConfig[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
      {fields.map(f => {
        const m = metaByColumn[f.key]
        const disabled = isReadOnly || !!f.derived
        return (
          <div key={f.key}>
            <label style={labelStyle}>
              {f.label}{f.unit ? ` (${f.unit})` : ''}
              {f.derived && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--c-brand)' }}>自动派生</span>}
              {m?.field_id && <span style={{ marginLeft: 5, fontSize: 10, color: '#ccc' }}>{m.field_id}</span>}
            </label>
            <input
              type="number"
              step={f.step}
              value={form[f.key] ?? ''}
              onChange={e => setField(f.key, e.target.value === '' ? null : parseFloat(e.target.value))}
              disabled={disabled}
              style={inputStyle(disabled)}
              placeholder={f.derived ? '保存后自动计算' : '—'}
            />
            {f.hint && <div style={hintStyle}>{f.hint}</div>}
          </div>
        )
      })}
    </div>
  )

  const select = (
    value: any, onChange: (v: string) => void,
    options: Record<string, string>, disabled?: boolean,
  ) => (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={inputStyle(disabled)}
    >
      <option value="">—</option>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
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
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>身体测试</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            {clientInfo?.name}{clientInfo ? ' · ' : ''}L0 基础数据
          </div>
        </div>
        <div style={{ width: 60 }} />
      </header>

      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'var(--c-text-primary)', color: '#fff', padding: '8px 18px',
          borderRadius: 20, fontSize: 13,
        }}>{toast}</div>
      )}

      <main style={{
        padding: 'var(--sp-4)', maxWidth: 1040, margin: '0 auto',
        display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start',
      }}>
        {/* 左：测量历史 */}
        <div style={{ width: 170, flexShrink: 0 }}>
          <div style={{
            background: 'var(--c-card-bg)', border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px', borderBottom: '1px solid var(--c-border)',
              fontSize: 12, color: '#999', fontWeight: 500,
            }}>测量历史</div>

            {!isReadOnly && (
              <button
                onClick={() => selectRecord('new')}
                style={{
                  width: '100%', padding: '10px 12px', border: 'none', textAlign: 'left',
                  background: selectedId === 'new' ? 'var(--c-fill-mid)' : 'transparent',
                  color: selectedId === 'new' ? 'var(--c-brand)' : 'var(--c-text-primary)',
                  fontSize: 13, cursor: 'pointer', fontWeight: selectedId === 'new' ? 600 : 400,
                  borderBottom: '1px solid var(--c-border)',
                }}
              >＋ 新建测量</button>
            )}

            {history.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: 12, color: '#aaa', textAlign: 'center' }}>暂无记录</div>
            )}

            {history.map(h => (
              <button
                key={h.id}
                onClick={() => selectRecord(h.id)}
                style={{
                  width: '100%', padding: '9px 12px', border: 'none', textAlign: 'left',
                  background: selectedId === h.id ? 'var(--c-fill-mid)' : 'transparent',
                  color: selectedId === h.id ? 'var(--c-brand)' : 'var(--c-text-primary)',
                  fontSize: 13, cursor: 'pointer', fontWeight: selectedId === h.id ? 600 : 400,
                  borderBottom: '1px solid var(--c-border)',
                }}
              >
                <div>{h.measured_at}</div>
                <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 2 }}>
                  {h.test_tier}{h.device_type ? ` · ${DEVICE_TYPE_LABELS[h.device_type]}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右：表单 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 测量上下文 */}
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>测量日期</label>
                <input
                  type="date" value={(form.measured_at || '').slice(0, 10)}
                  onChange={e => setField('measured_at', e.target.value)}
                  disabled={isReadOnly} style={inputStyle(isReadOnly)}
                />
              </div>
              <div>
                <label style={labelStyle}>时间</label>
                <input
                  type="time" value={form.measured_time || ''}
                  onChange={e => setField('measured_time', e.target.value)}
                  disabled={isReadOnly} style={inputStyle(isReadOnly)}
                />
              </div>
              <div>
                <label style={labelStyle}>测试层级</label>
                {select(form.test_tier, v => setField('test_tier', v), TEST_TIER_LABELS, isReadOnly)}
              </div>
              <div>
                <label style={labelStyle}>采集方式</label>
                {select(form.device_type, v => setField('device_type', v), DEVICE_TYPE_LABELS, isReadOnly)}
              </div>
              <div>
                <label style={labelStyle}>测量条件</label>
                {select(form.measurement_context, v => setField('measurement_context', v), MEASUREMENT_CONTEXT_LABELS, isReadOnly)}
                <div style={hintStyle}>BIA 须固定条件测量，否则前后数据不可比</div>
              </div>
              <div>
                <label style={labelStyle}>设备型号（内部记录）</label>
                <input
                  type="text" value={form.device_model || ''}
                  onChange={e => setField('device_model', e.target.value)}
                  disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—"
                />
                <div style={hintStyle}>跨设备数据不可直接比较，换设备须重建基线</div>
              </div>
            </div>
          </div>

          {/* B19 血压安全闸 */}
          {bpGate.message && (
            <div style={{
              ...card,
              background: bpGate.blocked ? '#fff4f4' : '#fffaf0',
              borderColor: bpGate.blocked ? '#f0c0c0' : '#f0dfb8',
              fontSize: 13, lineHeight: 1.6, color: 'var(--c-text-primary)',
            }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>
                {bpGate.blocked ? '运动相对禁忌提示' : '血压提示'}
              </strong>
              {bpGate.message}
            </div>
          )}

          {/* 分组 tab */}
          <div style={{
            display: 'flex', gap: 5, marginBottom: 'var(--sp-3)', background: 'var(--c-fill-light)',
            padding: 4, borderRadius: 'var(--r-sm)', border: '1px solid var(--c-border)', overflowX: 'auto',
          }}>
            {TABS.map(t => (
              <button key={t.key} style={tabStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* 字段区 */}
          <div style={card}>
            {activeTab === 'basic' && renderFields(L0_BASIC_FIELDS)}

            {activeTab === 'composition' && renderFields(L0_COMPOSITION_FIELDS)}

            {activeTab === 'segmental' && (
              <>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 14, lineHeight: 1.6 }}>
                  四肢瘦组织之和即四肢骨骼肌量（ASM），是 SMI 的正确分子。
                  「体成分」页的四肢骨骼肌量留空时，保存后会自动用这四项求和填充。
                </div>
                {renderFields(L0_SEGMENTAL_FIELDS)}
                {(form.arm_asymmetry_pct != null || form.leg_asymmetry_pct != null) && (
                  <div style={{
                    marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--c-border)',
                    fontSize: 13, color: 'var(--c-text-secondary)',
                  }}>
                    左右差异：上肢 {form.arm_asymmetry_pct ?? '—'}% · 下肢 {form.leg_asymmetry_pct ?? '—'}%
                    <div style={hintStyle}>仅作事实记录，不构成任何伤病判断</div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'girth' && (
              <>
                <div style={{ marginBottom: 14, maxWidth: 260 }}>
                  <label style={labelStyle}>腰围测量位置</label>
                  {select(form.waist_landmark, v => setField('waist_landmark', v), WAIST_LANDMARK_LABELS, isReadOnly)}
                </div>
                {renderFields(L0_GIRTH_FIELDS)}
                <div style={{ marginTop: 14, maxWidth: 260 }}>
                  <label style={labelStyle}>设备估算腰臀比</label>
                  <input
                    type="number" step={0.01} value={form.whr_device ?? ''}
                    onChange={e => setField('whr_device', e.target.value === '' ? null : parseFloat(e.target.value))}
                    disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—"
                  />
                  <div style={hintStyle}>与软尺实测分开存放，两者不可混入同一条趋势线</div>
                </div>
              </>
            )}

            {activeTab === 'vitals' && (
              <>
                {renderFields(L0_VITALS_FIELDS)}
                <div style={{
                  marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--c-border)',
                  fontSize: 13, color: 'var(--c-text-secondary)', lineHeight: 1.7,
                }}>
                  {form.age_at_measurement != null && <div>测量时年龄：{form.age_at_measurement} 岁</div>}
                  {form.hr_max_effective != null && (
                    <div>
                      最大心率：{form.hr_max_effective} bpm
                      <span style={{ color: '#aaa', marginLeft: 6 }}>
                        （{form.hr_max_source === 'MEASURED' ? '实测' : 'Tanaka 公式估算'}）
                      </span>
                    </div>
                  )}
                  <div style={hintStyle}>
                    最大心率主要由年龄与遗传决定，几乎不可训练，不作为能力指标打分
                  </div>
                </div>
              </>
            )}

            {/* 档案与禁忌 */}
            {activeTab === 'profile' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>
                      性别 <span style={{ fontSize: 10, color: '#ccc' }}>B01</span>
                    </label>
                    {select(profile.sex, v => setProfile(p => ({ ...p, sex: (v || null) as any })), SEX_LABELS, isReadOnly)}
                    <div style={hintStyle}>体能常模按性别分层，缺此字段无法分级</div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      出生日期 <span style={{ fontSize: 10, color: '#ccc' }}>B02</span>
                    </label>
                    <input
                      type="date" value={profile.birth_date || ''}
                      onChange={e => setProfile(p => ({ ...p, birth_date: e.target.value || null }))}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)}
                    />
                    <div style={hintStyle}>存出生日期而非年龄，年龄由系统自动推算</div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      训练年限（年）<span style={{ fontSize: 10, color: '#ccc' }}>B21</span>
                    </label>
                    <input
                      type="number" step={0.5} value={profile.training_years ?? ''}
                      onChange={e => setProfile(p => ({
                        ...p, training_years: e.target.value === '' ? null : parseFloat(e.target.value),
                      }))}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—"
                    />
                    <div style={hintStyle}>力量分级的档位选择依据</div>
                  </div>
                </div>

                {/* 数据使用同意。条款须经律师定稿后方可正式启用 */}
                <div style={{
                  marginTop: 14, padding: 12, borderRadius: 8,
                  background: 'var(--c-fill-light)', border: '1px solid var(--c-border)',
                }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: isReadOnly ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!profile.data_use_consent}
                      onChange={e => setProfile(p => ({ ...p, data_use_consent: e.target.checked }))}
                      disabled={isReadOnly}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--c-text-primary)' }}>
                      会员已同意其去标识化的体测数据用于建立本店参考值
                      {profile.consent_at && (
                        <span style={{ color: '#aaa', marginLeft: 6 }}>
                          （{new Date(profile.consent_at).toLocaleDateString('zh-CN')} 同意）
                        </span>
                      )}
                    </span>
                  </label>
                  <div style={{ ...hintStyle, marginLeft: 22 }}>
                    默认不勾选。未勾选的会员数据只用于其本人的记录与趋势，不进入任何统计。
                    条款文本待法务定稿。
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>伤病史补充说明</label>
                  <textarea
                    value={profile.injury_notes || ''}
                    onChange={e => setProfile(p => ({ ...p, injury_notes: e.target.value }))}
                    disabled={isReadOnly} rows={2}
                    style={{ ...inputStyle(isReadOnly), resize: 'vertical' }}
                    placeholder="自由描述。结构化条目请用下方禁忌列表"
                  />
                </div>

                {!isReadOnly && (
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    style={{
                      marginTop: 12, padding: '9px 20px', background: 'var(--c-brand)', color: '#fff',
                      border: 'none', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >{savingProfile ? '保存中…' : '保存档案'}</button>
                )}

                {/* B22 运动禁忌 */}
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                      运动禁忌 <span style={{ fontSize: 10, color: '#ccc', fontWeight: 400 }}>B22</span>
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={addContra}
                        style={{
                          padding: '5px 12px', border: '1px solid var(--c-border-em)', borderRadius: 6,
                          background: 'var(--c-fill-light)', color: 'var(--c-brand)', cursor: 'pointer', fontSize: 12,
                        }}
                      >＋ 添加</button>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#b0b0b0', marginBottom: 12, lineHeight: 1.5 }}>
                    这些条目将作为动作库的硬过滤条件，而非仅作展示
                  </div>

                  {contras.length === 0 && (
                    <div style={{ padding: '16px 0', fontSize: 12.5, color: '#bbb', textAlign: 'center' }}>暂无记录</div>
                  )}

                  {contras.map(c => (
                    <div key={c.id} style={{
                      border: '1px solid var(--c-border)', borderRadius: 8,
                      padding: 12, marginBottom: 10, background: 'var(--c-fill-light)',
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>部位</label>
                          {select(c.body_region, v => updateContra(c.id, { body_region: v as any }), BODY_REGION_LABELS, isReadOnly)}
                        </div>
                        <div>
                          <label style={labelStyle}>侧</label>
                          {select(c.side, v => updateContra(c.id, { side: v as any }), SIDE_LABELS, isReadOnly)}
                        </div>
                        <div>
                          <label style={labelStyle}>类型</label>
                          {select(c.condition_type, v => updateContra(c.id, { condition_type: v as any }), CONDITION_TYPE_LABELS, isReadOnly)}
                        </div>
                        <div>
                          <label style={labelStyle}>程度</label>
                          {select(c.severity, v => updateContra(c.id, { severity: (v || null) as any }), SEVERITY_LABELS, isReadOnly)}
                        </div>
                        <div>
                          <label style={labelStyle}>状态</label>
                          {select(c.status, v => updateContra(c.id, { status: v as any }), CONTRA_STATUS_LABELS, isReadOnly)}
                        </div>
                        <div>
                          <label style={labelStyle}>发生日期</label>
                          <input
                            type="date" value={c.onset_date || ''}
                            onChange={e => updateContra(c.id, { onset_date: e.target.value || null })}
                            disabled={isReadOnly} style={inputStyle(isReadOnly)}
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <label style={labelStyle}>描述（事实陈述，不作医疗判断）</label>
                        <input
                          type="text" value={c.description || ''}
                          onChange={e => updateContra(c.id, { description: e.target.value })}
                          disabled={isReadOnly} style={inputStyle(isReadOnly)}
                          placeholder="例：2025 年腰椎间盘突出，医生建议避免负重脊柱屈曲"
                        />
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => removeContra(c.id)}
                          style={{
                            marginTop: 10, padding: '4px 10px', border: '1px solid #e0c0c0',
                            borderRadius: 5, background: 'transparent', color: '#c05050',
                            cursor: 'pointer', fontSize: 11.5,
                          }}
                        >删除</button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 与上次比较：MDC 判定 */}
          {activeTab !== 'profile' && changes.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--c-text-primary)' }}>
                与上一次测量比较
              </div>
              <div style={{ fontSize: 10.5, color: '#b0b0b0', marginBottom: 10, lineHeight: 1.5 }}>
                变化幅度低于「最小可信变化」的一律归为基本持平，不计入改善也不计入风险
              </div>
              {changes.map(c => (
                <div key={c.column_name} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '7px 0', borderTop: '1px solid var(--c-border)',
                  fontSize: 12.5, lineHeight: 1.6,
                }}>
                  <span style={{
                    flexShrink: 0, marginTop: 2, padding: '1px 7px', borderRadius: 4, fontSize: 10.5,
                    background: c.verdict === 'IMPROVED' ? '#e8f5e9'
                      : c.verdict === 'DECLINED' ? '#fff0f0' : 'var(--c-fill-mid)',
                    color: c.verdict === 'IMPROVED' ? '#2e7d32'
                      : c.verdict === 'DECLINED' ? '#c05050' : '#888',
                  }}>
                    {c.verdict === 'IMPROVED' ? '改善' : c.verdict === 'DECLINED' ? '下降' : '基本持平'}
                  </span>
                  <span style={{ color: 'var(--c-text-secondary)' }}>{c.statement}</span>
                </div>
              ))}
            </div>
          )}

          {/* 参考区间 */}
          {activeTab !== 'profile' && notes.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--c-text-primary)' }}>
                参考区间
              </div>
              {notes.map((n, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--c-border)',
                  fontSize: 12.5, lineHeight: 1.65,
                  color: n.level === 'attention' ? '#a06030' : 'var(--c-text-secondary)',
                }}>
                  <span style={{
                    flexShrink: 0, marginTop: 2, padding: '1px 6px', borderRadius: 4, fontSize: 10,
                    background: n.source === 'consensus' ? 'var(--c-fill-mid)' : 'transparent',
                    border: n.source === 'consensus' ? 'none' : '1px solid var(--c-border)',
                    color: '#999', whiteSpace: 'nowrap',
                  }}>
                    {n.source === 'consensus' ? '共识切点' : '行业参考'}
                  </span>
                  <span>{n.text}</span>
                </div>
              ))}
              <div style={{
                fontSize: 10.5, color: '#b0b0b0', marginTop: 12, paddingTop: 10,
                borderTop: '1px solid var(--c-border)', lineHeight: 1.6,
              }}>
                「共识切点」来自 WHO、AWGS 2019、中国标准等共识文件。<br />
                「行业参考」是体适能领域与体成分设备的常用经验区间，各家来源之间差异较大，
                只用于说明数值落在哪一档，不是诊断标准。<br />
                以上均为参考区间的事实对照，不构成任何诊断或健康判断。
              </div>
            </div>
          )}

          {/* 数据完整度 */}
          {activeTab !== 'profile' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>数据完整度</span>
                <span style={{ fontSize: 13, color: 'var(--c-brand)', fontWeight: 600 }}>
                  {completeness.filled}/{completeness.total}（{completeness.pct}%）
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--c-fill-mid)', overflow: 'hidden' }}>
                <div style={{ width: `${completeness.pct}%`, height: '100%', background: 'var(--c-brand)' }} />
              </div>
              {completeness.missing.length > 0 && (
                <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 10, lineHeight: 1.6 }}>
                  待补充：{completeness.missing.join('、')}
                </div>
              )}
            </div>
          )}

          {/* 备注 */}
          {activeTab !== 'profile' && (
            <div style={card}>
              <label style={labelStyle}>备注</label>
              <textarea
                value={form.notes || ''}
                onChange={e => setField('notes', e.target.value)}
                disabled={isReadOnly} rows={2}
                placeholder="记录状态、特殊情况等…"
                style={{ ...inputStyle(isReadOnly), resize: 'vertical' }}
              />
            </div>
          )}

          {/* 照片 */}
          {activeTab !== 'profile' && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>照片 / 设备报告</span>
                {!isReadOnly && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '6px 14px', border: '1px solid var(--c-border-em)', borderRadius: 6,
                      background: 'var(--c-fill-light)', color: 'var(--c-brand)', cursor: 'pointer', fontSize: 13,
                    }}
                  >{uploading ? '上传中…' : '上传'}</button>
                )}
                <input
                  ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => e.target.files && handlePhotoUpload(e.target.files)}
                />
              </div>
              {(form.photo_urls || []).length === 0 ? (
                <div style={{ padding: '18px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>还没有照片</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {(form.photo_urls || []).map((url: string, i: number) => (
                    <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                      <img
                        src={url} alt=""
                        style={{
                          width: 90, height: 90, objectFit: 'cover', borderRadius: 8,
                          border: '1px solid var(--c-border)', cursor: 'pointer',
                        }}
                        onClick={() => window.open(url, '_blank')}
                      />
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeletePhoto(url)}
                          style={{
                            position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                            background: '#e53935', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 保存 */}
          {!isReadOnly && activeTab !== 'profile' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '13px', background: saving ? 'var(--c-lavender)' : 'var(--c-brand)',
                  color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
                  fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >{saving ? '保存中…' : selectedId === 'new' ? '创建测量记录' : '保存更改'}</button>
              {selectedId !== 'new' && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '13px 20px', background: 'transparent', color: '#c05050',
                    border: '1px solid #e0c0c0', borderRadius: 'var(--r-md)',
                    fontSize: 14, cursor: 'pointer',
                  }}
                >删除</button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
