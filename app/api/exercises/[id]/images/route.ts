import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Get all images for an exercise
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

    const { data: images, error } = await supabaseAdmin
      .from('exercise_image')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('"order"', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(images)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add images to an exercise
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exerciseId = params.id
    const { images } = await req.json() // Array of { imageUrl, caption, order }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Images array is required' }, { status: 400 })
    }

    // Verify exercise ownership
    const { data: exercise } = await supabaseAdmin
      .from('master_exercise')
      .select('created_by')
      .eq('id', exerciseId)
      .single()

    if (exercise?.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Insert images
    const imageRecords = images.map((img: any, index: number) => ({
      exercise_id: exerciseId,
      image_url: img.imageUrl,
      caption: img.caption || null,
      order: img.order ?? index,
      created_at: new Date().toISOString(),
    }))

    const { data, error } = await supabaseAdmin
      .from('exercise_image')
      .insert(imageRecords)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
