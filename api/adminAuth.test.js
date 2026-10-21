import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { createAdminAuth } from './adminAuth.js'

const origin = 'https://shop.example'
const owner = { id: 'owner-id', email: 'lakshmikaipakkuvam@gmail.com', email_confirmed_at: '2026-01-01' }
async function fixture(t, overrides = {}) {
  let time = 0
  let currentUser = owner
  const app = express()
  app.use(express.json())
  const auth = createAdminAuth({
    env: { NODE_ENV: 'production', CORS_ORIGIN: origin, ADMIN_USER_IDS: owner.id, ...overrides },
    now: () => time,
    identity: {
      signIn: async (email, password) => email === owner.email && password === 'test-only-password' ? { user: currentUser, accessToken: 'private-upstream-token', expiresIn: 3600 } : null,
      getUser: async (token) => token === 'private-upstream-token' ? currentUser : null,
    },
  })
  app.use('/api/auth/admin', auth.router)
  app.use('/api', auth.protectApi)
  app.use('/api', (_req, res) => res.json({ reachedHandler: true }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const url = `http://127.0.0.1:${server.address().port}`
  const request = (path, options = {}) => fetch(`${url}/api${path}`, options)
  const headers = { Origin: origin, 'X-LKP-Request': 'admin', 'Content-Type': 'application/json' }
  const login = () => request('/auth/admin/login', { method: 'POST', headers, body: JSON.stringify({ email: owner.email, password: 'test-only-password' }) })
  return { request, headers, login, advance: () => { time += 3600001 }, changeUser: (user) => { currentUser = user } }
}

test('every sensitive API and unknown route denies anonymous requests', async (t) => {
  const { request } = await fixture(t)
  for (const [method, path] of [
    ['GET', '/orders'], ['GET', '/orders/ba96ad37-1e04-4b36-b02b-d29b3bfc0777'],
    ['GET', '/products'], ['GET', '/products/drafts'], ['GET', '/combo-offers'],
    ['GET', '/admin-customer-reviews'], ['POST', '/products'], ['PUT', '/profile'],
    ['POST', '/categories'], ['DELETE', '/subcategories/1'], ['POST', '/product-images'],
    ['PATCH', '/orders/1/status'], ['PATCH', '/orders/1/tracking'], ['POST', '/future-sensitive-route'],
  ]) assert.equal((await request(path, { method })).status, 401, `${method} ${path}`)
})
test('public catalog and checkout remain accessible', async (t) => {
  const { request } = await fixture(t)
  for (const path of ['/health', '/categories', '/products/public', '/profile']) assert.equal((await request(path)).status, 200)
  assert.equal((await request('/create-order', { method: 'POST' })).status, 200)
})
test('login session uses an opaque secure cookie; logout revokes replay', async (t) => {
  const { login, request, headers } = await fixture(t)
  const response = await login()
  assert.equal(response.status, 200)
  const setCookie = response.headers.get('set-cookie')
  assert.match(setCookie, /__Host-lkp_admin=/)
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(setCookie.includes(attribute))
  assert.ok(!setCookie.includes('private-upstream-token'))
  assert.ok(!(await response.text()).includes('private-upstream-token'))
  const Cookie = setCookie.split(';')[0]
  assert.equal((await request('/orders', { headers: { Cookie } })).status, 200)
  assert.equal((await request('/profile', { method: 'PUT', headers: { ...headers, Cookie } })).status, 200)
  assert.equal((await request('/auth/admin/logout', { method: 'POST', headers: { ...headers, Cookie } })).status, 200)
  assert.equal((await request('/orders', { headers: { Cookie } })).status, 401)
})
test('cross-site and missing-origin requests cannot log in or mutate admin data', async (t) => {
  const { request, login, headers } = await fixture(t)
  for (const badHeaders of [{}, { ...headers, Origin: 'https://attacker.example' }, { Origin: origin }]) {
    assert.equal((await request('/auth/admin/login', { method: 'POST', headers: badHeaders })).status, 403)
  }
  const Cookie = (await login()).headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/profile', { method: 'PUT', headers: { Cookie } })).status, 403)
  assert.equal((await request('/auth/admin/logout', { method: 'POST', headers: { ...headers, Cookie, Origin: 'https://attacker.example' } })).status, 403)
})
test('expired, forged, and non-owner sessions fail closed', async (t) => {
  const { request, login, advance, changeUser } = await fixture(t)
  assert.equal((await request('/orders', { headers: { Cookie: '__Host-lkp_admin=forged', Authorization: 'Bearer owner-id' } })).status, 401)
  const Cookie = (await login()).headers.get('set-cookie').split(';')[0]
  advance()
  assert.equal((await request('/orders', { headers: { Cookie } })).status, 401)
  changeUser({ ...owner, id: 'attacker-id', user_metadata: { role: 'admin' } })
  assert.equal((await login()).status, 401)
  changeUser({ ...owner, email_confirmed_at: null })
  assert.equal((await login()).status, 401)
})
test('missing owner configuration does not permit login', async (t) => {
  const { login } = await fixture(t, { ADMIN_USER_IDS: '' })
  assert.equal((await login()).status, 503)
})
test('login attempts are limited even with spoofed forwarded IPs', async (t) => {
  const { request, headers } = await fixture(t)
  for (let index = 0; index < 6; index += 1) {
    const response = await request('/auth/admin/login', { method: 'POST', headers: { ...headers, 'X-Forwarded-For': `192.0.2.${index}` }, body: JSON.stringify({ email: owner.email, password: 'wrong' }) })
    assert.equal(response.status, index < 5 ? 401 : 429)
  }
})
