import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { requireAdmin, requireSuperAdmin, requirePermission, AdminRequest } from '../middleware/auth'
import { prisma } from '../db/prisma'
import { nanoid } from 'nanoid'
import { auditLog } from '../middleware/auditLog'
import { emitToDonationOverlay } from '../socket'

const router = Router()
router.use(requireAdmin)

// ── STATS ──────────────────────────────────────────────────────────────────
router.get('/stats', requirePermission('overview'), async (_req: AdminRequest, res: Response): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10)
  const [
    totalStreamers,
    totalViewers,
    totalDonations,
    successDonations,
    pendingSettlements,
    paidSettlements,
    visitorStats,
  ] = await Promise.all([
    prisma.streamerProfile.count(),
    prisma.viewerProfile.count(),
    prisma.donation.count({ where: { status: 'SUCCESS' } }),
    prisma.donation.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.settlement.count({ where: { status: 'INITIATED' } }),
    prisma.settlement.aggregate({ where: { status: 'SUCCESS' }, _sum: { netAmount: true } }),
    prisma.$queryRaw<[{website_total:bigint;dashboard_total:bigint;website_today:bigint;dashboard_today:bigint}]>`
      SELECT
        COUNT(DISTINCT CASE WHEN page = 'website' THEN ip END)             AS website_total,
        COUNT(DISTINCT CASE WHEN page = 'dashboard' THEN ip END)           AS dashboard_total,
        COUNT(DISTINCT CASE WHEN page = 'website' AND date = ${today} THEN ip END)   AS website_today,
        COUNT(DISTINCT CASE WHEN page = 'dashboard' AND date = ${today} THEN ip END) AS dashboard_today
      FROM page_visits
    `,
  ])
  const v = visitorStats[0]
  res.json({
    totalStreamers,
    totalViewers,
    totalDonations,
    totalCollected: successDonations._sum.amount ?? 0,
    pendingSettlements,
    totalPaidOut: Number(paidSettlements._sum.netAmount ?? 0),
    visitors: {
      websiteTotal:    Number(v?.website_total    ?? 0),
      dashboardTotal:  Number(v?.dashboard_total  ?? 0),
      websiteToday:    Number(v?.website_today    ?? 0),
      dashboardToday:  Number(v?.dashboard_today  ?? 0),
    },
  })
})

router.get('/stats/trend', requirePermission('overview'), async (req: AdminRequest, res: Response): Promise<void> => {
  const days = Math.min(30, Math.max(1, parseInt((req.query.days as string) ?? '7', 10) || 7))
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (days - 1))

  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const days_: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setUTCDate(d.getUTCDate() + i)
    days_.push(dayKey(d))
  }

  const [donations, streamerSignups, viewerSignups, settlements] = await Promise.all([
    prisma.donation.findMany({ where: { status: 'SUCCESS', createdAt: { gte: since } }, select: { amount: true, createdAt: true } }),
    prisma.streamerProfile.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.viewerProfile.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.settlement.findMany({ where: { initiatedAt: { gte: since } }, select: { status: true, grossAmount: true, netAmount: true, initiatedAt: true } }),
  ])

  const buckets: Record<string, { day: string; donationCount: number; revenue: number; newStreamers: number; newViewers: number; settlementsRequested: number; settlementsGross: number; settlementsPaid: number; settlementsNet: number }> = {}
  for (const d of days_) buckets[d] = { day: d, donationCount: 0, revenue: 0, newStreamers: 0, newViewers: 0, settlementsRequested: 0, settlementsGross: 0, settlementsPaid: 0, settlementsNet: 0 }

  for (const d of donations) {
    const k = dayKey(d.createdAt); if (!buckets[k]) continue
    buckets[k].donationCount += 1
    buckets[k].revenue += d.amount
  }
  for (const s of streamerSignups) { const k = dayKey(s.createdAt); if (buckets[k]) buckets[k].newStreamers += 1 }
  for (const v of viewerSignups) { const k = dayKey(v.createdAt); if (buckets[k]) buckets[k].newViewers += 1 }
  for (const s of settlements) {
    const k = dayKey(s.initiatedAt); if (!buckets[k]) continue
    buckets[k].settlementsRequested += 1
    buckets[k].settlementsGross += s.grossAmount
    if (s.status === 'SUCCESS') { buckets[k].settlementsPaid += 1; buckets[k].settlementsNet += Number(s.netAmount) }
  }

  res.json({ days, trend: days_.map(d => buckets[d]) })
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

