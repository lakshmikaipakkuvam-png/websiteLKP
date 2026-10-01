function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isOptionalUrl(value) {
  if (!hasText(value)) {
    return true
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isTenDigitPhone(value) {
  return typeof value === 'string' && /^\d{10}$/.test(value.trim())
}

function isOptionalTenDigitPhone(value) {
  return !hasText(value) || isTenDigitPhone(value)
}

function isNonNegativeInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0
}

export class ProfileValidationError extends Error {
  constructor(details) {
    super('Profile validation failed')
    this.name = 'ProfileValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validateProfile(payload) {
  const details = {}

  if (!hasText(payload.name)) {
    details.name = 'Business name is required.'
  }

  if (!hasText(payload.number)) {
    details.number = 'Contact number is required.'
  } else if (!isTenDigitPhone(payload.number)) {
    details.number = 'Contact number must be 10 digits.'
  }

  if (!hasText(payload.address)) {
    details.address = 'Address is required.'
  }

  if (!isOptionalUrl(payload.instagramLink)) {
    details.instagramLink = 'Instagram link must be a valid http or https URL.'
  }

  if (!isOptionalUrl(payload.facebookLink)) {
    details.facebookLink = 'Facebook link must be a valid http or https URL.'
  }

  if (!isOptionalTenDigitPhone(payload.whatsapp)) {
    details.whatsapp = 'WhatsApp contact must be 10 digits.'
  }

  if (!isNonNegativeInteger(payload.deliveryChennaiAmount)) {
    details.deliveryChennaiAmount = 'Chennai delivery charge must be zero or more.'
  }

  if (!isNonNegativeInteger(payload.deliveryBangaloreAmount)) {
    details.deliveryBangaloreAmount = 'Bangalore delivery charge must be zero or more.'
  }

  if (!isNonNegativeInteger(payload.deliveryDefaultAmount)) {
    details.deliveryDefaultAmount = 'Default delivery charge must be zero or more.'
  }

  if (payload.discountEnabled) {
    if (!hasText(payload.discountCode)) {
      details.discountCode = 'Discount code is required when discount is enabled.'
    }

    if (!['amount', 'percent'].includes(payload.discountType)) {
      details.discountType = 'Discount type must be amount or percent.'
    }

    if (!isNonNegativeInteger(payload.discountValue) || Number(payload.discountValue) === 0) {
      details.discountValue = 'Discount value must be greater than zero.'
    }
  }

  if (!isNonNegativeInteger(payload.discountMinOrderAmount)) {
    details.discountMinOrderAmount = 'Minimum order amount must be zero or more.'
  }

  if (Object.keys(details).length > 0) {
    throw new ProfileValidationError(details)
  }
}
