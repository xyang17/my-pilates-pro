# L0 基础数据层 · 实现说明

对应《身体综合训练能力模型 参考框架 V4》Sheet 01。

**定位：L0 不打分。** 它记录事实与趋势，作用是给 L1 能力指标提供标准化的分母。
打分与分级发生在 L1（`l1_metric` / `l1_result`，本阶段仅有骨架）。

---

## 数据库

| 表 / 视图 | 用途 |
|---|---|
| `client_profile` | B01 性别 / B02 出生日期 / B21 训练年限 + 单位偏好。1:1 关联 `user` |
| `client_contraindication` | B22 运动禁忌，结构化条目。设计用途是**动作库硬过滤**，非展示 |
| `l0_body_metric` | B03–B20 测量记录。一次测量一行宽表，字段可空 |
| `l0_field_meta` | 22 项字段的 MDC / 参考区间 / 证据等级 / 常见坑 |
| `l1_metric` | L1 指标字典，55 项定义已录入，`is_scored` 全为 `false` |
| `l1_result` | L1 测评结果长表（骨架，暂未接入 UI） |
| `l0_body_metric_full`（视图） | 测量记录 + 档案，补上跨表才能算的年龄与 HRmax |

已废弃并删除：`body_assessment`（原表 0 行，无迁移损失）。

### 单位

**库内一律公制**（kg / cm / L / mmHg）。英制只在展示层由 `lib/l0.ts` 的
`formatValue()` 换算，`client_profile.unit_preference` 控制。

### 派生字段

用 Postgres `GENERATED ALWAYS AS ... STORED` 列，数据库自动计算，永不失同步：

| 列 | 公式 | 框架编号 |
|---|---|---|
| `bmi` | 体重 ÷ 身高(m)² | B05 |
| `fat_mass_kg` | 体重 × 体脂率 | B07 |
| `ffm_kg` | 体重 − 脂肪量 | B08 |
| `smi` | **四肢**骨骼肌量 ÷ 身高(m)² | B10 |
| `ffmi` | 去脂体重 ÷ 身高(m)² | B11 |
| `bmr_katch` | 370 + 21.6 × 去脂体重 | B14 |
| `whr` | 腰围 ÷ 臀围（软尺实测） | B17 |
| `whtr` | 腰围 ÷ 身高 | B18 |
| `arm_asymmetry_pct` / `leg_asymmetry_pct` | \|左−右\| ÷ max(左,右) × 100 | — |

跨表的派生值（年龄、B20 HRmax）放在视图 `l0_body_metric_full` 里，
因为 GENERATED 列只能引用同一行的列。

---

## 三处容易踩的坑

### 1. SMI 的分子是「四肢骨骼肌量」，不是「全身骨骼肌量」

框架 B09 是全身骨骼肌量 SMM，B10 SMI 的公式却是「四肢骨骼肌量 ÷ 身高²」。
两者不是同一个量，直接拿 B09 算 SMI 会显著高估。

多数 BIA 设备不直接输出 ASM，但**节段分析给出了四肢去脂软组织量，四项求和即为 ASM**。
`lib/l0.ts` 的 `deriveAsm()` 实现了这个回退：`asm_kg` 留空时用
`seg_lean_arm_l + seg_lean_arm_r + seg_lean_leg_l + seg_lean_leg_r` 填充，
并把来源记在 `asm_source`（`DEVICE` / `SEGMENT_SUM` / `MANUAL`）。

### 2. 身高按年更新，体重按周更新

只称重的记录不会带身高，而 BMI / SMI / FFMI / 腰高比全都要用身高做分母。
`lib/l0-server.ts` 的 `inheritHeight()` 在缺身高时从该会员最近一次有身高的记录继承。

### 3. MDC 边界取「大于」而非「大于等于」

框架措辞是「变化 **>**2 cm 才算真实变化」，因此 `judgeChange()` 用
`abs(delta) <= mdc → STABLE`。正好等于阈值时判为基本持平。

---

## MDC 最小可信变化

Sheet 08 月度报告的硬性规则：**变化幅度低于 MDC 的一律归入「基本持平」，
既不进「改善」也不进「风险」。**

阈值存在 `l0_field_meta.mdc_value`（数值，供程序比较）与 `mdc_text`（原文，供展示）。
改切点不需要发版。

实测例（真实 BIA 报告，2026-03-11 → 2026-07-19）：

