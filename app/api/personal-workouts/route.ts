import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import {
  requireStaff, cleanWorkout, cleanExercises, loadOwnWorkout,
  WORKOUT_FIELDS,
} from '@/lib/personalWorkout'

// 教练个人训练记录。只对教练/管理员开放，只能操作自己的。
// 跟学员的 /api/self-practice（存 class 表）是两套，见 lib/personalWorkout.ts 顶部说明。
//
// 注意：这里的数据【不能】进 /api/stats、/api/dashboard——那些统计的是带课，
// 教练自己练多少不是经营数据。它本来就在独立的表里，不去查就不会混进去。

// GET /api/personal-workouts?from=YYYY-MM-DD&to=YYYY-MM-DD
// 列表：按日期倒序，每条带动作明细（列表上要显示动作摘要）
export async function GET(req: NextRequest) {
  try {
    const auth = await requireStaff(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    let q = supabaseAdmin
      .from('personal_workout')
      .select(`${WORKOUT_FIELDS}, exercises:personal_workout_exercise(id, exercise_id, name, sets, reps, weight, weight_unit, duration_sec, order_num)`)
      .eq('user_id', auth.userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) q = q.gte('date', from)
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) q = q.lte('date', to)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = (data || []).map((w: any) => ({
      ...w,
      exercises: [...(w.exercises || [])].sort((a: any, b: any) => a.order_num - b.order_num),
    }))
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/personal-workouts
// body: { date, title?, type, duration_min?, notes?, source?, exercises: [{ exercise_id?, name, sets?, reps?, weight?, weight_unit?, duration_sec?, rest_sec?, notes? }] }
export async function POST(req: NextRequest) {
  try {
    const auth = await requireStaff(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await req.json()
    const w = cleanWorkout(body, false)
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 })

    const { data: created, error } = await supabaseAdmin
      .from('personal_workout')
      .insert([{ ...w.row, user_id: auth.userId }]) // user_id 只取自请求者，不接受传别人的
      .select('id')
      .single()
    if (error || !created) return NextResponse.json({ error: error?.message || '保存失败' }, { status: 400 })

    const exRows = cleanExercises(body.exercises).map(e => ({ ...e, workout_id: created.id }))
    if (exRows.length > 0) {
      const { error: exErr } = await supabaseAdmin.from('personal_workout_exercise').insert(exRows)
      if (exErr) {
        // 明细写不进去就把主记录也撤掉，免得留下一条"空训练"让人以为记上了
        await supabaseAdmin.from('personal_workout').delete().eq('id', created.id)
        return NextResponse.json({ error: `动作明细保存失败：${exErr.message}` }, { status: 400 })
      }
    }

    const full = await loadOwnWorkout(created.id, auth.userId)
    return NextResponse.json(full.data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
