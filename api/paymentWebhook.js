import { createHmac, timingSafeEqual } from 'node:crypto'
import express, { Router } from 'express'

export function createPaymentWebhook(service, env = process.env) {
  const router = Router()
  router.post('/', express.raw({ type: 'application/json', limit: '100kb' }), async (req, res) => {
    const signature = req.get('X-Razorpay-Signature')
    const secrets = [env.RAZORPAY_WEBHOOK_SECRET, env.RAZORPAY_WEBHOOK_PREVIOUS_SECRET].filter(Boolean)
    if (!secrets.length || !env.RAZORPAY_ACCOUNT_ID) return res.status(503).json({ error: 'Webhook is not configured.' })
    if (!Buffer.isBuffer(req.body) || !/^[a-fA-F0-9]{64}$/.test(signature ?? '') || !secrets.some((secret) =>
      timingSafeEqual(createHmac('sha256', secret).update(req.body).digest(), Buffer.from(signature, 'hex')))) {
      return res.status(400).json({ error: 'Invalid webhook signature.' })
    }
    let event
    try { event = JSON.parse(req.body.toString('utf8')) } catch { return res.status(400).json({ error: 'Invalid event.' }) }
    if (!event || typeof event !== 'object' || Array.isArray(event)) return res.status(400).json({ error: 'Invalid event.' })
    if (event.account_id !== env.RAZORPAY_ACCOUNT_ID) return res.status(400).json({ error: 'Wrong webhook account.' })
    if (!['payment.captured', 'order.paid', 'refund.processed'].includes(event.event)) return res.json({ ignored: true })
    const paymentId = event.payload?.payment?.entity?.id ?? event.payload?.refund?.entity?.payment_id
    if (typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) return res.status(400).json({ error: 'Missing payment.' })
    try {
      // Duplicate and out-of-order events settle idempotently under a database row lock.
      // Never trust event amounts or event timestamps as the current payment state.
      await service.reconcilePayment(paymentId)
      res.json({ received: true })
    } catch { res.status(503).json({ error: 'Payment reconciliation must be retried.' }) }
  })
  return router
}
