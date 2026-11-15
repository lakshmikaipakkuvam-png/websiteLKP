const response = await fetch('https://api.cloudflare.com/client/v4/zones?name=lakshmikaipakkuvam.com', {
  headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, signal: AbortSignal.timeout(15000),
})
const body = await response.json()
console.log(JSON.stringify({ success: body.success, errors: body.errors, zones: body.result?.map(({ id, name, status, name_servers, plan }) => ({ id, name, status, name_servers, plan: plan?.name })) }))
