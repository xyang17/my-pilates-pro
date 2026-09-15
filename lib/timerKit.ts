'use client'

import { useCallback, useEffect, useRef } from 'react'

// 计时器和作业连播共用的三件套：提示音、震动、屏幕常亮。
// 抽出来是为了避免两个页面各存一份、以后改一处忘另一处。

// ─── 提示音 ────────────────────────────────────────────────
// 用 Web Audio API 现场合成，不依赖外部音频文件/CDN
//（项目里踩过 CDN 在国内加载失败的坑，这里完全绕开）。
// 浏览器有自动播放限制：第一次必须在用户点击之后才能真正出声，
// 所以 ensureCtx 要在「开始」这类点击事件里调一次。
export function useBeeper(enabled: boolean) {
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

// ─── 震动 ──────────────────────────────────────────────────
// 安卓 Chrome 支持；iOS Safari 不支持震动 API，在 iPhone 上静默失效，这是系统限制。
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch {}
  }
}

// ─── 屏幕常亮 ──────────────────────────────────────────────
// 训练时不去碰屏幕，手机几十秒就自动锁屏，一锁计时就停。
// 安卓 Chrome 和 iOS 16.4+ Safari 都支持；不支持的浏览器静默跳过。
// 切到后台系统会自动释放，所以回到前台要重新申请。
export function useWakeLock(active: boolean) {
  const lockRef = useRef<any>(null)

  useEffect(() => {
    const acquire = async () => {
      if (!active) return
      try {
        const nav = navigator as any
        if (nav.wakeLock?.request) lockRef.current = await nav.wakeLock.request('screen')
      } catch { /* 用户拒绝或系统不支持，忽略 */ }
    }
    const release = () => {
      try { lockRef.current?.release?.() } catch {}
      lockRef.current = null
    }

    if (active) acquire()
    else release()

    const onVisible = () => { if (document.visibilityState === 'visible' && active) acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [active])
}
