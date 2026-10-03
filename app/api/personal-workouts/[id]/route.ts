import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { requireStaff, cleanWorkout, cleanExercises, loadOwnWorkout } from '@/lib/personalWorkout'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/personal-workouts/[id] —— 一条训练 + 动作明细
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const auth = await requireStaff(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const r = await loadOwnWorkout(id, auth.userId)
    if (r.status !== 200) return NextResponse.json({ error: r.error }, { status: r.status })
    return NextResponse.json(r.data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/personal-workouts/[id] —— 修改。
// 主体字段部分更新；传了 exercises 就整组替换动作明细（表单每次提交都是完整列表）。
//
// 替换顺序是「先插新的、再删旧的」：supabase-js 没有事务，
// 如果反过来先删后插、插的时候失败，那一组明细就丢了，而训练数据丢了是补不回来的。
// 先插后删最坏的情况是删旧的失败 → 短暂重复，可以再保存一次修正。
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const auth = await requireStaff(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const existing = await loadOwnWorkout(id, auth.userId)
    if (existing.status !== 200) return NextResponse.json({ error: existing.error }, { status: existing.status })

    const body = await req.json()
    const w = cleanWorkout(body, true)
    if (!w.ok) return NextResponse.json({ error: w.error }, { status: 400 })

    const { error: upErr } = await supabaseAdmin
      .from('personal_workout')
      .update({ ...w.row, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', auth.userId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    if (body.exercises !== undefined) {
      const oldIds = (existing.data!.exercises as any[]).map(e => e.id)
      const newRows = cleanExercises(body.exercises).map(e => ({ ...e, workout_id: id }))

      if (newRows.length > 0) {
        const { error: insErr } = await supabaseAdmin.from('personal_workout_exercise').insert(newRows)
        if (insErr) return NextResponse.json({ error: `动作明细保存失败：${insErr.message}` }, { status: 400 })
      }
      if (oldIds.length > 0) {
        const { error: delErr } = await supabaseAdmin.from('personal_workout_exercise').delete().in('id', oldIds)
        if (delErr) return NextResponse.json({ error: `旧明细清理失败，请再保存一次：${delErr.message}` }, { status: 400 })
      }
    }

    const full = await loadOwnWorkout(id, auth.userId)
    return NextResponse.json(full.data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/personal-workouts/[id] —— 明细随外键级联删除
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const auth = await requireStaff(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const existing = await loadOwnWorkout(id, auth.userId)
    if (existing.status !== 200) return NextResponse.json({ error: existing.error }, { status: existing.status })

    const { error } = await supabaseAdmin.from('personal_workout').delete().eq('id', id).eq('user_id', auth.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
