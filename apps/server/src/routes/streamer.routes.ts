import { Router, Response } from 'express'
import { z } from 'zod'
import QRCode from 'qrcode'
import { prisma } from '../db/prisma'
import { requireStreamer, AuthRequest } from '../middleware/auth'
import { generateOverlayToken } from '../utils/generateToken'
import { env } from '../config/env'
import { emitToDonationOverlay } from '../socket'

const router = Router()
router.use(requireStreamer)

async function getStreamerProfile(userId: string) {
  return prisma.streamerProfile.findUnique({
    where: { userId },
    include: { bankDetails: true, alertSettings: true, voiceTiers: true, goals: true },
  })
}

router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await getStreamerProfile(req.user!.userId)
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  res.json(profile)
})

router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({
    channelName: z.string().min(1).max(100).optional(),
    channelLink: z.string().url().optional().or(z.literal('')),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().optional().or(z.literal('')),
    socialTwitter: z.string().optional(),
    socialInstagram: z.string().optional(),
    socialYoutube: z.string().optional(),
    socialTwitch: z.string().optional(),
    socialDiscord: z.string().optional(),
    socialKick: z.string().optional(),
    discordWebhookUrl: z.string().url().optional().or(z.literal('')),
    minDonationAmount: z.number().int().min(11).max(10000).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors
    const first = Object.values(fields).flat()[0] ?? 'Validation failed'
    res.status(400).json({ error: first })
    return
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
  )
  const profile = await prisma.streamerProfile.update({
    where: { userId: req.user!.userId },
    data,
  })
  res.json(profile)
})

router.post('/profile/username', async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({ username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Username must be 3-30 alphanumeric characters' }); return }

  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  if (profile.username) { res.status(409).json({ error: 'Username already set — it cannot be changed' }); return }

  const taken = await prisma.streamerProfile.findUnique({ where: { username: parsed.data.username } })
  if (taken) { res.status(409).json({ error: 'Username already taken' }); return }

  const updated = await prisma.streamerProfile.update({
    where: { userId: req.user!.userId },
    data: { username: parsed.data.username },
  })
  res.json(updated)
})

router.get('/bank', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { bankDetails: true },
  })
  res.json(profile?.bankDetails ?? {})
})

router.patch('/bank', async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    invoiceName: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const bankDetails = await prisma.streamerBankDetails.upsert({
    where: { streamerId: profile.id },
    create: { streamerId: profile.id, ...parsed.data },
    update: parsed.data,
  })
  res.json(bankDetails)
})

router.get('/links', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const messageLink = profile.username
    ? `${env.FRONTEND_URL}/send-message/${profile.username}`
    : null
  const overlayUrl = profile.overlayToken
    ? `${env.FRONTEND_URL}/overlay/${profile.overlayToken}`
    : null

  let qrDataUrl: string | null = null
  if (messageLink) {
    qrDataUrl = await QRCode.toDataURL(messageLink, { width: 400, margin: 2 })
  }

  res.json({ messageLink, overlayUrl, overlayToken: profile.overlayToken, qrDataUrl })
})

router.post('/overlay-token/rotate', async (req: AuthRequest, res: Response): Promise<void> => {
  const newToken = generateOverlayToken()
  const profile = await prisma.streamerProfile.update({
    where: { userId: req.user!.userId },
    data: { overlayToken: newToken },
  })
  res.json({ overlayToken: profile.overlayToken })
})

router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayEarnings, monthEarnings, totalCount, pendingSettlement, followerCount] =
    await Promise.all([
      prisma.donation.aggregate({
        where: { streamerId: profile.id, status: 'SUCCESS', paidAt: { gte: today } },
        _sum: { amount: true },
      }),
      prisma.donation.aggregate({
        where: { streamerId: profile.id, status: 'SUCCESS', paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.donation.count({ where: { streamerId: profile.id, status: 'SUCCESS' } }),
      prisma.donation.aggregate({
        where: { streamerId: profile.id, status: 'SUCCESS', settled: false },
        _sum: { amount: true },
      }),
      prisma.follow.count({ where: { streamerId: profile.id } }),
    ])

  res.json({
    todayEarnings: todayEarnings._sum.amount ?? 0,
    monthEarnings: monthEarnings._sum.amount ?? 0,
    totalPaymentsCount: totalCount,
    pendingSettlement: pendingSettlement._sum.amount ?? 0,
    followerCount,
  })
})

router.get('/alert-settings', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { alertSettings: true },
  })
  res.json(profile?.alertSettings ?? {})
})

