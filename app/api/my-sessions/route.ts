import { NextRequest, NextResponse } from 'next/server'
import { summarizeClients } from '@/lib/clientSummary'

// GET /api/my-sessions —— 学员看自己的课时包剩余和满赠进度（学员首页「我的课时」卡片用）
//
// 只返回学员自己的，而且只返回学员该看的部分：
//   课时包：剩几节 / 共几节 / 用了几节 / 最近到期日（没有有效课时包就是 null）
//   满赠：每满几节送几节 / 累计 / 还差几节 / 有几节待发（没参加满赠就是 null）
// 不返回：课时包价格、教练手工认的历史节数、教练端的各种提醒——这些是经营信息。
// 两样都没有时 has_anything = false，前端整张卡片不显示。
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const s = (await summarizeClients([userId]))[userId]
    if (!s) return NextResponse.json({ has_anything: false, package: null, loyalty: null })

    const pkg = s.payment.mode === 'package'
      ? {
          remaining: s.payment.remaining,
          granted: s.payment.granted,
          used: s.payment.used,
          expires_at: s.payment.nearest_expiry,
        }
      : null

    const L = s.loyalty
    const loyalty = L.enabled
      ? {
          threshold: L.threshold,
          bonus: L.bonus,
          // 学员看到的是「这一轮攒到第几节」，不暴露教练认的历史节数是多少
          progress: L.total % L.threshold,
          to_next: L.to_next,
          pending_sessions: L.pending * L.bonus,
        }
      : null

    return NextResponse.json({ has_anything: !!(pkg || loyalty), package: pkg, loyalty })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
