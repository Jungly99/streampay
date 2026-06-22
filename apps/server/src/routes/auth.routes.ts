import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
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

const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL,
)

// Redirect to Google — accountType and mode (login|signup) carried in base64url state
router.get('/google', (req: Request, res: Response): void => {
  const accountType = (req.query.accountType as string) || 'streamer'
  const mode        = (req.query.mode as string)        || 'login'

  const state = Buffer.from(JSON.stringify({ accountType, mode })).toString('base64url')

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile', 'openid'],
    state,
    prompt: 'select_account',
  })

  res.redirect(url)
})

// Google redirects back here with ?code=...&state=...
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>

  if (error) {
    res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`)
    return
  }

  let accountType = 'streamer'
  let mode = 'login'
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    accountType = decoded.accountType || 'streamer'
    mode        = decoded.mode        || 'login'
  } catch { /* ignore malformed state */ }

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Verify id_token to get profile
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.GOOGLE_CLIENT_ID,
  })
  const payload = ticket.getPayload()!
  const googleId  = payload.sub
  const email     = payload.email!
  const name      = payload.name ?? email.split('@')[0]
  const avatarUrl = payload.picture ?? null

  // Find existing user by googleId or email
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  })

  if (!user) {
    if (mode === 'login') {
      res.redirect(`${env.FRONTEND_URL}/login?error=no_account`)
      return
    }
    // Create new account
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        displayName: name,
        avatarUrl,
        accountType: accountType as 'streamer' | 'viewer',
        ...(accountType === 'streamer'
          ? {
              streamerProfile: {
                create: {
                  channelName: name,
                  overlayToken: generateOverlayToken(),
                  alertSettings: { create: {} },
                  bankDetails: { create: {} },
                },
              },
            }
          : { viewerProfile: { create: { displayName: name } } }),
      },
    })
  } else if (!user.googleId) {
    // Link Google to existing account on first Google sign-in
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId, avatarUrl: user.avatarUrl ?? avatarUrl },
    })
  }

  const token = signToken({ userId: user.id, accountType: user.accountType })
  const next = user.accountType === 'streamer' ? '/dashboard' : '/fan'
  res.redirect(`${env.FRONTEND_URL}/api/auth/callback?token=${token}&next=${next}`)
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('eztips_token', { path: '/', secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' })
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
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})

export default router
