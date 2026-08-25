import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-page-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Logo */}
      <img
        src="/logo.png"
        alt="MyFitnessPro"
        style={{
          width: 96, height: 96, borderRadius: 20,
          marginBottom: 16, objectFit: 'cover',
        }}
      />

      <h1 style={{
        margin: '0 0 8px',
        fontSize: 'var(--text-2xl)',
        fontWeight: 700,
        color: 'var(--c-text-primary)',
        letterSpacing: '-0.5px',
      }}>
        MyFitnessPro
      </h1>

      <p style={{
        margin: '0 0 40px',
        fontSize: 'var(--text-base)',
        color: 'var(--c-text-secondary)',
        textAlign: 'center',
        maxWidth: 280,
      }}>
        专业普拉提教练管理平台
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
        <Link href="/auth/login" style={{
          display: 'block',
          padding: '14px',
          background: 'var(--c-brand)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 'var(--r-lg)',
          textAlign: 'center',
          fontSize: 'var(--text-base)',
          fontWeight: 600,
        }}>
          登录
        </Link>
        <Link href="/auth/signup" style={{
          display: 'block',
          padding: '14px',
          background: 'var(--c-card-bg)',
          color: 'var(--c-text-primary)',
          textDecoration: 'none',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--c-border)',
          textAlign: 'center',
          fontSize: 'var(--text-base)',
          fontWeight: 500,
        }}>
          注册新账号
        </Link>
      </div>
    </div>
  )
}
