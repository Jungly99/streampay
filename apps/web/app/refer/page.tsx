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

function ReferContent() {
  const params = useSearchParams()
  const error = params.get('error')
  const errorMsg = error === 'no_referral_account'
    ? 'No referral partner account found for that Google login — sign up below first.'
    : error ? 'Sign-in was cancelled or failed. Please try again.' : null
  const googleUrl = `${BACKEND}/api/auth/google?mode=signup&accountType=referral`

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Link href="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0, textDecoration: 'none', marginBottom: 20 }}>
            <img src="/logo.png" alt="EzTips" style={{ height: 64, width: 'auto', borderRadius: 14, filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.55))' }} />
          </Link>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22d3ee', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 20, padding: '4px 12px', marginBottom: 14 }}>
            Referral Program
          </span>
          <h1 style={{ fontSize: 25, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 8 }}>Earn by referring streamers</h1>
          <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
            Get verified, grab your referral code, and earn <strong style={{ color: '#e2e8f0' }}>1% of every donation</strong> a streamer you referred ever receives.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { n: '1', t: 'Sign up & verify', d: 'Add your bank details' },
            { n: '2', t: 'Share your code', d: 'New streamers sign up with it' },
            { n: '3', t: 'Get paid', d: '1% of their donations, forever' },
          ].map(s => (
            <div key={s.n} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', color: '#22d3ee', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{s.n}</div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', margin: '0 0 3px' }}>{s.t}</p>
              <p style={{ fontSize: 10.5, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{s.d}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 28px' }}>
          {errorMsg && (
            <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', fontSize: 13, color: '#f87171', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}
          <a href={googleUrl} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            width: '100%', padding: '13px 20px', borderRadius: 11, textDecoration: 'none',
            background: '#fff', color: '#1f2937', fontSize: 15, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', cursor: 'pointer',
          }}>
            <GoogleIcon />
            Continue with Google
          </a>
          <p style={{ marginTop: 16, fontSize: 12, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
            Minimum payout is ₹100. By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
          Already a referral partner?{' '}
          <a href={`${BACKEND}/api/auth/google?mode=login&accountType=referral`} style={{ color: '#22d3ee', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
        </p>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 8 }}>
          Want to stream instead?{' '}
          <Link href="/signup" style={{ color: '#64748b', textDecoration: 'underline' }}>Sign up as a streamer</Link>
        </p>
      </div>
    </div>
  )
}

export default function ReferSignupPage() {
  return (
    <Suspense>
      <ReferContent />
    </Suspense>
  )
}
