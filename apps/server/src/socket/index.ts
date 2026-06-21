import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { prisma } from '../db/prisma'
import { env } from '../config/env'

let io: SocketServer

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, cb) => {
        const allowed = [
          env.FRONTEND_URL,
          'http://localhost:3000',
        ]
        // Allow Vercel preview deployments (*.vercel.app) and no-origin (OBS)
        if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
          cb(null, true)
        } else {
          cb(null, true) // permissive for overlay in OBS (no CORS origin)
        }
      },
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id} origin=${socket.handshake.headers.origin}`)
    socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`))

    socket.on('join-overlay', async ({ token }: { token: string }) => {
      console.log(`[socket] join-overlay token=${String(token).slice(0, 8)}... sid=${socket.id}`)
      if (!token) return

      const overlay = await prisma.streamerProfile.findUnique({
        where: { overlayToken: token },
        include: { alertSettings: true },
      })

      if (!overlay) {
        console.log(`[socket] invalid overlay token: ${String(token).slice(0, 8)}...`)
        socket.emit('overlay-error', { message: 'Invalid overlay token' })
        return
      }

      const room = `overlay:${token}`
      socket.join(room)
      console.log(`[socket] joined room overlay:${String(token).slice(0, 8)}...`)

      const defaultSettings = {
        template: 'superchat', bgColor: '#1a1a2e', bgOpacity: 90,
        textColor: '#ffffff', fontSize: 24, fontStyle: 'Arial',
        textBold: true, textItalic: false, textUnderline: false,
        animationStyle: 'slideDown', enableBorder: false,
        ttsEnabled: true, ttsVolume: 80, ttsVoice: 'en-IN',
        voiceMessagesEnabled: false, alertDuration: 8,
      }

      socket.emit('overlay-joined', {
        streamerId: overlay.id,
        settings: overlay.alertSettings ?? defaultSettings,
      })
    })
  })

  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export function emitToDonationOverlay(
  overlayToken: string,
  event: string,
  data: unknown
): void {
  getIO().to(`overlay:${overlayToken}`).emit(event, data)
}
