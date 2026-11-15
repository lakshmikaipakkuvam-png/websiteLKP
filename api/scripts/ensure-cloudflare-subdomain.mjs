const account = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
if (!account || !token) throw new Error('Cloudflare deployment credentials are missing.')
const url = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/subdomain`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const current = await (await fetch(url, { headers })).json()
if (current.success && current.result?.subdomain) {
  console.log(`Existing preview subdomain: ${current.result.subdomain}.workers.dev`)
} else {
  const response = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ subdomain: 'lakshmikaipakkuvam' }) })
  const result = await response.json()
  if (!result.success) throw new Error(`Cannot register preview subdomain: ${result.errors?.map((error) => error.message).join('; ')}`)
  console.log(`Registered preview subdomain: ${result.result.subdomain}.workers.dev`)
}
