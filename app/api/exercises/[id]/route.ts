import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Get single exercise with all its notes
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

    // Get exercise
    const { data: exercise, error: exerciseError } = await supabaseAdmin
      .from('master_exercise')
      .select('*')
      .eq('id', exerciseId)
      .single()

    if (exerciseError) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    // Get all images
    const { data: images, error: imagesError } = await supabaseAdmin
      .from('exercise_image')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('"order"', { ascending: true })

    if (imagesError) {
      console.error('Error fetching images:', imagesError)
    }

    // Get all notes (trainer + client)
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('exercise_note')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false })

    if (notesError) {
      return NextResponse.json({ error: notesError.message }, { status: 400 })
    }

    return NextResponse.json({
      ...exercise,
      images: images || [],
      notes: notes || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Update exercise
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exerciseId = params.id
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

    // Verify ownership
    const { data: exercise } = await supabaseAdmin
      .from('master_exercise')
      .select('created_by')
      .eq('id', exerciseId)
      .single()

    if (exercise?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('master_exercise')
      .update({
        name_en: nameEN || undefined,
        name_cn: nameCN || undefined,
        description_en: descriptionEN || undefined,
        description_cn: descriptionCN || undefined,
        instructions_en: instructionsEN || undefined,
        instructions_cn: instructionsCN || undefined,
        featured_image_url: featuredImageUrl || undefined,
        type_en: typeEN || undefined,
        type_cn: typeCN || undefined,
        difficulty_en: difficultyEN || undefined,
        difficulty_cn: difficultyCN || undefined,
        target_muscles_en: targetMusclesEN || undefined,
        target_muscles_cn: targetMusclesCN || undefined,
        default_sets: defaultSets ? parseInt(defaultSets) : undefined,
        default_reps: defaultReps ? parseInt(defaultReps) : undefined,
        default_weight: defaultWeight ? parseFloat(defaultWeight) : undefined,
        default_weight_unit: defaultWeightUnit || undefined,
        default_duration: defaultDuration ? parseInt(defaultDuration) : undefined,
        default_duration_unit: defaultDurationUnit || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exerciseId)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
