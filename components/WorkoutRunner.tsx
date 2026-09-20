'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useBeeper, vibrate, useWakeLock } from '@/lib/timerKit'
import { buildSteps, PlanItem, Step, WorkoutMode } from '@/lib/workoutEngine'
import { saveSession, clearSession } from '@/lib/workoutSession'

// 连播播放器的运行界面：准备 → 训练 → 休息 → 换动作 → 结束。
// 课后作业连播和计时器共用这一个组件，两边只是「开始前的设置页」和「练完怎么记录」不一样。
//
// 屏幕原则：手机扔在垫子边上，人在动、可能隔一米、满头汗，
// 所以每个阶段只突出当下最想知道的那一个信息，剩下的都让位给大号秒数。

type Phase = 'ready' | 'work' | 'rest' | 'transition'

const COLORS: Record<Phase, { bg: string; fg: string }> = {
  ready: { bg: '#FFB74D', fg: '#5A3E00' },
  work: { bg: '#9880B8', fg: '#FFFFFF' },
  rest: { bg: '#64B5F6', fg: '#0D2C4A' },
  transition: { bg: '#4A90C2', fg: '#FFFFFF' },
}

export interface RunnerResult {
  doneSets: Record<number, number>   // key = plan 下标
  finished: boolean                  // true = 自然跑完；false = 中途结束
}

export interface RunnerProgress {
  stepIdx: number
  remaining: number
  doneSets: Record<number, number>
}

