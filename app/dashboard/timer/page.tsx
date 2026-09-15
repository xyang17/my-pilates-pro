'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import WorkoutRunner, { RunnerResult } from '@/components/WorkoutRunner'
import PlanEditor from '@/components/PlanEditor'
import { buildSteps, estimateSeconds, formatDuration, PlanItem, WorkoutMode } from '@/lib/workoutEngine'

// 训练计时器：临时自己组一套动作来练，不需要有课后作业。
//
// 跟课后作业连播是同一套引擎（lib/workoutEngine）和同一个播放界面（components/WorkoutRunner），
// 区别只在于：作业那边的动作是教练排好的，这里是自己现填的。
//
// ─── 提醒方式 ──────────────────────────────────────────────
//   1. 声音——Web Audio 现场合成，不依赖外部音频文件/CDN（国内 CDN 加载失败的坑绕开）。
//      浏览器限制第一次必须在点击之后才能出声，所以点「开始」那一刻才初始化。
//   2. 颜色——整屏背景随阶段切换，最后 3 秒数字跳动。
//   3. 震动——安卓 Chrome 支持；iOS Safari 不支持震动 API，这是系统限制。
//   4. 网页标题——切到别的标签页时标题显示剩余秒数。
//   5. 屏幕常亮——Wake Lock，安卓 Chrome 和 iOS 16.4+ Safari 支持。
// 没做浏览器系统通知：手机锁屏/切后台时不一定触发，与其给个不可靠的提醒，
// 不如明确告诉用户把页面留在前台。

// 数字输入框。故意用 type="text" + inputMode="numeric" 而不是 type="number"：
//
// type="number" 在受控组件里，浏览器只要认为当前内容「不是合法数字」，
// e.target.value 就返回空字符串，用户敲的那一下等于被吞掉。手机上尤其明显，
// 表现出来就是「这个 1 怎么都删不掉」「必须先填别的数字才能改」。
//
// 换成 text + inputMode="numeric"，手机照样弹数字键盘，输入原样传回来，自己用正则只留数字。
// 不自动补默认值、不在失焦时改写用户输入——空着就空着，旁边给提示，别跟用户的光标抢。
//
// 注意：必须定义在页面组件外面。定义在里面每次 render 都是新组件类型，
// React 会把 input 卸载重建，焦点每敲一个字丢一次。
function NumCell({ value, onChange, width = 52, placeholder }: {
  value: string
  onChange: (v: string) => void
  width?: number
  placeholder?: string
}) {
  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*"
      value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      style={{
        width, padding: '8px 6px', border: '1px solid #ddd', borderRadius: 8,
        fontSize: 14, textAlign: 'center', boxSizing: 'border-box',
      }}
    />
  )
}

interface DraftItem {
  key: string
  name: string
  work: string
  sets: string
  rest: string
  exerciseId?: string | null
  skipped: boolean
}

let seq = 0
const newItem = (partial?: Partial<DraftItem>): DraftItem => ({
  key: `d${++seq}`,
  name: '', work: '30', sets: '3', rest: '15',
  exerciseId: null, skipped: false,
  ...partial,
})

