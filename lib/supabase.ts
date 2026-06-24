import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side queries with elevated permissions
// TODO: Uncomment when building API routes (Phase 2)
// import { createClient as createServerClient } from '@supabase/supabase-js'
//
// export const supabaseServer = createServerClient(
//   supabaseUrl,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )

// Helper: get current authenticated user
export async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Auth error:', error)
    return null
  }

  return user
}