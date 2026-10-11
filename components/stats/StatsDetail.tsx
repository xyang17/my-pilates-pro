'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/context/LanguageContext'

// 统计页的「课程明细」：这段时间每一节课一行，价格可以就地改。
// 价格有问题的（已完成没填价格 / 跟该学员平时价格差 20% 以上）会标出来，并给一键「按常用价填」。

export interface ClassDetail {
  id: string
  date: string
  start_time: string | null
  name: string
  class_type: string
  status: string
  price: number | null
  duration: number
  trainer_id: string
  trainer_name: string
  client_ids: string[]
  students: string[]
  usual_price: number | null
  flag: null | 'missing' | 'low' | 'high'
  editable: boolean
}

type StatusFilter = 'all' | 'completed' | 'notDone' | 'cancelled' | 'problem'

const fmtMoney = (n: number) => `¥${Math.round(n || 0).toLocaleString()}`
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS: Record<string, { text: string; en: string; color: string; bg: string }> = {
  completed:   { text: '已完成', en: 'Done', color: '#2E7D32', bg: '#E8F5E9' },
  cancelled:   { text: '已取消', en: 'Cancelled', color: '#A08080', bg: '#F5EDED' },
  planned:     { text: '未上',   en: 'Pending', color: '#9880B8', bg: '#EDE6F4' },
  scheduled:   { text: '未上',   en: 'Pending', color: '#9880B8', bg: '#EDE6F4' },
  in_progress: { text: '进行中', en: 'In progress', color: '#B07A20', bg: '#FFF8E1' },
}

const FLAG_TEXT = (d: ClassDetail, t: (zh: string, en: string) => string) =>
  d.flag === 'missing' ? t('没填价格', 'No price')
  : d.flag === 'low' ? t(`比平时（${fmtMoney(d.usual_price || 0)}）低`, `Lower than usual (${fmtMoney(d.usual_price || 0)})`)
  : d.flag === 'high' ? t(`比平时（${fmtMoney(d.usual_price || 0)}）高`, `Higher than usual (${fmtMoney(d.usual_price || 0)})`)
  : ''

