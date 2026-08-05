// ============================================================
// L0 基础数据层 · 字段配置与计算工具
// 参考框架 V4 Sheet 01 / Sheet 07（合规）/ Sheet 08（月报规则）
//
// 合规红线（Sheet 07 第 15 项）：
//   本文件产出的所有文案一律为「事实陈述 + 建议咨询」句式。
//   禁止出现「你有肌少症」「心肺功能异常」这类判断式表述。
// ============================================================

import type {
  ChangeVerdict, DisplayGroup, FieldChange, L0BodyMetricFull,
  L0FieldMeta, Sex, UnitPreference,
} from '@/types/l0'

// ─── 录入字段配置 ────────────────────────────────────────────

export interface L0FieldConfig {
  key: string
  label: string
  unit: string
  step: number
  group: DisplayGroup
  /** 数据库 GENERATED 列，前端只读 */
  derived?: boolean
  /** 录入提示。多数来自框架的「常见坑」列 */
  hint?: string
  fieldId?: string
}

/** 基础：身高体重。B03 / B04 / B05 */
export const L0_BASIC_FIELDS: L0FieldConfig[] = [
  { key: 'height_cm', label: '身高', unit: 'cm', step: 0.1, group: 'BASIC', fieldId: 'B03',
    hint: '晨起比睡前高 1–2 cm，固定测量时间可减少噪声' },
  { key: 'weight_kg', label: '体重', unit: 'kg', step: 0.1, group: 'BASIC', fieldId: 'B04',
    hint: '建议晨起空腹排空后测；单次波动无意义，看 7 日均值' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²', step: 0.01, group: 'BASIC', derived: true, fieldId: 'B05',
    hint: '肌肉量大的人会被误判为超重，必须与体脂率联合解读' },
]

/** 体成分：BIA / DEXA 读数。B06 – B14 */
export const L0_COMPOSITION_FIELDS: L0FieldConfig[] = [
  { key: 'body_fat_pct', label: '体脂率', unit: '%', step: 0.1, group: 'COMPOSITION', fieldId: 'B06',
    hint: 'BIA 受水合状态影响大（±3%），须固定条件测量：晨起、空腹、排空、未运动' },
  { key: 'fat_mass_kg', label: '脂肪量', unit: 'kg', step: 0.01, group: 'COMPOSITION', derived: true, fieldId: 'B07',
    hint: '减脂期看这个而非体重' },
  { key: 'ffm_kg', label: '去脂体重', unit: 'kg', step: 0.01, group: 'COMPOSITION', derived: true, fieldId: 'B08',
    hint: '减脂期首要目标是这个不掉' },
  { key: 'smm_kg', label: '骨骼肌量（全身）', unit: 'kg', step: 0.01, group: 'COMPOSITION', fieldId: 'B09',
    hint: '跨设备不可直接比较；与四肢骨骼肌量不是同一个量' },
  { key: 'asm_kg', label: '四肢骨骼肌量', unit: 'kg', step: 0.01, group: 'COMPOSITION',
    hint: '留空则由四肢节段瘦组织自动求和。这是 SMI 的正确分子' },
  { key: 'smi', label: 'SMI 四肢骨骼肌指数', unit: 'kg/m²', step: 0.01, group: 'COMPOSITION', derived: true, fieldId: 'B10' },
  { key: 'ffmi', label: 'FFMI 去脂体重指数', unit: 'kg/m²', step: 0.01, group: 'COMPOSITION', derived: true, fieldId: 'B11',
    hint: '比 BMI 更能反映「练得怎么样」' },
  { key: 'visceral_fat_level', label: '内脏脂肪等级', unit: '级', step: 0.1, group: 'COMPOSITION', fieldId: 'B12',
    hint: '消费级 BIA 通常给等级；高阶设备给面积（cm²）' },
  { key: 'visceral_fat_area', label: '内脏脂肪面积', unit: 'cm²', step: 0.1, group: 'COMPOSITION', fieldId: 'B12' },
  { key: 'protein_kg', label: '蛋白质', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'mineral_kg', label: '无机盐', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'tbw_l', label: '身体总水分', unit: 'L', step: 0.1, group: 'COMPOSITION', fieldId: 'B13' },
  { key: 'ecw_tbw_ratio', label: '细胞外水比 ECW/TBW', unit: '', step: 0.001, group: 'COMPOSITION', fieldId: 'B13',
    hint: '仅高阶 BIA 提供。突然升高可能与恢复不足有关，作辅助信号' },
  { key: 'bmr_device', label: '基础代谢率（设备读数）', unit: 'kcal', step: 1, group: 'COMPOSITION', fieldId: 'B14',
    hint: '设备给的 BMR 是公式估算不是实测，不可当精确值宣称' },
  { key: 'bmr_katch', label: '基础代谢率（Katch-McArdle）', unit: 'kcal', step: 1, group: 'COMPOSITION', derived: true, fieldId: 'B14' },
]

