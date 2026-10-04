import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { studioParts } from '@/lib/time'

type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'
type Granularity = 'day' | 'week' | 'month'

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// 「今天」按门店时区算。线上服务器是 UTC，直接 new Date() 的话，
// 北京时间每月 1 号凌晨 0–8 点「本月」会算成上个月。见 lib/time.ts。
function studioNow() {
  const { year, month, day } = studioParts()
  return new Date(year, month - 1, day)
}

// 计算某个预设周期类型 + 偏移量对应的起止日期和展示用的 label（不含 custom，custom 单独处理）
function getRange(type: Exclude<PeriodType, 'custom'>, offset: number) {
  const now = studioNow()

  if (type === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() + offset * 7)
    const day = d.getDay() // 0=周日
    const diffToMonday = (day + 6) % 7
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToMonday)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    const label = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
    return { start, end, label }
  }

  if (type === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const start = new Date(base.getFullYear(), base.getMonth(), 1)
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
    const label = `${base.getFullYear()}年${base.getMonth() + 1}月`
    return { start, end, label }
  }

  if (type === 'quarter') {
    const baseMonthIdx = now.getFullYear() * 12 + now.getMonth()
    const currentQStartIdx = baseMonthIdx - (baseMonthIdx % 3)
    const targetQStartIdx = currentQStartIdx + offset * 3
    const year = Math.floor(targetQStartIdx / 12)
    const startMonth = ((targetQStartIdx % 12) + 12) % 12
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0)
    const q = startMonth / 3 + 1
    const label = `${year}年 第${q}季度`
    return { start, end, label }
  }

  // year
  const year = now.getFullYear() + offset
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const label = `${year}年`
  return { start, end, label }
}

interface ClassRow {
  id: string
  name: string
  date: string
  start_time: string | null
  price: number | null
  duration: number
  status: string
  class_type: string
  created_by: string
  assigned_to: string | null
}

interface Bucket { label: string; classes: number; revenue: number }

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v) || 0)
const hasPrice = (r: ClassRow) => r.price !== null && r.price !== undefined && Number(r.price) > 0

