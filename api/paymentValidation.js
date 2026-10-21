import { createHmac, timingSafeEqual } from 'node:crypto'

export function paymentError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function validateOrderId(orderId) {
  if (typeof orderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    throw paymentError('A valid shop orderId is required.')
  }
}

export function amountInPaise(order) {
  const rupees = order.grand_total_amount ?? order.subtotal_amount
  const amount = Number(rupees) * 100
  if (rupees === null || rupees === undefined || !Number.isSafeInteger(amount) || amount < 100) {
    throw paymentError('Order amount must be at least 100 paise (Rs. 1).')
  }
  return amount
}

export function validatePaymentFields(payload = {}) {
  validateOrderId(payload.orderId)
  if (typeof payload.razorpay_order_id !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(payload.razorpay_order_id)
    || typeof payload.razorpay_payment_id !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(payload.razorpay_payment_id)
    || typeof payload.razorpay_signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(payload.razorpay_signature)) {
    throw paymentError('Payment ID, order ID, and a valid payment signature are required.')
  }
}

export function verifySignature(orderId, paymentId, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) return false
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}
