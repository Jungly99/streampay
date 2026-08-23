import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../db/prisma'
import { env } from '../config/env'

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export async function postTimestampComment(streamerId: string, videoId: string) {
  if (!videoId || videoId === 'unknown') return

  const profile = await prisma.streamerProfile.findUnique({
    where: { id: streamerId },
    select: { ytRefreshToken: true },
  })
  if (!profile?.ytRefreshToken) return

  const clips = await prisma.streamClip.findMany({
    where: { streamerId, videoId },
    orderBy: { streamSecs: 'asc' },
  })
  if (clips.length === 0) return

  const oauth2Client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.YOUTUBE_CONNECT_CALLBACK_URL,
  )
  oauth2Client.setCredentials({ refresh_token: profile.ytRefreshToken })

  let accessToken: string
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    if (!credentials.access_token) throw new Error('No access token')
    accessToken = credentials.access_token
    if (credentials.refresh_token) {
      await prisma.streamerProfile.update({
        where: { id: streamerId },
        data: { ytRefreshToken: credentials.refresh_token } as any,
      })
    }
  } catch (e) {
    console.error('[yt-comment] token refresh failed:', e)
    return
  }

  const lines = clips.map(c => `${fmtTime(c.streamSecs)} — ${c.title} (by ${c.requestedBy})`)
  const body = [
    '🎬 Stream Highlights — timestamped by viewers',
    '',
    ...lines,
    '',
    '— via eztips.live',
  ].join('\n')

  try {
    const r = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: { snippet: { textOriginal: body } },
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(JSON.stringify(data.error))
    console.log(`[yt-comment] posted ${clips.length} timestamps on video ${videoId}`)
  } catch (e) {
    console.error('[yt-comment] failed to post comment:', e)
  }
}
