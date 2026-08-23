import { Router, Request, Response } from 'express'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { prisma } from '../db/prisma'
import { requireStreamer, AuthRequest } from '../middleware/auth'
import { generateOrderId } from '../utils/generateToken'
import { env } from '../config/env'
import { startChatPolling } from '../services/ytChatPoller'

const router = Router()

// ── Live detection helpers ──────────────────────────────────────────────────

function extractUser(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/https?:\/\/(www\.)?(twitch\.tv|kick\.com)\//i, '').split('/')[0]?.split('?')[0]?.trim() || null
}

function extractYouTubeId(url: string | null | undefined): { handle: string } | { channelId: string } | null {
  if (!url) return null
  const hMatch = url.match(/@([a-zA-Z0-9_.-]+)/)
  if (hMatch) return { handle: hMatch[1] }
  const cMatch = url.match(/\/channel\/([a-zA-Z0-9_-]{10,})/)
  if (cMatch) return { channelId: cMatch[1] }
  return null
}

async function checkKickLive(username: string): Promise<boolean> {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  try {
    // Try v2 livestream endpoint
    const r = await fetch(`https://kick.com/api/v2/channels/${username}/livestream`, {
      headers: { Accept: 'application/json', 'User-Agent': ua },
      signal: AbortSignal.timeout(5000),
    })
    if (r.ok) {
      const d = await r.json()
      if (d?.data !== undefined) return !!d.data
    }
  } catch {}
  try {
    // Fallback: v1 channels API
    const r2 = await fetch(`https://kick.com/api/v1/channels/${username}`, {
      headers: { Accept: 'application/json', 'User-Agent': ua },
      signal: AbortSignal.timeout(5000),
    })
    if (r2.ok) {
      const d2 = await r2.json()
      return !!(d2?.livestream || d2?.is_live)
    }
  } catch {}
  try {
    // Last resort: scrape the channel page for live markers
    const r3 = await fetch(`https://kick.com/${username}`, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    })
    if (r3.ok) {
      const html = await r3.text()
      return html.includes('"is_live":true') || html.includes('"isLive":true') || html.includes('"livestream":{')
    }
  } catch {}
  return false
}

// 5-minute in-memory cache so one page-load burst doesn't exhaust API quota
const ytCache = new Map<string, { result: { isLive: boolean; videoId?: string }; ts: number }>()
const YT_TTL = 5 * 60 * 1000

async function checkYouTubeLive(ytId: { handle?: string; channelId?: string }): Promise<{ isLive: boolean; videoId?: string }> {
  const cacheKey = 'handle' in ytId ? ytId.handle! : ytId.channelId!
  const cached = ytCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < YT_TTL) return cached.result

  const result = await _doYouTubeCheck(ytId)
  ytCache.set(cacheKey, { result, ts: Date.now() })
  return result
}

async function _doYouTubeCheck(ytId: { handle?: string; channelId?: string }): Promise<{ isLive: boolean; videoId?: string }> {
  const apiKey = env.YOUTUBE_API_KEY
  if (apiKey) {
    try {
      // Step 1: resolve handle → channelId (1 API unit)
      let channelId = 'channelId' in ytId ? ytId.channelId! : ''
      if (!channelId && 'handle' in ytId) {
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${ytId.handle}&key=${apiKey}`,
          { signal: AbortSignal.timeout(5000) }
        )
        const d = await r.json()
        channelId = d.items?.[0]?.id ?? ''
      }
      if (!channelId) return { isLive: false }

      // Step 2: check for active live stream (100 API units)
      const r2 = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const d2 = await r2.json()
      const videoId = d2.items?.[0]?.id?.videoId
      return videoId ? { isLive: true, videoId } : { isLive: false }
    } catch { return { isLive: false } }
  }

  // Fallback: page scraping (unreliable from datacenter IPs, but better than nothing)
  try {
    const baseUrl = 'channelId' in ytId
      ? `https://www.youtube.com/channel/${ytId.channelId}/live`
      : `https://www.youtube.com/@${ytId.handle}/live`
    const r = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb; SOCS=CAISHAgCEhJnd3NfMjAyMzA4MDktMF9SQzEaAmVuIAEaBgiAo_CmBg',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    const redirectMatch = r.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
    if (redirectMatch) return { isLive: true, videoId: redirectMatch[1] }
    if (!r.ok) return { isLive: false }
    const html = await r.text()
    const ogUrl = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/) ??
                  html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)
    if (ogUrl) {
      const vidMatch = ogUrl[1].match(/[?&]v=([a-zA-Z0-9_-]{11})/)
      if (vidMatch) return { isLive: true, videoId: vidMatch[1] }
    }
  } catch {}
  return { isLive: false }
}

