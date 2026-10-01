import { Router } from 'express'
import {
  createAdminCustomerReview,
  createFeedbackReview,
  deleteAdminCustomerReview,
  fetchAdminCustomerReviews,
  fetchPublicFeedbackReviews,
  updateAdminCustomerReviewActive,
} from './feedbackRepository.js'
import { validateAdminCustomerReview, validateFeedbackReview } from './feedbackValidation.js'

export const feedbackRouter = Router()

feedbackRouter.get('/feedback-reviews/public', async (_req, res, next) => {
  try {
    const reviews = await fetchPublicFeedbackReviews()
    res.json({ reviews })
  } catch (error) {
    next(error)
  }
})

feedbackRouter.post('/feedback-reviews', async (req, res, next) => {
  try {
    validateFeedbackReview(req.body)

    const feedback = await createFeedbackReview(req.body)
    res.status(201).json({ feedback })
  } catch (error) {
    next(error)
  }
})

feedbackRouter.get('/admin-customer-reviews', async (_req, res, next) => {
  try {
    const reviews = await fetchAdminCustomerReviews()
    res.json({ reviews })
  } catch (error) {
    next(error)
  }
})

feedbackRouter.post('/admin-customer-reviews', async (req, res, next) => {
  try {
    validateAdminCustomerReview(req.body)

    const review = await createAdminCustomerReview(req.body)
    res.status(201).json({ review })
  } catch (error) {
    next(error)
  }
})

feedbackRouter.patch('/admin-customer-reviews/:id/active', async (req, res, next) => {
  try {
    if (typeof req.body.active !== 'boolean') {
      res.status(400).json({
        error: 'Validation failed',
        details: { active: 'Active must be true or false.' },
      })
      return
    }

    const review = await updateAdminCustomerReviewActive(req.params.id, req.body.active)
    res.json({ review })
  } catch (error) {
    next(error)
  }
})

feedbackRouter.delete('/admin-customer-reviews/:id', async (req, res, next) => {
  try {
    await deleteAdminCustomerReview(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