export default function WorkoutRunner({
  plan, mode, transitionRest, title, onExit, sessionKey, initial,
}: {
  plan: PlanItem[]
  mode: WorkoutMode
  transitionRest: number
  title: string
  onExit: (result: RunnerResult) => void
  /** 传了就把进度存到本地，意外退出后能接着练 */
  sessionKey?: string
  /** 从存档继续时的起点 */
  initial?: RunnerProgress
}) {
  const steps = useMemo(() => buildSteps(plan, mode, transitionRest), [plan, mode, transitionRest])
  const active = plan.filter(p => !p.skipped && p.workSec > 0 && p.sets > 0)

  const [stepIdx, setStepIdx] = useState(initial?.stepIdx ?? 0)
  const [remaining, setRemaining] = useState(initial?.remaining ?? steps[0]?.seconds ?? 0)
  // 从存档继续时先停住——人刚走回手机边上，得有时间摆好姿势
  const [paused, setPaused] = useState(!!initial)
  const [soundOn, setSoundOn] = useState(true)
  const [doneSets, setDoneSets] = useState<Record<number, number>>(initial?.doneSets ?? {})

  const beeper = useBeeper(soundOn)
  const lastTickRef = useRef(-1)
  // 一旦结束就不再写存档。否则「先 clearSession 再 onExit」之后，
  // 结束那一刻的 setDoneSets 可能再触发一次保存，把刚清掉的存档又写回去，
  // 下次进来就会提示继续一个其实已经练完并记录过的训练。
  const endedRef = useRef(false)
  useWakeLock(true)

  const finishRun = (result: RunnerResult) => {
    endedRef.current = true
    if (sessionKey) clearSession(sessionKey)
    onExit(result)
  }

  const step: Step | undefined = steps[stepIdx]
  const phase: Phase = (step?.type ?? 'ready') as Phase
  const currentEx = step ? plan[step.exIdx] : null
  const colors = COLORS[phase]

  const workTotal = steps.filter(s => s.type === 'work').length
  const workDone = steps.slice(0, stepIdx).filter(s => s.type === 'work').length
  const progress = workTotal > 0 ? workDone / workTotal : 0

  // 主计时循环
  useEffect(() => {
    if (paused || !step) return
    if (remaining > 0) {
      const t = setTimeout(() => setRemaining(r => r - 1), 1000)
      return () => clearTimeout(t)
    }

    // 这个阶段结束：先结算，再进下一条
    let nextDone = doneSets
    if (step.type === 'work') {
      nextDone = { ...doneSets, [step.exIdx]: (doneSets[step.exIdx] || 0) + 1 }
      setDoneSets(nextDone)
    }

    const next = steps[stepIdx + 1]
    if (!next) {
      beeper.finish(); vibrate([150, 100, 150, 100, 300])
      finishRun({ doneSets: nextDone, finished: true })
      return
    }
    if (next.type === 'work') { beeper.goWork(); vibrate(200) }
    else { beeper.goRest(); vibrate(100) }
    setStepIdx(stepIdx + 1)
    setRemaining(next.seconds)
  }, [paused, remaining, stepIdx, steps, step, doneSets, beeper, onExit, sessionKey])

  // 每秒把进度写进本地存档。意外退出（返回、关标签页、手机没电）时不会调用 onExit，
  // 存档就留在那儿，下次进来可以选择继续。正常练完或主动结束会清掉。
  useEffect(() => {
    if (!sessionKey || endedRef.current) return
    saveSession(sessionKey, { title, plan, mode, transitionRest, stepIdx, remaining, doneSets })
  }, [sessionKey, title, plan, mode, transitionRest, stepIdx, remaining, doneSets])

  // 跳过当前这一条：正在做的那一组，或者正在走的那段休息。
  // 跳过的组不计入完成——没做就是没做，记录里要如实反映。
  const skipCurrent = () => {
    const next = steps[stepIdx + 1]
    if (!next) {
      finishRun({ doneSets, finished: true })
      return
    }
    if (next.type === 'work') { beeper.goWork(); vibrate(200) }
    else { beeper.goRest(); vibrate(100) }
    setStepIdx(stepIdx + 1)
    setRemaining(next.seconds)
  }

  // 准备/休息的最后 3 秒滴答提示
  useEffect(() => {
    const warnPhase = phase === 'ready' || phase === 'rest' || phase === 'transition'
    if (warnPhase && remaining > 0 && remaining <= 3 && remaining !== lastTickRef.current) {
      lastTickRef.current = remaining
      beeper.tick()
      vibrate(60)
    }
    if (remaining > 3) lastTickRef.current = -1
  }, [phase, remaining, beeper])

  // 切到别的标签页时，标题也能瞄一眼剩余秒数
  useEffect(() => {
    document.title = `${remaining}s · ${currentEx?.name || ''}`
    return () => { document.title = 'MyFitnessPro' }
  }, [remaining, currentEx])

  const handleQuit = () => {
    const anyDone = Object.values(doneSets).some(v => v > 0)
    const msg = anyDone ? '结束练习？已经完成的部分会记录下来。' : '结束练习？这次还没有完成任何一组，不会留下记录。'
    if (!window.confirm(msg)) return
    // 主动结束会走到「完成」页去记录，存档留着会重复，直接清掉
    finishRun({ doneSets, finished: false })
  }

  const warnPulse = (phase === 'ready' || phase === 'rest' || phase === 'transition') && remaining <= 3

  return (
    <div style={{
      minHeight: '100vh', background: colors.bg, color: colors.fg,
      transition: 'background-color 0.3s ease', display: 'flex', flexDirection: 'column',
    }}>
      <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={handleQuit}
          style={{ background: 'none', border: 'none', color: colors.fg, opacity: 0.85, fontSize: 14, cursor: 'pointer', padding: 0 }}>
          ✕ 结束
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <button onClick={() => setSoundOn(v => !v)}
          style={{ background: 'none', border: 'none', color: colors.fg, fontSize: 18, cursor: 'pointer', padding: 0 }}>
          {soundOn ? '🔊' : '🔇'}
        </button>
      </header>

      {/* 整体进度：随时知道还剩多少，不用自己算 */}
      <div style={{ padding: '0 var(--sp-5) 10px', flexShrink: 0 }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mode === 'circuit'
              ? `第 ${step?.roundNo}/${step?.totalRounds} 圈 · ${currentEx?.name || ''}`
              : `${active.findIndex(p => p === currentEx) + 1}/${active.length} 个动作 · ${currentEx?.name || ''}`}
          </span>
          <span style={{ flexShrink: 0 }}>{mode === 'circuit' ? '循环' : '顺序'}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }}>
          <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 2, background: 'currentColor', opacity: 0.9, transition: 'width 0.3s' }} />
        </div>
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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

          {phase === 'work' && step && (
            <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 600, opacity: 0.9 }}>
              {currentEx?.name} · 第 {step.setNo}/{step.totalSets} 组
            </p>
          )}

          <div style={{
            fontSize: warnPulse ? 132 : 116, fontWeight: 800, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            animation: warnPulse ? 'runnerPulse 1s ease-in-out infinite' : 'none',
          }}>
            {remaining}
          </div>

          {phase === 'ready' && <p style={{ margin: '14px 0 0', fontSize: 14, opacity: 0.8 }}>准备开始…</p>}
          {phase === 'work' && <p style={{ margin: '14px 0 0', fontSize: 14, opacity: 0.75 }}>坚持住！</p>}

          {phase === 'rest' && step && (
            <p style={{ margin: '16px 0 0', fontSize: 15, opacity: 0.9 }}>
              {mode === 'circuit'
                ? <>下一个：<b>{currentEx?.name}</b> {currentEx?.workSec}秒</>
                : <>下一组：<b>{currentEx?.name}</b> 第 {step.setNo}/{step.totalSets} 组</>}
            </p>
          )}

          {/* 换动作：休息一开始就把下一个动作大大地显示出来，学员有整段时间准备 */}
          {phase === 'transition' && step && (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.85 }}>
                {mode === 'circuit' ? `↻ 下一圈（第 ${step.roundNo}/${step.totalRounds} 圈）` : '↓ 换动作'}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>{currentEx?.name}</p>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
                {currentEx?.workSec}秒 × {currentEx?.sets}组
              </p>
              {currentEx?.imageUrl && (
                <img src={currentEx.imageUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 14, marginTop: 12 }} />
              )}
            </div>
          )}

          <div style={{ marginTop: 30, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setPaused(p => !p)}
              style={{
                padding: '12px 30px', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                // 暂停时把「继续」做成实心主按钮，一眼能找到怎么接着练
                border: `1.5px solid ${colors.fg}`,
                background: paused ? colors.fg : 'transparent',
                color: paused ? colors.bg : colors.fg,
              }}>
              {paused ? '▶ 继续' : '⏸ 暂停'}
            </button>
            <button onClick={skipCurrent}
              title={phase === 'work' ? '跳过这一组' : '跳过这段休息'}
              style={{
                padding: '12px 22px', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${colors.fg}`, background: 'transparent', color: colors.fg, opacity: 0.85,
              }}>
              ⏭ 跳过{phase === 'work' ? '这组' : '休息'}
            </button>
          </div>

          {paused && (
            <p style={{ margin: '14px 0 0', fontSize: 12, opacity: 0.8 }}>
              已暂停，计时停住了
            </p>
          )}
        </div>
      </main>

      <style>{`
        @keyframes runnerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}
