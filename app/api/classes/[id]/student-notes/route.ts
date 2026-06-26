import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes/[id]/student-notes
// Returns all student notes for this class (trainer sees all; student sees own)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: classId } = await params

    let query = supabaseAdmin
      .from('student_exercise_note')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true })

    // Students only see their own notes
    if (userRole === 'CLIENT') {
      query = query.eq('student_id', userId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes/[id]/student-notes
// Student adds or updates a note on a specific exercise instance
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: classId } = await params
    const body = await req.json()

    if (!body.exercise_instance_id || !body.content?.trim()) {
      return NextResponse.json(
        { error: 'exercise_instance_id and content are required' },
        { status: 400 }
      )
    }

    // Upsert: one note per student per exercise instance
    const { data, error } = await supabaseAdmin
      .from('student_exercise_note')
      .upsert(
        {
          class_id: classId,
          exercise_instance_id: body.exercise_instance_id,
          student_id: userId,
          student_name: body.student_name || null,
          content: body.content.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'class_id,exercise_instance_id,student_id' }
      )
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/classes/[id]/student-notes?note_id=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const noteId = req.nextUrl.searchParams.get('note_id')
    if (!noteId) return NextResponse.json({ error: 'note_id required' }, { status: 400 })

    // Only delete own note
    const { error } = await supabaseAdmin
      .from('student_exercise_note')
      .delete()
      .eq('id', noteId)
      .eq('student_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