router.patch('/alert-settings', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const settings = await prisma.alertSettings.upsert({
    where: { streamerId: profile.id },
    create: { streamerId: profile.id, ...req.body },
    update: req.body,
  })
  res.json(settings)
})

router.get('/voice-tiers', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  const tiers = await prisma.voiceMessageTier.findMany({
    where: { streamerId: profile.id },
    orderBy: { durationSeconds: 'asc' },
  })
  res.json(tiers)
})

router.put('/voice-tiers', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const schema = z.array(z.object({
    durationSeconds: z.number().int().positive(),
    minAmount: z.number().int().positive(),
    isEnabled: z.boolean(),
  }))
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Invalid tiers' }); return }

  await prisma.voiceMessageTier.deleteMany({ where: { streamerId: profile.id } })
  const tiers = await prisma.voiceMessageTier.createMany({
    data: parsed.data.map(t => ({
      streamerId: profile.id,
      durationSeconds: t.durationSeconds,
      minAmount: t.minAmount,
      isEnabled: t.isEnabled,
    })),
  })
  res.json(tiers)
})

router.get('/goal', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  const goal = await prisma.overlayGoal.findFirst({
    where: { streamerId: profile.id, isActive: true },
  })
  res.json(goal ?? null)
})

router.put('/goal', async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({
    title: z.string().min(1).max(100),
    targetAmount: z.number().int().positive(),
    isActive: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  await prisma.overlayGoal.updateMany({ where: { streamerId: profile.id }, data: { isActive: false } })
  const goal = await prisma.overlayGoal.create({
    data: {
      streamer: { connect: { id: profile.id } },
      title: parsed.data.title,
      targetAmount: parsed.data.targetAmount,
      isActive: true,
    },
  })
  res.json(goal)
})

router.get('/leaderboard', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const { period = 'all' } = req.query as { period?: string }
  let dateFilter: { gte: Date } | undefined
  if (period === 'month') {
    const d = new Date(); dateFilter = { gte: new Date(d.getFullYear(), d.getMonth(), 1) }
  } else if (period === 'week') {
    const d = new Date(); d.setDate(d.getDate() - 7); dateFilter = { gte: d }
  }

  const rows = await prisma.donation.groupBy({
    by: ['donorName'],
    where: { streamerId: profile.id, status: 'SUCCESS', ...(dateFilter ? { paidAt: dateFilter } : {}) },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
    take: 10,
  })

  res.json(rows.map((r: typeof rows[0], i: number) => ({
    rank: i + 1,
    name: r.donorName,
    total: r._sum.amount ?? 0,
    count: r._count,
  })))
})

router.post('/test-alert', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  if (!profile.overlayToken) { res.status(400).json({ error: 'No overlay token found' }); return }

  const testAmounts = [51, 101, 251, 501, 1001]
  const testNames = ['StreamFan_99', 'ProViewer', 'TopSupporter', 'LoyalFan', 'MegaDonor']
  const testMessages = ['Keep streaming! 🔥', 'Love the content!', 'GGs only!', 'POG! 👑', 'Amazing stream!']
  const idx = Math.floor(Math.random() * testAmounts.length)

  emitToDonationOverlay(profile.overlayToken, 'new-donation', {
    donationId: `test_${Date.now()}`,
    donorName: testNames[idx],
    message: testMessages[idx],
    amount: testAmounts[idx],
    voiceMessageUrl: null,
    streamerUsername: profile.username,
  })

  res.json({ success: true, amount: testAmounts[idx], name: testNames[idx] })
})

export default router
