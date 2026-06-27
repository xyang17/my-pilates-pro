import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: trainer, error } = await supabaseAdmin
      .from('user')
      .select('id, name, bio, photo_url, certificate, role, email')
      .eq('id', id)
      .single()

    if (error) throw error

    // Get trainer's upcoming classes
    const { data: classes } = await supabaseAdmin
      .from('class')
      .select('id, name, date, start_time, duration, discipline, class_type, level, status, color')
      .eq('trainer_id', id)
      .order('date', { ascending: true })
      .limit(20)

    return NextResponse.json({ ...trainer, classes: classes || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
