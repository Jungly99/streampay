'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
})
type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#f8fafc', outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const user = await api.post<{ accountType: string }>('/api/auth/login', data)
      toast.success('Welcome back!')
      router.push(user.accountType === 'streamer' ? '/dashboard' : '/fan')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      {/* ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#f8fafc' }}>StreamPay</span>
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#475569' }}>Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 32px' }}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.03em' }}>EMAIL</label>
              <input {...register('email')} type="email" placeholder="you@example.com" style={inputStyle} />
              {errors.email && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.03em' }}>PASSWORD</label>
              <input {...register('password')} type="password" placeholder="••••••••" style={inputStyle} />
              {errors.password && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 11, fontSize: 14, fontWeight: 700,
              color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              boxShadow: '0 0 30px rgba(124,58,237,0.3)', opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#475569' }}>
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Create one free →</Link>
            </p>
          </div>
        </div>

        {/* Trust bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 24 }}>
          {['SSL Encrypted', 'Cashfree Secured', 'Made in India'].map(t => (
            <span key={t} style={{ fontSize: 11, color: '#1e293b' }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
