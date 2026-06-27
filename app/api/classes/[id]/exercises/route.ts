import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes/[id]/exercises
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
      .select(`
        *,
        master_exercise(id, name_en, name_cn, featured_image_url, description_en, description_cn, instructions_en)
      `)
      .eq('class_id', id)
      .order('order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes/[id]/exercises — add an exercise to a class
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // Get current max order
    const { data: existing } = await supabaseAdmin
      .from('class_exercise_instance')
      .select('order')
      .eq('class_id', id)
      .order('order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 1

    // Auto-fill defaults from master_exercise if not provided
    let defaults: any = {}
    if (body.exercise_id && body.sets == null && body.reps == null && body.weight == null) {
      const { data: master } = await supabaseAdmin
        .from('master_exercise')
        .select('default_sets, default_reps, default_weight, default_weight_unit, default_duration, default_duration_unit')
        .eq('id', body.exercise_id)
        .single()
      if (master) defaults = master
    }

    const { data, error } = await supabaseAdmin
      .from('class_exercise_instance')
      .insert([{
        class_id: id,
        exercise_id: body.exercise_id,
        sets: body.sets ?? defaults.default_sets ?? null,
        reps: body.reps ?? defaults.default_reps ?? null,
        weight: body.weight ?? defaults.default_weight ?? null,
        weight_unit: body.weight_unit || defaults.default_weight_unit || 'kg',
        duration: body.duration ?? defaults.default_duration ?? null,
        duration_unit: body.duration_unit || defaults.default_duration_unit || 'minutes',
        order: body.order || nextOrder,
        instance_notes: body.instance_notes || null,
      }])
      .select(`
        *,
        master_exercise(id, name_en, name_cn, featured_image_url)
      `)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/classes/[id]/exercises?instance_id=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const instanceId = req.nextUrl.searchParams.get('instance_id')
    if (!instanceId) return NextResponse.json({ error: 'instance_id required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('class_exercise_instance')
      .delete()
      .eq('id', instanceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Removed' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
