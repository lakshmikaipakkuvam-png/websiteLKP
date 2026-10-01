function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export class PaymentValidationError extends Error {
  constructor(details) {
    super('Payment validation failed')
    this.name = 'PaymentValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validateTestPayment(payload) {
  const details = {}

  if (!isUuid(payload.orderId)) {
    details.orderId = 'Order ID must be a valid UUID.'
  }

  if (Object.keys(details).length > 0) {
    throw new PaymentValidationError(details)
  }
}
