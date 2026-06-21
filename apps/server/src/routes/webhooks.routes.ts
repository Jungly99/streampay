import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../db/prisma'
import { emitToDonationOverlay } from '../socket'
import { env } from '../config/env'

const router = Router()

router.post('/razorpay', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-razorpay-signature'] as string
  const rawBody = (req as any).rawBody as string

  // Verify webhook signature
  if (env.RAZORPAY_WEBHOOK_SECRET && signature) {
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')

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

  const event: string = payload?.event ?? ''
  const payment = payload?.payload?.payment?.entity

  if (!payment?.order_id) {
    res.status(200).json({ ok: true })
    return
  }

  const razorpayOrderId: string = payment.order_id
  const razorpayPaymentId: string = payment.id

  if (event === 'payment.captured') {
    const donation = await prisma.donation.update({
      where: { cfOrderId: razorpayOrderId },
      data: { status: 'SUCCESS', cfPaymentId: razorpayPaymentId, paidAt: new Date() },
      include: { streamer: { include: { alertSettings: true, goals: { where: { isActive: true } } } } },
    })

    const activeGoal = donation.streamer.goals[0]
    if (activeGoal) {
      await prisma.overlayGoal.update({
        where: { id: activeGoal.id },
        data: { currentAmount: { increment: donation.amount } },
      })
    }

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

    // Discord notification
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
  } else if (event === 'payment.failed') {
    await prisma.donation.update({
      where: { cfOrderId: razorpayOrderId },
      data: { status: 'FAILED' },
    }).catch(() => {})
  }

  res.status(200).json({ ok: true })
})

export default router
