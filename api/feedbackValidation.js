function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export class FeedbackValidationError extends Error {
  constructor(details) {
    super('Feedback validation failed')
    this.name = 'FeedbackValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validateFeedbackReview(payload) {
  const details = {}
  const rating = Number(payload.rating)

  if (!isUuid(payload.orderId)) {
    details.orderId = 'Order ID must be a valid UUID.'
  }

  if (!isUuid(payload.paymentId)) {
    details.paymentId = 'Payment ID must be a valid UUID.'
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    details.rating = 'Rating must be between 1 and 5.'
  }

  if (payload.message !== undefined && payload.message !== null && typeof payload.message !== 'string') {
    details.message = 'Feedback message must be text.'
  }

  if (Object.keys(details).length > 0) {
    throw new FeedbackValidationError(details)
  }
}

export function validateAdminCustomerReview(payload) {
  const details = {}
  const rating = payload.rating === '' || payload.rating === null || payload.rating === undefined ? null : Number(payload.rating)
  const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls : []
  const hasMessage = typeof payload.message === 'string' && payload.message.trim().length > 0
  const hasImages = imageUrls.some((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim().length > 0)

  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    details.rating = 'Rating must be between 1 and 5.'
  }

  if (payload.message !== undefined && payload.message !== null && typeof payload.message !== 'string') {
    details.message = 'Review message must be text.'
  }

  if (!hasMessage && !hasImages) {
    details.content = 'Add review text or at least one image.'
  }

  if (Object.keys(details).length > 0) {
    throw new FeedbackValidationError(details)
  }
}
