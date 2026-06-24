import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Bulk import exercises from JSON array
// Expected format: Array of exercise objects
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exercises } = await req.json()

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'Exercises array is required' }, { status: 400 })
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[],
    }

    for (const exercise of exercises) {
      try {
        // Validate required fields
        if (!exercise.nameEN || !exercise.nameCN) {
          results.failed++
          results.errors.push({
            row: exercise,
            error: 'Missing nameEN or nameCN',
          })
          continue
        }

        // Create exercise with bilingual fields
        const { data: createdExercise, error: exerciseError } = await supabaseAdmin
          .from('master_exercise')
          .insert([
            {
              name_en: exercise.nameEN,
              name_cn: exercise.nameCN,
              description_en: exercise.descriptionEN || null,
              description_cn: exercise.descriptionCN || null,
              instructions_en: exercise.instructionsEN || null,
              instructions_cn: exercise.instructionsCN || null,
              type_en: exercise.typeEN || null,
              type_cn: exercise.typeCN || null,
              difficulty_en: exercise.difficultyEN || null,
              difficulty_cn: exercise.difficultyCN || null,
              target_muscles_en: exercise.targetMusclesEN || null,
              target_muscles_cn: exercise.targetMusclesCN || null,
              featured_image_url: exercise.featuredImageUrl || null,
              default_sets: exercise.defaultSets ? parseInt(exercise.defaultSets) : null,
              default_reps: exercise.defaultReps ? parseInt(exercise.defaultReps) : null,
              default_weight: exercise.defaultWeight ? parseFloat(exercise.defaultWeight) : null,
              default_weight_unit: exercise.defaultWeightUnit || 'kg',
              default_duration: exercise.defaultDuration ? parseInt(exercise.defaultDuration) : null,
              default_duration_unit: exercise.defaultDurationUnit || 'minutes',
              created_by: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()

        if (exerciseError) {
          results.failed++
          results.errors.push({
            exercise: exercise.nameEN,
            error: exerciseError.message,
          })
          continue
        }

        const exerciseId = createdExercise[0].id

        // Add images if provided
        if (exercise.imageUrl1 || exercise.imageUrl2 || exercise.imageUrl3) {
          const imagesToAdd = []

          if (exercise.imageUrl1) {
            imagesToAdd.push({
              exercise_id: exerciseId,
              image_url: exercise.imageUrl1,
              caption: exercise.imageCaption1 || null,
              order: 1,
              created_at: new Date().toISOString(),
            })
          }

          if (exercise.imageUrl2) {
            imagesToAdd.push({
              exercise_id: exerciseId,
              image_url: exercise.imageUrl2,
              caption: exercise.imageCaption2 || null,
              order: 2,
              created_at: new Date().toISOString(),
            })
          }

          if (exercise.imageUrl3) {
            imagesToAdd.push({
              exercise_id: exerciseId,
              image_url: exercise.imageUrl3,
              caption: exercise.imageCaption3 || null,
              order: 3,
              created_at: new Date().toISOString(),
            })
          }

          if (imagesToAdd.length > 0) {
            await supabaseAdmin.from('exercise_image').insert(imagesToAdd)
          }
        }

        results.created++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          exercise: exercise.nameEN,
          error: error.message,
        })
      }
    }

    return NextResponse.json(
      {
        message: `Imported ${results.created} exercises, ${results.failed} failed`,
        ...results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
