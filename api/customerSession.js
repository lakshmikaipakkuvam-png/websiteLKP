import { randomBytes, createHash } from 'node:crypto'

export function customerSession(req, res, next) {
  const production = process.env.NODE_ENV === 'production'
  const name = production ? '__Host-lkp_customer' : 'lkp_customer'
  const cookies = (req.headers.cookie ?? '').split(';').map((value) => value.trim()).filter((value) => value.startsWith(`${name}=`))
  let token = cookies.length === 1 ? cookies[0].slice(name.length + 1) : ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) token = ''
  // Only order creation sets the cookie; parallel catalog reads cannot race it.
  if (!token && req.method === 'POST' && req.path === '/orders') {
    token = randomBytes(32).toString('base64url')
    res.cookie(name, token, { httpOnly: true, secure: production, sameSite: 'strict', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 })
  }
  req.customerSessionHash = token ? createHash('sha256').update(token).digest('hex') : null
  next()
}
