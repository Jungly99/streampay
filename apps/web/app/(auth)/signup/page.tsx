'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const schema = z.object({
  displayName: z.string().min(1, 'Required').max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  accountType: z.enum(['streamer', 'viewer']),
})
type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#f8fafc', outline: 'none', boxSizing: 'border-box',
}

function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const defaultType = (params.get('type') as 'streamer' | 'viewer') ?? 'streamer'
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: defaultType },
  })
  const accountType = watch('accountType')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const user = await api.post<{ accountType: string }>('/api/auth/signup', data)
      toast.success('Account created! Welcome 🎉')
      router.push(user.accountType === 'streamer' ? '/dashboard' : '/fan')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Account type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {(['streamer', 'viewer'] as const).map(type => {
          const active = accountType === type
          return (
            <button key={type} type="button" onClick={() => setValue('accountType', type)} style={{
              padding: '16px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
              background: active ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
              border: `2px solid ${active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.15s', position: 'relative',
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{type === 'streamer' ? '🎮' : '👤'}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#f8fafc' : '#64748b', marginBottom: 2 }}>
                {type === 'streamer' ? 'Streamer' : 'Viewer'}
              </div>
              <div style={{ fontSize: 11, color: '#334155' }}>
                {type === 'streamer' ? 'Accept donations' : 'Support streamers'}
              </div>
              {active && (
                <div style={{ position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>✓</div>
              )}
            </button>
          )
        })}
      </div>

      <input type="hidden" {...register('accountType')} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.03em' }}>
              {accountType === 'streamer' ? 'CHANNEL NAME' : 'DISPLAY NAME'}
            </label>
            <input {...register('displayName')} placeholder={accountType === 'streamer' ? 'e.g. Jungle Gaming' : 'e.g. Rahul'} style={inputStyle} />
            {errors.displayName && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{errors.displayName.message}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.03em' }}>EMAIL</label>
            <input {...register('email')} type="email" placeholder="you@example.com" style={inputStyle} />
            {errors.email && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{errors.email.message}</p>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, letterSpacing: '0.03em' }}>PASSWORD</label>
            <input {...register('password')} type="password" placeholder="Min 8 characters" style={inputStyle} />
            {errors.password && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{errors.password.message}</p>}
          </div>
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '13px', borderRadius: 11, fontSize: 14, fontWeight: 700,
          color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#db2777)',
          boxShadow: '0 0 30px rgba(124,58,237,0.3)', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Creating account…' : accountType === 'streamer' ? 'Create Streamer Account →' : 'Create Viewer Account →'}
        </button>
      </form>
    </>
  )
}

export default function SignupPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 24 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 17, color: '#f8fafc' }}>StreamPay</span>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Create an account</h1>
          <p style={{ fontSize: 13, color: '#475569' }}>Join Indian streamers on StreamPay. Free forever.</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 28px' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', animation: 'spin 0.8s linear infinite' }} />
            </div>
          }>
            <SignupForm />
          </Suspense>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
