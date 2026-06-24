import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create user record
    const { error: userError } = await supabaseAdmin.from('user').insert([
      {
        id: authData.user.id,
        email,
        name,
        role: 'CLIENT',
      },
    ])

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Create client record
    await supabaseAdmin.from('client').insert([
      {
        user_id: authData.user.id,
        date_joined: new Date().toISOString(),
      },
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}