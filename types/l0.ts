// ============================================================
// L0 基础数据层 · 类型定义
// 对应「身体综合训练能力模型 参考框架 V4」Sheet 01
//
// 三层架构中的定位：
//   L0 基础数据层 —— 用户输入或体成分设备读数。【不打分】，
//   作用是给 L1 能力指标做标准化。
//
// 单位约定：库内一律公制（kg / cm / L / mmHg），英制仅在展示层换算。
// ============================================================

export type Sex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED'
export type UnitPreference = 'METRIC' | 'IMPERIAL'
export type TestTier = 'T1' | 'T2' | 'T3'

export type DeviceType =
  | 'BIA' | 'DEXA' | 'SKINFOLD' | 'TAPE' | 'SCALE' | 'BP_MONITOR' | 'MANUAL' | 'MIXED'

export type MeasurementContext =
  | 'FASTED_MORNING' | 'POST_MEAL' | 'POST_EXERCISE' | 'EVENING' | 'UNKNOWN'

export type WaistLandmark = 'ILIAC_CREST' | 'UMBILICUS' | 'NARROWEST'

export type AsmSource = 'DEVICE' | 'SEGMENT_SUM' | 'MANUAL'

// ─── B22 运动禁忌 ────────────────────────────────────────────
export type BodyRegion =
  | 'NECK' | 'SHOULDER' | 'ELBOW' | 'WRIST_HAND'
  | 'THORACIC' | 'LUMBAR' | 'SACRO_PELVIC'
  | 'HIP' | 'KNEE' | 'ANKLE_FOOT'
  | 'PELVIC_FLOOR' | 'ABDOMINAL'
  | 'CARDIOVASCULAR' | 'RESPIRATORY' | 'NEUROLOGICAL'
  | 'PREGNANCY_POSTPARTUM' | 'OTHER'

export type ContraSide = 'LEFT' | 'RIGHT' | 'BOTH' | 'NA'
export type ConditionType =
  | 'INJURY' | 'SURGERY' | 'CHRONIC' | 'ACUTE_PAIN'
  | 'PREGNANCY_POSTPARTUM' | 'MEDICAL_ADVICE' | 'OTHER'
export type Severity = 'MILD' | 'MODERATE' | 'SEVERE'
export type ContraStatus = 'ACTIVE' | 'RECOVERING' | 'RESOLVED'

// ─── client_profile （B01 / B02 / B21 / B22 补充说明）────────
export interface ClientProfile {
  id: string
  user_id: string
  sex: Sex | null
  birth_date: string | null        // ISO date
  training_years: number | null
  injury_notes: string | null
  unit_preference: UnitPreference
  /** 是否同意去标识化数据用于建立本店参考值。默认 false，未同意不进入任何统计。 */
  data_use_consent: boolean
  consent_at: string | null
  consent_version: string | null
  consent_withdrawn_at: string | null
  created_at: string
  updated_at: string
}

// ─── client_contraindication （B22）─────────────────────────
export interface Contraindication {
  id: string
  user_id: string
  body_region: BodyRegion
  side: ContraSide
  condition_type: ConditionType
  severity: Severity | null
  status: ContraStatus
  onset_date: string | null
  resolved_date: string | null
  description: string | null
  avoid_patterns: string[]
  recorded_by: string | null
  created_at: string
  updated_at: string
}

// ─── l0_body_metric （B03 – B20）─────────────────────────────
/** 原始输入字段。教练/设备录入，可写。 */
export interface L0MetricInput {
  measured_at: string
  measured_time: string | null
  test_tier: TestTier
  device_type: DeviceType | null
  device_model: string | null
  measurement_context: MeasurementContext

  height_cm: number | null          // B03
  weight_kg: number | null          // B04
  body_fat_pct: number | null       // B06
  smm_kg: number | null             // B09 全身骨骼肌量
  asm_kg: number | null             // 四肢骨骼肌量 —— B10 SMI 的分子
  asm_source: AsmSource | null

  protein_kg: number | null
  mineral_kg: number | null
  tbw_l: number | null              // B13
  ecw_tbw_ratio: number | null      // B13

