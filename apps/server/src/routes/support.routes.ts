import { Router, Request, Response } from 'express'
import Razorpay from 'razorpay'
import { env } from '../config/env'
import { prisma } from '../db/prisma'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  const { amount, name, message } = req.body as { amount: number; name?: string; message?: string }
  if (!amount || amount < 1) { res.status(400).json({ error: 'Minimum amount is ₹1' }); return }
  if (amount > 100000) { res.status(400).json({ error: 'Maximum amount is ₹1,00,000' }); return }

  const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  const order = await rzp.orders.create({
    amount: Math.round(amount) * 100,
    currency: 'INR',
    receipt: `support_${Date.now()}`,
  })

  await prisma.supportPayment.create({
    data: {
      id: uuidv4(),
      orderId: order.id,
      amount: Math.round(amount),
      name: name || null,
      message: message || null,
      status: 'PENDING',
    },
  })

  res.json({ orderId: order.id, amount: Math.round(amount) * 100, currency: 'INR' })
})

// Called by client after successful Razorpay payment
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { orderId, paymentId } = req.body as { orderId: string; paymentId: string }
  if (!orderId || !paymentId) { res.status(400).json({ error: 'Missing orderId or paymentId' }); return }

  await prisma.supportPayment.updateMany({
    where: { orderId },
    data: { status: 'SUCCESS', paymentId, paidAt: new Date() },
  })
  res.json({ success: true })
})

export default router
