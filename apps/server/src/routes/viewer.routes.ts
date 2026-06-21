import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { requireViewer, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(requireViewer)

router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  const [totalDonated, totalDonations, streamersSupported, recentDonation] = await Promise.all([
    prisma.donation.aggregate({
      where: { viewerId: req.user!.userId, status: 'SUCCESS' },
      _sum: { amount: true },
    }),
    prisma.donation.count({ where: { viewerId: req.user!.userId, status: 'SUCCESS' } }),
    prisma.donation.groupBy({
      by: ['streamerId'],
      where: { viewerId: req.user!.userId, status: 'SUCCESS' },
    }),
    prisma.donation.findFirst({
      where: { viewerId: req.user!.userId, status: 'SUCCESS' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true, amount: true, streamer: { select: { channelName: true } } },
    }),
  ])

  res.json({
    totalDonated: totalDonated._sum.amount ?? 0,
    totalDonations,
    streamersSupported: streamersSupported.length,
    recentDonation,
  })
})

router.get('/donations', async (req: AuthRequest, res: Response): Promise<void> => {
  const donations = await prisma.donation.findMany({
    where: { viewerId: req.user!.userId, status: 'SUCCESS' },
    include: { streamer: { select: { channelName: true, avatarUrl: true, username: true } } },
    orderBy: { paidAt: 'desc' },
  })
  res.json(donations)
})

router.get('/following', async (req: AuthRequest, res: Response): Promise<void> => {
  const follows = await prisma.follow.findMany({
    where: { viewerId: req.user!.userId },
    include: { streamer: { select: { channelName: true, avatarUrl: true, username: true, isVerified: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(follows)
})

router.post('/follow/:username', async (req: AuthRequest, res: Response): Promise<void> => {
  const streamer = await prisma.streamerProfile.findUnique({ where: { username: req.params.username } })
  if (!streamer) { res.status(404).json({ error: 'Streamer not found' }); return }

  const follow = await prisma.follow.upsert({
    where: { viewerId_streamerId: { viewerId: req.user!.userId, streamerId: streamer.id } },
    create: { viewerId: req.user!.userId, streamerId: streamer.id },
    update: {},
  })
  res.json(follow)
})

router.delete('/follow/:username', async (req: AuthRequest, res: Response): Promise<void> => {
  const streamer = await prisma.streamerProfile.findUnique({ where: { username: req.params.username } })
  if (!streamer) { res.status(404).json({ error: 'Streamer not found' }); return }

  await prisma.follow.deleteMany({
    where: { viewerId: req.user!.userId, streamerId: streamer.id },
  })
  res.json({ ok: true })
})

router.get('/find-streamer', async (req: AuthRequest, res: Response): Promise<void> => {
  const { q = '' } = req.query as { q: string }
  const streamers = await prisma.streamerProfile.findMany({
    where: {
      isActive: true,
      username: { not: null },
      ...(q ? { OR: [
        { channelName: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ]} : {}),
    },
    select: { channelName: true, avatarUrl: true, username: true, isVerified: true, bio: true },
    take: 20,
  })
  res.json(streamers)
})

router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.viewerProfile.findUnique({
    where: { userId: req.user!.userId },
    include: { user: { select: { email: true } } },
  })
  res.json(profile)
})

router.patch('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const schema = z.object({ displayName: z.string().min(1).max(50).optional(), avatarUrl: z.string().url().optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

  const profile = await prisma.viewerProfile.update({
    where: { userId: req.user!.userId },
    data: parsed.data,
  })
  res.json(profile)
})

export default router