/** 节段分析：四肢之和即 ASM，同时可算左右对称性 */
export const L0_SEGMENTAL_FIELDS: L0FieldConfig[] = [
  { key: 'seg_lean_arm_l', label: '左上肢瘦组织', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_lean_arm_r', label: '右上肢瘦组织', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_lean_trunk', label: '躯干瘦组织', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_lean_leg_l', label: '左下肢瘦组织', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_lean_leg_r', label: '右下肢瘦组织', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_fat_arm_l', label: '左上肢脂肪', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_fat_arm_r', label: '右上肢脂肪', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_fat_trunk', label: '躯干脂肪', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_fat_leg_l', label: '左下肢脂肪', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
  { key: 'seg_fat_leg_r', label: '右下肢脂肪', unit: 'kg', step: 0.01, group: 'COMPOSITION' },
]

/** 围度：软尺实测。B15 – B18 */
export const L0_GIRTH_FIELDS: L0FieldConfig[] = [
  { key: 'waist_cm', label: '腰围', unit: 'cm', step: 0.1, group: 'GIRTH', fieldId: 'B15',
    hint: '测量位置必须统一（推荐髂嵴上缘水平），否则前后不可比' },
  { key: 'hip_cm', label: '臀围', unit: 'cm', step: 0.1, group: 'GIRTH', fieldId: 'B16',
    hint: '臀部最突出处。单独看无意义，只为算腰臀比而采集' },
  { key: 'whr', label: '腰臀比', unit: '', step: 0.001, group: 'GIRTH', derived: true, fieldId: 'B17' },
  { key: 'whtr', label: '腰高比', unit: '', step: 0.001, group: 'GIRTH', derived: true, fieldId: 'B18',
    hint: '<0.5 为健康（腰围小于身高一半）。单一切点适用所有成人' },
]

/** 生理基线。B19 – B20 */
export const L0_VITALS_FIELDS: L0FieldConfig[] = [
  { key: 'bp_systolic', label: '收缩压', unit: 'mmHg', step: 1, group: 'VITALS', fieldId: 'B19' },
  { key: 'bp_diastolic', label: '舒张压', unit: 'mmHg', step: 1, group: 'VITALS', fieldId: 'B19' },
  { key: 'hr_max_measured', label: '最大心率（实测）', unit: 'bpm', step: 1, group: 'VITALS', fieldId: 'B20',
    hint: '留空则按 Tanaka 公式（208 − 0.7×年龄）估算' },
]

export const L0_ALL_FIELDS: L0FieldConfig[] = [
  ...L0_BASIC_FIELDS, ...L0_COMPOSITION_FIELDS,
  ...L0_SEGMENTAL_FIELDS, ...L0_GIRTH_FIELDS, ...L0_VITALS_FIELDS,
]

/** 数据库 GENERATED 列名。API 写库前必须剔除，否则 Postgres 报错。 */
export const L0_DERIVED_COLUMNS = [
  'bmi', 'fat_mass_kg', 'ffm_kg', 'smi', 'ffmi',
  'bmr_katch', 'whr', 'whtr', 'arm_asymmetry_pct', 'leg_asymmetry_pct',
] as const

// ─── 枚举展示文案 ────────────────────────────────────────────

export const SEX_LABELS: Record<Sex, string> = {
  MALE: '男', FEMALE: '女', OTHER: '其他', UNDISCLOSED: '不便告知',
}

export const TEST_TIER_LABELS = {
  T1: 'T1 自测', T2: 'T2 教练辅助', T3: 'T3 实验室',
} as const

/** 合规：设备一律用技术泛称，不显示品牌名（Sheet 07 第 08 项） */
export const DEVICE_TYPE_LABELS = {
  BIA: 'BIA 体成分设备', DEXA: '双能 X 线吸收法（DEXA）',
  SKINFOLD: '皮褶钳', TAPE: '软尺', SCALE: '体重秤',
  BP_MONITOR: '电子血压计', MANUAL: '手工测量', MIXED: '多来源混合',
} as const

export const MEASUREMENT_CONTEXT_LABELS = {
  FASTED_MORNING: '晨起空腹', POST_MEAL: '餐后',
  POST_EXERCISE: '运动后', EVENING: '晚间', UNKNOWN: '未记录',
} as const

export const WAIST_LANDMARK_LABELS = {
  ILIAC_CREST: '髂嵴上缘（推荐）', UMBILICUS: '脐水平', NARROWEST: '腰部最细处',
} as const

export const BODY_REGION_LABELS = {
  NECK: '颈部', SHOULDER: '肩', ELBOW: '肘', WRIST_HAND: '腕/手',
  THORACIC: '胸椎', LUMBAR: '腰椎', SACRO_PELVIC: '骶髂/骨盆',
  HIP: '髋', KNEE: '膝', ANKLE_FOOT: '踝/足',
  PELVIC_FLOOR: '盆底', ABDOMINAL: '腹部',
  CARDIOVASCULAR: '心血管', RESPIRATORY: '呼吸系统', NEUROLOGICAL: '神经系统',
  PREGNANCY_POSTPARTUM: '孕期/产后', OTHER: '其他',
} as const

export const SIDE_LABELS = { LEFT: '左', RIGHT: '右', BOTH: '双侧', NA: '不分侧' } as const

export const CONDITION_TYPE_LABELS = {
  INJURY: '损伤', SURGERY: '手术史', CHRONIC: '慢性问题', ACUTE_PAIN: '急性疼痛',
  PREGNANCY_POSTPARTUM: '孕期/产后', MEDICAL_ADVICE: '医嘱限制', OTHER: '其他',
} as const

export const SEVERITY_LABELS = { MILD: '轻', MODERATE: '中', SEVERE: '重' } as const
export const CONTRA_STATUS_LABELS = { ACTIVE: '现存', RECOVERING: '恢复中', RESOLVED: '已解决' } as const

// ─── 单位换算（仅展示层）────────────────────────────────────

export const kgToLb = (kg: number) => kg * 2.2046226218
export const lbToKg = (lb: number) => lb / 2.2046226218
export const cmToIn = (cm: number) => cm / 2.54
export const inToCm = (i: number) => i * 2.54

/** 按用户偏好格式化。库内始终是公制，这里只负责显示。 */
export function formatValue(
  value: number | null | undefined,
  unit: string,
  pref: UnitPreference = 'METRIC',
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (pref === 'IMPERIAL') {
    if (unit === 'kg') return `${kgToLb(value).toFixed(digits)} lb`
    if (unit === 'cm') return `${cmToIn(value).toFixed(digits)} in`
  }
  return unit ? `${value.toFixed(digits)} ${unit}` : value.toFixed(digits)
}

// ─── 派生逻辑 ────────────────────────────────────────────────

/**
 * 四肢骨骼肌量 ASM。
 * B10 SMI 的分子是四肢骨骼肌量，不是全身骨骼肌量 —— 两者不可混用。
 * 多数 BIA 设备不直接给 ASM，但节段分析给出了四肢去脂软组织量，求和即为 ASM。
 */
export function deriveAsm(input: {
  asm_kg?: number | null
  seg_lean_arm_l?: number | null
  seg_lean_arm_r?: number | null
  seg_lean_leg_l?: number | null
  seg_lean_leg_r?: number | null
}): { asm_kg: number | null; asm_source: 'MANUAL' | 'SEGMENT_SUM' | null } {
  if (input.asm_kg !== null && input.asm_kg !== undefined) {
    return { asm_kg: input.asm_kg, asm_source: 'MANUAL' }
  }
  const parts = [
    input.seg_lean_arm_l, input.seg_lean_arm_r,
    input.seg_lean_leg_l, input.seg_lean_leg_r,
  ]
  if (parts.some(p => p === null || p === undefined)) {
    return { asm_kg: null, asm_source: null }
  }
  const sum = parts.reduce<number>((a, b) => a + (b as number), 0)
  return { asm_kg: Math.round(sum * 100) / 100, asm_source: 'SEGMENT_SUM' }
}

/** B20 HRmax。Tanaka 2001，优于老旧的 220 − 年龄。 */
export const hrMaxTanaka = (age: number) => Math.round(208 - 0.7 * age)

export function ageFromBirthDate(birthDate: string | null, onDate?: string): number | null {
  if (!birthDate) return null
  const ref = onDate ? new Date(onDate) : new Date()
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime()) || Number.isNaN(ref.getTime())) return null
  let age = ref.getFullYear() - b.getFullYear()
  const m = ref.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) age -= 1
  return age
}

