import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/homework/[id]/exercises/[exId]
// Client: can only update client_note
// Trainer/Admin: can update planned values too
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; exId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: homeworkId, exId } = await params
    const body = await req.json()

    // Verify this homework belongs to the user (client) or was created by them (trainer)
    const { data: hw, error: hwErr } = await supabaseAdmin
      .from('homework')
      .select('student_id, created_by')
      .eq('id', homeworkId)
      .single()
    if (hwErr || !hw) return NextResponse.json({ error: 'Homework not found' }, { status: 404 })

    const isTrainer = userRole === 'ADMIN' || userRole === 'TRAINER'
    const isOwner = hw.student_id === userId
    if (!isTrainer && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (isTrainer) {
      // Trainers can update planned values
      if (body.sets        !== undefined) updates.sets         = body.sets
      if (body.reps        !== undefined) updates.reps         = body.reps
      if (body.weight      !== undefined) updates.weight       = body.weight
      if (body.weight_unit !== undefined) updates.weight_unit  = body.weight_unit
      if (body.duration    !== undefined) updates.duration     = body.duration
      if (body.notes       !== undefined) updates.notes        = body.notes
    }

    // Both client and trainer can update client_note
    if (body.client_note !== undefined) updates.client_note = body.client_note

    const { data, error } = await supabaseAdmin
      .from('homework_exercise')
      .update(updates)
      .eq('id', exId)
      .eq('homework_id', homeworkId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
