// 课时包按「节」计，可以有小数：上 1.5 小时 = 扣 1.5 节，剩余可以是 10.5 节。
// 数据库里是 numeric(…,2)，余额视图 package_balance 转成 float8 返回（JSON 里就是数字）。
// 这里统一做两件事：把输入规整到最多两位小数、显示时去掉多余的 0。绝不取整。

/** 规整成最多两位小数；非法 / 负数返回 fallback */
export function toUnits(v: unknown, fallback = 0): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.round(n * 100) / 100
}

/** 9 → "9"，9.5 → "9.5"，10.25 → "10.25"；消掉浮点尾巴 */
export function fmtUnits(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n * 100) / 100)
}

/** 按课程时长给默认扣几节：60 分钟 = 1，90 = 1.5，120 = 2；按半小时取整，最少 1 节 */
export function unitsFromDuration(minutes: unknown): number {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m <= 0) return 1
  return Math.max(1, Math.round(m / 30) / 2)
}

/** 只允许数字和一个小数点，最多两位小数（给 type="text" inputMode="decimal" 的输入框用） */
export function cleanDecimalInput(s: string): string {
  const only = s.replace(/[^\d.]/g, '')
  const [a, ...rest] = only.split('.')
  if (rest.length === 0) return a
  return `${a}.${rest.join('').slice(0, 2)}`
}
