// 连播的排程逻辑：把一组动作展开成一串「阶段」。
// 课后作业连播和计时器（临时自己组的一套）共用这一份，避免两处逻辑各自漂移。

export type WorkoutMode = 'sequential' | 'circuit'

export interface PlanItem {
  key: string
  exerciseId?: string | null   // 有对应动作库记录时带上，记录时能写动作明细
  name: string
  imageUrl?: string | null
  workSec: number
  sets: number
  restSec: number              // 这个动作做完之后歇多久
  skipped: boolean
}

export interface Step {
  type: 'ready' | 'work' | 'rest' | 'transition'
  seconds: number
  exIdx: number        // 在完整 plan 数组里的下标；rest/transition 指向「接下来要做的那个动作」
  setNo: number
  totalSets: number
  roundNo: number      // 循环练法里的第几圈
  totalRounds: number
}

export const READY_SECONDS = 3

/**
 * 休息的两个数字，两种练法共用同一套字段：
 *   PlanItem.restSec  顺序=做完一组歇多久再做下一组；循环=做完这个动作歇多久换下一个
 *   transitionRest    顺序=换动作时；循环=走完一圈时
 *
 * 循环练法里，组数少的动作做完后会自动从后面的圈里消失（不补齐、不强制统一组数）。
 */
export function buildSteps(plan: PlanItem[], mode: WorkoutMode, transitionRest: number): Step[] {
  const out: Step[] = []
  const active = plan.filter(p => !p.skipped && p.workSec > 0 && p.sets > 0)
  if (active.length === 0) return out

  const idxOf = (p: PlanItem) => plan.indexOf(p)

  out.push({
    type: 'ready', seconds: READY_SECONDS,
    exIdx: idxOf(active[0]), setNo: 1, totalSets: active[0].sets,
    roundNo: 1, totalRounds: mode === 'circuit' ? Math.max(...active.map(e => e.sets)) : 1,
  })

  if (mode === 'sequential') {
    active.forEach((ex, i) => {
      for (let s = 1; s <= ex.sets; s++) {
        out.push({ type: 'work', seconds: ex.workSec, exIdx: idxOf(ex), setNo: s, totalSets: ex.sets, roundNo: 1, totalRounds: 1 })
        if (s < ex.sets && ex.restSec > 0) {
          out.push({ type: 'rest', seconds: ex.restSec, exIdx: idxOf(ex), setNo: s + 1, totalSets: ex.sets, roundNo: 1, totalRounds: 1 })
        }
      }
      if (i < active.length - 1 && transitionRest > 0) {
        const next = active[i + 1]
        out.push({ type: 'transition', seconds: transitionRest, exIdx: idxOf(next), setNo: 1, totalSets: next.sets, roundNo: 1, totalRounds: 1 })
      }
    })
    return out
  }

  // 循环
  const totalRounds = Math.max(...active.map(e => e.sets))
  for (let r = 1; r <= totalRounds; r++) {
    const thisRound = active.filter(e => e.sets >= r)
    thisRound.forEach((ex, i) => {
      out.push({ type: 'work', seconds: ex.workSec, exIdx: idxOf(ex), setNo: r, totalSets: ex.sets, roundNo: r, totalRounds })
      const isLastOfRound = i === thisRound.length - 1
      if (!isLastOfRound && ex.restSec > 0) {
        const next = thisRound[i + 1]
        out.push({ type: 'rest', seconds: ex.restSec, exIdx: idxOf(next), setNo: r, totalSets: next.sets, roundNo: r, totalRounds })
      }
    })
    if (r < totalRounds && transitionRest > 0) {
      const nextRound = active.filter(e => e.sets >= r + 1)
      if (nextRound.length > 0) {
        out.push({
          type: 'transition', seconds: transitionRest,
          exIdx: idxOf(nextRound[0]), setNo: r + 1, totalSets: nextRound[0].sets,
          roundNo: r + 1, totalRounds,
        })
      }
    }
  }
  return out
}

export function estimateSeconds(steps: Step[]): number {
  return steps.reduce((s, st) => s + st.seconds, 0)
}

export function formatDuration(totalSec: number): string {
  const m = Math.round(totalSec / 60)
  return m < 1 ? '不到 1 分钟' : `约 ${m} 分钟`
}
