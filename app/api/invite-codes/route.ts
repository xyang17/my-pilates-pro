import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code // format: XXXX-XXXX
}

// POST /api/invite-codes — generate a new invite code
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: '只有教练或管理员可以生成邀请码' }, { status: 403 })
    }

    const body = await req.json()
    const { role = 'CLIENT', label = '', expiresInDays = 30 } = body

    if (!['TRAINER', 'CLIENT'].includes(role)) {
      return NextResponse.json({ error: '无效角色' }, { status: 400 })
    }

    // Generate unique code (retry if collision)
    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode()
      const { data } = await supabaseAdmin
        .from('invite_code')
        .select('id')
        .eq('code', candidate)
        .maybeSingle()
      if (!data) { code = candidate; break }
    }
    if (!code) return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })

    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + expiresInDays)

    const { data, error } = await supabaseAdmin
      .from('invite_code')
      .insert({ code, created_by: userId, role, label: label || null, expires_at })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/invite-codes — list codes created by current user
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('invite_code')
      .select('*, used_by_user:used_by("name", "email")')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
