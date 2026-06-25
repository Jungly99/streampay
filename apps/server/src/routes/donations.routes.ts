import { Router, Request, Response } from 'express'
import { z } from 'zod'
import Razorpay from 'razorpay'
import { prisma } from '../db/prisma'
import { requireStreamer, AuthRequest } from '../middleware/auth'
import { generateOrderId } from '../utils/generateToken'
import { env } from '../config/env'

const router = Router()

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
  res.json({
    id: profile.id,
    username: profile.username,
    channelName: profile.channelName,
    avatarUrl: profile.avatarUrl,
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
  })
})

// Public: get leaderboard data for overlay (by token)
router.get('/overlay-leaderboard/:token', async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { overlayToken: req.params.token } })
  if (!profile) { res.status(404).json({ error: 'Invalid token' }); return }

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const [topRows, recent] = await Promise.all([
    prisma.donation.groupBy({
      by: ['donorName'],
      where: { streamerId: profile.id, status: 'SUCCESS', paidAt: { gte: monthStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    }),
    prisma.donation.findMany({
      where: { streamerId: profile.id, status: 'SUCCESS' },
      orderBy: { paidAt: 'desc' },
      take: 8,
      select: { donorName: true, amount: true, paidAt: true },
    }),
  ])
  res.json({
    topDonors: topRows.map((r, i) => ({ rank: i + 1, name: r.donorName, total: r._sum.amount ?? 0 })),
    recentDonors: recent.map(d => ({ name: d.donorName, amount: d.amount, paidAt: d.paidAt })),
  })
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
    amount: z.number().int().min(1).max(10000),
    viewerId: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

  const { streamerId, donorName, message, voiceMessageUrl, amount, viewerId } = parsed.data

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
  const feePct = isCelebrityVoice ? 20 : 5
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
