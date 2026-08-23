import { Router, Request, Response } from 'express'
import { prisma } from '../db/prisma'

const router = Router()

router.post('/visit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { page } = req.body
    if (!['website', 'dashboard'].includes(page)) { res.json({ ok: true }); return }

    const forwarded = req.headers['x-forwarded-for'] as string | undefined
    const ip = (forwarded?.split(',')[0]?.trim()) || req.socket.remoteAddress || 'unknown'
    const date = new Date().toISOString().slice(0, 10)

    await prisma.pageVisit.upsert({
      where: { ip_page_date: { ip, page, date } },
      update: {},
      create: { ip, page, date },
    })
    res.json({ ok: true })
  } catch {
    res.json({ ok: true })
  }
})

export default router
