import TopLeaderboardClient from './TopLeaderboardClient'
export default async function TopLeaderboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <TopLeaderboardClient token={token} />
}
