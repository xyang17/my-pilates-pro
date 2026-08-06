'use client'

// ============================================================
// 身体测试 · L0 基础数据层
//
// 两种模式：
//   report —— 默认。像一份正式报告，可打印 / 存 PDF。给会员看的。
//   edit   —— 点「编辑」进入。一页到底的表单，不分 tab。
//
// 文案原则：这一页会员会看到，一律说人话。
// 内部字段编号（B03 之类）、测量学告诫只在编辑模式出现。
// 本层不打分、不评级，只记录事实与趋势。
// ============================================================

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BODY_REGION_LABELS, CONDITION_TYPE_LABELS, CONTRA_STATUS_LABELS,
  DEVICE_TYPE_LABELS, REPORT_BRAND,
  L0_BASIC_FIELDS, L0_COMPOSITION_FIELDS, L0_GIRTH_FIELDS,
  L0_SEGMENTAL_FIELDS, L0_VITALS_FIELDS, MEASUREMENT_CONTEXT_LABELS,
  SEVERITY_LABELS, SEX_LABELS, SIDE_LABELS, TEST_TIER_LABELS, WAIST_LANDMARK_LABELS,
  bloodPressureGate, dataCompleteness, diffMeasurements, referenceNotes,
  type L0FieldConfig,
} from '@/lib/l0'
import type {
  ClientProfile, Contraindication, L0BodyMetricFull, L0FieldMeta,
} from '@/types/l0'

interface ClientInfo { id: string; name: string; email: string; photo_url?: string }

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

