import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')
  if (!token) return null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/me`, {
      headers: { Cookie: `eztips_token=${token.value}` }, cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

const navLinks: { href: string; label: string; icon: string }[] = [
  { href: '/fan',               icon: '📊', label: 'Overview' },
  { href: '/fan/find-streamer', icon: '🔍', label: 'Find Streamer' },
  { href: '/fan/following',     icon: '👥', label: 'Following' },
  { href: '/fan/donations',     icon: '💰', label: 'My Donations' },
  { href: '/fan/profile',       icon: '👤', label: 'Profile' },
]

export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')
  if (user.accountType !== 'viewer') redirect('/dashboard')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <header style={{ background: 'rgba(6,6,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="EzTips" style={{ height: 34, width: 'auto', borderRadius: 6 }} />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: 'white' }}>
              {user.displayName?.[0]?.toUpperCase() ?? 'V'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{user.displayName}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Viewer</span>
            </div>
            <Link href="/api/auth/logout"
              style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textDecoration: 'none', padding: '6px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', transition: 'all 0.15s' }}>
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '28px 20px', flex: 1 }}>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 5, overflowX: 'auto' }}>
          {navLinks.map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
              color: 'var(--text-2)', transition: 'all 0.15s',
            }}
              className="fan-nav-link">
              <span>{icon}</span> {label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </div>
  )
}
