'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang, FontSize } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const SEX_LABELS: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他', UNDISCLOSED: '不便告知' }
const FLOW_LABELS: Record<string, string> = { LIGHT: '量少', MEDIUM: '量中', HEAVY: '量多' }
const PAIN_LABELS: Record<string, string> = { NONE: '无痛感', MILD: '轻微', MODERATE: '中等', SEVERE: '严重' }

interface BasicProfile {
  sex?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED' | null
  birth_date?: string | null
  height_cm?: number | null
}

interface CycleLog {
  id: string
  start_date: string
  end_date?: string | null
  flow_level?: 'LIGHT' | 'MEDIUM' | 'HEAVY' | null
  pain_level?: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | null
  notes?: string | null
}

export default function ProfilePage() {
  const { user, userRole, loading, logout } = useAuth()
  const { lang, setLang, fontSize, setFontSize, t } = useLang()
  const router = useRouter()

  const [basic, setBasic] = useState<BasicProfile>({})
  const [editBasic, setEditBasic] = useState(false)
  const [basicForm, setBasicForm] = useState({ sex: '', birth_date: '', height_cm: '' })
  const [savingBasic, setSavingBasic] = useState(false)

  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([])
  const [cycleLoaded, setCycleLoaded] = useState(false)
  const [showAddCycle, setShowAddCycle] = useState(false)
  const [cycleForm, setCycleForm] = useState({ start_date: '', end_date: '', flow_level: '', pain_level: '', notes: '' })
  const [savingCycle, setSavingCycle] = useState(false)
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (!user) return
    fetch(`/api/users/${user.id}`, { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setBasic({ sex: data.sex, birth_date: data.birth_date, height_cm: data.height_cm }) })
      .catch(() => {})
  }, [user, userRole])

  useEffect(() => {
    if (basic.sex === 'FEMALE' && user && !cycleLoaded) fetchCycleLogs()
  }, [basic.sex, user, cycleLoaded])

  const fetchCycleLogs = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/cycle-logs?userId=${user.id}`, {
        headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
      })
      if (res.ok) setCycleLogs(await res.json())
    } finally {
      setCycleLoaded(true)
    }
  }

  const openEditBasic = () => {
    setBasicForm({
      sex: basic.sex || '',
      birth_date: basic.birth_date || '',
      height_cm: basic.height_cm != null ? String(basic.height_cm) : '',
    })
    setEditBasic(true)
  }

  const handleSaveBasic = async () => {
    if (!user || savingBasic) return
    setSavingBasic(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({
          sex: basicForm.sex || null,
          birth_date: basicForm.birth_date || null,
          height_cm: basicForm.height_cm === '' ? null : Number(basicForm.height_cm),
        }),
      })
      if (!res.ok) throw new Error('保存失败')
      const data = await res.json()
      setBasic({ sex: data.sex, birth_date: data.birth_date, height_cm: data.height_cm })
      setEditBasic(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingBasic(false)
    }
  }

  const handleAddCycle = async () => {
    if (!user || !cycleForm.start_date || savingCycle) return
    setSavingCycle(true)
    try {
      const res = await fetch('/api/cycle-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({ user_id: user.id, ...cycleForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      setCycleLogs(prev => [data, ...prev].sort((a, b) => b.start_date.localeCompare(a.start_date)))
      setCycleForm({ start_date: '', end_date: '', flow_level: '', pain_level: '', notes: '' })
      setShowAddCycle(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingCycle(false)
    }
  }

  const handleDeleteCycle = async (id: string) => {
    if (!user || !window.confirm('确定删除这条周期记录？')) return
    setDeletingCycleId(id)
    try {
      const res = await fetch(`/api/cycle-logs/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
      })
      if (res.ok) setCycleLogs(prev => prev.filter(c => c.id !== id))
      else alert('删除失败，请重试')
    } finally {
      setDeletingCycleId(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (loading || !user) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )

  const name = user.user_metadata?.name || user.email?.split('@')[0] || '—'
  const ROLE_LABEL: Record<string, string> = lang === 'zh'
    ? { ADMIN: '管理员', TRAINER: '教练', CLIENT: '学员' }
    : { ADMIN: 'Admin', TRAINER: 'Trainer', CLIENT: 'Client' }

  // Pill toggle helper
  const PillToggle = ({ value, options, onChange }: {
    value: string
    options: { key: string; label: string }[]
    onChange: (k: string) => void
  }) => (
    <div style={{ display: 'flex', gap: 3, background: 'var(--c-fill-light)', borderRadius: 'var(--r-full)', padding: '3px' }}>
      {options.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{
          padding: '4px 12px',
          borderRadius: 'var(--r-full)',
          border: 'none',
          background: value === o.key ? 'var(--c-card-bg)' : 'transparent',
          color: value === o.key ? 'var(--c-brand)' : 'var(--c-text-hint)',
          fontSize: 'var(--text-xs)',
          fontWeight: value === o.key ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.12s',
          boxShadow: value === o.key ? 'var(--shadow-sm)' : 'none',
        }}>
          {o.label}
        </button>
      ))}
    </div>
  )

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{label}</span>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>
          {t('← 返回', '← Back')}
        </Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {t('我的', 'Profile')}
        </h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 500, margin: '0 auto' }}>
        {/* Avatar + name */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-8)',
          marginBottom: 'var(--sp-4)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--c-fill-light)',
            border: '2px solid var(--c-pink-mist)',
            color: 'var(--c-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--text-2xl)', fontWeight: 700,
            margin: '0 auto var(--sp-3)',
          }}>
            {name[0]?.toUpperCase() || '?'}
          </div>
          <h2 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
            {name}
          </h2>
          <span style={{
            fontSize: 'var(--text-sm)', padding: '4px 14px',
            borderRadius: 'var(--r-full)',
            background: 'var(--c-fill-light)',
            color: 'var(--c-brand)',
            border: '1px solid var(--c-border)',
          }}>
            {ROLE_LABEL[userRole || ''] || userRole}
          </span>
        </div>

        {/* Account info */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          <p style={{ margin: '0', padding: 'var(--sp-4) 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('账号信息', 'Account')}
          </p>
          {[
            { label: t('邮箱', 'Email'), val: user.email },
            { label: t('注册时间', 'Joined'), val: new Date(user.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US') },
          ].map((row, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--sp-4) 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--c-border)' : 'none',
            }}>
              <span style={{ color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)', maxWidth: '65%', textAlign: 'right', wordBreak: 'break-all' }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* 基础资料：性别/出生日期/身高 —— 决定能不能记生理周期，本人自己填 */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4) 0 0' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('基础资料', 'Basic Info')}
            </p>
            {!editBasic && (
              <button onClick={openEditBasic} style={{ fontSize: 12, color: 'var(--c-brand)', border: '1px solid var(--c-brand)', borderRadius: 6, padding: '3px 10px', background: 'none', cursor: 'pointer' }}>
                {t('编辑', 'Edit')}
              </button>
            )}
          </div>

          {editBasic ? (
            <div style={{ padding: 'var(--sp-4) 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('性别', 'Sex')}</label>
                  <select value={basicForm.sex} onChange={e => setBasicForm(p => ({ ...p, sex: e.target.value }))}
                    style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="">{t('未设置', 'Not set')}</option>
                    {Object.entries(SEX_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('出生日期', 'Birth date')}</label>
                  <input type="date" value={basicForm.birth_date} onChange={e => setBasicForm(p => ({ ...p, birth_date: e.target.value }))}
                    style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('身高 (cm)', 'Height (cm)')}</label>
                <input type="number" min="0" value={basicForm.height_cm} onChange={e => setBasicForm(p => ({ ...p, height_cm: e.target.value }))}
                  style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, paddingBottom: 'var(--sp-4)' }}>
                <button onClick={handleSaveBasic} disabled={savingBasic}
                  style={{ padding: '7px 18px', background: savingBasic ? 'var(--c-lavender)' : 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                  {savingBasic ? t('保存中...', 'Saving...') : t('保存', 'Save')}
                </button>
                <button onClick={() => setEditBasic(false)} style={{ padding: '7px 14px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13, background: 'none' }}>
                  {t('取消', 'Cancel')}
                </button>
              </div>
            </div>
          ) : (
            [
              { label: t('性别', 'Sex'), val: basic.sex ? SEX_LABELS[basic.sex] : t('未设置', 'Not set') },
              { label: t('出生日期', 'Birth date'), val: basic.birth_date || t('未设置', 'Not set') },
              { label: t('身高', 'Height'), val: basic.height_cm != null ? `${basic.height_cm} cm` : t('未设置', 'Not set') },
            ].map((row, i, arr) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--sp-4) 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}>
                <span style={{ color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)' }}>{row.label}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-primary)' }}>{row.val}</span>
              </div>
            ))
          )}
        </div>

        {/* 生理周期：只有性别是女性才出现 */}
        {basic.sex === 'FEMALE' && (
          <div style={{
            background: 'var(--c-card-bg)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-5)',
            marginBottom: 'var(--sp-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t('生理周期', 'Cycle Tracking')}
              </p>
              <button onClick={() => setShowAddCycle(v => !v)}
                style={{ fontSize: 12, color: 'var(--c-brand)', border: '1px solid var(--c-brand)', borderRadius: 6, padding: '3px 10px', background: 'none', cursor: 'pointer' }}>
                {showAddCycle ? t('取消', 'Cancel') : t('＋ 记录一次', '＋ Log entry')}
              </button>
            </div>

            {showAddCycle && (
              <div style={{ padding: 12, marginBottom: 12, background: 'var(--c-fill-light)', borderRadius: 'var(--r-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('开始日期 *', 'Start date *')}</label>
                    <input type="date" value={cycleForm.start_date} onChange={e => setCycleForm(p => ({ ...p, start_date: e.target.value }))}
                      style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('结束日期', 'End date')}</label>
                    <input type="date" value={cycleForm.end_date} onChange={e => setCycleForm(p => ({ ...p, end_date: e.target.value }))}
                      style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('流量', 'Flow')}</label>
                    <select value={cycleForm.flow_level} onChange={e => setCycleForm(p => ({ ...p, flow_level: e.target.value }))}
                      style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                      <option value="">{t('不记录', 'Skip')}</option>
                      {Object.entries(FLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('痛经程度', 'Pain level')}</label>
                    <select value={cycleForm.pain_level} onChange={e => setCycleForm(p => ({ ...p, pain_level: e.target.value }))}
                      style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                      <option value="">{t('不记录', 'Skip')}</option>
                      {Object.entries(PAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 4 }}>{t('备注', 'Notes')}</label>
                  <textarea rows={2} value={cycleForm.notes} onChange={e => setCycleForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder={t('例：情绪波动大，腰酸...', 'e.g. mood swings, lower back ache...')}
                    style={{ width: '100%', padding: 7, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleAddCycle} disabled={!cycleForm.start_date || savingCycle}
                  style={{
                    padding: '7px 18px',
                    background: !cycleForm.start_date || savingCycle ? 'var(--c-lavender)' : 'var(--c-brand)',
                    color: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
                    cursor: !cycleForm.start_date || savingCycle ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)', fontWeight: 500,
                  }}>
                  {savingCycle ? t('保存中...', 'Saving...') : t('保存', 'Save')}
                </button>
              </div>
            )}

            {!cycleLoaded ? (
              <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, margin: '20px 0' }}>{t('加载中…', 'Loading…')}</p>
            ) : cycleLogs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, margin: '20px 0' }}>{t('暂无周期记录', 'No entries yet')}</p>
            ) : (
              cycleLogs.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
                  borderTop: i > 0 ? '1px solid var(--c-border)' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 4 }}>
                      {c.start_date}{c.end_date && ` → ${c.end_date}`}
                    </div>
                    {(c.flow_level || c.pain_level) && (
                      <div style={{ fontSize: 12, color: '#aaa' }}>
                        {[c.flow_level && FLOW_LABELS[c.flow_level], c.pain_level && PAIN_LABELS[c.pain_level]].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {c.notes && <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>💬 {c.notes}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteCycle(c.id)}
                    disabled={deletingCycleId === c.id}
                    title={t('删除记录', 'Delete')}
                    style={{
                      width: 24, height: 24, border: 'none', borderRadius: '50%',
                      background: 'transparent', color: '#ccc', fontSize: 12,
                      cursor: deletingCycleId === c.id ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {deletingCycleId === c.id ? '…' : '✕'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings section */}
        <div style={{
          background: 'var(--c-card-bg)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r-lg)',
          padding: '0 var(--sp-5)',
          marginBottom: 'var(--sp-4)',
        }}>
          <p style={{ margin: '0', padding: 'var(--sp-4) 0 0', fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('偏好设置', 'Preferences')}
          </p>

          {/* Language */}
          <div style={{ borderBottom: '1px solid var(--c-border)' }}>
            <SettingRow label={t('语言', 'Language')}>
              <PillToggle
                value={lang}
                options={[{ key: 'zh', label: '中文' }, { key: 'en', label: 'English' }]}
                onChange={k => setLang(k as 'zh' | 'en')}
              />
            </SettingRow>
          </div>

          {/* Font size */}
          <div style={{ borderBottom: '1px solid var(--c-border)' }}>
            <SettingRow label={t('字体大小', 'Text Size')}>
              <PillToggle
                value={fontSize}
                options={[
                  { key: 'sm', label: t('小', 'S') },
                  { key: 'md', label: t('中', 'M') },
                  { key: 'lg', label: t('大', 'L') },
                ]}
                onChange={k => setFontSize(k as FontSize)}
              />
            </SettingRow>
          </div>

          {/* About */}
          <SettingRow label={t('版本', 'Version')}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>v1.0</span>
          </SettingRow>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: 'var(--sp-4)',
            background: 'var(--c-card-bg)',
            color: 'var(--c-text-secondary)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-lg)',
            fontSize: 'var(--text-base)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {t('退出登录', 'Logout')}
        </button>
      </main>
    </div>
  )
}
