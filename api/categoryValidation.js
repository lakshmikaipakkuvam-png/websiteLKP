function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export class CategoryValidationError extends Error {
  constructor(details) {
    super('Category validation failed')
    this.name = 'CategoryValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export function validateCategory(payload) {
  const details = {}

  if (!hasText(payload.name)) {
    details.name = 'Category name is required.'
  }

  if (Object.keys(details).length > 0) {
    throw new CategoryValidationError(details)
  }
}
