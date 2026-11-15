const headers = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
const zones = await (await fetch('https://api.cloudflare.com/client/v4/zones?name=lakshmikaipakkuvam.com', { headers })).json()
const zone = zones.result?.[0]
if (!zone) throw new Error('Cloudflare zone is missing')
const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records?per_page=100`, { headers })
const body = await response.json()
console.log(JSON.stringify({ success: body.success, errors: body.errors, records: body.result?.map(({ type, name, content, proxied }) => ({ type, name, content, proxied })) }))
