import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

// PATCH /api/classes/[id]/price —— 统计页明细里直接改一节课的价格（class.price）
// body: { price: number | null }
//
// 权限：课程创建者本人，或管理员（管理员看全店统计时要能直接修正别的教练填错的价格）。
// 有「查看全店统计」权限的教练只能看，不能改别人的课。
// 角色从数据库查，不信请求头。
//
// class.price 是经营数据（这节课带来多少营收），学员端永远看不到，见 lib/db.ts 顶部说明。
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabaseAdmin.from('user').select('role').eq('id', userId).single()
    const role = me?.role
    if (role !== 'ADMIN' && role !== 'TRAINER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    let price: number | null
    if (body.price === null || body.price === '' || body.price === undefined) {
      price = null
    } else {
      const n = Number(body.price)
      if (!Number.isFinite(n) || n < 0 || n > 100000) {
        return NextResponse.json({ error: '价格不对，请输入 0 到 100000 之间的数字' }, { status: 400 })
      }
      price = Math.round(n * 100) / 100
    }

    const { data: cls } = await supabaseAdmin
      .from('class').select('id, created_by, class_type').eq('id', id).maybeSingle()
    if (!cls) return NextResponse.json({ error: '课程不存在' }, { status: 404 })
    if (cls.class_type === 'self_practice') return NextResponse.json({ error: '自我练习没有价格' }, { status: 400 })
    if (role !== 'ADMIN' && cls.created_by !== userId) {
      return NextResponse.json({ error: '只能改自己的课程价格' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('class')
      .update({ price, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, price')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
