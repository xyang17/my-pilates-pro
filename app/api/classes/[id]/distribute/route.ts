import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/classes/[id]/distribute
// 教练把团课发给学员：默认只是把学员报名进这节课，让他们在「我的课程」里看到课程内容。
// 只有显式传 create_homework=true 时，才额外复制一份动作作为「课后作业」。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: classId } = await params
    const body = await req.json()
    const { client_ids, due_date, create_homework = false } = body

    if (!Array.isArray(client_ids) || client_ids.length === 0) {
      return NextResponse.json({ error: 'client_ids required' }, { status: 400 })
    }

    // Fetch class info
    const { data: classData, error: classErr } = await supabaseAdmin
      .from('class')
      .select('name, date')
      .eq('id', classId)
      .single()
    if (classErr) return NextResponse.json({ error: classErr.message }, { status: 400 })

    // Fetch class exercises (planned values)
    const { data: exercises, error: exErr } = await supabaseAdmin
      .from('class_exercise_instance')
      .select('exercise_id, sets, reps, weight, weight_unit, duration, duration_unit, instance_notes, order')
      .eq('class_id', classId)
      .order('order', { ascending: true })
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 400 })
    // 只有布置作业时才要求课程里有动作；单纯发课程内容不需要
    if (create_homework && (!exercises || exercises.length === 0)) {
      return NextResponse.json({ error: '课程没有动作，无法布置作业' }, { status: 400 })
    }

    // 同时把学员报名进这节课，这样学员端「我的课程」里能直接看到课程本身，
    // 而不是只在「课后作业」里看到一份作业。
    const { data: alreadyEnrolled } = await supabaseAdmin
      .from('class_enrollment')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', client_ids)

    const enrolledSet = new Set((alreadyEnrolled || []).map((e: any) => e.student_id))
    const toEnroll = client_ids.filter((cid: string) => !enrolledSet.has(cid))
    if (toEnroll.length > 0) {
      await supabaseAdmin
        .from('class_enrollment')
        .insert(toEnroll.map((cid: string) => ({ class_id: classId, student_id: cid })))
    }

    if (!create_homework) {
      return NextResponse.json({
        enrolled: toEnroll.length,
        already_enrolled: enrolledSet.size,
        created: 0,
        skipped: 0,
        results: [],
      }, { status: 201 })
    }

    // For each client, create homework + exercises (skip if already distributed)
    const results: { client_id: string; homework_id: string; skipped?: boolean }[] = []

    for (const clientId of client_ids) {
      // Check if already distributed to this client
      const { data: existing } = await supabaseAdmin
        .from('homework')
        .select('id')
        .eq('class_id', classId)
        .eq('student_id', clientId)
        .maybeSingle()

      if (existing) {
        results.push({ client_id: clientId, homework_id: existing.id, skipped: true })
        continue
      }

      // Create homework
      const { data: hw, error: hwErr } = await supabaseAdmin
        .from('homework')
        .insert([{
          class_id: classId,
          student_id: clientId,
          created_by: userId,
          title: classData.name,
          due_date: due_date || classData.date || null,
          notes: null,
        }])
        .select('id')
        .single()

      if (hwErr) return NextResponse.json({ error: hwErr.message }, { status: 400 })

      // Copy exercises
      const exRows = exercises.map((ex: any) => ({
        homework_id: hw.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets ?? null,
        reps: ex.reps ?? null,
        weight: ex.weight ?? null,
        weight_unit: ex.weight_unit || 'kg',
        duration: ex.duration ?? null,
        duration_unit: ex.duration_unit || 'minutes',
        notes: ex.instance_notes || null,  // trainer's planning note → read-only instruction for client
        order_num: ex.order,
      }))

      const { error: exInsertErr } = await supabaseAdmin
        .from('homework_exercise')
        .insert(exRows)
      if (exInsertErr) return NextResponse.json({ error: exInsertErr.message }, { status: 400 })

      results.push({ client_id: clientId, homework_id: hw.id })
    }

    const created = results.filter(r => !r.skipped).length
    const skipped = results.filter(r => r.skipped).length

    return NextResponse.json({
      enrolled: toEnroll.length,
      already_enrolled: enrolledSet.size,
      created,
      skipped,
      results,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
