import { cookies } from 'next/headers'
import Link from 'next/link'
import TipSettingsClient from './TipSettingsClient'

async function fetchTipSettings(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${base}/api/streamer/tip-settings`, {
    headers: { Cookie: `eztips_token=${token}` }, cache: 'no-store',
  })
  if (!res.ok) return { minDonationAmount: 100, messageTiers: [] }
  return res.json()
}

export default async function TipSettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')?.value ?? ''
  const data = await fetchTipSettings(token)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: 'var(--text-1)', fontFamily: 'system-ui,sans-serif', padding: '32px 32px' }}>

      {/* Header */}
      <div style={{ maxWidth: 720, margin: '0 auto', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Link href="/dashboard" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Dashboard
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(219,39,119,0.2))', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            ₹
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>Tip Settings</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, marginTop: 2 }}>Control minimum tip amount and per-tier message limits</p>
          </div>
        </div>
      </div>

      <TipSettingsClient initial={data} />
    </div>
  )
}
