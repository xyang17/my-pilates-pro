import { supabaseAdmin } from '@/lib/db'
import { studioToday } from '@/lib/time'

// 学员卡片上要显示的摘要（学员列表、学员详情页顶部共用）。
// 一次批量算一批学员，避免列表页每个学员发一串请求。
//
// 计数口径跟 lib/classCounts.ts 一致：
//   计费课时 = 私教(assigned_to) + 报名的团课(class_enrollment)，status=completed
//   自我练习【不算】计费课时，只单独显示
//
// 满赠「待发」的算法：应得赠课次数 = floor(累计 / 每满N节)，已发 = 来源为 loyalty 的课时包个数，
// 待发 = 应得 - 已发。比「正好踩在 20 的倍数上才提醒」稳：错过了那一刻也不会漏。

export interface ClientSummary {
  billable_completed: number
  self_practice_completed: number
  last_class_date: string | null       // 最近一次上完的计费课
  last_self_practice_date: string | null
  next_class: { date: string; start_time: string | null } | null
  payment: {
    mode: 'package' | 'per_session'
    remaining: number                  // 所有有效包剩余节数之和
    granted: number                    // 有效包总节数（含赠送）
    used: number
    nearest_expiry: string | null      // 有效包里最近的到期日
  }
  loyalty: {
    enabled: boolean
    threshold: number
    bonus: number
    base: number                       // 教练认的系统外历史节数
    total: number                      // base + 计费课时
    to_next: number                    // 再上几节到下一次赠课
    pending: number                    // 已达标但还没发的赠课次数
  }
  alerts: { kind: 'bonus_due' | 'package_low' | 'package_empty' | 'package_expiring' | 'inactive'; text: string }[]
}

const LOW_REMAINING = 2          // 剩这么多节就提醒续费
const EXPIRING_DAYS = 14         // 这么多天内到期就提醒
const INACTIVE_DAYS = 30         // 这么多天没上课、也没排课就提醒

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86400000)

