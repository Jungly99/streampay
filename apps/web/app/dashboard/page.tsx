import { cookies } from 'next/headers'
import Link from 'next/link'
import { formatINR } from '../../lib/utils'
import LinksPanel from './LinksPanel'
import DashboardClient from './DashboardClient'

async function fetchData(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const h = { Cookie: `eztips_token=${token}` }
  const [stats, links, alertSettings] = await Promise.all([
    fetch(`${base}/api/streamer/stats`,          { headers: h, cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    fetch(`${base}/api/streamer/links`,          { headers: h, cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
    fetch(`${base}/api/streamer/alert-settings`, { headers: h, cache: 'no-store' }).then(r => r.json()).catch(() => ({})),
  ])
  return { stats, links, alertSettings }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')?.value ?? ''
  const { stats, links, alertSettings } = await fetchData(token)

  const statItems = [
    { label: 'Today',          value: formatINR(stats.todayEarnings ?? 0),    sub: 'earnings',          color: '#7c3aed' },
    { label: 'This Month',     value: formatINR(stats.monthEarnings ?? 0),    sub: 'total received',    color: '#0891b2' },
    { label: 'Donations',      value: stats.totalPaymentsCount ?? 0,          sub: 'all time',          color: '#059669' },
    { label: 'Unsettled',      value: formatINR(stats.pendingSettlement ?? 0), sub: 'ready to withdraw', color: '#d97706' },
  ]

  return (
    <div style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>

      {/* ── Top header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {links.messageLink && (
          <Link href={links.messageLink} target="_blank" style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'white',
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            boxShadow: '0 0 20px rgba(124,58,237,0.3)',
          }}>
            <span style={{ fontSize: 11 }}>↗</span> My Donation Page
          </Link>
        )}
      </div>

      {/* ── 4 stat cards ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, flexShrink: 0 }}>
        {statItems.map(s => (
          <div key={s.label} style={{
            padding: '20px 20px 18px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg,${s.color}80,transparent)`,
            }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: '0.05em', marginBottom: 10, textTransform: 'uppercase' }}>
              {s.label}
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main 3-column grid ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Links panel */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '22px 22px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Your Links</p>
            <span style={{ fontSize: 11, color: links.messageLink ? '#10b981' : '#f59e0b',
              background: links.messageLink ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
              {links.messageLink ? '● Live' : '○ Setup needed'}
            </span>
          </div>
          <LinksPanel
            messageLink={links.messageLink} overlayToken={links.overlayToken}
            overlayUrl={links.overlayUrl} qrDataUrl={links.qrDataUrl} inline
          />
        </div>

        {/* TTS + Voice settings — spans middle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DashboardClient token={token} initialSettings={alertSettings} />
        </div>

        {/* Quick actions + checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick actions */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '18px 18px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>Quick Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { href: '/dashboard/messages',       label: 'View Donations',      icon: '↓', color: '#7c3aed' },
                { href: '/dashboard/settlements',    label: 'Settle Earnings',     icon: '⇄', color: '#059669' },
                { href: '/dashboard/overlay',        label: 'Edit Overlay',        icon: '◈', color: '#0891b2' },
                { href: '/dashboard/voice-settings', label: 'Voice Tiers',         icon: '♫', color: '#d97706' },
                { href: '/dashboard/invoices',       label: 'Download Invoices',   icon: '▤', color: '#db2777' },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 13, fontWeight: 500, color: '#94a3b8',
                  transition: 'all 0.15s', textDecoration: 'none',
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${a.color}18`, color: a.color, fontSize: 13, fontFamily: 'monospace', flexShrink: 0,
                  }}>{a.icon}</span>
                  {a.label}
                  <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.3 }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Setup checklist */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '18px 18px', flex: 1,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>Setup Checklist</p>
            {[
              { done: !!links.messageLink,               label: 'Donation link active' },
              { done: !!links.overlayToken,              label: 'OBS overlay ready' },
              { done: (stats.totalPaymentsCount ?? 0) > 0, label: 'First donation received' },
              { done: false,                             label: 'Connect Discord webhook' },
            ].map(step => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 18, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? '#059669' : 'rgba(255,255,255,0.07)',
                  fontSize: 10, fontWeight: 700, color: 'white',
                }}>{step.done ? '✓' : ''}</div>
                <span style={{ fontSize: 12, color: step.done ? '#475569' : '#94a3b8', textDecoration: step.done ? 'line-through' : 'none' }}>
                  {step.label}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <p style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>💡 Platform fee: only 5% — lower than any competitor</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
