import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/classes/[id]/photos
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('class_photo')
      .select('id, url, sort_order')
      .eq('class_id', id)
      .order('sort_order')

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
