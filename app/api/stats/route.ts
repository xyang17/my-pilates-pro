import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'
type Granularity = 'day' | 'week' | 'month'

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

// 计算某个预设周期类型 + 偏移量对应的起止日期和展示用的 label（不含 custom，custom 单独处理）
function getRange(type: Exclude<PeriodType, 'custom'>, offset: number) {
  const now = new Date()

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
  date: string
  price: number | null
  duration: number
  status: string
  class_type: string
  created_by: string
  assigned_to: string | null
}

interface Bucket { label: string; classes: number; revenue: number }

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
        revenue: dayRows.reduce((s, r) => s + (r.price || 0), 0),
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
        revenue: weekRows.reduce((s, r) => s + (r.price || 0), 0),
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
    const monthRows = completed.filter(r => {
      const d = new Date(r.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m
    })
    buckets.push({
      label: crossesYear ? `${y}/${m + 1}` : `${m + 1}月`,
      classes: monthRows.length,
      revenue: monthRows.reduce((s, r) => s + (r.price || 0), 0),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return buckets
}

function summarize(rows: ClassRow[]) {
  const completed = rows.filter(r => r.status === 'completed')
  const cancelled = rows.filter(r => r.status === 'cancelled')
  const revenue = completed.reduce((s, r) => s + (r.price || 0), 0)

  const byType = (type: string) => {
    const t = completed.filter(r => r.class_type === type)
    return { count: t.length, revenue: t.reduce((s, r) => s + (r.price || 0), 0) }
  }

  return {
    totalScheduled: rows.length,
    completed: completed.length,
    cancelled: cancelled.length,
    revenue,
    private: byType('private'),
    group: byType('group'),
  }
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
    } else {
      ;({ start, end, label } = getRange(type, offset))
    }

    const startStr = toDateStr(start)
    const endStr = toDateStr(end)

    let query = supabaseAdmin
      .from('class')
      .select('id, date, price, duration, status, class_type, created_by, assigned_to')
      .gte('date', startStr)
      .lte('date', endStr)

    if (scope === 'own') query = query.eq('created_by', userId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = (data || []) as ClassRow[]
    const summary = summarize(rows)

    const granularity: Granularity =
      type === 'week' || type === 'month' ? 'day' :
      type === 'quarter' || type === 'year' ? 'month' :
      (() => {
        const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
        return days <= 31 ? 'day' : days <= 180 ? 'week' : 'month'
      })()
    const trend = buildTrend(rows, granularity, start, end, type === 'week')

    let byTrainer: any[] = []
    if (scope === 'store') {
      const trainerIds = Array.from(new Set(rows.map(r => r.created_by).filter(Boolean)))
      const { data: trainers } = trainerIds.length
        ? await supabaseAdmin.from('user').select('id, name, email').in('id', trainerIds)
        : { data: [] }
      const nameMap: Record<string, string> = {}
      ;(trainers || []).forEach((t: any) => { nameMap[t.id] = t.name || t.email || '未知' })

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

    const privateCompleted = completedRows.filter(r => r.class_type === 'private' && r.assigned_to)
    privateCompleted.forEach(r => addToClient(r.assigned_to as string, 1, r.price || 0))

    const groupCompleted = completedRows.filter(r => r.class_type === 'group')
    if (groupCompleted.length > 0) {
      const groupIds = groupCompleted.map(r => r.id)
      const { data: enrollments } = await supabaseAdmin
        .from('class_enrollment')
        .select('class_id, student_id')
        .in('class_id', groupIds)

      const enrolledByClass: Record<string, string[]> = {}
      ;(enrollments || []).forEach((e: any) => {
        if (!enrolledByClass[e.class_id]) enrolledByClass[e.class_id] = []
        enrolledByClass[e.class_id].push(e.student_id)
      })

      groupCompleted.forEach(r => {
        const students = enrolledByClass[r.id] || []
        if (students.length === 0) return
        const share = (r.price || 0) / students.length
        students.forEach(sid => addToClient(sid, 1, share))
      })
    }

    const clientIds = Object.keys(clientAgg)
    let byClient: any[] = []
    if (clientIds.length > 0) {
      const { data: clients } = await supabaseAdmin.from('user').select('id, name, email').in('id', clientIds)
      const nameMap: Record<string, string> = {}
      ;(clients || []).forEach((c: any) => { nameMap[c.id] = c.name || c.email || '未知' })
      byClient = clientIds
        .map(cid => ({ client_id: cid, name: nameMap[cid] || '未知', classes: clientAgg[cid].classes, revenue: clientAgg[cid].revenue }))
        .sort((a, b) => b.revenue - a.revenue)
    }

    return NextResponse.json({
      range: { start: startStr, end: endStr, label },
      scope,
      summary,
      trend,
      byTrainer,
      byClient,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