router.patch('/users/:id', requirePermission('users'), auditLog('UPDATE_USER','user',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { email, displayName } = req.body as { email?: string; displayName?: string }
  const updated = await prisma.user.update({
    where: { id },
    data: { ...(email && { email }), ...(displayName !== undefined && { displayName }) },
  })
  res.json(updated)
})

router.delete('/users/:id', requirePermission('users'), auditLog('DELETE_USER','user',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.post('/users/:id/restore', requirePermission('restore_accounts'), auditLog('RESTORE_USER','user',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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
    platformFeePct: Number(s.platformFeePct ?? 5),
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

router.get('/streamers/:id/trend', requirePermission('streamers'), async (req: AdminRequest, res: Response): Promise<void> => {
  const days = Math.min(30, Math.max(1, parseInt((req.query.days as string) ?? '7', 10) || 7))
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (days - 1))

  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const days_: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since); d.setUTCDate(d.getUTCDate() + i)
    days_.push(dayKey(d))
  }

  const donations = await prisma.donation.findMany({
    where: { streamerId: req.params.id, status: 'SUCCESS', createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
  })

  const buckets: Record<string, { day: string; donationCount: number; revenue: number }> = {}
  for (const d of days_) buckets[d] = { day: d, donationCount: 0, revenue: 0 }
  for (const d of donations) {
    const k = dayKey(d.createdAt); if (!buckets[k]) continue
    buckets[k].donationCount += 1
    buckets[k].revenue += d.amount
  }

  res.json({ days, trend: days_.map(d => buckets[d]) })
})

router.patch('/streamers/:id', requirePermission('streamers'), auditLog('UPDATE_STREAMER','streamer',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { id } = req.params
  const { channelName, bio, channelLink, username, isActive, isVerified, isPremium, minDonationAmount, discordWebhookUrl, platformFeePct } = req.body as {
    channelName?: string; bio?: string; channelLink?: string; username?: string
    isActive?: boolean; isVerified?: boolean; isPremium?: boolean; minDonationAmount?: number; discordWebhookUrl?: string; platformFeePct?: number
  }
  if (platformFeePct !== undefined && (platformFeePct < 0 || platformFeePct > 50)) {
    res.status(400).json({ error: 'Platform fee must be between 0% and 50%' }); return
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
      ...(platformFeePct    !== undefined && { platformFeePct }),
    },
  })
  res.json(updated)
})

router.post('/streamers/:id/approve-verification', requirePermission('streamers'), auditLog('APPROVE_VERIFICATION','streamer',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const updated = await prisma.streamerProfile.update({
    where: { id: req.params.id },
    data: { isVerified: true, verificationRequestedAt: null },
  })
  res.json({ isVerified: updated.isVerified })
})

router.post('/streamers/:id/reject-verification', requirePermission('streamers'), auditLog('REJECT_VERIFICATION','streamer',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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
  const { accountHolderName, accountNumber, ifscCode, bankName, upiId, invoiceName, streetAddress, city, state, pincode } = req.body as {
    accountHolderName?: string; accountNumber?: string; ifscCode?: string; bankName?: string; upiId?: string
    invoiceName?: string; streetAddress?: string; city?: string; state?: string; pincode?: string
  }
  const updated = await prisma.streamerBankDetails.upsert({
    where: { streamerId: id },
    create: { streamerId: id, accountHolderName, accountNumber, ifscCode, bankName, upiId, invoiceName, streetAddress, city, state, pincode },
    update: {
      ...(accountHolderName !== undefined && { accountHolderName }),
      ...(accountNumber     !== undefined && { accountNumber }),
      ...(ifscCode          !== undefined && { ifscCode }),
      ...(bankName          !== undefined && { bankName }),
      ...(upiId             !== undefined && { upiId }),
      ...(invoiceName       !== undefined && { invoiceName }),
      ...(streetAddress     !== undefined && { streetAddress }),
      ...(city              !== undefined && { city }),
      ...(state             !== undefined && { state }),
      ...(pincode           !== undefined && { pincode }),
    },
  })
  res.json(updated)
})

