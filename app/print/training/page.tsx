'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

// 训练记录打印页（A4）。点「保存为 PDF」调起浏览器打印，在打印窗口里选「存储为 PDF」即可。
// 放在 /print 下而不是 /dashboard 下：不带侧边栏和底栏，打印出来干净。
// 数据来自 /api/clients/[id]/export（只给教练/管理员，不含价格）。

interface SetDetail { set_no: number; reps: number | null; weight: number | null; weight_unit: string | null; notes: string | null }
interface Ex {
  name_cn: string; name_en: string
  sets: number | null; reps: number | null; weight: number | null; weight_unit: string | null
  duration: number | null; duration_unit: string | null
  actual_sets: number | null; actual_reps: number | null; actual_weight: number | null
  instance_notes: string | null; post_note: string | null
  set_details: SetDetail[]
}
interface Cls {
  id: string; date: string; start_time: string | null; name: string; class_type: string
  discipline: string | null; level: string | null; status: string; duration: number | null
  notes: string | null; post_summary: string | null; trainer_name: string
  exercises: Ex[]
}
interface ExportData {
  client: { id: string; name: string }
  range: { from: string; to: string }
  include_self_practice: boolean
  classes: Cls[]
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const fmtDay = (d: string) => {
  const dt = new Date(`${d}T00:00:00`)
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 周${WEEK[dt.getDay()]}`
}
const fmtShort = (d: string) => `${Number(d.slice(0, 4))}.${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
const TYPE: Record<string, string> = { private: '私教', group: '团课', self_practice: '自我练习' }
const STATUS: Record<string, string> = { completed: '已完成', planned: '未上', scheduled: '未上', in_progress: '进行中' }
const unitText = (u: string | null) => (u === 'seconds' ? '秒' : u === 'minutes' ? '分钟' : u || '')

function planned(e: Ex) {
  const p: string[] = []
  if (e.sets && e.reps) p.push(`${e.sets}组 × ${e.reps}次`)
  else if (e.sets) p.push(`${e.sets}组`)
  else if (e.reps) p.push(`${e.reps}次`)
  if (e.weight !== null && e.weight !== undefined && Number(e.weight) > 0) p.push(`${Number(e.weight)}${e.weight_unit || 'kg'}`)
  if (e.duration) p.push(`${e.duration}${unitText(e.duration_unit)}`)
  return p.join('，')
}
function actual(e: Ex) {
  if (e.set_details?.length) {
    return e.set_details.map(s => {
      const w = s.weight !== null && Number(s.weight) > 0 ? ` @${Number(s.weight)}${s.weight_unit || 'kg'}` : ''
      return `第${s.set_no}组 ${s.reps ?? '-'}次${w}${s.notes ? `（${s.notes}）` : ''}`
    }).join('；')
  }
  const p: string[] = []
  if (e.actual_sets && e.actual_reps) p.push(`${e.actual_sets}组 × ${e.actual_reps}次`)
  else if (e.actual_sets) p.push(`${e.actual_sets}组`)
  else if (e.actual_reps) p.push(`${e.actual_reps}次`)
  if (e.actual_weight !== null && e.actual_weight !== undefined && Number(e.actual_weight) > 0) p.push(`${Number(e.actual_weight)}${e.weight_unit || 'kg'}`)
  return p.join('，')
}

function PrintInner() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const sp = useSearchParams()
  const [data, setData] = useState<ExportData | null>(null)
  const [err, setErr] = useState('')

  const clientId = sp.get('client') || ''
  const from = sp.get('from') || ''
  const to = sp.get('to') || ''
  const self = sp.get('self') === '1' ? '1' : '0'

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/auth/login'); return }
    if (userRole !== 'TRAINER' && userRole !== 'ADMIN') { router.replace('/dashboard'); return }
    fetch(`/api/clients/${clientId}/export?from=${from}&to=${to}&self=${self}`, {
      headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
    })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || '加载失败')
        setData(d)
        // 文件名（存 PDF 时默认用页面标题）
        document.title = `训练记录_${d.client.name}_${from}_${to}`
      })
      .catch(e => setErr(e.message))
  }, [loading, user, userRole, clientId, from, to, self, router])

  if (err) return <div style={{ padding: 40, textAlign: 'center', color: '#C0504D' }}>{err}</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>正在生成…</div>

  const done = data.classes.filter(c => c.status === 'completed')
  const count = (t: string) => data.classes.filter(c => c.class_type === t).length
  const minutes = done.reduce((s, c) => s + (c.duration || 0), 0)
  const exCount = data.classes.reduce((s, c) => s + c.exercises.length, 0)
  const trainers = Array.from(new Set(data.classes.map(c => c.trainer_name).filter(Boolean)))

  return (
    <div className="print-root">
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        .print-root { background: #f3f1f6; min-height: 100vh; padding: 16px 0 40px; color: #2b2238;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }
        .sheet { background: #fff; max-width: 794px; margin: 0 auto; padding: 36px 40px; box-shadow: 0 2px 16px rgba(60,40,90,.08); box-sizing: border-box; }
        .toolbar { max-width: 794px; margin: 0 auto 12px; display: flex; gap: 10px; align-items: center; padding: 0 12px; box-sizing: border-box; }
        .cls { break-inside: avoid; page-break-inside: avoid; border-top: 1px solid #e6e0ee; padding: 14px 0 12px; }
        table.ex { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        table.ex th { text-align: left; font-weight: 600; color: #7a6a92; background: #f6f2fa; padding: 5px 6px; border-bottom: 1px solid #e6e0ee; }
        table.ex td { padding: 5px 6px; border-bottom: 1px solid #f0ecf5; vertical-align: top; line-height: 1.5; }
        table.ex tr { break-inside: avoid; page-break-inside: avoid; }
        @media (max-width: 640px) { .sheet { padding: 22px 16px; } table.ex { font-size: 11px; } }
        @media print {
          .print-root { background: #fff; padding: 0; }
          .sheet { box-shadow: none; max-width: none; padding: 0; }
          .toolbar { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="toolbar">
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#6b5a85', fontSize: 14, cursor: 'pointer', padding: 0 }}>← 返回</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#998ab0' }}>在打印窗口里选「存储为 PDF」</span>
        <button onClick={() => window.print()}
          style={{ padding: '9px 18px', borderRadius: 20, border: 'none', background: '#9880B8', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          保存为 PDF
        </button>
      </div>

      <div className="sheet">
        {/* 抬头 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 14, borderBottom: '2px solid #9880B8' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9880B8', letterSpacing: '.1em', fontWeight: 700 }}>MyFitnessPro · 训练记录</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{data.client.name}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6b5a85', lineHeight: 1.7 }}>
            <div>{fmtShort(data.range.from)} – {fmtShort(data.range.to)}</div>
            {trainers.length > 0 && <div>教练：{trainers.join('、')}</div>}
          </div>
        </div>

        {/* 汇总 */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: '14px 0', fontSize: 13, color: '#4a3d5e' }}>
          <div><b style={{ fontSize: 20, color: '#2b2238' }}>{data.classes.length}</b> 次训练</div>
          {count('private') > 0 && <div>私教 <b>{count('private')}</b></div>}
          {count('group') > 0 && <div>团课 <b>{count('group')}</b></div>}
          {count('self_practice') > 0 && <div>自我练习 <b>{count('self_practice')}</b></div>}
          {minutes > 0 && <div>累计 <b>{minutes % 60 === 0 ? `${minutes / 60} 小时` : `${(minutes / 60).toFixed(1)} 小时`}</b></div>}
          <div>共 <b>{exCount}</b> 个动作</div>
        </div>

        {data.classes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#998ab0', padding: '40px 0', borderTop: '1px solid #e6e0ee' }}>这段时间没有训练记录</p>
        ) : data.classes.map(c => (
          <div key={c.id} className="cls">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtDay(c.date)}{c.start_time ? ` ${c.start_time.slice(0, 5)}` : ''}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#6b5a85' }}>{c.name}</span>
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 8, background: '#f1ebf8', color: '#7a6398' }}>{TYPE[c.class_type] || c.class_type}</span>
              {c.duration ? <span style={{ fontSize: 12, color: '#998ab0' }}>{c.duration} 分钟</span> : null}
              {c.status !== 'completed' && <span style={{ fontSize: 11, color: '#b07a20' }}>{STATUS[c.status] || c.status}</span>}
            </div>
            {c.notes && <div style={{ fontSize: 12, color: '#6b5a85', marginTop: 4 }}>课程备注：{c.notes}</div>}

            {c.exercises.length > 0 && (
              <table className="ex">
                <thead>
                  <tr>
                    <th style={{ width: 22 }}>#</th>
                    <th style={{ width: '30%' }}>动作</th>
                    <th style={{ width: '20%' }}>计划</th>
                    <th>实际完成</th>
                    <th style={{ width: '22%' }}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {c.exercises.map((e, i) => (
                    <tr key={i}>
                      <td style={{ color: '#998ab0' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.name_cn || e.name_en}</div>
                        {e.name_en && e.name_cn && e.name_en !== e.name_cn && <div style={{ fontSize: 10, color: '#998ab0' }}>{e.name_en}</div>}
                      </td>
                      <td>{planned(e) || <span style={{ color: '#c8bfd6' }}>—</span>}</td>
                      <td>{actual(e) || <span style={{ color: '#c8bfd6' }}>—</span>}</td>
                      <td style={{ color: '#6b5a85' }}>{[e.instance_notes, e.post_note].filter(Boolean).join('；') || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {c.post_summary && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#faf7fd', borderLeft: '3px solid #c2afcc', fontSize: 12, color: '#4a3d5e', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                <b style={{ color: '#7a6398' }}>课后总结　</b>{c.post_summary}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #e6e0ee', fontSize: 10, color: '#b3a7c4', textAlign: 'right' }}>
          生成于 {new Date().toLocaleString('zh-CN', { hour12: false })}
        </div>
      </div>
    </div>
  )
}

export default function PrintTrainingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>正在生成…</div>}>
      <PrintInner />
    </Suspense>
  )
}
