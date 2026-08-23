import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/prisma'
import { AdminJwtPayload } from '../utils/jwt'

interface AdminRequest extends Request {
  admin?: AdminJwtPayload
}

export function auditLog(action: string, entity?: string, getEntityId?: (req: AdminRequest) => string | undefined) {
  return async (req: AdminRequest, _res: Response, next: NextFunction) => {
    next()
    // fire-and-forget after request is handed off
    try {
      const admin = req.admin
      if (!admin) return
      await prisma.adminLog.create({
        data: {
          id: randomUUID(),
          adminId: admin.adminId,
          adminEmail: admin.email,
          adminName: admin.name ?? null,
          action,
          entity: entity ?? null,
          entityId: getEntityId ? (getEntityId(req) ?? null) : null,
          detail: JSON.stringify(req.body ?? null).slice(0, 500),
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null,
        },
      })
    } catch {}
  }
}
