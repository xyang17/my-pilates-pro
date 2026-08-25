import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT /api/classes/[id]/exercises/[instanceId]/sets
// 整组替换：前端把当前这个动作的"每组明细"数组整个传过来，
// 后端负责把多出来的组删掉、把传来的组 upsert 进去。
// 训练容量（组数 x 次数 x 重量求和）就是从这张表算的——数字类型由数据库强制，
// 不会出现"存进去是文字、算的时候悄悄算成 0"这种情况。
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; instanceId: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { instanceId } = await params
    const body = await req.json()
    const rawSets = Array.isArray(body.sets) ? body.sets : []

    // 校验 + 规整：set_no 必须是正整数，reps/weight 允许为空但不能是非数字
    const sets = rawSets.map((s: any, i: number) => {
      const setNo = Number.isFinite(Number(s.set_no)) ? parseInt(s.set_no) : i + 1
      const reps = s.reps === '' || s.reps === null || s.reps === undefined ? null : Number(s.reps)
      const weight = s.weight === '' || s.weight === null || s.weight === undefined ? null : Number(s.weight)
      if (reps !== null && !Number.isFinite(reps)) {
        throw new Error(`第 ${setNo} 组的次数不是有效数字`)
      }
      if (weight !== null && !Number.isFinite(weight)) {
        throw new Error(`第 ${setNo} 组的重量不是有效数字`)
      }
      return {
        instance_id: instanceId,
        set_no: setNo,
        reps,
        weight,
        weight_unit: s.weight_unit || 'kg',
        notes: s.notes || null,
        updated_at: new Date().toISOString(),
      }
    })

    const keepSetNos = sets.map((s: any) => s.set_no)

    // 删掉不在这次提交里的组（比如用户删掉了第4组）
    let delQuery = supabaseAdmin
      .from('exercise_instance_set')
      .delete()
      .eq('instance_id', instanceId)
    if (keepSetNos.length > 0) {
      delQuery = delQuery.not('set_no', 'in', `(${keepSetNos.join(',')})`)
    }
    const { error: delError } = await delQuery
    if (delError) return NextResponse.json({ error: delError.message }, { status: 400 })

    if (sets.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('exercise_instance_set')
        .upsert(sets, { onConflict: 'instance_id,set_no' })
      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('exercise_instance_set')
      .select('id, set_no, reps, weight, weight_unit, notes')
      .eq('instance_id', instanceId)
      .order('set_no', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ sets: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
