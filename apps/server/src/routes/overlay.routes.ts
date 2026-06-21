import { Router, Request, Response } from 'express'
import { prisma } from '../db/prisma'

const router = Router()

router.get('/validate/:token', async (req: Request, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { overlayToken: req.params.token },
    include: { alertSettings: true, goals: { where: { isActive: true }, take: 1 } },
  })
  if (!profile) {
    res.status(404).json({ error: 'Invalid overlay token' })
    return
  }
  res.json({
    streamerId: profile.id,
    channelName: profile.channelName,
    settings: profile.alertSettings,
    activeGoal: profile.goals[0] ?? null,
  })
})

export default router
