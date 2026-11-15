// Read-only gateway validation and an intentionally ignored, signed webhook event.
// No payment orders are created, captured, refunded, or reconciled.
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
const base = 'https://lkp-shop-preview.lakshmikaipakkuvam.workers.dev'
const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
  headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}` },
  signal: AbortSignal.timeout(15000),
})
assert.equal(response.status, 200, 'Payment gateway rejected the configured credentials')
await response.arrayBuffer()
console.log('PASS: gateway credentials accepted for a read-only request.')
const body = JSON.stringify({ account_id: process.env.RAZORPAY_ACCOUNT_ID, event: 'migration.preview.check' })
const signature = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex')
const webhook = await fetch(`${base}/api/webhooks/razorpay`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': signature }, body,
  signal: AbortSignal.timeout(15000),
})
assert.equal(webhook.status, 200, 'Signed preview webhook failed')
assert.deepEqual(await webhook.json(), { ignored: true })
const invalid = await fetch(`${base}/api/webhooks/razorpay`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': '0'.repeat(64) }, body,
  signal: AbortSignal.timeout(15000),
})
assert.equal(invalid.status, 400)
console.log('PASS: Worker verifies raw-body webhook HMAC, accepts an ignored signed event, and rejects a forged signature.')
