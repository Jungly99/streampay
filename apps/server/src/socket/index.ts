import { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { prisma } from '../db/prisma'
import { env } from '../config/env'

let io: SocketServer

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    maxHttpBufferSize: 5e6, // 5 MB — needed for custom audio data URLs (~680 KB base64)
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
    socket.on('join-overlay', async ({ token }: { token: string }) => {
      if (!token) return

      const overlay = await prisma.streamerProfile.findUnique({
        where: { overlayToken: token },
        include: { alertSettings: true },
      })

      if (!overlay) {
        socket.emit('overlay-error', { message: 'Invalid overlay token' })
        return
      }

      const room = `overlay:${token}`
      socket.join(room)

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

    // Dashboard pushes leaderboard appearance settings live to the overlay
    socket.on('push-lb-settings', ({ token, settings }: { token: string; settings: unknown }) => {
      if (!token) return
      socket.to(`overlay:${token}`).emit('lb-settings-updated', settings)
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
