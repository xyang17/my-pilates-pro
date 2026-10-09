'use client'

import { useState } from 'react'

// 生理周期记录列表：查看 / 就地修改 / 删除。
// 三个地方共用：学员「我的主页」、教练看学员的「生理周期」页签、教练自己的「我的训练 → 生理周期」。
// 读写都走 /api/cycle-logs（本人或教练/管理员可改）。填错了点「改」就能当场改。

export interface CycleLog {
  id: string
  start_date: string
  end_date?: string | null
  flow_level?: string | null
  pain_level?: string | null
  notes?: string | null
}

export const FLOW_LABELS: Record<string, string> = { LIGHT: '量少', MEDIUM: '量中', HEAVY: '量多' }
export const PAIN_LABELS: Record<string, string> = { NONE: '无痛感', MILD: '轻微', MODERATE: '中等', SEVERE: '严重' }

const tt = (t: ((zh: string, en: string) => string) | undefined, zh: string, en: string) => (t ? t(zh, en) : zh)

const input: React.CSSProperties = {
  width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: '#fff',
}
const label: React.CSSProperties = { display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

// 一条记录的编辑表单（放在组件外面，输入时不会丢焦点）
function EditForm({ log, headers, t, onSaved, onCancel }: {
  log: CycleLog
  headers: Record<string, string>
  t?: (zh: string, en: string) => string
  onSaved: (updated: CycleLog) => void
  onCancel: () => void
}) {
  const [f, setF] = useState({
    start_date: log.start_date || '',
    end_date: log.end_date || '',
    flow_level: log.flow_level || '',
    pain_level: log.pain_level || '',
    notes: log.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    if (saving) return
    if (!f.start_date) { setErr(tt(t, '开始日期不能空', 'Start date is required')); return }
    if (f.end_date && f.end_date < f.start_date) { setErr(tt(t, '结束日期不能早于开始日期', 'End date is before start date')); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/cycle-logs/${log.id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || tt(t, '保存失败', 'Save failed'))
      onSaved(data)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 12, margin: '6px 0', background: 'var(--c-fill-light)', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={label}>{tt(t, '开始日期 *', 'Start date *')}</label>
          <input type="date" value={f.start_date} onChange={e => setF(p => ({ ...p, start_date: e.target.value }))} style={input} />
        </div>
        <div>
          <label style={label}>{tt(t, '结束日期', 'End date')}</label>
          <input type="date" value={f.end_date} min={f.start_date || undefined} onChange={e => setF(p => ({ ...p, end_date: e.target.value }))} style={input} />
        </div>
        <div>
          <label style={label}>{tt(t, '流量', 'Flow')}</label>
          <select value={f.flow_level} onChange={e => setF(p => ({ ...p, flow_level: e.target.value }))} style={input}>
            <option value="">{tt(t, '不记录', 'Skip')}</option>
            {Object.entries(FLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>{tt(t, '痛经程度', 'Pain level')}</label>
          <select value={f.pain_level} onChange={e => setF(p => ({ ...p, pain_level: e.target.value }))} style={input}>
            <option value="">{tt(t, '不记录', 'Skip')}</option>
            {Object.entries(PAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <label style={label}>{tt(t, '备注', 'Notes')}</label>
      <textarea rows={2} value={f.notes} onChange={e => setF(p => ({ ...p, notes: e.target.value }))}
        style={{ ...input, resize: 'vertical', marginBottom: 10, fontFamily: 'inherit' }} />
      {err && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#C0504D' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--c-border)', background: '#fff', color: 'var(--c-text-secondary)', fontSize: 13, cursor: 'pointer' }}>
          {tt(t, '取消', 'Cancel')}
        </button>
        <button onClick={save} disabled={saving}
          style={{ padding: '7px 18px', borderRadius: 6, border: 'none', background: saving ? 'var(--c-lavender)' : 'var(--c-brand)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? tt(t, '保存中…', 'Saving…') : tt(t, '保存修改', 'Save')}
        </button>
      </div>
    </div>
  )
}

export function CycleLogList<T extends CycleLog>({ logs, headers, onChange, t }: {
  logs: T[]
  headers: Record<string, string>
  onChange: (next: T[]) => void
  t?: (zh: string, en: string) => string
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const sortDesc = (arr: T[]) => [...arr].sort((a, b) => b.start_date.localeCompare(a.start_date))

  const del = async (id: string) => {
    setBusyId(id); setErr('')
    try {
      const res = await fetch(`/api/cycle-logs/${id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error(tt(t, '删除失败，请重试', 'Delete failed'))
      onChange(logs.filter(l => l.id !== id))
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusyId(null); setConfirmId(null)
    }
  }

  const small: React.CSSProperties = { border: 'none', background: 'none', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }

  return (
    <div>
      {err && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#C0504D' }}>{err}</p>}
      {logs.map((c, i) => (
        <div key={c.id} style={{ borderTop: i > 0 ? '1px solid var(--c-border)' : 'none', padding: '10px 0' }}>
          {editingId === c.id ? (
            <EditForm log={c} headers={headers} t={t}
              onSaved={u => { onChange(sortDesc(logs.map(l => (l.id === u.id ? ({ ...l, ...u } as T) : l)))); setEditingId(null) }}
              onCancel={() => setEditingId(null)} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 4 }}>
                  {c.start_date}{c.end_date && ` → ${c.end_date}`}
                  {c.end_date && <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa' }}>（{daysBetween(c.start_date, c.end_date) + 1} {tt(t, '天', 'd')}）</span>}
                </div>
                {(c.flow_level || c.pain_level) && (
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {[c.flow_level && FLOW_LABELS[c.flow_level], c.pain_level && PAIN_LABELS[c.pain_level]].filter(Boolean).join(' · ')}
                  </div>
                )}
                {c.notes && <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>💬 {c.notes}</div>}
              </div>
              {confirmId === c.id ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setConfirmId(null)} style={{ ...small, color: 'var(--c-text-secondary)' }}>{tt(t, '取消', 'Cancel')}</button>
                  <button onClick={() => del(c.id)} disabled={busyId === c.id} style={{ ...small, color: '#C0504D', fontWeight: 600 }}>
                    {busyId === c.id ? '…' : tt(t, '确认删除', 'Delete')}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => { setEditingId(c.id); setConfirmId(null) }} style={{ ...small, color: 'var(--c-brand)', fontWeight: 600 }}>
                    {tt(t, '改', 'Edit')}
                  </button>
                  <button onClick={() => setConfirmId(c.id)} title={tt(t, '删除记录', 'Delete')} style={{ ...small, color: '#ccc' }}>✕</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
