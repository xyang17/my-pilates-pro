import type { NextConfig } from "next";

// 浏览器端的 Supabase 请求（登录、刷新登录状态、退出）走本站域名转发：
//   https://<本站>/sb/auth/v1/...  →  https://<project>.supabase.co/auth/v1/...
// 原因：国内手机网络直连 supabase.co（新加坡）时好时坏，Safari 会报「Load failed」，
// 请求根本到不了 Supabase。网站本身能打开，走同一个域名就能登录。见 lib/supabase.ts。
// 服务端 API 路由（lib/db.ts 的 supabaseAdmin）是服务器对服务器，不受影响，仍然直连。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!supabaseUrl) return [];
    return [
      { source: "/sb/:path*", destination: `${supabaseUrl}/:path*` },
    ];
  },
};

export default nextConfig;
