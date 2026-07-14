import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const monthStart = dateStr.slice(0, 7) + '-01'

    const isTrainer = userRole === 'TRAINER' || userRole === 'ADMIN'

    // Today's classes (trainer sees their own, client sees their enrolled)
    const { data: todayClasses } = await supabaseAdmin
      .from('fitness_class')
      .select('id, name, date, duration, type, class_type, status, post_summary, trainer_id')
      .eq('trainer_id', userId)
      .gte('date', dateStr + 'T00:00:00')
      .lte('date', dateStr + 'T23:59:59')
      .order('date', { ascending: true })

    // Client names for today's classes (two-step to avoid reserved word 'user')
    let classesWithClients: any[] = todayClasses || []
    if (isTrainer && todayClasses && todayClasses.length > 0) {
      const classIds = todayClasses.map(c => c.id)
      const { data: enrollments } = await supabaseAdmin
        .from('class_enrollment')
        .select('class_id, client_id')
        .in('class_id', classIds)

      if (enrollments) {
        const clientIds = [...new Set(enrollments.map(e => e.client_id))]
        const { data: profiles } = await supabaseAdmin
          .from('user_profile')
          .select('id, name')
          .in('id', clientIds)

        const profileMap: Record<string, string> = {}
        profiles?.forEach(p => { profileMap[p.id] = p.name })

        const enrollMap: Record<string, string[]> = {}
        enrollments.forEach(e => {
          if (!enrollMap[e.class_id]) enrollMap[e.class_id] = []
          enrollMap[e.class_id].push(profileMap[e.client_id] || '学员')
        })

        classesWithClients = todayClasses.map(c => ({
          ...c,
          client_names: enrollMap[c.id] || [],
        }))
      }
    }

    // This month's class count
    const { count: monthCount } = await supabaseAdmin
      .from('fitness_class')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', userId)
      .gte('date', monthStart)

    // Pending review (completed but no post_summary)
    const { count: pendingReview } = await supabaseAdmin
      .from('fitness_class')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', userId)
      .eq('status', 'completed')
      .is('post_summary', null)

    // Client count
    let clientCount = 0
    if (isTrainer) {
      const { count } = await supabaseAdmin
        .from('user_profile')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'CLIENT')
      clientCount = count || 0
    }

    return NextResponse.json({
      today_classes: classesWithClients,
      month_count: monthCount || 0,
      pending_review: pendingReview || 0,
      client_count: clientCount,
      date: dateStr,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
