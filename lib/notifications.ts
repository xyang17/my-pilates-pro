import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 站内消息的生成逻辑。两种来源的触发方式不一样：
//   自我练习  —— 学员一练完就有事件，当场插一条（实时）
//   生理期预测 —— 没有事件可触发，教练打开消息页时现算现生成（按需）
// 按需生成的好处是不依赖定时任务；靠 dedupe_key 的唯一索引防止重复插入。

/** 谁是这个学员的教练：一起上过课就算。系统里没有单独的师生关系表，用课程反推。 */
export async function trainersOfClient(clientId: string): Promise<string[]> {
  const { data: assigned } = await supabaseAdmin
    .from('class')
    .select('created_by')
    .eq('assigned_to', clientId)

  const { data: enrolled } = await supabaseAdmin
    .from('class_enrollment')
    .select('class_id')
    .eq('student_id', clientId)

  let groupCreators: string[] = []
  const classIds = (enrolled || []).map(e => e.class_id).filter(Boolean)
  if (classIds.length > 0) {
    const { data: cls } = await supabaseAdmin
      .from('class').select('created_by').in('id', classIds)
    groupCreators = (cls || []).map(c => c.created_by).filter(Boolean)
  }

  const ids = [...new Set([
    ...(assigned || []).map(c => c.created_by).filter(Boolean),
    ...groupCreators,
  ])] as string[]

  if (ids.length === 0) return []

  // 只给教练/管理员发，并且不给学员自己发（教练自己练完不用提醒自己）
  const { data: staff } = await supabaseAdmin
    .from('user').select('id, role').in('id', ids)

  return (staff || [])
    .filter(u => (u.role === 'TRAINER' || u.role === 'ADMIN') && u.id !== clientId)
    .map(u => u.id)
}

// ─── 消息类型登记表 ────────────────────────────────────────
//
// 每种消息在这里声明它该发给谁：trainer（教练/管理员）还是 client（学员）。
// pushNotification 会照着这张表校验收件人的角色，对不上就拒发并打日志。
//
// 这样「教练的消息」和「学员的消息」是代码层面隔开的，不靠写的时候记得——
// 以后新增触发点时接错收件人会当场被挡下，而不是悄悄发到错的人那里。
export type NoticeAudience = 'trainer' | 'client'

export const NOTICE_TYPES: Record<string, { audience: NoticeAudience; label: string }> = {
  // → 教练
  self_practice:     { audience: 'trainer', label: '学员自主练习' },
  period_forecast:   { audience: 'trainer', label: '生理期预测' },
  loyalty_bonus:     { audience: 'trainer', label: '满课赠送' },
  // → 学员
  homework_assigned: { audience: 'client',  label: '新作业' },
  class_scheduled:   { audience: 'client',  label: '新课程' },
  class_updated:     { audience: 'client',  label: '课程变更' },
}

const roleMatchesAudience = (role: string | null | undefined, audience: NoticeAudience) =>
  audience === 'trainer'
    ? role === 'TRAINER' || role === 'ADMIN'
    : role === 'CLIENT'

/**
 * 插一条消息。
 * - 收件人角色跟消息类型对不上就拒发（防止教练消息发给学员、或者反过来）
 * - dedupe_key 撞车（唯一索引）属于预期情况，静默跳过
 */
export async function pushNotification(row: {
  user_id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  related_user_id?: string | null
  dedupe_key?: string | null
}) {
  const spec = NOTICE_TYPES[row.type]
  if (!spec) {
    console.error(`[notification] 未登记的消息类型: ${row.type}`)
    return
  }

  const { data: recipient } = await supabaseAdmin
    .from('user').select('role').eq('id', row.user_id).single()

  if (!recipient) {
    console.error('[notification] 收件人不存在:', row.user_id)
    return
  }
  if (!roleMatchesAudience(recipient.role, spec.audience)) {
    console.error(
      `[notification] 收件人角色不符，已拒发：type=${row.type}` +
      `（应发给 ${spec.audience}），实际收件人 role=${recipient.role}`
    )
    return
  }

  const { error } = await supabaseAdmin.from('notification').insert([row])
  // 23505 = 唯一约束冲突，说明这条已经发过了，属于预期情况
  if (error && error.code !== '23505') {
    console.error('[notification] insert failed:', error.message)
  }
}

