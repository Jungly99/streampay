'use client'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  isVerified: boolean
  verificationRequestedAt: string | null
}

export default function VerificationGate({ isVerified, verificationRequestedAt }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  if (isVerified) return null
  if (pathname === '/dashboard/profile') return null

  const isPending = !!verificationRequestedAt

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(6,6,15,0.94)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '40px 36px',
        maxWidth: 480, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {isPending ? '⏳' : '🔐'}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', marginBottom: 8, letterSpacing: '-0.5px' }}>
          {isPending ? 'Verification Pending' : 'Account Not Verified'}
        </h2>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
          {isPending
            ? 'Your verification request has been submitted. Our team will review your profile and approve your account shortly. You\'ll get full access once approved.'
            : 'To access all features, complete your profile and request verification. Once our team approves your account, you\'ll get full access to the dashboard.'}
        </p>

        {!isPending && (
          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>Required to request verification:</p>
            {[
              'Channel Name',
              'Bank Account Details (holder name, account number, IFSC, bank name)',
              'GST Invoice Details (full name, address, city, pincode, state)',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: '#f59e0b', fontSize: 12 }}>○</span>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        )}

        {isPending && (
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#10b981', fontWeight: 600, margin: 0 }}>
                Requested {new Date(verificationRequestedAt!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/dashboard/profile')}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none',
            color: 'white', cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.3)',
          }}
        >
          {isPending ? 'View Profile' : 'Complete Profile & Request Verification →'}
        </button>
      </div>
    </div>
  )
}
