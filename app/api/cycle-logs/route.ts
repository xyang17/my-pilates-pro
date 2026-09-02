import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isStaff } from '@/lib/db'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 生理周期记录——本人自己记，或教练帮学员记（跟伤病备注权限一样），
// 都要求目标账号 sex = FEMALE，避免记错账号。

// GET /api/cycle-logs?userId=xxx —— 列出某账号的周期记录（本人或教练/管理员可查看）
export async function GET(req: NextRequest) {
  try {
    const requesterId = req.headers.get('x-user-id')
    const requesterRole = req.headers.get('x-user-role')
    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (requesterId !== userId && !isStaff(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('menstrual_cycle_log')
      .select('id, start_date, end_date, flow_level, pain_level, notes, recorded_by, created_at, updated_at')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/cycle-logs —— 新增一条周期记录
export async function POST(req: NextRequest) {
  try {
    const requesterId = req.headers.get('x-user-id')
    const requesterRole = req.headers.get('x-user-role')
    if (!requesterId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { user_id, start_date, end_date, flow_level, pain_level, notes } = body

    if (!user_id || !start_date) {
      return NextResponse.json({ error: 'user_id 和 start_date 必填' }, { status: 400 })
    }
    if (requesterId !== user_id && !isStaff(requesterRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 目标账号必须是女性账号才能记这个——防止记错账号
    const { data: targetUser, error: userErr } = await supabaseAdmin
      .from('user')
      .select('sex')
      .eq('id', user_id)
      .single()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })
    if (targetUser?.sex !== 'FEMALE') {
      return NextResponse.json({ error: '该账号未设置为女性，无法记录生理周期' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('menstrual_cycle_log')
      .insert([{
        user_id,
        start_date,
        end_date: end_date || null,
        flow_level: flow_level || null,
        pain_level: pain_level || null,
        notes: notes || null,
        recorded_by: requesterId,
      }])
      .select('id, start_date, end_date, flow_level, pain_level, notes, recorded_by, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
