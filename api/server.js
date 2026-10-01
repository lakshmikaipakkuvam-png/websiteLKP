import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { fileURLToPath } from 'node:url'
import { categoriesRouter } from './categoriesRoutes.js'
import { comboOffersRouter } from './comboOffersRoutes.js'
import { ordersRouter } from './ordersRoutes.js'
import { paymentsRouter } from './paymentsRoutes.js'
import { productImagesRouter } from './productImagesRoutes.js'
import { feedbackRouter } from './feedbackRoutes.js'
import { profileRouter } from './profileRoutes.js'
import { productsRouter } from './productsRoutes.js'
import { specialOffersRouter } from './specialOffersRoutes.js'

const app = express()
const port = process.env.PORT ?? 4000
const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(cors({ origin: corsOrigin?.length ? corsOrigin : true }))
app.use(express.json())
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
  console.error(error)
  res.status(error.statusCode ?? 500).json({
    error: error.message ?? 'Internal server error',
    details: error.details,
  })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})
