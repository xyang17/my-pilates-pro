// 教练个人训练记录的前端类型。后端见 lib/personalWorkout.ts。

export type WorkoutType = 'strength' | 'pilates' | 'other'

export interface PersonalWorkoutExercise {
  id?: string
  exercise_id: string | null   // 为空 = 自由填写，没关联动作库
  name: string
  sets: number | null
  reps: number | null
  weight: number | null
  weight_unit: string | null
  duration_sec: number | null
  rest_sec?: number | null
  notes?: string | null
  order_num?: number
}

export interface PersonalWorkout {
  id: string
  user_id: string
  date: string
  title: string | null
  type: WorkoutType
  duration_min: number | null
  notes: string | null
  source: 'manual' | 'timer'
  created_at: string
  updated_at: string
  exercises: PersonalWorkoutExercise[]
}

export const TYPE_META: Record<WorkoutType, { zh: string; en: string; color: string; bg: string }> = {
  strength: { zh: '力量', en: 'Strength', color: '#7A6398', bg: '#EDE6F4' },
  pilates:  { zh: '普拉提', en: 'Pilates', color: '#A0707A', bg: '#F6E9EB' },
  other:    { zh: '其他', en: 'Other',    color: '#7C8A96', bg: '#EAEFF2' },
}

/** 一个动作的一行摘要：3×10 · 20kg · 45秒 */
export function exerciseSummary(e: PersonalWorkoutExercise, lang: 'zh' | 'en' = 'zh'): string {
  const parts: string[] = []
  if (e.sets && e.reps) parts.push(`${e.sets}×${e.reps}`)
  else if (e.sets) parts.push(lang === 'zh' ? `${e.sets}组` : `${e.sets} sets`)
  else if (e.reps) parts.push(lang === 'zh' ? `${e.reps}次` : `${e.reps} reps`)
  if (e.weight !== null && e.weight !== undefined) parts.push(`${e.weight}${e.weight_unit || 'kg'}`)
  if (e.duration_sec) parts.push(lang === 'zh' ? `${e.duration_sec}秒` : `${e.duration_sec}s`)
  return parts.join(' · ')
}

/** 本地日期 YYYY-MM-DD（不能用 toISOString，那是 UTC，北京时间早上 8 点前会变成昨天） */
export function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
