// Exercises the actual local Workers runtime against a fake upstream, never production.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

const owner = { id: '5569f562-3a8f-4a3a-b305-a84a9330f2bc', email: 'lakshmikaipakkuvam@gmail.com', email_confirmed_at: '2026-01-01' }
let uploadedBytes = 0
const upstream = createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  res.setHeader('Content-Type', 'application/json')
  if (req.url.startsWith('/auth/v1/token')) {
    res.end(JSON.stringify({ access_token: 'smoke-token', refresh_token: 'smoke-refresh', token_type: 'bearer', expires_in: 3600, user: owner }))
  } else if (req.url.startsWith('/auth/v1/user')) {
    res.end(JSON.stringify(owner))
  } else if (req.url.startsWith('/storage/v1/object/')) {
    uploadedBytes += Buffer.concat(chunks).length
    res.end(JSON.stringify({ Key: 'product-images/smoke.png' }))
  } else {
    res.end('[]')
  }
})
upstream.listen(0, '127.0.0.1')
await once(upstream, 'listening')
const root = fileURLToPath(new URL('../', import.meta.url))
const port = 8787
const origin = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--show-interactive-dev-session=false',
  '--var', `SUPABASE_URL:http://127.0.0.1:${upstream.address().port}`,
  '--var', 'SUPABASE_SERVICE_ROLE_KEY:smoke-only-not-a-real-key',
  '--var', 'RAZORPAY_KEY_ID:rzp_test_smoke', '--var', 'RAZORPAY_KEY_SECRET:smoke-only',
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
let logs = ''
child.stdout.on('data', (chunk) => { logs += chunk })
child.stderr.on('data', (chunk) => { logs += chunk })
try {
  const deadline = Date.now() + 60000
  let ready = false
  while (Date.now() < deadline && child.exitCode === null) {
    try { ready = (await fetch(`${origin}/api/health`)).ok } catch {}
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  assert.ok(ready, `Worker did not become ready:\n${logs}`)
  assert.deepEqual(await (await fetch(`${origin}/api/health`)).json(), { status: 'ok' })
  assert.match(await (await fetch(origin)).text(), /<div id="root">/)
  assert.match(await (await fetch(`${origin}/admin`)).text(), /<div id="root">/)
  assert.equal((await fetch(`${origin}/api/orders`)).status, 401)
  assert.deepEqual(await (await fetch(`${origin}/api/products/public`)).json(), { products: [] })

  const headers = { Origin: origin, 'X-LKP-Request': 'admin', 'Content-Type': 'application/json' }
  const login = await fetch(`${origin}/api/auth/admin/login`, {
    method: 'POST', headers, body: JSON.stringify({ email: owner.email, password: 'smoke-only' }),
  })
  assert.equal(login.status, 200, await login.clone().text())
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.match(cookie, /^__Host-lkp_admin=/)
  const session = await fetch(`${origin}/api/auth/admin/session`, { headers: { Cookie: cookie } })
  assert.equal(session.status, 200, await session.clone().text())
  assert.equal((await fetch(`${origin}/api/unknown`, { headers: { Cookie: cookie } })).status, 404)

  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jzWQAAAAASUVORK5CYII=', 'base64')
  const form = new FormData()
  form.append('images', new Blob([image], { type: 'image/png' }), 'smoke.png')
  const upload = await fetch(`${origin}/api/product-images`, { method: 'POST', headers: { Origin: origin, 'X-LKP-Request': 'admin', Cookie: cookie }, body: form })
  assert.equal(upload.status, 201, await upload.clone().text())
  assert.equal(uploadedBytes, image.length)

  const badOrder = await fetch(`${origin}/api/orders`, { method: 'POST', headers, body: '{}' })
  assert.equal(badOrder.status, 400)
  assert.match(badOrder.headers.get('set-cookie') ?? '', /__Host-lkp_customer=/)
  const logout = await fetch(`${origin}/api/auth/admin/logout`, { method: 'POST', headers: { ...headers, Cookie: cookie } })
  assert.equal(logout.status, 200)
  assert.equal((await fetch(`${origin}/api/auth/admin/session`, { headers: { Cookie: cookie } })).status, 401)
  console.log('PASS: Workers runtime: storefront, admin navigation, health, catalog, authentication, persistent session store, upload, order validation, and logout.')
} finally {
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
  await new Promise((resolve) => { upstream.close(resolve); upstream.closeAllConnections() })
}
