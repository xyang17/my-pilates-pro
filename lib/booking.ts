// ============================================================
// 约课核心逻辑
//
// 会员看到的可约空档 =
//   每周固定时段 − 临时停排 + 临时加开 − 已被约走的 − 教练已排的课
//   再按规则裁掉：太远的、太近的
//
// 这里只放纯函数，方便单独验证。规则值一律从 booking_rule 读，不写死。
// ============================================================

/** 单门店应用，时间一律按门店本地时区解释。多门店跨时区时这里要改。 */
export const STUDIO_UTC_OFFSET = '+08:00'

export interface WeeklyRule {
  id: string
  weekday: number          // 0=周日
  start_time: string       // 'HH:mm:ss'
  end_time: string
  slot_minutes: number
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
}

export interface AvailabilityException {
  id: string
  date: string             // 'YYYY-MM-DD'
  kind: 'OFF' | 'EXTRA'
  start_time: string | null
  end_time: string | null
}

/** 已占用的时间段（已被约走的私教、教练要带的课） */
export interface BusyInterval {
  date: string
  start_time: string
  end_time: string
}

export interface OpenSlot {
  date: string
  start_time: string       // 'HH:mm'
  end_time: string
  starts_at: string        // 带时区的 ISO，写库用
  ends_at: string
}

// ─── 时间小工具（'HH:mm' 零填充后可直接字典序比较）────────────

export const hm = (t: string) => t.slice(0, 5)

