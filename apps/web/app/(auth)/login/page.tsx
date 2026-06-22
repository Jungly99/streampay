'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const BACKEND = process.env.NEXT_PUBLIC_SOCKET_URL ?? ''

function LoginContent() {
  const params = useSearchParams()
  const error = params.get('error')

  const errorMsg = error === 'no_account'
    ? 'No account found for this Google account. Please sign up first.'
    : error
      ? 'Sign-in was cancelled or failed. Please try again.'
      : null

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>

      {/* ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 28 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#f8fafc' }}>eztips</span>
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '36px 32px' }}>

          {errorMsg && (
            <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#f87171', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <a href={`${BACKEND}/api/auth/google?mode=login`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            width: '100%', padding: '13px 20px', borderRadius: 11, textDecoration: 'none',
            background: '#fff', color: '#1f2937', fontSize: 15, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'opacity .15s', cursor: 'pointer',
          }}>
            <GoogleIcon />
            Continue with Google
          </a>

          <p style={{ marginTop: 20, fontSize: 12, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
            By signing in you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Sign up free →</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.85l6.08-6.08C34.46 3.04 29.53 1 24 1 14.82 1 7.01 6.57 3.5 14.44l7.1 5.52C12.35 13.7 17.72 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.68c-.55 2.94-2.22 5.43-4.72 7.1l7.27 5.65C43.36 37.63 46.5 31.5 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.6 28.56A14.56 14.56 0 0 1 9.5 24c0-1.59.27-3.13.75-4.57l-7.1-5.52A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.57 10.76l8.03-6.2z"/>
      <path fill="#34A853" d="M24 47c5.52 0 10.15-1.83 13.53-4.97l-7.27-5.65c-1.87 1.26-4.26 2.01-6.26 2.01-6.28 0-11.65-4.2-13.4-9.83l-8.03 6.2C7.01 41.43 14.82 47 24 47z"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