// Data-repair: goals left inactive (overlay hidden, donations not tracked) by the
// isActive-mismatch bug, identified by having real accumulated progress already.
router.post('/goals/fix-inactive', requirePermission('streamers'), auditLog('FIX_INACTIVE_GOALS'), async (_req: AdminRequest, res: Response): Promise<void> => {
  const affected = await prisma.overlayGoal.findMany({
    where: { isActive: false, currentAmount: { gt: 0 } },
    include: { streamer: { select: { channelName: true, username: true } } },
  })
  if (affected.length) {
    await prisma.overlayGoal.updateMany({
      where: { id: { in: affected.map(g => g.id) } },
      data: { isActive: true },
    })
  }
  res.json({
    fixedCount: affected.length,
    fixed: affected.map(g => ({
      channelName: g.streamer.channelName, username: g.streamer.username,
      title: g.title, currentAmount: g.currentAmount, targetAmount: g.targetAmount,
    })),
  })
})

// ── DONATIONS ──────────────────────────────────────────────────────────────
router.get('/donations', requirePermission('donations'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', status, search, streamer } = req.query
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

  // Resolve streamer filter to streamer profile IDs
  let streamerIds: string[] | undefined
  if (streamer) {
    const profiles = await prisma.streamerProfile.findMany({
      where: { OR: [
        { channelName: { contains: streamer as string, mode: 'insensitive' } },
        { username:    { contains: streamer as string, mode: 'insensitive' } },
      ]},
      select: { id: true },
    })
    streamerIds = profiles.map(p => p.id)
  }

  const where = {
    ...(status && { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' }),
    ...(streamerIds && { streamerId: { in: streamerIds } }),
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

router.patch('/donations/:id', requirePermission('donations'), auditLog('UPDATE_DONATION','donation',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { status, message, amount, donorName } = req.body as { status?: string; message?: string; amount?: number; donorName?: string }

  let amountFields: Record<string, unknown> = {}
  if (amount !== undefined) {
    if (!Number.isInteger(amount) || amount <= 0) { res.status(400).json({ error: 'Amount must be a positive integer' }); return }
    const existing = await prisma.donation.findUnique({ where: { id: req.params.id } })
    if (!existing) { res.status(404).json({ error: 'Donation not found' }); return }
    if (existing.settled) { res.status(400).json({ error: 'Cannot change the amount of a donation that has already been settled — use a balance adjustment instead' }); return }
    const pct = Number(existing.platformFeePct)
    const feeAmount = Math.round(amount * pct) / 100
    amountFields = { amount, feeAmount, netAmount: amount - feeAmount }
  }

  const updated = await prisma.donation.update({
    where: { id: req.params.id },
    data: {
      ...(status  && { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' }),
      ...(message !== undefined && { message }),
      ...(donorName !== undefined && { donorName }),
      ...amountFields,
    },
  })
  res.json(updated)
})

// Manual ledger correction — adds a credit/debit entry to a streamer's balance rather
// than mutating an aggregate, so pending/lifetime totals stay derived and auditable.
router.post('/streamers/:id/adjustment', requirePermission('streamers'), auditLog('ADJUST_STREAMER_BALANCE','streamer',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { amount, reason } = req.body as { amount?: number; reason?: string }
  if (!Number.isInteger(amount) || amount === 0) { res.status(400).json({ error: 'Amount must be a non-zero integer — positive to credit, negative to debit' }); return }
  if (!reason?.trim()) { res.status(400).json({ error: 'A reason is required for the audit trail' }); return }

  const streamer = await prisma.streamerProfile.findUnique({ where: { id: req.params.id } })
  if (!streamer) { res.status(404).json({ error: 'Streamer not found' }); return }

  const donation = await prisma.donation.create({
    data: {
      streamer: { connect: { id: streamer.id } },
      donorName: amount > 0 ? 'Admin Credit' : 'Admin Debit',
      message: reason,
      amount,
      platformFeePct: 0,
      feeAmount: 0,
      netAmount: amount,
      cfOrderId: `admin_adj_${randomUUID()}`,
      status: 'SUCCESS',
      paidAt: new Date(),
    },
  })
  res.json(donation)
})

// Let admin correct a streamer's overlay goal directly (support cases like a mistracked
// or hidden goal) and push the new state live if their overlay is connected.
router.patch('/streamers/:id/goal', requirePermission('streamers'), auditLog('UPDATE_STREAMER_GOAL','streamer',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { title, targetAmount, currentAmount, isActive } = req.body as { title?: string; targetAmount?: number; currentAmount?: number; isActive?: boolean }
  const streamer = await prisma.streamerProfile.findUnique({ where: { id: req.params.id } })
  if (!streamer) { res.status(404).json({ error: 'Streamer not found' }); return }

  const goal = await prisma.overlayGoal.findFirst({ where: { streamerId: streamer.id }, orderBy: { createdAt: 'desc' } })
  if (!goal) { res.status(404).json({ error: 'This streamer has no goal set up yet' }); return }

  const updated = await prisma.overlayGoal.update({
    where: { id: goal.id },
    data: {
      ...(title !== undefined && { title }),
      ...(targetAmount !== undefined && { targetAmount }),
      ...(currentAmount !== undefined && { currentAmount }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  if (streamer.overlayToken) {
    emitToDonationOverlay(streamer.overlayToken, 'goal-updated', {
      currentAmount: updated.currentAmount, targetAmount: updated.targetAmount, title: updated.title,
    })
  }
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

router.patch('/settlements/:id/mark-paid', requirePermission('settlements'), auditLog('MARK_SETTLEMENT_PAID','settlement',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.patch('/settlements/:id/mark-failed', requirePermission('settlements'), auditLog('MARK_SETTLEMENT_FAILED','settlement',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.post('/roles', requireSuperAdmin, auditLog('CREATE_ROLE','role'), async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, permissions } = req.body as { name: string; permissions: object }
  if (!name) { res.status(400).json({ error: 'Role name required' }); return }
  try {
    const role = await prisma.adminRole.create({ data: { name, permissions } })
    res.json(role)
  } catch {
    res.status(409).json({ error: 'Role name already exists' })
  }
})

router.patch('/roles/:id', requireSuperAdmin, auditLog('UPDATE_ROLE','role',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, permissions } = req.body as { name?: string; permissions?: object }
  const updated = await prisma.adminRole.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(permissions && { permissions }) },
  })
  res.json(updated)
})

router.delete('/roles/:id', requireSuperAdmin, auditLog('DELETE_ROLE','role',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.post('/admin-users', requireSuperAdmin, auditLog('CREATE_ADMIN'), async (req: AdminRequest, res: Response): Promise<void> => {
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

router.patch('/admin-users/:id', requireSuperAdmin, auditLog('UPDATE_ADMIN','admin',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { roleId } = req.body as { roleId?: string | null }
  const updated = await prisma.adminUser.update({
    where: { id: req.params.id },
    data: { roleId: roleId === null ? null : roleId },
    include: { role: true },
  })
  res.json(updated)
})

router.delete('/admin-users/:id', requireSuperAdmin, auditLog('DELETE_ADMIN','admin',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const target = await prisma.adminUser.findUnique({ where: { id: req.params.id } })
  if (target?.isSuperAdmin) { res.status(400).json({ error: 'Cannot remove super admin' }); return }
  await prisma.adminUser.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.get('/support-payments', requirePermission('support'), async (_req: AdminRequest, res: Response): Promise<void> => {
  const payments = await prisma.supportPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(payments)
})

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────────

router.get('/tickets', requirePermission('tickets'), async (_req: AdminRequest, res: Response): Promise<void> => {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      streamer: { select: { channelName: true, username: true, user: { select: { email: true } } } },
    },
  })
  res.json(tickets)
})

router.post('/tickets/:id/reply', requirePermission('tickets'), auditLog('TICKET_REPLY','ticket',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const { body } = req.body as { body: string }
  if (!body?.trim()) { res.status(400).json({ error: 'Body required' }); return }
  const msg = await prisma.ticketMessage.create({
    data: {
      id: randomUUID(),
      ticketId: req.params.id,
      body: body.trim(),
      fromAdmin: true,
      adminName: req.admin?.name ?? req.admin?.email ?? 'Admin',
    },
  })
  await prisma.supportTicket.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } })
  res.json(msg)
})

router.patch('/tickets/:id/close', requirePermission('tickets'), auditLog('TICKET_CLOSE','ticket',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status: 'CLOSED', updatedAt: new Date() },
  })
  res.json(ticket)
})

router.patch('/tickets/:id/reopen', requirePermission('tickets'), auditLog('TICKET_REOPEN','ticket',r=>r.params.id), async (req: AdminRequest, res: Response): Promise<void> => {
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status: 'OPEN', updatedAt: new Date() },
  })
  res.json(ticket)
})

// ── PLATFORM CONFIG (super admin only) ────────────────────────────────────
router.get('/config', requireSuperAdmin, async (_req: AdminRequest, res: Response): Promise<void> => {
  const rows = await prisma.platformConfig.findMany()
  const cfg: Record<string, string> = {}
  for (const r of rows) cfg[r.key] = r.value
  res.json(cfg)
})

router.patch('/config', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const updates = req.body as Record<string, string>
  await Promise.all(Object.entries(updates).map(([key, value]) =>
    prisma.platformConfig.upsert({ where: { key }, update: { value }, create: { key, value } })
  ))
  res.json({ ok: true })
})

router.post('/config/test-webhook', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { url, type } = req.body as { url: string; type: string }
  if (!url) { res.status(400).json({ error: 'No URL provided' }); return }
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: type === 'tickets' ? '🧪 Test — EzTips Ticket Alert' : type === 'verification' ? '🧪 Test — EzTips Verification Alert' : type === 'settlement' ? '🧪 Test — EzTips Settlement Alert' : '🧪 Test — EzTips Webhook',
          description: type === 'tickets'
            ? '**Subject:** Test ticket\n**From:** TestStreamer\n**Message:** This is a test notification from EzTips admin panel.'
            : type === 'verification'
            ? '**Channel:** TestStreamer\n**Username:** teststreamer\n**Bank:** State Bank — Test User'
            : type === 'settlement'
            ? '**TestStreamer** has requested a payout.\n**Gross:** ₹1,000 | **Fee (7%):** ₹70 | **Net:** ₹930'
            : 'This is a test webhook notification from EzTips.',
          color: type === 'verification' ? 0x10b981 : type === 'settlement' ? 0x10b981 : 0x7c3aed,
          footer: { text: 'EzTips · eztips.live' },
          timestamp: new Date().toISOString(),
        }],
      }),
    })
    if (resp.ok || resp.status === 204) { res.json({ ok: true }) }
    else { const t = await resp.text(); res.status(400).json({ error: `Discord returned ${resp.status}: ${t}` }) }
  } catch (e: any) { res.status(500).json({ error: e.message ?? 'Failed to reach Discord' }) }
})

