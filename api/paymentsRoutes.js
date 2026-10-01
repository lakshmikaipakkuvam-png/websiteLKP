import { Router } from 'express'
import { createTestPayment } from './paymentsRepository.js'
import { validateTestPayment } from './paymentValidation.js'

export const paymentsRouter = Router()

paymentsRouter.post('/payments/test-success', async (req, res, next) => {
  try {
    validateTestPayment(req.body)

    const payment = await createTestPayment(req.body.orderId)
    res.status(201).json({ payment })
  } catch (error) {
    next(error)
  }
})
