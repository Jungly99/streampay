import { Router, Request, Response } from 'express'
import Razorpay from 'razorpay'
import { env } from '../config/env'
import { prisma } from '../db/prisma'
import { randomUUID } from 'crypto'
import { requireStreamer, AuthRequest } from '../middleware/auth'

const router = Router()

// ── SUPPORT TICKETS (auth-protected) ─────────────────────────────────────────

// Create a new ticket
router.post('/tickets', requireStreamer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, body } = req.body as { subject: string; body: string }
    if (!subject?.trim() || !body?.trim()) { res.status(400).json({ error: 'Subject and message are required' }); return }
    const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return }

    const ticket = await prisma.supportTicket.create({
      data: {
        id: randomUUID(),
        streamerId: profile.id,
        subject: subject.trim().slice(0, 200),
        messages: { create: { id: randomUUID(), body: body.trim(), fromAdmin: false } },
      },
      include: { messages: true },
    })

    // Fire Discord webhook for new ticket (fire-and-forget)
    prisma.platformConfig.findUnique({ where: { key: 'tickets_discord_webhook' } }).then(cfg => {
      if (!cfg?.value) return
      fetch(cfg.value, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎫 New Support Ticket',
            description: `**Subject:** ${ticket.subject}\n**From:** ${profile.channelName ?? profile.username ?? 'Unknown'}\n**Message:** ${body.trim().slice(0, 300)}`,
            color: 0x7c3aed,
            fields: [
              { name: 'Streamer', value: profile.channelName ?? profile.username ?? profile.id, inline: true },
              { name: 'Ticket ID', value: ticket.id.slice(0, 8), inline: true },
            ],
            footer: { text: 'EzTips Support · eztips.live' },
            timestamp: new Date().toISOString(),
          }],
        }),
      }).catch(() => {})
    }).catch(() => {})

    res.json(ticket)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// List my tickets
router.get('/tickets', requireStreamer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
    if (!profile) { res.status(404).json({ error: 'Not found' }); return }
    const tickets = await prisma.supportTicket.findMany({
      where: { streamerId: profile.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(tickets)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// Reply to a ticket
router.post('/tickets/:id/messages', requireStreamer, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { body } = req.body as { body: string }
    if (!body?.trim()) { res.status(400).json({ error: 'Message body is required' }); return }
    const profile = await prisma.streamerProfile.findUnique({ where: { userId: req.user!.userId } })
    if (!profile) { res.status(404).json({ error: 'Not found' }); return }
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, streamerId: profile.id } })
    if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return }
    if (ticket.status === 'CLOSED') { res.status(400).json({ error: 'Ticket is closed' }); return }

    const msg = await prisma.ticketMessage.create({
      data: { id: randomUUID(), ticketId: ticket.id, body: body.trim(), fromAdmin: false },
    })
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } })
    res.json(msg)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, name, message } = req.body as { amount: number; name?: string; message?: string }
    if (!amount || amount < 1) { res.status(400).json({ error: 'Minimum amount is ₹1' }); return }
    if (amount > 100000) { res.status(400).json({ error: 'Maximum amount is ₹1,00,000' }); return }

    const rzp = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    const order = await rzp.orders.create({
      amount: Math.round(amount) * 100,
      currency: 'INR',
      receipt: `support_${Date.now()}`,
    })

    // Store in DB — fire and forget so a DB hiccup doesn't block the payment
    prisma.supportPayment.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        amount: Math.round(amount),
        name: name || null,
        message: message || null,
        status: 'PENDING',
      },
    }).catch(e => console.error('support payment save failed:', e))

    res.json({ orderId: order.id, amount: Math.round(amount) * 100, currency: 'INR' })
  } catch (e: any) {
    console.error('support create-order error:', e)
    res.status(500).json({ error: e?.message ?? 'Failed to create order' })
  }
})

// Called by client after successful Razorpay payment
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, paymentId } = req.body as { orderId: string; paymentId: string }
    if (!orderId || !paymentId) { res.status(400).json({ error: 'Missing orderId or paymentId' }); return }

    await prisma.supportPayment.updateMany({
      where: { orderId },
      data: { status: 'SUCCESS', paymentId, paidAt: new Date() },
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Verify failed' })
  }
})

export default router
