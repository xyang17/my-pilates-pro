// 满课赠送规则：全店默认 + 每个学员可以单独设。
//
//   全店默认：studio_setting 里的 loyalty_bonus_enabled / loyalty_bonus_threshold / loyalty_bonus_sessions
//            （「我的 → 经营设置」里改；都没设时才用 DEFAULT_THRESHOLD / DEFAULT_BONUS 兜底）
//   学员单独：user.loyalty_mode
//     null / 'default' → 跟随全店默认
//     'custom'         → 用 user.loyalty_threshold / user.loyalty_bonus（比如这个学员每满 10 送 1）
//     'off'            → 不参加累计满赠（比如已经是「买包送节」的学员，不再叠加）
//
// 「买 N 送 M」是另一回事：写在课时包的 bonus_sessions 上，建包时就定了，不走这里。
//
// 所有用到规则的地方（满赠提醒、学员卡片、一键赠课）都必须走 resolveLoyaltyRule，不要自己读设置。

export const DEFAULT_THRESHOLD = 20
export const DEFAULT_BONUS = 1

export type LoyaltySource = 'default' | 'custom' | 'off'

export interface LoyaltyRule {
  enabled: boolean
  threshold: number
  bonus: number
  source: LoyaltySource
}

const posInt = (v: unknown): number | null => {
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 全店默认规则（从 studio_setting 的 key/value 表来） */
export function studioDefaultRule(cfg: Record<string, string>): Omit<LoyaltyRule, 'source'> {
  return {
    enabled: (cfg.loyalty_bonus_enabled ?? 'true') === 'true',
    threshold: posInt(cfg.loyalty_bonus_threshold) ?? DEFAULT_THRESHOLD,
    bonus: posInt(cfg.loyalty_bonus_sessions) ?? DEFAULT_BONUS,
  }
}

/** 这个学员实际适用的规则 */
export function resolveLoyaltyRule(
  cfg: Record<string, string>,
  user: { loyalty_mode?: string | null; loyalty_threshold?: number | null; loyalty_bonus?: number | null } | null | undefined,
): LoyaltyRule {
  const d = studioDefaultRule(cfg)
  const mode = user?.loyalty_mode
  if (mode === 'off') return { ...d, enabled: false, source: 'off' }
  if (mode === 'custom') {
    const threshold = posInt(user?.loyalty_threshold)
    const bonus = posInt(user?.loyalty_bonus)
    // 单独设了但数没填全，就退回默认数值——但仍然开启（单独设本身就表示要参加）
    return { enabled: true, threshold: threshold ?? d.threshold, bonus: bonus ?? d.bonus, source: 'custom' }
  }
  return { ...d, source: 'default' }
}