  visceral_fat_area: number | null  // B12 cm²
  visceral_fat_level: number | null // B12 等级
  bmr_device: number | null         // B14 设备读数

  waist_cm: number | null           // B15
  hip_cm: number | null             // B16
  waist_landmark: WaistLandmark | null
  whr_device: number | null

  bp_systolic: number | null        // B19
  bp_diastolic: number | null       // B19
  hr_max_measured: number | null    // B20 实测

  seg_lean_arm_l: number | null
  seg_lean_arm_r: number | null
  seg_lean_trunk: number | null
  seg_lean_leg_l: number | null
  seg_lean_leg_r: number | null
  seg_fat_arm_l: number | null
  seg_fat_arm_r: number | null
  seg_fat_trunk: number | null
  seg_fat_leg_l: number | null
  seg_fat_leg_r: number | null

  device_score: number | null
  notes: string | null
  photo_urls: string[]
}

/** 数据库 GENERATED 列。只读，前端不可写。 */
export interface L0MetricDerived {
  bmi: number | null                // B05
  fat_mass_kg: number | null        // B07
  ffm_kg: number | null             // B08
  smi: number | null                // B10
  ffmi: number | null               // B11
  bmr_katch: number | null          // B14
  whr: number | null                // B17
  whtr: number | null               // B18
  arm_asymmetry_pct: number | null
  leg_asymmetry_pct: number | null
}

export interface L0BodyMetric extends L0MetricInput, L0MetricDerived {
  id: string
  client_id: string
  recorded_by: string | null
  created_at: string
  updated_at: string
}

/** 视图 l0_body_metric_full：补上跨表才能算的年龄与 HRmax */
export interface L0BodyMetricFull extends L0BodyMetric {
  sex: Sex | null
  birth_date: string | null
  training_years: number | null
  age_at_measurement: number | null
  hr_max_tanaka: number | null      // B20 Tanaka 2001: 208 − 0.7 × 年龄
  hr_max_effective: number | null
  hr_max_source: 'MEASURED' | 'TANAKA_FORMULA' | null
}

// ─── l0_field_meta ──────────────────────────────────────────
export type FieldRequirement = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'AUTO'
export type DisplayGroup = 'BASIC' | 'COMPOSITION' | 'GIRTH' | 'VITALS' | 'PROFILE'
export type ValueStatus = 'VERIFIED' | 'PENDING_REVIEW'

export interface L0FieldMeta {
  field_id: string                  // B01 … B22
  column_name: string | null
  source_table: 'client_profile' | 'l0_body_metric' | 'client_contraindication' | null
  name_zh: string
  name_en: string | null
  unit: string | null
  data_type: string | null
  is_derived: boolean
  derive_formula: string | null
  source_method: string | null
  test_tier: string | null
  requirement: FieldRequirement
  update_frequency: string | null
  /** 最小可信变化。变化幅度低于此值一律归入「基本持平」。 */
  mdc_value: number | null
  mdc_unit: string | null
  mdc_text: string | null
  purpose: string | null
  reference_range: string | null
  reference_system: string | null
  evidence_level: 'A' | 'B' | 'C' | null
  notes: string | null
  /** PENDING_REVIEW 的切点不得直接作为对用户的健康判断依据。 */
  value_status: ValueStatus
  display_group: DisplayGroup | null
  display_order: number
  is_active: boolean
}

// ─── 变化判定结果（Sheet 08 月度报告用）────────────────────
export type ChangeVerdict = 'IMPROVED' | 'DECLINED' | 'STABLE' | 'INSUFFICIENT_DATA'

export interface FieldChange {
  field_id: string
  column_name: string
  name_zh: string
  unit: string | null
  previous: number | null
  current: number | null
  delta: number | null
  mdc_value: number | null
  /** 低于 MDC 一律为 STABLE，既不进「改善」也不进「风险」 */
  verdict: ChangeVerdict
  /** 事实陈述式文案，不含任何诊断或风险判断 */
  statement: string
}
