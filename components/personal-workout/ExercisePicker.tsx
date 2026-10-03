'use client'

import { useMemo, useState } from 'react'

// 选动作：优先从动作库选；库里没有就就地新建到动作库（同课程页的 handleQuickCreateExercise）；
// 实在不想入库，才允许"只记名字"。
//
// 为什么尽量关联 exercise_id：以后要看单个动作的进步曲线，是按 exercise_id 聚合的。
// 现在随手打字，那段历史以后就用不上了——数据只能当下记、补不回来。

export interface LibExercise {
  id: string
  name_cn: string
  name_en: string
  type_cn?: string | null
  type_en?: string | null
  equipment_cn?: string | null
  equipment_en?: string | null
  target_muscles_cn?: string | null
  target_muscles_en?: string | null
  default_sets?: number | null
  default_reps?: number | null
  default_weight?: number | null
  default_weight_unit?: string | null
  default_duration?: number | null
  default_duration_unit?: string | null
}

export type Picked =
  | { kind: 'library'; exercise: LibExercise }
  | { kind: 'free'; name: string }

const chip: React.CSSProperties = {
  fontSize: 10, padding: '1px 6px', borderRadius: 6,
  background: 'var(--c-fill-light)', color: 'var(--c-brand)',
}

export function ExercisePicker({
  library, recentIds, lastSummary, userId, lang, t, onPick, onCreated, onClose,
}: {
  library: LibExercise[]
  recentIds: string[]                        // 自己最近练过的动作（按时间倒序）
  lastSummary: Record<string, string>        // exercise_id → 上次的摘要，比如 "3×10 · 20kg"
  userId: string
  lang: 'zh' | 'en'
  t: (zh: string, en: string) => string
  onPick: (p: Picked) => void
  onCreated: (ex: LibExercise) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name_cn: '', name_en: '', type_cn: '' })
  const [err, setErr] = useState('')

  const nameOf = (e: LibExercise) => lang === 'zh' ? (e.name_cn || e.name_en) : (e.name_en || e.name_cn)

  const results = useMemo(() => {
    const s = q.trim()
    if (!s) {
      const byId = new Map(library.map(e => [e.id, e]))
      return recentIds.map(id => byId.get(id)).filter(Boolean).slice(0, 30) as LibExercise[]
    }
    const lower = s.toLowerCase()
    return library.filter(e =>
      (e.name_cn || '').includes(s) ||
      (e.name_en || '').toLowerCase().includes(lower) ||
      (e.equipment_cn || '').includes(s) ||
      (e.target_muscles_cn || '').includes(s) ||
      (e.target_muscles_en || '').toLowerCase().includes(lower)
    ).slice(0, 80)
  }, [q, library, recentIds])

  const exactHit = q.trim() !== '' && library.some(e => e.name_cn === q.trim() || e.name_en.toLowerCase() === q.trim().toLowerCase())

  const handleCreate = async () => {
    const name_cn = form.name_cn.trim()
    if (!name_cn || creating) return
    setCreating(true)
    setErr('')
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({
          name_cn,
          name_en: form.name_en.trim() || name_cn,
          type_cn: form.type_cn.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || t('新建动作失败', 'Failed to create'))
      }
      const ex: LibExercise = await res.json()
      onCreated(ex)
      onPick({ kind: 'library', exercise: ex })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setCreating(false)
    }
  }

  const input: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid var(--c-border)',
    borderRadius: 8, fontSize: 14, background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(60,40,80,0.35)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, height: '82vh', background: 'var(--c-card-bg)',
          borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0, flex: 1, fontSize: 16, color: 'var(--c-text-primary)' }}>{t('选择动作', 'Pick exercise')}</h3>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 14, color: 'var(--c-text-secondary)', cursor: 'pointer' }}>
              {t('关闭', 'Close')}
            </button>
          </div>
          <input
            autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('搜索动作名、器械、肌肉…', 'Search name, equipment, muscle…')}
            style={{ ...input, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {!q.trim() && (
            <p style={{ fontSize: 12, color: 'var(--c-text-secondary)', margin: '10px 0 4px' }}>
              {results.length > 0 ? t('最近练过', 'Recently done') : t('输入名字搜索动作库', 'Type to search the library')}
            </p>
          )}
          {results.map(e => (
            <button
              key={e.id} type="button" onClick={() => onPick({ kind: 'library', exercise: e })}
              style={{
                display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center',
                padding: '10px 0', border: 'none', borderBottom: '1px solid var(--c-border)',
                background: 'none', cursor: 'pointer',
              }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 3 }}>{nameOf(e)}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {(e.type_cn || e.type_en) && <span style={chip}>{lang === 'zh' ? (e.type_cn || e.type_en) : (e.type_en || e.type_cn)}</span>}
                  {(e.equipment_cn || e.equipment_en) && <span style={{ ...chip, background: 'var(--c-page-bg)', color: '#888' }}>{lang === 'zh' ? (e.equipment_cn || e.equipment_en) : (e.equipment_en || e.equipment_cn)}</span>}
                </div>
              </div>
              {lastSummary[e.id] && (
                <span style={{ fontSize: 11, color: 'var(--c-text-secondary)', whiteSpace: 'nowrap' }}>
                  {t('上次', 'Last')} {lastSummary[e.id]}
                </span>
              )}
            </button>
          ))}
          {q.trim() && results.length === 0 && (
            <p style={{ textAlign: 'center', color: '#bbb', fontSize: 13, padding: '20px 0 4px' }}>{t('动作库里没有匹配的动作', 'No match in library')}</p>
          )}

          {/* 库里没有 → 就地新建 */}
          {q.trim() && !exactHit && (
            <div style={{ margin: '14px 0 20px' }}>
              {!showCreate ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(true); setForm({ name_cn: q.trim(), name_en: '', type_cn: '' }) }}
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--c-brand)', background: 'var(--c-card-bg)', color: 'var(--c-brand)', fontSize: 14, cursor: 'pointer' }}>
                    ＋ {t(`把「${q.trim()}」新建到动作库`, `Add "${q.trim()}" to library`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPick({ kind: 'free', name: q.trim() })}
                    style={{ padding: '6px', border: 'none', background: 'none', color: 'var(--c-text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                    {t('只记名字，不放进动作库（以后看不了这个动作的趋势）', "Just record the name (won't show in trends)")}
                  </button>
                </div>
              ) : (
                <div style={{ padding: 12, border: '1px dashed var(--c-brand)', borderRadius: 8 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--c-text-secondary)' }}>
                    {t('新建后会直接选用，图片和说明以后去动作库补。', "It'll be picked right away; add details in the library later.")}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input type="text" value={form.name_cn} onChange={e => setForm(f => ({ ...f, name_cn: e.target.value }))}
                      placeholder={t('中文名 *', 'Name (CN) *')} style={input} />
                    <input type="text" value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                      placeholder={t('英文名（选填）', 'Name (EN)')} style={input} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" value={form.type_cn} onChange={e => setForm(f => ({ ...f, type_cn: e.target.value }))}
                      placeholder={t('分类（选填，如：下肢/核心）', 'Category (optional)')} style={input} />
                    <button type="button" onClick={handleCreate} disabled={!form.name_cn.trim() || creating}
                      style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0,
                        background: !form.name_cn.trim() || creating ? 'var(--c-lavender)' : 'var(--c-brand)', color: 'white',
                        cursor: !form.name_cn.trim() || creating ? 'not-allowed' : 'pointer',
                      }}>
                      {creating ? t('新建中…', 'Creating…') : t('新建并选用', 'Create & pick')}
                    </button>
                  </div>
                  {err && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8C4A4A' }}>{err}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
