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
    _sum: { amount: true, feeAmount: true, netAmount: true },
  })
  const grossAmount = Number(pending._sum.amount ?? 0)
  const feeAmount   = Number(pending._sum.feeAmount ?? 0)
  const netAmount   = Number(pending._sum.netAmount ?? (grossAmount - feeAmount))
  // Weighted effective fee % across all pending donations
  const feePct = grossAmount > 0
    ? Math.round((feeAmount / grossAmount) * 10000) / 100
    : Number(profile.platformFeePct ?? 7)

  const MIN_SETTLEMENT = 100
  res.json({ grossAmount, feePct, feeAmount, netAmount, canSettle: grossAmount >= MIN_SETTLEMENT, minSettlement: MIN_SETTLEMENT })
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

  if (grossAmount < 100) {
    res.status(400).json({ error: 'Minimum settlement amount is ₹100' })
    return
  }

  // Use per-donation stored feeAmount (reflects the fee % at time of donation)
  const feeAmount = unsettled.reduce((s, d) => s + Number(d.feeAmount ?? 0), 0)
  const netAmount = grossAmount - feeAmount
  const feePct    = grossAmount > 0
    ? Math.round((feeAmount / grossAmount) * 10000) / 100
    : Number(profile.platformFeePct ?? 7)

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

  // Fire Discord webhook for settlement request (fire-and-forget)
  prisma.platformConfig.findUnique({ where: { key: 'settlement_discord_webhook' } }).then(cfg => {
    if (!cfg?.value) return
    fetch(cfg.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '💸 Settlement Request',
          description: `**${profile.channelName ?? profile.username ?? 'A streamer'}** has requested a payout.`,
          color: 0x10b981,
          fields: [
            { name: 'Gross Amount', value: `₹${grossAmount.toLocaleString('en-IN')}`, inline: true },
            { name: `Fee (${feePct}%)`, value: `₹${feeAmount.toLocaleString('en-IN')}`, inline: true },
            { name: 'Net Payout', value: `₹${netAmount.toLocaleString('en-IN')}`, inline: true },
            { name: 'Streamer', value: profile.username ?? profile.id, inline: true },
            { name: 'Settlement ID', value: settlement.id.slice(0, 8), inline: true },
          ],
          footer: { text: 'EzTips Settlements · eztips.live' },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {})
  }).catch(() => {})

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
    include: { settlement: { select: { status: true } } },
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
    feePct: Number(profile.platformFeePct ?? 7),
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
