'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useLang } from '@/context/LanguageContext'

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

type Lang = 'zh' | 'en'
const WEEK = ['日', '一', '二', '三', '四', '五', '六']
const fmtDay = (d: string, lang: Lang) => {
  const dt = new Date(`${d}T00:00:00`)
  return lang === 'zh'
    ? `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 周${WEEK[dt.getDay()]}`
    : dt.toLocaleDateString('en', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}
const fmtShort = (d: string) => `${Number(d.slice(0, 4))}.${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`
const TYPE: Record<Lang, Record<string, string>> = {
  zh: { private: '私教', group: '团课', self_practice: '自我练习' },
  en: { private: 'Private', group: 'Group', self_practice: 'Self-practice' },
}
const STATUS: Record<Lang, Record<string, string>> = {
  zh: { completed: '已完成', planned: '未上', scheduled: '未上', in_progress: '进行中' },
  en: { completed: 'Done', planned: 'Not done', scheduled: 'Not done', in_progress: 'In progress' },
}
const unitText = (u: string | null, lang: Lang) =>
  u === 'seconds' ? (lang === 'zh' ? '秒' : 's') : u === 'minutes' ? (lang === 'zh' ? '分钟' : ' min') : u || ''
const setsReps = (sets: number | null, reps: number | null, lang: Lang) => {
  if (sets && reps) return lang === 'zh' ? `${sets}组 × ${reps}次` : `${sets} × ${reps}`
  if (sets) return lang === 'zh' ? `${sets}组` : `${sets} sets`
  if (reps) return lang === 'zh' ? `${reps}次` : `${reps} reps`
  return ''
}

function planned(e: Ex, lang: Lang) {
  const p: string[] = []
  const sr = setsReps(e.sets, e.reps, lang); if (sr) p.push(sr)
  if (e.weight !== null && e.weight !== undefined && Number(e.weight) > 0) p.push(`${Number(e.weight)}${e.weight_unit || 'kg'}`)
  if (e.duration) p.push(`${e.duration}${unitText(e.duration_unit, lang)}`)
  return p.join(lang === 'zh' ? '，' : ', ')
}
function actual(e: Ex, lang: Lang) {
  if (e.set_details?.length) {
    return e.set_details.map(s => {
      const w = s.weight !== null && Number(s.weight) > 0 ? ` @${Number(s.weight)}${s.weight_unit || 'kg'}` : ''
      const head = lang === 'zh' ? `第${s.set_no}组 ${s.reps ?? '-'}次` : `Set ${s.set_no}: ${s.reps ?? '-'} reps`
      return `${head}${w}${s.notes ? (lang === 'zh' ? `（${s.notes}）` : ` (${s.notes})`) : ''}`
    }).join(lang === 'zh' ? '；' : '; ')
  }
  const p: string[] = []
  const sr = setsReps(e.actual_sets, e.actual_reps, lang); if (sr) p.push(sr)
  if (e.actual_weight !== null && e.actual_weight !== undefined && Number(e.actual_weight) > 0) p.push(`${Number(e.actual_weight)}${e.weight_unit || 'kg'}`)
  return p.join(lang === 'zh' ? '，' : ', ')
}

function PrintInner() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const { lang, t } = useLang()
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
    // 教练导任何学员；学员只能导自己的（接口也会拦）
    if (userRole !== 'TRAINER' && userRole !== 'ADMIN' && clientId !== user.id) { router.replace('/dashboard'); return }
    fetch(`/api/clients/${clientId}/export?from=${from}&to=${to}&self=${self}`, {
      headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' },
    })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || t('加载失败', 'Failed to load'))
        setData(d)
        // 文件名（存 PDF 时默认用页面标题）
        document.title = `${t('训练记录', 'Training')}_${d.client.name}_${from}_${to}`
      })
      .catch(e => setErr(e.message))
  }, [loading, user, userRole, clientId, from, to, self, router])

  if (err) return <div style={{ padding: 40, textAlign: 'center', color: '#C0504D' }}>{err}</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>{t('正在生成…', 'Generating…')}</div>

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
          style={{ background: 'none', border: 'none', color: '#6b5a85', fontSize: 14, cursor: 'pointer', padding: 0 }}>← {t('返回', 'Back')}</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#998ab0' }}>{t('在打印窗口里选「存储为 PDF」', 'Choose “Save as PDF” in the print dialog')}</span>
        <button onClick={() => window.print()}
          style={{ padding: '9px 18px', borderRadius: 20, border: 'none', background: '#9880B8', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {t('保存为 PDF', 'Save as PDF')}
        </button>
      </div>

      <div className="sheet">
        {/* 抬头 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 14, borderBottom: '2px solid #9880B8' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#9880B8', letterSpacing: '.1em', fontWeight: 700 }}>MyFitnessPro · {t('训练记录', 'Training Record')}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{data.client.name}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6b5a85', lineHeight: 1.7 }}>
            <div>{fmtShort(data.range.from)} – {fmtShort(data.range.to)}</div>
            {trainers.length > 0 && <div>{t('教练：', 'Trainer: ')}{trainers.join(lang === 'zh' ? '、' : ', ')}</div>}
          </div>
        </div>

        {/* 汇总 */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', padding: '14px 0', fontSize: 13, color: '#4a3d5e' }}>
          <div><b style={{ fontSize: 20, color: '#2b2238' }}>{data.classes.length}</b> {t('次训练', 'sessions')}</div>
          {count('private') > 0 && <div>{t('私教', 'Private')} <b>{count('private')}</b></div>}
          {count('group') > 0 && <div>{t('团课', 'Group')} <b>{count('group')}</b></div>}
          {count('self_practice') > 0 && <div>{t('自我练习', 'Self-practice')} <b>{count('self_practice')}</b></div>}
          {minutes > 0 && <div>{t('累计', 'Total')} <b>{minutes % 60 === 0 ? `${minutes / 60}` : `${(minutes / 60).toFixed(1)}`} {t('小时', 'h')}</b></div>}
          <div>{t('共', '')} <b>{exCount}</b> {t('个动作', 'exercises')}</div>
        </div>

        {data.classes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#998ab0', padding: '40px 0', borderTop: '1px solid #e6e0ee' }}>{t('这段时间没有训练记录', 'No training in this period')}</p>
        ) : data.classes.map(c => (
          <div key={c.id} className="cls">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtDay(c.date, lang)}{c.start_time ? ` ${c.start_time.slice(0, 5)}` : ''}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#6b5a85' }}>{c.name}</span>
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 8, background: '#f1ebf8', color: '#7a6398' }}>{TYPE[lang][c.class_type] || c.class_type}</span>
              {c.duration ? <span style={{ fontSize: 12, color: '#998ab0' }}>{c.duration} {t('分钟', 'min')}</span> : null}
              {c.status !== 'completed' && <span style={{ fontSize: 11, color: '#b07a20' }}>{STATUS[lang][c.status] || c.status}</span>}
            </div>
            {c.notes && <div style={{ fontSize: 12, color: '#6b5a85', marginTop: 4 }}>{t('课程备注：', 'Class notes: ')}{c.notes}</div>}

            {c.exercises.length > 0 && (
              <table className="ex">
                <thead>
                  <tr>
                    <th style={{ width: 22 }}>#</th>
                    <th style={{ width: '30%' }}>{t('动作', 'Exercise')}</th>
                    <th style={{ width: '20%' }}>{t('计划', 'Planned')}</th>
                    <th>{t('实际完成', 'Done')}</th>
                    <th style={{ width: '22%' }}>{t('备注', 'Notes')}</th>
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
                      <td>{planned(e, lang) || <span style={{ color: '#c8bfd6' }}>—</span>}</td>
                      <td>{actual(e, lang) || <span style={{ color: '#c8bfd6' }}>—</span>}</td>
                      <td style={{ color: '#6b5a85' }}>{[e.instance_notes, e.post_note].filter(Boolean).join('；') || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {c.post_summary && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#faf7fd', borderLeft: '3px solid #c2afcc', fontSize: 12, color: '#4a3d5e', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                <b style={{ color: '#7a6398' }}>{t('课后总结　', 'Summary  ')}</b>{c.post_summary}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #e6e0ee', fontSize: 10, color: '#b3a7c4', textAlign: 'right' }}>
          {t('生成于', 'Generated')} {new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en', { hour12: false })}
        </div>
      </div>
    </div>
  )
}

export default function PrintTrainingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>…</div>}>
      <PrintInner />
    </Suspense>
  )
}
