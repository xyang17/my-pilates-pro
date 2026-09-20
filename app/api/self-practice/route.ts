import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/self-practice —— 学员自己练完后，一键记进自己的训练记录。
//
// 两种调用方式：
//   1) 单个动作（计时器页面直接用）：{ name, exercise_id?, work_sec, rest_sec, rounds }
//   2) 整份作业连播完（播放器用）：{ homework_id, title, exercises: [...] }
//      exercises 里每条：{ exercise_id, name, work_sec, planned_sets, done_sets, skipped }
//      练到一半退出也照记，done_sets < planned_sets 就是没做完，skipped 是学员主动跳过的。
//
// 存法：复用 class 表，class_type = 'self_practice'，created_by / assigned_to 都是学员本人。
// 它会出现在「学员详情页 → 课程记录」和学员自己的「我的课程」里，跟正常课排一条时间线。
//
// 重要：自我练习不是教练带的课，/api/stats、/api/dashboard、/api/classes（教练列表）
// 都显式排掉了 class_type='self_practice'，不会虚增课时和收入。改这里时记得一并检查那三处。
//
// 权限：只能记到自己名下——不接受传别人的 user_id，教练不能代记。
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const { data: me, error: meErr } = await supabaseAdmin
      .from('user').select('id').eq('id', userId).single()
    if (meErr || !me) return NextResponse.json({ error: '账号不存在' }, { status: 400 })

    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

    // ── 整份作业连播 ──────────────────────────────────────────
    if (Array.isArray(body.exercises) && body.exercises.length > 0) {
      const list = body.exercises as any[]
      const done = list.filter(e => !e.skipped && Number(e.done_sets) > 0)
      const totalPlanned = list.filter(e => !e.skipped).length
      const allDone = list.every(e => e.skipped || Number(e.done_sets) >= Number(e.planned_sets))

      // 总时长按「实际练了多少秒」算：整组做完记满，中途跳过只算跳走之前那部分。
      // done_sec 是播放器实测的，比拿组数乘时长更准。旧调用没传就退回按组数估。
      const totalWorkSec = list.reduce((sum, e) => {
        const measured = Number(e.done_sec)
        if (Number.isFinite(measured) && measured > 0) return sum + measured
        return sum + (Number(e.done_sets) || 0) * (Number(e.work_sec) || 0)
      }, 0)
      const totalRestSec = list.reduce((sum, e) => {
        const sets = Number(e.done_sets) || 0
        return sum + Math.max(0, sets - 1) * (Number(e.rest_sec) || 0)
      }, 0)
      const durationMin = Math.max(1, Math.ceil((totalWorkSec + totalRestSec) / 60))

      const title = (body.title || '').trim() || '课后作业'
      const parts = list.map(e => {
        if (e.skipped) return `${e.name}（跳过）`
        const d = Number(e.done_sets) || 0
        const p = Number(e.planned_sets) || 0
        const mark = d >= p ? `${d}组` : `${d}/${p}组`
        // 不够一整组的零头时间单独标出来——练了 25 秒才跳走，那 25 秒也是练了
        const sec = Number(e.done_sec) || 0
        const extra = Math.max(0, Math.round(sec - d * (Number(e.work_sec) || 0)))
        return `${e.name} ${e.work_sec}秒 × ${mark}` + (extra > 0 ? `（另做 ${extra}秒）` : '')
      })
      const summary = `自我练习（${body.circuit_mode === 'circuit' ? '循环' : '顺序'}）：` +
        parts.join('；') +
        (allDone ? '' : `　—— 完成 ${done.length}/${totalPlanned} 个动作`)

      const { data: cls, error: clsErr } = await supabaseAdmin
        .from('class')
        .insert([{
          name: `自我练习 · ${title}`,
          date: dateStr,
          duration: durationMin,
          class_type: 'self_practice',
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_by: userId,
          assigned_to: userId,
          price: null,
          post_summary: summary,
        }])
        .select()
        .single()

      if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 400 })

      // 每个真正练到的动作写一条明细；跳过的不写，避免污染训练量统计。
      // 只做了零头时间、一组都没凑满的也要记——练了就是练了。
      const exRows = list
        .filter(e => e.exercise_id && !e.skipped && (Number(e.done_sets) > 0 || Number(e.done_sec) > 0))
        .map((e, i) => {
          const d = Number(e.done_sets) || 0
          const p = Number(e.planned_sets) || 0
          const sec = Number(e.done_sec) || 0
          const extra = Math.max(0, Math.round(sec - d * (Number(e.work_sec) || 0)))
          const notes = [
            d < p ? '未做完' : null,
            extra > 0 ? `另做 ${extra} 秒` : null,
          ].filter(Boolean)
          return {
            class_id: cls.id,
            exercise_id: e.exercise_id,
            order: i + 1,
            sets: p || null,
            actual_sets: d || null,
            duration: Number(e.work_sec) || null,
            duration_unit: 'seconds',
            post_note: notes.length > 0 ? notes.join('；') : null,
          }
        })

      if (exRows.length > 0) {
        const { error: exErr } = await supabaseAdmin.from('class_exercise_instance').insert(exRows)
        if (exErr) {
          return NextResponse.json({ ...cls, warning: `动作明细未记录：${exErr.message}` }, { status: 201 })
        }
      }

      // 全部做完（跳过的不算没做完）就顺手把这份作业标记完成，学员不用再回去点一次
      let homeworkCompleted = false
      if (body.homework_id && allDone) {
        const { error: hwErr } = await supabaseAdmin
          .from('homework')
          .update({ status: 'completed' })
          .eq('id', body.homework_id)
          .eq('student_id', userId)
        homeworkCompleted = !hwErr
      }

      return NextResponse.json({ ...cls, homework_completed: homeworkCompleted }, { status: 201 })
    }

    // ── 单个动作（计时器页面） ────────────────────────────────
    const { name, exercise_id, work_sec, rest_sec, rounds } = body
    const roundsNum = Number(rounds) || 1
    const workNum = Number(work_sec) || 0
    const restNum = Number(rest_sec) || 0

    const label = (name || '').trim() || '自我练习'
    const totalSec = roundsNum * workNum + Math.max(0, roundsNum - 1) * restNum
    const durationMin = Math.max(1, Math.ceil(totalSec / 60))

    const summary = `自我练习：${label} ${workNum}秒 × ${roundsNum}组` +
      (restNum > 0 ? `，组间休息 ${restNum}秒` : '')

    const { data: cls, error: clsErr } = await supabaseAdmin
      .from('class')
      .insert([{
        name: `自我练习 · ${label}`,
        date: dateStr,
        duration: durationMin,
        class_type: 'self_practice',
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_by: userId,
        assigned_to: userId,
        price: null,
        post_summary: summary,
      }])
      .select()
      .single()

    if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 400 })

    if (exercise_id) {
      const { error: exErr } = await supabaseAdmin
        .from('class_exercise_instance')
        .insert([{
          class_id: cls.id,
          exercise_id,
          order: 1,
          sets: roundsNum,
          actual_sets: roundsNum,
          duration: workNum,
          duration_unit: 'seconds',
          post_note: restNum > 0 ? `组间休息 ${restNum} 秒` : null,
        }])
      if (exErr) {
        return NextResponse.json({ ...cls, warning: `动作明细未记录：${exErr.message}` }, { status: 201 })
      }
    }

    return NextResponse.json(cls, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
