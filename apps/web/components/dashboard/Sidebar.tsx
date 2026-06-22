'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eztips.live'

const navItems = [
  { href: '/dashboard',                      icon: '⊞',  label: 'Dashboard',            sub: 'Overview & Stats' },
  { href: '/dashboard/messages',             icon: '💰',  label: 'Messages',             sub: 'Transaction History' },
  { href: '/dashboard/settlements',          icon: '📊',  label: 'Settlements',          sub: 'Payout Summary' },
  { href: '/dashboard/lifetime-settlements', icon: '📈',  label: 'Lifetime Settlements', sub: 'Total Earnings & Net Received' },
  { href: '/dashboard/invoices',             icon: '🗒️',  label: 'Invoices',             sub: 'GST Invoices' },
  { href: '/dashboard/profile',              icon: '👤',  label: 'Profile',              sub: 'Account Settings' },
  { href: '/dashboard/voice-settings',       icon: '🎙️',  label: 'Voice Settings',       sub: 'Voice & Subscription' },
  { href: '/dashboard/overlay',              icon: '🎨',  label: 'Overlay',              sub: 'Customize Alerts' },
  { href: 'https://discord.gg/eztips',       icon: '💬',  label: 'Discord',              sub: 'Join our community', external: true },
]

export default function Sidebar({ channelName, email, username, overlayToken, todayEarnings, followers }: {
  channelName: string; email: string; username: string; overlayToken: string
  todayEarnings: number; followers: number
}) {
  const path = usePathname()
  const active = (href: string) => path === href

  const overlayUrl = overlayToken ? `${SITE}/overlay/${overlayToken}` : ''
  const messageLink = username ? `${SITE}/send-message/${username}` : ''

  return (
    <aside style={{
      width: 264, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(8,8,24,0.98)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>

      {/* Logo */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, color: 'white',
            boxShadow: '0 0 18px rgba(124,58,237,0.35)',
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc', letterSpacing: '-0.3px' }}>eztips</span>
        </Link>
      </div>

      {/* User card */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 15, color: 'white',
          }}>{channelName?.[0]?.toUpperCase() ?? 'S'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channelName}</p>
            <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500, margin: 0 }}>Streamer</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>₹{todayEarnings}</span>
            <span style={{ fontSize: 10, color: '#475569' }}>Today</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px 8px' }}>
        <SectionLabel>NAVIGATION</SectionLabel>
        {navItems.map(item => {
          const on = active(item.href)
          const inner = (
            <>
              <span style={{ fontSize: 16, width: 22, textAlign: 'center' as const, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: on ? 600 : 500, color: on ? '#f8fafc' : '#94a3b8', lineHeight: 1.2 }}>{item.label}</span>
                <span style={{ display: 'block', fontSize: 10, color: on ? '#8b5cf6' : '#475569', marginTop: 1 }}>{item.sub}</span>
              </span>
            </>
          )
          return item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" style={linkStyle(false)}>{inner}</a>
          ) : (
            <Link key={item.href} href={item.href} style={linkStyle(on)}>{inner}</Link>
          )
        })}

        {/* Quick Actions */}
        <div style={{ marginTop: 16 }}>
          <SectionLabel>QUICK ACTIONS</SectionLabel>
          {overlayUrl && (
            <a href={overlayUrl} target="_blank" rel="noopener noreferrer" style={quickStyle}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📡</span>
              <span>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Open Overlay</span>
                <span style={{ display: 'block', fontSize: 10, color: '#475569' }}>For OBS Studio</span>
              </span>
            </a>
          )}
          {messageLink && (
            <a href={messageLink} target="_blank" rel="noopener noreferrer" style={quickStyle}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔗</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>
                  Message Link{' '}
                  <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>Custom</span>
                </span>
                <span style={{ display: 'block', fontSize: 10, color: '#475569' }}>Share with viewers</span>
              </span>
              <button
                onClick={e => { e.preventDefault(); navigator.clipboard.writeText(messageLink) }}
                title="Copy link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', flexShrink: 0, padding: '2px' }}>
                ⎘
              </button>
            </a>
          )}
        </div>
      </nav>

      {/* Bottom user + signout */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ padding: '11px 16px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'white',
          }}>{channelName?.[0]?.toUpperCase() ?? 'S'}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#cbd5e1', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
            <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>Streamer Account</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST" style={{ padding: '0 10px 12px' }}>
          <button type="submit" style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
            background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.1)',
            color: '#94a3b8', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.background='rgba(248,113,113,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='rgba(248,113,113,0.05)' }}>
            <span>🚪</span>
            Sign Out
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#64748b' }}>Return to homepage</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: '0.08em', paddingLeft: 10, marginBottom: 6, marginTop: 0 }}>
      {children}
    </p>
  )
}

function linkStyle(on: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 10, marginBottom: 2,
    background: on ? 'rgba(124,58,237,0.12)' : 'transparent',
    borderLeft: on ? '2px solid #7c3aed' : '2px solid transparent',
    transition: 'all 0.15s', textDecoration: 'none', cursor: 'pointer',
  }
}

const quickStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
  padding: '9px 12px', borderRadius: 10, marginBottom: 6,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
  transition: 'all 0.15s', cursor: 'pointer',
}
