import { Router, Response } from 'express'
import { customAlphabet } from 'nanoid'
import { prisma } from '../db/prisma'
import { requireReferral, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireReferral)

const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 7)
const MIN_PAYOUT = 100

async function getPartner(userId: string) {
  return prisma.referralPartner.findUnique({ where: { userId } })
}

router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  res.json(partner)
})

router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const { displayName } = req.body as { displayName?: string }
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  const updated = await prisma.referralPartner.update({
    where: { id: partner.id },
    data: { ...(displayName !== undefined && { displayName }) },
  })
  res.json(updated)
})

router.get('/bank', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  const bank = await prisma.referralBankDetails.findUnique({ where: { referralPartnerId: partner.id } })
  res.json(bank ?? {})
})

router.patch('/bank', async (req: AuthRequest, res: Response): Promise<void> => {
  const { accountHolderName, accountNumber, ifscCode, bankName, upiId, invoiceName, streetAddress, city, state, pincode } = req.body as {
    accountHolderName?: string; accountNumber?: string; ifscCode?: string; bankName?: string; upiId?: string
    invoiceName?: string; streetAddress?: string; city?: string; state?: string; pincode?: string
  }
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }

  const data = { accountHolderName, accountNumber, ifscCode, bankName, upiId, invoiceName, streetAddress, city, state, pincode }
  const bank = await prisma.referralBankDetails.upsert({
    where: { referralPartnerId: partner.id },
    create: { referralPartnerId: partner.id, ...data },
    update: data,
  })
  res.json(bank)
})

router.post('/request-verification', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await prisma.referralPartner.findUnique({ where: { userId: req.user!.userId }, include: { bankDetails: true } })
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  if (!partner.bankDetails?.accountNumber) { res.status(400).json({ error: 'Add your bank details first' }); return }
  const updated = await prisma.referralPartner.update({ where: { id: partner.id }, data: { verificationRequestedAt: new Date() } })
  res.json(updated)
})

router.post('/generate-code', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  if (!partner.isVerified) { res.status(403).json({ error: 'You must be verified before creating a referral code' }); return }

  let code = ''
  for (let i = 0; i < 6; i++) {
    code = genCode()
    const clash = await prisma.referralPartner.findUnique({ where: { referralCode: code } })
    if (!clash) break
  }
  const updated = await prisma.referralPartner.update({ where: { id: partner.id }, data: { referralCode: code } })
  res.json(updated)
})

router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }

  const [pending, lifetime, referredCount] = await Promise.all([
    prisma.referralEarning.aggregate({ where: { referralPartnerId: partner.id, settled: false }, _sum: { amount: true } }),
    prisma.referralEarning.aggregate({ where: { referralPartnerId: partner.id }, _sum: { amount: true } }),
    prisma.streamerProfile.count({ where: { referredById: partner.id } }),
  ])
  res.json({
    pendingBalance: Number(pending._sum.amount ?? 0),
    lifetimeEarned: Number(lifetime._sum.amount ?? 0),
    referredCount,
    referralCode: partner.referralCode,
    isVerified: partner.isVerified,
    verificationRequestedAt: partner.verificationRequestedAt,
    minPayout: MIN_PAYOUT,
  })
})

router.get('/referred-streamers', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }

  const streamers = await prisma.streamerProfile.findMany({
    where: { referredById: partner.id },
    select: { id: true, channelName: true, username: true, createdAt: true, _count: { select: { donations: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const earningsByStreamer = await prisma.referralEarning.groupBy({
    by: ['streamerId'], where: { referralPartnerId: partner.id }, _sum: { amount: true },
  })
  const map = Object.fromEntries(earningsByStreamer.map(e => [e.streamerId, Number(e._sum.amount ?? 0)]))
  res.json(streamers.map(s => ({
    id: s.id, channelName: s.channelName, username: s.username, createdAt: s.createdAt,
    donationCount: s._count.donations, earnedFromThem: map[s.id] ?? 0,
  })))
})

router.get('/earnings', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  const earnings = await prisma.referralEarning.findMany({
    where: { referralPartnerId: partner.id },
    include: { streamer: { select: { channelName: true, username: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(earnings)
})

router.get('/settlements', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await getPartner(req.user!.userId)
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  const settlements = await prisma.referralSettlement.findMany({ where: { referralPartnerId: partner.id }, orderBy: { initiatedAt: 'desc' } })
  res.json(settlements)
})

router.post('/settlements', async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await prisma.referralPartner.findUnique({ where: { userId: req.user!.userId }, include: { bankDetails: true } })
  if (!partner) { res.status(404).json({ error: 'Not found' }); return }
  if (!partner.isVerified) { res.status(403).json({ error: 'Your account must be verified before requesting a payout' }); return }
  if (!partner.bankDetails?.accountNumber) { res.status(400).json({ error: 'Add your bank details first' }); return }

  const unsettled = await prisma.referralEarning.findMany({ where: { referralPartnerId: partner.id, settled: false } })
  const total = unsettled.reduce((s, e) => s + Number(e.amount), 0)
  if (total < MIN_PAYOUT) { res.status(400).json({ error: `Minimum payout is ₹${MIN_PAYOUT}` }); return }

  const settlement = await prisma.referralSettlement.create({ data: { referralPartnerId: partner.id, amount: total, status: 'INITIATED' } })
  await prisma.referralEarning.updateMany({ where: { id: { in: unsettled.map(e => e.id) } }, data: { settled: true, settlementId: settlement.id } })
  res.status(201).json(settlement)
})

export default router
