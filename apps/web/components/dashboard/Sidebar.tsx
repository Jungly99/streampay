'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eztips.live'

type NavItem = { href: string; color: string; symbol: string; label: string; sub: string; premium?: boolean; external?: boolean }
type NavGroup = { items: NavItem[] }

const BASE_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard',                      color: '#0ea5e9', symbol: '◫',  label: 'Dashboard',       sub: 'Overview & Stats' },
      { href: '/dashboard/messages',             color: '#10b981', symbol: '↓',  label: 'Donations',       sub: 'Transaction History' },
    ],
  },
  {
    items: [
      { href: '/dashboard/settlements',          color: '#6366f1', symbol: '⇆',  label: 'Settlements',     sub: 'Payout Summary' },
      { href: '/dashboard/lifetime-settlements', color: '#8b5cf6', symbol: '∑',  label: 'Lifetime',        sub: 'Total Earnings & Net' },
      { href: '/dashboard/invoices',             color: '#f59e0b', symbol: '▤',  label: 'Invoices',        sub: 'GST Invoices' },
    ],
  },
  {
    items: [
      { href: '/dashboard/profile',              color: '#ec4899', symbol: '◉',  label: 'Profile',         sub: 'Account Settings',       premium: false },
      { href: '/dashboard/tip-settings',         color: '#f59e0b', symbol: '₹',  label: 'Tip Settings',    sub: 'Min Amount & Char Tiers', premium: false },
      { href: '/dashboard/voice-settings',       color: '#a855f7', symbol: '♪',  label: 'Voice',           sub: 'Voice & Subscription',    premium: false },
      { href: '/dashboard/overlay',              color: '#14b8a6', symbol: '◈',  label: 'Overlay',         sub: 'Customize Alerts',        premium: false },
      { href: '/dashboard/celebrity-voice',      color: '#f59e0b', symbol: '🎤', label: 'Celebrity Voice', sub: 'AI Voices & Pricing',     premium: true },
      { href: 'https://discord.gg/eztips',       color: '#5865f2', symbol: '⌘',  label: 'Discord',         sub: 'Join our community',      external: true, premium: false },
      { href: '/support-us',                     color: '#ec4899', symbol: '💜', label: 'Support Us',      sub: 'Help keep eztips alive',  premium: false },
      { href: '/changelog',                      color: '#0891b2', symbol: '✦',  label: "What's New",      sub: 'Features & fixes',        premium: false },
    ],
  },
]

