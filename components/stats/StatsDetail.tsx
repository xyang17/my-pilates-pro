'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
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
  // 导出 Excel 用。revenue = 实际计入统计的收入（挂包的课是包均价×扣的节数），
  // price = 原始课价（挂包的课为空）。两者都导，教练在 Excel 里求和才能跟页面对上。
  revenue?: number
  package_id?: string | null
  package_units?: number | null
  pay_per_class?: boolean
  notes?: string
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

// ── 导出 Excel ──────────────────────────────────────────────────────────
//
// 导的就是教练当前在明细里看到的那些课（已经过完 clientFilter / typeFilter / statusFilter）。
// 「所见即所得」是刻意的：导出按钮就在筛选器下面，导出别的东西会让人莫名其妙。
//
// 两列钱都给：
//   价格     = class.price，挂了课时包的课这列是空的（钱在包里，不是漏填）
//   计入收入 = 统计页实际计入的金额，挂包的课 = 包单节均价 × 扣的节数
// 只给前者，教练在 Excel 里一求和就对不上页面上的收入数字。
//
// xlsx 是动态 import 的：这个库不小，只有真点了导出才值得加载。
async function exportToExcel(opts: {
  rows: ClassDetail[]
  lang: string
  t: (zh: string, en: string) => string
  showTrainer: boolean
  rangeLabel: string
  rangeStart: string
  rangeEnd: string
  scope: string
  typeFilter: string
  statusFilter: StatusFilter
  clientName?: string
}) {
  const { rows, lang, t, showTrainer, rangeLabel, rangeStart, rangeEnd, scope, typeFilter, statusFilter, clientName } = opts
  const XLSX = await import('xlsx')
  const zh = lang === 'zh'

  const typeText = (c: ClassDetail) =>
    c.class_type === 'group' ? t('团课', 'Group')
    : c.class_type === 'private' ? t('私教', 'Private')
    : c.class_type
  const statusText = (c: ClassDetail) => {
    const st = STATUS[c.status]
    return st ? (zh ? st.text : st.en) : c.status
  }
  const payText = (c: ClassDetail) =>
    c.package_id ? t('课时包', 'Package')
    : c.pay_per_class ? t('按次收费', 'Per class')
    : ''

  const header = [
    t('日期', 'Date'),
    t('星期', 'Weekday'),
    t('开始时间', 'Start'),
    t('时长(分钟)', 'Duration (min)'),
    t('学员', 'Clients'),
    t('课程名称', 'Class name'),
    t('类型', 'Type'),
    t('状态', 'Status'),
    ...(showTrainer ? [t('教练', 'Trainer')] : []),
    t('价格(元)', 'Price'),
    t('计入收入(元)', 'Counted revenue'),
    t('付费方式', 'Payment'),
    t('扣课时(节)', 'Sessions used'),
    t('价格提醒', 'Price flag'),
    t('课程备注', 'Notes'),
  ]

  const body = rows.map(c => {
    const dt = new Date(`${c.date}T00:00:00`)
    return [
      c.date,
      zh ? `周${WEEK[dt.getDay()]}` : WEEK_EN[dt.getDay()],
      c.start_time ? c.start_time.slice(0, 5) : '',
      c.duration || null,
      c.students.join(zh ? '、' : ', '),
      c.name || '',
      typeText(c),
      statusText(c),
      ...(showTrainer ? [c.trainer_name || ''] : []),
      c.price,                                   // null 就留空，不要写 0
      // 只有已完成的课才填这一列。统计页的收入也只算已完成的，
      // 未上/已取消的课如果也写上金额，整列一求和就会比页面上的收入多出来。
      c.status === 'completed' ? (c.revenue ?? c.price ?? 0) : null,
      payText(c),
      c.package_id ? (c.package_units ?? 1) : null,
      FLAG_TEXT(c, t),
      c.notes || '',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([header, ...body])
  ws['!cols'] = [
    { wch: 11 }, { wch: 6 }, { wch: 7 }, { wch: 11 }, { wch: 16 }, { wch: 20 },
    { wch: 7 }, { wch: 8 }, ...(showTrainer ? [{ wch: 10 }] : []),
    { wch: 10 }, { wch: 13 }, { wch: 10 }, { wch: 11 }, { wch: 18 }, { wch: 50 },
  ]
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: body.length, c: header.length - 1 } }),
  }

  // 汇总页：把「这份文件到底是哪些课」记下来。
  // 导出是跟着筛选走的，不记下来过两个月就不知道这份表是什么了。
  const completed = rows.filter(c => c.status === 'completed')
  const revenueSum = completed.reduce((s, c) => s + (c.revenue ?? c.price ?? 0), 0)
  const now = new Date()
  const meta: (string | number)[][] = [
    [t('课程明细导出', 'Class detail export'), ''],
    [t('导出时间', 'Exported at'), `${now.toLocaleDateString()} ${now.toTimeString().slice(0, 5)}`],
    [t('统计区间', 'Period'), `${rangeLabel}（${rangeStart} ~ ${rangeEnd}）`],
    [t('数据范围', 'Scope'), scope === 'store' ? t('全店', 'Whole studio') : t('只看自己', 'Own classes only')],
    [t('类型筛选', 'Type filter'), typeFilter === 'all' ? t('全部类型', 'All types') : typeFilter === 'private' ? t('私教', 'Private') : t('团课', 'Group')],
    [t('状态筛选', 'Status filter'),
      statusFilter === 'all' ? t('全部', 'All')
      : statusFilter === 'completed' ? t('已完成', 'Done')
      : statusFilter === 'notDone' ? t('未上', 'Pending')
      : statusFilter === 'cancelled' ? t('已取消', 'Cancelled')
      : t('价格待核对', 'Check price')],
    [t('只看学员', 'Client filter'), clientName || t('不限', 'All clients')],
    ['', ''],
    [t('课程节数', 'Classes'), rows.length],
    [t('其中已完成', 'Completed'), completed.length],
    [t('已完成收入合计(元)', 'Completed revenue'), Math.round(revenueSum)],
    ['', ''],
    [t('说明', 'Note'),
      t('「价格」是建课时填的课价，挂了课时包的课这列为空（钱在包里）；「计入收入」才是统计页实际计算的金额，只有已完成的课才有值，整列求和就等于上面的收入合计。',
        '“Price” is the price entered on the class; it is blank for classes paid from a package. “Counted revenue” is what the stats page actually counts — only completed classes have a value, and summing the column equals the total above.')],
    [t('自我练习', 'Self practice'),
      t('学员自己练的不是计费上课，统计和导出都不包含。', 'Client self-practice is not a billable class and is excluded from stats and this export.')],
  ]
  const wsMeta = XLSX.utils.aoa_to_sheet(meta)
  wsMeta['!cols'] = [{ wch: 20 }, { wch: 70 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, t('课程明细', 'Classes'))
  XLSX.utils.book_append_sheet(wb, wsMeta, t('汇总', 'Summary'))
  XLSX.writeFile(wb, `${t('课程明细', 'classes')}_${rangeStart}_${rangeEnd}.xlsx`)
}

