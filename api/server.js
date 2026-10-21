import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { createAdminAuth } from './adminAuth.js'
import { adminIdentity } from './adminIdentity.js'
import { customerSession } from './customerSession.js'
import { fileURLToPath } from 'node:url'
import { categoriesRouter } from './categoriesRoutes.js'
import { comboOffersRouter } from './comboOffersRoutes.js'
import { ordersRouter } from './ordersRoutes.js'
import { paymentsRouter, paymentService } from './paymentsRoutes.js'
import { createPaymentWebhook } from './paymentWebhook.js'
import { productImagesRouter } from './productImagesRoutes.js'
import { feedbackRouter } from './feedbackRoutes.js'
import { profileRouter } from './profileRoutes.js'
import { productsRouter } from './productsRoutes.js'
import { specialOffersRouter } from './specialOffersRoutes.js'

const app = express()
const port = process.env.PORT ?? 4000
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean)

app.disable('x-powered-by')
// Razorpay popup compatibility; a strict CSP needs browser validation before enforcement.
app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' } }))
app.use(cors({ origin: corsOrigin ?? [], credentials: true }))
// Webhook verification requires the exact raw bytes, before JSON parsing or browser-origin checks.
app.use('/api/webhooks/razorpay', createPaymentWebhook(paymentService))
app.use(express.json({ limit: '100kb' }))
const adminAuth = createAdminAuth({ identity: adminIdentity })
app.use('/api/auth/admin', adminAuth.router)
app.use('/api', adminAuth.protectApi)
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !corsOrigin?.includes(req.get('origin'))) {
    return res.status(403).json({ error: 'Request origin was not accepted.' })
  }
  next()
})
app.use('/api', customerSession)
const checkoutLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, validate: { xForwardedForHeader: false }, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please retry later.' } })
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  if (req.method === 'POST' && ['/orders', '/create-order', '/verify-payment', '/payment-status', '/feedback-reviews'].includes(req.path)) return checkoutLimit(req, res, next)
  next()
})
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.use('/api', categoriesRouter)
app.use('/api', comboOffersRouter)
app.use('/api', ordersRouter)
app.use('/api', paymentsRouter)
app.use('/api', productImagesRouter)
app.use('/api', feedbackRouter)
app.use('/api', profileRouter)
app.use('/api', productsRouter)
app.use('/api', specialOffersRouter)

// Unknown API requests must never receive the storefront HTML.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = fileURLToPath(new URL('../admin-dashboard/dist/', import.meta.url))
  app.use(express.static(frontendDirectory))
  app.get('*', (req, res, next) => {
    if (!req.accepts('html')) return next()
    res.sendFile('index.html', { root: frontendDirectory })
  })
}

app.use((error, _req, res, _next) => {
  const status = Number(error.statusCode ?? error.status ?? 500)
  // Do not leak database details, customer data, or upstream credentials.
  console.error('API request failed', { status, code: error.code ?? error.name })
  res.status(status >= 400 && status <= 599 ? status : 500).json({
    error: status < 500 ? error.message : 'Unable to process the request. Please retry.',
    ...(status < 500 && error.details ? { details: error.details } : {}),
  })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})