// ─── MDC 变化判定（Sheet 08 报告生成的硬性规则）──────────────

/** 数值越低越好的字段。判定「改善」方向时用。 */
const LOWER_IS_BETTER = new Set([
  'body_fat_pct', 'fat_mass_kg', 'visceral_fat_area', 'visceral_fat_level',
  'waist_cm', 'whr', 'whtr', 'bp_systolic', 'bp_diastolic', 'ecw_tbw_ratio',
])

/** 数值越高越好的字段。 */
const HIGHER_IS_BETTER = new Set([
  'smm_kg', 'asm_kg', 'smi', 'ffm_kg', 'ffmi', 'protein_kg',
])

/**
 * 单字段变化判定。
 *
 * 硬性规则：变化幅度低于 MDC 的一律归入 STABLE，
 * 既不进「改善」也不进「风险」。这是月度报告最容易翻车的地方 ——
 * 体脂率涨 0.5% 是 BIA 的正常噪声，不是「你胖了」。
 */
export function judgeChange(
  columnName: string,
  previous: number | null | undefined,
  current: number | null | undefined,
  meta?: Pick<L0FieldMeta, 'field_id' | 'name_zh' | 'unit' | 'mdc_value'>,
): FieldChange {
  const name = meta?.name_zh ?? columnName
  const unit = meta?.unit ?? ''
  const mdc = meta?.mdc_value ?? null

  const base: FieldChange = {
    field_id: meta?.field_id ?? '',
    column_name: columnName,
    name_zh: name,
    unit,
    previous: previous ?? null,
    current: current ?? null,
    delta: null,
    mdc_value: mdc,
    verdict: 'INSUFFICIENT_DATA',
    statement: `${name}：数据不足，无法比较。`,
  }

  if (previous === null || previous === undefined || current === null || current === undefined) {
    return base
  }

  const delta = Math.round((current - previous) * 1000) / 1000
  const abs = Math.abs(delta)
  const sign = delta > 0 ? '+' : ''
  const deltaLabel = `${sign}${delta}${unit ? ' ' + unit : ''}`

  // MDC 缺失时不做方向判定，只陈述事实
  if (mdc === null) {
    return {
      ...base, delta, verdict: 'STABLE',
      statement: `${name}：${previous} → ${current}（${deltaLabel}）。该指标未设定最小可信变化阈值，仅作事实记录。`,
    }
  }

  // 框架措辞为「变化 >X 才算真实变化」，故正好等于阈值时仍判为持平
  if (abs <= mdc) {
    return {
      ...base, delta, verdict: 'STABLE',
      statement: `${name}：${previous} → ${current}（${deltaLabel}）。变化未超过最小可信变化 ${mdc}${unit ? ' ' + unit : ''}，属测量噪声范围，视为基本持平。`,
    }
  }

  let verdict: ChangeVerdict = 'STABLE'
  if (LOWER_IS_BETTER.has(columnName)) verdict = delta < 0 ? 'IMPROVED' : 'DECLINED'
  else if (HIGHER_IS_BETTER.has(columnName)) verdict = delta > 0 ? 'IMPROVED' : 'DECLINED'

  return {
    ...base, delta, verdict,
    statement: `${name}：${previous} → ${current}（${deltaLabel}），超过最小可信变化 ${mdc}${unit ? ' ' + unit : ''}，为真实变化。`,
  }
}

