import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

async function callClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY 未配置')

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
    throw new Error(`AI 请求失败: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text?.trim() || ''
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type } = body

    if (type === 'theme') {
      // Suggest a class theme/discipline based on exercise list
      const exercises: { name_cn: string; name_en: string }[] = body.exercises || []
      if (exercises.length === 0) return NextResponse.json({ error: '没有动作' }, { status: 400 })

      const nameList = exercises
        .map(e => `${e.name_cn}（${e.name_en}）`)
        .join('、')

      const prompt = `你是一位专业普拉提/健身教练助手。根据以下课程动作列表，建议一个简洁的课程主题（5-15个汉字），例如"核心力量激活"、"髋关节灵活性改善"、"全身力量基础训练"、"脊椎延展放松"等。

动作列表：${nameList}

只返回主题名称本身，不要任何标点、引号或额外解释。`

      const result = await callClaude(prompt)
      return NextResponse.json({ result })
    }

    if (type === 'summary') {
      // Generate post-class summary based on exercise results and notes
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
        const parts: string[] = [`【${ex.name_cn}】`]

        // Weight/spring comparison
        if (ex.weight != null && ex.actual_weight != null && ex.actual_weight !== '') {
          const diff = Number(ex.actual_weight) - ex.weight
          const sign = diff > 0 ? '+' : ''
          parts.push(`重量：计划${ex.weight}${ex.weight_unit || 'kg'} → 实际${ex.actual_weight}${ex.weight_unit || 'kg'}（${sign}${diff}）`)
        } else if (ex.weight != null) {
          parts.push(`计划重量：${ex.weight}${ex.weight_unit || 'kg'}`)
        } else if (ex.actual_weight != null && ex.actual_weight !== '') {
          parts.push(`实际重量：${ex.actual_weight}${ex.weight_unit || 'kg'}`)
        }

        // Sets/reps
        if (ex.sets != null || ex.reps != null) {
          const planned = [ex.sets != null ? `${ex.sets}组` : '', ex.reps != null ? `${ex.reps}次` : ''].filter(Boolean).join('×')
          const actual = [
            ex.actual_sets != null && ex.actual_sets !== '' ? `${ex.actual_sets}组` : '',
            ex.actual_reps != null && ex.actual_reps !== '' ? `${ex.actual_reps}次` : '',
          ].filter(Boolean).join('×')
          if (planned) parts.push(`计划：${planned}${actual ? ` → 实际：${actual}` : ''}`)
        }

        // Notes
        if (ex.instance_notes) parts.push(`备注：${ex.instance_notes}`)
        if (ex.post_note) parts.push(`课后记录：${ex.post_note}`)

        return parts.join('；')
      }).join('\n')

      const prompt = `你是一位专业普拉提/健身教练。根据以下课后数据，写一段专业的课后复盘总结（约100-150字）。

${exLines}
${classNotes ? `\n整体备注：${classNotes}` : ''}

请包含：① 今日亮点或进步 ② 需关注的问题 ③ 下次建议。语气专业、简洁，用第三人称或直接描述课程，不要分点列举，写成自然段落。`

      const result = await callClaude(prompt)
      return NextResponse.json({ result })
    }

    return NextResponse.json({ error: '未知类型' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
