import { notFound } from 'next/navigation'
import DonationPageClient from './DonationPageClient'

async function getStreamerData(username: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${base}/api/donations/page/${username}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json()
}

export default async function DonationPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const streamer = await getStreamerData(username)
  if (!streamer) notFound()

  if (streamer.inactive) {
    return (
      <div style={{
        minHeight: '100vh', background: '#06060f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
            background: streamer.avatarUrl ? 'none' : 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: 'white', overflow: 'hidden',
          }}>
            {streamer.avatarUrl
              ? <img src={streamer.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (streamer.channelName?.[0]?.toUpperCase() ?? '?')
            }
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 8, letterSpacing: '-0.5px' }}>
            {streamer.channelName ?? username}
          </h1>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 20, marginBottom: 20,
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>Account Inactive</span>
          </div>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 24 }}>
            This streamer&apos;s donation page is currently inactive. It may be back soon — check their social channels for updates.
          </p>

          {/* Social links */}
          {(streamer.socialTwitter || streamer.socialInstagram || streamer.socialYoutube || streamer.socialTwitch || streamer.socialDiscord || streamer.socialKick || streamer.channelLink) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {streamer.channelLink && (
                <a href={streamer.channelLink} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#f87171', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>▶ YouTube</a>
              )}
              {streamer.socialYoutube && (
                <a href={streamer.socialYoutube} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', color: '#f87171', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>▶ YouTube</a>
              )}
              {streamer.socialTwitter && (
                <a href={streamer.socialTwitter} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(29,161,242,0.08)', border: '1px solid rgba(29,161,242,0.2)', color: '#38bdf8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>𝕏 Twitter</a>
              )}
              {streamer.socialInstagram && (
                <a href={streamer.socialInstagram} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(225,48,108,0.08)', border: '1px solid rgba(225,48,108,0.2)', color: '#f472b6', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>📷 Instagram</a>
              )}
              {streamer.socialTwitch && (
                <a href={streamer.socialTwitch} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(145,70,255,0.08)', border: '1px solid rgba(145,70,255,0.2)', color: '#a78bfa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>🎮 Twitch</a>
              )}
              {streamer.socialKick && (
                <a href={streamer.socialKick} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(83,252,31,0.08)', border: '1px solid rgba(83,252,31,0.2)', color: '#4ade80', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>🟢 Kick</a>
              )}
              {streamer.socialDiscord && (
                <a href={streamer.socialDiscord} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)', color: '#818cf8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>💬 Discord</a>
              )}
            </div>
          )}

          <a href="/" style={{
            display: 'inline-block', padding: '11px 24px', borderRadius: 10,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: 'white',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Go to eztips.live →
          </a>
        </div>
      </div>
    )
  }

  return <DonationPageClient streamer={streamer} />
}
