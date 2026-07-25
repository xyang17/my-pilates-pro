/**
 * 给已导入的动作补上 gif_url 和 featured_image_url
 * 从本地 exercises_data.json 读取，按 name_en 匹配更新数据库
 * 运行：node scripts/add-gif-urls.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GITHUB_RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'

const localPath = resolve(__dirname, 'exercises_data.json')
const allExercises = JSON.parse(readFileSync(localPath, 'utf8'))

// 建立 name → 图片/GIF 的映射
const nameMap = {}
for (const ex of allExercises) {
  const imgFile = ex.image?.replace('images/', '')
  const gifFile = ex.gif_url?.replace('videos/', '')
  nameMap[ex.name.toLowerCase()] = {
    image_url: imgFile ? `${GITHUB_RAW}/images/${imgFile}` : null,
    gif_url:   gifFile ? `${GITHUB_RAW}/videos/${gifFile}` : null,
  }
}

async function main() {
  // 取出所有动作（只取 name_en、featured_image_url、gif_url）
  const { data: rows, error } = await supabase
    .from('master_exercise')
    .select('id, name_en, featured_image_url, gif_url')
    .order('name_en')

  if (error) { console.error('查询失败:', error.message); process.exit(1) }
  console.log(`数据库共 ${rows.length} 条动作`)

  let updated = 0, skipped = 0, notFound = 0

  for (const row of rows) {
    const key = row.name_en?.toLowerCase()
    const match = nameMap[key]
    if (!match) { notFound++; continue }

    // 只更新缺失的字段
    const patch = {}
    if (!row.gif_url && match.gif_url)             patch.gif_url = match.gif_url
    if (!row.featured_image_url && match.image_url) patch.featured_image_url = match.image_url

    if (Object.keys(patch).length === 0) { skipped++; continue }

    const { error: upErr } = await supabase
      .from('master_exercise')
      .update(patch)
      .eq('id', row.id)

    if (upErr) {
      console.error(`❌ ${row.name_en}: ${upErr.message}`)
    } else {
      console.log(`✅ ${row.name_en} → ${Object.keys(patch).join(', ')}`)
      updated++
    }
  }

  console.log(`\n完成：更新 ${updated} 条，已有跳过 ${skipped} 条，未找到匹配 ${notFound} 条`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
