import { notFound } from 'next/navigation'
import DonationPageClient from './DonationPageClient'

async function getStreamerData(username: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${base}/api/donations/page/${username}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function DonationPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const streamer = await getStreamerData(username)
  if (!streamer) notFound()
  return <DonationPageClient streamer={streamer} />
}