/** 给学员发消息的便捷入口，顺带把「收件人必须是学员」这件事写在名字里 */
export async function notifyClient(opts: {
  clientId: string
  type: 'homework_assigned' | 'class_scheduled' | 'class_updated'
  title: string
  body?: string | null
  link?: string | null
  fromTrainerId?: string | null
  dedupeKey?: string | null
}) {
  await pushNotification({
    user_id: opts.clientId,
    type: opts.type,
    title: opts.title,
    body: opts.body ?? null,
    link: opts.link ?? null,
    related_user_id: opts.fromTrainerId ?? null,
    dedupe_key: opts.dedupeKey ?? null,
  })
}

// ─── 生理期预测 ──────────────────────────────────────────────
//
// 用已记录的经期开始日推算下一次。两条以上记录就用这个人自己的平均周期，
// 只有一条就按 28 天默认值估——这种情况消息里会标明「按默认周期估算」，
// 免得把一个猜测当成准确结论来用。

const DEFAULT_CYCLE_DAYS = 28
/** 人的周期长度合理区间，算出离谱的值就退回默认，避免记错一次把预测带偏 */
const MIN_CYCLE_DAYS = 21
const MAX_CYCLE_DAYS = 40
/** 提前几天提醒 */
export const FORECAST_LEAD_DAYS = 7

export interface CycleForecast {
  nextStart: Date
  cycleDays: number
  estimated: boolean   // true = 数据不足，按默认周期估的
}

export function forecastNextPeriod(startDates: string[]): CycleForecast | null {
  const sorted = [...startDates]
    .map(d => new Date(d + 'T12:00:00'))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (sorted.length === 0) return null
  const last = sorted[sorted.length - 1]

  let cycleDays = DEFAULT_CYCLE_DAYS
  let estimated = true

  if (sorted.length >= 2) {
    // 只看最近几次的间隔，早期的记录参考价值低
    const recent = sorted.slice(-7)
    const gaps: number[] = []
    for (let i = 1; i < recent.length; i++) {
      gaps.push(Math.round((recent[i].getTime() - recent[i - 1].getTime()) / 86400000))
    }
    const usable = gaps.filter(g => g >= MIN_CYCLE_DAYS && g <= MAX_CYCLE_DAYS)
    if (usable.length > 0) {
      cycleDays = Math.round(usable.reduce((a, b) => a + b, 0) / usable.length)
      estimated = false
    }
  }

  const nextStart = new Date(last)
  nextStart.setDate(nextStart.getDate() + cycleDays)
  return { nextStart, cycleDays, estimated }
}

const fmtDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
const toDateStr = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 给这个教练名下的女性学员算一遍预测，快到了就生成提醒。
 * 教练每次打开消息页都会跑，重复的靠 dedupe_key 挡住。
 */
