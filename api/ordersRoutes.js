import { Router } from 'express'
import { createOrder, fetchOrderById, fetchOrders, fetchOrdersByCustomerPhone, updateOrderStatus, updateOrderTrackingId } from './ordersRepository.js'
import { validateCreateOrder, validateOrderStatus } from './orderValidation.js'

export const ordersRouter = Router()

ordersRouter.get('/orders', async (_req, res, next) => {
  try {
    const orders = await fetchOrders()
    res.json({ orders })
  } catch (error) {
    next(error)
  }
})

ordersRouter.get('/orders/customer', async (req, res, next) => {
  try {
    const phoneNumber = typeof req.query.phoneNumber === 'string' ? req.query.phoneNumber.trim() : ''

    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required.' })
      return
    }

    const orders = await fetchOrdersByCustomerPhone(phoneNumber)
    res.json({ orders })
  } catch (error) {
    next(error)
  }
})

ordersRouter.get('/customer-orders', async (req, res, next) => {
  try {
    const phoneNumber = typeof req.query.phoneNumber === 'string' ? req.query.phoneNumber.trim() : ''

    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number is required.' })
      return
    }

    const orders = await fetchOrdersByCustomerPhone(phoneNumber)
    res.json({ orders })
  } catch (error) {
    next(error)
  }
})

ordersRouter.post('/orders', async (req, res, next) => {
  try {
    validateCreateOrder(req.body)

    const order = await createOrder(req.body)
    res.status(201).json({ order })
  } catch (error) {
    next(error)
  }
})

ordersRouter.get('/orders/:id([0-9a-fA-F-]{36})', async (req, res, next) => {
  try {
    const order = await fetchOrderById(req.params.id)
    res.json({ order })
  } catch (error) {
    next(error)
  }
})

ordersRouter.patch('/orders/:id([0-9a-fA-F-]{36})/status', async (req, res, next) => {
  try {
    validateOrderStatus(req.body)

    const order = await updateOrderStatus(req.params.id, req.body.status)
    res.json({ order })
  } catch (error) {
    next(error)
  }
})

ordersRouter.patch('/orders/:id([0-9a-fA-F-]{36})/tracking', async (req, res, next) => {
  try {
    if (req.body.trackingId !== null && req.body.trackingId !== undefined && typeof req.body.trackingId !== 'string') {
      res.status(400).json({
        error: 'Validation failed',
        details: { trackingId: 'Tracking ID must be text.' },
      })
      return
    }

    const order = await updateOrderTrackingId(req.params.id, req.body.trackingId)
    res.json({ order })
  } catch (error) {
    next(error)
  }
})
