import { createClient } from '@supabase/supabase-js'

/**
 * 服务端 Supabase 客户端（service role）。
 * 只能在 API 路由里用，绝不可引入客户端组件 —— key 会泄露。
 * 它绕过 RLS，所以每个路由必须自己做角色校验。
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Role = 'ADMIN' | 'TRAINER' | 'CLIENT' | string

export const isStaff = (role: string | null) => role === 'ADMIN' || role === 'TRAINER'

// ─── 价格的两端 ──────────────────────────────────────────────
//
// 系统里有两种「价格」，语义完全不同，不可混为一谈：
//
//   1) 经营数据 —— 门店营收、成本、教练分成。【客户端永不可见】
//      代表字段：class.price
//      注意它并不是「学员该付多少」，而是「这节课带来多少营收」——
//      统计页的「总收入」「收入贡献排名」用的就是它。
//
//   2) 商品售价 —— 会员卡价格、体验课价格、订单金额。【客户端必须可见】
//      代表字段：membership_plan.price（做会员卡时启用）、payment.amount（只看自己的）
//      客户要买卡，当然得看到价格。
//
// 两者分属不同的表，天然隔离。出问题的是第 1 类字段被原样返回给了客户端。
//
// 这里用【白名单】而不是黑名单：明确列出客户能看到什么，没列的一律不返回。
// 黑名单的问题是——将来往 class 表加 cost、教练分成之类的字段时，
// 黑名单不会自动挡住，又会漏一次。

/** 会员可以看到的课程字段。新增字段默认不可见，需要显式加进来。 */
const CLIENT_VISIBLE_CLASS_FIELDS = [
  'id', 'name', 'date', 'start_time', 'duration',
  'type', 'discipline', 'class_type', 'level', 'description',
  'notes',            // 课程备注，教练确认过可以给学员看
  'status', 'post_summary', 'completed_at',
  'color', 'cover_image_url',
  'max_capacity', 'capacity',
  'trainer_id', 'assigned_to', 'created_by',
  'created_at', 'updated_at',
  'exercises',        // 关联查出来的动作列表
] as const

/**
 * 按角色投影课程数据。教练与管理员原样返回；会员只拿到白名单里的字段。
 *
 * 必须在服务端做 —— 只在界面上隐藏没有用，
 * 会员打开浏览器开发者工具就能从接口响应里看到原始数据。
 */
export function projectClassForRole<T extends Record<string, any>>(
  row: T, role: string | null,
): Partial<T> {
  if (isStaff(role)) return row
  const out: Record<string, any> = {}
  for (const f of CLIENT_VISIBLE_CLASS_FIELDS) {
    if (f in row) out[f] = row[f]
  }
  return out as Partial<T>
}

export const projectClassListForRole = <T extends Record<string, any>>(
  rows: T[], role: string | null,
) => rows.map(r => projectClassForRole(r, role))

/** 教练只能管自己的排班，管理员可代任何教练管理。 */
export function canManageTrainer(
  userId: string | null, role: string | null, trainerId: string,
): boolean {
  if (!userId) return false
  if (role === 'ADMIN') return true
  if (role === 'TRAINER') return userId === trainerId
  return false
}
