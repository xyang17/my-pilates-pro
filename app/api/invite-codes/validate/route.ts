import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/invite-codes/validate — check if a code is valid (called during signup)
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ valid: false, error: '请输入邀请码' })

    const { data, error } = await supabaseAdmin
      .from('invite_code')
      .select('id, code, role, used_by, expires_at, label')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle()

    if (error || !data) return NextResponse.json({ valid: false, error: '邀请码无效' })
    if (data.used_by) return NextResponse.json({ valid: false, error: '邀请码已被使用' })
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: '邀请码已过期' })
    }

    return NextResponse.json({ valid: true, role: data.role, inviteId: data.id })
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message })
  }
}

// PATCH /api/invite-codes/validate — mark code as used after successful signup
export async function PATCH(req: NextRequest) {
  try {
    const { inviteId, userId } = await req.json()
    if (!inviteId || !userId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

    await supabaseAdmin
      .from('invite_code')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('id', inviteId)
      .is('used_by', null) // safety: only if not already used

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
