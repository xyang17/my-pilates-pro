import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>MyPilatesPro</h1>
      <p>Welcome to your pilates app</p>
      
      <div style={{ marginTop: '30px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <Link href="/auth/login" style={{ padding: '10px 20px', backgroundColor: '#9B7DB5', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Login
        </Link>
        <Link href="/auth/signup" style={{ padding: '10px 20px', backgroundColor: '#9B7DB5', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Sign Up
        </Link>
      </div>
    </div>
  )
}