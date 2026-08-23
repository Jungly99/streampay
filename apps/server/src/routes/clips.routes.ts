import { Router, Request, Response } from 'express'
import { prisma } from '../db/prisma'
import { requireStreamer } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { getStreamInfo, startChatPolling } from '../services/ytChatPoller'
import { env } from '../config/env'

const router = Router()

async function sendClipWebhook(webhookUrl: string, clip: { title: string; requestedBy: string; streamSecs: number; duration: number; videoId: string; streamTitle?: string }) {
  try {
    const hasVideo = clip.videoId && clip.videoId !== 'unknown'
    const h = Math.floor(clip.streamSecs / 3600)
    const m = Math.floor((clip.streamSecs % 3600) / 60)
    const s = clip.streamSecs % 60
    const timeStr = h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

    const watchUrl = hasVideo
      ? `https://www.youtube.com/watch?v=${clip.videoId}&t=${clip.streamSecs}s`
      : null

    const embed: Record<string, any> = {
      color: 0x7c3aed,
      author: { name: 'eztips • New Clip Recorded', icon_url: 'https://eztips.live/logo.png' },
      title: clip.title,
      ...(watchUrl ? { url: watchUrl } : {}),
      fields: [
        { name: '👤 Requested by', value: clip.requestedBy, inline: true },
        { name: '⏱ Timestamp', value: hasVideo ? timeStr : 'Offline', inline: true },
        { name: '🎞 Duration', value: `${clip.duration}s`, inline: true },
        ...(clip.streamTitle ? [{ name: '📺 Stream', value: clip.streamTitle, inline: false }] : []),
      ],
      ...(hasVideo ? { image: { url: `https://img.youtube.com/vi/${clip.videoId}/mqdefault.jpg` } } : {}),
      footer: { text: watchUrl ? 'Click the title to watch at this moment' : 'No live stream was active' },
      timestamp: new Date().toISOString(),
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(5000),
    })
  } catch { /* non-fatal */ }
}

async function autoDetectLive(streamerId: string, socialYoutube: string | null): Promise<{ videoId: string; actualStartTime: number } | null> {
  if (!socialYoutube || !env.YOUTUBE_API_KEY) return null

  const hMatch = socialYoutube.match(/@([a-zA-Z0-9_.-]+)/)
  const cMatch = socialYoutube.match(/\/channel\/([a-zA-Z0-9_-]{10,})/)
  const handle = hMatch?.[1]
  const channelId = cMatch?.[1]
  if (!handle && !channelId) return null

  try {
    let chId = channelId
    if (!chId && handle) {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handle}&key=${env.YOUTUBE_API_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      chId = d.items?.[0]?.id
    }
    if (!chId) return null

    const r2 = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${chId}&eventType=live&type=video&key=${env.YOUTUBE_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const d2 = await r2.json()
    const videoId = d2.items?.[0]?.id?.videoId
    if (!videoId) return null

    // Get actual start time
    const r3 = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${env.YOUTUBE_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    )
    const d3 = await r3.json()
    const startStr = d3.items?.[0]?.liveStreamingDetails?.actualStartTime
    if (!startStr) return null

    // Start the poller in the background so future clips use the running poller
    startChatPolling(streamerId, videoId).catch(() => {})
    return { videoId, actualStartTime: new Date(startStr).getTime() }
  } catch {
    return null
  }
}

// GET /api/clips/nightbot?title=My+Title&token=OVERLAY_TOKEN
// Public endpoint — called by Nightbot's $(urlfetch) when viewer types !clip
router.get('/nightbot', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain')

  const title = (req.query.title as string | undefined)?.trim()
  const token = (req.query.token as string | undefined)?.trim()

  if (!token) return res.send('❌ Missing token. Ask your streamer to set up the command correctly.')
  const clipTitle = (title || 'Clip').slice(0, 100)
  if (title && title.length > 100) return res.send('❌ Title too long (max 100 chars).')

  const profile = await prisma.streamerProfile.findUnique({
    where: { overlayToken: token },
    select: { id: true, clipDefaultDuration: true, clipWebhookUrl: true, socialYoutube: true },
  })
  if (!profile) return res.send('❌ Invalid token. Ask your streamer to update the command.')

  let streamInfo = getStreamInfo(profile.id)

  // If no poller running, try to auto-detect the live stream from the channel link
  if (!streamInfo) {
    streamInfo = await autoDetectLive(profile.id, (profile as any).socialYoutube)
  }

  const videoId = streamInfo?.videoId ?? 'unknown'
  const streamSecs = streamInfo
    ? Math.max(0, Math.round((Date.now() - streamInfo.actualStartTime) / 1000))
    : Math.floor(Date.now() / 1000)

  const duration = profile.clipDefaultDuration ?? 60

  try {
    await prisma.streamClip.upsert({
      where: { streamerId_videoId_streamSecs: { streamerId: profile.id, videoId, streamSecs } },
      create: { streamerId: profile.id, videoId, title: clipTitle, requestedBy: 'Chat (!clip)', streamSecs, duration },
      update: {},
    })
  } catch {
    return res.send('❌ Could not save clip. Try again.')
  }

  if (profile.clipWebhookUrl) {
    sendClipWebhook(profile.clipWebhookUrl, { title: clipTitle, requestedBy: 'Chat (!clip)', streamSecs, duration, videoId })
  }

  const timeStr = streamInfo && streamSecs > 0
    ? `at ${Math.floor(streamSecs / 60)}:${String(streamSecs % 60).padStart(2, '0')}`
    : ''
  return res.send(`🎬 Clip "${clipTitle}" saved${timeStr ? ' ' + timeStr : ''}! (${duration}s)`)
})

// GET /api/clips — list clips for logged-in streamer (most recent first)
router.get('/', requireStreamer, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { userId: req.user!.userId },
    select: { id: true, clipDefaultDuration: true, clipWebhookUrl: true },
  })
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  const clips = await prisma.streamClip.findMany({
    where: { streamerId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json({ clips, clipDefaultDuration: profile.clipDefaultDuration ?? 60, clipWebhookUrl: profile.clipWebhookUrl ?? '' })
})

// DELETE /api/clips/:id — delete a clip
router.delete('/:id', requireStreamer, async (req: AuthRequest, res: Response) => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  const clip = await prisma.streamClip.findUnique({ where: { id: req.params.id } })
  if (!clip || clip.streamerId !== profile.id) return res.status(404).json({ error: 'Clip not found' })

  await prisma.streamClip.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// PATCH /api/clips/settings — update clip settings
router.patch('/settings', requireStreamer, async (req: AuthRequest, res: Response) => {
  const { clipDefaultDuration, clipWebhookUrl } = req.body

  if (clipDefaultDuration !== undefined) {
    if (typeof clipDefaultDuration !== 'number' || clipDefaultDuration < 10 || clipDefaultDuration > 300) {
      return res.status(400).json({ error: 'clipDefaultDuration must be 10–300 seconds' })
    }
  }
  if (clipWebhookUrl !== undefined && clipWebhookUrl !== '') {
    if (typeof clipWebhookUrl !== 'string' || !clipWebhookUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid webhook URL' })
    }
  }

  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  await prisma.streamerProfile.update({
    where: { id: profile.id },
    data: {
      ...(clipDefaultDuration !== undefined ? { clipDefaultDuration } : {}),
      ...(clipWebhookUrl !== undefined ? { clipWebhookUrl: clipWebhookUrl || null } : {}),
    } as any,
  })
  res.json({ ok: true })
})

export { sendClipWebhook }
export default router
