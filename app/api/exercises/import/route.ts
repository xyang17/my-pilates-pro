import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/exercises/import — bulk import exercises
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { exercises } = body

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'No exercises provided' }, { status: 400 })
    }

    const rows = exercises.map((ex: any) => ({
      name_en: ex.name_en || ex.nameEN || '',
      name_cn: ex.name_cn || ex.nameCN || '',
      description_en: ex.description_en || ex.description || '',
      description_cn: ex.description_cn || '',
      instructions_en: ex.instructions_en || ex.instructions || '',
      instructions_cn: ex.instructions_cn || '',
      type_en: ex.type_en || ex.type || '',
      type_cn: ex.type_cn || '',
      difficulty_en: ex.difficulty_en || ex.difficulty || '',
      difficulty_cn: ex.difficulty_cn || '',
      target_muscles_en: ex.target_muscles_en || ex.targetMuscles || '',
      target_muscles_cn: ex.target_muscles_cn || '',
      featured_image_url: ex.featured_image_url || ex.image_url || null,
      default_sets: ex.default_sets ? parseInt(ex.default_sets) : null,
      default_reps: ex.default_reps ? parseInt(ex.default_reps) : null,
      default_weight: ex.default_weight ? parseFloat(ex.default_weight) : null,
      default_weight_unit: ex.default_weight_unit || 'kg',
      default_duration: ex.default_duration ? parseInt(ex.default_duration) : null,
      default_duration_unit: ex.default_duration_unit || 'minutes',
      created_by: userId,
    }))

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .insert(rows)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      message: `Imported ${data.length} exercises`,
      count: data.length,
      exercises: data,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
