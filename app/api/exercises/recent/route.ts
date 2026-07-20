import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/exercises/recent — recently used exercises for this trainer (from class history)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Step 1: get all class IDs for this trainer
    const { data: classes } = await supabaseAdmin
      .from('fitness_class')
      .select('id')
      .eq('trainer_id', userId)

    if (!classes || classes.length === 0) return NextResponse.json([])

    const classIds = classes.map((c: any) => c.id)

    // Step 2: get exercise instances ordered by most recently added
    const { data: instances } = await supabaseAdmin
      .from('class_exercise_instance')
      .select('exercise_id, created_at')
      .in('class_id', classIds)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!instances || instances.length === 0) return NextResponse.json([])

    // Deduplicate: keep most recent occurrence per exercise
    const seen = new Set<string>()
    const recentIds: string[] = []
    for (const row of instances) {
      if (!seen.has(row.exercise_id)) {
        seen.add(row.exercise_id)
        recentIds.push(row.exercise_id)
        if (recentIds.length >= 15) break
      }
    }

    if (recentIds.length === 0) return NextResponse.json([])

    // Step 3: fetch exercise details
    const { data: exercises } = await supabaseAdmin
      .from('master_exercise')
      .select('id, name_cn, name_en, type_cn, type_en, difficulty_cn, category')
      .in('id', recentIds)
      .eq('is_active', true)

    // Sort back to recency order
    const map: Record<string, any> = {}
    exercises?.forEach(e => { map[e.id] = e })
    const sorted = recentIds.filter(id => map[id]).map(id => map[id])

    return NextResponse.json(sorted)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
