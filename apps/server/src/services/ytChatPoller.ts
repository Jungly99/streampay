import { prisma } from '../db/prisma'
import { env } from '../config/env'
import { sendClipWebhook } from '../routes/clips.routes'
import { postTimestampComment } from '../utils/youtubeComment'

interface PollerState {
  liveChatId: string
  videoId: string
  streamerId: string
  actualStartTime: number
  nextPageToken: string | null
  timer: ReturnType<typeof setTimeout> | null
  stopped: boolean
}

const activePollers = new Map<string, PollerState>()

export async function startChatPolling(streamerId: string, videoId: string) {
  if (activePollers.has(streamerId)) return
  if (!env.YOUTUBE_API_KEY) return

  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${env.YOUTUBE_API_KEY}`,
      { signal: AbortSignal.timeout(6000) }
    )
    const d = await r.json()
    const details = d.items?.[0]?.liveStreamingDetails
    if (!details?.activeLiveChatId || !details?.actualStartTime) return

    const state: PollerState = {
      liveChatId: details.activeLiveChatId,
      videoId,
      streamerId,
      actualStartTime: new Date(details.actualStartTime).getTime(),
      nextPageToken: null,
      timer: null,
      stopped: false,
    }
    activePollers.set(streamerId, state)
    console.log(`[clip-poller] started for streamer=${streamerId} video=${videoId}`)
    schedulePoll(state, 5000)
  } catch (e) {
    console.error('[clip-poller] failed to start:', e)
  }
}

function schedulePoll(state: PollerState, delayMs: number) {
  if (state.stopped) return
  state.timer = setTimeout(() => pollChat(state), delayMs)
}

async function pollChat(state: PollerState) {
  if (state.stopped) return
  if (!env.YOUTUBE_API_KEY) return

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/liveChatMessages')
    url.searchParams.set('liveChatId', state.liveChatId)
    url.searchParams.set('part', 'snippet,authorDetails')
    url.searchParams.set('maxResults', '200')
    url.searchParams.set('key', env.YOUTUBE_API_KEY)
    if (state.nextPageToken) url.searchParams.set('pageToken', state.nextPageToken)

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })

    if (!r.ok) {
      // 403/404 = stream ended or chat disabled
      if (r.status === 403 || r.status === 404) {
        stopPolling(state.streamerId, true)
        return
      }
      schedulePoll(state, 20000)
      return
    }

    const d = await r.json()

    if (!d.items || d.error) {
      stopPolling(state.streamerId)
      return
    }

    const profile = await prisma.streamerProfile.findUnique({
      where: { id: state.streamerId },
      select: { clipDefaultDuration: true, clipWebhookUrl: true },
    })
    const clipDuration = (profile as any)?.clipDefaultDuration ?? 60
    const clipWebhookUrl: string | null = (profile as any)?.clipWebhookUrl ?? null

    for (const item of d.items as any[]) {
      const text: string = item.snippet?.displayMessage ?? ''
      const match = text.match(/^!clip(?:\s+(.+))?/i)
      if (!match) continue

      const title = (match[1]?.trim() || 'Clip').slice(0, 100)
      const publishedAt = new Date(item.snippet.publishedAt).getTime()
      const streamSecs = Math.max(0, Math.round((publishedAt - state.actualStartTime) / 1000))
      const requestedBy: string = item.authorDetails?.displayName ?? 'Unknown'

      await prisma.streamClip.upsert({
        where: { streamerId_videoId_streamSecs: { streamerId: state.streamerId, videoId: state.videoId, streamSecs } },
        create: { streamerId: state.streamerId, videoId: state.videoId, title, requestedBy, streamSecs, duration: clipDuration },
        update: {},
      })
      console.log(`[clip-poller] clip saved: "${title}" at ${streamSecs}s by ${requestedBy}`)
      if (clipWebhookUrl) {
        sendClipWebhook(clipWebhookUrl, { title, requestedBy, streamSecs, duration: clipDuration, videoId: state.videoId })
      }
    }

    state.nextPageToken = d.nextPageToken ?? null
    const delay = Math.max(d.pollingIntervalMillis ?? 10000, 5000)
    schedulePoll(state, delay)
  } catch (e) {
    console.error('[clip-poller] poll error:', e)
    schedulePoll(state, 20000)
  }
}

export function stopPolling(streamerId: string, streamEnded = false) {
  const state = activePollers.get(streamerId)
  if (!state) return
  state.stopped = true
  if (state.timer) clearTimeout(state.timer)
  activePollers.delete(streamerId)
  console.log(`[clip-poller] stopped for streamer=${streamerId} streamEnded=${streamEnded}`)
  if (streamEnded) {
    postTimestampComment(streamerId, state.videoId).catch(e =>
      console.error('[clip-poller] postTimestampComment failed:', e)
    )
  }
}

export function isPolling(streamerId: string): boolean {
  return activePollers.has(streamerId)
}

export function getStreamInfo(streamerId: string): { videoId: string; actualStartTime: number } | null {
  const state = activePollers.get(streamerId)
  if (!state) return null
  return { videoId: state.videoId, actualStartTime: state.actualStartTime }
}
