import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { projectClassForRole } from '@/lib/db'
import { notifyClient } from '@/lib/notifications'

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
      .select('date, start_time, assigned_to, class_type, name')
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

    return NextResponse.json(after)
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
