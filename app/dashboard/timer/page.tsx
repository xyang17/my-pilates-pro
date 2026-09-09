'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import Link from 'next/link'

// ─── 提醒方式说明 ──────────────────────────────────────────────
// 能用的提醒手段主要这几种：
//   1. 声音——用 Web Audio API 现场合成"哔"声，不依赖外部音频文件/CDN
//      （项目里之前踩过 CDN 在国内加载失败的坑，这里完全绕开）。
//      浏览器有自动播放限制，第一次必须在用户点击"开始"之后才能真正出声，
//      所以声音是在点击开始按钮那一刻才初始化的。
//   2. 颜色——整屏背景随阶段切换（准备/训练/休息/完成各一个颜色），
//      加大号倒计时数字，最后 3 秒会跳动闪烁提示"要变了"。
//   3. 震动——安卓 Chrome 支持 navigator.vibrate()，静默生效；
//      iOS Safari 不支持震动 API，所以在 iPhone 上不会震动，这是系统限制，做不到。
//   4. 网页标题——后台切到别的标签页时，标签页标题会显示剩余秒数，
//      不用一直盯着这个页面。
// 没有做浏览器系统通知（Notification API）——手机锁屏或切到后台时不一定能触发，
// 与其给一个不可靠的提醒，不如让用户知道：计时的时候把这个页面留在前台最保险。

type Phase = 'setup' | 'ready' | 'work' | 'rest' | 'done'

const COLORS: Record<Phase, { bg: string; fg: string }> = {
  setup: { bg: 'var(--c-page-bg)', fg: 'var(--c-text-primary)' },
  ready: { bg: '#FFB74D', fg: '#5A3E00' },
  work: { bg: '#9880B8', fg: '#FFFFFF' },
  rest: { bg: '#64B5F6', fg: '#0D2C4A' },
  done: { bg: '#66BB6A', fg: '#FFFFFF' },
}

const PHASE_LABEL: Record<Phase, string> = {
  setup: '设置',
  ready: '准备',
  work: '训练中',
  rest: '休息',
  done: '完成',
}

// ─── 声音：现场合成，不依赖外部文件 ──────────────────────────────
function useBeeper(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const ensureCtx = useCallback(() => {
    if (!enabled) return null
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctxRef.current = new AC()
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [enabled])

  const beep = useCallback((freq: number, durationMs: number, volume = 0.2) => {
    const ctx = ensureCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = volume
    osc.connect(gain)
    gain.connect(ctx.destination)
    const now = ctx.currentTime
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
    osc.start(now)
    osc.stop(now + durationMs / 1000)
  }, [ensureCtx])

  const tick = useCallback(() => beep(880, 100, 0.15), [beep])
  const goWork = useCallback(() => beep(1175, 280, 0.22), [beep])
  const goRest = useCallback(() => beep(440, 280, 0.18), [beep])
  const finish = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx) return
    ;[660, 880, 1175].forEach((f, i) => setTimeout(() => beep(f, 220, 0.22), i * 150))
  }, [beep, ensureCtx])

  return { ensureCtx, tick, goWork, goRest, finish }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch {}
  }
}

