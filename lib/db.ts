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

/** 教练只能管自己的排班，管理员可代任何教练管理。 */
export function canManageTrainer(
  userId: string | null, role: string | null, trainerId: string,
): boolean {
  if (!userId) return false
  if (role === 'ADMIN') return true
  if (role === 'TRAINER') return userId === trainerId
  return false
}
