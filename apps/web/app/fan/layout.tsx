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

export default async function FanLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')
  if (user.accountType !== 'viewer') redirect('/dashboard')

  const navLinks: [string, string][] = [
    ['/fan', '📊 Dashboard'],
    ['/fan/profile', '👤 Profile'],
    ['/fan/find-streamer', '🔍 Find Streamer'],
    ['/fan/following', '👥 Following'],
    ['/fan/donations', '💰 My Donations'],
  ]

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="glass-card p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
              {user.displayName?.[0] ?? 'V'}
            </div>
            <div>
              <p className="font-bold text-white flex items-center gap-2">👋 Welcome, {user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <Link href="/api/auth/logout" className="text-sm text-slate-400 hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-colors">
            🚪 Logout
          </Link>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {navLinks.map(([href, label]) => (
            <Link key={href} href={href}
              className="px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              {label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  )
}
