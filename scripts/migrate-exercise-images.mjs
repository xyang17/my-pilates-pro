/**
 * 把 master_exercise 里来自 GitHub 的图片
 * 下载后上传到 Supabase Storage，更新 featured_image_url
 *
 * 运行前需要设置环境变量（或在 .env.local 里）：
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 运行：node scripts/migrate-exercise-images.mjs
 */

import https from 'https'
import http from 'http'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET        = 'exercise-images'   // Supabase Storage bucket 名

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// 下载图片为 Buffer
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }))
    }).on('error', reject)
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  // 1. 确保 bucket 存在
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) { console.error('创建 bucket 失败:', error.message); process.exit(1) }
    console.log(`✅ 创建 bucket "${BUCKET}"`)
  }

  // 2. 拉取所有指向 GitHub 的动作（图片或 GIF）
  const { data: exercises, error } = await supabase
    .from('master_exercise')
    .select('id, name_en, featured_image_url, gif_url')
    .or('featured_image_url.like.%githubusercontent.com%,gif_url.like.%githubusercontent.com%')
    .order('name_en')

  if (error) { console.error('查询失败:', error.message); process.exit(1) }
  console.log(`找到 ${exercises.length} 条需要迁移的动作\n`)

  let ok = 0, fail = 0

  for (const ex of exercises) {
    const patch = {}

    // 迁移静态图片
    if (ex.featured_image_url?.includes('githubusercontent.com')) {
      try {
        const filename = ex.featured_image_url.split('/').pop()
        const storagePath = `exercises/${filename}`
        const { buffer, contentType } = await downloadBuffer(ex.featured_image_url)
        const { error: upErr } = await supabase.storage
          .from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false })
        if (upErr && !upErr.message.includes('already exists')) throw new Error(upErr.message)
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        patch.featured_image_url = publicUrl
      } catch (e) { console.error(`❌ 图片 ${ex.name_en}: ${e.message}`); fail++ }
    }

    // 迁移 GIF
    if (ex.gif_url?.includes('githubusercontent.com')) {
      try {
        const filename = ex.gif_url.split('/').pop()
        const storagePath = `exercises/gif/${filename}`
        const { buffer, contentType } = await downloadBuffer(ex.gif_url)
        const { error: upErr } = await supabase.storage
          .from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false })
        if (upErr && !upErr.message.includes('already exists')) throw new Error(upErr.message)
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        patch.gif_url = publicUrl
      } catch (e) { console.error(`❌ GIF ${ex.name_en}: ${e.message}`); fail++ }
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from('master_exercise').update(patch).eq('id', ex.id)
      console.log(`✅ ${ex.name_en} → ${Object.keys(patch).join(' + ')}`)
      ok++
    }

    await sleep(300)
  }

  console.log(`\n完成：成功 ${ok} 条，失败 ${fail} 条`)
  if (fail > 0) console.log('失败的条目可以重新运行脚本，已上传的会自动跳过')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
