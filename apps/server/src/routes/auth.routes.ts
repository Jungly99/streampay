import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { signToken } from '../utils/jwt'
import { generateOverlayToken } from '../utils/generateToken'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { env } from '../config/env'

const router = Router()

const IS_PROD = env.NODE_ENV === 'production'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(50),
  accountType: z.enum(['streamer', 'viewer']),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  const { email, password, displayName, accountType } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      accountType,
      ...(accountType === 'streamer'
        ? {
            streamerProfile: {
              create: {
                channelName: displayName,
                overlayToken: generateOverlayToken(),
                alertSettings: { create: {} },
                bankDetails: { create: {} },
              },
            },
          }
        : {
            viewerProfile: { create: { displayName } },
          }),
    },
  })

  const token = signToken({ userId: user.id, accountType })
  res.cookie('streampay_token', token, COOKIE_OPTIONS)
  res.status(201).json({ id: user.id, email: user.email, accountType, displayName })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials' })
    return
  }
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = signToken({ userId: user.id, accountType: user.accountType })
  res.cookie('streampay_token', token, COOKIE_OPTIONS)
  res.json({ id: user.id, email: user.email, accountType: user.accountType, displayName: user.displayName })
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('streampay_token', { path: '/', secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      streamerProfile: { select: { username: true, channelName: true, overlayToken: true } },
      viewerProfile: true,
    },
  })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json(user)
})

export default router
