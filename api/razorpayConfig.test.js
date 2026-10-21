import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getRazorpayConfig } from './razorpayClient.js'

test('live payments fail closed unless explicitly enabled with webhook configuration', () => {
  const names = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'LIVE_PAYMENTS_ENABLED', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_ACCOUNT_ID']
  const saved = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  try {
    names.forEach((name) => { delete process.env[name] })
    assert.throws(getRazorpayConfig, { statusCode: 503 })
    process.env.RAZORPAY_KEY_ID = 'rzp_live_unitTest'
    process.env.RAZORPAY_KEY_SECRET = 'unit-test-only'
    assert.throws(getRazorpayConfig, { statusCode: 503 })
    process.env.LIVE_PAYMENTS_ENABLED = 'true'
    assert.throws(getRazorpayConfig, { statusCode: 503 })
    process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook'
    process.env.RAZORPAY_ACCOUNT_ID = 'acc_unitTest'
    assert.equal(getRazorpayConfig().mode, 'live')
    process.env.RAZORPAY_KEY_ID = 'rzp_test_unitTest'
    assert.equal(getRazorpayConfig().mode, 'test')
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name]
      else process.env[name] = saved[name]
    }
  }
})
