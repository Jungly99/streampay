import { Router, Request, Response } from 'express'
import Razorpay from 'razorpay'
import { env } from '../config/env'

const router = Router()

router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  const { amount } = req.body as { amount: number }
  if (!amount || amount < 1) { res.status(400).json({ error: 'Minimum amount is ₹1' }); return }
  if (amount > 100000) { res.status(400).json({ error: 'Maximum amount is ₹1,00,000' }); return }

  const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  const order = await rzp.orders.create({
    amount: Math.round(amount) * 100,
    currency: 'INR',
    receipt: `support_${Date.now()}`,
  })
  res.json({ orderId: order.id, amount: Math.round(amount) * 100, currency: 'INR' })
})

export default router
