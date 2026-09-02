'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ClientClass {
  id: string
  name: string
  date: string
  start_time?: string
  duration: number
  discipline?: string
  class_type: string
  level?: string
  status: string
  color?: string
}

interface HomeworkExercise {
  id: string
  sets?: number
  reps?: number
  weight?: number
  weight_unit: string
  order_num: number
  notes?: string
  master_exercise: { id: string; name_cn: string; name_en: string }
}

interface Homework {
  id: string
  title: string
  due_date?: string
  notes?: string
  status: string
  created_at: string
  class?: { id: string; name: string; date: string }
  homework_exercise: HomeworkExercise[]
}

interface Client {
  id: string
  name: string
  email: string
  photo_url?: string
  bio?: string
  injury_notes?: string
  goals?: string
  sex?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED' | null
  birth_date?: string | null
  height_cm?: number | null
  created_at: string
  classes: ClientClass[]
}

interface CycleLog {
  id: string
  start_date: string
  end_date?: string | null
  flow_level?: 'LIGHT' | 'MEDIUM' | 'HEAVY' | null
  pain_level?: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | null
  notes?: string | null
  recorded_by: string
  created_at: string
}

const SEX_LABELS: Record<string, string> = { MALE: '男', FEMALE: '女', OTHER: '其他', UNDISCLOSED: '不便告知' }
const FLOW_LABELS: Record<string, string> = { LIGHT: '量少', MEDIUM: '量中', HEAVY: '量多' }
const PAIN_LABELS: Record<string, string> = { NONE: '无痛感', MILD: '轻微', MODERATE: '中等', SEVERE: '严重' }

