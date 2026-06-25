import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/exercises/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .select(`
        *,
        images:exercise_image(*),
        notes:exercise_note(*)
      `)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/exercises/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .update({
        name_en: body.nameEN || body.name_en,
        name_cn: body.nameCN || body.name_cn,
        description_en: body.description_en || body.description,
        description_cn: body.description_cn,
        instructions_en: body.instructions_en || body.instructions,
        instructions_cn: body.instructions_cn,
        featured_image_url: body.featuredImageUrl || body.featured_image_url,
        type_en: body.type_en || body.type,
        type_cn: body.type_cn,
        difficulty_en: body.difficulty_en || body.difficulty,
        difficulty_cn: body.difficulty_cn,
        target_muscles_en: body.target_muscles_en || body.targetMuscles,
        target_muscles_cn: body.target_muscles_cn,
        default_sets: body.default_sets,
        default_reps: body.default_reps,
        default_weight: body.default_weight,
        default_weight_unit: body.default_weight_unit,
        default_duration: body.default_duration,
        default_duration_unit: body.default_duration_unit,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', userId)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/exercises/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { error } = await supabaseAdmin
      .from('master_exercise')
      .update({ is_active: false })
      .eq('id', id)
      .eq('created_by', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
