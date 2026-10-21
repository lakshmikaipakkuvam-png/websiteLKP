import Razorpay from 'razorpay'
import { paymentError } from './paymentValidation.js'

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !secret) throw paymentError('Payments are not configured. Please contact the shop.', 503)
  const mode = keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : null
  if (!mode) throw paymentError('Payment configuration is invalid.', 503)
  if (mode === 'live' && (process.env.LIVE_PAYMENTS_ENABLED !== 'true' || !process.env.RAZORPAY_WEBHOOK_SECRET || !process.env.RAZORPAY_ACCOUNT_ID)) {
    throw paymentError('Live payments are not enabled yet. Please contact the shop.', 503)
  }
  return { keyId, secret, mode }
}

async function request(operation) {
  const { keyId, secret } = getRazorpayConfig()
  const client = new Razorpay({ key_id: keyId, key_secret: secret })
  try {
    return await operation(client)
  } catch (error) {
    const unauthorized = Number(error.statusCode) === 401
    throw paymentError(unauthorized
      ? 'Payment gateway authentication failed. Please contact the shop.'
      : 'Payment gateway is unavailable. Please retry.', unauthorized ? 401 : 500)
  }
}

export const razorpayGateway = {
  createOrder: (data) => request((client) => client.orders.create(data)),
  fetchOrder: (id) => request((client) => client.orders.fetch(id)),
  fetchPayment: (id) => request((client) => client.payments.fetch(id)),
  fetchOrderPayments: (id) => request((client) => client.orders.fetchPayments(id)),
}
