import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { createPaymentService } from './paymentsService.js'
import { amountInPaise, verifySignature } from './paymentValidation.js'

const shopOrderId = 'ba96ad37-1e04-4b36-b02b-d29b3bfc0777'
const secret = 'unit-test-secret-not-a-real-key'

function fixture() {
  const order = { id: shopOrderId, grand_total_amount: 250, status: 'confirmed', razorpay_order_id: 'order_test123', payment_mode: 'test' }
  const state = { saved: null, saves: 0, creates: 0, reads: 0 }
  const payment = { id: 'pay_test123', order_id: order.razorpay_order_id, amount: 25000, currency: 'INR', status: 'captured', captured: true }
  const providerOrder = { id: 'order_test123', amount: 25000, currency: 'INR', receipt: shopOrderId, status: 'created' }
  const repository = {
    getOrder: async () => order,
    getPayment: async () => state.saved,
    attachProviderOrder: async (_id, providerId) => { order.razorpay_order_id = providerId; return providerId },
    getOrderByProviderId: async () => order,
    savePayment: async (_order, payment) => {
      if (!state.saved) state.saves += 1
      state.saved = { status: 'success', providerPaymentId: payment.id, refundedAmountPaise: Math.max(state.saved?.refundedAmountPaise ?? 0, payment.amount_refunded ?? 0) }
      return state.saved
    },
  }
  const gateway = {
    createOrder: async (request) => { state.creates += 1; state.request = request; return providerOrder },
    fetchOrder: async () => providerOrder,
    fetchPayment: async () => { state.reads += 1; return payment },
    fetchOrderPayments: async () => ({ items: [payment] }),
  }
  const service = createPaymentService({ repository, gateway, getConfig: () => ({ keyId: 'rzp_test_example', secret, mode: 'test' }) })
  const payload = { orderId: shopOrderId, razorpay_order_id: providerOrder.id, razorpay_payment_id: payment.id,
    razorpay_signature: createHmac('sha256', secret).update(`${providerOrder.id}|${payment.id}`).digest('hex') }
  return { service, state, order, payment, providerOrder, payload, gateway }
}

test('creates a provider order using server total and reuses it on retry', async () => {
  const f = fixture()
  f.order.razorpay_order_id = null
  const result = await f.service.createOrder({ orderId: shopOrderId, amount: 100, currency: 'USD' })
  assert.deepEqual(f.state.request, { amount: 25000, currency: 'INR', receipt: shopOrderId })
  assert.equal(result.amount, 25000)
  assert.equal(result.key_id, 'rzp_test_example')
  assert.equal(JSON.stringify(result).includes(secret), false)
  await f.service.createOrder({ orderId: shopOrderId })
  assert.equal(f.state.creates, 1)
})

test('enforces the minimum and integer paise boundary', () => {
  assert.equal(amountInPaise({ grand_total_amount: 1 }), 100)
  for (const value of [0, -1, 0.5, NaN, Infinity, 1.001, Number.MAX_SAFE_INTEGER, null]) {
    assert.throws(() => amountInPaise({ grand_total_amount: value }), { statusCode: 400 })
  }
})

test('rejects invalid and missing request fields', async () => {
  const f = fixture()
  await assert.rejects(f.service.createOrder({}), { statusCode: 400 })
  await assert.rejects(f.service.verifyPayment({}), { statusCode: 400 })
  await assert.rejects(f.service.verifyPayment({ ...f.payload, razorpay_signature: '' }), { statusCode: 400 })
  assert.equal(f.state.saves, 0)
})

test('rejects forged, short, and non-hex signatures without fetching or recording payment', async () => {
  const f = fixture()
  for (const signature of ['0'.repeat(64), 'short', 'z'.repeat(64)]) {
    assert.equal(verifySignature('order_test123', 'pay_test123', signature, secret), false)
    await assert.rejects(f.service.verifyPayment({ ...f.payload, razorpay_signature: signature }), { statusCode: 400 })
  }
  assert.equal(f.state.reads, 0)
  assert.equal(f.state.saves, 0)
})

