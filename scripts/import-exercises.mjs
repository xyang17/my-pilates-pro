/**
 * 从 exercises-dataset 筛选 ~110 条动作并生成 SQL
 * 每种器械至少有几个，覆盖各身体部位
 * 运行：node scripts/import-exercises.mjs > scripts/exercises_import.sql
 */

import https from 'https'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_JSON = resolve(__dirname, 'exercises_data.json')   // 本地备份

const GITHUB_RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'
const IMAGE_BASE = `${GITHUB_RAW}/images`

// ── 器械中文映射 ──────────────────────────────────────────────
const EQUIP_CN = {
  'body weight':      '自重',
  'dumbbell':         '哑铃',
  'barbell':          '杠铃',
  'cable':            '绳索',
  'band':             '弹力带',
  'kettlebell':       '壶铃',
  'smith machine':    '史密斯架',
  'leverage machine': '器械',
  'stability ball':   '瑞士球',
  'medicine ball':    '药球',
  'ez barbell':       'EZ杠',
  'weighted':         '负重',
  'assisted':         '辅助器械',
  'bosu ball':        'BOSU球',
}

// ── 部位 → type 映射 ──────────────────────────────────────────
const TYPE_MAP = {
  'waist':      { cn: '核心训练',   en: 'Core Training' },
  'back':       { cn: '力量训练',   en: 'Strength Training' },
  'chest':      { cn: '力量训练',   en: 'Strength Training' },
  'upper arms': { cn: '抗阻训练',   en: 'Resistance Training' },
  'lower arms': { cn: '抗阻训练',   en: 'Resistance Training' },
  'shoulders':  { cn: '抗阻训练',   en: 'Resistance Training' },
  'upper legs': { cn: '力量训练',   en: 'Strength Training' },
  'lower legs': { cn: '功能性训练', en: 'Functional Training' },
  'cardio':     { cn: '热身',       en: 'Warmup' },
  'neck':       { cn: '功能性训练', en: 'Functional Training' },
}

// ── 目标肌群中文 ──────────────────────────────────────────────
const MUSCLE_CN = {
  'abs': '腹肌', 'lats': '背阔肌', 'pectorals': '胸肌', 'quads': '股四头肌',
  'glutes': '臀肌', 'hamstrings': '腘绳肌', 'biceps': '肱二头肌',
  'triceps': '肱三头肌', 'deltoids': '三角肌', 'delts': '三角肌',
  'traps': '斜方肌', 'calves': '小腿肌', 'obliques': '腹斜肌',
  'forearms': '前臂', 'rhomboids': '菱形肌', 'hip flexors': '髂腰肌',
  'lower back': '下背部', 'upper back': '上背部', 'core': '核心肌群',
  'shoulders': '肩部', 'neck': '颈部', 'adductors': '内收肌',
  'abductors': '外展肌', 'ankle stabilizers': '踝关节稳定肌',
  'serratus anterior': '前锯肌', 'spine': '脊柱',
}

