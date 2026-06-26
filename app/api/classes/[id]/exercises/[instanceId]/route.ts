import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/classes/[id]/exercises/[instanceId]
// Updates planned params OR actual review data + post_note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; instanceId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: classId, instanceId } = await params
    const body = await req.json()

    // Only update fields that are explicitly passed
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.sets        !== undefined) updates.sets          = body.sets
    if (body.reps        !== undefined) updates.reps          = body.reps
    if (body.weight      !== undefined) updates.weight        = body.weight
    if (body.weight_unit !== undefined) updates.weight_unit   = body.weight_unit
    if (body.duration    !== undefined) updates.duration      = body.duration
    if (body.duration_unit !== undefined) updates.duration_unit = body.duration_unit
    if (body.order       !== undefined) updates.order         = body.order
    if (body.instance_notes !== undefined) updates.instance_notes = body.instance_notes
    // Review fields
    if (body.actual_sets   !== undefined) updates.actual_sets   = body.actual_sets
    if (body.actual_reps   !== undefined) updates.actual_reps   = body.actual_reps
    if (body.actual_weight !== undefined) updates.actual_weight = body.actual_weight
    if (body.post_note     !== undefined) updates.post_note     = body.post_note

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
      .update(updates)
      .eq('id', instanceId)
      .eq('class_id', classId)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/classes/[id]/exercises/[instanceId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; instanceId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: classId, instanceId } = await params

    const { error } = await supabaseAdmin
      .from('class_exercise_instance')
      .delete()
      .eq('id', instanceId)
      .eq('class_id', classId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Removed' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