test('binds verification to the stored order, even with another valid signature', async () => {
  const f = fixture()
  f.payload.razorpay_order_id = 'order_another'
  f.payload.razorpay_signature = createHmac('sha256', secret).update(`order_another|${f.payment.id}`).digest('hex')
  await assert.rejects(f.service.verifyPayment(f.payload), { statusCode: 400 })
  assert.equal(f.state.saves, 0)
})

test('rejects gateway amount, currency, or order mismatches', async () => {
  for (const change of [{ amount: 100 }, { currency: 'USD' }, { order_id: 'order_other' }]) {
    const f = fixture()
    Object.assign(f.payment, change)
    await assert.rejects(f.service.verifyPayment(f.payload), { statusCode: 400 })
    assert.equal(f.state.saves, 0)
  }
})

test('does not mark authorized or failed payments as successful', async () => {
  for (const status of ['authorized', 'failed']) {
    const f = fixture()
    f.payment.status = status
    f.payment.captured = false
    await assert.rejects(f.service.verifyPayment(f.payload), { statusCode: 409 })
    assert.equal(f.state.saves, 0)
  }
})

test('valid captured payment succeeds and repeated callbacks are idempotent', async () => {
  const f = fixture()
  assert.equal((await f.service.verifyPayment(f.payload)).success, true)
  assert.equal((await f.service.verifyPayment(f.payload)).success, true)
  assert.equal(f.state.saves, 1)
  assert.equal(f.state.reads, 2)
})

test('does not create another payment for a paid or cancelled order', async () => {
  const f = fixture()
  await f.service.verifyPayment(f.payload)
  await assert.rejects(f.service.createOrder({ orderId: shopOrderId }), { statusCode: 409 })
  const cancelled = fixture()
  cancelled.order.status = 'cancelled'
  await assert.rejects(cancelled.service.createOrder({ orderId: shopOrderId }), { statusCode: 409 })
})

test('reconciles a lost callback without accepting browser payment data', async () => {
  const f = fixture()
  const result = await f.service.paymentStatus({ orderId: shopOrderId, status: 'paid', amount: 1 })
  assert.equal(result.success, true)
  assert.equal(f.state.saves, 1)
})

test('refunds and cancellations cannot return a successful checkout', async () => {
  for (const mutate of [(f) => { f.payment.amount_refunded = 100 }, (f) => { f.order.status = 'cancelled' }]) {
    const f = fixture()
    mutate(f)
    await assert.rejects(f.service.verifyPayment(f.payload), { statusCode: 409 })
    assert.equal((await f.service.paymentStatus({ orderId: shopOrderId })).success, false)
  }
})

test('test credentials cannot settle a live-bound order', async () => {
  const f = fixture()
  f.order.payment_mode = 'live'
  await assert.rejects(f.service.verifyPayment(f.payload), { statusCode: 409 })
  assert.equal(f.state.saves, 0)
})

test('rejects a changed stored amount before reopening Checkout', async () => {
  const f = fixture()
  f.order.grand_total_amount = 260
  await assert.rejects(f.service.createOrder({ orderId: shopOrderId }), { statusCode: 409 })
})

test('HTTP routes return validation/auth/provider errors and retire fake success', async () => {
  process.env.SUPABASE_URL ??= 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'unit-test-placeholder'
  const { default: express } = await import('express')
  const { createPaymentsRouter } = await import('./paymentsRoutes.js')
  const f = fixture()
  const app = express()
  app.use(express.json())
  app.use('/api', createPaymentsRouter(f.service, async () => {}))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api`
  const post = (path, body) => fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  try {
    assert.equal((await post('/verify-payment', {})).status, 400)
    assert.equal((await post('/payments/test-success', { orderId: shopOrderId })).status, 410)
    for (const statusCode of [401, 500]) {
      f.gateway.fetchOrder = async () => { throw Object.assign(new Error('Gateway unavailable'), { statusCode }) }
      assert.equal((await post('/create-order', { orderId: shopOrderId })).status, statusCode)
    }
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
})
