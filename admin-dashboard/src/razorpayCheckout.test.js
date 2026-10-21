import assert from 'node:assert/strict'
import { test } from 'node:test'
import { openRazorpayCheckout, paymentRequest, verifyCheckoutPayment } from './razorpayCheckout.js'

const paymentOrder = { key_id: 'rzp_test_example', order_id: 'order_test', amount: 100, currency: 'INR' }

test('Checkout receives server order and returns only the provider callback', async () => {
  let options
  class Checkout {
    constructor(config) { options = config }
    on() {}
    open() { options.handler({ razorpay_payment_id: 'pay_test' }) }
  }
  const result = await openRazorpayCheckout(Checkout, paymentOrder, { customerName: 'Customer', phoneNumber: '9000000000' })
  assert.equal(options.order_id, paymentOrder.order_id)
  assert.equal(options.amount, 100)
  assert.equal(result.razorpay_payment_id, 'pay_test')
})

test('dismiss rejects rather than reporting payment success', async () => {
  class Checkout {
    constructor(config) { this.config = config }
    on() {}
    open() { this.config.modal.ondismiss() }
  }
  await assert.rejects(openRazorpayCheckout(Checkout, paymentOrder, {}), /cancelled/)
})

test('payment.failed closes checkout and shows a failure', async () => {
  let closed = false
  class Checkout {
    on(event, callback) { assert.equal(event, 'payment.failed'); this.fail = callback }
    open() { this.fail() }
    close() { closed = true }
  }
  await assert.rejects(openRazorpayCheckout(Checkout, paymentOrder, {}), /Payment failed/)
  assert.equal(closed, true)
})

test('signature rejection is shown and is not retried', async (t) => {
  let calls = 0
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1
    return { ok: false, status: 400, json: async () => ({ error: 'Signature mismatch' }) }
  })
  await assert.rejects(verifyCheckoutPayment('/api', 'shop-order', {}), /Signature mismatch/)
  assert.equal(calls, 1)
})

test('unreachable backend produces a useful error', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('fetch failed') })
  await assert.rejects(paymentRequest('/api', '/create-order', {}), /Check your connection/)
})

test('a hosting loading page is reported as unavailable, not a successful order', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, json: async () => { throw new Error('Not JSON') } }))
  await assert.rejects(paymentRequest('/api', '/create-order', {}), /starting or unavailable/)
})