// ── TEST DONATION (super admin only) ───────────────────────────────────────
router.post('/test-donation', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { streamerId, donorName, amount, message } = req.body

  if (!streamerId || typeof streamerId !== 'string') { res.status(400).json({ error: 'streamerId required' }); return }
  if (!donorName || typeof donorName !== 'string') { res.status(400).json({ error: 'donorName required' }); return }
  if (typeof amount !== 'number' || amount < 1) { res.status(400).json({ error: 'amount must be a positive number' }); return }

  const profile = await prisma.streamerProfile.findUnique({
    where: { id: streamerId },
    select: { overlayToken: true },
  })
  if (!profile?.overlayToken) { res.status(404).json({ error: 'Streamer or overlay token not found' }); return }

  emitToDonationOverlay(profile.overlayToken, 'new-donation', {
    donationId: `test_${Date.now()}`,
    donorName: donorName.trim(),
    message: message?.trim() || null,
    amount,
    voiceMessageUrl: null,
    stickerUrls: undefined,
    streamerUsername: null,
  })

  res.json({ ok: true })
})

// ── AUDIT LOGS (super admin only) ──────────────────────────────────────────
router.get('/logs', requireSuperAdmin, async (req: AdminRequest, res: Response): Promise<void> => {
  const { adminId, action, limit = '100', offset = '0' } = req.query as Record<string, string>
  const logs = await prisma.adminLog.findMany({
    where: {
      ...(adminId ? { adminId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit), 500),
    skip: Number(offset),
  })
  res.json(logs)
})

export default router
