import { Router, Response } from 'express'
import { requireAdmin, requireSuperAdmin, requirePermission, AdminRequest } from '../middleware/auth'
import { prisma } from '../db/prisma'
import { nanoid } from 'nanoid'

const router = Router()
router.use(requireAdmin)

// ── STATS ──────────────────────────────────────────────────────────────────
router.get('/stats', requirePermission('overview'), async (_req: AdminRequest, res: Response): Promise<void> => {
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
router.get('/users', requirePermission('users'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { search } = req.query
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(search ? { OR: [{ email: { contains: search as string, mode: 'insensitive' } }, { displayName: { contains: search as string, mode: 'insensitive' } }] } : {}),
    },
    include: {
      streamerProfile: { select: { id: true, username: true, channelName: true, isActive: true, isVerified: true } },
      viewerProfile: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

router.patch('/users/:id', requirePermission('users'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { email, displayName } = req.body as { email?: string; displayName?: string }
  const updated = await prisma.user.update({
    where: { id },
    data: { ...(email && { email }), ...(displayName !== undefined && { displayName }) },
  })
  res.json(updated)
})

router.delete('/users/:id', requirePermission('users'), async (req: AdminRequest, res: Response): Promise<void> => {
  const streamer = await prisma.streamerProfile.findUnique({ where: { userId: req.params.id } })
  // Soft delete — preserve all data for potential restore
  await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } })
  if (streamer) {
    await prisma.streamerProfile.update({ where: { id: streamer.id }, data: { isActive: false } })
  }
  res.json({ ok: true })
})

// ── DELETED ACCOUNTS (restore_accounts permission) ─────────────────────────
router.get('/deleted-users', requirePermission('restore_accounts'), async (_req: AdminRequest, res: Response): Promise<void> => {
  const users = await prisma.user.findMany({
    where: { NOT: { deletedAt: null } },
    include: {
      streamerProfile: { select: { id: true, username: true, channelName: true, isVerified: true, _count: { select: { donations: true } } } },
      viewerProfile: { select: { id: true, displayName: true } },
    },
    orderBy: { deletedAt: 'desc' },
  })
  res.json(users)
})

router.post('/users/:id/restore', requirePermission('restore_accounts'), async (req: AdminRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user || !user.deletedAt) { res.status(404).json({ error: 'User not found or not deleted' }); return }
  await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: null } })
  const streamer = await prisma.streamerProfile.findUnique({ where: { userId: req.params.id } })
  if (streamer) {
    await prisma.streamerProfile.update({ where: { id: streamer.id }, data: { isActive: true } })
  }
  res.json({ ok: true })
})

// ── STREAMERS ──────────────────────────────────────────────────────────────
router.get('/streamers', requirePermission('streamers'), async (_req: AdminRequest, res: Response): Promise<void> => {
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
    isPremium: s.isPremium,
    verificationRequestedAt: s.verificationRequestedAt,
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

router.get('/streamers/:id', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const streamer = await prisma.streamerProfile.findUnique({
    where: { id: req.params.id },
    include: {
      user: true, bankDetails: true, alertSettings: true, voiceTiers: true, goals: true,
      _count: { select: { donations: true, settlements: true, followers: true } },
    },
  })
  if (!streamer) { res.status(404).json({ error: 'Not found' }); return }
  res.json(streamer)
})

router.patch('/streamers/:id', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { channelName, bio, channelLink, username, isActive, isVerified, isPremium, minDonationAmount, discordWebhookUrl } = req.body as {
    channelName?: string; bio?: string; channelLink?: string; username?: string
    isActive?: boolean; isVerified?: boolean; isPremium?: boolean; minDonationAmount?: number; discordWebhookUrl?: string
  }
  const updated = await prisma.streamerProfile.update({
    where: { id },
    data: {
      ...(channelName       !== undefined && { channelName }),
      ...(bio               !== undefined && { bio }),
      ...(channelLink       !== undefined && { channelLink }),
      ...(username          !== undefined && { username }),
      ...(isActive          !== undefined && { isActive }),
      ...(isVerified        !== undefined && { isVerified }),
      ...(isPremium         !== undefined && { isPremium }),
      ...(minDonationAmount !== undefined && { minDonationAmount }),
      ...(discordWebhookUrl !== undefined && { discordWebhookUrl }),
    },
  })
  res.json(updated)
})

router.post('/streamers/:id/approve-verification', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const updated = await prisma.streamerProfile.update({
    where: { id: req.params.id },
    data: { isVerified: true, verificationRequestedAt: null },
  })
  res.json({ isVerified: updated.isVerified })
})

