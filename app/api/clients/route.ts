import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
