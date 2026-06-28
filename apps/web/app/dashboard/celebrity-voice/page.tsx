import { cookies } from 'next/headers'
import CelebrityVoiceClient from './CelebrityVoiceClient'

async function fetchData(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const h = { Cookie: `eztips_token=${token}` }
  const [settings, profile] = await Promise.all([
    fetch(`${base}/api/streamer/alert-settings`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : null),
    fetch(`${base}/api/streamer/profile`,        { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : null),
  ])
  return { settings, isPremium: profile?.isPremium ?? false }
}

export default async function CelebrityVoicePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')?.value ?? ''
  const { settings, isPremium } = await fetchData(token)

  if (!isPremium) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      }}>
        <div style={{
          maxWidth: 480, width: '100%', margin: '0 28px', padding: '48px 40px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, margin: '0 auto 20px',
            background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(245,158,11,0.2))',
            border: '1px solid rgba(124,58,237,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
          }}>🎤</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '5px 14px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em' }}>BETA</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em' }}>PREMIUM ONLY</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>Celebrity Voice Alerts</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, margin: '0 0 28px' }}>
            This feature is currently in <strong style={{ color: '#f59e0b' }}>Beta</strong> and available exclusively to
            <strong style={{ color: '#a78bfa' }}> Premium streamers</strong> selected by our team.
          </p>
          <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', margin: '0 0 10px' }}>What you get with Premium</p>
            {['AI celebrity voices for donation alerts','20% platform fee tier (vs 5% standard)','Modi, Trump, Morgan Freeman & more','Custom ElevenLabs voice support'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{f}</span>
              </div>
            ))}
          </div>
          <a href="mailto:support@eztips.live?subject=Premium%20Access%20Request" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px',
            borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#f59e0b)',
            color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          }}>
            ✉ Request Premium Access
          </a>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14 }}>Contact us at support@eztips.live</p>
        </div>
      </div>
    )
  }

  return <CelebrityVoiceClient initialSettings={settings} />
}
