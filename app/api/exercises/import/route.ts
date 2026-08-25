import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/exercises/import — bulk import exercises
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { exercises } = body

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'No exercises provided' }, { status: 400 })
    }

    // 表格里某一格没填 -> Excel 解析后这个 key 压根不存在（不是空字符串）。
    // pick() 只在原始表格里真的有这一列时才返回值，没有就返回 undefined。
    // 新增记录时用默认值兜底；更新已有记录时，undefined 的字段一律不放进
    // updateRow，Supabase 的 update() 就不会碰这些列——避免"只想改中文名和
    // 简介，结果说明文字/图片/gif 这些没填的列被清空"这种重新导入把老数据冲掉的问题。
    const pick = (ex: any, ...keys: string[]) => {
      for (const k of keys) {
        if (ex[k] !== undefined && ex[k] !== null && ex[k] !== '') return ex[k]
      }
      return undefined
    }
    const pickInt = (ex: any, ...keys: string[]) => {
      const v = pick(ex, ...keys)
      return v === undefined ? undefined : parseInt(v)
    }
    const pickFloat = (ex: any, ...keys: string[]) => {
      const v = pick(ex, ...keys)
      return v === undefined ? undefined : parseFloat(v)
    }

    const rows = exercises.map((ex: any) => ({
      name_en: pick(ex, 'name_en', 'nameEN'),
      name_cn: pick(ex, 'name_cn', 'nameCN'),
      description_en: pick(ex, 'description_en', 'descriptionEN', 'description'),
      description_cn: pick(ex, 'description_cn', 'descriptionCN'),
      instructions_en: pick(ex, 'instructions_en', 'instructionsEN', 'instructions'),
      instructions_cn: pick(ex, 'instructions_cn', 'instructionsCN'),
      series_cn: pick(ex, 'series_cn', 'seriesCN'),
      series_en: pick(ex, 'series_en', 'seriesEN'),
      type_en: pick(ex, 'type_en', 'typeEN', 'type'),
      type_cn: pick(ex, 'type_cn', 'typeCN'),
      difficulty_en: pick(ex, 'difficulty_en', 'difficultyEN', 'difficulty'),
      difficulty_cn: pick(ex, 'difficulty_cn', 'difficultyCN'),
      target_muscles_en: pick(ex, 'target_muscles_en', 'targetMusclesEN', 'targetMuscles'),
      target_muscles_cn: pick(ex, 'target_muscles_cn', 'targetMusclesCN'),
      secondary_muscles_en: pick(ex, 'secondary_muscles_en', 'secondaryMusclesEN'),
      secondary_muscles_cn: pick(ex, 'secondary_muscles_cn', 'secondaryMusclesCN'),
      body_position_en: pick(ex, 'body_position_en', 'bodyPositionEN'),
      body_position_cn: pick(ex, 'body_position_cn', 'bodyPositionCN'),
      equipment_en: pick(ex, 'equipment_en', 'equipmentEN'),
      equipment_cn: pick(ex, 'equipment_cn', 'equipmentCN'),
      equipment_setup_en: pick(ex, 'equipment_setup_en', 'equipmentSetupEN'),
      equipment_setup_cn: pick(ex, 'equipment_setup_cn', 'equipmentSetupCN'),
      cues_en: pick(ex, 'cues_en', 'cuesEN'),
      cues_cn: pick(ex, 'cues_cn', 'cuesCN'),
      contraindications_en: pick(ex, 'contraindications_en', 'contraindicationsEN'),
      contraindications_cn: pick(ex, 'contraindications_cn', 'contraindicationsCN'),
      featured_image_url: pick(ex, 'featured_image_url', 'featuredImageUrl', 'imageUrl1', 'image_url'),
      gif_url: pick(ex, 'gif_url', 'gifUrl'),
      default_sets: pickInt(ex, 'default_sets', 'defaultSets'),
      default_reps: pickInt(ex, 'default_reps', 'defaultReps'),
      default_weight: pickFloat(ex, 'default_weight', 'defaultWeight'),
      default_weight_unit: pick(ex, 'default_weight_unit', 'defaultWeightUnit'),
      default_duration: pickInt(ex, 'default_duration', 'defaultDuration'),
      default_duration_unit: pick(ex, 'default_duration_unit', 'defaultDurationUnit'),
    }))

    // 按 name_en 匹配：已存在就更新，不存在就新增
    // 这样同一批动作补充新字段后重新导入，会覆盖旧记录而不是产生重复行
    let created = 0
    let updated = 0
    const errors: { exercise: string; error: string }[] = []

    for (const row of rows) {
      if (!row.name_en) {
        errors.push({ exercise: row.name_cn || 'Unknown', error: 'name_en 不能为空' })
        continue
      }

      const { data: existing } = await supabaseAdmin
        .from('master_exercise')
        .select('id')
        .eq('name_en', row.name_en)
        .limit(1)
        .maybeSingle()

      if (existing) {
        // 只更新表格里真的填了的字段（partial update）：
        // 没填的列保持原值不动，不覆盖成空。
        const updateRow: Record<string, any> = { updated_at: new Date().toISOString() }
        for (const [k, v] of Object.entries(row)) {
          if (v !== undefined) updateRow[k] = v
        }
        const { error } = await supabaseAdmin
          .from('master_exercise')
          .update(updateRow)
          .eq('id', existing.id)
        if (error) {
          errors.push({ exercise: row.name_en || row.name_cn || 'Unknown', error: error.message })
        } else {
          updated++
        }
      } else {
        // 新增记录：没填的字段用合理默认值兜底，避免必填/非空字段插入失败
        const insertRow = {
          name_en: row.name_en,
          name_cn: row.name_cn || '',
          description_en: row.description_en || '',
          description_cn: row.description_cn || '',
          instructions_en: row.instructions_en || '',
          instructions_cn: row.instructions_cn || '',
          series_cn: row.series_cn ?? null,
          series_en: row.series_en ?? null,
          type_en: row.type_en || '',
          type_cn: row.type_cn || '',
          difficulty_en: row.difficulty_en || '',
          difficulty_cn: row.difficulty_cn || '',
          target_muscles_en: row.target_muscles_en || '',
          target_muscles_cn: row.target_muscles_cn || '',
          secondary_muscles_en: row.secondary_muscles_en ?? null,
          secondary_muscles_cn: row.secondary_muscles_cn ?? null,
          body_position_en: row.body_position_en ?? null,
          body_position_cn: row.body_position_cn ?? null,
          equipment_en: row.equipment_en ?? null,
          equipment_cn: row.equipment_cn ?? null,
          equipment_setup_en: row.equipment_setup_en ?? null,
          equipment_setup_cn: row.equipment_setup_cn ?? null,
          cues_en: row.cues_en ?? null,
          cues_cn: row.cues_cn ?? null,
          contraindications_en: row.contraindications_en ?? null,
          contraindications_cn: row.contraindications_cn ?? null,
          featured_image_url: row.featured_image_url ?? null,
          gif_url: row.gif_url ?? null,
          default_sets: row.default_sets ?? null,
          default_reps: row.default_reps ?? null,
          default_weight: row.default_weight ?? null,
          default_weight_unit: row.default_weight_unit || 'kg',
          default_duration: row.default_duration ?? null,
          default_duration_unit: row.default_duration_unit || 'minutes',
          created_by: userId,
        }
        const { error } = await supabaseAdmin.from('master_exercise').insert([insertRow])
        if (error) {
          errors.push({ exercise: row.name_en || row.name_cn || 'Unknown', error: error.message })
        } else {
          created++
        }
      }
    }

    return NextResponse.json({
      created,
      updated,
      failed: errors.length,
      errors,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
