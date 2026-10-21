import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac } from 'node:crypto'
import express from 'express'
import { createPaymentWebhook } from './paymentWebhook.js'

test('webhook requires raw-body HMAC and account binding; retries provider failures', async (t) => {
  let calls = 0
  let fail = false
  const logs = []
  const app = express()
  app.use('/hook', createPaymentWebhook({ reconcilePayment: async (id) => {
    assert.equal(id, 'pay_123'); calls += 1; if (fail) throw new Error('temporary')
  } }, { RAZORPAY_WEBHOOK_SECRET: 'test-secret', RAZORPAY_ACCOUNT_ID: 'acc_owner' }, (entry) => logs.push(entry)))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const event = { event: 'payment.captured', account_id: 'acc_owner', payload: { payment: { entity: { id: 'pay_123', amount: 1 } } } }
  const body = JSON.stringify(event)
  const sign = (value) => createHmac('sha256', 'test-secret').update(value).digest('hex')
  const send = (value, signature = sign(value)) => fetch(`http://127.0.0.1:${server.address().port}/hook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature }, body: value,
  })
  assert.equal((await send(body, 'bad')).status, 400)
  assert.equal((await send(body + ' ', sign(body))).status, 400)
  assert.equal((await send(JSON.stringify({ ...event, account_id: 'acc_attacker' }))).status, 400)
  assert.equal(calls, 0)
  assert.equal((await send(body)).status, 200)
  assert.equal((await send(body)).status, 200)
  assert.equal(calls, 2) // settlement is idempotent in the database, not an in-memory replay cache
  fail = true
  assert.equal((await send(body)).status, 503)
  assert.deepEqual(logs.map(({ status, outcome }) => ({ status, outcome })), [
    { status: 400, outcome: 'signature_invalid' },
    { status: 400, outcome: 'signature_invalid' },
    { status: 400, outcome: 'account_mismatch' },
    { status: 200, outcome: 'reconciled' },
    { status: 200, outcome: 'reconciled' },
    { status: 503, outcome: 'reconciliation_retry' },
  ])
  assert.equal(logs[3].event, 'payment.captured')
  const serialized = JSON.stringify(logs)
  for (const privateValue of ['test-secret', 'acc_owner', 'acc_attacker', 'pay_123', sign(body), 'temporary']) {
    assert.equal(serialized.includes(privateValue), false)
  }
})
