import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { projectClassForRole } from '@/lib/db'
import { notifyClient, checkLoyaltyBonus } from '@/lib/notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('class')
      .select(`
        *,
        exercises:class_exercise_instance(
          *,
          master_exercise(id, name_en, name_cn, type_cn, type_en, difficulty_cn, featured_image_url, description_en, description_cn),
          set_details:exercise_instance_set(id, set_no, reps, weight, weight_unit, notes)
        )
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    // Sort exercises by order, and each exercise's set-by-set records by set_no
    if (data.exercises) {
      data.exercises.sort((a: any, b: any) => a.order - b.order)
      data.exercises.forEach((ex: any) => {
        if (ex.set_details) ex.set_details.sort((a: any, b: any) => a.set_no - b.set_no)
      })
    }

    // 会员视角按白名单投影，营收类字段不会返回
    return NextResponse.json(projectClassForRole(data, req.headers.get('x-user-role')))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 课时包自动扣课。
//
// 只在「从未完成 → 已完成」那一刻挂包，理由：
//   1. 用户定的规则就是「上了才算」，排了课没上不该占名额
//   2. 重复保存（复盘页存总结会频繁调这个接口）不会重复扣
//
// 取消完成不用退——package_balance 视图是数 status='completed' 的课，
// 课一旦退回未完成，剩余自动涨回去，不需要手动清 package_id。
//
// 没有有效包的学员保持 package_id = null，就是按次收费，走 class.price。
// 团课扣不了包：package_id 在课程表上，一节团课对应多个学员，装不下。
async function autoLinkPackage(cls: any): Promise<string | null> {
  if (cls.package_id) return cls.package_id          // 已经挂过了，不动
  if (cls.class_type !== 'private') return null       // 团课/自我练习不走课时包
  if (!cls.assigned_to) return null                   // 代课没有学员

  const { data: pkgs } = await supabaseAdmin
    .from('package_balance')
    .select('id, remaining_sessions, expires_at, purchased_at')
    .eq('client_id', cls.assigned_to)
    .eq('status', 'active')
    .eq('is_expired', false)
    .gt('remaining_sessions', 0)
    // 先用快过期的，没有有效期的排后面；同等情况下先买的先用
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('purchased_at', { ascending: true })
    .limit(1)

  const pick = pkgs?.[0]
  if (!pick) return null

  const { error } = await supabaseAdmin
    .from('class').update({ package_id: pick.id }).eq('id', cls.id)
  if (error) {
    console.error('[class] 挂课时包失败:', error.message)
    return null
  }
  return pick.id
}

// PUT /api/classes/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name            !== undefined) updates.name            = body.name
    if (body.date            !== undefined) updates.date            = body.date
    if (body.start_time      !== undefined) updates.start_time      = body.start_time
    if (body.duration        !== undefined) updates.duration        = body.duration
    if (body.type            !== undefined) updates.type            = body.type
    if (body.discipline      !== undefined) updates.discipline      = body.discipline
    if (body.class_type      !== undefined) updates.class_type      = body.class_type
    if (body.level           !== undefined) updates.level           = body.level
    if (body.description     !== undefined) updates.description     = body.description
    if (body.max_capacity    !== undefined) updates.max_capacity    = body.max_capacity
    if (body.price           !== undefined) updates.price           = body.price
    // 结算方式：传包 id = 从该包扣；显式传 null = 改回按次收费。
    // 用 !== undefined 判断，才能区分「没传」和「传了 null」
    if (body.package_id      !== undefined) updates.package_id      = body.package_id || null
    if (body.color           !== undefined) updates.color           = body.color
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.trainer_id      !== undefined) updates.trainer_id      = body.trainer_id
    if (body.assigned_to     !== undefined) updates.assigned_to     = body.assigned_to
    if (body.status          !== undefined) updates.status          = body.status
    if (body.notes           !== undefined) updates.notes           = body.notes
    if (body.feedback        !== undefined) updates.feedback        = body.feedback
    if (body.post_summary    !== undefined) updates.post_summary    = body.post_summary
    if (body.completed_at    !== undefined) updates.completed_at    = body.completed_at

    // 改期提醒要跟旧值比对才知道时间是不是真的变了。
    // 这个接口被复盘页频繁调用（存课后总结、改状态），不能一更新就发消息。
    const { data: before } = await supabaseAdmin
      .from('class')
      .select('date, start_time, assigned_to, class_type, name, status, package_id')
      .eq('id', id)
      .maybeSingle()

    const { data, error } = await supabaseAdmin
      .from('class')
      .update(updates)
      .eq('id', id)
      .eq('created_by', userId)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    const after = data[0]

    // 刚刚被标记为完成 → 尝试从课时包里扣一节
    let linkedPackageId: string | null = after.package_id ?? null
    if (before && before.status !== 'completed' && after.status === 'completed') {
      linkedPackageId = await autoLinkPackage(after)
      // 满课赠送只提醒不自动发，失败也不该影响「课已完成」这件事
      if (after.assigned_to) {
        try { await checkLoyaltyBonus(after.assigned_to) }
        catch (e: any) { console.error('[class] 满赠检测失败:', e?.message) }
      }
    }

    const timeChanged = !!before && (
      (updates.date !== undefined && before.date !== after.date) ||
      (updates.start_time !== undefined && before.start_time !== after.start_time)
    )
    if (timeChanged && after.assigned_to && after.class_type !== 'self_practice') {
      try {
        const hhmm = after.start_time ? ` ${String(after.start_time).slice(0, 5)}` : ''
        await notifyClient({
          clientId: after.assigned_to,
          type: 'class_updated',
          title: '课程时间有变动',
          body: `${after.name} 改到 ${after.date}${hhmm}`,
          link: `/dashboard/classes/${after.id}`,
          fromTrainerId: userId,
          // 同一节课改到同一个时间不重复提醒；真改到别的时间会是新的 key
          dedupeKey: `class_upd:${after.id}:${after.date}:${after.start_time || ''}`,
        })
      } catch (e: any) {
        console.error('[classes] update notify failed:', e?.message)
      }
    }

    return NextResponse.json({ ...after, package_id: linkedPackageId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/classes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { error } = await supabaseAdmin
      .from('class')
      .delete()
      .eq('id', id)
      .eq('created_by', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
