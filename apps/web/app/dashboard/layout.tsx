import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '../../components/dashboard/Sidebar'

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('streampay_token')
  if (!token) return null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/auth/me`, {
      headers: { Cookie: `streampay_token=${token.value}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function getStats(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/streamer/stats`, {
      headers: { Cookie: `streampay_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { todayEarnings: 0, followerCount: 0 }
    return res.json()
  } catch { return { todayEarnings: 0, followerCount: 0 } }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('streampay_token')
  const user = await getUser()

  if (!user) redirect('/login')
  if (user.accountType !== 'streamer') redirect('/fan')

  const stats = await getStats(token!.value)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#06060f' }}>
      <Sidebar
        channelName={user.streamerProfile?.channelName ?? user.displayName ?? 'Streamer'}
        todayEarnings={stats.todayEarnings ?? 0}
        followers={stats.followerCount ?? 0}
      />
      <main className="flex-1 overflow-y-auto h-full">
        {children}
      </main>
    </div>
  )
}