/** 报告里的分节。围度里的腰臀比等派生值也一并展示。 */
const REPORT_SECTIONS: { title: string; fields: L0FieldConfig[] }[] = [
  { title: '基础', fields: L0_BASIC_FIELDS },
  { title: '身体成分', fields: L0_COMPOSITION_FIELDS },
  { title: '节段分析', fields: L0_SEGMENTAL_FIELDS },
  { title: '围度', fields: L0_GIRTH_FIELDS },
  { title: '生理基线', fields: L0_VITALS_FIELDS },
]

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
  const [mode, setMode] = useState<'report' | 'edit'>('edit')
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 在 effect 里取当天日期，避免服务端渲染与客户端不一致
  const [printedOn, setPrintedOn] = useState('')
  useEffect(() => { setPrintedOn(new Date().toLocaleDateString('zh-CN')) }, [])

  /** 会员是自己数据的第一责任人，本人始终可写自己的。 */
  const isSelf = !!user?.id && user.id === clientId
  /** 教练与管理员可代任何会员填写。 */
  const isReadOnly = userRole === 'CLIENT' && !isSelf

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
      if (list.length > 0) {
        setSelectedId(list[0].id); setForm(list[0] as any); setMode('report')
      }
    }
    setLoading(false)
  }

  // ── 派生的界面状态 ────────────────────────────────────────
  const metaByColumn = useMemo(() => {
    const map: Record<string, L0FieldMeta> = {}
    for (const m of meta) if (m.column_name) map[m.column_name] = m
    return map
  }, [meta])

  /** 与上一次测量的对比。低于最小可信变化的一律判为「基本持平」。 */
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
  const goodPoints = notes.filter(n => n.tone === 'good')
  const watchPoints = notes.filter(n => n.tone === 'watch')

  const bpGate = useMemo(
    () => bloodPressureGate(form.bp_systolic, form.bp_diastolic),
    [form.bp_systolic, form.bp_diastolic],
  )
  const completeness = useMemo(() => dataCompleteness(form, meta), [form, meta])

  const prevRecord = useMemo(() => {
    const idx = history.findIndex(h => h.id === selectedId)
    return idx >= 0 && idx + 1 < history.length ? history[idx + 1] : null
  }, [history, selectedId])

  // ── 操作 ──────────────────────────────────────────────────
  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const selectRecord = (id: string | 'new') => {
    setSelectedId(id)
    if (id === 'new') { setForm(emptyForm()); setMode('edit') }
    else {
      const found = history.find(h => h.id === id)
      if (found) { setForm(found as any); setMode('report') }
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
      setMode('report')
      flash('已保存')
    } finally { setSaving(false) }
  }

  const handleCancelEdit = () => {
    if (selectedId === 'new') {
      if (history.length) selectRecord(history[0].id)
      else setForm(emptyForm())
    } else {
      const found = history.find(h => h.id === selectedId)
      if (found) setForm(found as any)
      setMode('report')
    }
  }

  const handleDelete = async () => {
    if (selectedId === 'new') return
    if (!confirm('确定删除这条测量记录？')) return
    const res = await fetch(`/api/l0/metrics/${selectedId}`, { method: 'DELETE', headers })
    if (res.ok) {
      const rest = history.filter(h => h.id !== selectedId)
      setHistory(rest)
      if (rest.length) selectRecord(rest[0].id); else selectRecord('new')
      flash('已删除')
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      // 同意字段只在本人操作时提交，教练代填时不携带
      const { data_use_consent, consent_version, ...rest } = profile
      const res = await fetch(`/api/l0/profile/${clientId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(isSelf ? profile : rest),
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

  const labelStyle = { display: 'block', fontSize: 12, color: '#999', marginBottom: 5 } as const
  const hintStyle = { fontSize: 10.5, color: '#b0b0b0', marginTop: 4, lineHeight: 1.45 } as const
  const sectionTitle = {
    fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)',
    margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--c-border)',
  } as const

  const btn = (primary?: boolean) => ({
    padding: '8px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer',
    border: primary ? 'none' : '1px solid var(--c-border-em)',
    background: primary ? 'var(--c-brand)' : 'var(--c-card-bg)',
    color: primary ? '#fff' : 'var(--c-text-secondary)',
  })

  // ── 编辑模式的字段渲染 ────────────────────────────────────
  const renderFields = (fields: L0FieldConfig[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
      {fields.map(f => {
        const disabled = isReadOnly || !!f.derived
        return (
          <div key={f.key}>
            <label style={labelStyle}>
              {f.label}{f.unit ? ` (${f.unit})` : ''}
              {f.derived && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--c-brand)' }}>自动</span>}
            </label>
            <input
              type="number" step={f.step} value={form[f.key] ?? ''}
              onChange={e => setField(f.key, e.target.value === '' ? null : parseFloat(e.target.value))}
              disabled={disabled} style={inputStyle(disabled)}
              placeholder={f.derived ? '自动计算' : '—'}
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
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      disabled={disabled} style={inputStyle(disabled)}>
      <option value="">—</option>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  )

  // ── 报告模式的字段渲染（只显示填了的）────────────────────
  const reportRows = (fields: L0FieldConfig[]) =>
    fields.filter(f => form[f.key] != null && form[f.key] !== '')

  const ReportSection = ({ title, fields }: { title: string; fields: L0FieldConfig[] }) => {
    const rows = reportRows(fields)
    if (!rows.length) return null
    return (
      <div style={{ marginBottom: 22, breakInside: 'avoid' }}>
        <h3 style={sectionTitle}>{title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px 20px' }}>
          {rows.map(f => (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: 'var(--c-text-secondary)' }}>{f.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', whiteSpace: 'nowrap' }}>
                {form[f.key]}
                {f.unit && <span style={{ fontSize: 11, fontWeight: 400, color: '#aaa', marginLeft: 2 }}>{f.unit}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (authLoading || loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>加载中…</div>
  }

  const age = form.age_at_measurement
  const profileIncomplete = !profile.sex || !profile.birth_date

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* 打印时只保留报告本体 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #l0-report, #l0-report * { visibility: visible !important; }
          #l0-report {
            position: absolute !important; left: 0; top: 0; width: 100% !important;
            margin: 0 !important; padding: 0 24px !important;
            border: none !important; box-shadow: none !important; background: #fff !important;
          }
          .no-print { display: none !important; }
          @page { margin: 14mm; }
        }
        /* 窄屏：历史列表从左侧竖栏改成顶部横向滚动条，把宽度让给内容 */
        @media (max-width: 760px) {
          #l0-main { flex-direction: column; gap: 12px; padding: 12px; }
          #l0-history { width: 100% !important; }
          #l0-history-list { display: flex; overflow-x: auto; }
          #l0-history-list > button {
            width: auto !important; min-width: 106px; flex-shrink: 0;
            border-bottom: none !important; border-right: 1px solid var(--c-border);
          }
          #l0-history-title { display: none; }
        }
      `}</style>

      <header className="no-print" style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href={isReadOnly || isSelf ? '/dashboard/profile' : '/dashboard/assessments'}
          style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>身体测试</div>
        <div style={{ width: 60 }} />
      </header>

      {toast && (
        <div className="no-print" style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
          background: 'var(--c-text-primary)', color: '#fff', padding: '8px 18px',
          borderRadius: 20, fontSize: 13,
        }}>{toast}</div>
      )}

      <main id="l0-main" style={{
        padding: 'var(--sp-4)', maxWidth: 1040, margin: '0 auto',
        display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start',
      }}>
        {/* 左：测量历史（窄屏时移到顶部横向滚动） */}
        <div id="l0-history" className="no-print" style={{ width: 170, flexShrink: 0 }}>
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div id="l0-history-title" style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border)', fontSize: 12, color: '#999', fontWeight: 500 }}>
              测量历史
            </div>
            <div id="l0-history-list">
            {!isReadOnly && (
              <button onClick={() => selectRecord('new')} style={{
                width: '100%', padding: '10px 12px', border: 'none', textAlign: 'left',
                background: selectedId === 'new' ? 'var(--c-fill-mid)' : 'transparent',
                color: selectedId === 'new' ? 'var(--c-brand)' : 'var(--c-text-primary)',
                fontSize: 13, cursor: 'pointer', fontWeight: selectedId === 'new' ? 600 : 400,
                borderBottom: '1px solid var(--c-border)',
              }}>＋ 新建测量</button>
            )}
            {history.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: 12, color: '#aaa', textAlign: 'center' }}>暂无记录</div>
            )}
            {history.map(h => (
              <button key={h.id} onClick={() => selectRecord(h.id)} style={{
                width: '100%', padding: '9px 12px', border: 'none', textAlign: 'left',
                background: selectedId === h.id ? 'var(--c-fill-mid)' : 'transparent',
                color: selectedId === h.id ? 'var(--c-brand)' : 'var(--c-text-primary)',
                fontSize: 13, cursor: 'pointer', fontWeight: selectedId === h.id ? 600 : 400,
                borderBottom: '1px solid var(--c-border)',
              }}>
                <div>{h.measured_at}</div>
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>
                  {h.recorded_by === h.client_id ? '本人录入' : '教练代录'}
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ═══════════ 报告模式 ═══════════ */}
          {mode === 'report' && (
            <>
              <div className="no-print" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
                <button onClick={() => window.print()} style={btn()}>打印 / 存为 PDF</button>
                {!isReadOnly && <button onClick={() => setMode('edit')} style={btn(true)}>编辑</button>}
              </div>

              <div id="l0-report" style={card}>
                {/* 报告头 */}
                <div style={{ paddingBottom: 16, marginBottom: 20, borderBottom: '2px solid var(--c-brand)' }}>
                  {/* 署名。将来有 logo 就在这里加 <img src={REPORT_BRAND.logoUrl} /> */}
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--c-brand)',
                    letterSpacing: 0.5, marginBottom: 8,
                  }}>{REPORT_BRAND.name}</div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                    身体成分测试报告
                  </h1>
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--c-text-secondary)', lineHeight: 1.8 }}>
                    <div>
                      <strong style={{ color: 'var(--c-text-primary)' }}>{clientInfo?.name}</strong>
                      {profile.sex && ` · ${SEX_LABELS[profile.sex]}`}
                      {age != null && ` · ${age} 岁`}
                    </div>
                    <div>测量日期：{form.measured_at}{form.measured_time ? ` ${String(form.measured_time).slice(0, 5)}` : ''}</div>
                    {(form.device_type || form.measurement_context !== 'UNKNOWN') && (
                      <div style={{ fontSize: 12, color: '#aaa' }}>
                        {form.device_type ? DEVICE_TYPE_LABELS[form.device_type as keyof typeof DEVICE_TYPE_LABELS] : ''}
                        {form.measurement_context && form.measurement_context !== 'UNKNOWN'
                          ? ` · ${MEASUREMENT_CONTEXT_LABELS[form.measurement_context as keyof typeof MEASUREMENT_CONTEXT_LABELS]}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* 小结 */}
                {(goodPoints.length > 0 || watchPoints.length > 0) && (
                  <div style={{ marginBottom: 24, breakInside: 'avoid' }}>
                    <h3 style={sectionTitle}>这次的情况</h3>

                    {goodPoints.length > 0 && (
                      <div style={{ marginBottom: watchPoints.length ? 16 : 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#2e7d32', marginBottom: 8 }}>做得好的</div>
                        {goodPoints.map((n, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, breakInside: 'avoid' }}>
                            <span style={{ color: '#2e7d32', flexShrink: 0 }}>✓</span>
                            <div>
                              <div style={{ fontSize: 13.5, color: 'var(--c-text-primary)' }}>{n.text}</div>
                              <div style={{ fontSize: 11.5, color: '#aaa', lineHeight: 1.6, marginTop: 2 }}>{n.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {watchPoints.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#a06030', marginBottom: 8 }}>可以留意的</div>
                        {watchPoints.map((n, i) => (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, breakInside: 'avoid' }}>
                            <span style={{ color: '#a06030', flexShrink: 0 }}>·</span>
                            <div>
                              <div style={{ fontSize: 13.5, color: 'var(--c-text-primary)' }}>{n.text}</div>
                              <div style={{ fontSize: 11.5, color: '#aaa', lineHeight: 1.6, marginTop: 2 }}>{n.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 血压提示 */}
                {bpGate.message && (
                  <div style={{
                    marginBottom: 24, padding: 12, borderRadius: 8, fontSize: 12.5, lineHeight: 1.7,
                    background: bpGate.blocked ? '#fff4f4' : '#fffaf0',
                    border: `1px solid ${bpGate.blocked ? '#f0c0c0' : '#f0dfb8'}`,
                    breakInside: 'avoid',
                  }}>{bpGate.message}</div>
                )}

                {/* 与上次比较 */}
                {changes.length > 0 && (
                  <div style={{ marginBottom: 24, breakInside: 'avoid' }}>
                    <h3 style={sectionTitle}>和上次比（{prevRecord?.measured_at}）</h3>
                    {changes.map(c => (
                      <div key={c.column_name} style={{
                        display: 'flex', gap: 10, alignItems: 'baseline',
                        padding: '5px 0', fontSize: 12.5, lineHeight: 1.6,
                      }}>
                        <span style={{ minWidth: 92, color: 'var(--c-text-secondary)' }}>{c.name_zh}</span>
                        <span style={{ minWidth: 110, color: 'var(--c-text-primary)' }}>
                          {c.previous} → {c.current}
                        </span>
                        <span style={{
                          padding: '1px 7px', borderRadius: 4, fontSize: 11,
                          background: c.verdict === 'IMPROVED' ? '#e8f5e9'
                            : c.verdict === 'DECLINED' ? '#fff0f0' : 'var(--c-fill-mid)',
                          color: c.verdict === 'IMPROVED' ? '#2e7d32'
                            : c.verdict === 'DECLINED' ? '#c05050' : '#888',
                        }}>
                          {c.verdict === 'IMPROVED' ? '改善' : c.verdict === 'DECLINED' ? '下降' : '基本持平'}
                        </span>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: '#b0b0b0', marginTop: 8, lineHeight: 1.6 }}>
                      标「基本持平」是因为变化幅度还在仪器的正常误差范围内，不算真的变了。
                    </div>
                  </div>
                )}

                {/* 数据分节 */}
                {REPORT_SECTIONS.map(s => <ReportSection key={s.title} title={s.title} fields={s.fields} />)}

                {/* 左右对称性 */}
                {(form.arm_asymmetry_pct != null || form.leg_asymmetry_pct != null) && (
                  <div style={{ marginBottom: 22, breakInside: 'avoid' }}>
                    <h3 style={sectionTitle}>左右差异</h3>
                    <div style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>
                      上肢 {form.arm_asymmetry_pct ?? '—'}% · 下肢 {form.leg_asymmetry_pct ?? '—'}%
                    </div>
                  </div>
                )}

                {/* 备注 */}
                {form.notes && (
                  <div style={{ marginBottom: 22, breakInside: 'avoid' }}>
                    <h3 style={sectionTitle}>备注</h3>
                    <div style={{ fontSize: 13, color: 'var(--c-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {form.notes}
                    </div>
                  </div>
                )}

                {/* 照片 */}
                {(form.photo_urls || []).length > 0 && (
                  <div style={{ marginBottom: 22 }}>
                    <h3 style={sectionTitle}>照片 / 设备报告</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {(form.photo_urls || []).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" onClick={() => window.open(url, '_blank')}
                          style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--c-border)', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 页脚 */}
                <div style={{
                  marginTop: 28, paddingTop: 14, borderTop: '1px solid var(--c-border)',
                  fontSize: 10.5, color: '#b0b0b0', lineHeight: 1.7,
                }}>
                  本报告记录的是测量结果与参考范围的对照，不是医学诊断。如对某项数值有疑问，请咨询医生或专业人士。<br />
                  体成分类数值单次测量存在正常波动，观察一段时间的趋势比看单次结果更可靠。
                  <div style={{ marginTop: 8, color: '#c5c5c5' }}>
                    {REPORT_BRAND.name}
                    {printedOn && ` · 报告生成于 ${printedOn}`}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══════════ 编辑模式 ═══════════ */}
          {mode === 'edit' && (
            <>
              {profileIncomplete && (
                <div style={{ ...card, background: '#fffaf0', borderColor: '#f0dfb8', fontSize: 12.5, lineHeight: 1.7 }}>
                  下面的「会员档案」还缺性别或出生日期。不填的话，年龄、最大心率、肌肉指数的参考对照都出不来。
                </div>
              )}

              {/* 会员档案 */}
              <div style={card}>
                <h3 style={sectionTitle}>会员档案</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>性别</label>
                    {select(profile.sex, v => setProfile(p => ({ ...p, sex: (v || null) as any })), SEX_LABELS, isReadOnly)}
                  </div>
                  <div>
                    <label style={labelStyle}>出生日期</label>
                    <input type="date" value={profile.birth_date || ''}
                      onChange={e => setProfile(p => ({ ...p, birth_date: e.target.value || null }))}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} />
                  </div>
                  <div>
                    <label style={labelStyle}>训练年限（年）</label>
                    <input type="number" step={0.5} value={profile.training_years ?? ''}
                      onChange={e => setProfile(p => ({ ...p, training_years: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—" />
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'var(--c-fill-light)', border: '1px solid var(--c-border)' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: isSelf ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={!!profile.data_use_consent}
                      onChange={e => setProfile(p => ({ ...p, data_use_consent: e.target.checked }))}
                      disabled={!isSelf} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--c-text-primary)' }}>
                      {isSelf ? '我同意' : '会员已同意'}将去掉个人信息的体测数据用于建立本店参考值
                      {profile.consent_at && (
                        <span style={{ color: '#aaa', marginLeft: 6 }}>
                          （{new Date(profile.consent_at).toLocaleDateString('zh-CN')} 同意）
                        </span>
                      )}
                    </span>
                  </label>
                  <div style={{ ...hintStyle, marginLeft: 22 }}>
                    {isSelf
                      ? '不勾选不影响你自己的记录和趋势，只是不进入统计。可以随时取消。'
                      : '只能由会员本人在自己账号里勾选，教练与管理员不可代办。'}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>伤病史补充说明</label>
                  <textarea value={profile.injury_notes || ''}
                    onChange={e => setProfile(p => ({ ...p, injury_notes: e.target.value }))}
                    disabled={isReadOnly} rows={2}
                    style={{ ...inputStyle(isReadOnly), resize: 'vertical' }}
                    placeholder="自由描述。具体条目请用下方的运动禁忌" />
                </div>

                {/* 运动禁忌 */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>运动禁忌</span>
                    {!isReadOnly && <button onClick={addContra} style={btn()}>＋ 添加</button>}
                  </div>
                  {contras.length === 0 && (
                    <div style={{ padding: '14px 0', fontSize: 12.5, color: '#bbb', textAlign: 'center' }}>暂无记录</div>
                  )}
                  {contras.map(c => (
                    <div key={c.id} style={{ border: '1px solid var(--c-border)', borderRadius: 8, padding: 12, marginBottom: 10, background: 'var(--c-fill-light)' }}>
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
                          <input type="date" value={c.onset_date || ''}
                            onChange={e => updateContra(c.id, { onset_date: e.target.value || null })}
                            disabled={isReadOnly} style={inputStyle(isReadOnly)} />
                        </div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <label style={labelStyle}>说明</label>
                        <input type="text" value={c.description || ''}
                          onChange={e => updateContra(c.id, { description: e.target.value })}
                          disabled={isReadOnly} style={inputStyle(isReadOnly)}
                          placeholder="例：2025 年腰椎间盘突出，医生建议避免负重弯腰" />
                      </div>
                      {!isReadOnly && (
                        <button onClick={() => removeContra(c.id)} style={{
                          marginTop: 10, padding: '4px 10px', border: '1px solid #e0c0c0',
                          borderRadius: 5, background: 'transparent', color: '#c05050',
                          cursor: 'pointer', fontSize: 11.5,
                        }}>删除</button>
                      )}
                    </div>
                  ))}
                </div>

                {!isReadOnly && (
                  <button onClick={handleSaveProfile} disabled={savingProfile}
                    style={{ ...btn(true), marginTop: 14 }}>
                    {savingProfile ? '保存中…' : '保存档案'}
                  </button>
                )}
              </div>

              {/* 本次测量 */}
              <div style={card}>
                <h3 style={sectionTitle}>本次测量</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>测量日期</label>
                    <input type="date" value={(form.measured_at || '').slice(0, 10)}
                      onChange={e => setField('measured_at', e.target.value)}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} />
                  </div>
                  <div>
                    <label style={labelStyle}>时间</label>
                    <input type="time" value={form.measured_time || ''}
                      onChange={e => setField('measured_time', e.target.value)}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} />
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
                    <div style={hintStyle}>条件固定前后才可比</div>
                  </div>
                  <div>
                    <label style={labelStyle}>设备型号</label>
                    <input type="text" value={form.device_model || ''}
                      onChange={e => setField('device_model', e.target.value)}
                      disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—" />
                    <div style={hintStyle}>换设备须重建基线</div>
                  </div>
                </div>
              </div>

              {/* 各组字段，一页到底 */}
              <div style={card}><h3 style={sectionTitle}>基础</h3>{renderFields(L0_BASIC_FIELDS)}</div>
              <div style={card}><h3 style={sectionTitle}>身体成分</h3>{renderFields(L0_COMPOSITION_FIELDS)}</div>
              <div style={card}>
                <h3 style={sectionTitle}>节段分析</h3>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 14, lineHeight: 1.6 }}>
                  四肢之和就是四肢骨骼肌量。上面那一项留空的话，保存后会自动用这四项算出来。
                </div>
                {renderFields(L0_SEGMENTAL_FIELDS)}
              </div>
              <div style={card}>
                <h3 style={sectionTitle}>围度</h3>
                <div style={{ marginBottom: 14, maxWidth: 260 }}>
                  <label style={labelStyle}>腰围测量位置</label>
                  {select(form.waist_landmark, v => setField('waist_landmark', v), WAIST_LANDMARK_LABELS, isReadOnly)}
                </div>
                {renderFields(L0_GIRTH_FIELDS)}
                <div style={{ marginTop: 14, maxWidth: 260 }}>
                  <label style={labelStyle}>设备估算腰臀比</label>
                  <input type="number" step={0.01} value={form.whr_device ?? ''}
                    onChange={e => setField('whr_device', e.target.value === '' ? null : parseFloat(e.target.value))}
                    disabled={isReadOnly} style={inputStyle(isReadOnly)} placeholder="—" />
                  <div style={hintStyle}>与软尺实测分开存，不混在同一条趋势里</div>
                </div>
              </div>
              <div style={card}>
                <h3 style={sectionTitle}>生理基线</h3>
                {renderFields(L0_VITALS_FIELDS)}
                {form.hr_max_effective != null && (
                  <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--c-text-secondary)' }}>
                    最大心率 {form.hr_max_effective} bpm
                    <span style={{ color: '#aaa', marginLeft: 6 }}>
                      （{form.hr_max_source === 'MEASURED' ? '实测' : '按年龄估算'}）
                    </span>
                  </div>
                )}
              </div>

              {/* 数据完整度 —— 操作提示，只在编辑时看 */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>数据完整度</span>
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

              {/* 备注 */}
              <div style={card}>
                <label style={labelStyle}>备注</label>
                <textarea value={form.notes || ''} onChange={e => setField('notes', e.target.value)}
                  disabled={isReadOnly} rows={2} placeholder="记录状态、特殊情况等…"
                  style={{ ...inputStyle(isReadOnly), resize: 'vertical' }} />
              </div>

              {/* 照片 */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>照片 / 设备报告</span>
                  {!isReadOnly && (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} style={btn()}>
                      {uploading ? '上传中…' : '上传'}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => e.target.files && handlePhotoUpload(e.target.files)} />
                </div>
                {(form.photo_urls || []).length === 0 ? (
                  <div style={{ padding: '18px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>还没有照片</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {(form.photo_urls || []).map((url: string, i: number) => (
                      <div key={i} style={{ position: 'relative', width: 90, height: 90 }}>
                        <img src={url} alt="" onClick={() => window.open(url, '_blank')}
                          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--c-border)', cursor: 'pointer' }} />
                        {!isReadOnly && (
                          <button onClick={() => handleDeletePhoto(url)} style={{
                            position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                            background: '#e53935', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                          }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作 */}
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleSave} disabled={saving} style={{
                    flex: 1, padding: '13px', background: saving ? 'var(--c-lavender)' : 'var(--c-brand)',
                    color: '#fff', border: 'none', borderRadius: 'var(--r-md)',
                    fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  }}>
                    {saving ? '保存中…' : selectedId === 'new' ? '保存并生成报告' : '保存更改'}
                  </button>
                  {(selectedId !== 'new' || history.length > 0) && (
                    <button onClick={handleCancelEdit} style={{ ...btn(), padding: '13px 20px' }}>取消</button>
                  )}
                  {selectedId !== 'new' && (
                    <button onClick={handleDelete} style={{
                      padding: '13px 20px', background: 'transparent', color: '#c05050',
                      border: '1px solid #e0c0c0', borderRadius: 'var(--r-md)', fontSize: 14, cursor: 'pointer',
                    }}>删除</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
