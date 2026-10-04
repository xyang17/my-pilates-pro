'use client'

import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// 教练自己的生理周期记录。
// 「我的主页」里那份是教练和学员共用的页面，保持不动；这里是教练端新增的入口，
// 读写的是同一张表（menstrual_cycle_log）、同一个接口（/api/cycle-logs），两边数据一致。

const FLOW: Record<string, string> = { LIGHT: '量少', MEDIUM: '量中', HEAVY: '量多' }
const PAIN: Record<string, string> = { NONE: '无痛感', MILD: '轻微', MODERATE: '中等', SEVERE: '严重' }

interface CycleLog {
  id: string
  start_date: string
  end_date?: string | null
  flow_level?: string | null
  pain_level?: string | null
  notes?: string | null
}

const EMPTY = { start_date: '', end_date: '', flow_level: '', pain_level: '', notes: '' }

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

export default function MyCyclePage() {
  const { user, userRole } = useAuth()
  const [sex, setSex] = useState<string | null | undefined>(undefined)
  const [logs, setLogs] = useState<CycleLog[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const headers = { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }

  useEffect(() => {
    if (!user) return
    const h = { 'x-user-id': user.id, 'x-user-role': userRole || '' }
    Promise.all([
      fetch(`/api/users/${user.id}`, { headers: h }).then(r => (r.ok ? r.json() : null)),
      fetch(`/api/cycle-logs?userId=${user.id}`, { headers: h }).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([u, l]) => { setSex(u?.sex ?? null); setLogs(l || []) })
      .catch(() => setSex(null))
      .finally(() => setLoading(false))
  }, [user, userRole])

  const handleAdd = async () => {
    if (!user || !form.start_date || saving) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/cycle-logs', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      setLogs(prev => [data, ...prev].sort((a, b) => b.start_date.localeCompare(a.start_date)))
      setForm(EMPTY); setAdding(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/cycle-logs/${id}`, { method: 'DELETE', headers })
    if (res.ok) setLogs(prev => prev.filter(c => c.id !== id))
    else setError('删除失败，请重试')
    setConfirmId(null)
  }

  // 平均周期：相邻两次开始日的间隔
  const intervals = logs.slice(0, 7).map((l, i, arr) => (i < arr.length - 1 ? daysBetween(arr[i + 1].start_date, l.start_date) : null))
    .filter((n): n is number => n !== null && n > 10 && n < 60)
  const avg = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--c-border)',
    borderRadius: 8, fontSize: 14, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
  }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--c-text-secondary)', marginBottom: 5 }
  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56,
        display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/my-training" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← 我的训练</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>生理周期</h1>
        {sex === 'FEMALE' && !adding && (
          <button onClick={() => setAdding(true)}
            style={{ background: 'var(--c-brand)', color: 'white', border: 'none', padding: '7px 14px', borderRadius: 18, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ＋ 记一次
          </button>
        )}
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 640, margin: '0 auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', padding: 40 }}>加载中…</p>
        ) : sex !== 'FEMALE' ? (
          <div style={{ ...card, padding: 28, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', color: 'var(--c-text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
              生理周期只对设置为「女」的账号开放。<br />请先到「我的主页」把性别设为女。
            </p>
            <Link href="/dashboard/profile" style={{ color: 'var(--c-brand)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>去我的主页 ›</Link>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: '#8C4A4A', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>
            )}

            {adding && (
              <div style={{ ...card, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={label}>开始日期 *</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={input} />
                  </div>
                  <div>
                    <label style={label}>结束日期</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={input} />
                  </div>
                  <div>
                    <label style={label}>经量</label>
                    <select value={form.flow_level} onChange={e => setForm(f => ({ ...f, flow_level: e.target.value }))} style={input}>
                      <option value="">不记录</option>
                      {Object.entries(FLOW).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>痛感</label>
                    <select value={form.pain_level} onChange={e => setForm(f => ({ ...f, pain_level: e.target.value }))} style={input}>
                      <option value="">不记录</option>
                      {Object.entries(PAIN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <label style={label}>备注</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="选填" style={{ ...input, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setAdding(false); setForm(EMPTY) }}
                    style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid var(--c-border)', background: 'var(--c-card-bg)', color: 'var(--c-text-secondary)', fontSize: 14, cursor: 'pointer' }}>
                    取消
                  </button>
                  <button onClick={handleAdd} disabled={!form.start_date || saving}
                    style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: !form.start_date || saving ? 'var(--c-lavender)' : 'var(--c-brand)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? '保存中…' : '保存'}
                  </button>
                </div>
              </div>
            )}

            {avg && (
              <p style={{ fontSize: 13, color: 'var(--c-text-secondary)', margin: '0 0 10px 4px' }}>
                近几次平均周期约 <b style={{ color: 'var(--c-text-primary)' }}>{avg}</b> 天
              </p>
            )}

            {logs.length === 0 ? (
              <div style={{ ...card, padding: 32, textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 13 }}>还没有记录</div>
            ) : (
              <div style={{ ...card, overflow: 'hidden' }}>
                {logs.map((l, i) => (
                  <div key={l.id} style={{ padding: '12px 14px', borderBottom: i < logs.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                        {l.start_date.slice(5).replace('-', '/')}
                        {l.end_date ? ` – ${l.end_date.slice(5).replace('-', '/')}（${daysBetween(l.start_date, l.end_date) + 1} 天）` : ''}
                      </span>
                      {confirmId === l.id ? (
                        <>
                          <button onClick={() => setConfirmId(null)} style={{ border: 'none', background: 'none', color: 'var(--c-text-secondary)', fontSize: 12, cursor: 'pointer' }}>取消</button>
                          <button onClick={() => handleDelete(l.id)} style={{ border: 'none', background: 'none', color: '#B07A7A', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>确认删除</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(l.id)} aria-label="删除" style={{ border: 'none', background: 'none', color: '#ccc', fontSize: 13, cursor: 'pointer' }}>✕</button>
                      )}
                    </div>
                    {(l.flow_level || l.pain_level || l.notes) && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--c-text-secondary)' }}>
                        {[l.flow_level && FLOW[l.flow_level], l.pain_level && `痛感${PAIN[l.pain_level]}`, l.notes].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
