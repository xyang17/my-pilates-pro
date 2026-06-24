import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: List classes (trainer sees all their client's classes, client sees their own)
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabaseAdmin
      .from('class')
      .select(`
        id,
        name,
        date,
        duration,
        type,
        status,
        created_by,
        assigned_to,
        notes,
        feedback,
        created_at,
        updated_at
      `)

    // If trainer, see all their created classes
    // If client, see trainer-created classes assigned to them + their own
    if (userRole === 'TRAINER') {
      query = query.eq('created_by', userId)
    } else {
      // Client sees: classes created by trainers assigned to them + their own
      query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create a new class
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, date, duration, type, assignedTo, notes } = await req.json()

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Class name and date are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('class')
      .insert([
        {
          name,
          date,
          duration: duration || 60,
          type: type || 'General',
          status: 'planned',
          created_by: userId,
          assigned_to: assignedTo || null,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