/** 批量比较两次测量。供月度报告与前端趋势区使用。 */
export function diffMeasurements(
  previous: Record<string, any> | null,
  current: Record<string, any> | null,
  metaList: L0FieldMeta[],
): FieldChange[] {
  if (!current) return []
  return metaList
    .filter(m => m.source_table === 'l0_body_metric' && m.column_name)
    .map(m => judgeChange(m.column_name!, previous?.[m.column_name!], current[m.column_name!], m))
    .filter(c => c.verdict !== 'INSUFFICIENT_DATA')
    .sort((a, b) => a.field_id.localeCompare(b.field_id))
}

// ─── 参考区间提示（事实陈述，非诊断）────────────────────────

export interface ReferenceNote {
  level: 'info' | 'attention'
  /**
   * 参考区间的来源强度，决定措辞尺度：
   *   consensus —— WHO / AWGS / 中国标准 / NICE 等官方共识切点，可正常引用切点值
   *   industry  —— 体适能行业经验区间（多为 BIA 设备的常规输出）。
   *                只描述「数值位于哪一档」，不使用优秀 / 偏高 / 超标这类评价词，
   *                也不推断任何健康结论。
   */
  source: 'consensus' | 'industry'
  text: string
}

/**
 * 生成参考区间提示。
 *
 * 合规约束（Sheet 07 第 15 项）：一律「你的数值是 X，参考区间是 Y」句式，
 * 不输出「你有 XX 症」「XX 功能异常」这类判断。
 *
 * source='industry' 的条目额外收紧：这类区间在不同机构之间差异较大，
 * 且 BIA 本身有可观的测量误差，因此只作位置描述与趋势对照，不作评级。
 */
