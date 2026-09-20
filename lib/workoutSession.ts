'use client'

import { PlanItem, WorkoutMode } from '@/lib/workoutEngine'

// 训练进度存档：练到一半退出（手滑返回、接个电话、手机没电重开）不至于从头再来。
//
// 存在 localStorage 而不是数据库——这是「这一次练到哪儿了」的临时状态，
// 每秒都在变，没必要为它一直打接口；真正要留痕的是练完那条训练记录。
// 代价是换个设备看不到，但同一次训练中途换手机的场景基本不存在。

const PREFIX = 'mfp.workout.'
const VERSION = 1
/** 超过这个时间的存档不再提示继续——昨天没练完的今天多半想重新开始 */
const MAX_AGE_MS = 6 * 60 * 60 * 1000

export interface SavedSession {
  v: number
  title: string
  plan: PlanItem[]
  mode: WorkoutMode
  transitionRest: number
  stepIdx: number
  remaining: number
  doneSets: Record<number, number>
  /** 实际训练秒数（含被跳过那一组的零头）。老存档没有这个字段，读出来当空对象处理 */
  doneSec?: Record<number, number>
  savedAt: number
}

/** 计时器和每份作业各自一个存档位，互不覆盖 */
export const timerSessionKey = () => `${PREFIX}timer`
export const homeworkSessionKey = (homeworkId: string) => `${PREFIX}hw.${homeworkId}`

export function saveSession(key: string, data: Omit<SavedSession, 'v' | 'savedAt'>) {
  if (typeof window === 'undefined') return
  try {
    const payload: SavedSession = { ...data, v: VERSION, savedAt: Date.now() }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch { /* 隐私模式/存储满了都可能失败，失败就当没存过，不影响正常训练 */ }
}

export function loadSession(key: string): SavedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as SavedSession
    if (data?.v !== VERSION) return null
    if (Date.now() - data.savedAt > MAX_AGE_MS) { clearSession(key); return null }
    if (!Array.isArray(data.plan) || data.plan.length === 0) return null
    // 已经练完的（没有剩余步骤）不算可继续
    if (typeof data.stepIdx !== 'number' || data.stepIdx < 0) return null
    return data
  } catch {
    return null
  }
}

export function clearSession(key: string) {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch {}
}

/** 存档还剩多少没练完，用来给提示文案 */
export function describeProgress(s: SavedSession): string {
  const done = Object.values(s.doneSets || {}).reduce((a, b) => a + b, 0)
  const total = s.plan.filter(p => !p.skipped).reduce((a, p) => a + (p.sets || 0), 0)
  const when = new Date(s.savedAt)
  const hh = String(when.getHours()).padStart(2, '0')
  const mm = String(when.getMinutes()).padStart(2, '0')
  return `${hh}:${mm} 练到第 ${done + 1}/${total} 组`
}
