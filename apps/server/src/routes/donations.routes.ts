import { Router, Request, Response } from 'express'
import { z } from 'zod'
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
  if (!profile || !profile.isActive) {
    res.status(404).json({ error: 'Streamer not found' })
    return
  }
  res.json({
    id: profile.id,
    username: profile.username,
    channelName: profile.channelName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    channelLink: profile.channelLink,
    isVerified: profile.isVerified,
    minDonationAmount: profile.minDonationAmount,
    voiceTiers: profile.voiceTiers,
    activeGoal: profile.goals[0] ?? null,
    quickAmounts: [25, 50, 100, 250, 500, 1000],
    socialTwitter: profile.socialTwitter,
    socialInstagram: profile.socialInstagram,
    socialYoutube: profile.socialYoutube,
    socialTwitch: profile.socialTwitch,
    socialDiscord: profile.socialDiscord,
    socialKick: profile.socialKick,
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
    message: z.string().max(10).optional(),
    voiceMessageUrl: z.string().url().optional(),
    amount: z.number().int().min(11).max(10000),
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

  const feePct = 5
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

  // Create Cashfree order
  let paymentSessionId: string | null = null
  if (env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY) {
    try {
      const cfRes = await fetch(
        env.CASHFREE_ENV === 'production'
          ? 'https://api.cashfree.com/pg/orders'
          : 'https://sandbox.cashfree.com/pg/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': env.CASHFREE_APP_ID,
            'x-client-secret': env.CASHFREE_SECRET_KEY,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify({
            order_id: cfOrderId,
            order_amount: amount,
            order_currency: 'INR',
            customer_details: {
              customer_id: `anon_${Date.now()}`,
              customer_name: donorName,
              customer_phone: '9999999999',
              customer_email: 'donor@streampay.in',
            },
            order_meta: {
              return_url: `${env.FRONTEND_URL}/payment/success?order_id=${cfOrderId}`,
              notify_url: `${env.FRONTEND_URL?.replace('3000', '4000') || 'http://localhost:4000'}/api/webhooks/cashfree`,
            },
          }),
        }
      )
      const cfData = await cfRes.json() as { payment_session_id?: string; message?: string; code?: string }
      if (cfData.payment_session_id) {
        paymentSessionId = cfData.payment_session_id
      } else {
        console.error('Cashfree order failed:', cfData.code, cfData.message)
        res.status(502).json({ error: `Payment gateway error: ${cfData.message ?? cfData.code ?? 'unknown'}` })
        return
      }
    } catch (e) {
      console.error('Cashfree order creation failed:', e)
      res.status(502).json({ error: 'Payment gateway unavailable. Please try again.' })
      return
    }
  }

  res.status(201).json({ donationId: donation.id, orderId: cfOrderId, paymentSessionId })
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