export async function generatePeriodForecasts(trainerId: string) {
  // 这个教练带过的所有学员
  const { data: assignedCls } = await supabaseAdmin
    .from('class').select('assigned_to').eq('created_by', trainerId).not('assigned_to', 'is', null)

  const { data: ownCls } = await supabaseAdmin
    .from('class').select('id').eq('created_by', trainerId)
  const ownClassIds = (ownCls || []).map(c => c.id)

  let enrolledIds: string[] = []
  if (ownClassIds.length > 0) {
    const { data: enr } = await supabaseAdmin
      .from('class_enrollment').select('student_id').in('class_id', ownClassIds)
    enrolledIds = (enr || []).map(e => e.student_id).filter(Boolean)
  }

  const clientIds = [...new Set([
    ...(assignedCls || []).map(c => c.assigned_to).filter(Boolean),
    ...enrolledIds,
  ])].filter(id => id !== trainerId) as string[]

  if (clientIds.length === 0) return

  // 只看女性账号——非女性账号本来也不会有周期记录
  const { data: females } = await supabaseAdmin
    .from('user').select('id, name, email').in('id', clientIds).eq('sex', 'FEMALE')

  if (!females || females.length === 0) return

  const { data: logs } = await supabaseAdmin
    .from('menstrual_cycle_log')
    .select('user_id, start_date')
    .in('user_id', females.map(f => f.id))
    .order('start_date', { ascending: true })

  const byUser: Record<string, string[]> = {}
  ;(logs || []).forEach(l => {
    if (!byUser[l.user_id]) byUser[l.user_id] = []
    byUser[l.user_id].push(l.start_date)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const f of females) {
    const dates = byUser[f.id]
    if (!dates || dates.length === 0) continue

    const fc = forecastNextPeriod(dates)
    if (!fc) continue

    const daysAway = Math.round((fc.nextStart.getTime() - today.getTime()) / 86400000)
    // 只在「还有 0~7 天」这个窗口内提醒；已经过去的不再提
    if (daysAway < 0 || daysAway > FORECAST_LEAD_DAYS) continue

    const who = f.name || f.email || '学员'
    const when = daysAway === 0 ? '预计今天' : `预计 ${daysAway} 天后（${fmtDate(fc.nextStart)}）`

    await pushNotification({
      user_id: trainerId,
      type: 'period_forecast',
      title: `${who} ${when}进入生理期`,
      body: fc.estimated
        ? '只有一次记录，按默认 28 天周期估算，仅供参考。排课强度可以先留意一下。'
        : `根据她自己的记录，平均周期约 ${fc.cycleDays} 天。排课强度可以先留意一下。`,
      link: `/dashboard/clients/${f.id}`,
      related_user_id: f.id,
      // 同一个人、同一个预测日期只提醒一次
      dedupe_key: `period:${f.id}:${toDateStr(fc.nextStart)}`,
    })
  }
}


// ─── 满课赠送 ──────────────────────────────────────────────
//
// 规则由教练在「我的 → 经营设置」里定：每满 N 节赠 M 节，可关闭。
// 按学员**累计完成**的课数算，跨课时包累加（私教 + 已报名的团课，自我练习不算）。
//
// 只提醒、不自动发放——赠课是钱，该由教练点头。
// 同一个里程碑只提醒一次，靠 dedupe_key（20 节一条、40 节一条）。
export async function checkLoyaltyBonus(clientId: string) {
  const { data: rows } = await supabaseAdmin
    .from('studio_setting').select('key, value')
  const cfg: Record<string, string> = {}
  ;(rows || []).forEach((r: any) => { cfg[r.key] = String(r.value) })

  if ((cfg.loyalty_bonus_enabled ?? 'true') !== 'true') return

  const threshold = parseInt(cfg.loyalty_bonus_threshold ?? '20', 10)
  const bonus = parseInt(cfg.loyalty_bonus_sessions ?? '1', 10)
  if (!Number.isFinite(threshold) || threshold <= 0) return
  if (!Number.isFinite(bonus) || bonus <= 0) return

  // 私教：直接指派给这个学员的
  const { count: privateCount } = await supabaseAdmin
    .from('class')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', clientId)
    .eq('status', 'completed')
    .neq('class_type', 'self_practice')

  // 团课：通过报名表找。限定 class_type='group'，避免跟上面重复计数
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

  // 老学员在用这个系统之前上过的课，由教练手工认一个起始节数。
  // 字段可能还没加（迁移 SQL 要手动跑），读不到就按 0 处理，不影响其余逻辑。
  let base = 0
  try {
    const { data: u, error } = await supabaseAdmin
      .from('user').select('loyalty_base_count').eq('id', clientId).single()
    if (!error && u) base = Number((u as any).loyalty_base_count) || 0
  } catch { /* 列还没加，按 0 算 */ }

  const total = base + (privateCount || 0) + groupCount
  if (total < threshold) return

  // 落在哪个里程碑上（20/40/60…）。没到整数倍就不提醒
  const milestone = Math.floor(total / threshold) * threshold
  if (total !== milestone) return

  const { data: who } = await supabaseAdmin
    .from('user').select('name, email').eq('id', clientId).single()
  const name = who?.name || who?.email || '学员'

  const trainers = await trainersOfClient(clientId)
  await Promise.all(trainers.map(tid => pushNotification({
    user_id: tid,
    type: 'loyalty_bonus',
    title: `${name} 已累计完成 ${total} 节课`,
    body: `按「每满 ${threshold} 节赠 ${bonus} 节」的规则，可以给她发放 ${bonus} 节赠课了。到学员页的「课时包」里一键发放。`,
    link: `/dashboard/clients/${clientId}`,
    related_user_id: clientId,
    dedupe_key: `loyalty:${clientId}:${milestone}`,
  })))
}
