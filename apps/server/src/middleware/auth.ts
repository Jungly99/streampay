import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt'
import { env } from '../config/env'

export interface AuthRequest extends Request {
  user?: JwtPayload
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

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}
