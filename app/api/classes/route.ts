import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ADMIN sees all classes; TRAINERs see classes they created; clients see their own
    if (userRole === 'ADMIN' || userRole === 'TRAINER') {
      let query = supabaseAdmin
        .from('class')
        .select('*')
        .order('date', { ascending: false })

      if (userRole === 'TRAINER') query = query.eq('created_by', userId)

      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data)
    }

    // 学员：被指派的私教课 + 自己创建的 + 已报名的团课。
    // 分开查再合并，避免 PostgREST 的 or(...in...) 语法出问题。
    const { data: enrolled } = await supabaseAdmin
      .from('class_enrollment')
      .select('class_id')
      .eq('student_id', userId)

    const enrolledIds = [...new Set((enrolled || []).map(e => e.class_id).filter(Boolean))]

    const [ownRes, enrolledRes] = await Promise.all([
      supabaseAdmin
        .from('class')
        .select('*')
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`),
      enrolledIds.length > 0
        ? supabaseAdmin.from('class').select('*').in('id', enrolledIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (ownRes.error) return NextResponse.json({ error: ownRes.error.message }, { status: 400 })
    if (enrolledRes.error) return NextResponse.json({ error: enrolledRes.error.message }, { status: 400 })

    const byId = new Map<string, any>()
    ;[...(ownRes.data || []), ...(enrolledRes.data || [])].forEach(c => byId.set(c.id, c))
    const merged = [...byId.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    return NextResponse.json(merged)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    const { data, error } = await supabaseAdmin
      .from('class')
      .insert([{
        name:             body.name,
        date:             body.date,
        start_time:       body.start_time       || null,
        duration:         body.duration         || 60,
        type:             body.discipline       || body.type || 'Pilates',
        discipline:       body.discipline       || body.type || 'Pilates',
        class_type:       body.class_type       || 'private',
        level:            body.level            || 'beginner',
        description:      body.description      || null,
        max_capacity:     body.max_capacity      || null,
        price:            body.price ? parseFloat(body.price) : null,
        color:            body.color            || '#9B7DB5',
        cover_image_url:  body.cover_image_url  || null,
        trainer_id:       body.trainer_id       || null,
        status:           'planned',
        created_by:       userId,
        assigned_to:      body.assigned_to      || null,
        notes:            body.notes            || null,
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Insert class photos if provided
    if (body.photos && body.photos.length > 0) {
      await supabaseAdmin.from('class_photo').insert(
        body.photos.map((url: string, i: number) => ({
          class_id:   data.id,
          url,
          sort_order: i,
        }))
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
