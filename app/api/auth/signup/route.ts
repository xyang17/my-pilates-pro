import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    const userRole = role === 'TRAINER' ? 'TRAINER' : role === 'ADMIN' ? 'ADMIN' : 'CLIENT'

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // Insert into user table
    const { error: dbError } = await supabaseAdmin
      .from('user')
      .insert([{ id: userId, email, name, role: userRole }])

    if (dbError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Account created successfully', userId }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
