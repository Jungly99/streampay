import StreakClient from './StreakClient'
export default async function StreakPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <StreakClient token={token} />
}
