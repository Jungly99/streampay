import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '../../components/dashboard/Sidebar'
import VerificationGate from '../../components/dashboard/VerificationGate'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')
  if (!token) return null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/me`, {
      headers: { Cookie: `eztips_token=${token.value}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function getStats(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/streamer/stats`, {
      headers: { Cookie: `eztips_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { todayEarnings: 0, followerCount: 0 }
    return res.json()
  } catch { return { todayEarnings: 0, followerCount: 0 } }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')
  const user = await getUser()

  if (!user) redirect('/login')
  if (user.accountType !== 'streamer') redirect('/fan')

  const stats = await getStats(token!.value)
  const isVerified: boolean = user.streamerProfile?.isVerified ?? false
  const verificationRequestedAt: string | null = user.streamerProfile?.verificationRequestedAt ?? null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#06060f' }}>
      <Sidebar
        channelName={user.streamerProfile?.channelName ?? user.displayName ?? 'Streamer'}
        email={user.email ?? ''}
        username={user.streamerProfile?.username ?? ''}
        overlayToken={user.streamerProfile?.overlayToken ?? ''}
        todayEarnings={stats.todayEarnings ?? 0}
        followers={stats.followerCount ?? 0}
        isPremium={user.streamerProfile?.isPremium ?? false}
      />
      <main className="flex-1 overflow-y-auto h-full">
        <VerificationGate isVerified={isVerified} verificationRequestedAt={verificationRequestedAt} />
        {children}
      </main>
    </div>
  )
}
