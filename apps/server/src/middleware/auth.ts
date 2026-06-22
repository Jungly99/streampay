import { Request, Response, NextFunction } from 'express'
import { verifyToken, verifyAdminToken, JwtPayload, AdminJwtPayload, AdminPermissions } from '../utils/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.eztips_token
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireStreamer(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.accountType !== 'streamer') {
      res.status(403).json({ error: 'Streamer account required' })
      return
    }
    next()
  })
}

export function requireViewer(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.accountType !== 'viewer') {
      res.status(403).json({ error: 'Viewer account required' })
      return
    }
    next()
  })
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.eztips_admin_token
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.admin = verifyAdminToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid admin token' })
  }
}

export function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.admin?.isSuperAdmin) {
    res.status(403).json({ error: 'Super admin only' })
    return
  }
  next()
}

export function requirePermission(perm: keyof AdminPermissions) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) { res.status(401).json({ error: 'Unauthorized' }); return }
    if (req.admin.isSuperAdmin || req.admin.permissions[perm]) return next()
    res.status(403).json({ error: `Requires ${perm} permission` })
  }
}
