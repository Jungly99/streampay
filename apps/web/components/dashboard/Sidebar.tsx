'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/dashboard',                      icon: '▦',  label: 'Overview' },
  { href: '/dashboard/messages',             icon: '↓',  label: 'Donations' },
  { href: '/dashboard/settlements',          icon: '⇄',  label: 'Settlements' },
  { href: '/dashboard/lifetime-settlements', icon: '∑',  label: 'Lifetime' },
  { href: '/dashboard/invoices',             icon: '▤',  label: 'Invoices' },
]
const secondary = [
  { href: '/dashboard/profile',              icon: '◉',  label: 'Profile' },
  { href: '/dashboard/voice-settings',       icon: '♫',  label: 'Voice' },
  { href: '/dashboard/overlay',              icon: '◈',  label: 'Overlay' },
]

export default function Sidebar({ channelName, todayEarnings, followers }: {
  channelName: string; todayEarnings: number; followers: number
}) {
  const path = usePathname()
  const active = (href: string) => path === href

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(6,6,20,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
    }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: 'white',
            boxShadow: '0 0 20px rgba(124,58,237,0.4)',
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc', letterSpacing: '-0.3px' }}>eztips</span>
        </Link>

        {/* Channel card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: 'white',
            }}>{channelName?.[0]?.toUpperCase() ?? 'S'}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channelName}</p>
              <p style={{ fontSize: 11, color: '#7c3aed', fontWeight: 500 }}>Streamer</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(124,58,237,0.1)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>₹{todayEarnings}</p>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Today</p>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{followers}</p>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Followers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
        <NavSection label="MENU" items={nav} active={active} />
        <NavSection label="SETTINGS" items={secondary} active={active} style={{ marginTop: 8 }} />
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
            background: 'none', border: 'none', color: '#475569',
            fontSize: 13, fontWeight: 500, transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
            <span style={{ fontSize: 14 }}>→</span> Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}

function NavSection({ label, items, active, style: s }: { label: string; items: typeof nav; active: (h: string) => boolean; style?: React.CSSProperties }) {
  return (
    <div style={s}>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#334155', letterSpacing: '0.1em', paddingLeft: 10, marginBottom: 4 }}>{label}</p>
      {items.map(item => {
        const on = active(item.href)
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 9, marginBottom: 2,
            fontSize: 13, fontWeight: on ? 600 : 500,
            color: on ? '#f8fafc' : '#64748b',
            background: on ? 'rgba(124,58,237,0.12)' : 'transparent',
            borderLeft: on ? '2px solid #7c3aed' : '2px solid transparent',
            transition: 'all 0.15s',
            textDecoration: 'none',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, width: 16, textAlign: 'center', opacity: on ? 1 : 0.5 }}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
