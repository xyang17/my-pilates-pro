// ============================================================
// 门店时区工具
//
// 【为什么需要这个文件】
// 线上跑在 Vercel，Node 进程的时区是 UTC。在服务端直接写
//   new Date().getFullYear() / getMonth() / getDate()
// 算出来的是 UTC 的年月日，不是门店当地的日期。
//
// 北京时间 00:00–08:00 这八小时里，UTC 还停在前一天 ——
// 于是「今日课程」会查昨天，学员凌晨打开就看到「今天没有课程安排」。
//
// 服务端凡是要得到「今天是几号」，一律走这里的函数，不要用 new Date() 的本地方法。
// ============================================================

/** 门店所在时区相对 UTC 的分钟偏移。跨时区开店时这里要改成按门店配置。 */
export const STUDIO_UTC_OFFSET_MINUTES = 8 * 60   // Asia/Shanghai, UTC+8

const shift = (d: Date) => new Date(d.getTime() + STUDIO_UTC_OFFSET_MINUTES * 60_000)

/** 某一瞬间在门店当地是哪一天，返回 'YYYY-MM-DD' */
export const studioDate = (d: Date = new Date()): string =>
  shift(d).toISOString().slice(0, 10)

/** 门店当地的今天 */
export const studioToday = (): string => studioDate()

/** 门店当地的当前时刻，'HH:mm' */
export const studioTime = (d: Date = new Date()): string =>
  shift(d).toISOString().slice(11, 16)

/** 门店当地时间的年 / 月(1-12) / 日 */
export function studioParts(d: Date = new Date()) {
  const s = shift(d)
  return { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate() }
}

/** 日历日期加减，纯字符串运算，不受时区影响 */
export function addDaysStr(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 该日期是星期几（0=周日） */
export const weekdayOfStr = (date: string): number =>
  new Date(`${date}T00:00:00Z`).getUTCDay()

/** 门店当地某天某时刻对应的绝对时间（ISO，带偏移） */
export function studioISO(date: string, time: string): string {
  const sign = STUDIO_UTC_OFFSET_MINUTES >= 0 ? '+' : '-'
  const abs = Math.abs(STUDIO_UTC_OFFSET_MINUTES)
  const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
  return `${date}T${time.slice(0, 5)}:00${off}`
}
