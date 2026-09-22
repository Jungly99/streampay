'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const BACKEND = process.env.NEXT_PUBLIC_SOCKET_URL ?? ''

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

function SignupContent() {
  const params = useSearchParams()
  const refCode = params.get('ref')
  // Always streamer — viewer option removed
  const googleUrl = `${BACKEND}/api/auth/google?mode=signup&accountType=streamer${refCode ? `&refCode=${encodeURIComponent(refCode)}` : ''}`

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0, textDecoration: 'none', marginBottom: 24 }}>
            <img src="/logo.png" alt="EzTips" style={{ height: 72, width: 'auto', borderRadius: 16, filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.55))' }} />
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 13, color: '#475569' }}>Join Indian streamers on eztips. Free forever.</p>
          {refCode && (
            <p style={{ fontSize: 12, color: '#a78bfa', marginTop: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
              Referred with code <strong>{refCode}</strong>
            </p>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 28px' }}>

          {/* Google button */}
          <a href={googleUrl} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            width: '100%', padding: '13px 20px', borderRadius: 11, textDecoration: 'none',
            background: '#fff', color: '#1f2937', fontSize: 15, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', cursor: 'pointer',
          }}>
            <GoogleIcon />
            Continue with Google
          </a>

          <p style={{ marginTop: 18, fontSize: 12, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}