function TimerInner() {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  // 从课后作业的「⏱ 计时」按钮跳过来时，带着那个动作的参数预填第一行
  const [items, setItems] = useState<DraftItem[]>(() => [newItem({
    name: searchParams.get('name') || '',
    work: searchParams.get('work') || '30',
    sets: searchParams.get('rounds') || '3',
    rest: searchParams.get('rest') || '15',
    exerciseId: searchParams.get('ex') || null,
  })])
  const [mode, setMode] = useState<WorkoutMode>('sequential')
  const [transitionRest, setTransitionRest] = useState(30)

  // setup 填动作 → confirm 确认最终播放顺序 → running 播放 → done
  // 只有一个动作时没什么可确认的，直接开始，不给单动作场景加多余一步
  const [stage, setStage] = useState<'setup' | 'confirm' | 'running' | 'done'>('setup')
  const [result, setResult] = useState<RunnerResult | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedClassId, setSavedClassId] = useState('')

  const isClient = userRole === 'CLIENT'

  // 草稿 → 引擎认识的 plan
  const plan: PlanItem[] = useMemo(() => items.map((it, i) => ({
    key: it.key,
    exerciseId: it.exerciseId,
    name: it.name.trim() || `动作 ${i + 1}`,
    workSec: Number(it.work) || 0,
    sets: Number(it.sets) || 0,
    restSec: Number(it.rest) || 0,
    skipped: it.skipped,
  })), [items])

  const validCount = plan.filter(p => !p.skipped && p.workSec >= 1 && p.sets >= 1).length
  const estimated = useMemo(
    () => estimateSeconds(buildSteps(plan, mode, transitionRest)),
    [plan, mode, transitionRest]
  )

  const update = (idx: number, field: keyof DraftItem, v: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: v } : it))
  const remove = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) => setItems(prev => {
    const next = [...prev]
    const t = idx + dir
    if (t < 0 || t >= next.length) return prev
    ;[next[idx], next[t]] = [next[t], next[idx]]
    return next
  })
  const toggleSkip = (idx: number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, skipped: !it.skipped } : it))

  const handleExit = (r: RunnerResult) => {
    const anyDone = Object.values(r.doneSets).some(v => v > 0)
    if (!anyDone) { setStage('setup'); return }
    setResult(r)
    setSaveState('idle'); setSaveError(''); setSavedClassId('')
    setStage('done')
  }

  // 练完自动记一条自我练习（只有学员本人会记，教练账号不记）
  const handleRecord = async () => {
    if (!user || !result || saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving'); setSaveError('')
    try {
      const names = plan.filter(p => !p.skipped).map(p => p.name)
      const title = names.length <= 1 ? (names[0] || '自我练习') : `${names[0]} 等${names.length}个动作`
      const res = await fetch('/api/self-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({
          title,
          circuit_mode: mode,
          exercises: plan.map((p, idx) => ({
            exercise_id: p.exerciseId,
            name: p.name,
            work_sec: p.workSec,
            rest_sec: p.restSec,
            planned_sets: p.sets,
            done_sets: result.doneSets[idx] || 0,
            skipped: p.skipped,
          })),
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
  }

  useEffect(() => {
    if (stage === 'done' && isClient && saveState === 'idle') handleRecord()
  }, [stage, isClient, saveState])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>

  // ── 确认页：最终播放顺序、组数，可以用箭头调序或临时跳过 ──
  if (stage === 'confirm') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
        <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setStage('setup')}
            style={{ background: 'none', border: 'none', color: 'var(--c-text-secondary)', fontSize: 14, cursor: 'pointer', padding: 0 }}>
            ← 改动作
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>开始前确认</span>
        </header>

        <main style={{ padding: 20, maxWidth: 460, margin: '0 auto' }}>
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
            <PlanEditor
              plan={plan} mode={mode} transitionRest={transitionRest}
              onMode={setMode} onTransitionRest={setTransitionRest}
              onMove={move} onToggleSkip={toggleSkip}
            />

            <p style={{ margin: '14px 0 10px', textAlign: 'right', fontSize: 13, color: 'var(--c-text-secondary)' }}>
              {validCount === 0 ? '全部跳过了' : formatDuration(estimated)}
            </p>

            <button onClick={() => setStage('running')} disabled={validCount === 0}
              style={{
                width: '100%', padding: 14, borderRadius: 10, border: 'none',
                background: validCount === 0 ? 'var(--c-lavender)' : 'var(--c-brand)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                cursor: validCount === 0 ? 'not-allowed' : 'pointer',
              }}>
              ▶ 开始练
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (stage === 'running') {
    const names = plan.filter(p => !p.skipped).map(p => p.name)
    return (
      <WorkoutRunner
        plan={plan} mode={mode} transitionRest={transitionRest}
        title={names.length <= 1 ? (names[0] || '训练计时器') : '训练计时器'}
        onExit={handleExit}
      />
    )
  }

  if (stage === 'done' && result) {
    return (
      <div style={{ minHeight: '100vh', background: '#66BB6A', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setStage('setup')}
            style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.9, fontSize: 14, cursor: 'pointer', padding: 0 }}>
            ← 返回设置
          </button>
        </header>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 64, marginBottom: 10 }}>🎉</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>
              {result.finished ? '练完了！' : '这次就到这儿'}
            </h2>

            <div style={{ margin: '16px 0 22px', textAlign: 'left', background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px' }}>
              {plan.map((p, idx) => {
                const d = result.doneSets[idx] || 0
                return (
                  <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', opacity: p.skipped ? 0.6 : 1 }}>
                    <span>{p.name}</span>
                    <span>{p.skipped ? '跳过' : d >= p.sets ? `${d} 组 ✓` : `${d}/${p.sets} 组`}</span>
                  </div>
                )
              })}
            </div>

            {isClient ? (
              saveState === 'saved' ? (
                <>
                  <p style={{ margin: '0 0 14px', fontSize: 14, opacity: 0.95 }}>✓ 已记录在自我练习中</p>
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
              )
            ) : null}

            <div style={{ marginTop: 22, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setStage('running')}
                style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                🔁 再来一遍
              </button>
              <button onClick={() => setStage('setup')}
                style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                重新设置
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 设置页 ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>训练计时器</span>
      </header>

      <main style={{ padding: 20, maxWidth: 460, margin: '0 auto' }}>
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--c-text-secondary)' }}>练什么</p>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: '#aaa' }}>
            可以加多个动作，顺序练或循环练都行
          </p>

          {items.map((it, i) => (
            <div key={it.key} style={{
              padding: '10px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--c-border)' : 'none',
              opacity: it.skipped ? 0.45 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 16, fontSize: 12, color: '#bbb', flexShrink: 0 }}>{i + 1}</span>
                <input
                  value={it.name}
                  onChange={e => update(i, 'name', e.target.value)}
                  placeholder={`动作名称（选填）`}
                  style={{ flex: 1, minWidth: 0, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
                {items.length > 1 && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12, flexShrink: 0 }}>↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === items.length - 1 ? 'not-allowed' : 'pointer', color: i === items.length - 1 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12, flexShrink: 0 }}>↓</button>
                    <button onClick={() => remove(i)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#ccc', fontSize: 14, flexShrink: 0 }}>✕</button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24, flexWrap: 'wrap' }}>
                <NumCell value={it.work} onChange={v => update(i, 'work', v)} placeholder="秒" />
                <span style={{ fontSize: 12, color: '#999' }}>秒 ×</span>
                <NumCell value={it.sets} onChange={v => update(i, 'sets', v)} placeholder="组" />
                <span style={{ fontSize: 12, color: '#999' }}>组 · 歇</span>
                <NumCell value={it.rest} onChange={v => update(i, 'rest', v)} placeholder="秒" />
                <span style={{ fontSize: 12, color: '#999' }}>秒</span>
                {(it.work === '' || Number(it.work) < 1 || it.sets === '' || Number(it.sets) < 1) && !it.skipped && (
                  <span style={{ fontSize: 11, color: '#c0392b' }}>时长和组数要填</span>
                )}
              </div>
            </div>
          ))}

          <button onClick={() => setItems(prev => [...prev, newItem()])}
            style={{
              width: '100%', marginTop: 12, padding: '10px', borderRadius: 8,
              border: '1px dashed var(--c-brand)', background: 'transparent',
              color: 'var(--c-brand)', fontSize: 14, cursor: 'pointer',
            }}>
            ＋ 再加一个动作
          </button>

          <p style={{ margin: '14px 0 10px', textAlign: 'right', fontSize: 13, color: 'var(--c-text-secondary)' }}>
            {validCount === 0 ? '还没有可以练的动作' : formatDuration(estimated)}
          </p>

          {/* 多个动作时先过一遍确认页（看最终顺序、选练法）；单个动作没什么可确认的，直接开始 */}
          <button
            onClick={() => setStage(items.length > 1 ? 'confirm' : 'running')}
            disabled={validCount === 0}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: 'none',
              background: validCount === 0 ? 'var(--c-lavender)' : 'var(--c-brand)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: validCount === 0 ? 'not-allowed' : 'pointer',
            }}>
            {items.length > 1 ? '下一步：确认顺序' : '▶ 开始'}
          </button>

          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#999', lineHeight: 1.6 }}>
            开始前有 3 秒准备倒计时；休息快结束时也会有 3 秒提示音。计时期间屏幕保持常亮，但请让这个页面留在前台，切到别的 App 可能会暂停计时。
            <br />
            <span style={{ color: '#bbb' }}>iPhone 用户：听不到提示音的话，检查一下手机侧面的静音开关。</span>
          </p>
        </div>
      </main>
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
