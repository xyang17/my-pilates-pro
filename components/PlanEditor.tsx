'use client'

import { buildSteps, estimateSeconds, formatExact, stepLabel, PlanItem, WorkoutMode } from '@/lib/workoutEngine'

// 开始练之前的确认页主体：练法切换 + 动作列表（上下调序、单个跳过）+ 间隔休息 + 播放顺序预览。
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
  // 展开成完整的播放时间线，确认页逐条显示（跳过的、参数没填全的不会进来）
  const steps = buildSteps(plan, mode, transitionRest)
  const totalSec = estimateSeconds(steps)
  const workCount = steps.filter(s => s.type === 'work').length

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
            {/* ↑ 序号 ↓ 分开放，不叠成一列——叠着的两个小按钮在手机上太容易按反 */}
            {plan.length > 1 && (
              <button onClick={() => onMove(i, -1)} disabled={i === 0} title="上移"
                style={{
                  width: 32, height: 32, flexShrink: 0, borderRadius: 8, fontSize: 14,
                  border: '1px solid var(--c-border)', background: 'transparent',
                  cursor: i === 0 ? 'not-allowed' : 'pointer',
                  color: i === 0 ? '#ddd' : 'var(--c-text-secondary)',
                }}>↑</button>
            )}
            <span style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#bbb', flexShrink: 0 }}>{i + 1}</span>
            {plan.length > 1 && (
              <button onClick={() => onMove(i, 1)} disabled={i === plan.length - 1} title="下移"
                style={{
                  width: 32, height: 32, flexShrink: 0, borderRadius: 8, fontSize: 14,
                  border: '1px solid var(--c-border)', background: 'transparent',
                  cursor: i === plan.length - 1 ? 'not-allowed' : 'pointer',
                  color: i === plan.length - 1 ? '#ddd' : 'var(--c-text-secondary)',
                }}>↓</button>
            )}
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
            {/* 跳过按钮单独放最右边，跟调序箭头拉开距离，免得手指按错 */}
            <button onClick={() => onToggleSkip(i)}
              style={{
                flexShrink: 0, padding: '0 10px', height: 32, borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${p.skipped ? 'var(--c-brand)' : 'var(--c-border)'}`,
                background: p.skipped ? 'var(--c-fill-light)' : 'transparent',
                color: p.skipped ? 'var(--c-brand)' : 'var(--c-text-secondary)',
              }}>
              {p.skipped ? '已跳过' : '跳过'}
            </button>
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

      {/* 播放顺序：每一组、每一段休息都单独列出来，从头到尾逐条确认。
          按动作或按圈合并看着清爽，但没法确认「第2组之后到底歇多久」这种事。
          条目多的时候这里可以滚动，不会把页面撑得太长。 */}
      {steps.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-secondary)' }}>播放顺序</p>
            <p style={{ margin: 0, fontSize: 11, color: '#bbb' }}>共 {workCount} 组训练</p>
          </div>

          <div style={{
            maxHeight: 260, overflowY: 'auto',
            border: '1px solid var(--c-border)', borderRadius: 8,
            background: 'var(--c-fill-light)',
          }}>
            {steps.map((st, i) => {
              const isWork = st.type === 'work'
              // 训练组编号，休息不占号，一眼能数出练了几组
              const workNo = isWork ? steps.slice(0, i + 1).filter(s => s.type === 'work').length : null
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px',
                  borderBottom: i < steps.length - 1 ? '1px solid var(--c-border)' : 'none',
                  background: isWork ? 'var(--c-card-bg)' : 'transparent',
                }}>
                  <span style={{
                    width: 20, flexShrink: 0, textAlign: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: isWork ? 'var(--c-brand)' : 'transparent',
                  }}>
                    {workNo ?? ''}
                  </span>
                  <span style={{
                    flex: 1, minWidth: 0, fontSize: 12,
                    color: isWork ? 'var(--c-text-primary)' : '#999',
                    fontWeight: isWork ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {stepLabel(st, plan, mode)}
                  </span>
                  <span style={{
                    flexShrink: 0, fontSize: 12, fontVariantNumeric: 'tabular-nums',
                    color: isWork ? 'var(--c-text-primary)' : '#aaa',
                    fontWeight: isWork ? 600 : 400,
                  }}>
                    {st.seconds}秒
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--c-text-secondary)' }}>总时长</span>
            <span style={{ fontWeight: 700, color: 'var(--c-text-primary)' }}>{formatExact(totalSec)}</span>
          </div>
        </div>
      )}
    </>
  )
}