// ── 每种器械的目标配额 + 优先动作 ──────────────────────────────
// quota: 从该器械里最多选几个
// priority: 优先选这些名字（全部小写）
const EQUIP_PLAN = [
  {
    equip: 'body weight',
    quota: 20,
    priority: [
      'push-up', 'pull-up', 'chin-up', 'plank', 'side plank', 'dead bug',
      'crunch', 'bicycle crunch', 'leg raise', 'mountain climber',
      'burpee', 'squat jump', 'jumping jack', 'lunge', 'glute bridge',
      'russian twist', 'hollow body hold', 'inchworm', 'bear crawl', 'dip',
    ],
  },
  {
    equip: 'dumbbell',
    quota: 20,
    priority: [
      'dumbbell bench press', 'dumbbell row', 'dumbbell shoulder press',
      'dumbbell lateral raise', 'dumbbell bicep curl', 'hammer curl',
      'dumbbell fly', 'dumbbell deadlift', 'dumbbell squat', 'goblet squat',
      'dumbbell lunge', 'dumbbell step-up', 'dumbbell hip thrust',
      'dumbbell tricep extension', 'dumbbell pullover', 'dumbbell curl',
      'incline dumbbell press', 'dumbbell front raise', 'dumbbell shrug',
      'dumbbell romanian deadlift',
    ],
  },
  {
    equip: 'barbell',
    quota: 20,
    priority: [
      'barbell bench press', 'barbell squat', 'barbell deadlift',
      'barbell bent over row', 'barbell overhead press', 'barbell curl',
      'barbell front squat', 'barbell hip thrust', 'barbell lunge',
      'barbell romanian deadlift', 'barbell shrug', 'barbell good morning',
      'barbell incline bench press', 'barbell close grip bench press',
      'barbell upright row', 'barbell back squat', 'barbell full squat',
      'barbell sumo deadlift', 'barbell step-up', 'barbell calf raise',
    ],
  },
  {
    equip: 'cable',
    quota: 15,
    priority: [
      'cable row', 'lat pulldown', 'cable fly', 'cable curl',
      'tricep pushdown', 'face pull', 'cable lateral raise', 'cable crunch',
      'cable pull through', 'cable kickback', 'cable woodchop',
      'seated cable row', 'cable upright row', 'cable overhead press',
      'cable chest press',
    ],
  },
  {
    equip: 'band',
    quota: 10,
    priority: [
      'band pull apart', 'banded squat', 'banded hip thrust',
      'resistance band row', 'resistance band curl', 'resistance band press',
      'banded glute bridge', 'resistance band lateral walk',
      'resistance band pull apart', 'resistance band deadlift',
    ],
  },
  {
    equip: 'kettlebell',
    quota: 10,
    priority: [
      'kettlebell swing', 'kettlebell goblet squat', 'kettlebell deadlift',
      'turkish get-up', 'kettlebell press', 'kettlebell row',
      'kettlebell snatch', 'kettlebell clean', 'kettlebell windmill',
      'kettlebell lunge',
    ],
  },
  {
    equip: 'smith machine',
    quota: 8,
    priority: [
      'smith machine squat', 'smith machine bench press',
      'smith machine deadlift', 'smith machine overhead press',
      'smith machine row', 'smith machine calf raise',
      'smith machine lunge', 'smith machine hip thrust',
    ],
  },
  {
    equip: 'leverage machine',
    quota: 6,
    priority: [
      'leg press', 'leg curl', 'leg extension', 'chest press machine',
      'shoulder press machine', 'seated row machine',
    ],
  },
  {
    equip: 'stability ball',
    quota: 5,
    priority: [
      'stability ball crunch', 'stability ball plank', 'stability ball rollout',
      'stability ball hip thrust', 'stability ball pass',
    ],
  },
  {
    equip: 'ez barbell',
    quota: 4,
    priority: [
      'ez bar curl', 'ez bar skullcrusher', 'ez bar preacher curl',
      'ez bar overhead extension',
    ],
  },
]

function escSql(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''").replace(/\r?\n/g, '\\n')}'`
}