router.post('/streamers/:id/reject-verification', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const updated = await prisma.streamerProfile.update({
    where: { id: req.params.id },
    data: { verificationRequestedAt: null },
  })
  res.json({ verificationRequestedAt: updated.verificationRequestedAt })
})

router.post('/streamers/:id/reset-overlay', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const token = `otk_${nanoid(32)}`
  const updated = await prisma.streamerProfile.update({ where: { id: req.params.id }, data: { overlayToken: token } })
  res.json({ overlayToken: updated.overlayToken })
})

router.patch('/streamers/:id/bank', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { accountHolderName, accountNumber, ifscCode, bankName, invoiceName, streetAddress, city, state, pincode } = req.body as {
    accountHolderName?: string; accountNumber?: string; ifscCode?: string; bankName?: string
    invoiceName?: string; streetAddress?: string; city?: string; state?: string; pincode?: string
  }
  const updated = await prisma.streamerBankDetails.upsert({
    where: { streamerId: id },
    create: { streamerId: id, accountHolderName, accountNumber, ifscCode, bankName, invoiceName, streetAddress, city, state, pincode },
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
router.get('/donations', requirePermission('donations'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', status, search } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const where = {
    ...(status && { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' }),
    ...(search && { OR: [
      { donorName: { contains: search as string, mode: 'insensitive' as const } },
      { message:   { contains: search as string, mode: 'insensitive' as const } },
    ]}),
  }
  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: { streamer: { select: { username: true, channelName: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take: parseInt(limit as string),
    }),
    prisma.donation.count({ where }),
  ])
  res.json({ donations, total, page: parseInt(page as string) })
})

router.patch('/donations/:id', requirePermission('donations'), async (req: AdminRequest, res: Response): Promise<void> => {
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
router.get('/settlements', requirePermission('settlements'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { status } = req.query
  const settlements = await prisma.settlement.findMany({
    where: status ? { status: status as 'INITIATED' | 'SUCCESS' | 'FAILED' } : undefined,
    include: {
      streamer: {
        select: { username: true, channelName: true, user: { select: { email: true } }, bankDetails: true },
      },
    },
    orderBy: { initiatedAt: 'desc' },
  })
  res.json(settlements)
})

router.patch('/settlements/:id/mark-paid', requirePermission('settlements'), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.patch('/settlements/:id/mark-failed', requirePermission('settlements'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string }
  const updated = await prisma.settlement.update({
    where: { id: req.params.id },
    data: { status: 'FAILED', failureReason: reason ?? 'Marked failed by admin' },
  })
  res.json(updated)
})

// ── ROLES (super admin only) ───────────────────────────────────────────────
router.get('/roles', requireSuperAdmin, async (_req: AdminRequest, res: Response): Promise<void> => {
  const roles = await prisma.adminRole.findMany({
    include: { _count: { select: { admins: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json(roles)
})

router.post('/roles', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, permissions } = req.body as { name: string; permissions: object }
  if (!name) { res.status(400).json({ error: 'Role name required' }); return }
  try {
    const role = await prisma.adminRole.create({ data: { name, permissions } })
    res.json(role)
  } catch {
    res.status(409).json({ error: 'Role name already exists' })
  }
})

router.patch('/roles/:id', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, permissions } = req.body as { name?: string; permissions?: object }
  const updated = await prisma.adminRole.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(permissions && { permissions }) },
  })
  res.json(updated)
})

router.delete('/roles/:id', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  await prisma.adminRole.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ── ADMIN USERS (super admin only) ─────────────────────────────────────────
router.get('/admin-users', requireSuperAdmin, async (_req: AdminRequest, res: Response): Promise<void> => {
  const admins = await prisma.adminUser.findMany({
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(admins)
})

router.post('/admin-users', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { email, roleId } = req.body as { email: string; roleId?: string }
  if (!email) { res.status(400).json({ error: 'Email required' }); return }
  try {
    const admin = await prisma.adminUser.create({
      data: { email, roleId: roleId ?? null },
      include: { role: true },
    })
    res.json(admin)
  } catch {
    res.status(409).json({ error: 'Admin with this email already exists' })
  }
})

router.patch('/admin-users/:id', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { roleId } = req.body as { roleId?: string | null }
  const updated = await prisma.adminUser.update({
    where: { id: req.params.id },
    data: { roleId: roleId === null ? null : roleId },
    include: { role: true },
  })
  res.json(updated)
})

router.delete('/admin-users/:id', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } })
  if (target?.isSuperAdmin) { res.status(400).json({ error: 'Cannot remove super admin' }); return }
  await prisma.adminUser.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.get('/support-payments', requireSuperAdmin, async (_req: AdminRequest, res: Response): Promise<void> => {
  const payments = await prisma.supportPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(payments)
})

export default router
