import { Router, Request, Response } from 'express'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../db/prisma'
import { nanoid } from 'nanoid'

const router = Router()
router.use(requireAdmin)

// ── STATS ──────────────────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  const [
    totalStreamers,
    totalViewers,
    totalDonations,
    successDonations,
    pendingSettlements,
    paidSettlements,
  ] = await Promise.all([
    prisma.streamerProfile.count(),
    prisma.viewerProfile.count(),
    prisma.donation.count(),
    prisma.donation.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.settlement.count({ where: { status: 'INITIATED' } }),
    prisma.settlement.aggregate({ where: { status: 'SUCCESS' }, _sum: { netAmount: true } }),
  ])
  res.json({
    totalStreamers,
    totalViewers,
    totalDonations,
    totalCollected: successDonations._sum.amount ?? 0,
    pendingSettlements,
    totalPaidOut: Number(paidSettlements._sum.netAmount ?? 0),
  })
})

// ── USERS ──────────────────────────────────────────────────────────────────
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const { search } = req.query
  const users = await prisma.user.findMany({
    where: search
      ? { OR: [{ email: { contains: search as string, mode: 'insensitive' } }, { displayName: { contains: search as string, mode: 'insensitive' } }] }
      : undefined,
    include: {
      streamerProfile: { select: { id: true, username: true, channelName: true, isActive: true, isVerified: true } },
      viewerProfile: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

router.patch('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { email, displayName } = req.body as { email?: string; displayName?: string }
  const updated = await prisma.user.update({
    where: { id },
    data: { ...(email && { email }), ...(displayName !== undefined && { displayName }) },
  })
  res.json(updated)
})

router.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── STREAMERS ──────────────────────────────────────────────────────────────
router.get('/streamers', async (_req: Request, res: Response): Promise<void> => {
  const streamers = await prisma.streamerProfile.findMany({
    include: {
      user: { select: { id: true, email: true, createdAt: true, displayName: true } },
      bankDetails: true,
      _count: { select: { donations: true, settlements: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const streamerIds = streamers.map(s => s.id)
  const [pendingTotals, successTotals] = await Promise.all([
    prisma.donation.groupBy({
      by: ['streamerId'],
      where: { streamerId: { in: streamerIds }, status: 'SUCCESS', settled: false },
      _sum: { amount: true },
    }),
    prisma.donation.groupBy({
      by: ['streamerId'],
      where: { streamerId: { in: streamerIds }, status: 'SUCCESS' },
      _sum: { amount: true },
    }),
  ])

  const pendingMap = Object.fromEntries(pendingTotals.map(p => [p.streamerId, p._sum.amount ?? 0]))
  const totalMap   = Object.fromEntries(successTotals.map(p => [p.streamerId, p._sum.amount ?? 0]))

  res.json(streamers.map(s => ({
    id: s.id,
    userId: s.userId,
    username: s.username,
    channelName: s.channelName,
    channelLink: s.channelLink,
    bio: s.bio,
    avatarUrl: s.avatarUrl,
    email: s.user.email,
    displayName: s.user.displayName,
    isActive: s.isActive,
    isVerified: s.isVerified,
    minDonationAmount: s.minDonationAmount,
    overlayToken: s.overlayToken,
    discordWebhookUrl: s.discordWebhookUrl,
    createdAt: s.user.createdAt,
    donationCount: s._count.donations,
    settlementCount: s._count.settlements,
    pendingBalance: pendingMap[s.id] ?? 0,
    pendingNet: Math.round((pendingMap[s.id] ?? 0) * 0.95),
    totalCollected: totalMap[s.id] ?? 0,
    bankDetails: s.bankDetails,
  })))
})

router.get('/streamers/:id', async (req: Request, res: Response): Promise<void> => {
  const streamer = await prisma.streamerProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: true,
      bankDetails: true,
      alertSettings: true,
      voiceTiers: true,
      goals: true,
      _count: { select: { donations: true, settlements: true, followers: true } },
    },
  })
  if (!streamer) { res.status(404).json({ error: 'Not found' }); return }
  res.json(streamer)
})

router.patch('/streamers/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const {
    channelName, bio, channelLink, username,
    isActive, isVerified, minDonationAmount, discordWebhookUrl,
  } = req.body as {
    channelName?: string; bio?: string; channelLink?: string; username?: string
    isActive?: boolean; isVerified?: boolean; minDonationAmount?: number; discordWebhookUrl?: string
  }

  const updated = await prisma.streamerProfile.update({
    where: { id },
    data: {
      ...(channelName     !== undefined && { channelName }),
      ...(bio             !== undefined && { bio }),
      ...(channelLink     !== undefined && { channelLink }),
      ...(username        !== undefined && { username }),
      ...(isActive        !== undefined && { isActive }),
      ...(isVerified      !== undefined && { isVerified }),
      ...(minDonationAmount !== undefined && { minDonationAmount }),
      ...(discordWebhookUrl !== undefined && { discordWebhookUrl }),
    },
  })
  res.json(updated)
})

router.post('/streamers/:id/reset-overlay', async (req: Request, res: Response): Promise<void> => {
  const token = `otk_${nanoid(32)}`
  const updated = await prisma.streamerProfile.update({
    where: { id: req.params.id },
    data: { overlayToken: token },
  })
  res.json({ overlayToken: updated.overlayToken })
})

// ── BANK DETAILS ───────────────────────────────────────────────────────────
router.patch('/streamers/:id/bank', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { accountHolderName, accountNumber, ifscCode, bankName, invoiceName, streetAddress, city, state, pincode } = req.body as {
    accountHolderName?: string; accountNumber?: string; ifscCode?: string; bankName?: string
    invoiceName?: string; streetAddress?: string; city?: string; state?: string; pincode?: string
  }

  const updated = await prisma.streamerBankDetails.upsert({
    where: { streamerId: id },
    create: {
      streamerId: id,
      accountHolderName, accountNumber, ifscCode, bankName,
      invoiceName, streetAddress, city, state, pincode,
    },
    update: {
      ...(accountHolderName !== undefined && { accountHolderName }),
      ...(accountNumber     !== undefined && { accountNumber }),
      ...(ifscCode          !== undefined && { ifscCode }),
      ...(bankName          !== undefined && { bankName }),
      ...(invoiceName       !== undefined && { invoiceName }),
      ...(streetAddress     !== undefined && { streetAddress }),
      ...(city              !== undefined && { city }),
      ...(state             !== undefined && { state }),
      ...(pincode           !== undefined && { pincode }),
    },
  })
  res.json(updated)
})

// ── DONATIONS ──────────────────────────────────────────────────────────────
router.get('/donations', async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '50', status, search } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

  const where = {
    ...(status && { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' }),
    ...(search && {
      OR: [
        { donorName: { contains: search as string, mode: 'insensitive' as const } },
        { message: { contains: search as string, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: { streamer: { select: { username: true, channelName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string),
    }),
    prisma.donation.count({ where }),
  ])
  res.json({ donations, total, page: parseInt(page as string) })
})

router.patch('/donations/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, message } = req.body as { status?: string; message?: string }
  const updated = await prisma.donation.update({
    where: { id: req.params.id },
    data: {
      ...(status  && { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' }),
      ...(message !== undefined && { message }),
    },
  })
  res.json(updated)
})

// ── SETTLEMENTS ────────────────────────────────────────────────────────────
router.get('/settlements', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query
  const settlements = await prisma.settlement.findMany({
    where: status ? { status: status as 'INITIATED' | 'SUCCESS' | 'FAILED' } : undefined,
    include: {
      streamer: {
        select: {
          username: true, channelName: true,
          user: { select: { email: true } },
          bankDetails: true,
        },
      },
    },
    orderBy: { initiatedAt: 'desc' },
  })
  res.json(settlements)
})

router.patch('/settlements/:id/mark-paid', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params
  const { transferRef } = req.body as { transferRef?: string }
  const settlement = await prisma.settlement.findUnique({ where: { id } })
  if (!settlement) { res.status(404).json({ error: 'Settlement not found' }); return }
  if (settlement.status === 'SUCCESS') { res.status(400).json({ error: 'Already marked as paid' }); return }
  const updated = await prisma.settlement.update({
    where: { id },
    data: { status: 'SUCCESS', settledAt: new Date(), cfTransferId: transferRef ?? null },
  })
  res.json(updated)
})

router.patch('/settlements/:id/mark-failed', async (req: Request, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string }
  const updated = await prisma.settlement.update({
    where: { id: req.params.id },
    data: { status: 'FAILED', failureReason: reason ?? 'Marked failed by admin' },
  })
  res.json(updated)
})

export default router
