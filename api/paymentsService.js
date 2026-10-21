import { amountInPaise, paymentError, validateOrderId, validatePaymentFields, verifySignature } from './paymentValidation.js'

export function createPaymentService({ repository, gateway, getConfig }) {
  const checkMode = (order, mode) => {
    if (order.payment_mode !== mode) throw paymentError('This order uses an older payment configuration. Please contact the shop.', 409)
  }
  async function settle(order, payment, mode) {
    checkMode(order, mode)
    if (payment.order_id !== order.razorpay_order_id || Number(payment.amount) !== amountInPaise(order) || payment.currency !== 'INR') {
      throw paymentError('Payment does not match this order.')
    }
    if (!['captured', 'refunded'].includes(payment.status) || payment.captured !== true) {
      throw paymentError('Payment is not captured yet. Retry verification shortly; do not pay again.', 409)
    }
    const refunded = Number(payment.amount_refunded ?? 0)
    if (!Number.isSafeInteger(refunded) || refunded < 0 || refunded > Number(payment.amount)) throw paymentError('Invalid refund information.', 502)
    if (payment.status === 'refunded' && refunded === 0) throw paymentError('Refund information is not available yet.', 503)
    const saved = await repository.savePayment(order, payment, mode)
    return { success: saved.refundedAmountPaise === 0 && order.status !== 'cancelled', payment: saved }
  }
  return {
    async createOrder(payload = {}) {
      validateOrderId(payload.orderId)
      const { keyId, mode } = getConfig()
      const order = await repository.getOrder(payload.orderId)
      if (order.status === 'cancelled') throw paymentError('This order has been cancelled.', 409)
      if (await repository.getPayment(order.id)) throw paymentError('This order already has a payment. Check its status; do not pay again.', 409)
      const amount = amountInPaise(order)
      let providerOrderId = order.razorpay_order_id
      if (!providerOrderId) {
        const created = await gateway.createOrder({ amount, currency: 'INR', receipt: order.id })
        providerOrderId = await repository.attachProviderOrder(order.id, created.id, mode)
      } else checkMode(order, mode)
      const providerOrder = await gateway.fetchOrder(providerOrderId)
      if (Number(providerOrder.amount) !== amount || providerOrder.currency !== 'INR' || providerOrder.receipt !== order.id) {
        throw paymentError('Payment order details do not match. Please contact the shop.', 409)
      }
      if (providerOrder.status === 'paid') throw paymentError('Payment was received. Use Check payment status; do not pay again.', 409)
      return { order_id: providerOrderId, amount, currency: 'INR', key_id: keyId }
    },
    async verifyPayment(payload = {}) {
      validatePaymentFields(payload)
      const { secret, mode } = getConfig()
      const order = await repository.getOrder(payload.orderId)
      if (!order.razorpay_order_id || order.razorpay_order_id !== payload.razorpay_order_id
        || !verifySignature(order.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature, secret)) {
        throw paymentError('Payment signature verification failed.')
      }
      // Re-fetch even on retries: an earlier capture may now be refunded.
      const result = await settle(order, await gateway.fetchPayment(payload.razorpay_payment_id), mode)
      if (!result.success) throw paymentError('Payment needs owner review or has been refunded. Do not pay again.', 409)
      return result
    },
    async paymentStatus(payload = {}) {
      validateOrderId(payload.orderId)
      const { mode } = getConfig()
      const order = await repository.getOrder(payload.orderId)
      if (!order.razorpay_order_id) return { success: false, status: 'awaiting_payment' }
      checkMode(order, mode)
      const list = await gateway.fetchOrderPayments(order.razorpay_order_id)
      const candidate = list.items?.find((payment) => ['captured', 'refunded'].includes(payment.status))
      if (!candidate) return { success: false, status: 'awaiting_payment' }
      return settle(order, await gateway.fetchPayment(candidate.id), mode)
    },
    async reconcilePayment(paymentId) {
      const { mode } = getConfig()
      const payment = await gateway.fetchPayment(paymentId)
      if (!payment.order_id) return { ignored: true }
      const order = await repository.getOrderByProviderId(payment.order_id)
      // A capture may race initial attachment; non-2xx lets Razorpay retry.
      if (!order) throw paymentError('Payment order is not available yet.', 503)
      if (!['captured', 'refunded'].includes(payment.status)) return { ignored: true }
      return settle(order, payment, mode)
    },
  }
}
