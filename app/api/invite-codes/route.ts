import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ROLE_PREFIX: Record<string, string> = {
  TRAINER: 'TRN',
  CLIENT:  'CLT',
  ADMIN:   'ADM',
}

function generateCode(role: string): string {
  const prefix = ROLE_PREFIX[role] || 'CLT'
  const digits = () => Math.floor(100 + Math.random() * 900).toString() // 3-digit
  return `MFP-${prefix}-${digits()}-${digits()}` // e.g. MFP-TRN-847-291
}

// POST /api/invite-codes — only ADMIN can generate
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: '只有管理员可以生成邀请码' }, { status: 403 })
    }

    const body = await req.json()
    const { role = 'CLIENT', label = '', expiresInDays = 30 } = body

    if (!['TRAINER', 'CLIENT', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: '无效角色' }, { status: 400 })
    }

    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode(role)
      const { data } = await supabaseAdmin
        .from('invite_code').select('id').eq('code', candidate).maybeSingle()
      if (!data) { code = candidate; break }
    }
    if (!code) return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })

    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + expiresInDays)

    const { data, error } = await supabaseAdmin
      .from('invite_code')
      .insert({ code, created_by: userId, role, label: label || null, expires_at })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/invite-codes — only ADMIN sees all codes
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Avoid PostgREST join on reserved "user" table — two-step query
    const { data: codes, error } = await supabaseAdmin
      .from('invite_code')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch names for used_by ids
    const usedByIds = (codes || []).filter(c => c.used_by).map(c => c.used_by)
    let userMap: Record<string, string> = {}
    if (usedByIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('user').select('id, name, email').in('id', usedByIds)
      for (const u of users || []) userMap[u.id] = u.name || u.email
    }

    const result = (codes || []).map(c => ({
      ...c,
      used_by_name: c.used_by ? (userMap[c.used_by] || '') : null,
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
