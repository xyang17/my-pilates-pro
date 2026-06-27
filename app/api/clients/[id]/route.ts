import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/clients/[id] — client profile + class history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Trainers can see any client; clients can only see themselves
    if (userRole !== 'ADMIN' && userRole !== 'TRAINER' && userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: client, error } = await supabaseAdmin
      .from('user')
      .select('id, name, email, photo_url, bio, created_at, role')
      .eq('id', id)
      .single()

    if (error) throw error

    // Class history: classes assigned to this client
    const { data: classes } = await supabaseAdmin
      .from('class')
      .select('id, name, date, start_time, duration, discipline, class_type, level, status, color')
      .eq('assigned_to', id)
      .order('date', { ascending: false })
      .limit(50)

    return NextResponse.json({ ...client, classes: classes || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
