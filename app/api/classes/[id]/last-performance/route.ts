import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isStaff } from '@/lib/db'
import { lastPerformanceForClient } from '@/lib/lastExercise'

// GET /api/classes/[id]/last-performance?exerciseIds=a,b,c
// 这节课的学员「上次」练这些动作是怎么练的（不传 exerciseIds 就查这节课里已有的动作）。
// 只对私教课有效（一节课对应一个学员）；团课/自我练习返回空。
// 教练/管理员可以看；学员只能看自己那节课的。
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: cls } = await supabaseAdmin.from('class')
      .select('id, date, class_type, assigned_to').eq('id', id).maybeSingle()
    if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: me } = await supabaseAdmin.from('user').select('role').eq('id', userId).single()
    if (!isStaff(me?.role ?? null) && cls.assigned_to !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (cls.class_type !== 'private' || !cls.assigned_to) {
      return NextResponse.json({ client_id: null, items: {} })
    }

    let exerciseIds = (req.nextUrl.searchParams.get('exerciseIds') || '').split(',').map(s => s.trim()).filter(Boolean)
    if (exerciseIds.length === 0) {
      const { data: inst } = await supabaseAdmin.from('class_exercise_instance').select('exercise_id').eq('class_id', id)
      exerciseIds = (inst || []).map((i: any) => i.exercise_id)
    }

    const items = await lastPerformanceForClient(cls.assigned_to, exerciseIds.slice(0, 300), {
      excludeClassId: cls.id, beforeOrOn: cls.date,
    })
    return NextResponse.json({ client_id: cls.assigned_to, items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
