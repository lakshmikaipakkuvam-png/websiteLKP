import { Router } from 'express'
import { fetchPublicPromotionalComboOffers } from './comboOffersRepository.js'
import { fetchPublicPromotionalProducts } from './productsRepository.js'

export const specialOffersRouter = Router()

specialOffersRouter.get('/special-offers/public', async (_req, res, next) => {
  try {
    const [products, comboOffers] = await Promise.all([
      fetchPublicPromotionalProducts(),
      fetchPublicPromotionalComboOffers(),
    ])

    res.json({ products, comboOffers })
  } catch (error) {
    next(error)
  }
})
