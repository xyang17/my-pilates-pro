import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLASS_FIELDS = 'id, name, date, start_time, duration, type, discipline, class_type, status, post_summary, assigned_to, created_by'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 用本地日期，不能用 toISOString（会按 UTC 算，晚上容易差一天）
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const monthStart = dateStr.slice(0, 7) + '-01'

    const isTrainer = userRole === 'TRAINER' || userRole === 'ADMIN'

    // ── 学员视角 ──────────────────────────────────────────────
    if (!isTrainer) {
      const { data: enrolled } = await supabaseAdmin
        .from('class_enrollment')
        .select('class_id')
        .eq('student_id', userId)

      const enrolledIds = (enrolled || []).map(e => e.class_id).filter(Boolean)
      const filters = [`assigned_to.eq.${userId}`, `created_by.eq.${userId}`]
      if (enrolledIds.length > 0) filters.push(`id.in.(${enrolledIds.join(',')})`)

      const { data: todayClasses } = await supabaseAdmin
        .from('class')
        .select(CLASS_FIELDS)
        .eq('date', dateStr)
        .or(filters.join(','))
        .order('start_time', { ascending: true })

      // 接下来的课（不含今天），给首页做个「即将上课」提示
      const { data: upcoming } = await supabaseAdmin
        .from('class')
        .select(CLASS_FIELDS)
        .gt('date', dateStr)
        .or(filters.join(','))
        .order('date', { ascending: true })
        .limit(3)

      // 待完成的作业
      const { data: homework } = await supabaseAdmin
        .from('homework')
        .select('id, title, due_date, status, class_id, created_at')
        .eq('student_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false })

      const openHomework = (homework || []).filter(h => h.status !== 'completed')

      return NextResponse.json({
        today_classes: (todayClasses || []).map(c => ({ ...c, client_names: [] })),
        upcoming_classes: upcoming || [],
        homework: openHomework,
        homework_count: openHomework.length,
        month_count: 0,
        pending_review: 0,
        client_count: 0,
        date: dateStr,
      })
    }

    // ── 教练视角 ──────────────────────────────────────────────
    const scopeOwn = (q: any) => userRole === 'ADMIN' ? q : q.eq('created_by', userId)

    const { data: todayClassesRaw } = await scopeOwn(
      supabaseAdmin.from('class').select(CLASS_FIELDS).eq('date', dateStr)
    ).order('start_time', { ascending: true })

    const todayClasses = (todayClassesRaw || []) as any[]

    // 今日课程的学员名字：私教看 assigned_to，团课看报名表
    let classesWithClients: any[] = todayClasses
    if (todayClasses.length > 0) {
      const classIds = todayClasses.map(c => c.id)

      const { data: enrollments } = await supabaseAdmin
        .from('class_enrollment')
        .select('class_id, student_id')
        .in('class_id', classIds)

      const idsFromEnroll = (enrollments || []).map(e => e.student_id)
      const idsFromAssigned = todayClasses.map(c => c.assigned_to).filter(Boolean) as string[]
      const allClientIds = [...new Set([...idsFromEnroll, ...idsFromAssigned])]

      const nameMap: Record<string, string> = {}
      if (allClientIds.length > 0) {
        const { data: people } = await supabaseAdmin
          .from('user')
          .select('id, name, email')
          .in('id', allClientIds)
        ;(people || []).forEach(p => { nameMap[p.id] = p.name || p.email || '学员' })
      }

      const enrollMap: Record<string, string[]> = {}
      ;(enrollments || []).forEach(e => {
        if (!enrollMap[e.class_id]) enrollMap[e.class_id] = []
        enrollMap[e.class_id].push(nameMap[e.student_id] || '学员')
      })

      classesWithClients = todayClasses.map(c => {
        const names = enrollMap[c.id] || []
        if (names.length === 0 && c.assigned_to && nameMap[c.assigned_to]) {
          names.push(nameMap[c.assigned_to])
        }
        return { ...c, client_names: names }
      })
    }

    const { count: monthCount } = await scopeOwn(
      supabaseAdmin.from('class').select('id', { count: 'exact', head: true }).gte('date', monthStart)
    )

    const { count: pendingReview } = await scopeOwn(
      supabaseAdmin
        .from('class')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .is('post_summary', null)
    )

    const { count: clientCount } = await supabaseAdmin
      .from('user')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'CLIENT')

    return NextResponse.json({
      today_classes: classesWithClients,
      upcoming_classes: [],
      homework: [],
      homework_count: 0,
      month_count: monthCount || 0,
      pending_review: pendingReview || 0,
      client_count: clientCount || 0,
      date: dateStr,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
