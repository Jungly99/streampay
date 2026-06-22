import { cookies } from 'next/headers'
import { StatCard } from '../../components/ui/Card'
import { formatINR, formatDate } from '../../lib/utils'

async function getDashboard(token: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/viewer/dashboard`, {
      headers: { Cookie: `eztips_token=${token}` }, cache: 'no-store',
    })
    return res.json()
  } catch { return null }
}

export default async function FanDashboard() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')?.value ?? ''
  const data = await getDashboard(token)

  return (
    <div>
      <h2 className="text-xl font-bold gradient-text mb-4">Donation Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Donated" value={formatINR(data?.totalDonated ?? 0)} icon="💰" color="purple" />
        <StatCard label="Total Donations" value={data?.totalDonations ?? 0} icon="🎁" color="pink" />
        <StatCard label="Streamers Supported" value={data?.streamersSupported ?? 0} icon="👥" color="cyan" />
        <StatCard
          label="Recent Donation"
          value={data?.recentDonation ? formatDate(data.recentDonation.paidAt) : 'N/A'}
          icon="📅"
          color="green"
        />
      </div>
    </div>
  )
}
