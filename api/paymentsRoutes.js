import { Router } from 'express'
import * as repository from './paymentsRepository.js'
import { getRazorpayConfig, razorpayGateway } from './razorpayClient.js'
import { createPaymentService } from './paymentsService.js'
import { requireOwnedOrder } from './orderOwnership.js'

export function createPaymentsRouter(service, authorize = requireOwnedOrder) {
  const router = Router()
  for (const [path, action] of [['/create-order', 'createOrder'], ['/verify-payment', 'verifyPayment'], ['/payment-status', 'paymentStatus']]) {
    router.post(path, async (req, res) => {
      res.set('Cache-Control', 'no-store')
      try {
        await authorize(req.body?.orderId, req.customerSessionHash)
        res.json(await service[action](req.body ?? {}))
      } catch (error) {
        res.status(error.statusCode ?? 500).json({
          error: error.statusCode ? error.message : 'Payment could not be processed. Please retry.',
        })
      }
    })
  }
  router.post('/payments/test-success', (_req, res) => {
    res.status(410).json({ error: 'Simulated payments are disabled. Please use Razorpay Checkout.' })
  })
  return router
}

export const paymentService = createPaymentService({
  repository, gateway: razorpayGateway, getConfig: getRazorpayConfig,
})
export const paymentsRouter = createPaymentsRouter(paymentService)
