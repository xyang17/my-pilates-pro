'use client'

import { useState } from 'react'

// 学员页「课时包」里的满赠设置：规则（跟随默认 / 单独设 / 不参加）+ 系统外历史节数。
// 规则的解释在 lib/loyaltyRule.ts。「买 N 送 M」是建课时包时填的，不在这里。

type Mode = 'default' | 'custom' | 'off'

export function LoyaltyRuleEditor({
  mode, threshold, bonus, studioDefault, base, billableDone, selfPractice, onSave,
}: {
  mode: Mode
  threshold: number | null          // 学员单独设的（mode=custom 时有意义）
  bonus: number | null
  studioDefault: { enabled: boolean; threshold: number; bonus: number }
  base: number
  billableDone: number
  selfPractice: number
  onSave: (patch: { loyalty_mode?: Mode; loyalty_threshold?: number | null; loyalty_bonus?: number | null; loyalty_base_count?: number }) => Promise<void>
}) {
  const [m, setM] = useState<Mode>(mode)
  const [th, setTh] = useState(threshold ? String(threshold) : String(studioDefault.threshold))
  const [bo, setBo] = useState(bonus ? String(bonus) : String(studioDefault.bonus))
  const [baseInput, setBaseInput] = useState(String(base))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const dirty =
    m !== mode ||
    (m === 'custom' && (Number(th) !== (threshold ?? studioDefault.threshold) || Number(bo) !== (bonus ?? studioDefault.bonus))) ||
    (Number(baseInput || 0) !== base)

  const save = async () => {
    if (saving || !dirty) return
    if (m === 'custom' && (!(Number(th) > 0) || !(Number(bo) > 0))) { setErr('「每满几节」和「送几节」都要填大于 0 的数'); return }
    setSaving(true); setErr('')
    try {
      const patch: Parameters<typeof onSave>[0] = { loyalty_mode: m }
      if (m === 'custom') { patch.loyalty_threshold = Number(th); patch.loyalty_bonus = Number(bo) }
      if (Number(baseInput || 0) !== base) patch.loyalty_base_count = Number(baseInput || 0)
      await onSave(patch)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      setErr(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const effThreshold = m === 'custom' ? Number(th) || 0 : studioDefault.threshold
  const effBonus = m === 'custom' ? Number(bo) || 0 : studioDefault.bonus
  const effEnabled = m === 'custom' ? true : m === 'off' ? false : studioDefault.enabled
  const total = (Number(baseInput) || 0) + billableDone

  const small: React.CSSProperties = {
    width: 48, padding: '5px 6px', border: '1px solid #E0C9A0', borderRadius: 6, fontSize: 13, textAlign: 'center', boxSizing: 'border-box', background: '#fff',
  }
  const radio = (on: boolean): React.CSSProperties => ({
    padding: '5px 11px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
    border: `1px solid ${on ? '#C99A3E' : '#E8D9BA'}`, background: on ? '#C99A3E' : '#fff', color: on ? '#fff' : '#8a6d3b', fontWeight: on ? 600 : 400,
  })

  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--c-border)', background: '#FFFBF2' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#8a6d3b', marginBottom: 8 }}>累计满赠</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <button style={radio(m === 'default')} onClick={() => setM('default')}>
          跟随默认{studioDefault.enabled ? `（每满 ${studioDefault.threshold} 送 ${studioDefault.bonus}）` : '（默认已关闭）'}
        </button>
        <button style={radio(m === 'custom')} onClick={() => setM('custom')}>单独设</button>
        <button style={radio(m === 'off')} onClick={() => setM('off')}>不参加</button>
      </div>

      {m === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#8a6d3b' }}>
          每满
          <input type="text" inputMode="numeric" value={th} onChange={e => setTh(e.target.value.replace(/\D/g, ''))} style={small} />
          节，送
          <input type="text" inputMode="numeric" value={bo} onChange={e => setBo(e.target.value.replace(/\D/g, ''))} style={small} />
          节
        </div>
      )}

      {m !== 'off' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: '#8a6d3b' }}>
          用系统之前已上
          <input type="text" inputMode="numeric" value={baseInput} onChange={e => setBaseInput(e.target.value.replace(/\D/g, ''))} style={small} />
          节
          <span style={{ color: '#b39866' }}>＋ 系统内已上 {billableDone} 节 ＝ 累计 <b>{total}</b> 节</span>
        </div>
      )}

      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b39866', lineHeight: 1.6 }}>
        {m === 'off'
          ? '这个学员不参加累计满赠，不会收到提醒。买包送的节数在建课时包时填「赠送」。'
          : effEnabled && effThreshold > 0
            ? `每满 ${effThreshold} 节送 ${effBonus} 节${total > 0 ? `，再上 ${effThreshold - (total % effThreshold)} 节到下一次` : ''}。`
            : '默认规则已关闭，这个学员不会收到满赠提醒；要单独给这个学员开，选「单独设」。'}
        只算私教和团课，自我练习不计入{selfPractice > 0 ? `（另有 ${selfPractice} 节自我练习，没算进去）` : ''}。
      </p>

      {(dirty || saved || err) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {dirty && (
            <button onClick={save} disabled={saving}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: saving ? '#E0C9A0' : '#C99A3E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? '保存中…' : '保存'}
            </button>
          )}
          {saved && <span style={{ fontSize: 12, color: '#8a6d3b' }}>✓ 已保存</span>}
          {err && <span style={{ fontSize: 12, color: '#C0504D' }}>{err}</span>}
        </div>
      )}
    </div>
  )
}