export default function Sidebar({ channelName, email, username, overlayToken, todayEarnings, followers, isPremium }: {
  channelName: string; email: string; username: string; overlayToken: string
  todayEarnings: number; followers: number; isPremium?: boolean
}) {
  const path = usePathname()
  const isActive = (href: string) => path === href
  const [copied, setCopied] = useState(false)
  const navGroups = BASE_NAV_GROUPS.map(g => ({ items: g.items.filter(i => !i.premium || isPremium) }))

  const overlayUrl = overlayToken ? `${SITE}/overlay/${overlayToken}` : ''
  const messageLink = username ? `${SITE}/send-message/${username}` : ''

  function copyLink() {
    if (!messageLink) return
    navigator.clipboard.writeText(messageLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <aside style={{
      width: 252, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg,#0c0d1a 0%,#080910 100%)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>

      {/* Top glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,0.5),transparent)', pointerEvents: 'none' }} />

      {/* Logo row */}
      <div style={{ padding: '16px 16px 12px', flexShrink: 0 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: 'white',
            boxShadow: '0 4px 14px rgba(124,58,237,0.45)',
            letterSpacing: '-1px',
          }}>ez</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.4px' }}>eztips</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.1em', background: 'rgba(124,58,237,0.12)', padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
        </Link>
      </div>

      {/* Channel card */}
      <div style={{ margin: '0 10px 10px', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, color: 'white',
            boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
          }}>{channelName?.[0]?.toUpperCase() ?? 'S'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channelName}</p>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: 'rgba(124,58,237,0.12)', padding: '1px 6px', borderRadius: 20, letterSpacing: '0.05em' }}>STREAMER</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div style={{ background: 'rgba(124,58,237,0.08)', borderRadius: 8, padding: '7px 10px', border: '1px solid rgba(124,58,237,0.12)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa', margin: 0 }}>₹{todayEarnings}</p>
            <p style={{ fontSize: 10, color: '#475569', margin: 0, marginTop: 1 }}>Today</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>{followers}</p>
            <p style={{ fontSize: 10, color: '#475569', margin: 0, marginTop: 1 }}>Fans</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px', display: 'flex', flexDirection: 'column' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 6px 8px' }} />}
            {group.items.map(item => {
              const on = isActive(item.href)
              const inner = (
                <>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                    background: on ? item.color : `${item.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: on ? 'white' : item.color,
                    transition: 'all 0.15s', fontWeight: 700,
                  }}>{item.symbol}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? '#f1f5f9' : '#8b9ab0', lineHeight: 1.3 }}>{item.label}</span>
                    <span style={{ display: 'block', fontSize: 10, color: on ? `${item.color}cc` : '#374151', marginTop: 1 }}>{item.sub}</span>
                  </div>
                  {on && <div style={{ width: 5, height: 5, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}` }} />}
                </>
              )
              const style: React.CSSProperties = {
                display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none',
                padding: '7px 8px', borderRadius: 10, marginBottom: 1,
                background: on ? `linear-gradient(135deg,${item.color}14,${item.color}08)` : 'transparent',
                border: on ? `1px solid ${item.color}20` : '1px solid transparent',
                transition: 'all 0.15s', cursor: 'pointer',
              }
              return item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" style={style}>{inner}</a>
              ) : (
                <Link key={item.href} href={item.href} style={style}>{inner}</Link>
              )
            })}
          </div>
        ))}

        {/* Quick actions */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '6px 6px 10px' }} />
        <p style={{ fontSize: 9, fontWeight: 700, color: '#374151', letterSpacing: '0.12em', paddingLeft: 8, marginBottom: 8 }}>QUICK ACTIONS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {overlayUrl && (
            <a href={overlayUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', padding: '8px 10px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)', transition: 'all 0.15s' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>📡</div>
              <div>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#7dd3fc' }}>Open Overlay</span>
                <span style={{ display: 'block', fontSize: 10, color: '#374151' }}>For OBS Studio</span>
              </div>
            </a>
          )}
          {messageLink && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🔗</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6ee7b7' }}>Message Link</span>
                <span style={{ display: 'block', fontSize: 10, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>/{username || 'not set'}</span>
              </div>
              <button onClick={copyLink} title="Copy link" style={{ width: 24, height: 24, borderRadius: 6, background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: 11, color: copied ? '#6ee7b7' : '#64748b', flexShrink: 0 }}>
                {copied ? '✓' : '⎘'}
              </button>
            </div>
          )}
        </div>

        {/* Spacer pushes platform card to bottom */}
        <div style={{ flex: 1, minHeight: 16 }} />

        {/* Platform info card */}
        <div style={{ margin: '0 2px 8px', padding: '14px 14px', borderRadius: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: '0.08em' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Platform Fee', value: '5%' },
              { label: 'Settlement', value: 'Any Time' },
              { label: 'Viewer Signup', value: 'Never' },
              { label: 'Min Tip', value: '₹100' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: '#334155', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', margin: '2px 0 0' }}>{s.value}</p>
              </div>
            ))}
          </div>
          <a href="mailto:support@eztips.live" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, color: '#475569', textDecoration: 'none', padding: '6px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span>✉</span> support@eztips.live
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', marginBottom: 4 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {channelName?.[0]?.toUpperCase() ?? 'S'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
            <p style={{ fontSize: 9, color: '#374151', margin: 0, letterSpacing: '0.05em' }}>STREAMER ACCOUNT</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{
            width: '100%', padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(248,113,113,0.1)',
            color: '#64748b', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(248,113,113,0.3)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.background='rgba(248,113,113,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(248,113,113,0.1)'; e.currentTarget.style.color='#64748b'; e.currentTarget.style.background='transparent' }}>
            <span style={{ fontSize: 12 }}>↪</span> Sign Out
          </button>
        </form>
      </div>
    </aside>
  )
}
