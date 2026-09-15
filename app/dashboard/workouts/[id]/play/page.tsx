'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import WorkoutRunner, { RunnerResult } from '@/components/WorkoutRunner'
import PlanEditor from '@/components/PlanEditor'
import { buildSteps, estimateSeconds, formatDuration, PlanItem, WorkoutMode } from '@/lib/workoutEngine'

// 课后作业「连播」：点一次从头跑到尾，自动倒计时、自动休息、自动切下一个动作。
//
// 只串联「计时型」动作（填了时长的）。计次型（只有次数没时长）暂时不进播放器，
// 学员在作业列表里自己做完打勾——界面上会明确说明，免得以为程序漏掉了。
//
// 排程逻辑在 lib/workoutEngine，运行界面在 components/WorkoutRunner，
// 跟计时器页面共用，这里只负责「开始前的确认页」和「练完怎么记录」。

interface HwExercise {
  id: string
  sets?: number | null
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
  circuit_mode?: WorkoutMode
  transition_rest_sec?: number | null
  homework_exercise: HwExercise[]
}

const DEFAULT_REST = 20

export default function WorkoutPlayerPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id as string

  const [hw, setHw] = useState<Homework | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [plan, setPlan] = useState<PlanItem[]>([])
  const [mode, setMode] = useState<WorkoutMode>('sequential')
  const [transitionRest, setTransitionRest] = useState(30)

  const [stage, setStage] = useState<'setup' | 'running' | 'done'>('setup')
  const [result, setResult] = useState<RunnerResult | null>(null)

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedClassId, setSavedClassId] = useState('')
  const [hwCompleted, setHwCompleted] = useState(false)

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

      setPlan(
        (data.homework_exercise || [])
          .filter(e => e.duration != null && Number(e.duration) > 0)
          .sort((a, b) => a.order_num - b.order_num)
          .map(e => ({
            key: e.id,
            exerciseId: e.master_exercise?.id || null,
            name: e.master_exercise?.name_cn || e.master_exercise?.name_en || '动作',
            imageUrl: e.master_exercise?.featured_image_url,
            // 时长统一换算成秒
            workSec: e.duration_unit === 'minutes' ? Number(e.duration) * 60 : Number(e.duration),
            sets: Number(e.sets) || 1,
            restSec: e.rest_sec == null ? DEFAULT_REST : Number(e.rest_sec),
            skipped: false,
          }))
      )
    } catch (err: any) {
      setLoadError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const active = plan.filter(p => !p.skipped)
  const estimated = useMemo(
    () => estimateSeconds(buildSteps(plan, mode, transitionRest)),
    [plan, mode, transitionRest]
  )

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

  const handleExit = (r: RunnerResult) => {
    const anyDone = Object.values(r.doneSets).some(v => v > 0)
    if (!anyDone) { setStage('setup'); return }
    setResult(r)
    setSaveState('idle'); setSaveError(''); setSavedClassId(''); setHwCompleted(false)
    setStage('done')
  }

  const handleRecord = async () => {
    if (!user || !result || saveState === 'saving' || saveState === 'saved') return
    setSaveState('saving'); setSaveError('')
    try {
      const res = await fetch('/api/self-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'x-user-role': userRole || '' },
        body: JSON.stringify({
          homework_id: homeworkId,
          title: hw?.title || '课后作业',
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
      setHwCompleted(!!data.homework_completed)
      setSaveState('saved')
    } catch (err: any) {
      setSaveState('error')
      setSaveError(err.message || '记录失败，请重试')
    }
  }

  useEffect(() => {
    if (stage === 'done' && saveState === 'idle') handleRecord()
  }, [stage, saveState])

  if (authLoading || loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>
  if (loadError || !hw) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p>{loadError || '作业未找到'}</p>
      <Link href="/dashboard/workouts" style={{ color: 'var(--c-brand)' }}>← 返回课后作业</Link>
    </div>
  )

  if (stage === 'running') {
    return (
      <WorkoutRunner
        plan={plan} mode={mode} transitionRest={transitionRest}
        title={hw.title} onExit={handleExit}
      />
    )
  }

  if (stage === 'done' && result) {
    return (
      <div style={{ minHeight: '100vh', background: '#66BB6A', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center' }}>
          <Link href="/dashboard/workouts" style={{ color: '#fff', opacity: 0.9, textDecoration: 'none', fontSize: 14 }}>← 返回作业</Link>
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
              <button onClick={() => setStage('setup')}
                style={{ padding: '10px 22px', borderRadius: 999, border: '1.5px solid white', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                再练一次
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 开始前的确认页 ──
  const repsOnlyCount = (hw.homework_exercise || []).filter(e => !(e.duration != null && Number(e.duration) > 0)).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{ padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/dashboard/workouts" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← 返回</Link>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hw.title}
        </span>
      </header>

      <main style={{ padding: 20, maxWidth: 420, margin: '0 auto' }}>
        {plan.length === 0 ? (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 28, textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>这份作业没有可连播的动作</p>
            <p style={{ margin: 0, fontSize: 13, color: '#999', lineHeight: 1.7 }}>
              连播只支持设了「时长」的动作。这份作业里的动作都是按次数做的，回到作业列表按自己的节奏完成就好。
            </p>
            <Link href="/dashboard/workouts" style={{ display: 'inline-block', marginTop: 16, color: 'var(--c-brand)', fontSize: 14 }}>
              ← 返回课后作业
            </Link>
          </div>
        ) : (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
            <PlanEditor
              plan={plan} mode={mode} transitionRest={transitionRest}
              onMode={setMode} onTransitionRest={setTransitionRest}
              onMove={move} onToggleSkip={toggleSkip}
            />

            <p style={{ margin: '14px 0 10px', textAlign: 'right', fontSize: 13, color: 'var(--c-text-secondary)' }}>
              {active.length === 0 ? '全部跳过了' : formatDuration(estimated)}
            </p>

            <button onClick={() => setStage('running')} disabled={active.length === 0}
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
                这份作业里还有 {repsOnlyCount} 个按次数做的动作没进连播（连播只带计时的动作），回作业列表里自己做完打勾就行。
              </p>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#bbb', lineHeight: 1.6 }}>
              练的时候屏幕会保持常亮，手机可以放在旁边不用管。iPhone 听不到提示音的话，检查一下侧面的静音开关。
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
