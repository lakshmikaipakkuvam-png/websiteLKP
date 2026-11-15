import assert from 'node:assert/strict'
const base = process.argv[2] ?? 'https://lkp-shop-preview.lakshmikaipakkuvam.workers.dev'
for (const [path, status] of [['/', 200], ['/admin', 200], ['/api/health', 200], ['/api/products/public', 200], ['/api/profile', 200], ['/api/orders', 401]]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) })
  const type = response.headers.get('content-type')
  console.log(JSON.stringify({ path, status: response.status, type }))
  assert.equal(response.status, status, `${path} returned unexpected status`)
  if (path === '/api/health') assert.deepEqual(await response.json(), { status: 'ok' })
  if (path === '/api/products/public') {
    const { products } = await response.json()
    assert.ok(Array.isArray(products))
    console.log(`Public catalog: ${products.length} products`)
  }
}
