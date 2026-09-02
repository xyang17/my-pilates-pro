import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/users/[id] —— 账号基础资料（性别/出生日期/身高等）。
// 本人或教练/管理员可查看；跟 client_profile.sex（教练做体测评估时才填）是两回事。
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userId !== id && !isStaff(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .select('id, name, email, role, sex, birth_date, height_cm, bio, photo_url, created_at')
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/users/[id] —— 更新账号基础资料。本人或教练/管理员可改。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userId !== id && !isStaff(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name       !== undefined) updates.name       = body.name
    if (body.sex        !== undefined) updates.sex        = body.sex || null
    if (body.birth_date !== undefined) updates.birth_date = body.birth_date || null
    if (body.height_cm  !== undefined) updates.height_cm  = body.height_cm === '' ? null : body.height_cm
    if (body.bio         !== undefined) updates.bio        = body.bio || null

    const { data, error } = await supabaseAdmin
      .from('user')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, role, sex, birth_date, height_cm, bio, photo_url, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
