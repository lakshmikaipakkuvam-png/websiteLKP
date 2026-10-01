function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasPrice(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isUrl(value) {
  if (!hasText(value)) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isOfferType(value) {
  return value === undefined || value === null || ['none', 'limited_time', 'festival'].includes(value)
}

export class ComboOfferValidationError extends Error {
  constructor(details) {
    super('Combo offer validation failed')
    this.name = 'ComboOfferValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validateComboOffer(payload, { draft = false } = {}) {
  const details = {}
  const productIds = Array.isArray(payload.productIds) ? payload.productIds : []

  if (!draft && !hasText(payload.comboName)) {
    details.comboName = 'Combo name is required.'
  }

  if (!draft && !hasText(payload.description)) {
    details.description = 'Description is required.'
  }

  if (!draft && !hasPrice(payload.comboPrice)) {
    details.comboPrice = 'Combo price is required and must be a whole number.'
  }

  if (!draft && productIds.length < 2) {
    details.productIds = 'Select at least two products for a combo.'
  }

  productIds.forEach((productId, index) => {
    if (!isUuid(productId)) {
      details[`productIds.${index}`] = 'Product ID must be a valid UUID.'
    }
  })

  if (!draft && (!Array.isArray(payload.imageUrls) || payload.imageUrls.length === 0 || !payload.imageUrls.every(isUrl))) {
    details.imageUrls = 'At least one valid combo image URL is required.'
  }

  if (!isOfferType(payload.offerType)) {
    details.offerType = 'Offer type must be none, limited_time, or festival.'
  }

  if (Object.keys(details).length > 0) {
    throw new ComboOfferValidationError(details)
  }
}
