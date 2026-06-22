import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import { initSocket } from './socket'
import { errorHandler } from './middleware/errorHandler'

import authRoutes from './routes/auth.routes'
import streamerRoutes from './routes/streamer.routes'
import donationRoutes from './routes/donations.routes'
import settlementRoutes from './routes/settlements.routes'
import overlayRoutes from './routes/overlay.routes'
import viewerRoutes from './routes/viewer.routes'
import webhookRoutes from './routes/webhooks.routes'
import adminRoutes from './routes/admin.routes'
import adminAuthRoutes from './routes/adminAuth.routes'

const app = express()
const httpServer = http.createServer(app)

initSocket(httpServer)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: [env.FRONTEND_URL, 'http://localhost:3000'], credentials: true }))
app.use(morgan('dev'))
app.use(cookieParser())

// Raw body capture for webhook signature verification
app.use('/api/webhooks', (req, _res, next) => {
  express.raw({ type: 'application/json' })(req, _res, (err) => {
    if (!err && Buffer.isBuffer(req.body)) {
      ;(req as any).rawBody = req.body.toString('utf8')
      req.body = JSON.parse((req as any).rawBody)
    }
    next(err)
  })
})

// JSON body parsing for all other routes
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/webhooks')) return next()
  express.json({ limit: '10mb' })(req, _res, next)
})
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/streamer', streamerRoutes)
app.use('/api/donations', donationRoutes)
app.use('/api/settlements', settlementRoutes)
app.use('/api/overlay', overlayRoutes)
app.use('/api/viewer', viewerRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin', adminRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use(errorHandler)

httpServer.listen(parseInt(env.PORT), () => {
  console.log(`eztips server running on port ${env.PORT}`)
})
