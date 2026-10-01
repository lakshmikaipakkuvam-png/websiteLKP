import { Router } from 'express'
import {
  createComboOffer,
  deleteComboOffer,
  fetchComboOffers,
  fetchPublicComboOffers,
  updateComboOffer,
  updateComboOfferActive,
} from './comboOffersRepository.js'
import { validateComboOffer } from './comboOfferValidation.js'

export const comboOffersRouter = Router()

comboOffersRouter.get('/combo-offers', async (_req, res, next) => {
  try {
    const comboOffers = await fetchComboOffers({ draft: false })
    res.json({ comboOffers })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.get('/combo-offers/drafts', async (_req, res, next) => {
  try {
    const comboOffers = await fetchComboOffers({ draft: true })
    res.json({ comboOffers })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.get('/combo-offers/public', async (_req, res, next) => {
  try {
    const comboOffers = await fetchPublicComboOffers()
    res.json({ comboOffers })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.post('/combo-offers', async (req, res, next) => {
  try {
    validateComboOffer(req.body)

    const comboOffer = await createComboOffer(req.body, false)
    res.status(201).json({ comboOffer })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.post('/combo-offers/drafts', async (req, res, next) => {
  try {
    validateComboOffer(req.body, { draft: true })

    const comboOffer = await createComboOffer(req.body, true)
    res.status(201).json({ comboOffer })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.put('/combo-offers/:id', async (req, res, next) => {
  try {
    validateComboOffer(req.body, { draft: Boolean(req.body.draft) })

    const comboOffer = await updateComboOffer(req.params.id, req.body)
    res.json({ comboOffer })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.patch('/combo-offers/:id/active', async (req, res, next) => {
  try {
    if (typeof req.body.active !== 'boolean') {
      res.status(400).json({
        error: 'Validation failed',
        details: { active: 'Active must be true or false.' },
      })
      return
    }

    const comboOffer = await updateComboOfferActive(req.params.id, req.body.active)
    res.json({ comboOffer })
  } catch (error) {
    next(error)
  }
})

comboOffersRouter.delete('/combo-offers/:id', async (req, res, next) => {
  try {
    await deleteComboOffer(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
