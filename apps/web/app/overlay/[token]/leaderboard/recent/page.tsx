import RecentDonorsClient from './RecentDonorsClient'
export default async function RecentDonorsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <RecentDonorsClient token={token} />
}