export function referenceNotes(m: Partial<L0BodyMetricFull>, sex: Sex | null): ReferenceNote[] {
  const out: ReferenceNote[] = []
  const isBinary = sex === 'MALE' || sex === 'FEMALE'
  const sexLabel = sex === 'MALE' ? '男' : '女'

  // ── 官方共识切点 ──────────────────────────────────────────

  // B18 腰高比 —— 单一切点 0.5 适用所有成人（NICE 2022）
  if (m.whtr != null) {
    out.push(m.whtr < 0.5
      ? { level: 'info', source: 'consensus', text: `腰高比 ${m.whtr}，低于 0.5 的通用参考线。` }
      : { level: 'attention', source: 'consensus', text: `腰高比 ${m.whtr}，通用参考线为 0.5（腰围小于身高一半）。如需进一步解读，建议咨询专业人士。` })
  }

  // B05 BMI —— 中国标准
  if (m.bmi != null) {
    const band = m.bmi < 18.5 ? '偏瘦区间' : m.bmi < 24 ? '正常区间' : m.bmi < 28 ? '超重区间' : '肥胖区间'
    out.push({
      level: 'info', source: 'consensus',
      text: `BMI ${m.bmi}，按中国标准（正常 18.5–23.9）落在${band}。BMI 不区分脂肪与肌肉，须与体脂率联合解读。`,
    })
  }

  // B10 SMI —— AWGS 2019 亚洲切点
  if (m.smi != null && isBinary) {
    const cut = sex === 'MALE' ? 7.0 : 5.7
    out.push(m.smi >= cut
      ? { level: 'info', source: 'consensus', text: `四肢骨骼肌指数 ${m.smi} kg/m²，高于 AWGS 2019 亚洲成人参考值（${sexLabel}性 ${cut}）。` }
      : { level: 'attention', source: 'consensus', text: `四肢骨骼肌指数 ${m.smi} kg/m²，低于 AWGS 2019 亚洲成人参考值（${sexLabel}性 ${cut}）。建议咨询专业人士。` })
  }

  // B15 腰围 —— 中国肥胖工作组
  if (m.waist_cm != null && isBinary) {
    const cut = sex === 'MALE' ? 90 : 85
    if (m.waist_cm >= cut) {
      out.push({
        level: 'attention', source: 'consensus',
        text: `腰围 ${m.waist_cm} cm，达到中国标准的腹型肥胖参考线（${sexLabel}性 ${cut} cm）。建议咨询专业人士。`,
      })
    }
  }

  // ── 行业经验区间（BIA 设备常规输出）──────────────────────
  // 措辞规则：只说数值落在第几档，不用评价词，不推断健康结论。

  // B06 体脂率
  if (m.body_fat_pct != null && isBinary) {
    // 由低到高共 4 档，男 <15 / <20 / <25 / ≥25，女 <23 / <28 / <33 / ≥33
    const cuts = sex === 'MALE' ? [15, 20, 25] : [23, 28, 33]
    const idx = cuts.findIndex(c => m.body_fat_pct! < c)
    const band = idx === -1 ? 4 : idx + 1
    out.push({
      level: 'info', source: 'industry',
      text: `体脂率 ${m.body_fat_pct}%。体适能领域常用的${sexLabel}性参考区间分 4 档（由低到高），该数值位于第 ${band} 档。`
        + `BIA 受水合状态影响可达 ±3%，宜作长期趋势对照，不宜据单次数值下结论。`,
    })
  }

  // B11 FFMI —— 不分档，只描述用途
  if (m.ffmi != null) {
    out.push({
      level: 'info', source: 'industry',
      text: `FFMI ${m.ffmi} kg/m²，反映去脂体重相对身高的比例，不受体脂干扰。`
        + `它没有公认的健康切点，主要用途是与本人的历史数据比较，观察增肌进展。`,
    })
  }

  // B12 内脏脂肪
  if (m.visceral_fat_area != null) {
    out.push({
      level: m.visceral_fat_area >= 100 ? 'attention' : 'info', source: 'industry',
      text: `内脏脂肪面积 ${m.visceral_fat_area} cm²。相关文献中常以 100 cm² 作为参考线。`
        + (m.visceral_fat_area >= 100 ? '如需进一步解读，建议咨询专业人士。' : ''),
    })
  } else if (m.visceral_fat_level != null) {
    out.push({
      level: 'info', source: 'industry',
      text: `内脏脂肪等级 ${m.visceral_fat_level}。各家 BIA 设备的等级刻度不统一，跨设备不可比，`
        + `应与同一台设备的历史记录对照看。`,
    })
  }

  // B13 细胞外水比
  if (m.ecw_tbw_ratio != null) {
    out.push({
      level: 'info', source: 'industry',
      text: `细胞外水比 ${m.ecw_tbw_ratio}。BIA 设备常用的参考区间为 0.360–0.390。`
        + `该数值受当日水分与训练状态影响较大，宜连续观察而非单次解读。`,
    })
  }

  // 左右对称性 —— 仅作事实呈现，不做伤病判断
  if (m.leg_asymmetry_pct != null && m.leg_asymmetry_pct > 10) {
    out.push({
      level: 'attention', source: 'industry',
      text: `下肢左右瘦组织差异 ${m.leg_asymmetry_pct}%。这是一项事实记录，不构成任何伤病判断。`,
    })
  }

  return out
}

