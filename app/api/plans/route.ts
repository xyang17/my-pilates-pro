import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/plans — trainer sees their own; ?published=1 for all authenticated
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const published = searchParams.get('published') === '1'

    let query = supabaseAdmin
      .from('training_plan')
      .select('*')
      .order('created_at', { ascending: false })

    if (published) {
      query = query.eq('is_published', true)
    } else {
      query = query.eq('trainer_id', userId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/plans — create new plan (TRAINER/ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, description, goal, level, duration_desc } = body
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('training_plan')
      .insert({ trainer_id: userId, title, description, goal, level, duration_desc })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