export async function summarizeClients(clientIds: string[]): Promise<Record<string, ClientSummary>> {
  const out: Record<string, ClientSummary> = {}
  if (clientIds.length === 0) return out
  const today = studioToday()

  // ── 一次性批量查 ─────────────────────────────────────────
  const [usersRes, ownClassesRes, enrRes, pkgRes, loyaltyPkgRes, settingsRes] = await Promise.all([
    supabaseAdmin.from('user').select('id, loyalty_base_count').in('id', clientIds),
    supabaseAdmin.from('class')
      .select('assigned_to, date, start_time, status, class_type')
      .in('assigned_to', clientIds)
      .in('class_type', ['private', 'self_practice'])
      .limit(20000),
    supabaseAdmin.from('class_enrollment').select('class_id, student_id').in('student_id', clientIds).limit(20000),
    supabaseAdmin.from('package_balance')
      .select('client_id, status, is_expired, is_used_up, remaining_sessions, granted_sessions, used_sessions, expires_at')
      .in('client_id', clientIds),
    supabaseAdmin.from('session_package').select('client_id').eq('source', 'loyalty').in('client_id', clientIds),
    supabaseAdmin.from('studio_setting').select('key, value'),
  ])

  const cfg: Record<string, string> = {}
  ;(settingsRes.data || []).forEach((r: any) => { cfg[r.key] = String(r.value) })
  const enabled = (cfg.loyalty_bonus_enabled ?? 'true') === 'true'
  const threshold = Math.max(1, parseInt(cfg.loyalty_bonus_threshold ?? '20', 10) || 20)
  const bonus = Math.max(1, parseInt(cfg.loyalty_bonus_sessions ?? '1', 10) || 1)

  // 团课：报名表 → 课
  const enr = (enrRes.data || []) as { class_id: string; student_id: string }[]
  const groupIds = Array.from(new Set(enr.map(e => e.class_id)))
  const groupById: Record<string, { date: string; start_time: string | null; status: string }> = {}
  if (groupIds.length) {
    const { data: g } = await supabaseAdmin.from('class')
      .select('id, date, start_time, status')
      .in('id', groupIds).eq('class_type', 'group').limit(20000)
    ;(g || []).forEach((c: any) => { groupById[c.id] = c })
  }

  type Row = { date: string; start_time: string | null; status: string; billable: boolean }
  const rowsBy: Record<string, Row[]> = {}
  for (const id of clientIds) rowsBy[id] = []
  ;(ownClassesRes.data || []).forEach((c: any) => {
    rowsBy[c.assigned_to]?.push({ date: c.date, start_time: c.start_time, status: c.status, billable: c.class_type === 'private' })
  })
  enr.forEach(e => {
    const c = groupById[e.class_id]
    if (c) rowsBy[e.student_id]?.push({ ...c, billable: true })
  })

  const baseBy: Record<string, number> = {}
  ;(usersRes.data || []).forEach((u: any) => { baseBy[u.id] = Number(u.loyalty_base_count) || 0 })

  const issuedBy: Record<string, number> = {}
  ;(loyaltyPkgRes.data || []).forEach((p: any) => { issuedBy[p.client_id] = (issuedBy[p.client_id] || 0) + 1 })

  const pkgsBy: Record<string, any[]> = {}
  ;(pkgRes.data || []).forEach((p: any) => { (pkgsBy[p.client_id] ||= []).push(p) })

  for (const id of clientIds) {
    const rows = rowsBy[id] || []
    const billableDone = rows.filter(r => r.billable && r.status === 'completed')
    const selfDone = rows.filter(r => !r.billable && r.status === 'completed')
    const lastOf = (rs: Row[]) => rs.reduce<string | null>((m, r) => (!m || r.date > m ? r.date : m), null)
    const upcoming = rows
      .filter(r => r.billable && r.status !== 'completed' && r.status !== 'cancelled' && r.date >= today)
      .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')))

    // 课时包：只看还能用的（有效、没过期、没用完）
    const allPkgs = pkgsBy[id] || []
    const usable = allPkgs.filter(p => p.status === 'active' && !p.is_expired && !p.is_used_up)
    const hadPackage = allPkgs.some(p => p.status === 'active')
    const remaining = usable.reduce((s, p) => s + Number(p.remaining_sessions || 0), 0)
    const granted = usable.reduce((s, p) => s + Number(p.granted_sessions || 0), 0)
    const used = usable.reduce((s, p) => s + Number(p.used_sessions || 0), 0)
    const expiries = usable.map(p => p.expires_at).filter(Boolean).sort() as string[]

    const base = baseBy[id] || 0
    const total = base + billableDone.length
    const earned = Math.floor(total / threshold)
    const pending = enabled ? Math.max(0, earned - (issuedBy[id] || 0)) : 0
    const toNext = threshold - (total % threshold)

    const last = lastOf(billableDone)
    const alerts: ClientSummary['alerts'] = []
    if (pending > 0) alerts.push({ kind: 'bonus_due', text: `有 ${pending * bonus} 节赠课待发` })
    if (usable.length > 0 && remaining <= LOW_REMAINING) alerts.push({ kind: 'package_low', text: `课时包只剩 ${remaining} 节` })
    if (usable.length === 0 && hadPackage) alerts.push({ kind: 'package_empty', text: '课时包已用完' })
    if (expiries[0] && daysBetween(today, expiries[0]) <= EXPIRING_DAYS) {
      const d = daysBetween(today, expiries[0])
      alerts.push({ kind: 'package_expiring', text: d <= 0 ? '课时包今天到期' : `课时包 ${d} 天后到期` })
    }
    if (upcoming.length === 0 && last && daysBetween(last, today) > INACTIVE_DAYS) {
      alerts.push({ kind: 'inactive', text: `${daysBetween(last, today)} 天没来上课了` })
    }

    out[id] = {
      billable_completed: billableDone.length,
      self_practice_completed: selfDone.length,
      last_class_date: last,
      last_self_practice_date: lastOf(selfDone),
      next_class: upcoming[0] ? { date: upcoming[0].date, start_time: upcoming[0].start_time } : null,
      payment: {
        mode: usable.length > 0 ? 'package' : 'per_session',
        remaining, granted, used,
        nearest_expiry: expiries[0] || null,
      },
      loyalty: { enabled, threshold, bonus, base, total, to_next: toNext, pending },
      alerts,
    }
  }
  return out
}
