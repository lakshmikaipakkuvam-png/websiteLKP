import { createHmac, timingSafeEqual } from 'node:crypto'
import express, { Router } from 'express'

export function createPaymentWebhook(service, env = process.env, log = (entry) => console.info(JSON.stringify(entry))) {
  const router = Router()
  router.use((_req, res, next) => {
    const started = Date.now()
    res.on('finish', () => {
      // Fixed labels only: never log the payload, signatures, IDs, secrets or customer data.
      log({ component: 'razorpay_webhook', status: res.statusCode,
        event: res.locals.webhookEvent ?? 'unverified',
        outcome: res.locals.webhookOutcome ?? 'request_rejected', durationMs: Date.now() - started })
    })
    next()
  })
  router.post('/', express.raw({ type: 'application/json', limit: '100kb' }), async (req, res) => {
    const respond = (status, outcome, body) => {
      res.locals.webhookOutcome = outcome
      return res.status(status).json(body)
    }
    const signature = req.get('X-Razorpay-Signature')
    const secrets = [env.RAZORPAY_WEBHOOK_SECRET, env.RAZORPAY_WEBHOOK_PREVIOUS_SECRET].filter(Boolean)
    if (!secrets.length || !env.RAZORPAY_ACCOUNT_ID) return respond(503, 'configuration_missing', { error: 'Webhook is not configured.' })
    if (!Buffer.isBuffer(req.body) || !/^[a-fA-F0-9]{64}$/.test(signature ?? '') || !secrets.some((secret) =>
      timingSafeEqual(createHmac('sha256', secret).update(req.body).digest(), Buffer.from(signature, 'hex')))) {
      return respond(400, 'signature_invalid', { error: 'Invalid webhook signature.' })
    }
    let event
    try { event = JSON.parse(req.body.toString('utf8')) } catch { return respond(400, 'event_invalid', { error: 'Invalid event.' }) }
    if (!event || typeof event !== 'object' || Array.isArray(event)) return respond(400, 'event_invalid', { error: 'Invalid event.' })
    if (event.account_id !== env.RAZORPAY_ACCOUNT_ID) return respond(400, 'account_mismatch', { error: 'Wrong webhook account.' })
    if (!['payment.captured', 'order.paid', 'refund.processed'].includes(event.event)) return respond(200, 'event_ignored', { ignored: true })
    res.locals.webhookEvent = event.event
    const paymentId = event.payload?.payment?.entity?.id ?? event.payload?.refund?.entity?.payment_id
    if (typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) return respond(400, 'payment_missing', { error: 'Missing payment.' })
    try {
      // Duplicate and out-of-order events settle idempotently under a database row lock.
      // Never trust event amounts or event timestamps as the current payment state.
      const result = await service.reconcilePayment(paymentId)
      respond(200, result?.ignored ? 'payment_ignored' : 'reconciled', { received: true })
    } catch { respond(503, 'reconciliation_retry', { error: 'Payment reconciliation must be retried.' }) }
  })
  return router
}