export const toMinutes = (t: string) => {
  const [h, m] = hm(t).split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/** 门店时区相对 UTC 的分钟偏移 */
export const STUDIO_OFFSET_MINUTES =
  (STUDIO_UTC_OFFSET.startsWith('-') ? -1 : 1) *
  (Number(STUDIO_UTC_OFFSET.slice(1, 3)) * 60 + Number(STUDIO_UTC_OFFSET.slice(4, 6)))

/** 'YYYY-MM-DD' + 'HH:mm' → 带门店时区偏移的 ISO 字符串 */
export const toStudioISO = (date: string, time: string) =>
  `${date}T${hm(time)}:00${STUDIO_UTC_OFFSET}`

/** 某个瞬间在门店当地是哪一天 */
export const studioDateOf = (d: Date) =>
  new Date(d.getTime() + STUDIO_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10)

/**
 * 日历日期加减。
 * 必须按 UTC 零点解析 —— 若带上 +08:00 偏移，'2026-08-12T00:00+08:00'
 * 实际是 UTC 的 08-11T16:00，加一天后取日期仍是 08-12，会导致死循环。
 */
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 该日期是星期几（0=周日） */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && aE > bS

const withinEffective = (r: WeeklyRule, date: string) =>
  (!r.effective_from || date >= r.effective_from) &&
  (!r.effective_to || date <= r.effective_to)

// ─── 空档展开 ────────────────────────────────────────────────

export interface ExpandInput {
  rules: WeeklyRule[]
  exceptions: AvailabilityException[]
  busy: BusyInterval[]
  from: string              // 起始日期（含）
  to: string                // 结束日期（含）
  /** booking_rule.book_open_days —— 最多提前几天可约 */
  openDays: number
  /** booking_rule.book_cutoff_minutes —— 开始前多久截止 */
  cutoffMinutes: number
  /** 当前时间，便于测试注入 */
  now?: Date
}

export function expandOpenSlots(input: ExpandInput): OpenSlot[] {
  const { rules, exceptions, busy, from, to, openDays, cutoffMinutes } = input
  const now = input.now ?? new Date()
  const out: OpenSlot[] = []

  // 超出「最多提前几天」的日期直接不展开
  const lastBookable = addDays(studioDateOf(now), openDays)
  const cutoffMs = now.getTime() + cutoffMinutes * 60_000

  // guard：日期推进若因故停滞，最多循环一年就退出，避免死循环
  let guard = 0
  for (let date = from; date <= to && guard < 400; date = addDays(date, 1), guard++) {
    if (date > lastBookable) break

    const dayExc = exceptions.filter(e => e.date === date)
    // 整天停排：有 OFF 且未指定时间
    if (dayExc.some(e => e.kind === 'OFF' && !e.start_time)) continue

    const offRanges = dayExc
      .filter(e => e.kind === 'OFF' && e.start_time && e.end_time)
      .map(e => [toMinutes(e.start_time!), toMinutes(e.end_time!)] as const)

    const wd = weekdayOf(date)
    const intervals: { start: number; end: number; slot: number }[] = []

    for (const r of rules) {
      if (!r.is_active || r.weekday !== wd || !withinEffective(r, date)) continue
      intervals.push({
        start: toMinutes(r.start_time),
        end: toMinutes(r.end_time),
        slot: r.slot_minutes || 60,
      })
    }
    // 临时加开
    for (const e of dayExc) {
      if (e.kind === 'EXTRA' && e.start_time && e.end_time) {
        intervals.push({ start: toMinutes(e.start_time), end: toMinutes(e.end_time), slot: 60 })
      }
    }
    if (!intervals.length) continue

    const dayBusy = busy
      .filter(b => b.date === date)
      .map(b => [toMinutes(b.start_time), toMinutes(b.end_time)] as const)

    for (const iv of intervals) {
      for (let s = iv.start; s + iv.slot <= iv.end; s += iv.slot) {
        const e = s + iv.slot
        if (offRanges.some(([os, oe]) => overlaps(s, e, os, oe))) continue
        if (dayBusy.some(([bs, be]) => overlaps(s, e, bs, be))) continue

        const startISO = toStudioISO(date, fromMinutes(s))
        if (new Date(startISO).getTime() < cutoffMs) continue   // 太近，已过预约截止

        out.push({
          date,
          start_time: fromMinutes(s),
          end_time: fromMinutes(e),
          starts_at: startISO,
          ends_at: toStudioISO(date, fromMinutes(e)),
        })
      }
    }
  }

  // 同一时段可能被多条规则覆盖，去重
  const seen = new Set<string>()
  return out
    .filter(s => {
      const k = `${s.date} ${s.start_time}`
      if (seen.has(k)) return false
      seen.add(k); return true
    })
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
}

// ─── 取消规则判定 ────────────────────────────────────────────

export interface CancelRule {
  cancel_window_hours: number
  free_cancel_limit: number | null
  limit_period: 'WEEK' | 'MONTH'
  late_cancel_deducts: boolean
}

export interface CancelVerdict {
  /** 是否算超时取消 */
  isLate: boolean
  /** 是否超出周期内的免费取消次数 */
  overLimit: boolean
  /** 综合判断：本次取消是否要扣次 */
  deducts: boolean
  message: string
}

/**
 * 判定一次取消的后果。
 * 注意：超时取消若不扣次，规则就没有约束力，爽约率反而更高 ——
 * 所以 late_cancel_deducts 默认为 true，但仍由门店配置决定。
 */
export function judgeCancel(
  startsAt: string,
  rule: CancelRule,
  freeCancelsUsed: number,
  now: Date = new Date(),
): CancelVerdict {
  const hoursLeft = (new Date(startsAt).getTime() - now.getTime()) / 3_600_000
  const isLate = hoursLeft < rule.cancel_window_hours
  const overLimit =
    rule.free_cancel_limit != null && freeCancelsUsed >= rule.free_cancel_limit

  const periodLabel = rule.limit_period === 'WEEK' ? '本周' : '本月'

  if (isLate) {
    return {
      isLate, overLimit,
      deducts: rule.late_cancel_deducts,
      message: rule.late_cancel_deducts
        ? `距离上课不足 ${rule.cancel_window_hours} 小时，属于超时取消，本次将扣除课时。`
        : `距离上课不足 ${rule.cancel_window_hours} 小时，属于超时取消。`,
    }
  }
  if (overLimit) {
    return {
      isLate, overLimit, deducts: rule.late_cancel_deducts,
      message: `${periodLabel}免费取消次数已用完（上限 ${rule.free_cancel_limit} 次）`
        + (rule.late_cancel_deducts ? '，本次将扣除课时。' : '。'),
    }
  }
  return {
    isLate: false, overLimit: false, deducts: false,
    message: '可免费取消。',
  }
}

/** 周期起始日，用于统计周期内已用的免费取消次数 */
export function periodStart(period: 'WEEK' | 'MONTH', now: Date = new Date()): string {
  const d = new Date(now)
  if (period === 'MONTH') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))   // 本周一
  return d.toISOString().slice(0, 10)
}
