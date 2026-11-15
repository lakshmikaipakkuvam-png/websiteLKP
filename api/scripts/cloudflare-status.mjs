const account = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`
for (const path of ['/subdomain', '/scripts/lkp-shop-preview/subdomain', '/scripts/lkp-shop-preview/deployments']) {
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json()
  console.log(JSON.stringify({ path, success: body.success, result: body.result, errors: body.errors }))
}
