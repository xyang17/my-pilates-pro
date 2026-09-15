'use client'

import { PlanItem, WorkoutMode } from '@/lib/workoutEngine'

// 开始练之前的确认页主体：练法切换 + 动作列表（上下调序、单个跳过）+ 间隔休息。
// 课后作业连播和计时器共用，两边的确认页长一样，学员不用学两套。

export default function PlanEditor({
  plan, mode, transitionRest, onMode, onTransitionRest, onMove, onToggleSkip,
}: {
  plan: PlanItem[]
  mode: WorkoutMode
  transitionRest: number
  onMode: (m: WorkoutMode) => void
  onTransitionRest: (v: number) => void
  onMove: (idx: number, dir: -1 | 1) => void
  onToggleSkip: (idx: number) => void
}) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--c-text-secondary)' }}>练法</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['circuit', '循环'], ['sequential', '顺序']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => onMode(val)}
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
          {mode === 'circuit' ? '动作 1→2→3 做一圈，再从头重复' : '一个动作做完全部组数，再进入下一个'}
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 12 }}>
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
              <button onClick={() => onMove(i, -1)} disabled={i === 0}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === 0 ? 'not-allowed' : 'pointer', color: i === 0 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12 }}>↑</button>
              <button onClick={() => onMove(i, 1)} disabled={i === plan.length - 1}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: i === plan.length - 1 ? 'not-allowed' : 'pointer', color: i === plan.length - 1 ? '#ddd' : 'var(--c-text-secondary)', fontSize: 12 }}>↓</button>
              <button onClick={() => onToggleSkip(i)}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--c-border)', marginTop: 12 }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text-secondary)' }}>
          {mode === 'circuit' ? '轮次间休息' : '动作间休息'}
        </span>
        <button onClick={() => onTransitionRest(Math.max(0, transitionRest - 5))}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)' }}>−</button>
        <span style={{ minWidth: 48, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>{transitionRest}秒</span>
        <button onClick={() => onTransitionRest(transitionRest + 5)}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--c-text-secondary)' }}>＋</button>
      </div>
    </>
  )
}
