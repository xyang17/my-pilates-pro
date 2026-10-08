import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { summarizeClients } from '@/lib/clientSummary'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients — list all users with role CLIENT
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url, created_at')
      .eq('role', 'CLIENT')
      .order('name')

    if (error) throw error
    // 卡片摘要：付费方式、课时包剩余、满赠进度、最近/下次上课、提醒。批量算，见 lib/clientSummary.ts
    const rows = data || []
    const summaries = await summarizeClients(rows.map(r => r.id))
    return NextResponse.json(rows.map(r => ({ ...r, summary: summaries[r.id] || null })))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
