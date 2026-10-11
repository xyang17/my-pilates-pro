'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'

// 导出训练记录：选学员 + 时间段 → 生成可打印 / 存 PDF 的训练记录页（/print/training）。
// 入口有两个：首页「全部功能 → 导出训练记录」，以及学员页训练记录上的「导出 PDF」（带 ?client= 预选好学员）。
// 只给教练/管理员。

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function presets() {
  const now = new Date()
  const today = ymd(now)
  const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMonthStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd = ymd(new Date(now.getFullYear(), now.getMonth(), 0))
  const daysAgo = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return ymd(d) }
  return [
    { key: 'month', label: '本月', en: 'This month', from: monthStart, to: today },
    { key: 'last', label: '上个月', en: 'Last month', from: lastMonthStart, to: lastMonthEnd },
    { key: '30', label: '近 30 天', en: 'Last 30 days', from: daysAgo(29), to: today },
    { key: '90', label: '近 3 个月', en: 'Last 3 months', from: daysAgo(89), to: today },
  ]
}

function ExportInner() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const sp = useSearchParams()
  const presetList = useMemo(presets, [])
  const { lang, t } = useLang()

  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([])
  const [clientId, setClientId] = useState(sp.get('client') || '')
  const [from, setFrom] = useState(presetList[0].from)
  const [to, setTo] = useState(presetList[0].to)
  const [withSelf, setWithSelf] = useState(false)
  const [err, setErr] = useState('')

  const isStaff = userRole === 'TRAINER' || userRole === 'ADMIN'

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/auth/login'); return }
    if (!isStaff) { router.replace('/dashboard'); return }
    fetch('/api/clients', { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(r => (r.ok ? r.json() : []))
      .then((list: any[]) => setClients(list.map(c => ({ id: c.id, name: c.name, email: c.email }))))
      .catch(() => {})
  }, [loading, user, userRole, isStaff, router])

  const go = () => {
    if (!clientId) { setErr(t('请选择学员', 'Choose a client')); return }
    if (!from || !to || from > to) { setErr(t('时间段不对', 'Invalid date range')); return }
    const q = new URLSearchParams({ client: clientId, from, to, self: withSelf ? '1' : '0' })
    router.push(`/print/training?${q}`)
  }

  const activePreset = presetList.find(p => p.from === from && p.to === to)?.key
  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 14 }
  const lab: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--c-text-secondary)', marginBottom: 6, fontWeight: 600 }
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 15, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)' }

  if (loading || !isStaff) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-secondary)' }}>{t('加载中…', 'Loading…')}</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56,
        display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--c-text-secondary)', fontSize: 14, cursor: 'pointer', padding: 0 }}>← {t('返回', 'Back')}</button>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{t('导出训练记录', 'Export training record')}</h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 560, margin: '0 auto' }}>
        <div style={card}>
          <label style={lab}>{t('学员', 'Client')}</label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); setErr('') }} style={inp}>
            <option value="">{t('选择学员…', 'Choose a client…')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
          </select>
        </div>

        <div style={card}>
          <label style={lab}>{t('时间段', 'Date range')}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {presetList.map(p => (
              <button key={p.key} onClick={() => { setFrom(p.from); setTo(p.to); setErr('') }}
                style={{
                  padding: '6px 14px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
                  border: `1px solid ${activePreset === p.key ? 'var(--c-brand)' : 'var(--c-border)'}`,
                  background: activePreset === p.key ? 'var(--c-brand)' : 'var(--c-card-bg)',
                  color: activePreset === p.key ? '#fff' : 'var(--c-text-secondary)', fontWeight: activePreset === p.key ? 600 : 400,
                }}>
                {lang === 'zh' ? p.label : p.en}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} style={inp} />
            <span style={{ color: 'var(--c-text-hint)', fontSize: 13 }}>{t('至', 'to')}</span>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={card}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: 'var(--c-text-primary)' }}>
            <input type="checkbox" checked={withSelf} onChange={e => setWithSelf(e.target.checked)} style={{ width: 18, height: 18 }} />
            {t('同时导出学员的自我练习', 'Include the client’s self-practice')}
          </label>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--c-text-hint)', lineHeight: 1.6 }}>
            {t('导出内容：每节课的日期、课程、动作（计划和实际完成）、备注和课后总结。已取消的课不导出，不含价格。', 'Includes each class’s date, name, exercises (planned and done), notes and post-class summary. Cancelled classes and prices are left out.')}
          </p>
        </div>

        {err && <p style={{ color: '#C0504D', fontSize: 13, margin: '0 0 10px' }}>{err}</p>}

        <button onClick={go}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--c-brand)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          {t('生成 PDF', 'Create PDF')}
        </button>
        {clientId && (
          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <Link href={`/dashboard/clients/${clientId}`} style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>{t('去这个学员的主页', 'Open this client')}</Link>
          </p>
        )}
      </main>
    </div>
  )
}

export default function ExportPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>…</div>}>
      <ExportInner />
    </Suspense>
  )
}