| 指标 | 变化 | MDC | 判定 |
|---|---|---|---|
| 体脂率 | 22.7 → 21.7（−1.0%） | 2 | 基本持平 |
| 体重 | 63.0 → 63.4（+0.4 kg） | 1 | 基本持平 |
| 骨骼肌量 | 26.8 → 27.3（+0.5 kg） | 0.8 | 基本持平 |
| 腰围 | 76.0 → 74.0（−2.0 cm） | 2 | 基本持平 |

设备自带的历史曲线会把这四项全画成「有变化」。按 MDC 判定，它们都在测量噪声范围内。
这正是这条规则存在的理由。

---

## 合规（Sheet 07）

- **无判断式表述**：所有输出走「事实陈述 + 建议咨询」句式。
  不说「你有肌少症」，说「你的 SMI 为 X，低于 AWGS 2019 亚洲成人参考值 Y，建议咨询专业人士」。
- **设备用技术泛称**：UI 一律显示「BIA 体成分设备」，不显示品牌名。
  `device_model` 仅作内部记录，用于判断跨设备数据是否可比。
- **参考区间分两档措辞**，由 `l0_field_meta.value_status` 与 `ReferenceNote.source` 控制：

  | 档位 | 来源 | 措辞尺度 |
  |---|---|---|
  | `VERIFIED` / `consensus` | WHO、AWGS 2019、中国标准、NICE 等共识文件 | 可直接引用切点值，如「低于 AWGS 2019 亚洲成人参考值（女性 5.7）」 |
  | `INDUSTRY_REFERENCE` / `industry` | 体适能行业与 BIA 设备的常用经验区间（B06 体脂率、B11 FFMI、B12 内脏脂肪、B13 细胞外水比） | **只说数值落在第几档，不用「优秀 / 偏高 / 超标」这类评价词，不推断健康结论**，并附测量误差提醒 |

  这几项是 BIA 报告的常规输出，隐藏反而不实用，因此保留展示但收紧措辞。
  UI 上用「共识切点 / 行业参考」标签区分，卡片底部有统一说明。
  实际输出示例：

  > 体脂率 21.7%。体适能领域常用的女性参考区间分 4 档（由低到高），该数值位于第 1 档。
  > BIA 受水合状态影响可达 ±3%，宜作长期趋势对照，不宜据单次数值下结论。

  > FFMI 18.02 kg/m²，反映去脂体重相对身高的比例，不受体脂干扰。
  > 它没有公认的健康切点，主要用途是与本人的历史数据比较，观察增肌进展。

  > 内脏脂肪等级 5。各家 BIA 设备的等级刻度不统一，跨设备不可比，应与同一台设备的历史记录对照看。
- **B19 血压安全闸**：`bloodPressureGate()` 在 ≥180/110 时提示「建议先就医」而非照常出计划。

---

## API

| 端点 | 说明 |
|---|---|
| `GET /api/l0/meta` | 字段元数据（MDC / 参考区间 / 常见坑） |
| `GET /api/l0/profile/[clientId]` | 档案 + 禁忌条目 |
| `PUT /api/l0/profile/[clientId]` | upsert 档案 |
| `POST/PATCH/DELETE /api/l0/contraindications` | 禁忌条目增改删 |
| `GET/POST /api/l0/metrics` | 测量记录列表 / 新建（读视图，带派生值） |
| `GET/PUT/DELETE /api/l0/metrics/[id]` | 单条读写删 |
| `POST/DELETE /api/l0/metrics/[id]/photos` | 照片 / 设备报告截图 |

鉴权沿用现有的 `x-user-id` / `x-user-role` 请求头方案，服务端用 service role key。
新表启用 RLS 且不建策略（service role 绕过），与项目现有表一致；
`l0_field_meta` / `l1_metric` 是公共参考数据，对已登录用户开放只读。
视图 `l0_body_metric_full` 已设 `security_invoker = on`，否则会绕过底表 RLS。

---

## 下一步（L1）

1. `l1_metric` 已录入 55 项定义，缺 `direction`（越高越好 / 越低越好）与分级切点。
2. **L1 要打分，绕不开常模来源问题**。L0 靠「只描述位置、不给评价词」规避了，
   但 L1 的产出本身就是分级，措辞回避不掉。届时需在三条路里选一条：
   追溯原始文献自行编排 / 购买授权 / 用自有用户数据自建中国人群常模（长期看是护城河）。
3. Sheet 03 的 84 行常模需要一张 `l1_norm` 表（性别 × 年龄段 × 档位 × 切点）。
4. L2 动作映射按 Sheet 06 建议做成独立 capability 维表 + 动作-能力多对多关联表，
   不要在 `master_exercise` 上加冗余字段。
