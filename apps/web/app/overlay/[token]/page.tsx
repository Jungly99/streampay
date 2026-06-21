import OverlayClient from './OverlayClient'

export default async function OverlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <OverlayClient token={token} />
}