export function StatsDetail({
  classes, userId, userRole, showTrainer, clientFilter, clientName, onClearClient, statusFilter, setStatusFilter, onSaved,
  rangeLabel, rangeStart, rangeEnd, scope,
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
  rangeLabel: string
  rangeStart: string
  rangeEnd: string
  scope: string
}) {
  const { lang, t } = useLang()
  const [typeFilter, setTypeFilter] = useState<'all' | 'private' | 'group'>('all')
  const [exporting, setExporting] = useState(false)
  const [exportErr, setExportErr] = useState('')

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
  // 用 revenue（挂课时包的课按包均价分摊），不是 price —— 用 price 会让挂包的课算成 0，
  // 这里的小计就跟上面的收入卡片对不上。revenue 是后端算好的，老数据没有就退回 price。
  const shownRevenue = shown.filter(c => c.status === 'completed').reduce((s, c) => s + (c.revenue ?? c.price ?? 0), 0)

  const handleExport = async () => {
    setExporting(true)
    setExportErr('')
    try {
      await exportToExcel({
        rows: shown, lang, t, showTrainer,
        rangeLabel, rangeStart, rangeEnd, scope, typeFilter, statusFilter, clientName,
      })
    } catch (e: any) {
      setExportErr(e?.message || t('导出失败', 'Export failed'))
    } finally {
      setExporting(false)
    }
  }

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

      {/* 导出按钮放在筛选器上面、紧跟标题：导出的就是下面筛出来的那些课，位置上要让人一眼看出关系 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={handleExport}
          disabled={exporting || shown.length === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid var(--c-brand)',
            background: shown.length === 0 ? 'var(--c-fill-light)' : 'var(--c-card-bg)',
            color: shown.length === 0 ? 'var(--c-text-hint)' : 'var(--c-brand)',
            cursor: exporting || shown.length === 0 ? 'not-allowed' : 'pointer',
          }}>
          <Download size={14} />
          {exporting
            ? t('正在生成…', 'Generating…')
            : t(`导出 Excel（${shown.length} 节）`, `Export Excel (${shown.length})`)}
        </button>
        <span style={{ fontSize: 11, color: 'var(--c-text-hint)' }}>
          {t('导出的就是当前筛选出的课，含价格与备注', 'Exports exactly the filtered classes, with prices and notes')}
        </span>
      </div>
      {exportErr && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#C0504D' }}>{exportErr}</p>}

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
