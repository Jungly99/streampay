import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface JwtPayload {
  userId: string
  accountType: 'streamer' | 'viewer'
}

export interface AdminPermissions {
  overview: boolean
  streamers: boolean
  users: boolean
  donations: boolean
  settlements: boolean
}

export interface AdminJwtPayload {
  adminId: string
  email: string
  name?: string
  avatar?: string
  isSuperAdmin: boolean
  permissions: AdminPermissions
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as AdminJwtPayload
}
