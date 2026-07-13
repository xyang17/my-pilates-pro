import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/assessments?clientId=xxx
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')

    let query = supabaseAdmin
      .from('body_assessment')
      .select('*')
      .order('assessed_at', { ascending: false })

    if (userRole === 'CLIENT') {
      // Clients can only see their own
      query = query.eq('client_id', userId)
    } else if (clientId) {
      query = query.eq('client_id', clientId)
    } else {
      // Trainer/Admin: return all assessments they created
      query = query.eq('trainer_id', userId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Two-step: get client names
    const clientIds = [...new Set((data || []).map((a: any) => a.client_id))]
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('user').select('id, name, email').in('id', clientIds)
      for (const u of users || []) clientMap[u.id] = u.name || u.email
    }

    const result = (data || []).map((a: any) => ({
      ...a,
      client_name: clientMap[a.client_id] || '',
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/assessments — create new assessment
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      client_id,
      assessed_at,
      notes,
      photo_urls,
      // Body composition
      weight, weight_unit, height, height_unit,
      bmi, body_fat_pct, muscle_mass, bone_mass,
      water_pct, visceral_fat, bmr, body_age,
      // Cardiovascular
      resting_hr, bp_systolic, bp_diastolic,
      vo2_max, six_min_walk, step_test,
      // Strength
      pushup_count, situp_count, grip_left, grip_right,
      plank_sec, squat_count, sit_reach_cm,
    } = body

    if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('body_assessment')
      .insert({
        client_id,
        trainer_id: userId,
        assessed_at: assessed_at || new Date().toISOString(),
        notes: notes || null,
        photo_urls: photo_urls || [],
        weight, weight_unit, height, height_unit,
        bmi, body_fat_pct, muscle_mass, bone_mass,
        water_pct, visceral_fat, bmr, body_age,
        resting_hr, bp_systolic, bp_diastolic,
        vo2_max, six_min_walk, step_test,
        pushup_count, situp_count, grip_left, grip_right,
        plank_sec, squat_count, sit_reach_cm,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
