'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { NumField } from './NumField'
import { ExercisePicker, LibExercise, Picked } from './ExercisePicker'
import {
  PersonalWorkout, PersonalWorkoutExercise, WorkoutType, TYPE_META, exerciseSummary, localToday,
} from './types'

// 教练个人训练的录入/编辑表单。新建和编辑共用。
// 定位是"手动补记为主"：练完（或者隔天）回来把练了什么记上。

interface Draft {
  key: string
  exercise_id: string | null
  name: string
  sets: string
  reps: string
  weight: string
  weight_unit: string
  duration_sec: string
  notes: string
}

export interface WorkoutInitial {
  date?: string
  title?: string | null
  type?: WorkoutType
  duration_min?: number | null
  notes?: string | null
  exercises?: PersonalWorkoutExercise[]
}

let keySeq = 0
const newKey = () => `r${++keySeq}`
const s = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))
const toDraft = (e: PersonalWorkoutExercise): Draft => ({
  key: newKey(),
  exercise_id: e.exercise_id,
  name: e.name,
  sets: s(e.sets), reps: s(e.reps), weight: s(e.weight),
  weight_unit: e.weight_unit === 'lb' ? 'lb' : 'kg',
  duration_sec: s(e.duration_sec),
  notes: e.notes || '',
})

const fieldLabel: React.CSSProperties = { fontSize: 10, color: 'var(--c-text-hint)', marginBottom: 3 }
const smallInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '7px 6px', border: '1px solid var(--c-border)',
  borderRadius: 6, fontSize: 14, textAlign: 'center', background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
}
const arrowBtn: React.CSSProperties = {
  width: 26, height: 22, border: '1px solid var(--c-border)', borderRadius: 4, background: 'var(--c-card-bg)',
  color: 'var(--c-text-secondary)', fontSize: 11, cursor: 'pointer', padding: 0,
}

// 一个动作的一行。放在组件外面定义——放里面的话每次 render 都是新组件，输入框每敲一个字就丢焦点。
function ExerciseRow({
  d, index, total, lastHint, t, onChange, onMove, onRemove,
}: {
  d: Draft
  index: number
  total: number
  lastHint?: string
  t: (zh: string, en: string) => string
  onChange: (key: string, patch: Partial<Draft>) => void
  onMove: (key: string, dir: -1 | 1) => void
  onRemove: (key: string) => void
}) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button type="button" style={{ ...arrowBtn, opacity: index === 0 ? 0.3 : 1 }} disabled={index === 0}
            onClick={() => onMove(d.key, -1)} aria-label={t('上移', 'Up')}>▲</button>
          <button type="button" style={{ ...arrowBtn, opacity: index === total - 1 ? 0.3 : 1 }} disabled={index === total - 1}
            onClick={() => onMove(d.key, 1)} aria-label={t('下移', 'Down')}>▼</button>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
            {index + 1}. {d.name}
            {!d.exercise_id && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: '#B08A5A', background: '#F7EFE4', padding: '1px 6px', borderRadius: 6 }}>
                {t('未关联动作库', 'Not in library')}
              </span>
            )}
          </div>
          {lastHint && <div style={{ fontSize: 11, color: 'var(--c-text-secondary)', marginTop: 2 }}>{t('上次', 'Last')}：{lastHint}</div>}
        </div>
        <button type="button" onClick={() => onRemove(d.key)} aria-label={t('删除', 'Remove')}
          style={{ border: 'none', background: 'none', color: '#bbb', fontSize: 15, cursor: 'pointer', padding: 4 }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr 1fr', gap: 6, marginBottom: 6 }}>
        <div>
          <div style={fieldLabel}>{t('组数', 'Sets')}</div>
          <NumField value={d.sets} onChange={v => onChange(d.key, { sets: v })} style={smallInput} ariaLabel="sets" />
        </div>
        <div>
          <div style={fieldLabel}>{t('次数', 'Reps')}</div>
          <NumField value={d.reps} onChange={v => onChange(d.key, { reps: v })} style={smallInput} ariaLabel="reps" />
        </div>
        <div>
          <div style={fieldLabel}>{t('重量', 'Weight')}</div>
          <div style={{ display: 'flex', gap: 3 }}>
            <NumField decimal value={d.weight} onChange={v => onChange(d.key, { weight: v })} style={{ ...smallInput, flex: 1, minWidth: 0 }} ariaLabel="weight" />
            <button type="button"
              onClick={() => onChange(d.key, { weight_unit: d.weight_unit === 'kg' ? 'lb' : 'kg' })}
              style={{ border: '1px solid var(--c-border)', borderRadius: 6, background: 'var(--c-page-bg)', color: 'var(--c-text-secondary)', fontSize: 11, padding: '0 5px', cursor: 'pointer' }}>
              {d.weight_unit}
            </button>
          </div>
        </div>
        <div>
          <div style={fieldLabel}>{t('时长(秒)', 'Time (s)')}</div>
          <NumField value={d.duration_sec} onChange={v => onChange(d.key, { duration_sec: v })} style={smallInput} ariaLabel="seconds" />
        </div>
      </div>
      <input type="text" value={d.notes} onChange={e => onChange(d.key, { notes: e.target.value })}
        placeholder={t('备注（选填，如：最后一组力竭、左侧偏弱）', 'Notes (optional)')}
        style={{ ...smallInput, textAlign: 'left', fontSize: 13 }} />
    </div>
  )
}

