import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function callClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY 未配置，请在 Vercel 环境变量中添加后重新部署')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API 错误 (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text?.trim() || ''
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, lang = 'zh' } = body
    const isEn = lang === 'en'

    // ── Theme suggestion ──────────────────────────────────────────────
    if (type === 'theme') {
      const exercises: { name_cn: string; name_en: string }[] = body.exercises || []
      if (exercises.length === 0) {
        return NextResponse.json({ error: isEn ? 'No exercises added yet' : '请先添加动作' }, { status: 400 })
      }

      const nameList = isEn
        ? exercises.map(e => e.name_en).join(', ')
        : exercises.map(e => `${e.name_cn}（${e.name_en}）`).join('、')

      const prompt = isEn
        ? `You are a professional Pilates/fitness coach assistant. Based on the following exercise list, suggest a concise class theme or focus (3–6 words), such as "Core Strength & Activation", "Hip Mobility Flow", "Full Body Foundation", "Spinal Decompression & Release".

Exercise list: ${nameList}

Return only the theme name itself — no punctuation, quotes, or extra explanation.`
        : `你是一位专业普拉提/健身教练助手。根据以下动作列表，建议一个简洁的课程主题（5-15个汉字），例如"核心力量激活"、"髋关节灵活性改善"、"全身力量基础训练"、"脊椎延展放松"。

动作列表：${nameList}

只返回主题名称本身，不要任何标点、引号或额外解释。`

      const result = await callClaude(prompt)
      return NextResponse.json({ result })
    }

    // ── Post-class summary ────────────────────────────────────────────
    if (type === 'summary') {
      const exercises: {
        name_cn: string
        name_en: string
        sets?: number
        reps?: number
        weight?: number
        weight_unit?: string
        actual_sets?: number | ''
        actual_reps?: number | ''
        actual_weight?: number | ''
        instance_notes?: string
        post_note?: string
      }[] = body.exercises || []

      const classNotes: string = body.classNotes || ''

      const exLines = exercises.map(ex => {
        const name = isEn ? ex.name_en : `${ex.name_cn}（${ex.name_en}）`
        const parts: string[] = [`[${name}]`]
        const unit = ex.weight_unit || 'kg'

        // Weight comparison
        if (ex.weight != null && ex.actual_weight != null && ex.actual_weight !== '') {
          const diff = Number(ex.actual_weight) - ex.weight
          const sign = diff > 0 ? '+' : ''
          parts.push(isEn
            ? `Weight: planned ${ex.weight}${unit} → actual ${ex.actual_weight}${unit} (${sign}${diff})`
            : `重量：计划${ex.weight}${unit} → 实际${ex.actual_weight}${unit}（${sign}${diff}）`)
        } else if (ex.weight != null) {
          parts.push(isEn ? `Planned weight: ${ex.weight}${unit}` : `计划重量：${ex.weight}${unit}`)
        } else if (ex.actual_weight != null && ex.actual_weight !== '') {
          parts.push(isEn ? `Actual weight: ${ex.actual_weight}${unit}` : `实际重量：${ex.actual_weight}${unit}`)
        }

        // Sets / reps
        const ps = [ex.sets != null ? (isEn ? `${ex.sets} sets` : `${ex.sets}组`) : '',
                    ex.reps != null ? (isEn ? `${ex.reps} reps` : `${ex.reps}次`) : ''].filter(Boolean).join(' × ')
        const as_ = [ex.actual_sets != null && ex.actual_sets !== '' ? (isEn ? `${ex.actual_sets} sets` : `${ex.actual_sets}组`) : '',
                     ex.actual_reps != null && ex.actual_reps !== '' ? (isEn ? `${ex.actual_reps} reps` : `${ex.actual_reps}次`) : ''].filter(Boolean).join(' × ')
        if (ps) parts.push(isEn ? `Planned: ${ps}${as_ ? ` → actual: ${as_}` : ''}` : `计划：${ps}${as_ ? ` → 实际：${as_}` : ''}`)

        if (ex.instance_notes) parts.push(isEn ? `Notes: ${ex.instance_notes}` : `备注：${ex.instance_notes}`)
        if (ex.post_note) parts.push(isEn ? `Post-class note: ${ex.post_note}` : `课后记录：${ex.post_note}`)

        return parts.join('; ')
      }).join('\n')

      const prompt = isEn
        ? `You are a professional Pilates/fitness coach. Based on the following post-class data, write a professional post-class review summary (about 100–150 words).

${exLines}
${classNotes ? `\nOverall notes: ${classNotes}` : ''}

Include: ① Today's highlights or improvements ② Any concerns to watch ③ Suggestions for next session. Use a professional yet friendly tone, written in natural prose (not bullet points).`
        : `你是一位专业普拉提/健身教练。根据以下课后数据，写一段专业的课后复盘总结（约100-150字）。

${exLines}
${classNotes ? `\n整体备注：${classNotes}` : ''}

请包含：① 今日亮点或进步 ② 需关注的问题 ③ 下次建议。语气专业、简洁，写成自然段落（不要分点列举）。`

      const result = await callClaude(prompt)
      return NextResponse.json({ result })
    }

    return NextResponse.json({ error: isEn ? 'Unknown type' : '未知类型' }, { status: 400 })
  } catch (err: any) {
    console.error('[AI suggest]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
