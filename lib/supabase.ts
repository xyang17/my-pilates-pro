import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 浏览器里走本站域名转发（/sb → supabase.co，见 next.config.ts 的 rewrites）。
// 国内网络直连 supabase.co 不稳定，登录会偶发「Load failed」；网站能打开，同域名就能连上。
const browserUrl = typeof window !== 'undefined' ? `${window.location.origin}/sb` : supabaseUrl

// 登录状态存在 localStorage 里，键名默认按 URL 的域名生成。换成转发地址后键名会变，
// 所有人会被踢下线——所以这里固定成原来的键名，已登录的人不受影响。
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

export const supabase = createClient(browserUrl, supabaseAnonKey, {
  auth: { storageKey: `sb-${projectRef}-auth-token` },
})

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