export default function ClientDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const { lang } = useLang()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [homework, setHomework] = useState<Homework[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hwLoading, setHwLoading] = useState(false)
  const [aLoading, setALoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'classes' | 'homework' | 'assessments' | 'cycle'>('classes')
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set())
  const [deletingHwId, setDeletingHwId] = useState<string | null>(null)
  const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'
  const displayTitle = (title: string) =>
    lang === 'zh' ? title : title.replace(/\s*作业$/, ' Homework')
  // Trainer notes edit
  const [editNotes, setEditNotes] = useState(false)
  const [notesForm, setNotesForm] = useState({ injury_notes: '', goals: '', sex: '', birth_date: '', height_cm: '' })
  const [savingNotes, setSavingNotes] = useState(false)

  // 生理周期记录
  const [cycleLogs, setCycleLogs] = useState<CycleLog[]>([])
  const [cycleLoading, setCycleLoading] = useState(false)
  const [showAddCycle, setShowAddCycle] = useState(false)
  const [cycleForm, setCycleForm] = useState({ start_date: '', end_date: '', flow_level: '', pain_level: '', notes: '' })
  const [savingCycle, setSavingCycle] = useState(false)
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchClient()
  }, [user, authLoading])

  useEffect(() => {
    if (activeTab === 'homework' && homework.length === 0 && user) fetchHomework()
    if (activeTab === 'assessments' && assessments.length === 0 && user) fetchAssessments()
    if (activeTab === 'cycle' && cycleLogs.length === 0 && user) fetchCycleLogs()
  }, [activeTab, user])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setClient(await res.json())
    } finally {
      setIsLoading(false)
    }
  }

  const openEditNotes = () => {
    setNotesForm({
      injury_notes: client?.injury_notes || '',
      goals: client?.goals || '',
      sex: client?.sex || '',
      birth_date: client?.birth_date || '',
      height_cm: client?.height_cm != null ? String(client.height_cm) : '',
    })
    setEditNotes(true)
  }

  const handleSaveNotes = async () => {
    if (!client || savingNotes) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({
          ...notesForm,
          height_cm: notesForm.height_cm === '' ? null : Number(notesForm.height_cm),
        }),
      })
      if (!res.ok) throw new Error('保存失败')
      await fetchClient()
      setEditNotes(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingNotes(false)
    }
  }

  const fetchCycleLogs = async () => {
    setCycleLoading(true)
    try {
      const res = await fetch(`/api/cycle-logs?userId=${clientId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setCycleLogs(await res.json())
    } finally {
      setCycleLoading(false)
    }
  }

  const handleAddCycle = async () => {
    if (!cycleForm.start_date || savingCycle) return
    setSavingCycle(true)
    try {
      const res = await fetch('/api/cycle-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify({ user_id: clientId, ...cycleForm }),
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
    if (!window.confirm('确定删除这条周期记录？')) return
    setDeletingCycleId(id)
    try {
      const res = await fetch(`/api/cycle-logs/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setCycleLogs(prev => prev.filter(c => c.id !== id))
      else alert('删除失败，请重试')
    } finally {
      setDeletingCycleId(null)
    }
  }

  const fetchAssessments = async () => {
    setALoading(true)
    try {
      const res = await fetch(`/api/l0/metrics?clientId=${clientId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setAssessments(await res.json())
    } finally {
      setALoading(false)
    }
  }

  const fetchHomework = async () => {
    setHwLoading(true)
    try {
      const res = await fetch(`/api/homework?student_id=${clientId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) setHomework(await res.json())
    } finally {
      setHwLoading(false)
    }
  }

  const toggleHw = (id: string) => setExpandedHw(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const handleDeleteHomework = async (hw: Homework) => {
    if (!window.confirm(`确定删除作业「${hw.title}」？此操作无法撤销。`)) return
    setDeletingHwId(hw.id)
    try {
      const res = await fetch(`/api/homework/${hw.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' },
      })
      if (res.ok) setHomework(prev => prev.filter(h => h.id !== hw.id))
      else alert('删除失败，请重试')
    } catch {
      alert('网络错误，请重试')
    } finally {
      setDeletingHwId(null)
    }
  }

  if (authLoading || isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
  if (!client) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>学员未找到</p>
      <Link href="/dashboard/clients" style={{ color: '#9B7DB5' }}>← 返回</Link>
    </div>
  )

  const upcoming = client.classes.filter(c => c.status !== 'completed')
  const past = client.classes.filter(c => c.status === 'completed')
  const hwDone = homework.filter(h => h.status === 'completed').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--c-text-secondary)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>学员详情</h1>
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 700, margin: '0 auto' }}>
        {/* Profile card */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-6)', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
            {client.photo_url ? (
              <img src={client.photo_url} alt={client.name}
                style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--c-fill-light)', border: '2px solid var(--c-pink-mist)', color: 'var(--c-brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xl)', fontWeight: 600 }}>
                {client.name?.[0] || '?'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 var(--sp-1)', fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--c-text-primary)' }}>{client.name}</h2>
              <p style={{ margin: '0 0 4px 0', color: '#999', fontSize: '13px' }}>📧 {client.email}</p>
              <p style={{ margin: 0, color: '#bbb', fontSize: '12px' }}>
                加入时间: {new Date(client.created_at).toLocaleDateString('zh-CN')}
                {(client.sex || client.birth_date || client.height_cm) && ' · '}
                {client.sex && SEX_LABELS[client.sex]}
                {client.birth_date && ` · ${client.birth_date}`}
                {client.height_cm != null && ` · ${client.height_cm}cm`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            {[
              { label: '总课程', val: client.classes.length },
              { label: '即将上课', val: upcoming.length },
              { label: '已完成课', val: past.length },
              { label: '作业完成', val: hwDone },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 4px', backgroundColor: '#f9f6fc', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 'bold', color: '#9B7DB5' }}>{s.val}</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#999' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {client.bio && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
              <p style={{ margin: '0 0 6px 0', color: '#999', fontSize: '12px' }}>简介</p>
              <p style={{ margin: 0, color: '#444', fontSize: '14px', lineHeight: '1.6' }}>{client.bio}</p>
            </div>
          )}

          {/* Trainer assessment notes */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ margin: 0, color: '#999', fontSize: '12px', fontWeight: '600' }}>教练评估</p>
              {!editNotes && (
                <button onClick={openEditNotes}
                  style={{ fontSize: '12px', color: '#9B7DB5', border: '1px solid #9B7DB5', borderRadius: '6px', padding: '3px 10px', background: 'none', cursor: 'pointer' }}>
                  ✏️ 编辑
                </button>
              )}
            </div>

            {editNotes ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', fontWeight: 'bold', marginBottom: '4px' }}>性别</label>
                    <select value={notesForm.sex} onChange={e => setNotesForm(p => ({ ...p, sex: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
                      <option value="">未设置</option>
                      {Object.entries(SEX_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', fontWeight: 'bold', marginBottom: '4px' }}>出生日期</label>
                    <input type="date" value={notesForm.birth_date}
                      onChange={e => setNotesForm(p => ({ ...p, birth_date: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', fontWeight: 'bold', marginBottom: '4px' }}>身高 (cm)</label>
                    <input type="number" min="0" value={notesForm.height_cm}
                      onChange={e => setNotesForm(p => ({ ...p, height_cm: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#E8763A', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 伤病 / 体态问题</label>
                  <textarea value={notesForm.injury_notes}
                    onChange={e => setNotesForm(p => ({ ...p, injury_notes: e.target.value }))}
                    placeholder="如：腰椎间盘突出，右肩撞击综合征，骨盆前倾..."
                    rows={3}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#2E8B57', fontWeight: 'bold', marginBottom: '4px' }}>🎯 训练目标</label>
                  <textarea value={notesForm.goals}
                    onChange={e => setNotesForm(p => ({ ...p, goals: e.target.value }))}
                    placeholder="如：核心力量提升，减脂塑形，改善体态，运动后恢复..."
                    rows={3}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSaveNotes} disabled={savingNotes}
                    style={{ padding: '7px 18px', background: savingNotes ? 'var(--c-lavender)' : 'var(--c-brand)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {savingNotes ? '保存中...' : '保存'}
                  </button>
                  <button onClick={() => setEditNotes(false)}
                    style={{ padding: '7px 14px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', background: 'none' }}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: client.injury_notes && client.goals ? '1fr 1fr' : '1fr', gap: '10px' }}>
                {client.injury_notes ? (
                  <div style={{ background: 'var(--c-fill-light)', border: '1px solid var(--c-border-em)', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#E8763A', fontWeight: 'bold' }}>⚠️ 伤病 / 体态问题</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{client.injury_notes}</p>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: '#bbb' }}>暂无伤病记录</p>
                )}
                {client.goals && (
                  <div style={{ background: '#EDE6F4', border: '1px solid #C2AFCC', borderRadius: 'var(--r-sm)', padding: '10px 12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#2E8B57', fontWeight: 'bold' }}>🎯 训练目标</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{client.goals}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '2px solid #eee', marginBottom: '0' }}>
          {(() => {
            const tabs: { key: 'classes' | 'homework' | 'assessments' | 'cycle'; label: string }[] = [
              { key: 'classes', label: `课程记录 (${client.classes.length})` },
              { key: 'homework', label: `作业 (${homework.length || '…'})` },
              { key: 'assessments', label: `测试记录 (${assessments.length || '…'})` },
            ]
            if (client.sex === 'FEMALE') tabs.push({ key: 'cycle', label: `生理周期 (${cycleLogs.length || '…'})` })
            return tabs
          })().map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                color: activeTab === tab.key ? '#9B7DB5' : '#666',
                borderBottom: activeTab === tab.key ? '2px solid #9B7DB5' : '2px solid transparent',
                marginBottom: '-2px',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Classes tab */}
        {activeTab === 'classes' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {client.classes.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>暂无课程记录</p>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <div style={{ padding: '14px 20px 0' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>即将上课 ({upcoming.length})</p>
                    {upcoming.map(c => (
                      <ClassRow key={c.id} c={c}
                        onDelete={isTrainer ? async () => {
                          if (!window.confirm(`确定删除课程「${c.name}」？此操作无法撤销。`)) return
                          const res = await fetch(`/api/classes/${c.id}`, { method: 'DELETE', headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' } })
                          if (res.ok) setClient(prev => prev ? { ...prev, classes: prev.classes.filter(x => x.id !== c.id) } : prev)
                          else alert('删除失败，请重试')
                        } : undefined}
                      />
                    ))}
                  </div>
                )}
                {past.length > 0 && (
                  <div style={{ padding: '14px 20px 0' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>历史课程 ({past.length})</p>
                    {past.map(c => (
                      <ClassRow key={c.id} c={c}
                        onDelete={isTrainer ? async () => {
                          if (!window.confirm(`确定删除课程「${c.name}」？此操作无法撤销。`)) return
                          const res = await fetch(`/api/classes/${c.id}`, { method: 'DELETE', headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' } })
                          if (res.ok) setClient(prev => prev ? { ...prev, classes: prev.classes.filter(x => x.id !== c.id) } : prev)
                          else alert('删除失败，请重试')
                        } : undefined}
                      />
                    ))}
                  </div>
                )}
                <div style={{ height: '16px' }} />
              </>
            )}
          </div>
        )}

        {/* Homework tab */}
        {activeTab === 'homework' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {hwLoading ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>加载中…</p>
            ) : homework.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>暂未布置作业</p>
            ) : (
              homework.map((hw, i) => {
                const isDone = hw.status === 'completed'
                const isExpanded = expandedHw.has(hw.id)
                const isOverdue = hw.due_date && !isDone && new Date(hw.due_date) < new Date()
                return (
                  <div key={hw.id} style={{ borderBottom: i < homework.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div onClick={() => toggleHw(hw.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4) var(--sp-5)', cursor: 'pointer', background: isExpanded ? 'var(--c-fill-light)' : 'var(--c-card-bg)' }}>
                      {/* Status dot */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: isDone ? 'var(--c-brand)' : isOverdue ? 'var(--c-error)' : 'var(--c-lavender)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{displayTitle(hw.title)}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                          {hw.homework_exercise.length} 个动作
                          {hw.class && ` · ${hw.class.name}`}
                          {hw.due_date && (
                            <span style={{ color: isOverdue ? '#E74C3C' : '#aaa' }}>
                              {' · '}截止 {new Date(hw.due_date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                              {isOverdue && ' (逾期)'}
                            </span>
                          )}
                        </p>
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', borderRadius: 'var(--r-full)', background: isDone ? 'var(--c-fill-light)' : '#EDE6F4', color: isDone ? 'var(--c-brand)' : 'var(--c-text-secondary)', border: isDone ? '1px solid var(--c-brand)' : '1px solid var(--c-border)', flexShrink: 0, fontWeight: 500 }}>
                        {isDone ? '✓ 已完成' : '进行中'}
                      </span>
                      <span style={{ fontSize: '12px', color: '#bbb' }}>{isExpanded ? '▲' : '▼'}</span>
                      {/* Delete button — trainer only */}
                      {isTrainer && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteHomework(hw) }}
                          disabled={deletingHwId === hw.id}
                          title="删除作业"
                          style={{
                            width: 26, height: 26, border: 'none', borderRadius: '50%',
                            background: 'transparent', color: '#ccc', fontSize: 13,
                            cursor: deletingHwId === hw.id ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}
                        >
                          {deletingHwId === hw.id ? '…' : '✕'}
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-fill-light)' }}>
                        {hw.notes && (
                          <p style={{ margin: 0, padding: '10px 20px', fontSize: '13px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>
                            💬 {hw.notes}
                          </p>
                        )}
                        {[...hw.homework_exercise].sort((a, b) => a.order_num - b.order_num).map((ex, j) => (
                          <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderBottom: j < hw.homework_exercise.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--c-lavender)', color: '#fff', fontSize: 'var(--text-xs)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{j + 1}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>{ex.master_exercise.name_cn || ex.master_exercise.name_en}</p>
                              <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                                {[ex.sets && `${ex.sets}组`, ex.reps && `×${ex.reps}次`, ex.weight && `${ex.weight}${ex.weight_unit}`].filter(Boolean).join(' · ') || '按个人节奏'}
                              </p>
                              {ex.notes && <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9B7DB5' }}>📌 {ex.notes}</p>}
                            </div>
                          </div>
                        ))}
                        <div style={{ padding: '10px 20px', fontSize: '11px', color: '#bbb' }}>
                          布置于 {new Date(hw.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Assessments tab */}
        {activeTab === 'assessments' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            {/* Go to full assessment page */}
            {isTrainer && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  href={`/dashboard/assessments/${clientId}`}
                  style={{ fontSize: 13, color: 'var(--c-brand)', border: '1px solid var(--c-brand)', borderRadius: 6, padding: '5px 14px', textDecoration: 'none', fontWeight: 500 }}
                >
                  ＋ 新建 / 编辑测试
                </Link>
              </div>
            )}
            {aLoading ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>加载中…</p>
            ) : assessments.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>暂无测试记录</p>
            ) : (
              assessments.map((a, i) => {
                const metrics = [
                  a.weight_kg && `体重 ${a.weight_kg}kg`,
                  a.body_fat_pct && `体脂 ${a.body_fat_pct}%`,
                  a.smm_kg && `骨骼肌 ${a.smm_kg}kg`,
                  a.whtr && `腰高比 ${a.whtr}`,
                ].filter(Boolean).slice(0, 3)
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/assessments/${clientId}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 20px',
                      borderBottom: i < assessments.length - 1 ? '1px solid var(--c-border)' : 'none',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 4 }}>
                        {new Date(a.measured_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      {metrics.length > 0 && (
                        <div style={{ fontSize: 12, color: '#aaa' }}>
                          {metrics.join(' · ')}
                          {(a.photo_urls?.length > 0) && ` · 📷 ${a.photo_urls.length}张`}
                        </div>
                      )}
                      {a.notes && (
                        <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>💬 {a.notes}</div>
                      )}
                    </div>
                    <span style={{ color: 'var(--c-text-hint)', fontSize: 18 }}>›</span>
                  </Link>
                )
              })
            )}
          </div>
        )}

        {/* 生理周期 tab */}
        {activeTab === 'cycle' && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddCycle(v => !v)}
                style={{ fontSize: 13, color: 'var(--c-brand)', border: '1px solid var(--c-brand)', borderRadius: 6, padding: '5px 14px', background: 'none', cursor: 'pointer', fontWeight: 500 }}>
                {showAddCycle ? '取消' : '＋ 记录一次'}
              </button>
            </div>

            {showAddCycle && (
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-fill-light)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>开始日期 *</label>
                    <input type="date" value={cycleForm.start_date}
                      onChange={e => setCycleForm(p => ({ ...p, start_date: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>结束日期</label>
                    <input type="date" value={cycleForm.end_date}
                      onChange={e => setCycleForm(p => ({ ...p, end_date: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>流量</label>
                    <select value={cycleForm.flow_level} onChange={e => setCycleForm(p => ({ ...p, flow_level: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
                      <option value="">不记录</option>
                      {Object.entries(FLOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>痛经程度</label>
                    <select value={cycleForm.pain_level} onChange={e => setCycleForm(p => ({ ...p, pain_level: e.target.value }))}
                      style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}>
                      <option value="">不记录</option>
                      {Object.entries(PAIN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px' }}>备注</label>
                  <textarea rows={2} value={cycleForm.notes}
                    onChange={e => setCycleForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="例：情绪波动大，腰酸..."
                    style={{ width: '100%', padding: '7px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button onClick={handleAddCycle} disabled={!cycleForm.start_date || savingCycle}
                  style={{
                    padding: '7px 18px',
                    background: !cycleForm.start_date || savingCycle ? 'var(--c-lavender)' : 'var(--c-brand)',
                    color: '#fff', border: 'none', borderRadius: 'var(--r-sm)',
                    cursor: !cycleForm.start_date || savingCycle ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--text-sm)', fontWeight: 500,
                  }}>
                  {savingCycle ? '保存中...' : '保存'}
                </button>
              </div>
            )}

            {cycleLoading ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>加载中…</p>
            ) : cycleLogs.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: '#bbb', margin: 0 }}>暂无周期记录</p>
            ) : (
              cycleLogs.map((c, i) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px',
                  borderBottom: i < cycleLogs.length - 1 ? '1px solid var(--c-border)' : 'none',
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
                    title="删除记录"
                    style={{
                      width: 26, height: 26, border: 'none', borderRadius: '50%',
                      background: 'transparent', color: '#ccc', fontSize: 13,
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
      </main>
    </div>
  )
}

function ClassRow({ c, onDelete }: { c: ClientClass; onDelete?: () => void }) {
  const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete() }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ width: 3, height: 40, borderRadius: 2, background: c.color || 'var(--c-lavender)', flexShrink: 0 }} />
      <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px' }}>{c.name}</p>
        <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
          {new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN')}
          {c.start_time && ` · ${c.start_time.slice(0, 5)}`}
          {c.discipline && ` · ${c.discipline}`}
        </p>
      </Link>
      <span style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', borderRadius: 'var(--r-full)', background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)', border: '1px solid var(--c-border)', flexShrink: 0 }}>
        {STATUS_LABEL[c.status] || c.status}
      </span>
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="删除课程"
          style={{
            width: 26, height: 26, border: 'none', borderRadius: '50%',
            background: 'transparent', color: '#ccc', fontSize: 13,
            cursor: deleting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc' }}
        >
          {deleting ? '…' : '✕'}
        </button>
      )}
    </div>
  )
}
