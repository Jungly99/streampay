import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../db/prisma'
import { signToken, signAdminToken, AdminPermissions } from '../utils/jwt'
import { generateOverlayToken } from '../utils/generateToken'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { env } from '../config/env'

const SUPER_ADMIN_EMAIL = 'abhinavs199.as@gmail.com'
const FULL_ADMIN_PERMS: AdminPermissions = { overview:true, streamers:true, users:true, donations:true, settlements:true, restore_accounts:true, tickets:true, support:true, referrals:true }

const router = Router()

const IS_PROD = env.NODE_ENV === 'production'
const COOKIE_DOMAIN = IS_PROD ? '.eztips.live' : undefined
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
  ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
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
  const refCode     = (req.query.refCode as string)     || undefined

  const state = Buffer.from(JSON.stringify({ accountType, mode, refCode })).toString('base64url')

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

  let flow = 'user'
  let accountType = 'streamer'
  let mode = 'login'
  let refCode: string | undefined
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    flow        = decoded.flow        || 'user'
    accountType = decoded.accountType || 'streamer'
    mode        = decoded.mode        || 'login'
    refCode     = decoded.refCode     || undefined
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

  // ── ADMIN FLOW ──────────────────────────────────────────────────────────
  if (flow === 'admin') {
    const ADMIN_COOKIE = {
      httpOnly: true, secure: IS_PROD,
      sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    }
    if (email === SUPER_ADMIN_EMAIL) {
      const adminUser = await prisma.adminUser.upsert({
        where: { email },
        update: { googleId, name, avatar: avatarUrl, isSuperAdmin: true },
        create: { email, googleId, name, avatar: avatarUrl, isSuperAdmin: true },
      })
      const token = signAdminToken({ adminId: adminUser.id, email, name, avatar: avatarUrl ?? undefined, isSuperAdmin: true, permissions: FULL_ADMIN_PERMS })
      res.cookie('eztips_admin_token', token, ADMIN_COOKIE)
      res.redirect(`${env.FRONTEND_URL}/admin`)
    } else {
      const adminUser = await prisma.adminUser.findUnique({ where: { email }, include: { role: true } })
      if (!adminUser) { res.redirect(`${env.FRONTEND_URL}/admin/login?error=unauthorized`); return }
      if (!adminUser.googleId) await prisma.adminUser.update({ where: { id: adminUser.id }, data: { googleId, name, avatar: avatarUrl } })
      const perms = (adminUser.role?.permissions ?? {}) as unknown as AdminPermissions
      const token = signAdminToken({ adminId: adminUser.id, email, name, avatar: avatarUrl ?? undefined, isSuperAdmin: false, permissions: perms })
      res.cookie('eztips_admin_token', token, ADMIN_COOKIE)
      res.redirect(`${env.FRONTEND_URL}/admin`)
    }
    return
  }

  // ── USER FLOW ────────────────────────────────────────────────────────────
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  })

  if (!user) {
    if (mode === 'login') {
      res.redirect(`${env.FRONTEND_URL}/login?error=no_account`)
      return
    }

    let referredById: string | undefined
    if (accountType === 'streamer' && refCode) {
      const partner = await prisma.referralPartner.findUnique({ where: { referralCode: refCode } })
      if (partner && partner.isVerified && partner.isActive) referredById = partner.id
    }

    user = await prisma.user.create({
      data: {
        email, googleId, displayName: name, avatarUrl,
        accountType: accountType as 'streamer' | 'viewer' | 'referral',
        ...(accountType === 'streamer'
          ? { streamerProfile: { create: { channelName: name, overlayToken: generateOverlayToken(), alertSettings: { create: {} }, bankDetails: { create: {} }, ...(referredById && { referredById }) } } }
          : accountType === 'referral'
          ? { referralPartner: { create: { displayName: name } } }
          : { viewerProfile: { create: { displayName: name } } }),
      },
    })
  } else if (!user.googleId) {
    await prisma.user.update({ where: { id: user.id }, data: { googleId, avatarUrl: user.avatarUrl ?? avatarUrl } })
  }

  const token = signToken({ userId: user.id, accountType: user.accountType })
  res.cookie('eztips_token', token, COOKIE_OPTIONS)
  const dest = user.accountType === 'streamer' ? '/dashboard' : user.accountType === 'referral' ? '/refer/dashboard' : '/fan'
  res.redirect(`${env.FRONTEND_URL}${dest}`)
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('eztips_token', { path: '/', secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      streamerProfile: { select: { username: true, channelName: true, avatarUrl: true, overlayToken: true, isVerified: true, isActive: true, isPremium: true, verificationRequestedAt: true } },
      viewerProfile: true,
    },
  })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})

// ── YOUTUBE CONNECT ──────────────────────────────────────────────────────────

const ytOauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.YOUTUBE_CONNECT_CALLBACK_URL,
)

// Returns the Google OAuth URL as JSON — frontend fetches this then redirects
router.get('/youtube/url', requireAuth, (req: AuthRequest, res: Response): void => {
  const state = Buffer.from(JSON.stringify({ flow: 'youtube', userId: req.user!.userId })).toString('base64url')
  const url = ytOauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube.force-ssl'],
    state,
  })
  res.json({ url })
})

router.get('/youtube/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>
  if (error) { res.redirect(`${env.FRONTEND_URL}/dashboard/clips?yt_error=${encodeURIComponent(error)}`); return }

  let userId = ''
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    if (decoded.flow !== 'youtube' || !decoded.userId) throw new Error('bad state')
    userId = decoded.userId
  } catch {
    res.redirect(`${env.FRONTEND_URL}/dashboard/clips?yt_error=invalid_state`)
    return
  }

  const { tokens } = await ytOauth2Client.getToken(code)
  if (!tokens.refresh_token) {
    res.redirect(`${env.FRONTEND_URL}/dashboard/clips?yt_error=no_refresh_token`)
    return
  }

  // Get channel title
  let channelTitle = ''
  try {
    ytOauth2Client.setCredentials(tokens)
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${env.YOUTUBE_API_KEY}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const d = await r.json()
    channelTitle = d.items?.[0]?.snippet?.title ?? ''
  } catch { /* non-fatal */ }

  const profile = await prisma.streamerProfile.findUnique({ where: { userId } })
  if (!profile) { res.redirect(`${env.FRONTEND_URL}/dashboard/clips?yt_error=no_profile`); return }

  await prisma.streamerProfile.update({
    where: { id: profile.id },
    data: { ytRefreshToken: tokens.refresh_token, ytChannelTitle: channelTitle } as any,
  })

  res.redirect(`${env.FRONTEND_URL}/dashboard/clips?yt=connected`)
})

router.delete('/youtube/disconnect', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
  if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }
  await prisma.streamerProfile.update({
    where: { id: profile.id },
    data: { ytRefreshToken: null, ytChannelTitle: null } as any,
  })
  res.json({ ok: true })
})

router.get('/youtube/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const profile = await prisma.streamerProfile.findUnique({
    where: { userId: req.user!.userId },
    select: { ytRefreshToken: true, ytChannelTitle: true },
  })
  res.json({
    connected: !!(profile as any)?.ytRefreshToken,
    channelTitle: (profile as any)?.ytChannelTitle ?? '',
  })
})

export default router
