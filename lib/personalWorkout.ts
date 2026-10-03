import { NextRequest } from 'next/server'
import { supabaseAdmin, isStaff } from '@/lib/db'

// 教练个人训练记录（personal_workout / personal_workout_exercise）的服务端共用逻辑。
//
// 跟学员的「自我练习」是两套东西：
//   学员练完 → 存 class 表（class_type='self_practice'），跟上课记录排一条时间线
//   教练自己练 → 存这里，与 class 系统完全独立，不进统计、不算课时
// 详见 docs/交接-导航重构与个人训练.md 第四节。
//
// 权限：只有教练/管理员能用，并且只能看/改自己名下的。不存在"教练帮别人记"。
// 角色从数据库查，不信 x-user-role 请求头——这是新表，没必要沿用旧接口的宽松做法。

export const WORKOUT_TYPES = ['strength', 'pilates', 'other'] as const
export type WorkoutType = typeof WORKOUT_TYPES[number]

export const WORKOUT_FIELDS =
  'id, user_id, date, title, type, duration_min, notes, source, created_at, updated_at'
export const EXERCISE_FIELDS =
  'id, workout_id, exercise_id, name, sets, reps, weight, weight_unit, duration_sec, rest_sec, notes, order_num'

/** 校验请求者是教练/管理员。成功返回其 user id。 */
export async function requireStaff(req: NextRequest):
  Promise<{ ok: true; userId: string } | { ok: false; status: number; error: string }> {
  const userId = req.headers.get('x-user-id')
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized' }
  const { data, error } = await supabaseAdmin.from('user').select('role').eq('id', userId).single()
  if (error || !data) return { ok: false, status: 401, error: '账号不存在' }
  if (!isStaff(data.role)) return { ok: false, status: 403, error: '个人训练记录仅对教练开放' }
  return { ok: true, userId }
}

// ── 输入清洗 ─────────────────────────────────────────────────
// 前端数字框是 type="text"，传来的可能是 ''、'12'、12、'12.5'，统一在这里收口。

const intOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}
const textOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s === '' ? null : s
}
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/** 清洗训练主体字段。partial=true 时只处理传了的字段（用于修改）。 */
export function cleanWorkout(body: any, partial: boolean):
  { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
  const row: Record<string, unknown> = {}

  if (!partial || body.date !== undefined) {
    if (!isDate(body.date)) return { ok: false, error: '日期格式不对' }
    row.date = body.date
  }
  if (!partial || body.type !== undefined) {
    const type = body.type ?? 'other'
    if (!WORKOUT_TYPES.includes(type)) return { ok: false, error: '训练类型不对' }
    row.type = type
  }
  if (!partial || body.title !== undefined) row.title = textOrNull(body.title)
  if (!partial || body.duration_min !== undefined) row.duration_min = intOrNull(body.duration_min)
  if (!partial || body.notes !== undefined) row.notes = textOrNull(body.notes)
  if (!partial) row.source = body.source === 'timer' ? 'timer' : 'manual'

  return { ok: true, row }
}

/** 清洗动作明细。没有名字的行直接丢掉（表单里加了空行没填，不算错）。 */
export function cleanExercises(list: unknown): Record<string, unknown>[] {
  if (!Array.isArray(list)) return []
  return list
    .map((e: any) => ({
      exercise_id: isUuid(e?.exercise_id) ? e.exercise_id : null,
      name: textOrNull(e?.name),
      sets: intOrNull(e?.sets),
      reps: intOrNull(e?.reps),
      weight: numOrNull(e?.weight),
      weight_unit: e?.weight_unit === 'lb' ? 'lb' : 'kg',
      duration_sec: intOrNull(e?.duration_sec),
      rest_sec: intOrNull(e?.rest_sec),
      notes: textOrNull(e?.notes),
    }))
    .filter(e => e.name !== null)
    .map((e, i) => ({ ...e, order_num: i + 1 }))
}

/** 读一条训练（含动作明细），并确认属于 userId。 */
export async function loadOwnWorkout(id: string, userId: string) {
  if (!isUuid(id)) return { status: 404 as const, error: 'Not found' }
  const { data, error } = await supabaseAdmin
    .from('personal_workout')
    .select(`${WORKOUT_FIELDS}, exercises:personal_workout_exercise(${EXERCISE_FIELDS})`)
    .eq('id', id)
    .single()
  if (error || !data) return { status: 404 as const, error: 'Not found' }
  if (data.user_id !== userId) return { status: 404 as const, error: 'Not found' } // 不暴露别人记录是否存在
  const exercises = [...((data as any).exercises || [])].sort((a: any, b: any) => a.order_num - b.order_num)
  return { status: 200 as const, data: { ...data, exercises } }
}