function TimerInner() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  // 三个数字输入框存成字符串——存成数字的话，用户一删空就会被立刻补回默认值，
  // 光标卡在那儿删不掉（只能在前面硬加数字，出现 "005" 这种）。
  // 存字符串就允许「暂时是空的」这个中间状态，用的时候再转数字。
  const [workInput, setWorkInput] = useState(() => searchParams.get('work') || '30')
  const [restInput, setRestInput] = useState(() => searchParams.get('rest') || '15')
  const [roundsInput, setRoundsInput] = useState(() => searchParams.get('rounds') || '3')
  const [label, setLabel] = useState(() => searchParams.get('name') || '')

  const workSec = Math.max(0, Math.floor(Number(workInput) || 0))
  const restSec = Math.max(0, Math.floor(Number(restInput) || 0))
  const rounds = Math.max(0, Math.floor(Number(roundsInput) || 0))
  const canStart = workSec >= 1 && rounds >= 1
  const [soundOn, setSoundOn] = useState(true)
  // 从课后作业点过来时带的动作 id，记录自我练习时能把动作一起记上
  const exerciseId = searchParams.get('ex') || ''

  // 一键记录到训练记录（自我练习）——只有学员本人能记自己的
  const isClient = userRole === 'CLIENT'
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedClassId, setSavedClassId] = useState('')

  const [phase, setPhase] = useState<Phase>('setup')
  const [remaining, setRemaining] = useState(0)
  const [round, setRound] = useState(1)
  const [paused, setPaused] = useState(false)

  const beeper = useBeeper(soundOn)
  const lastTickRef = useRef<number>(-1)
  const wakeLockRef = useRef<any>(null)

  // 屏幕常亮——手机做训练时不去碰屏幕，几十秒就自动锁屏了，一锁计时就停。
  // Wake Lock API：安卓 Chrome 和 iOS 16.4+ 的 Safari 都支持；不支持的浏览器静默跳过。
  // 注意：切到后台时系统会自动释放，所以回到前台要重新申请一次。
  useEffect(() => {
    const running = phase === 'ready' || phase === 'work' || phase === 'rest'

    const acquire = async () => {
      if (!running) return
      try {
        const nav = navigator as any
        if (nav.wakeLock?.request) {
          wakeLockRef.current = await nav.wakeLock.request('screen')
        }
      } catch { /* 用户拒绝或系统不支持，忽略即可 */ }
    }

    const release = () => {
      try { wakeLockRef.current?.release?.() } catch {}
      wakeLockRef.current = null
    }

    if (running) acquire()
    else release()

    const onVisible = () => { if (document.visibilityState === 'visible' && running) acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [phase])

  // 页面标题显示剩余秒数，切到别的标签页也能瞄一眼
  useEffect(() => {
    if (phase === 'setup') { document.title = 'MyFitnessPro'; return }
    if (phase === 'done') { document.title = '✅ 完成 — MyFitnessPro'; return }
    document.title = `${remaining}s · ${PHASE_LABEL[phase]} — 计时器`
  }, [phase, remaining])

  // 主计时循环
  useEffect(() => {
    if (phase === 'setup' || phase === 'done' || paused) return
    if (remaining <= 0) {
      // 阶段结束，切换到下一个阶段
      if (phase === 'ready') {
        beeper.goWork(); vibrate(200)
        setPhase('work')
        setRemaining(workSec)
      } else if (phase === 'work') {
        if (round >= rounds) {
          beeper.finish(); vibrate([150, 100, 150, 100, 300])
          setPhase('done')
        } else if (restSec > 0) {
          beeper.goRest(); vibrate(100)
          setPhase('rest')
          setRemaining(restSec)
        } else {
          // 没有间歇，直接进下一组
          beeper.goWork(); vibrate(200)
          setRound(r => r + 1)
          setRemaining(workSec)
        }
      } else if (phase === 'rest') {
        beeper.goWork(); vibrate(200)
        setRound(r => r + 1)
        setPhase('work')
        setRemaining(workSec)
      }
      return
    }
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, remaining, paused, round, rounds, workSec, restSec, beeper])

  // 最后 3 秒的滴答声/震动——出现在"准备"阶段和"休息"阶段快结束的时候
  useEffect(() => {
    if ((phase === 'ready' || phase === 'rest') && remaining > 0 && remaining <= 3 && remaining !== lastTickRef.current) {
      lastTickRef.current = remaining
      beeper.tick()
      vibrate(60)
    }
    if (remaining > 3) lastTickRef.current = -1
  }, [phase, remaining, beeper])

  const handleStart = () => {
    beeper.ensureCtx() // 必须在点击事件里初始化，不然浏览器不让自动出声
    setRound(1)
    setPhase('ready')
    setRemaining(3)
    setPaused(false)
    setSaveState('idle')
    setSaveError('')
    setSavedClassId('')
  }

  const handleRecord = useCallback(async () => {
    if (!user || saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving')
    setSaveError('')
    try {
      const res = await fetch('/api/self-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({
          name: label,
          exercise_id: exerciseId || undefined,
          work_sec: workSec,
          rest_sec: restSec,
          rounds,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '记录失败')
      setSavedClassId(data.id || '')
      setSaveState('saved')
    } catch (err: any) {
      setSaveState('error')
      setSaveError(err.message || '记录失败，请重试')
    }
  }, [user, userRole, saveState, label, exerciseId, workSec, restSec, rounds])

  // 练完自动记一条，不用再手动点一下——失败了下面会给重试按钮
  useEffect(() => {
    if (phase === 'done' && isClient && saveState === 'idle') handleRecord()
  }, [phase, isClient, saveState, handleRecord])

  const handleReset = () => {
    setPhase('setup')
    setPaused(false)
  }

  const isRunning = phase === 'ready' || phase === 'work' || phase === 'rest'
  const colors = COLORS[phase]
  const showWarnPulse = (phase === 'ready' || phase === 'rest') && remaining <= 3

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      color: colors.fg,
      transition: 'background-color 0.3s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexShrink: 0 }}>
        {phase === 'setup' ? (
          <Link href="/dashboard/workouts" style={{ color: colors.fg, opacity: 0.8, textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
        ) : (
          <button onClick={handleReset} style={{ background: 'none', border: 'none', color: colors.fg, opacity: 0.8, fontSize: 14, cursor: 'pointer', padding: 0 }}>
            ✕ 结束计时
          </button>
        )}
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600 }}>
          {label || '训练计时器'}
        </span>
        {phase !== 'setup' && (
          <button onClick={() => setSoundOn(v => !v)} style={{ background: 'none', border: 'none', color: colors.fg, fontSize: 18, cursor: 'pointer', padding: 0 }} title={soundOn ? '静音' : '开声音'}>
            {soundOn ? '🔊' : '🔇'}
          </button>
        )}
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {phase === 'setup' && (
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>动作名称（选填）</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="例：平板支撑"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>单组时长（秒）</label>
                  <input type="number" inputMode="numeric" min={1} value={workInput}
                    onChange={e => setWorkInput(e.target.value)}
                    onFocus={e => e.currentTarget.select()}
                    onBlur={() => setWorkInput(workSec >= 1 ? String(workSec) : '')}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>组间休息（秒）</label>
                  <input type="number" inputMode="numeric" min={0} value={restInput}
                    onChange={e => setRestInput(e.target.value)}
                    onFocus={e => e.currentTarget.select()}
                    onBlur={() => setRestInput(String(restSec))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--c-text-secondary)', marginBottom: 6 }}>重复次数（组数）</label>
                <input type="number" inputMode="numeric" min={1} value={roundsInput}
                  onChange={e => setRoundsInput(e.target.value)}
                  onFocus={e => e.currentTarget.select()}
                  onBlur={() => setRoundsInput(rounds >= 1 ? String(rounds) : '')}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleStart} disabled={!canStart}
                style={{
                  width: '100%', padding: 14,
                  background: canStart ? 'var(--c-brand)' : 'var(--c-lavender)',
                  color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700,
                  cursor: canStart ? 'pointer' : 'not-allowed',
                }}>
                ▶ 开始
              </button>
              {!canStart && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#c0392b' }}>
                  单组时长和组数都要填，且至少为 1
                </p>
              )}
              <p style={{ margin: '14px 0 0', fontSize: 12, color: '#999', lineHeight: 1.6 }}>
                开始前有 3 秒准备倒计时；每次休息快结束时也会有 3 秒提示音，提醒马上要开始下一组。计时期间屏幕会保持常亮，但请让这个页面留在前台，切到别的 App 可能会暂停计时。
                <br />
                <span style={{ color: '#bbb' }}>iPhone 用户：如果听不到提示音，检查一下手机侧面的静音开关（静音模式下网页声音会被系统挡掉）。</span>
              </p>
            </div>
          </div>
        )}

        {isRunning && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 15, opacity: 0.85, fontWeight: 600 }}>
              第 {round} / {rounds} 组 · {PHASE_LABEL[phase]}
            </p>
            <div style={{
              fontSize: showWarnPulse ? 140 : 120,
              fontWeight: 800,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              animation: showWarnPulse ? 'timerPulse 1s ease-in-out infinite' : 'none',
            }}>
              {remaining}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 14, opacity: 0.75 }}>
              {phase === 'ready' ? '准备开始…' : phase === 'work' ? '坚持住！' : round < rounds ? '休息一下' : '最后一组休息'}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center' }}>
              <button onClick={() => setPaused(p => !p)}
                style={{ padding: '10px 28px', borderRadius: 999, border: `1.5px solid ${colors.fg}`, background: 'transparent', color: colors.fg, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {paused ? '▶ 继续' : '⏸ 暂停'}
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800 }}>完成！</h2>
            <p style={{ margin: '0 0 24px', fontSize: 15, opacity: 0.9 }}>
              {label ? `${label} · ` : ''}共 {rounds} 组，做得很好
            </p>

            {/* 练完自动记进自己的训练记录，算作自我练习（只有学员本人会记） */}
            {isClient && (
              <div style={{ marginBottom: 28 }}>
                {saveState === 'saved' ? (
                  <>
                    <p style={{ margin: '0 0 14px', fontSize: 14, opacity: 0.95 }}>
                      ✓ 已记录在自我练习中
                    </p>
                    <Link
                      href={savedClassId ? `/dashboard/classes/${savedClassId}` : '/dashboard/classes'}
                      style={{
                        display: 'inline-block', padding: '12px 24px', borderRadius: 999,
                        background: 'white', color: '#2E7D32', textDecoration: 'none',
                        fontSize: 14, fontWeight: 700,
                      }}>
                      去看看这次的练习记录 →
                    </Link>
                  </>
                ) : saveState === 'error' ? (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.95 }}>⚠️ {saveError}</p>
                    <button onClick={handleRecord}
                      style={{
                        padding: '10px 22px', borderRadius: 999, border: '1.5px solid white',
                        background: 'rgba(255,255,255,0.15)', color: 'white',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}>
                      重试记录
                    </button>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>记录中…</p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleStart}
                style={{
                  padding: '12px 24px', borderRadius: 999, fontSize: 14, cursor: 'pointer',
                  // 学员那边主按钮是「去看看练习记录」，这里就退成次要样式，避免两个白按钮抢眼
                  border: isClient ? '1.5px solid white' : 'none',
                  background: isClient ? 'transparent' : 'white',
                  color: isClient ? 'white' : '#2E7D32',
                  fontWeight: isClient ? 600 : 700,
                }}>
                🔁 再来一遍
              </button>
              <button onClick={handleReset}
                style={{ padding: '12px 24px', borderRadius: 999, border: '1.5px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                重新设置
              </button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}

export default function TimerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>}>
      <TimerInner />
    </Suspense>
  )
}
