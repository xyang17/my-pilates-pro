import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/self-practice —— 学员自己练完（比如用计时器做课后作业）后，一键记进自己的训练记录。
//
// 存法：复用 class 表，class_type = 'self_practice'，created_by / assigned_to 都是学员本人。
// 这样它会自然出现在「学员详情页 → 课程记录」和学员自己的「我的课程」里，跟正常课排一条时间线，
// 前端再按 class_type 加筛选和标签区分。
//
// 重要：自我练习不是教练带的课，所以 /api/stats、/api/dashboard、/api/classes（教练列表）
// 都显式排掉了 class_type='self_practice'，不会虚增课时和收入。改动这里时记得一并检查那三处。
//
// 权限：只能记到自己名下——不接受传别人的 user_id，教练不能代记。
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      name,                 // 练习名称（动作名或自己填的标题）
      exercise_id,          // 可选：从作业/动作库过来的话带上，能把动作也记进去
      work_sec,             // 单组时长（秒）
      rest_sec,             // 组间休息（秒）
      rounds,               // 组数
    } = body

    const roundsNum = Number(rounds) || 1
    const workNum = Number(work_sec) || 0
    const restNum = Number(rest_sec) || 0

    const label = (name || '').trim() || '自我练习'
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

    // 总时长按分钟存，向上取整，至少 1 分钟
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
        price: null,          // 自我练习没有收入
        post_summary: summary,
      }])
      .select()
      .single()

    if (clsErr) return NextResponse.json({ error: clsErr.message }, { status: 400 })

    // 有明确动作（从课后作业点计时器过来的）才写动作明细；
    // 手动输入名字的自由计时没有对应的动作库记录，就只留上面那条总结，不硬造动作。
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
      // 动作明细写失败不影响这条记录本身，课已经记上了
      if (exErr) {
        return NextResponse.json({ ...cls, warning: `动作明细未记录：${exErr.message}` }, { status: 201 })
      }
    }

    return NextResponse.json(cls, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
