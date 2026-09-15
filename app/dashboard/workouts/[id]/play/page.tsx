'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useBeeper, vibrate, useWakeLock } from '@/lib/timerKit'

// 课后作业「连播」：点一次从头跑到尾，自动倒计时、自动休息、自动切下一个动作。
//
// 只串联「计时型」动作（填了时长的）。计次型（只有次数没时长）暂时不进播放器，
// 学员在作业列表里自己做完打勾——界面上会明确说明，免得以为程序漏掉了。
//
// 两种练法：
//   顺序 sequential —— 一个动作做完所有组，再下一个
//   循环 circuit    —— 每个动作各做一组算一圈，再从头开始；组数少的动作做完后自动从后面的圈里跳过
//
// 休息只有两个数字，两种练法共用：
//   每个动作的 rest_sec        = 这个动作做完歇多久
//   作业的 transition_rest_sec = 顺序练法里换动作 / 循环练法里走完一圈

interface HwExercise {
  id: string
  sets?: number | null
  reps?: number | null
  duration?: number | null
  duration_unit?: string | null
  rest_sec?: number | null
  notes?: string | null
  order_num: number
  master_exercise: {
    id: string
    name_cn: string
    name_en: string
    featured_image_url?: string | null
  }
}

interface Homework {
  id: string
  title: string
  status: string
  circuit_mode?: 'sequential' | 'circuit'
  transition_rest_sec?: number | null
  homework_exercise: HwExercise[]
}

type Mode = 'sequential' | 'circuit'
type Phase = 'setup' | 'ready' | 'work' | 'rest' | 'transition' | 'done'

// 播放条目：一条 = 屏幕上的一个阶段
interface Step {
  type: 'ready' | 'work' | 'rest' | 'transition'
  seconds: number
  exIdx: number        // 属于哪个动作（transition 用的是「下一个动作」）
  setNo: number        // 第几组
  totalSets: number
  roundNo: number      // 循环练法里的第几圈
  totalRounds: number
}

interface PlanItem {
  key: string
  exerciseId: string
  name: string
  imageUrl?: string | null
  workSec: number
  sets: number
  restSec: number
  note?: string | null
  skipped: boolean
}

const COLORS: Record<Phase, { bg: string; fg: string }> = {
  setup: { bg: 'var(--c-page-bg)', fg: 'var(--c-text-primary)' },
  ready: { bg: '#FFB74D', fg: '#5A3E00' },
  work: { bg: '#9880B8', fg: '#FFFFFF' },
  rest: { bg: '#64B5F6', fg: '#0D2C4A' },
  transition: { bg: '#4A90C2', fg: '#FFFFFF' },
  done: { bg: '#66BB6A', fg: '#FFFFFF' },
}

const DEFAULT_REST = 20

function fmtDuration(totalSec: number) {
  const m = Math.round(totalSec / 60)
  return m < 1 ? '不到 1 分钟' : `约 ${m} 分钟`
}

