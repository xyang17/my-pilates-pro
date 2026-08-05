// ============================================================
// L0 服务端工具。只在 API 路由中使用。
// （Next.js App Router 的 route.ts 只允许导出 HTTP 方法处理函数，
//   共用逻辑必须放在这里。）
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { deriveAsm, L0_DERIVED_COLUMNS } from '@/lib/l0'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── 权限模型 ────────────────────────────────────────────────
//
// 会员是自己数据的第一责任人：本人对自己的档案与测量记录有完整读写权。
// 教练 / 管理员的定位是「必要时代为填写」，可代任何会员操作。
// 谁录的记在 l0_body_metric.recorded_by，界面上会区分「本人录入 / 代录」。
//
// 例外：知情同意只能由会员本人勾选。代勾的同意在证据上站不住。

/** 本人写自己的 → 放行；教练/管理员 → 放行（代填）；会员写别人的 → 拒绝。 */
export function canWriteClientData(
  userId: string | null, role: string | null, clientId: string,
): boolean {
  if (!userId) return false
  if (role === 'CLIENT') return userId === clientId
  return true
}

/** 取某条测量记录归属的会员 id，用于校验。记录不存在返回 null。 */
export async function getMetricOwner(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('l0_body_metric').select('client_id').eq('id', id).maybeSingle()
  return data?.client_id ?? null
}

/** 可写入的原始列。派生列由 Postgres GENERATED 自动计算，不可写。 */
export const L0_WRITABLE_COLUMNS = [
  'measured_at', 'measured_time', 'test_tier', 'device_type', 'device_model',
  'measurement_context',
  'height_cm', 'weight_kg', 'body_fat_pct', 'smm_kg', 'asm_kg', 'asm_source',
  'protein_kg', 'mineral_kg', 'tbw_l', 'ecw_tbw_ratio',
  'visceral_fat_area', 'visceral_fat_level', 'bmr_device',
  'waist_cm', 'hip_cm', 'waist_landmark', 'whr_device',
  'bp_systolic', 'bp_diastolic', 'hr_max_measured',
  'seg_lean_arm_l', 'seg_lean_arm_r', 'seg_lean_trunk', 'seg_lean_leg_l', 'seg_lean_leg_r',
  'seg_fat_arm_l', 'seg_fat_arm_r', 'seg_fat_trunk', 'seg_fat_leg_l', 'seg_fat_leg_r',
  'device_score', 'notes', 'photo_urls',
] as const

export function sanitizeL0Payload(body: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const k of L0_WRITABLE_COLUMNS) {
    if (!(k in body)) continue
    const v = body[k]
    out[k] = v === '' || v === undefined ? null : v
  }
  // 显式剔除派生列，避免误传导致 Postgres 报错
  for (const c of L0_DERIVED_COLUMNS) delete out[c]

  // 四肢骨骼肌量：优先用手工/设备值，否则由四肢节段瘦组织求和
  const { asm_kg, asm_source } = deriveAsm(out)
  out.asm_kg = asm_kg
  out.asm_source = out.asm_source ?? asm_source
  return out
}

/**
 * 身高按年更新，体重按周更新 —— 只称重的记录不会带身高，
 * 而 BMI / SMI / FFMI / 腰高比全都要用身高做分母。
 * 因此缺身高时从该会员最近一次有身高的记录继承。
 */
export async function inheritHeight(clientId: string, payload: Record<string, any>) {
  if (payload.height_cm != null) return
  const { data } = await supabaseAdmin
    .from('l0_body_metric')
    .select('height_cm')
    .eq('client_id', clientId)
    .not('height_cm', 'is', null)
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (data?.height_cm != null) payload.height_cm = data.height_cm
}
