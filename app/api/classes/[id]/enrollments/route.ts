import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes/[id]/enrollments — list enrolled students
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: classId } = await params

    // Step 1: get enrollments
    const { data: enrollments, error: e1 } = await supabaseAdmin
      .from('class_enrollment')
      .select('id, enrolled_at, student_id')
      .eq('class_id', classId)
      .order('enrolled_at', { ascending: true })

    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 })
    if (!enrollments || enrollments.length === 0) return NextResponse.json([])

    // Step 2: fetch user details for those student_ids
    const studentIds = enrollments.map((e: any) => e.student_id)
    const { data: users, error: e2 } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url')
      .in('id', studentIds)

    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })

    const userMap: Record<string, any> = {}
    for (const u of users || []) userMap[u.id] = u

    const result = enrollments.map((e: any) => ({
      id: e.id,
      enrolled_at: e.enrolled_at,
      student: userMap[e.student_id] || { id: e.student_id, name: '', email: '', photo_url: null },
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes/[id]/enrollments — add student to class
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
    const { student_id } = await req.json()
    if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

    // Insert enrollment
    const { data: enrollment, error: e1 } = await supabaseAdmin
      .from('class_enrollment')
      .insert([{ class_id: classId, student_id }])
      .select('id, enrolled_at, student_id')
      .single()

    if (e1) {
      if (e1.code === '23505') {
        return NextResponse.json({ error: '该学员已在名单中' }, { status: 409 })
      }
      return NextResponse.json({ error: e1.message }, { status: 400 })
    }

    // Fetch user details
    const { data: student, error: e2 } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url')
      .eq('id', student_id)
      .single()

    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 })

    return NextResponse.json({
      id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      student,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
