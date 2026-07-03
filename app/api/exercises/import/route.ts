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
      description_en: ex.description_en || ex.descriptionEN || ex.description || '',
      description_cn: ex.description_cn || ex.descriptionCN || '',
      instructions_en: ex.instructions_en || ex.instructionsEN || ex.instructions || '',
      instructions_cn: ex.instructions_cn || ex.instructionsCN || '',
      series_cn: ex.series_cn || ex.seriesCN || null,
      series_en: ex.series_en || ex.seriesEN || null,
      type_en: ex.type_en || ex.typeEN || ex.type || '',
      type_cn: ex.type_cn || ex.typeCN || '',
      difficulty_en: ex.difficulty_en || ex.difficultyEN || ex.difficulty || '',
      difficulty_cn: ex.difficulty_cn || ex.difficultyCN || '',
      target_muscles_en: ex.target_muscles_en || ex.targetMusclesEN || ex.targetMuscles || '',
      target_muscles_cn: ex.target_muscles_cn || ex.targetMusclesCN || '',
      featured_image_url: ex.featured_image_url || ex.featuredImageUrl || ex.imageUrl1 || ex.image_url || null,
      default_sets: ex.default_sets || ex.defaultSets ? parseInt(ex.default_sets || ex.defaultSets) : null,
      default_reps: ex.default_reps || ex.defaultReps ? parseInt(ex.default_reps || ex.defaultReps) : null,
      default_weight: ex.default_weight || ex.defaultWeight ? parseFloat(ex.default_weight || ex.defaultWeight) : null,
      default_weight_unit: ex.default_weight_unit || ex.defaultWeightUnit || 'kg',
      default_duration: ex.default_duration || ex.defaultDuration ? parseInt(ex.default_duration || ex.defaultDuration) : null,
      default_duration_unit: ex.default_duration_unit || ex.defaultDurationUnit || 'minutes',
      created_by: userId,
    }))

    // Insert one by one to collect per-row errors
    let created = 0
    const errors: { exercise: string; error: string }[] = []

    for (const row of rows) {
      const { error } = await supabaseAdmin.from('master_exercise').insert([row])
      if (error) {
        errors.push({ exercise: row.name_en || row.name_cn || 'Unknown', error: error.message })
      } else {
        created++
      }
    }

    return NextResponse.json({
      created,
      failed: errors.length,
      errors,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