// 价格格子：点一下变输入框，回车或 ✓ 保存，Esc 或 ✕ 取消
function PriceCell({ d, userId, userRole, onSaved }: {
  d: ClassDetail
  userId: string
  userRole: string
  onSaved: (id: string, price: number | null) => void
}) {
  const { t } = useLang()
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async (raw: string) => {
    if (saving) return
    const price = raw.trim() === '' ? null : Number(raw)
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setErr(t('请输入数字', 'Enter a number')); return }
    setSaving(true); setErr('')
    try {
      const res = await fetch(`/api/classes/${d.id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-user-role': userRole },
        body: JSON.stringify({ price }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('保存失败', 'Save failed'))
      onSaved(d.id, data.price === null ? null : Number(data.price))
      setEditing(false)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    const empty = d.price === null || d.price === 0
    return (
      <div style={{ textAlign: 'right' }}>
        <button
          disabled={!d.editable}
          onClick={() => { setVal(empty ? '' : String(d.price)); setEditing(true) }}
          title={d.editable ? t('点一下改价格', 'Tap to edit price') : t('只能改自己的课', 'You can only edit your own classes')}
          style={{
            border: d.editable ? '1px dashed var(--c-border-em)' : '1px solid transparent',
            background: 'transparent', borderRadius: 6, padding: '3px 8px', cursor: d.editable ? 'pointer' : 'default',
            fontSize: 15, fontWeight: 700,
            color: d.flag === 'missing' ? '#C0504D' : d.status === 'cancelled' ? 'var(--c-text-hint)' : 'var(--c-text-primary)',
            textDecoration: d.status === 'cancelled' ? 'line-through' : 'none',
          }}>
          {empty ? t('未填', 'None') : fmtMoney(d.price!)}
        </button>
        {d.editable && d.flag && d.usual_price ? (
          <div>
            <button onClick={() => save(String(d.usual_price))} disabled={saving}
              style={{ marginTop: 3, border: 'none', background: 'none', color: 'var(--c-brand)', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
              {saving ? t('保存中…', 'Saving…') : t(`按 ${fmtMoney(d.usual_price)} 填`, `Use ${fmtMoney(d.usual_price)}`)}
            </button>
          </div>
        ) : null}
        {err && <div style={{ fontSize: 11, color: '#C0504D' }}>{err}</div>}
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, color: 'var(--c-text-secondary)' }}>¥</span>
        <input
          autoFocus type="text" inputMode="decimal" value={val}
          onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setVal(v) }}
          onKeyDown={e => { if (e.key === 'Enter') save(val); if (e.key === 'Escape') setEditing(false) }}
          placeholder={t('价格', 'Price')}
          style={{ width: 72, padding: '5px 6px', border: '1.5px solid var(--c-brand)', borderRadius: 6, fontSize: 14, textAlign: 'right' }}
        />
        <button onClick={() => save(val)} disabled={saving} aria-label={t('保存', 'Save')}
          style={{ border: 'none', background: 'var(--c-brand)', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 13 }}>
          {saving ? '…' : '✓'}
        </button>
        <button onClick={() => { setEditing(false); setErr('') }} aria-label={t('取消', 'Cancel')}
          style={{ border: '1px solid var(--c-border)', background: 'var(--c-card-bg)', color: 'var(--c-text-secondary)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 12 }}>
          ✕
        </button>
      </div>
      {d.usual_price ? <div style={{ fontSize: 11, color: 'var(--c-text-hint)', marginTop: 2 }}>{t('平时', 'Usual')} {fmtMoney(d.usual_price)}</div> : null}
      {err && <div style={{ fontSize: 11, color: '#C0504D' }}>{err}</div>}
    </div>
  )
}

export function StatsDetail({
  classes, userId, userRole, showTrainer, clientFilter, clientName, onClearClient, statusFilter, setStatusFilter, onSaved,
}: {
  classes: ClassDetail[]
  userId: string
  userRole: string
  showTrainer: boolean
  clientFilter: string | null
  clientName?: string
  onClearClient: () => void
  statusFilter: StatusFilter
  setStatusFilter: (f: StatusFilter) => void
  onSaved: (id: string, price: number | null) => void
}) {
  const { lang, t } = useLang()
  const [typeFilter, setTypeFilter] = useState<'all' | 'private' | 'group'>('all')

  const base = useMemo(() => classes.filter(c =>
    (!clientFilter || c.client_ids.includes(clientFilter)) &&
    (typeFilter === 'all' || c.class_type === typeFilter)
  ), [classes, clientFilter, typeFilter])

  const isNotDone = (c: ClassDetail) => c.status !== 'completed' && c.status !== 'cancelled'
  const counts = {
    all: base.length,
    completed: base.filter(c => c.status === 'completed').length,
    notDone: base.filter(isNotDone).length,
    cancelled: base.filter(c => c.status === 'cancelled').length,
    problem: base.filter(c => c.flag).length,
  }
  const shown = base.filter(c =>
    statusFilter === 'all' ? true
    : statusFilter === 'completed' ? c.status === 'completed'
    : statusFilter === 'notDone' ? isNotDone(c)
    : statusFilter === 'cancelled' ? c.status === 'cancelled'
    : !!c.flag
  )
  const shownRevenue = shown.filter(c => c.status === 'completed').reduce((s, c) => s + (c.price || 0), 0)

  // 按日期分组
  const groups: [string, ClassDetail[]][] = []
  for (const c of shown) {
    const last = groups[groups.length - 1]
    if (last && last[0] === c.date) last[1].push(c)
    else groups.push([c.date, [c]])
  }

  const chip = (on: boolean, warn = false): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 16, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    border: `1px solid ${on ? (warn ? '#C0504D' : 'var(--c-brand)') : warn ? '#E8C4C2' : 'var(--c-border)'}`,
    background: on ? (warn ? '#C0504D' : 'var(--c-brand)') : 'var(--c-card-bg)',
    color: on ? '#fff' : warn ? '#C0504D' : 'var(--c-text-secondary)',
    fontWeight: on ? 600 : 400,
  })

  return (
    <div id="class-detail" style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>{t('课程明细', 'Class details')}</h3>
        <span style={{ fontSize: 12, color: 'var(--c-text-secondary)' }}>
          {shown.length} {t('节', 'classes')}{statusFilter !== 'notDone' && statusFilter !== 'cancelled' ? ` · ${t('已完成收入', 'Completed revenue')} ${fmtMoney(shownRevenue)}` : ''}
        </span>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--c-text-hint)' }}>
        {t('点价格可以直接改。「比平时低/高」是跟这个学员最近的价格比，只是提醒，不一定是错的。', 'Tap a price to edit it. “Lower/higher than usual” compares with this client’s recent prices — just a hint, not necessarily wrong.')}
      </p>

      {clientFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--c-fill-light)', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
          <span style={{ flex: 1, color: 'var(--c-text-primary)' }}>{t('只看：', 'Only: ')}<b>{clientName || t('该学员', 'this client')}</b></span>
          <button onClick={onClearClient} style={{ border: 'none', background: 'none', color: 'var(--c-brand)', fontSize: 12, cursor: 'pointer' }}>{t('看全部 ✕', 'Show all ✕')}</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 6 }}>
        <button style={chip(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>{t('全部', 'All')} {counts.all}</button>
        <button style={chip(statusFilter === 'completed')} onClick={() => setStatusFilter('completed')}>{t('已完成', 'Done')} {counts.completed}</button>
        <button style={chip(statusFilter === 'notDone')} onClick={() => setStatusFilter('notDone')}>{t('未上', 'Pending')} {counts.notDone}</button>
        <button style={chip(statusFilter === 'cancelled')} onClick={() => setStatusFilter('cancelled')}>{t('已取消', 'Cancelled')} {counts.cancelled}</button>
        {counts.problem > 0 && (
          <button style={chip(statusFilter === 'problem', true)} onClick={() => setStatusFilter('problem')}>⚠ {t('价格待核对', 'Check price')} {counts.problem}</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {([['all', t('全部类型', 'All types')], ['private', t('私教', 'Private')], ['group', t('团课', 'Group')]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTypeFilter(k)}
            style={{ border: 'none', background: 'none', padding: '2px 4px', fontSize: 12, cursor: 'pointer',
              color: typeFilter === k ? 'var(--c-brand)' : 'var(--c-text-hint)', fontWeight: typeFilter === k ? 700 : 400,
              borderBottom: `2px solid ${typeFilter === k ? 'var(--c-brand)' : 'transparent'}` }}>
            {l}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--c-text-hint)', fontSize: 13, padding: '20px 0', margin: 0 }}>
          {statusFilter === 'problem' ? t('价格都没问题 👍', 'All prices look fine 👍') : t('没有符合条件的课', 'No matching classes')}
        </p>
      ) : groups.map(([date, items]) => {
        const dt = new Date(`${date}T00:00:00`)
        return (
          <div key={date}>
            <div style={{ fontSize: 12, color: 'var(--c-text-secondary)', fontWeight: 600, padding: '10px 0 4px', borderBottom: '1px solid var(--c-border)' }}>
              {lang === 'zh' ? `${dt.getMonth() + 1}月${dt.getDate()}日 周${WEEK[dt.getDay()]}` : `${WEEK_EN[dt.getDay()]}, ${dt.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
            </div>
            {items.map(c => {
              const st = STATUS[c.status] || STATUS.planned
              return (
                <div key={c.id} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--c-border)',
                  background: c.flag ? 'linear-gradient(90deg, #FFF6F5 0, transparent 70%)' : 'transparent',
                }}>
                  <span style={{ width: 40, flexShrink: 0, fontSize: 13, color: 'var(--c-text-secondary)', paddingTop: 4 }}>
                    {c.start_time ? c.start_time.slice(0, 5) : '--:--'}
                  </span>
                  <Link href={`/dashboard/classes/${c.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.students.length ? c.students.slice(0, 2).join(lang === 'zh' ? '、' : ', ') + (c.students.length > 2 ? t(` 等${c.students.length}人`, ` +${c.students.length - 2}`) : '') : c.name}
                    </div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: 'var(--c-fill-light)', color: 'var(--c-brand)' }}>
                        {c.class_type === 'group' ? t('团课', 'Group') : c.class_type === 'private' ? t('私教', 'Private') : c.class_type}
                      </span>
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: st.bg, color: st.color }}>{lang === 'zh' ? st.text : st.en}</span>
                      {c.duration ? <span style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>{c.duration}{t('分钟', ' min')}</span> : null}
                      {showTrainer && c.trainer_name && <span style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>· {c.trainer_name}</span>}
                      {c.students.length > 0 && <span style={{ fontSize: 11, color: 'var(--c-text-hint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>· {c.name}</span>}
                    </div>
                    {c.flag && <div style={{ fontSize: 11, color: '#C0504D', marginTop: 3, fontWeight: 600 }}>⚠ {FLAG_TEXT(c, t)}</div>}
                  </Link>
                  <PriceCell d={c} userId={userId} userRole={userRole} onSaved={onSaved} />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
