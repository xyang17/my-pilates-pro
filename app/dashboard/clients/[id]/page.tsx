'use client'

import { useAuth } from '@/context/AuthContext'
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
  created_at: string
  classes: ClientClass[]
}

export default function ClientDetailPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hwLoading, setHwLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'classes' | 'homework'>('classes')
  const [expandedHw, setExpandedHw] = useState<Set<string>>(new Set())
  // Trainer notes edit
  const [editNotes, setEditNotes] = useState(false)
  const [notesForm, setNotesForm] = useState({ injury_notes: '', goals: '' })
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchClient()
  }, [user, authLoading])

  useEffect(() => {
    if (activeTab === 'homework' && homework.length === 0 && user) fetchHomework()
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
    setNotesForm({ injury_notes: client?.injury_notes || '', goals: client?.goals || '' })
    setEditNotes(true)
  }

  const handleSaveNotes = async () => {
    if (!client || savingNotes) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
        body: JSON.stringify(notesForm),
      })
      if (!res.ok) throw new Error('保存失败')
      setClient(prev => prev ? { ...prev, ...notesForm } : prev)
      setEditNotes(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingNotes(false)
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
          {([
            { key: 'classes', label: `课程记录 (${client.classes.length})` },
            { key: 'homework', label: `作业 (${homework.length || '…'})` },
          ] as const).map(tab => (
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
                    {upcoming.map(c => <ClassRow key={c.id} c={c} />)}
                  </div>
                )}
                {past.length > 0 && (
                  <div style={{ padding: '14px 20px 0' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#999', fontWeight: '600' }}>历史课程 ({past.length})</p>
                    {past.map(c => <ClassRow key={c.id} c={c} />)}
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
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{hw.title}</p>
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
      </main>
    </div>
  )
}

function ClassRow({ c }: { c: ClientClass }) {
  const STATUS_COLOR: Record<string, string> = { planned: '#85C1E9', in_progress: '#F7DC6F', completed: '#82E0AA' }
  const STATUS_LABEL: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
  return (
    <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ width: 3, height: 40, borderRadius: 2, background: c.color || 'var(--c-lavender)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '14px' }}>{c.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            {new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN')}
            {c.start_time && ` · ${c.start_time.slice(0, 5)}`}
            {c.discipline && ` · ${c.discipline}`}
          </p>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', padding: '3px 8px', borderRadius: 'var(--r-full)', background: 'var(--c-fill-light)', color: 'var(--c-text-secondary)', border: '1px solid var(--c-border)' }}>
          {STATUS_LABEL[c.status] || c.status}
        </span>
      </div>
    </Link>
  )
}
