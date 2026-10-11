'use client'

import { useState } from 'react'
import { useLang } from '@/context/LanguageContext'

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
  const { t } = useLang()
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
    if (m === 'custom' && (!(Number(th) > 0) || !(Number(bo) > 0))) { setErr(t('「每满几节」和「送几节」都要填大于 0 的数', 'Both numbers must be greater than 0')); return }
    setSaving(true); setErr('')
    try {
      const patch: Parameters<typeof onSave>[0] = { loyalty_mode: m }
      if (m === 'custom') { patch.loyalty_threshold = Number(th); patch.loyalty_bonus = Number(bo) }
      if (Number(baseInput || 0) !== base) patch.loyalty_base_count = Number(baseInput || 0)
      await onSave(patch)
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } catch (e: any) {
      setErr(e.message || t('保存失败', 'Save failed'))
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
      <div style={{ fontSize: 13, fontWeight: 600, color: '#8a6d3b', marginBottom: 8 }}>{t('累计满赠', 'Loyalty bonus')}</div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <button style={radio(m === 'off')} onClick={() => setM('off')}>{t('不参加', 'Not enrolled')}</button>
        <button style={radio(m === 'default')} onClick={() => setM('default')}>
          {t('按默认规则', 'Default rule')}{studioDefault.enabled ? t(`（每满 ${studioDefault.threshold} 送 ${studioDefault.bonus}）`, ` (every ${studioDefault.threshold} → ${studioDefault.bonus} free)`) : t('（默认规则已关闭）', ' (default is off)')}
        </button>
        <button style={radio(m === 'custom')} onClick={() => setM('custom')}>{t('单独设', 'Custom')}</button>
      </div>

      {m === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, color: '#8a6d3b' }}>
          {t('每满', 'Every')}
          <input type="text" inputMode="numeric" value={th} onChange={e => setTh(e.target.value.replace(/\D/g, ''))} style={small} />
          {t('节，送', 'classes, give')}
          <input type="text" inputMode="numeric" value={bo} onChange={e => setBo(e.target.value.replace(/\D/g, ''))} style={small} />
          {t('节', 'free')}
        </div>
      )}

      {m !== 'off' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: '#8a6d3b' }}>
          {t('用系统之前已上', 'Classes before using the app:')}
          <input type="text" inputMode="numeric" value={baseInput} onChange={e => setBaseInput(e.target.value.replace(/\D/g, ''))} style={small} />
          <span style={{ color: '#b39866' }}>{t(`＋ 系统内已上 ${billableDone} 节 ＝ 累计`, `+ ${billableDone} in app = total`)} <b>{total}</b></span>
        </div>
      )}

      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#b39866', lineHeight: 1.6 }}>
        {m === 'off'
          ? t('学员默认不参加累计满赠，不会收到提醒。要参加就选「按默认规则」或「单独设」。买包送的节数在建课时包时填「赠送」。', 'Clients are not enrolled by default and get no reminders. Choose “Default rule” or “Custom” to enroll. For buy-N-get-M, fill “Bonus” when creating a package.')
          : effEnabled && effThreshold > 0
            ? t(`每满 ${effThreshold} 节送 ${effBonus} 节${total > 0 ? `，再上 ${effThreshold - (total % effThreshold)} 节到下一次` : ''}。`, `Every ${effThreshold} classes earns ${effBonus} free${total > 0 ? `; ${effThreshold - (total % effThreshold)} more to the next one` : ''}. `)
            : t('默认规则在「经营设置」里关掉了，选「按默认规则」也不会提醒；要给这个学员开，选「单独设」。', 'The default rule is off in Business settings, so “Default rule” won’t remind you; choose “Custom” to enable it for this client. ')}
        {t('只算私教和团课，自我练习不计入', 'Only private and group classes count; self-practice doesn’t')}{selfPractice > 0 ? t(`（另有 ${selfPractice} 节自我练习，没算进去）`, ` (${selfPractice} self-practice not counted)`) : ''}{t('。', '.')}
      </p>

      {(dirty || saved || err) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {dirty && (
            <button onClick={save} disabled={saving}
              style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: saving ? '#E0C9A0' : '#C99A3E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? t('保存中…', 'Saving…') : t('保存', 'Save')}
            </button>
          )}
          {saved && <span style={{ fontSize: 12, color: '#8a6d3b' }}>{t('✓ 已保存', '✓ Saved')}</span>}
          {err && <span style={{ fontSize: 12, color: '#C0504D' }}>{err}</span>}
        </div>
      )}
    </div>
  )
}
