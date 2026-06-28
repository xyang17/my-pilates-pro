'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/auth/login')
    } catch (err: any) {
      setError(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--c-page-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-5)',
    }}>
      {/* Logo 区域 */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--r-lg)',
          background: 'var(--c-lavender)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          margin: '0 auto var(--sp-4)',
        }}>
          🌸
        </div>
        <h1 style={{
          margin: 0,
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--c-text-primary)',
          letterSpacing: '-0.3px',
        }}>
          MyPilatesPro
        </h1>
        <p style={{
          margin: 'var(--sp-1) 0 0',
          fontSize: 'var(--text-sm)',
          color: 'var(--c-text-secondary)',
        }}>
          教练与学员专属平台
        </p>
      </div>

      {/* 注册卡片 */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--c-card-bg)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--c-border)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--sp-8) var(--sp-6)',
      }}>
        <h2 style={{
          margin: '0 0 var(--sp-6)',
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--c-text-primary)',
        }}>
          创建账号
        </h2>

        <form onSubmit={handleSignup}>
          {/* 姓名 */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--c-text-primary)',
              marginBottom: 'var(--sp-2)',
            }}>
              姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="你的名字"
              required
              style={{
                width: '100%',
                padding: '12px var(--sp-4)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--c-text-primary)',
              marginBottom: 'var(--sp-2)',
            }}>
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '12px var(--sp-4)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 'var(--sp-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
              <label style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--c-text-primary)',
              }}>
                密码
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-brand)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  padding: 0,
                }}
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              style={{
                width: '100%',
                padding: '12px var(--sp-4)',
                fontSize: 'var(--text-base)',
              }}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              background: 'var(--c-error-bg)',
              border: '1px solid var(--c-error)',
              borderRadius: 'var(--r-sm)',
              padding: 'var(--sp-3) var(--sp-4)',
              marginTop: 'var(--sp-4)',
              fontSize: 'var(--text-sm)',
              color: '#8C4A4A',
            }}>
              {error}
            </div>
          )}

          {/* 注册按钮 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              marginTop: 'var(--sp-6)',
              background: loading ? 'var(--c-lavender)' : 'var(--c-brand)',
              color: 'var(--c-text-on-brand)',
              border: 'none',
              borderRadius: 'var(--r-md)',
              fontSize: 'var(--text-base)',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--c-brand-hover)' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--c-brand)' }}
          >
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <p style={{
          marginTop: 'var(--sp-6)',
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
          color: 'var(--c-text-secondary)',
        }}>
          已有账号？{' '}
          <Link href="/auth/login" style={{ color: 'var(--c-brand)', textDecoration: 'none', fontWeight: 500 }}>
            直接登录
          </Link>
        </p>
      </div>
    </div>
  )
}
