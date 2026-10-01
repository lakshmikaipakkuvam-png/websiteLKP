function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export class OrderValidationError extends Error {
  constructor(details) {
    super('Order validation failed')
    this.name = 'OrderValidationError'
    this.statusCode = 400
    this.details = details
  }
}

export const ORDER_STATUSES = ['confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']

export function validateCreateOrder(payload) {
  const details = {}

  if (!hasText(payload.customerName)) {
    details.customerName = 'Customer name is required.'
  }

  if (!hasText(payload.phoneNumber)) {
    details.phoneNumber = 'Phone number is required.'
  }

  if (!hasText(payload.deliveryAddress)) {
    details.deliveryAddress = 'Delivery address is required.'
  }

  if (!hasText(payload.deliveryState)) {
    details.deliveryState = 'Delivery state is required.'
  }

  if (!hasText(payload.deliveryDistrict)) {
    details.deliveryDistrict = 'Delivery district is required.'
  }

  if (!hasText(payload.deliveryPincode)) {
    details.deliveryPincode = 'PIN code is required.'
  }

  if (payload.billingSameAsShipping === false) {
    if (!hasText(payload.billingName)) {
      details.billingName = 'Billing name is required.'
    }

    if (!hasText(payload.billingAddress)) {
      details.billingAddress = 'Billing address is required.'
    }

    if (!hasText(payload.billingCity)) {
      details.billingCity = 'Billing city is required.'
    }

    if (!hasText(payload.billingState)) {
      details.billingState = 'Billing state is required.'
    }

    if (!hasText(payload.billingPincode)) {
      details.billingPincode = 'Billing PIN code is required.'
    }
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    details.items = 'At least one order item is required.'
  } else {
    payload.items.forEach((item, index) => {
      const itemType = item.type ?? 'product'

      if (!['product', 'combo'].includes(itemType)) {
        details[`items.${index}.type`] = 'Item type must be product or combo.'
      }

      if (itemType === 'product' && !isUuid(item.productId)) {
        details[`items.${index}.productId`] = 'Product ID must be a valid UUID.'
      }

      if (itemType === 'combo' && !isUuid(item.comboOfferId)) {
        details[`items.${index}.comboOfferId`] = 'Combo offer ID must be a valid UUID.'
      }

      if (!isPositiveInteger(item.quantity)) {
        details[`items.${index}.quantity`] = 'Quantity must be a positive whole number.'
      }
    })
  }

  if (Object.keys(details).length > 0) {
    throw new OrderValidationError(details)
  }
}

export function validateOrderStatus(payload) {
  const details = {}

  if (!ORDER_STATUSES.includes(payload.status)) {
    details.status = `Status must be one of: ${ORDER_STATUSES.join(', ')}.`
  }

  if (Object.keys(details).length > 0) {
    throw new OrderValidationError(details)
  }
}