export default function WorkoutPlayerPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id as string

  const [hw, setHw] = useState<Homework | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [plan, setPlan] = useState<PlanItem[]>([])
  const [mode, setMode] = useState<Mode>('sequential')
  const [transitionRest, setTransitionRest] = useState(30)
  const [soundOn, setSoundOn] = useState(true)

  const [phase, setPhase] = useState<Phase>('setup')
  const [stepIdx, setStepIdx] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [paused, setPaused] = useState(false)
  const [doneSets, setDoneSets] = useState<Record<number, number>>({})

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedClassId, setSavedClassId] = useState('')
  const [hwCompleted, setHwCompleted] = useState(false)

  const beeper = useBeeper(soundOn)
  const lastTickRef = useRef(-1)
  const isRunning = phase === 'ready' || phase === 'work' || phase === 'rest' || phase === 'transition'
  useWakeLock(isRunning)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) loadHomework()
  }, [user, authLoading])

  const loadHomework = async () => {
    try {
      const res = await fetch(`/api/homework/${homeworkId}`, {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (!res.ok) throw new Error('作业未找到')
      const data: Homework = await res.json()
      setHw(data)
      setMode(data.circuit_mode === 'circuit' ? 'circuit' : 'sequential')
      setTransitionRest(data.transition_rest_sec ?? 30)

      // 只取计时型动作（有时长的），按教练排的顺序
      const timed = (data.homework_exercise || [])
        .filter(e => e.duration != null && Number(e.duration) > 0)
        .sort((a, b) => a.order_num - b.order_num)
        .map(e => ({
          key: e.id,
          exerciseId: e.master_exercise?.id || '',
          name: e.master_exercise?.name_cn || e.master_exercise?.name_en || '动作',
          imageUrl: e.master_exercise?.featured_image_url,
          // 时长按秒存；单位是分钟的换算过来
          workSec: e.duration_unit === 'minutes' ? Number(e.duration) * 60 : Number(e.duration),
          sets: Number(e.sets) || 1,
          restSec: e.rest_sec == null ? DEFAULT_REST : Number(e.rest_sec),
          note: e.notes,
          skipped: false,
        }))
      setPlan(timed)
    } catch (err: any) {
      setLoadError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const active = plan.filter(p => !p.skipped)

  // ── 把整份作业展开成一串播放条目 ──────────────────────────
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = []
    const idxOf = (p: PlanItem) => plan.indexOf(p)
    if (active.length === 0) return out

    out.push({ type: 'ready', seconds: 3, exIdx: idxOf(active[0]), setNo: 1, totalSets: active[0].sets, roundNo: 1, totalRounds: 1 })

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
    } else {
      // 循环：每圈把还没做完的动作各做一组；组数少的动作做完后自动不再出现
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
            out.push({ type: 'transition', seconds: transitionRest, exIdx: idxOf(nextRound[0]), setNo: r + 1, totalSets: nextRound[0].sets, roundNo: r + 1, totalRounds })
          }
        }
      }
    }
    return out
  }, [plan, mode, transitionRest])

  const estimatedSec = useMemo(
    () => steps.reduce((s, st) => s + st.seconds, 0),
    [steps]
  )

  const step = steps[stepIdx]
  const currentEx = step ? plan[step.exIdx] : null
  const workStepsTotal = steps.filter(s => s.type === 'work').length
  const workStepsDone = steps.slice(0, stepIdx).filter(s => s.type === 'work').length
  const progress = workStepsTotal > 0 ? workStepsDone / workStepsTotal : 0

  // ── 主计时循环 ────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || paused) return
    if (remaining > 0) {
      const t = setTimeout(() => setRemaining(r => r - 1), 1000)
      return () => clearTimeout(t)
    }

    // 当前阶段结束：结算 + 进入下一条
    if (step?.type === 'work') {
      setDoneSets(prev => ({ ...prev, [step.exIdx]: (prev[step.exIdx] || 0) + 1 }))
    }

    const next = steps[stepIdx + 1]
    if (!next) {
      beeper.finish(); vibrate([150, 100, 150, 100, 300])
      setPhase('done')
      return
    }
    if (next.type === 'work') { beeper.goWork(); vibrate(200) }
    else { beeper.goRest(); vibrate(100) }
    setStepIdx(stepIdx + 1)
    setPhase(next.type)
    setRemaining(next.seconds)
  }, [isRunning, paused, remaining, stepIdx, steps, step, beeper])

  // 休息/准备的最后 3 秒滴答提示
  useEffect(() => {
    const warnPhase = phase === 'ready' || phase === 'rest' || phase === 'transition'
    if (warnPhase && remaining > 0 && remaining <= 3 && remaining !== lastTickRef.current) {
      lastTickRef.current = remaining
      beeper.tick()
      vibrate(60)
    }
    if (remaining > 3) lastTickRef.current = -1
  }, [phase, remaining, beeper])

  // 网页标题显示剩余秒数
  useEffect(() => {
    if (phase === 'setup') { document.title = 'MyFitnessPro'; return }
    if (phase === 'done') { document.title = '✅ 完成 — MyFitnessPro'; return }
    document.title = `${remaining}s · ${currentEx?.name || ''}`
  }, [phase, remaining, currentEx])

  const handleStart = () => {
    if (steps.length === 0) return
    beeper.ensureCtx() // 必须在点击事件里初始化，否则浏览器不让出声
    setDoneSets({})
    setSaveState('idle'); setSaveError(''); setSavedClassId(''); setHwCompleted(false)
    setStepIdx(0)
    setPhase('ready')
    setRemaining(steps[0].seconds)
    setPaused(false)
  }

  const handleQuit = () => {
    const anyDone = Object.values(doneSets).some(v => v > 0)
    if (!anyDone) {
      if (!window.confirm('结束练习？这次还没有完成任何一组，不会留下记录。')) return
      setPhase('setup')
      return
    }
    if (!window.confirm('结束练习？已经完成的部分会记录下来。')) return
    setPhase('done')
  }

  // ── 练完（或中途结束）自动记一条 ──────────────────────────
  const buildPayload = () => ({
    homework_id: homeworkId,
    title: hw?.title || '课后作业',
    circuit_mode: mode,
    exercises: plan.map((p, idx) => ({
      exercise_id: p.exerciseId,
      name: p.name,
      work_sec: p.workSec,
      rest_sec: p.restSec,
      planned_sets: p.sets,
      done_sets: doneSets[idx] || 0,
      skipped: p.skipped,
    })),
  })

  const handleRecord = async () => {
    if (!user || saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving'); setSaveError('')
    try {
      const res = await fetch('/api/self-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '记录失败')
      setSavedClassId(data.id || '')
      setHwCompleted(!!data.homework_completed)
      setSaveState('saved')
    } catch (err: any) {
      setSaveState('error')
      setSaveError(err.message || '记录失败，请重试')
    }
  }

  useEffect(() => {
    if (phase === 'done' && saveState === 'idle') handleRecord()
  }, [phase, saveState])

  // ── 确认页上的操作 ────────────────────────────────────────
  const move = (idx: number, dir: -1 | 1) => {
    setPlan(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }
  const toggleSkip = (idx: number) => {
    setPlan(prev => prev.map((p, i) => i === idx ? { ...p, skipped: !p.skipped } : p))
  }

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>
  if (loadError || !hw) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p>{loadError || '作业未找到'}</p>
      <Link href="/dashboard/workouts" style={{ color: 'var(--c-brand)' }}>← 返回课后作业</Link>
    </div>
  )

  const colors = COLORS[phase]
  const warnPulse = (phase === 'ready' || phase === 'rest' || phase === 'transition') && remaining <= 3
  const repsOnlyCount = (hw.homework_exercise || []).filter(e => !(e.duration != null && Number(e.duration) > 0)).length

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg, color: colors.fg,
      transition: 'background-color 0.3s ease', display: 'flex', flexDirection: 'column',
    }}>
      {/* 顶部 */}
      <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {phase === 'setup' ? (
          <Link href="/dashboard/workouts" style={{ color: colors.fg, opacity: 0.8, textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
        ) : phase === 'done' ? (
          <Link href="/dashboard/workouts" style={{ color: colors.fg, opacity: 0.9, textDecoration: 'none', fontSize: 14 }}>← 返回作业</Link>
        ) : (
          <button onClick={handleQuit} style={{ background: 'none', border: 'none', color: colors.fg, opacity: 0.85, fontSize: 14, cursor: 'pointer', padding: 0 }}>
            ✕ 结束
          </button>
        )}
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hw.title}
        </span>
        {phase !== 'setup' && phase !== 'done' && (
          <button onClick={() => setSoundOn(v => !v)} style={{ background: 'none', border: 'none', color: colors.fg, fontSize: 18, cursor: 'pointer', padding: 0 }}>
            {soundOn ? '🔊' : '🔇'}
          </button>
        )}
      </header>

      {/* 运行时的整体进度条 */}
      {isRunning && (
        <div style={{ padding: '0 var(--sp-5) 10px', flexShrink: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {mode === 'circuit'
                ? `第 ${step?.roundNo}/${step?.totalRounds} 圈 · ${currentEx?.name || ''}`
                : `${active.findIndex(p => p === currentEx) + 1}/${active.length} 个动作 · ${currentEx?.name || ''}`}
            </span>
            <span>{mode === 'circuit' ? '循环' : '顺序'}</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 2, background: 'currentColor', opacity: 0.9, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

        {/* ── 开始前的确认页 ── */}
        {phase === 'setup' && (
          <div style={{ width: '100%', maxWidth: 420 }}>
            {plan.length === 0 ? (
              <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 28, textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>这份作业没有可连播的动作</p>
                <p style={{ margin: 0, fontSize: 13, color: '#999', lineHeight: 1.7 }}>
                  连播只支持设了「时长」的动作。这份作业里的动作都是按次数做的，
                  回到作业列表按自己的节奏完成就好。
                </p>
                <Link href="/dashboard/workouts" style={{ display: 'inline-block', marginTop: 16, color: 'var(--c-brand)', fontSize: 14 }}>
                  ← 返回课后作业
                </Link>
              </div>
            ) : (
              <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                {/* 练法 */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--c-text-secondary)' }}>练法</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([['circuit', '循环'], ['sequential', '顺序']] as const).map(([val, lbl]) => (
                      <button key={val} onClick={() => setMode(val)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                          border: `1.5px solid ${mode === val ? 'var(--c-brand)' : 'var(--c-border)'}`,
                          background: mode === val ? 'var(--c-brand)' : 'transparent',
                          color: mode === val ? '#fff' : 'var(--c-text-secondary)',
                          fontWeight: mode === val ? 700 : 400,
                        }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#aaa' }}>
                    {mode === 'circuit'
                      ? '动作 1→2→3 做一圈，再从头重复'
                      : '一个动作做完全部组数，再进入下一个'}
                  </p>
                </div>

                {/* 动作列表 */}
                <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 12, marginBottom: 12 }}>
                  {plan.map((p, i) => (
                    <div key={p.key} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                      borderBottom: i < plan.length - 1 ? '1px solid var(--c-border)' : 'none',
                      opacity: p.skipped ? 0.45 : 1,
                    }}>
                      <span style={{ width: 18, fontSize: 12, color: '#bbb', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)',
                          textDecoration: p.skipped ? 'line-through' : 'none',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#999' }}>
                          {p.workSec}秒 × {p.sets}组 · 歇{p.restSec}秒
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => move(i, -1)} disabled={i === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12 }}>
                          ↑
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === plan.length - 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === plan.length - 1 ? 'not-allowed' : 'pointer', color: i === plan.length - 1 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12 }}>
                          ↓
                        </button>
                        <button onClick={() => toggleSkip(i)}
                          style={{
                            padding: '0 8px', height: 28, borderRadius: 6, fontSize: 11, cursor: 'pointer',
                            border: `1px solid ${p.skipped ? 'var(--c-brand)' : 'var(--c-border)'}`,
                            background: p.skipped ? 'var(--c-fill-light)' : 'transparent',
                            color: p.skipped ? 'var(--c-brand)' : 'var(--c-text-secondary)',
                          }}>
                          {p.skipped ? '已跳过' : '跳过'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 全局休息 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text-secondary)' }}>
                    {mode === 'circuit' ? '轮次间休息' : '动作间休息'}
                  </span>
                  <button onClick={() => setTransitionRest(v => Math.max(0, v - 5))}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)' }}>−</button>
                  <span style={{ minWidth: 48, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>{transitionRest}秒</span>
                  <button onClick={() => setTransitionRest(v => v + 5)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)' }}>＋</button>
                </div>

                <p style={{ margin: '14px 0 10px', textAlign: 'right', fontSize: 13, color: 'var(--c-text-secondary)' }}>
                  {active.length === 0 ? '全部跳过了' : fmtDuration(estimatedSec)}
                </p>

                <button onClick={handleStart} disabled={active.length === 0}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    background: active.length === 0 ? 'var(--c-lavender)' : 'var(--c-brand)',
                    color: '#fff', fontSize: 16, fontWeight: 700,
                    cursor: active.length === 0 ? 'not-allowed' : 'pointer',
                  }}>
                  ▶ 开始练
                </button>

                {repsOnlyCount > 0 && (
                  <p style={{ margin: '12px 0 0', fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
                    这份作业里还有 {repsOnlyCount} 个按次数做的动作没进连播（连播只带计时的动作），
                    回作业列表里自己做完打勾就行。
                  </p>
                )}
                <p style={{ margin: '10px 0 0', fontSize: 11, color: '#bbb', lineHeight: 1.6 }}>
                  练的时候屏幕会保持常亮，手机可以放在旁边不用管。iPhone 听不到提示音的话，检查一下侧面的静音开关。
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 准备 / 训练 / 休息 ── */}
        {isRunning && step && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>
            {phase === 'ready' && (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>{currentEx?.name}</p>
                <p style={{ margin: '0 0 20px', fontSize: 14, opacity: 0.85 }}>
                  {currentEx?.workSec}秒 × {currentEx?.sets}组
                </p>
                {currentEx?.imageUrl && (
                  <img src={currentEx.imageUrl} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }} />
                )}
              </>
            )}

            {phase === 'work' && (
              <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, opacity: 0.9 }}>
                {currentEx?.name} · 第 {step.setNo}/{step.totalSets} 组
              </p>
            )}

            <div style={{
              fontSize: warnPulse ? 132 : 116, fontWeight: 800, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              animation: warnPulse ? 'playerPulse 1s ease-in-out infinite' : 'none',
            }}>
              {remaining}
            </div>

            {phase === 'ready' && <p style={{ margin: '14px 0 0', fontSize: 14, opacity: 0.8 }}>准备开始…</p>}
            {phase === 'work' && <p style={{ margin: '14px 0 0', fontSize: 14, opacity: 0.75 }}>坚持住！</p>}

            {phase === 'rest' && (
              <p style={{ margin: '16px 0 0', fontSize: 15, opacity: 0.9 }}>
                {mode === 'circuit'
                  ? <>下一个：<b>{currentEx?.name}</b> {currentEx?.workSec}秒</>
                  : <>下一组：<b>{currentEx?.name}</b> 第 {step.setNo}/{step.totalSets} 组</>}
              </p>
            )}

            {phase === 'transition' && (
              <div style={{ marginTop: 16 }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.85 }}>
                  {mode === 'circuit' ? `↻ 下一圈（第 ${step.roundNo}/${step.totalRounds} 圈）` : '↓ 换动作'}
                </p>
                <p style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>
                  {currentEx?.name}
                </p>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
                  {currentEx?.workSec}秒 × {currentEx?.sets}组
                </p>
                {currentEx?.imageUrl && (
                  <img src={currentEx.imageUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 14, marginTop: 12 }} />
                )}
              </div>
            )}

            <div style={{ marginTop: 30 }}>
              <button onClick={() => setPaused(p => !p)}
                style={{ padding: '10px 28px', borderRadius: 999, border: `1.5px solid ${colors.fg}`, background: 'transparent', color: colors.fg, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {paused ? '▶ 继续' : '⏸ 暂停'}
              </button>
            </div>
          </div>
        )}

        {/* ── 完成 ── */}
        {phase === 'done' && (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 64, marginBottom: 10 }}>🎉</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>练完了！</h2>

            <div style={{ margin: '16px 0 22px', textAlign: 'left', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px' }}>
              {plan.map((p, idx) => {
                const d = doneSets[idx] || 0
                return (
                  <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', opacity: p.skipped ? 0.6 : 1 }}>
                    <span>{p.name}</span>
                    <span>{p.skipped ? '跳过' : d >= p.sets ? `${d} 组 ✓` : `${d}/${p.sets} 组`}</span>
                  </div>
                )
              })}
            </div>

            {saveState === 'saved' ? (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 14, opacity: 0.95 }}>✓ 已记录在自我练习中</p>
                {hwCompleted && <p style={{ margin: '0 0 14px', fontSize: 13, opacity: 0.85 }}>这份作业也标记完成了</p>}
                <Link href={savedClassId ? `/dashboard/classes/${savedClassId}` : '/dashboard/classes'}
                  style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 999, background: 'white', color: '#2E7D32', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
                  去看看这次的练习记录 →
                </Link>
              </>
            ) : saveState === 'error' ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.95 }}>⚠️ {saveError}</p>
                <button onClick={handleRecord}
                  style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid white', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  重试记录
                </button>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>记录中…</p>
            )}

            <div style={{ marginTop: 22 }}>
              <button onClick={() => setPhase('setup')}
                style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                再练一次
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes playerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}
