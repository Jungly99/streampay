import { Router, Response } from 'express'
import { prisma } from '../db/prisma'
import { requireStreamer, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireStreamer)

router.get('/fee-breakdown', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const pending = await prisma.donation.aggregate({
    where: { streamerId: profile.id, status: 'SUCCESS', settled: false },
    _sum: { amount: true },
  })
  const grossAmount = pending._sum.amount ?? 0
  const feePct = 5
  const feeAmount = (grossAmount * feePct) / 100
  const netAmount = grossAmount - feeAmount

  res.json({ grossAmount, feePct, feeAmount, netAmount, canSettle: grossAmount > 0 })
})

router.post('/initiate', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { bankDetails: true },
  })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const unsettled = await prisma.donation.findMany({
    where: { streamerId: profile.id, status: 'SUCCESS', settled: false },
  })
  if (unsettled.length === 0) {
    res.status(400).json({ error: 'No pending balance to settle' })
    return
  }

  const grossAmount = unsettled.reduce((s, d) => s + d.amount, 0)
  const feePct = 5
  const feeAmount = (grossAmount * feePct) / 100
  const netAmount = grossAmount - feeAmount

  const settlement = await prisma.settlement.create({
    data: {
      streamerId: profile.id,
      grossAmount,
      feePct,
      feeAmount,
      netAmount,
      status: 'INITIATED',
    },
  })

  await prisma.donation.updateMany({
    where: { id: { in: unsettled.map(d => d.id) } },
    data: { settled: true, settlementId: settlement.id },
  })

  res.status(201).json(settlement)
})

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const { startDate, endDate, search } = req.query as Record<string, string>

  const donations = await prisma.donation.findMany({
    where: {
      streamerId: profile.id,
      status: 'SUCCESS',
      ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
      ...(search ? { donorName: { contains: search, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayTotal = donations.filter(d => d.paidAt && d.paidAt >= today).reduce((s, d) => s + d.amount, 0)
  const filteredGross = donations.reduce((s, d) => s + d.amount, 0)
  const filteredNet = donations.reduce((s, d) => s + Number(d.netAmount ?? 0), 0)
  const totalTx = donations.length

  const allSettlements = await prisma.settlement.findMany({
    where: { streamerId: profile.id },
    orderBy: { initiatedAt: 'desc' },
  })
  const totalSettledGross = allSettlements.filter(s => s.status === 'SUCCESS').reduce((acc: number, x) => acc + x.grossAmount, 0)
  const totalNetReceived = allSettlements.filter(s => s.status === 'SUCCESS').reduce((acc: number, x) => acc + Number(x.netAmount), 0)
  const lastSettled = allSettlements.find(s => s.status === 'SUCCESS')?.netAmount ?? 0

  res.json({
    donations,
    stats: { todayTotal, filteredGross, filteredNet, totalTx, totalSettledGross, totalNetReceived, lastSettled },
    feePct: 5,
  })
})

router.get('/lifetime', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

  const settlements = await prisma.settlement.findMany({
    where: { streamerId: profile.id, status: 'SUCCESS' },
  })
  const all = await prisma.settlement.findMany({ where: { streamerId: profile.id } })

  const totalSettledGross = settlements.reduce((acc: number, x) => acc + x.grossAmount, 0)
  const totalFees = settlements.reduce((acc: number, x) => acc + Number(x.feeAmount), 0)
  const totalNetReceived = settlements.reduce((acc: number, x) => acc + Number(x.netAmount), 0)

  res.json({
    totalSettledGross,
    totalFees,
    totalNetReceived,
    numberOfSettlements: settlements.length,
    history: all,
  })
})

export default router
