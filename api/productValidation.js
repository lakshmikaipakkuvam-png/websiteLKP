function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasCategory(category) {
  if (typeof category === 'string') {
    return hasText(category)
  }

  return hasText(category?.selected)
}

function hasQuantity(payload) {
  return (
    Number.isFinite(Number(payload.weightQtyFloat))
    || Number.isInteger(Number(payload.weightQtyInteger))
    || Number.isFinite(Number(payload.weightQty))
  )
}

function hasPrice(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0
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

function hasImages(imageUrls) {
  return Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls.every(isUrl)
}

function isOfferType(value) {
  return value === undefined || value === null || ['none', 'limited_time', 'festival'].includes(value)
}

export class ValidationError extends Error {
  constructor(details) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validatePublishedProduct(payload) {
  const details = {}

  if (!hasCategory(payload.category)) {
    details.category = 'Category is required.'
  }

  if (!hasText(payload.productName)) {
    details.productName = 'Product name is required.'
  }

  if (!hasQuantity(payload)) {
    details.weightQty = 'Quantity is required.'
  }

  if (!['gram', 'kg'].includes(payload.weightUnit)) {
    details.weightUnit = 'Weight unit is required and must be gram or kg.'
  }

  if (!hasText(payload.description)) {
    details.description = 'Description is required.'
  }

  if (!hasPrice(payload.price)) {
    details.price = 'Price is required and must be a whole number.'
  }

  if (!hasImages(payload.imageUrls)) {
    details.imageUrls = 'At least one valid image URL is required.'
  }

  if (!isOfferType(payload.offerType)) {
    details.offerType = 'Offer type must be none, limited_time, or festival.'
  }

  if (Object.keys(details).length > 0) {
    throw new ValidationError(details)
  }
}