export function WorkoutForm({
  userId, userRole, lang, t, mode, workoutId, initial, onSaved, onCancel,
}: {
  userId: string
  userRole: string
  lang: 'zh' | 'en'
  t: (zh: string, en: string) => string
  mode: 'create' | 'edit'
  workoutId?: string
  initial?: WorkoutInitial
  onSaved: (w: PersonalWorkout) => void
  onCancel?: () => void
}) {
  const [date, setDate] = useState(initial?.date || localToday())
  const [type, setType] = useState<WorkoutType>(initial?.type || 'strength')
  const [title, setTitle] = useState(initial?.title || '')
  const [durationMin, setDurationMin] = useState(s(initial?.duration_min))
  const [notes, setNotes] = useState(initial?.notes || '')
  const [rows, setRows] = useState<Draft[]>(() => (initial?.exercises || []).map(toDraft))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const dirty = useRef(false)

  const [library, setLibrary] = useState<LibExercise[]>([])
  const [history, setHistory] = useState<PersonalWorkout[]>([])

  useEffect(() => {
    const headers = { 'x-user-id': userId, 'x-user-role': userRole }
    fetch('/api/exercises', { headers }).then(r => r.ok ? r.json() : []).then(setLibrary).catch(() => {})
    fetch('/api/personal-workouts', { headers }).then(r => r.ok ? r.json() : []).then(setHistory).catch(() => {})
  }, [userId, userRole])

  // 没保存就离开时提醒一下——手动补记一次要填不少东西
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  // 自己每个动作"上一次"怎么练的：选动作时用来预填，也在行上显示，方便对比加没加重量
  const { lastByExId, recentIds } = useMemo(() => {
    const last: Record<string, PersonalWorkoutExercise> = {}
    const recent: string[] = []
    for (const w of history) {            // 接口已按日期倒序
      if (w.id === workoutId) continue    // 编辑时不拿自己当"上次"
      for (const e of w.exercises || []) {
        if (e.exercise_id && !last[e.exercise_id]) { last[e.exercise_id] = e; recent.push(e.exercise_id) }
      }
    }
    return { lastByExId: last, recentIds: recent }
  }, [history, workoutId])

  const lastSummary = useMemo(() => {
    const m: Record<string, string> = {}
    for (const [id, e] of Object.entries(lastByExId)) m[id] = exerciseSummary(e, lang)
    return m
  }, [lastByExId, lang])

  const touch = () => { dirty.current = true }
  const changeRow = (key: string, patch: Partial<Draft>) => { touch(); setRows(rs => rs.map(r => r.key === key ? { ...r, ...patch } : r)) }
  const removeRow = (key: string) => { touch(); setRows(rs => rs.filter(r => r.key !== key)) }
  const moveRow = (key: string, dir: -1 | 1) => {
    touch()
    setRows(rs => {
      const i = rs.findIndex(r => r.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= rs.length) return rs
      const next = [...rs]; [next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const handlePick = (p: Picked) => {
    touch()
    setPickerOpen(false)
    if (p.kind === 'free') {
      setRows(rs => [...rs, { key: newKey(), exercise_id: null, name: p.name, sets: '', reps: '', weight: '', weight_unit: 'kg', duration_sec: '', notes: '' }])
      return
    }
    const ex = p.exercise
    const name = lang === 'zh' ? (ex.name_cn || ex.name_en) : (ex.name_en || ex.name_cn)
    const last = lastByExId[ex.id]
    // 预填：上次自己怎么练的 > 动作库默认值
    const draft: Draft = last
      ? { ...toDraft(last), key: newKey(), exercise_id: ex.id, name, notes: '' }
      : {
          key: newKey(), exercise_id: ex.id, name,
          sets: s(ex.default_sets), reps: s(ex.default_reps), weight: s(ex.default_weight),
          weight_unit: ex.default_weight_unit === 'lb' ? 'lb' : 'kg',
          duration_sec: ex.default_duration_unit === 'seconds' ? s(ex.default_duration) : '',
          notes: '',
        }
    setRows(rs => [...rs, draft])
  }

  const handleSave = async () => {
    if (saving) return
    if (!date) { setError(t('请选择日期', 'Pick a date')); return }
    setSaving(true)
    setError('')
    try {
      const num = (v: string) => (v === '' ? null : Number(v))
      const payload = {
        date, type,
        title: title.trim() || null,
        duration_min: num(durationMin),
        notes: notes.trim() || null,
        exercises: rows.map(r => ({
          exercise_id: r.exercise_id,
          name: r.name,
          sets: num(r.sets), reps: num(r.reps), weight: num(r.weight),
          weight_unit: r.weight_unit,
          duration_sec: num(r.duration_sec),
          notes: r.notes.trim() || null,
        })),
      }
      const res = await fetch(mode === 'create' ? '/api/personal-workouts' : `/api/personal-workouts/${workoutId}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-user-role': userRole },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('保存失败', 'Save failed'))
      dirty.current = false
      onSaved(data as PersonalWorkout)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', marginBottom: 14 }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, color: 'var(--c-text-secondary)', marginBottom: 5 }
  const textInput: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid var(--c-border)',
    borderRadius: 8, fontSize: 14, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
  }

  return (
    <div>
      {/* 基本信息 */}
      <div style={{ ...card, padding: 14 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(Object.keys(TYPE_META) as WorkoutType[]).map(k => {
            const on = type === k
            return (
              <button key={k} type="button" onClick={() => { touch(); setType(k) }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                  border: `1.5px solid ${on ? TYPE_META[k].color : 'var(--c-border)'}`,
                  background: on ? TYPE_META[k].bg : 'var(--c-card-bg)',
                  color: on ? TYPE_META[k].color : 'var(--c-text-secondary)', fontWeight: on ? 600 : 400,
                }}>
                {lang === 'zh' ? TYPE_META[k].zh : TYPE_META[k].en}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={label}>{t('日期', 'Date')}</label>
            <input type="date" value={date} max={localToday()} onChange={e => { touch(); setDate(e.target.value) }} style={textInput} />
          </div>
          <div>
            <label style={label}>{t('总时长（分钟）', 'Duration (min)')}</label>
            <NumField value={durationMin} onChange={v => { touch(); setDurationMin(v) }} placeholder={t('选填', 'Optional')} style={textInput} />
          </div>
        </div>

        <label style={label}>{t('标题', 'Title')}</label>
        <input type="text" value={title} onChange={e => { touch(); setTitle(e.target.value) }}
          placeholder={type === 'strength' ? t('选填，如：下肢日 / 推', 'Optional, e.g. Leg day')
            : type === 'pilates' ? t('选填，如：核心床 / 垫上', 'Optional, e.g. Reformer')
            : t('选填，如：跑步 / 拉伸', 'Optional, e.g. Run')}
          style={{ ...textInput, marginBottom: 12 }} />

        <label style={label}>{t('备注', 'Notes')}</label>
        <textarea value={notes} onChange={e => { touch(); setNotes(e.target.value) }} rows={2}
          placeholder={t('选填：状态、感受、哪里不舒服…', 'Optional: how it felt…')}
          style={{ ...textInput, resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      {/* 动作明细 */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: rows.length ? '1px solid var(--c-border)' : 'none', display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
            {t('动作明细', 'Exercises')}{rows.length > 0 && <span style={{ fontWeight: 400, color: 'var(--c-text-secondary)', marginLeft: 6 }}>{rows.length}</span>}
          </span>
        </div>
        {rows.map((d, i) => (
          <ExerciseRow key={d.key} d={d} index={i} total={rows.length}
            lastHint={d.exercise_id ? lastSummary[d.exercise_id] : undefined}
            t={t} onChange={changeRow} onMove={moveRow} onRemove={removeRow} />
        ))}
        <button type="button" onClick={() => setPickerOpen(true)}
          style={{ width: '100%', padding: '13px', border: 'none', background: 'var(--c-fill-light)', color: 'var(--c-brand)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ＋ {t('添加动作', 'Add exercise')}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: '#8C4A4A', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: 13, borderRadius: 10, border: '1px solid var(--c-border)', background: 'var(--c-card-bg)', color: 'var(--c-text-secondary)', fontSize: 15, cursor: 'pointer' }}>
            {t('取消', 'Cancel')}
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ flex: 2, padding: 13, borderRadius: 10, border: 'none', background: saving ? 'var(--c-lavender)' : 'var(--c-brand)', color: 'white', fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? t('保存中…', 'Saving…') : t('保存', 'Save')}
        </button>
      </div>

      {pickerOpen && (
        <ExercisePicker
          library={library} recentIds={recentIds} lastSummary={lastSummary}
          userId={userId} lang={lang} t={t}
          onPick={handlePick}
          onCreated={ex => setLibrary(l => [ex, ...l])}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
