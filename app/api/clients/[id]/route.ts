import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { countBillableCompleted } from '@/lib/classCounts'
import { summarizeClients } from '@/lib/clientSummary'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients/[id] — client profile + class history + trainer notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (userRole !== 'ADMIN' && userRole !== 'TRAINER' && userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: userRow, error } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url, bio, created_at, role, sex, birth_date, height_cm, loyalty_base_count, loyalty_mode, loyalty_threshold, loyalty_bonus')
      .eq('id', id)
      .single()

    if (error) throw error

    // Trainer assessment notes from client table (may not exist yet)
    const { data: clientRow } = await supabaseAdmin
      .from('client')
      .select('injury_notes, goals, emergency_contact')
      .eq('user_id', id)
      .maybeSingle()

    // Class history
    const { data: classes } = await supabaseAdmin
      .from('class')
      .select('id, name, date, start_time, duration, discipline, class_type, level, status, color')
      .eq('assigned_to', id)
      .order('date', { ascending: false })
      .limit(50)

    // 计费课时（私教 + 报名团课，不含自我练习），跟满赠提醒用同一个算法。
    // 前端不要自己拿 classes 数：classes 只有最近 50 条，而且里面混着自我练习。
    const counts = await countBillableCompleted(id)
    // 卡片摘要只给教练/管理员（里面有课时包、满赠等经营信息）
    const summary = (userRole === 'ADMIN' || userRole === 'TRAINER')
      ? (await summarizeClients([id]))[id] || null
      : null

    return NextResponse.json({
      ...userRow,
      billable_completed: counts.total,
      billable_private: counts.private,
      billable_group: counts.group,
      self_practice_completed: counts.selfPractice,
      summary,
      injury_notes: clientRow?.injury_notes || null,
      goals: clientRow?.goals || null,
      emergency_contact: clientRow?.emergency_contact || null,
      classes: classes || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/clients/[id] — trainer updates assessment notes (injury_notes, goals)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { injury_notes, goals, emergency_contact } = body

    // 性别/出生日期/身高 存在 user 表上（账号级基础资料，不是这条 client 记录），单独更新
    const userUpdates: Record<string, unknown> = {}
    if (body.sex        !== undefined) userUpdates.sex        = body.sex || null
    if (body.birth_date !== undefined) userUpdates.birth_date = body.birth_date || null
    if (body.height_cm  !== undefined) userUpdates.height_cm  = body.height_cm === '' ? null : body.height_cm
    // 满赠起始节数：用系统之前就上过的课，教练手工认定
    // 这个学员的满赠规则：default 跟随全店 / custom 单独设 / off 不参加（lib/loyaltyRule.ts）
    if (body.loyalty_mode !== undefined) {
      const m = body.loyalty_mode
      if (m !== null && m !== 'default' && m !== 'custom' && m !== 'off') {
        return NextResponse.json({ error: '满赠规则不对' }, { status: 400 })
      }
      userUpdates.loyalty_mode = m === 'default' ? null : m
    }
    if (body.loyalty_threshold !== undefined) {
      const n = Math.floor(Number(body.loyalty_threshold))
      userUpdates.loyalty_threshold = Number.isFinite(n) && n > 0 ? n : null
    }
    if (body.loyalty_bonus !== undefined) {
      const n = Math.floor(Number(body.loyalty_bonus))
      userUpdates.loyalty_bonus = Number.isFinite(n) && n > 0 ? n : null
    }
    if (body.loyalty_base_count !== undefined) {
      userUpdates.loyalty_base_count = Math.max(0, Math.floor(Number(body.loyalty_base_count) || 0))
    }
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString()
      const { error: userErr } = await supabaseAdmin.from('user').update(userUpdates).eq('id', id)
      if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })
    }

    // Select-then-update-or-insert (no unique constraint on user_id yet)
    const { data: existing } = await supabaseAdmin
      .from('client')
      .select('id')
      .eq('user_id', id)
      .maybeSingle()

    let error: any = null
    if (existing) {
      const res = await supabaseAdmin
        .from('client')
        .update({ injury_notes: injury_notes ?? null, goals: goals ?? null, emergency_contact: emergency_contact ?? null })
        .eq('user_id', id)
      error = res.error
    } else {
      const res = await supabaseAdmin
        .from('client')
        .insert({ user_id: id, injury_notes: injury_notes ?? null, goals: goals ?? null, emergency_contact: emergency_contact ?? null })
      error = res.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
