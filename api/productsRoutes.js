import { Router } from 'express'
import {
  appendCategoryToProduct,
  createProduct,
  deleteProduct,
  fetchAvailableProducts,
  fetchDraftProducts,
  fetchPublicProducts,
  updateProduct,
  updateProductActive,
} from './productsRepository.js'
import { validatePublishedProduct } from './productValidation.js'

export const productsRouter = Router()

productsRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await fetchAvailableProducts()
    res.json({ products })
  } catch (error) {
    next(error)
  }
})

productsRouter.get('/products/drafts', async (_req, res, next) => {
  try {
    const products = await fetchDraftProducts()
    res.json({ products })
  } catch (error) {
    next(error)
  }
})

productsRouter.get('/products/public', async (req, res, next) => {
  try {
    const products = await fetchPublicProducts(req.query.filter)
    res.json({ products })
  } catch (error) {
    next(error)
  }
})

productsRouter.post('/products', async (req, res, next) => {
  try {
    validatePublishedProduct(req.body)

    const product = await createProduct({
      ...req.body,
      draft: false,
    })

    res.status(201).json({ product })
  } catch (error) {
    next(error)
  }
})

productsRouter.post('/products/drafts', async (req, res, next) => {
  try {
    const product = await createProduct({
      ...req.body,
      draft: true,
    })

    res.status(201).json({ product })
  } catch (error) {
    next(error)
  }
})

productsRouter.put('/products/:id', async (req, res, next) => {
  try {
    if (!req.body.draft) {
      validatePublishedProduct(req.body)
    }

    const product = await updateProduct(req.params.id, req.body)
    res.json({ product })
  } catch (error) {
    next(error)
  }
})

productsRouter.patch('/products/:id/categories', async (req, res, next) => {
  try {
    const product = await appendCategoryToProduct(req.params.id, req.body.category)
    res.json({ product })
  } catch (error) {
    next(error)
  }
})

productsRouter.patch('/products/:id/active', async (req, res, next) => {
  try {
    if (typeof req.body.active !== 'boolean') {
      res.status(400).json({
        error: 'Validation failed',
        details: { active: 'Active must be true or false.' },
      })
      return
    }

    const product = await updateProductActive(req.params.id, req.body.active)
    res.json({ product })
  } catch (error) {
    next(error)
  }
})

productsRouter.delete('/products/:id', async (req, res, next) => {
  try {
    await deleteProduct(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
