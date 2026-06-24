import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Get all notes for an exercise
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

    const { data: notes, error } = await supabaseAdmin
      .from('exercise_note')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(notes)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add a note to an exercise (trainer or client)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userName = req.headers.get('x-user-name') || 'Anonymous'

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exerciseId = params.id
    const { content, authorType } = await req.json()

    if (!content) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
    }

    if (!['trainer', 'client'].includes(authorType)) {
      return NextResponse.json({ error: 'Invalid author type' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('exercise_note')
      .insert([
        {
          exercise_id: exerciseId,
          author_id: userId,
          author_type: authorType,
          author_name: userName,
          content,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
