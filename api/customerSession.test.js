import assert from 'node:assert/strict'
import { test } from 'node:test'
import { customerSession } from './customerSession.js'

test('guest session is opaque and cannot be chosen by body or query parameters', () => {
  const req = { method: 'POST', path: '/orders', headers: {}, body: { owner_session_hash: 'attacker' }, query: { token: 'attacker' } }
  let cookie
  const res = { cookie: (name, token, options) => { cookie = { name, token, options } } }
  customerSession(req, res, () => {})
  assert.match(req.customerSessionHash, /^[a-f0-9]{64}$/)
  assert.notEqual(req.customerSessionHash, cookie.token)
  assert.equal(cookie.options.httpOnly, true)
  assert.equal(cookie.options.sameSite, 'strict')
  const read = { method: 'GET', path: '/customer-orders', headers: { cookie: `${cookie.name}=${cookie.token}` } }
  customerSession(read, res, () => {})
  assert.equal(read.customerSessionHash, req.customerSessionHash)
  const attacker = { method: 'GET', path: '/customer-orders', headers: { cookie: `${cookie.name}=invalid` } }
  customerSession(attacker, res, () => {})
  assert.equal(attacker.customerSessionHash, null)
})

test('order ownership requires both server session and order ID', async () => {
  process.env.SUPABASE_URL ??= 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-only'
  const { createOrderAuthorizer } = await import('./orderOwnership.js')
  const id = 'ba96ad37-1e04-4b36-b02b-d29b3bfc0777'
  const authorize = createOrderAuthorizer({ from: () => {
    const filters = {}
    const query = { select: () => query, eq: (key, value) => { filters[key] = value; return query },
      maybeSingle: async () => ({ data: filters.id === id && filters.owner_session_hash === 'owner-private-hash' ? { id } : null }) }
    return query
  } })
  await authorize(id, 'owner-private-hash')
  await assert.rejects(authorize(id, 'other-browser-hash'), { statusCode: 404 })
  await assert.rejects(authorize(id, null), { statusCode: 403 })
  await assert.rejects(authorize('not-an-order', 'owner-private-hash'), { statusCode: 400 })
})
