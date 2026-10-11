import { supabaseAdmin } from '@/lib/db'

// 学员「上次练这个动作」是怎么练的——课程页每个动作下面显示，加动作时用来预填。
// （教练自己的个人训练也有同样的提示，在 components/personal-workout/WorkoutForm.tsx）
//
// 口径：
//   只看这个学员【已完成】的私教课（assigned_to = 学员，class_type = 'private'），
//   日期不晚于当前这节课，排除当前这节课本身，取最近的一次。
//   有实际完成数据（actual_* 或逐组明细）就用实际的，否则用当时的计划值。
//   团课一节课多个学员，对应不到某一个人，不算；自我练习也不算。

export interface LastPerf {
  date: string
  class_id: string
  sets: number | null
  reps: number | null
  weight: number | null
  weight_unit: string | null
  duration: number | null
  duration_unit: string | null
  from_actual: boolean            // true = 用的是实际完成数据
}

const n = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v))

export async function lastPerformanceForClient(
  clientId: string,
  exerciseIds: string[],
  opts: { excludeClassId?: string; beforeOrOn?: string } = {},
): Promise<Record<string, LastPerf>> {
  const out: Record<string, LastPerf> = {}
  const ids = Array.from(new Set(exerciseIds.filter(Boolean)))
  if (!clientId || ids.length === 0) return out

  let q = supabaseAdmin.from('class').select('id, date, start_time')
    .eq('assigned_to', clientId).eq('class_type', 'private').eq('status', 'completed')
    .order('date', { ascending: false }).order('start_time', { ascending: false, nullsFirst: false })
    .limit(300)
  if (opts.beforeOrOn) q = q.lte('date', opts.beforeOrOn)
  if (opts.excludeClassId) q = q.neq('id', opts.excludeClassId)
  const { data: classes } = await q
  const list = (classes || []) as { id: string; date: string }[]
  if (list.length === 0) return out
  const rank: Record<string, number> = {}
  list.forEach((c, i) => { rank[c.id] = i })
  const dateOf: Record<string, string> = {}
  list.forEach(c => { dateOf[c.id] = c.date })

  const { data: inst } = await supabaseAdmin
    .from('class_exercise_instance')
    .select('class_id, exercise_id, sets, reps, weight, weight_unit, duration, duration_unit, actual_sets, actual_reps, actual_weight, set_details:exercise_instance_set(set_no, reps, weight, weight_unit)')
    .in('class_id', list.map(c => c.id))
    .in('exercise_id', ids)

  // 每个动作取最近那节课的
  const best: Record<string, any> = {}
  for (const r of (inst || []) as any[]) {
    const cur = best[r.exercise_id]
    if (!cur || rank[r.class_id] < rank[cur.class_id]) best[r.exercise_id] = r
  }

  for (const [exId, r] of Object.entries(best)) {
    const sd = (r.set_details || []) as { reps: number | null; weight: number | null; weight_unit: string | null }[]
    let perf: Omit<LastPerf, 'date' | 'class_id'>
    if (sd.length > 0) {
      // 逐组明细：组数 = 记了几组；次数取最常见的那个；重量取最大的那组
      const reps = sd.map(s => n(s.reps)).filter((x): x is number => x !== null)
      const weights = sd.map(s => n(s.weight)).filter((x): x is number => x !== null && x > 0)
      const mode = reps.length ? reps.sort((a, b) => reps.filter(v => v === b).length - reps.filter(v => v === a).length)[0] : null
      perf = {
        sets: sd.length, reps: mode, weight: weights.length ? Math.max(...weights) : null,
        weight_unit: sd.find(s => s.weight_unit)?.weight_unit || r.weight_unit,
        duration: n(r.duration), duration_unit: r.duration_unit, from_actual: true,
      }
    } else if (r.actual_sets != null || r.actual_reps != null || r.actual_weight != null) {
      perf = {
        sets: n(r.actual_sets) ?? n(r.sets), reps: n(r.actual_reps) ?? n(r.reps),
        weight: n(r.actual_weight) ?? n(r.weight), weight_unit: r.weight_unit,
        duration: n(r.duration), duration_unit: r.duration_unit, from_actual: true,
      }
    } else {
      perf = {
        sets: n(r.sets), reps: n(r.reps), weight: n(r.weight), weight_unit: r.weight_unit,
        duration: n(r.duration), duration_unit: r.duration_unit, from_actual: false,
      }
    }
    // 全是空的就当没有记录
    if (perf.sets == null && perf.reps == null && perf.weight == null && perf.duration == null) continue
    out[exId] = { ...perf, date: dateOf[r.class_id], class_id: r.class_id }
  }
  return out
}
