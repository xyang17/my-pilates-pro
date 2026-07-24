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

  // 2. 拉取所有 featured_image_url 指向 GitHub 的动作
  const { data: exercises, error } = await supabase
    .from('master_exercise')
    .select('id, name_en, featured_image_url')
    .like('featured_image_url', '%githubusercontent.com%')
    .order('name_en')

  if (error) { console.error('查询失败:', error.message); process.exit(1) }
  console.log(`找到 ${exercises.length} 条需要迁移图片的动作\n`)

  let ok = 0, fail = 0

  for (const ex of exercises) {
    const oldUrl = ex.featured_image_url
    // 文件名从 URL 末尾取
    const filename = oldUrl.split('/').pop()
    const storagePath = `exercises/${filename}`

    try {
      // 下载
      const { buffer, contentType } = await downloadBuffer(oldUrl)

      // 上传到 Supabase Storage（已存在则跳过）
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType, upsert: false })

      if (upErr && !upErr.message.includes('already exists')) {
        throw new Error(upErr.message)
      }

      // 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      // 更新数据库
      await supabase
        .from('master_exercise')
        .update({ featured_image_url: publicUrl })
        .eq('id', ex.id)

      console.log(`✅ ${ex.name_en}`)
      ok++
    } catch (e) {
      console.error(`❌ ${ex.name_en}: ${e.message}`)
      fail++
    }

    // 避免请求太快被 GitHub 限速
    await sleep(200)
  }

  console.log(`\n完成：成功 ${ok} 条，失败 ${fail} 条`)
  if (fail > 0) console.log('失败的条目可以重新运行脚本，已上传的会自动跳过')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
