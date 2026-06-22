import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../db/prisma'
import { signAdminToken, verifyAdminToken, AdminPermissions } from '../utils/jwt'
import { env } from '../config/env'

const router = Router()

const IS_PROD = env.NODE_ENV === 'production'
const SUPER_ADMIN_EMAIL = 'abhinavs199.as@gmail.com'

const FULL_PERMISSIONS: AdminPermissions = {
  overview: true, streamers: true, users: true, donations: true, settlements: true,
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
  ...(IS_PROD && { domain: '.eztips.live' }),
}

const adminOAuth = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_ADMIN_CALLBACK_URL,
)

// GET /api/admin/auth/google
router.get('/google', (_req: Request, res: Response) => {
  const url = adminOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: ['email', 'profile'],
    prompt: 'select_account',
  })
  res.redirect(url)
})

// GET /api/admin/auth/google/callback
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.query.code as string
    if (!code) { res.redirect(`${env.FRONTEND_URL}/admin/login?error=no_code`); return }

    const { tokens } = await adminOAuth.getToken(code)
    adminOAuth.setCredentials(tokens)

    const ticket = await adminOAuth.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    })
    const p = ticket.getPayload()!
    const email = p.email ?? ''
    const googleId = p.sub
    const name = p.name ?? undefined
    const avatar = p.picture ?? undefined

    if (!email) { res.redirect(`${env.FRONTEND_URL}/admin/login?error=no_email`); return }

    if (email === SUPER_ADMIN_EMAIL) {
      const adminUser = await prisma.adminUser.upsert({
        where: { email },
        update: { googleId, name, avatar, isSuperAdmin: true },
        create: { email, googleId, name, avatar, isSuperAdmin: true },
      })
      const token = signAdminToken({
        adminId: adminUser.id, email, name, avatar, isSuperAdmin: true, permissions: FULL_PERMISSIONS,
      })
      res.cookie('eztips_admin_token', token, COOKIE_OPTIONS)
      res.redirect(`${env.FRONTEND_URL}/admin`)
      return
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { email }, include: { role: true } })
    if (!adminUser) { res.redirect(`${env.FRONTEND_URL}/admin/login?error=unauthorized`); return }

    if (!adminUser.googleId) {
      await prisma.adminUser.update({ where: { id: adminUser.id }, data: { googleId, name, avatar } })
    }

    const perms = (adminUser.role?.permissions ?? {}) as AdminPermissions
    const token = signAdminToken({
      adminId: adminUser.id, email, name, avatar, isSuperAdmin: false, permissions: perms,
    })
    res.cookie('eztips_admin_token', token, COOKIE_OPTIONS)
    res.redirect(`${env.FRONTEND_URL}/admin`)
  } catch (err) {
    console.error('Admin OAuth error:', err)
    res.redirect(`${env.FRONTEND_URL}/admin/login?error=oauth_failed`)
  }
})

// GET /api/admin/auth/me
router.get('/me', (req: Request, res: Response): void => {
  const token = req.cookies?.eztips_admin_token
  if (!token) { res.status(401).json({ error: 'Not authenticated' }); return }
  try {
    const admin = verifyAdminToken(token)
    res.json({ admin })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// POST /api/admin/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('eztips_admin_token', {
    path: '/',
    ...(IS_PROD && { domain: '.eztips.live' }),
  })
  res.json({ ok: true })
})

export default router