/**
 * B19 血压运动安全闸。
 * ≥180/110 属运动相对禁忌 —— 此时应提示「建议先就医」，
 * 而不是照常出训练计划。
 */
export function bloodPressureGate(sys: number | null | undefined, dia: number | null | undefined): {
  blocked: boolean
  message: string | null
} {
  if (sys == null && dia == null) return { blocked: false, message: null }
  if ((sys ?? 0) >= 180 || (dia ?? 0) >= 110) {
    return {
      blocked: true,
      message: `本次记录的血压为 ${sys ?? '—'}/${dia ?? '—'} mmHg。该数值属于运动相对禁忌范围，建议先咨询医生后再安排训练。`,
    }
  }
  if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) {
    return {
      blocked: false,
      message: `本次记录的血压为 ${sys}/${dia} mmHg，高于 140/90 的参考线。建议多次测量取均值，并咨询专业人士。`,
    }
  }
  return { blocked: false, message: null }
}

/** L0 数据完整度。框架建议把缺口本身变成行动指引，而非算加权总分。 */
export function dataCompleteness(
  m: Record<string, any> | null,
  metaList: L0FieldMeta[],
): { filled: number; total: number; pct: number; missing: string[] } {
  const tracked = metaList.filter(
    x => x.source_table === 'l0_body_metric' && !x.is_derived
      && x.column_name && (x.requirement === 'REQUIRED' || x.requirement === 'RECOMMENDED'),
  )
  const missing = tracked.filter(x => m?.[x.column_name!] == null).map(x => x.name_zh)
  const filled = tracked.length - missing.length
  return {
    filled, total: tracked.length,
    pct: tracked.length ? Math.round((filled / tracked.length) * 100) : 0,
    missing,
  }
}
