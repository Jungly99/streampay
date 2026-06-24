import { cookies } from 'next/headers'
import CelebrityVoiceClient from './CelebrityVoiceClient'

async function fetchSettings(token: string) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const res = await fetch(`${base}/api/streamer/alert-settings`, {
    headers: { Cookie: `eztips_token=${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function CelebrityVoicePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('eztips_token')?.value ?? ''
  const settings = await fetchSettings(token)
  return <CelebrityVoiceClient initialSettings={settings} />
}