// Public: get streamer info for donation page
router.get('/page/:username', async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { username: req.params.username },
    include: {
      voiceTiers: { where: { isEnabled: true }, orderBy: { durationSeconds: 'asc' } },
      goals: { where: { isActive: true }, take: 1 },
    },
  })
  if (!profile) {
    res.status(404).json({ error: 'Streamer not found' })
    return
  }
  if (!profile.isActive) {
    res.status(200).json({
      inactive: true,
      channelName: profile.channelName,
      avatarUrl: profile.avatarUrl,
      socialTwitter: profile.socialTwitter,
      socialInstagram: profile.socialInstagram,
      socialYoutube: profile.socialYoutube,
      socialTwitch: profile.socialTwitch,
      socialDiscord: profile.socialDiscord,
      socialKick: profile.socialKick,
      channelLink: profile.channelLink,
    })
    return
  }
  const alertSettings = await prisma.alertSettings.findUnique({
    where: { streamerId: profile.id },
    select: { celebrityVoiceEnabled: true, celebrityVoiceMinAmount: true, voiceMessagesEnabled: true },
  })

  // Live stream detection (only when embed is enabled)
  let liveStream: { platform: string; embedUrl: string; chatUrl: string | null } | null = null
  if ((profile as any).streamEmbedEnabled) {
    const kickUser  = extractUser(profile.socialKick)
    const ytId      = extractYouTubeId(profile.socialYoutube)

    const [kickLive, ytResult] = await Promise.all([
      kickUser ? checkKickLive(kickUser) : Promise.resolve(false),
      ytId     ? checkYouTubeLive(ytId as any)  : Promise.resolve({ isLive: false, videoId: undefined }),
    ])

    console.log(`[live-detect] user=${req.params.username} kick=${kickUser}:${kickLive} yt=${JSON.stringify(ytId)}:${JSON.stringify(ytResult)}`)

    if (kickLive && kickUser) {
      liveStream = { platform: 'kick', embedUrl: `https://player.kick.com/${kickUser}?autoplay=true`, chatUrl: null }
    } else if (ytResult.isLive && ytResult.videoId) {
      liveStream = {
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${ytResult.videoId}?autoplay=1`,
        chatUrl:  null, // YouTube blocks live_chat embeds on third-party domains
      }
      // Start chat polling for !clip commands (no-op if already running)
      startChatPolling(profile.id, ytResult.videoId).catch(() => {})
    }
  }

  res.json({
    id: profile.id,
    username: profile.username,
    channelName: profile.channelName,
    avatarUrl: profile.avatarUrl,
    bannerUrl: (profile as any).bannerUrl ?? null,
    bio: profile.bio,
    channelLink: profile.channelLink,
    isVerified: profile.isVerified,
    minDonationAmount: profile.minDonationAmount,
    messageMaxLength: (profile as any).messageMaxLength ?? 100,
    messageTiers: (profile as any).messageTiers ?? [],
    voiceTiers: profile.voiceTiers,
    activeGoal: profile.goals[0] ?? null,
    quickAmounts: [100, 250, 500, 1000, 2000, 5000],
    socialTwitter: profile.socialTwitter,
    socialInstagram: profile.socialInstagram,
    socialYoutube: profile.socialYoutube,
    socialTwitch: profile.socialTwitch,
    socialDiscord: profile.socialDiscord,
    socialKick: profile.socialKick,
    voiceMessagesEnabled: alertSettings?.voiceMessagesEnabled ?? false,
    celebrityVoiceEnabled: alertSettings?.celebrityVoiceEnabled ?? false,
    celebrityVoiceMinAmount: alertSettings?.celebrityVoiceMinAmount ?? 1000,
    customEmojis: (profile as any).customEmojis ? (profile as any).customEmojis.split('|||').filter(Boolean) : [],
    streamEmbedEnabled: (profile as any).streamEmbedEnabled ?? false,
    liveStream,
  })
})

// Public: get leaderboard data for overlay (by token)
router.get('/overlay-leaderboard/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await prisma.streamerProfile.findUnique({ where: { overlayToken: req.params.token } })
    if (!profile) { res.status(404).json({ error: 'Invalid token' }); return }

    const [topRows, recent] = await Promise.all([
      prisma.donation.groupBy({
        by: ['donorName'],
        where: { streamerId: profile.id, status: 'SUCCESS' },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      prisma.donation.findMany({
        where: { streamerId: profile.id, status: 'SUCCESS' },
        orderBy: { paidAt: 'desc' },
        take: 10,
        select: { donorName: true, amount: true, paidAt: true },
      }),
    ])
    res.json({
      topDonors: topRows.map((r, i) => ({ rank: i + 1, name: r.donorName, total: r._sum.amount ?? 0 })),
      recentDonors: recent.map(d => ({ name: d.donorName, amount: d.amount, paidAt: d.paidAt })),
    })
  } catch (e) {
    console.error('overlay-leaderboard error:', e)
    res.status(500).json({ error: 'Internal error', topDonors: [], recentDonors: [] })
  }
})

// Public: get top donors for leaderboard on donation page
router.get('/leaderboard/:username', async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { username: req.params.username } })
  if (!profile) { res.status(404).json({ error: 'Streamer not found' }); return }

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const rows = await prisma.donation.groupBy({
    by: ['donorName'],
    where: { streamerId: profile.id, status: 'SUCCESS', paidAt: { gte: monthStart } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  })
  res.json(rows.map((r, i) => ({ rank: i + 1, name: r.donorName, total: r._sum.amount ?? 0 })))
})

// Public: create payment order
router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    streamerId: z.string(),
    donorName: z.string().min(1).max(100),
    message: z.string().max(500).optional(),
    voiceMessageUrl: z.string().url().optional(),
    stickerIndexes: z.array(z.number().int().min(0).max(4)).max(5).optional(),
    amount: z.number().int().min(1).max(10000),
    viewerId: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

  const { streamerId, donorName, message, voiceMessageUrl, stickerIndexes, amount, viewerId } = parsed.data

  const streamer = await prisma.streamerProfile.findUnique({ where: { id: streamerId } })
  if (!streamer) { res.status(404).json({ error: 'Streamer not found' }); return }
  if (amount < streamer.minDonationAmount) {
    res.status(400).json({ error: `Minimum donation is ₹${streamer.minDonationAmount}` })
    return
  }
  const maxMsgLen = (streamer as any).messageMaxLength ?? 100
  if (message && message.length > maxMsgLen) {
    res.status(400).json({ error: `Message too long — max ${maxMsgLen} characters` })
    return
  }

  const streamerAlertSettings = await prisma.alertSettings.findUnique({ where: { streamerId: streamer.id } })
  const isCelebrityVoice = !!(
    streamerAlertSettings?.celebrityVoiceEnabled &&
    streamerAlertSettings?.celebrityVoiceId &&
    amount >= (streamerAlertSettings?.celebrityVoiceMinAmount ?? 1000)
  )
  const basePct = Number(streamer.platformFeePct ?? 5)
  const feePct = isCelebrityVoice ? 20 : basePct
  const feeAmount = (amount * feePct) / 100
  const netAmount = amount - feeAmount
  const cfOrderId = generateOrderId()

  const donation = await prisma.donation.create({
    data: {
      streamerId,
      viewerId: viewerId ?? null,
      donorName,
      message: message ?? null,
      voiceMessageUrl: voiceMessageUrl ?? null,
      stickerIndexes: stickerIndexes?.length ? stickerIndexes.join(',') : null,
      amount,
      platformFeePct: feePct,
      feeAmount,
      netAmount,
      cfOrderId,
      status: 'PENDING',
    },
  })

  // Create Razorpay order
  let razorpayOrderId: string | null = null
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
      const order = await rzp.orders.create({ amount: amount * 100, currency: 'INR', receipt: cfOrderId })
      razorpayOrderId = order.id as string
      // Store Razorpay order ID in cfOrderId field
      await prisma.donation.update({ where: { id: donation.id }, data: { cfOrderId: razorpayOrderId } })
    } catch (e) {
      console.error('Razorpay order creation failed:', e)
      res.status(502).json({ error: 'Payment gateway unavailable. Please try again.' })
      return
    }
  }

  res.status(201).json({ donationId: donation.id, razorpayOrderId, amount: amount * 100, currency: 'INR' })
})

// Public: poll donation status
router.get('/:donationId/status', async (req: Request, res: Response): Promise<void> => {
  const donation = await prisma.donation.findUnique({
    where: { id: req.params.donationId },
    select: { status: true, amount: true, donorName: true },
  })
  if (!donation) { res.status(404).json({ error: 'Donation not found' }); return }
  res.json(donation)
})

// Protected: streamer donation history
router.get('/', requireStreamer, async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const { page = '1', search = '', status, period } = req.query as Record<string, string>
  const take = 20
  const skip = (parseInt(page) - 1) * take

  let dateFilter: { gte: Date } | undefined
  if (period === 'today') {
    const d = new Date(); d.setHours(0, 0, 0, 0); dateFilter = { gte: d }
  } else if (period === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7); dateFilter = { gte: d }
  } else if (period === 'month') {
    const d = new Date(); dateFilter = { gte: new Date(d.getFullYear(), d.getMonth(), 1) }
  }

  const where = {
    streamerId: profile.id,
    ...(status ? { status: status as any } : {}),
    ...(search ? { OR: [{ donorName: { contains: search, mode: 'insensitive' as const } }, { message: { contains: search, mode: 'insensitive' as const } }] } : {}),
    ...(dateFilter ? { paidAt: dateFilter } : {}),
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.donation.count({ where }),
  ])

  res.json({ donations, total, page: parseInt(page), pages: Math.ceil(total / take) })
})

router.get('/stats/summary', requireStreamer, async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const [totalEarned, totalMessages, netPending, topTx] = await Promise.all([
    prisma.donation.aggregate({ where: { streamerId: profile.id, status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.donation.count({ where: { streamerId: profile.id, status: 'SUCCESS' } }),
    prisma.donation.aggregate({ where: { streamerId: profile.id, status: 'SUCCESS', settled: false }, _sum: { netAmount: true } }),
    prisma.donation.findFirst({ where: { streamerId: profile.id, status: 'SUCCESS' }, orderBy: { amount: 'desc' }, select: { amount: true } }),
  ])

  res.json({
    totalEarned: totalEarned._sum.amount ?? 0,
    totalMessages,
    netPending: netPending._sum.netAmount ?? 0,
    topTransaction: topTx?.amount ?? 0,
  })
})

export default router
