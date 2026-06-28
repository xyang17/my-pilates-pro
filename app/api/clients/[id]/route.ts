import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients/[id] — client profile + class history + trainer notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (userRole !== 'ADMIN' && userRole !== 'TRAINER' && userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: userRow, error } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url, bio, created_at, role')
      .eq('id', id)
      .single()

    if (error) throw error

    // Trainer assessment notes from client table (may not exist yet)
    const { data: clientRow } = await supabaseAdmin
      .from('client')
      .select('injury_notes, goals, emergency_contact')
      .eq('user_id', id)
      .maybeSingle()

    // Class history
    const { data: classes } = await supabaseAdmin
      .from('class')
      .select('id, name, date, start_time, duration, discipline, class_type, level, status, color')
      .eq('assigned_to', id)
      .order('date', { ascending: false })
      .limit(50)

    return NextResponse.json({
      ...userRow,
      injury_notes: clientRow?.injury_notes || null,
      goals: clientRow?.goals || null,
      emergency_contact: clientRow?.emergency_contact || null,
      classes: classes || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/clients/[id] — trainer updates assessment notes (injury_notes, goals)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { injury_notes, goals, emergency_contact } = body

    // Select-then-update-or-insert (no unique constraint on user_id yet)
    const { data: existing } = await supabaseAdmin
      .from('client')
      .select('id')
      .eq('user_id', id)
      .maybeSingle()

    let error: any = null
    if (existing) {
      const res = await supabaseAdmin
        .from('client')
        .update({ injury_notes: injury_notes ?? null, goals: goals ?? null, emergency_contact: emergency_contact ?? null })
        .eq('user_id', id)
      error = res.error
    } else {
      const res = await supabaseAdmin
        .from('client')
        .insert({ user_id: id, injury_notes: injury_notes ?? null, goals: goals ?? null, emergency_contact: emergency_contact ?? null })
      error = res.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