function buildTrend(rows: ClassRow[], granularity: Granularity, start: Date, end: Date, weekdayLabels: boolean): Bucket[] {
  const completed = rows.filter(r => r.status === 'completed')
  const buckets: Bucket[] = []

  if (granularity === 'day') {
    const cursor = new Date(start)
    while (cursor <= end) {
      const dateStr = toDateStr(cursor)
      const dayRows = completed.filter(r => r.date === dateStr)
      buckets.push({
        label: weekdayLabels ? ['日', '一', '二', '三', '四', '五', '六'][cursor.getDay()] : `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        classes: dayRows.length,
        revenue: dayRows.reduce((s, r) => s + num(r.price), 0),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return buckets
  }

  if (granularity === 'week') {
    const firstMonday = new Date(start)
    const diffToMonday = (firstMonday.getDay() + 6) % 7
    firstMonday.setDate(firstMonday.getDate() - diffToMonday)
    const cursor = new Date(firstMonday)
    const startStr = toDateStr(start)
    const endStr = toDateStr(end)
    while (cursor <= end) {
      const weekEnd = new Date(cursor)
      weekEnd.setDate(cursor.getDate() + 6)
      const wStr = toDateStr(cursor)
      const wEndStr = toDateStr(weekEnd)
      const weekRows = completed.filter(r => r.date >= wStr && r.date <= wEndStr && r.date >= startStr && r.date <= endStr)
      buckets.push({
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        classes: weekRows.length,
        revenue: weekRows.reduce((s, r) => s + num(r.price), 0),
      })
      cursor.setDate(cursor.getDate() + 7)
    }
    return buckets
  }

  // month
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const crossesYear = start.getFullYear() !== end.getFullYear()
  while (cursor <= end) {
    const y = cursor.getFullYear(), m = cursor.getMonth()
    const prefix = `${y}-${pad(m + 1)}`
    const monthRows = completed.filter(r => r.date.startsWith(prefix))
    buckets.push({
      label: crossesYear ? `${y}/${m + 1}` : `${m + 1}月`,
      classes: monthRows.length,
      revenue: monthRows.reduce((s, r) => s + num(r.price), 0),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return buckets
}

function summarize(rows: ClassRow[]) {
  const completed = rows.filter(r => r.status === 'completed')
  const cancelled = rows.filter(r => r.status === 'cancelled')
  const revenue = completed.reduce((s, r) => s + num(r.price), 0)
  const priced = completed.filter(hasPrice)

  const byType = (type: string) => {
    const t = completed.filter(r => r.class_type === type)
    return { count: t.length, revenue: t.reduce((s, r) => s + num(r.price), 0) }
  }

  return {
    totalScheduled: rows.length,
    completed: completed.length,
    cancelled: cancelled.length,
    // 排了课但还没上（未来的，或者过了日期但没点完成的）
    notDone: rows.length - completed.length - cancelled.length,
    revenue,
    private: byType('private'),
    group: byType('group'),
    // 平均单价只算填了价格的课，否则缺价格的课会把平均数拉低
    avgPrice: priced.length ? revenue / priced.length : 0,
    minutes: completed.reduce((s, r) => s + num(r.duration), 0),
    missingPrice: completed.length - priced.length,
  }
}

const median = (xs: number[]) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'month') as PeriodType
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
    const scopeParam = (searchParams.get('scope') || 'own') as 'own' | 'store'

    // 权限校验：store 视角要么是 ADMIN，要么是被授权的 TRAINER
    let scope = scopeParam
    if (scope === 'store' && userRole !== 'ADMIN') {
      const { data: me } = await supabaseAdmin
        .from('user')
        .select('role, can_view_store_stats')
        .eq('id', userId)
        .single()
      if (!me || me.role !== 'TRAINER' || !me.can_view_store_stats) {
        return NextResponse.json({ error: '没有权限查看全店数据' }, { status: 403 })
      }
    }

    let start: Date, end: Date, label: string
    let prevStart: Date, prevEnd: Date

    if (type === 'custom') {
      const s = searchParams.get('start')
      const e = searchParams.get('end')
      if (!s || !e) return NextResponse.json({ error: '请提供 start 和 end' }, { status: 400 })
      start = new Date(s + 'T00:00:00')
      end = new Date(e + 'T00:00:00')
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return NextResponse.json({ error: '日期范围无效' }, { status: 400 })
      }
      label = `${s} 至 ${e}`
      // 自定义区间的「上一期」= 紧挨着的同样长度的一段
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - days + 1)
    } else {
      ;({ start, end, label } = getRange(type, offset))
      ;({ start: prevStart, end: prevEnd } = getRange(type, offset - 1))
    }

    const startStr = toDateStr(start)
    const endStr = toDateStr(end)

    // 学员自己练的（自我练习）不是教练带的课，完全不进课时/收入统计。
    // 注意 scope='store' 时没有 created_by 过滤，不在这里排掉就会混进门店数据。
    const scoped = (q: any) => {
      const base = q.neq('class_type', 'self_practice')
      return scope === 'own' ? base.eq('created_by', userId) : base
    }

    const [{ data, error }, { data: prevData }] = await Promise.all([
      scoped(
        supabaseAdmin
          .from('class')
          .select('id, name, date, start_time, price, duration, status, class_type, created_by, assigned_to')
          .gte('date', startStr)
          .lte('date', endStr)
      ),
      scoped(
        supabaseAdmin
          .from('class')
          .select('price, status')
          .gte('date', toDateStr(prevStart))
          .lte('date', toDateStr(prevEnd))
          .eq('status', 'completed')
      ),
    ])
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = (data || []) as ClassRow[]
    const summary = summarize(rows)
    const prev = {
      completed: (prevData || []).length,
      revenue: (prevData || []).reduce((s: number, r: any) => s + num(r.price), 0),
    }

    const granularity: Granularity =
      type === 'week' || type === 'month' ? 'day' :
      type === 'quarter' || type === 'year' ? 'month' :
      (() => {
        const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
        return days <= 31 ? 'day' : days <= 180 ? 'week' : 'month'
      })()
    const trend = buildTrend(rows, granularity, start, end, type === 'week')

    // ── 名字：教练、学员（私教看 assigned_to，团课看报名表） ─────────────
    const groupIds = rows.filter(r => r.class_type === 'group').map(r => r.id)
    const { data: enrollments } = groupIds.length
      ? await supabaseAdmin.from('class_enrollment').select('class_id, student_id').in('class_id', groupIds)
      : { data: [] as { class_id: string; student_id: string }[] }
    const enrolledByClass: Record<string, string[]> = {}
    ;(enrollments || []).forEach((e: any) => {
      if (!enrolledByClass[e.class_id]) enrolledByClass[e.class_id] = []
      enrolledByClass[e.class_id].push(e.student_id)
    })

    const peopleIds = Array.from(new Set([
      ...rows.map(r => r.created_by),
      ...rows.map(r => r.assigned_to),
      ...(enrollments || []).map((e: any) => e.student_id),
    ].filter(Boolean) as string[]))
    const nameMap: Record<string, string> = {}
    if (peopleIds.length) {
      const { data: people } = await supabaseAdmin.from('user').select('id, name, email').in('id', peopleIds)
      ;(people || []).forEach((p: any) => { nameMap[p.id] = p.name || p.email || '未知' })
    }

    let byTrainer: any[] = []
    if (scope === 'store') {
      const trainerIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)))
      byTrainer = trainerIds.map(tid => {
        const trainerRows = rows.filter(r => r.created_by === tid)
        return { trainer_id: tid, name: nameMap[tid] || '未知', ...summarize(trainerRows) }
      }).sort((a, b) => b.revenue - a.revenue)
    }

    // 按客户统计：私教直接归属 assigned_to；团课按报名人数平摊收入
    const completedRows = rows.filter(r => r.status === 'completed')
    const clientAgg: Record<string, { classes: number; revenue: number }> = {}
    const addToClient = (clientId: string, classes: number, revenue: number) => {
      if (!clientAgg[clientId]) clientAgg[clientId] = { classes: 0, revenue: 0 }
      clientAgg[clientId].classes += classes
      clientAgg[clientId].revenue += revenue
    }
    completedRows.filter(r => r.class_type === 'private' && r.assigned_to)
      .forEach(r => addToClient(r.assigned_to as string, 1, num(r.price)))
    completedRows.filter(r => r.class_type === 'group').forEach(r => {
      const students = enrolledByClass[r.id] || []
      if (students.length === 0) return
      const share = num(r.price) / students.length
      students.forEach(sid => addToClient(sid, 1, share))
    })
    const byClient = Object.keys(clientAgg)
      .map(cid => ({ client_id: cid, name: nameMap[cid] || '未知', classes: clientAgg[cid].classes, revenue: clientAgg[cid].revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── 价格检查 ──────────────────────────────────────────────
    // 私教：跟这个学员自己的历史价格比（不同学员价格本来就不一样，套餐价也可能更低）
    // 团课：跟这段时间里团课的常见价格比
    // 偏离 20% 以上标出来，提示「可能填错了」——只是提示，不代表一定错。
    const privateClientIds = Array.from(new Set(rows.filter(r => r.class_type === 'private' && r.assigned_to).map(r => r.assigned_to as string)))
    const usualByClient: Record<string, number> = {}
    if (privateClientIds.length) {
      const { data: hist } = await scoped(
        supabaseAdmin.from('class').select('assigned_to, price')
          .eq('class_type', 'private').in('assigned_to', privateClientIds).not('price', 'is', null).gt('price', 0)
          .order('date', { ascending: false }).limit(2000)
      )
      const byC: Record<string, number[]> = {}
      ;(hist || []).forEach((h: any) => { (byC[h.assigned_to] ||= []).push(Number(h.price)) })
      for (const [cid, prices] of Object.entries(byC)) {
        const m = median(prices.slice(0, 20))   // 最近 20 节，价格调过以后以新价为准
        if (m !== null) usualByClient[cid] = m
      }
    }
    const groupUsual = median(rows.filter(r => r.class_type === 'group' && hasPrice(r)).map(r => Number(r.price)))

    const classes = rows
      .slice()
      .sort((a, b) => (b.date + (b.start_time || '')).localeCompare(a.date + (a.start_time || '')))
      .map(r => {
        const students = r.class_type === 'group'
          ? (enrolledByClass[r.id] || []).map(id => nameMap[id] || '学员')
          : r.assigned_to ? [nameMap[r.assigned_to] || '学员'] : []
        const usual = r.class_type === 'private'
          ? (r.assigned_to ? usualByClient[r.assigned_to] ?? null : null)
          : r.class_type === 'group' ? groupUsual : null
        let flag: null | 'missing' | 'low' | 'high' = null
        if (r.status === 'completed' && !hasPrice(r)) flag = 'missing'
        else if (r.status !== 'cancelled' && hasPrice(r) && usual) {
          const p = Number(r.price)
          if (p < usual * 0.8) flag = 'low'
          else if (p > usual * 1.2) flag = 'high'
        }
        return {
          id: r.id,
          date: r.date,
          start_time: r.start_time,
          name: r.name,
          class_type: r.class_type,
          status: r.status,
          price: r.price === null ? null : Number(r.price),
          duration: r.duration,
          trainer_id: r.created_by,
          trainer_name: nameMap[r.created_by] || '',
          client_ids: r.class_type === 'group' ? (enrolledByClass[r.id] || []) : r.assigned_to ? [r.assigned_to] : [],
          students,
          usual_price: usual,
          flag,
          // 前端用它决定这一行能不能直接改价（接口那边还会再校验一次）
          editable: userRole === 'ADMIN' || r.created_by === userId,
        }
      })

    return NextResponse.json({
      range: { start: startStr, end: endStr, label },
      scope,
      summary: { ...summary, activeClients: Object.keys(clientAgg).length },
      prev,
      trend,
      byTrainer,
      byClient,
      classes,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
