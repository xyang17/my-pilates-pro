import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: List all exercises (trainer's created exercises + ones they use)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all exercises created by this trainer (with all bilingual fields)
    const { data: exercises, error } = await supabaseAdmin
      .from('master_exercise')
      .select(`
        id,
        name_en,
        name_cn,
        description_en,
        description_cn,
        instructions_en,
        instructions_cn,
        type_en,
        type_cn,
        difficulty_en,
        difficulty_cn,
        target_muscles_en,
        target_muscles_cn,
        featured_image_url,
        default_sets,
        default_reps,
        default_weight,
        default_weight_unit,
        default_duration,
        default_duration_unit,
        created_by,
        created_at,
        updated_at
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(exercises)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new master exercise
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      nameEN,
      nameCN,
      descriptionEN,
      descriptionCN,
      instructionsEN,
      instructionsCN,
      featuredImageUrl,
      typeEN,
      typeCN,
      difficultyEN,
      difficultyCN,
      targetMusclesEN,
      targetMusclesCN,
      defaultSets,
      defaultReps,
      defaultWeight,
      defaultWeightUnit,
      defaultDuration,
      defaultDurationUnit,
    } = await req.json()

    if (!nameEN || !nameCN) {
      return NextResponse.json(
        { error: 'English and Chinese names are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .insert([
        {
          name_en: nameEN,
          name_cn: nameCN,
          description_en: descriptionEN || null,
          description_cn: descriptionCN || null,
          instructions_en: instructionsEN || null,
          instructions_cn: instructionsCN || null,
          featured_image_url: featuredImageUrl || null,
          type_en: typeEN || null,
          type_cn: typeCN || null,
          difficulty_en: difficultyEN || null,
          difficulty_cn: difficultyCN || null,
          target_muscles_en: targetMusclesEN || null,
          target_muscles_cn: targetMusclesCN || null,
          default_sets: defaultSets ? parseInt(defaultSets) : null,
          default_reps: defaultReps ? parseInt(defaultReps) : null,
          default_weight: defaultWeight ? parseFloat(defaultWeight) : null,
          default_weight_unit: defaultWeightUnit || 'kg',
          default_duration: defaultDuration ? parseInt(defaultDuration) : null,
          default_duration_unit: defaultDurationUnit || 'minutes',
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
