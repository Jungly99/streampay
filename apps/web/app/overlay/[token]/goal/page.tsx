import GoalOverlayClient from './GoalOverlayClient'

export default async function GoalOverlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <GoalOverlayClient token={token} />
}