function fetchJson(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 60000 }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location, retries).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)) }
      })
    })
    req.on('timeout', () => { req.destroy(new Error('timeout')) })
    req.on('error', async err => {
      if (retries > 0) {
        process.stderr.write(`下载失败 (${err.message})，${retries} 次重试机会，3 秒后重试...\n`)
        await new Promise(r => setTimeout(r, 3000))
        fetchJson(url, retries - 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

async function main() {
  let all
  if (existsSync(LOCAL_JSON)) {
    // 有本地备份直接读，不依赖网络
    process.stderr.write(`读取本地备份 ${LOCAL_JSON}...\n`)
    all = JSON.parse(readFileSync(LOCAL_JSON, 'utf8'))
  } else {
    process.stderr.write('正在下载 exercises.json (约 3.4MB)...\n')
    all = await fetchJson(`${GITHUB_RAW}/data/exercises.json`)
    // 保存本地备份，以后不再依赖 GitHub
    writeFileSync(LOCAL_JSON, JSON.stringify(all), 'utf8')
    process.stderr.write(`已保存本地备份到 ${LOCAL_JSON}\n`)
  }
  process.stderr.write(`共 ${all.length} 条\n\n`)

  // 按器械分桶
  const byEquip = {}
  for (const ex of all) {
    const eq = (ex.equipment || '').toLowerCase()
    if (!byEquip[eq]) byEquip[eq] = []
    byEquip[eq].push(ex)
  }

  // 按计划筛选
  const selected = []
  for (const plan of EQUIP_PLAN) {
    const pool = byEquip[plan.equip] || []
    const priorityLower = plan.priority.map(p => p.toLowerCase())
    const bucket = []

    // 先按优先级加入
    for (const name of priorityLower) {
      const match = pool.find(e => e.name.toLowerCase() === name)
      if (match && !bucket.find(b => b.id === match.id)) bucket.push(match)
      if (bucket.length >= plan.quota) break
    }

    // 不足配额时从剩余里按字母顺序补
    if (bucket.length < plan.quota) {
      const usedIds = new Set(bucket.map(e => e.id))
      const rest = pool
        .filter(e => !usedIds.has(e.id))
        .sort((a, b) => a.name.localeCompare(b.name))
      for (const e of rest) {
        bucket.push(e)
        if (bucket.length >= plan.quota) break
      }
    }

    process.stderr.write(`${plan.equip.padEnd(18)} → 筛出 ${bucket.length} 条\n`)
    selected.push(...bucket)
  }

  process.stderr.write(`\n合计: ${selected.length} 条\n`)

  // ── 生成 SQL ────────────────────────────────────────────────
  const lines = [
    '-- ============================================================',
    `-- 从 exercises-dataset 导入 ${selected.length} 条动作`,
    `-- 生成时间: ${new Date().toISOString()}`,
    '-- 图片来自 Gym Visual (gymvisual.com)，非商业使用',
    '-- ============================================================',
    '',
    'BEGIN;',
    '',
  ]

  for (const ex of selected) {
    const type    = TYPE_MAP[ex.category] || { cn: '功能性训练', en: 'Functional Training' }
    const instrEn = (ex.instructions?.en) ||
                    (ex.instruction_steps?.en?.join(' ')) || null
    // 中文：尝试 zh 键，无则留 NULL 等人工补充
    const instrCn = (ex.instructions?.zh) ||
                    (ex.instruction_steps?.zh?.join(' ')) || null
    const nameCn  = ex.name_cn || null
    const targetEn = ex.target || null
    const targetCn = targetEn ? (MUSCLE_CN[targetEn] || targetEn) : null
    const imgFile  = ex.image ? ex.image.replace('images/', '') : null
    const imageUrl = imgFile ? `${IMAGE_BASE}/${imgFile}` : null
    const equipEn  = ex.equipment || null
    const equipCn  = equipEn ? (EQUIP_CN[equipEn.toLowerCase()] || equipEn) : null

    lines.push(
      `-- ${ex.name} [${ex.equipment}]`,
      `INSERT INTO master_exercise (`,
      `  name_en, name_cn,`,
      `  type_en, type_cn,`,
      `  equipment_en, equipment_cn,`,
      `  target_muscles_en, target_muscles_cn,`,
      `  instructions_en, instructions_cn,`,
      `  featured_image_url,`,
      `  is_active, created_at`,
      `) VALUES (`,
      `  ${escSql(ex.name)}, ${escSql(nameCn)},`,
      `  ${escSql(type.en)}, ${escSql(type.cn)},`,
      `  ${escSql(equipEn)}, ${escSql(equipCn)},`,
      `  ${escSql(targetEn)}, ${escSql(targetCn)},`,
      `  ${escSql(instrEn)}, ${escSql(instrCn)},`,
      `  ${escSql(imageUrl)},`,
      `  true, NOW()`,
      `) ON CONFLICT DO NOTHING;`,
      '',
    )
  }

  lines.push('COMMIT;', '')
  lines.push(`-- 共 ${selected.length} 条`)
  lines.push(`-- name_cn / instructions_cn 为 NULL 的条目需人工补中文`)
  lines.push(`-- 验证：SELECT name_en, equipment_en, type_cn FROM master_exercise`)
  lines.push(`--        WHERE created_at > NOW() - INTERVAL '10 minutes' ORDER BY type_cn, name_en;`)

  process.stdout.write(lines.join('\n') + '\n')
}

main().catch(e => {
  process.stderr.write('❌ 错误: ' + e.message + '\n')
  process.exit(1)
})
