import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { emitToDonationOverlay } from '../socket'
import { env } from '../config/env'

const router = Router()

// Must use raw body — do NOT use express.json() on this route
router.post(
  '/cashfree',
  (req, _res, next) => {
    // express.raw middleware applied per-route in index.ts
    next()
  },
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-webhook-signature'] as string
    const timestamp = req.headers['x-webhook-timestamp'] as string
    const rawBody = (req as any).rawBody as string

    if (env.CASHFREE_SECRET_KEY && signature && timestamp) {
      const expected = crypto
        .createHmac('sha256', env.CASHFREE_SECRET_KEY)
        .update(timestamp + rawBody)
        .digest('base64')

      if (signature !== expected) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }
    }

    let payload: any
    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body
    } catch {
      res.status(400).json({ error: 'Invalid JSON' })
      return
    }

    const type: string = payload?.type ?? ''
    const orderId: string = payload?.data?.order?.order_id ?? ''
    const cfPaymentId: string = payload?.data?.payment?.cf_payment_id ?? ''

    if (!orderId) {
      res.status(200).json({ ok: true })
      return
    }

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const donation = await prisma.donation.update({
        where: { cfOrderId: orderId },
        data: { status: 'SUCCESS', cfPaymentId, paidAt: new Date() },
        include: { streamer: { include: { alertSettings: true, goals: { where: { isActive: true } } } } },
      })

      // Update active goal
      const activeGoal = donation.streamer.goals[0]
      if (activeGoal) {
        await prisma.overlayGoal.update({
          where: { id: activeGoal.id },
          data: { currentAmount: { increment: donation.amount } },
        })
      }

      // Emit real-time alert to OBS overlay
      const overlayToken = donation.streamer.overlayToken
      if (overlayToken) {
        emitToDonationOverlay(overlayToken, 'new-donation', {
          donationId: donation.id,
          donorName: donation.donorName,
          message: donation.message,
          amount: donation.amount,
          voiceMessageUrl: donation.voiceMessageUrl,
          streamerUsername: donation.streamer.username,
        })

        if (activeGoal) {
          const updated = await prisma.overlayGoal.findUnique({ where: { id: activeGoal.id } })
          emitToDonationOverlay(overlayToken, 'goal-updated', {
            currentAmount: updated?.currentAmount ?? 0,
            targetAmount: activeGoal.targetAmount,
            title: activeGoal.title,
          })
        }

        await prisma.donation.update({ where: { id: donation.id }, data: { alertSent: true } })
      }

      // Discord webhook notification
      const discordUrl = donation.streamer.discordWebhookUrl
      if (discordUrl) {
        fetch(discordUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `💸 New Donation on StreamPay!`,
              description: `**${donation.donorName}** donated **₹${donation.amount}**${donation.message ? `\n"${donation.message}"` : ''}`,
              color: 0x8b5cf6,
              timestamp: new Date().toISOString(),
            }],
          }),
        }).catch(() => {})
      }
    } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      await prisma.donation.update({
        where: { cfOrderId: orderId },
        data: { status: 'FAILED' },
      })
    }

    res.status(200).json({ ok: true })
  }
)

export default router
