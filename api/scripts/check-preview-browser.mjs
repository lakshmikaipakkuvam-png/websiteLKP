import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
import { getItemWeightGrams } from '../../admin-dashboard/src/delivery.js'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const base = 'https://lkp-shop-preview.lakshmikaipakkuvam.workers.dev'
  await page.goto(base, { waitUntil: 'networkidle', timeout: 45000 })
  console.log(JSON.stringify({ title: await page.title(), bodyLength: (await page.locator('body').innerText()).length, errors }))
  await page.screenshot({ path: '.wrangler/preview-home.png', fullPage: true })
  const health = await page.request.get(`${base}/api/health`)
  console.log(JSON.stringify({ health: health.status(), body: await health.text() }))
  const catalog = await (await page.request.get(`${base}/api/products/public`)).json()
  const product = catalog.products.find((item) => !item.freeDelivery && Number(item.weightQtyFloat ?? item.weightQtyInteger) > 0)
  assert.ok(product, 'A weighed product is needed to test shipping')
  const dismiss = page.getByRole('button', { name: /close/i })
  if (await dismiss.count()) await dismiss.first().click()
  await page.getByRole('button', { name: 'All Products', exact: true }).click()
  await page.getByRole('button', { name: product.productName, exact: true }).first().click()
  await page.getByRole('button', { name: 'Buy it now', exact: true }).click()
  await page.getByRole('button', { name: 'Check Out', exact: true }).click()
  await page.getByRole('heading', { name: 'Shipping method', exact: true }).waitFor()
  await page.getByPlaceholder('State', { exact: true }).fill('Tamil Nadu')
  await page.getByRole('button', { name: 'Tamil Nadu', exact: true }).click()
  await page.getByPlaceholder('District', { exact: true }).fill('Chennai')
  await page.getByRole('button', { name: 'Chennai', exact: true }).click()
  const shipping = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Shipping method', exact: true }) })
  const kg = Math.max(1, Math.ceil(getItemWeightGrams(product) / 1000))
  assert.ok((await shipping.innerText()).includes(`Rs. ${kg * 80}`), 'Chennai shipping estimate mismatch')
  await page.getByPlaceholder('District', { exact: true }).fill('Coimbatore')
  await page.getByRole('button', { name: 'Coimbatore', exact: true }).click()
  assert.ok((await shipping.innerText()).includes(`Rs. ${kg * 100}`), 'Outside Chennai shipping estimate mismatch')
  await page.screenshot({ path: '.wrangler/preview-checkout.png', fullPage: true })
  assert.deepEqual(errors, [], 'Browser JavaScript errors occurred')
  console.log('PASS: Buy It Now renders; state/district dropdowns work; Chennai/outside shipping matches; no orders submitted or payments initiated.')
} finally {
  await browser.close()
}
