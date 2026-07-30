import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: trainer, error } = await supabaseAdmin
      .from('user')
      .select('id, name, bio, photo_url, role, email, can_view_store_stats')
      .eq('id', id)
      .single()

    if (error) throw error

    // Get trainer's upcoming classes
    const { data: classes } = await supabaseAdmin
      .from('class')
      .select('id, name, date, start_time, duration, discipline, class_type, level, status, color')
      .eq('trainer_id', id)
      .order('date', { ascending: true })
      .limit(20)

    return NextResponse.json({ ...trainer, classes: classes || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/trainers/[id] — 目前仅用于 ADMIN 授权/取消教练查看全店统计的权限
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabaseAdmin.from('user').select('role').eq('id', userId).single()
    if (!actor || actor.role !== 'ADMIN') {
      return NextResponse.json({ error: '仅管理员可修改教练权限' }, { status: 403 })
    }

    const body = await req.json()
    if (typeof body.can_view_store_stats !== 'boolean') {
      return NextResponse.json({ error: 'can_view_store_stats 必须是布尔值' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .update({ can_view_store_stats: body.can_view_store_stats, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, role, can_view_store_stats')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
