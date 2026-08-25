import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { filterExercisesForRole } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/exercises — list all exercises for this user
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .select('*')
      .eq('is_active', true)
      .order('name_cn', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 学员只看到中文名/双语简介已经补完的动作，未翻译的先只对教练/管理员可见
    return NextResponse.json(filterExercisesForRole(data || [], req.headers.get('x-user-role')))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/exercises — create a new exercise
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .insert([{
        name_en: body.nameEN || body.name_en,
        name_cn: body.nameCN || body.name_cn || '',
        description_en: body.description || body.description_en,
        description_cn: body.description_cn,
        instructions_en: body.instructions || body.instructions_en,
        instructions_cn: body.instructions_cn,
        featured_image_url: body.featuredImageUrl || body.featured_image_url,
        type_en: body.type || body.type_en,
        type_cn: body.type_cn,
        difficulty_en: body.difficulty || body.difficulty_en,
        difficulty_cn: body.difficulty_cn,
        target_muscles_en: body.targetMuscles || body.target_muscles_en,
        target_muscles_cn: body.target_muscles_cn,
        secondary_muscles_en: body.secondaryMuscles || body.secondary_muscles_en || null,
        secondary_muscles_cn: body.secondary_muscles_cn || null,
        body_position_en: body.bodyPosition || body.body_position_en || null,
        body_position_cn: body.body_position_cn || null,
        equipment_en: body.equipment || body.equipment_en || null,
        equipment_cn: body.equipment_cn || null,
        equipment_setup_en: body.equipmentSetup || body.equipment_setup_en || null,
        equipment_setup_cn: body.equipment_setup_cn || null,
        cues_en: body.cues || body.cues_en || null,
        cues_cn: body.cues_cn || null,
        contraindications_en: body.contraindications || body.contraindications_en || null,
        contraindications_cn: body.contraindications_cn || null,
        gif_url: body.gifUrl || body.gif_url || null,
        default_sets: body.defaultSets ? parseInt(body.defaultSets) : body.default_sets,
        default_reps: body.defaultReps ? parseInt(body.defaultReps) : body.default_reps,
        default_weight: body.defaultWeight ? parseFloat(body.defaultWeight) : body.default_weight,
        default_weight_unit: body.defaultWeightUnit || body.default_weight_unit || 'kg',
        default_duration: body.defaultDuration ? parseInt(body.defaultDuration) : body.default_duration,
        default_duration_unit: body.defaultDurationUnit || body.default_duration_unit || 'minutes',
        created_by: userId,
      }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
