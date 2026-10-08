import { supabaseAdmin } from '@/lib/db'

// 学员「计费课时」的唯一算法。满课赠送提醒、学员页显示都用这里，不要在前端自己数。
//
// 只算真正上过的课：
//   私教：class.assigned_to = 学员，class_type = 'private'，status = 'completed'
//   团课：通过 class_enrollment 报名，class_type = 'group'，status = 'completed'
// 【不算】自我练习（class_type = 'self_practice'）：那是学员自己练的，不是计费上课。
//   自我练习的 assigned_to 也是学员本人，所以不能只按 assigned_to 数——这正是之前算错的原因
//   （廖一 19 节私教 + 4 节自我练习，被显示成了 23 节）。
//
// 只用 count，不拉列表，不受条数上限影响。
export async function countBillableCompleted(clientId: string) {
  const { count: privateCount } = await supabaseAdmin
    .from('class')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', clientId)
    .eq('status', 'completed')
    .eq('class_type', 'private')

  const { data: enr } = await supabaseAdmin
    .from('class_enrollment').select('class_id').eq('student_id', clientId)
  const enrolledIds = (enr || []).map((e: any) => e.class_id).filter(Boolean)

  let groupCount = 0
  if (enrolledIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('class')
      .select('id', { count: 'exact', head: true })
      .in('id', enrolledIds)
      .eq('status', 'completed')
      .eq('class_type', 'group')
    groupCount = count || 0
  }

  // 自我练习单独数出来，只用于在界面上说明「这几节不计入」
  const { count: selfCount } = await supabaseAdmin
    .from('class')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', clientId)
    .eq('status', 'completed')
    .eq('class_type', 'self_practice')

  return {
    private: privateCount || 0,
    group: groupCount,
    total: (privateCount || 0) + groupCount,
    selfPractice: selfCount || 0,
  }
}
