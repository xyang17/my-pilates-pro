import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// B01 / B02 / B21 / B22 —— 不随每次测量变化的静态档案
const WRITABLE = [
  'sex', 'birth_date', 'training_years', 'injury_notes', 'unit_preference',
  'data_use_consent', 'consent_version',
]
// consent_at / consent_withdrawn_at 由数据库触发器自动打戳，不接受前端写入

function authorize(req: NextRequest, clientId: string) {
  const userId = req.headers.get('x-user-id')
  const userRole = req.headers.get('x-user-role')
  if (!userId) return { ok: false as const, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  // 会员只能读写自己的档案
  if (userRole === 'CLIENT' && userId !== clientId) {
    return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true as const, userId, userRole }
}

// GET /api/l0/profile/[clientId] — 档案 + 禁忌条目
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const auth = authorize(req, clientId)
    if (!auth.ok) return auth.res

    const [{ data: profile }, { data: contra, error: contraErr }] = await Promise.all([
      supabaseAdmin.from('client_profile').select('*').eq('user_id', clientId).maybeSingle(),
      supabaseAdmin.from('client_contraindication').select('*')
        .eq('user_id', clientId).order('created_at', { ascending: false }),
    ])
    if (contraErr) return NextResponse.json({ error: contraErr.message }, { status: 500 })

    return NextResponse.json({
      profile: profile ?? null,
      contraindications: contra ?? [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/l0/profile/[clientId] — upsert 档案
export async function PUT(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const { clientId } = await params
    const auth = authorize(req, clientId)
    if (!auth.ok) return auth.res

    const body = await req.json()
    const payload: Record<string, any> = { user_id: clientId }
    for (const k of WRITABLE) if (k in body) payload[k] = body[k] === '' ? null : body[k]

    const { data, error } = await supabaseAdmin
      .from('client_profile')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
