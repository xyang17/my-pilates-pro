import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isStaff } from '@/lib/db'

// GET /api/clients/[id]/export?from=YYYY-MM-DD&to=YYYY-MM-DD&self=0|1
// 导出某个学员一段时间内的训练内容（给打印 / 存 PDF 的页面用）。
//
// 只给教练/管理员；角色从数据库查，不信请求头。
// 包含：私教（assigned_to）+ 报名的团课；self=1 时再带上学员的自我练习。已取消的课不导出。
// 每节课：日期时间、课程名、类型、时长、状态、课程备注、课后总结、动作（计划 / 实际 / 逐组明细 / 备注）。
// 【不含】价格等经营信息——这份东西可能直接发给学员。
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: me } = await supabaseAdmin.from('user').select('role').eq('id', userId).single()
    if (!isStaff(me?.role ?? null)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')
    const withSelf = req.nextUrl.searchParams.get('self') === '1'
    if (!isDate(from) || !isDate(to) || from > to) {
      return NextResponse.json({ error: '日期范围不对' }, { status: 400 })
    }

    const { data: client } = await supabaseAdmin.from('user').select('id, name, email').eq('id', id).single()
    if (!client) return NextResponse.json({ error: '学员不存在' }, { status: 404 })

    // 私教 + 自我练习（都是 assigned_to = 学员）
    const ownTypes = withSelf ? ['private', 'self_practice'] : ['private']
    const { data: own } = await supabaseAdmin.from('class').select('id')
      .eq('assigned_to', id).in('class_type', ownTypes)
      .gte('date', from).lte('date', to).neq('status', 'cancelled')

    // 报名的团课
    const { data: enr } = await supabaseAdmin.from('class_enrollment').select('class_id').eq('student_id', id)
    const enrolled = (enr || []).map((e: any) => e.class_id).filter(Boolean)
    let groupIds: string[] = []
    if (enrolled.length) {
      const { data: g } = await supabaseAdmin.from('class').select('id')
        .in('id', enrolled).eq('class_type', 'group')
        .gte('date', from).lte('date', to).neq('status', 'cancelled')
      groupIds = (g || []).map((c: any) => c.id)
    }

    const ids = Array.from(new Set([...(own || []).map((c: any) => c.id), ...groupIds]))
    let classes: any[] = []
    if (ids.length) {
      const { data, error } = await supabaseAdmin
        .from('class')
        .select(`
          id, name, date, start_time, duration, class_type, discipline, level, status, notes, post_summary, created_by,
          exercises:class_exercise_instance(
            *,
            master_exercise(name_cn, name_en),
            set_details:exercise_instance_set(set_no, reps, weight, weight_unit, notes)
          )
        `)
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      classes = data || []
    }

    const trainerIds = Array.from(new Set(classes.map(c => c.created_by).filter(Boolean)))
    const nameMap: Record<string, string> = {}
    if (trainerIds.length) {
      const { data: ts } = await supabaseAdmin.from('user').select('id, name, email').in('id', trainerIds)
      ;(ts || []).forEach((t: any) => { nameMap[t.id] = t.name || t.email || '' })
    }

    const out = classes
      .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')))
      .map(c => ({
        id: c.id,
        date: c.date,
        start_time: c.start_time,
        name: c.name,
        class_type: c.class_type,
        discipline: c.discipline,
        level: c.level,
        status: c.status,
        duration: c.duration,
        notes: c.notes,
        post_summary: c.post_summary,
        trainer_name: c.class_type === 'self_practice' ? '' : (nameMap[c.created_by] || ''),
        exercises: (c.exercises || [])
          .sort((x: any, y: any) => (x.order ?? 0) - (y.order ?? 0))
          .map((e: any) => ({
            name_cn: e.master_exercise?.name_cn || '',
            name_en: e.master_exercise?.name_en || '',
            sets: e.sets, reps: e.reps, weight: e.weight, weight_unit: e.weight_unit,
            duration: e.duration, duration_unit: e.duration_unit,
            actual_sets: e.actual_sets, actual_reps: e.actual_reps, actual_weight: e.actual_weight,
            instance_notes: e.instance_notes, post_note: e.post_note,
            set_details: (e.set_details || []).sort((x: any, y: any) => x.set_no - y.set_no),
          })),
      }))

    return NextResponse.json({
      client: { id: client.id, name: client.name || client.email },
      range: { from, to },
      include_self_practice: withSelf,
      classes: out,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
