import { randomBytes, createHash } from 'node:crypto'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

const publicReads = new Set(['/health', '/categories', '/products/public', '/combo-offers/public', '/special-offers/public', '/feedback-reviews/public', '/profile', '/customer-orders', '/orders/customer'])
const publicWrites = new Set(['/orders', '/create-order', '/verify-payment', '/payment-status', '/feedback-reviews', '/payments/test-success'])
const hash = (value) => createHash('sha256').update(value).digest('hex')

export function createAdminAuth({ identity, env = process.env, now = Date.now }) {
  const router = Router()
  const sessions = new Map()
  const production = env.NODE_ENV === 'production'
  const cookieName = production ? '__Host-lkp_admin' : 'lkp_admin'
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' }
  const allowedOrigins = new Set((env.CORS_ORIGIN ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const allowedIds = new Set((env.ADMIN_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const email = (env.ADMIN_EMAIL ?? 'lakshmikaipakkuvam@gmail.com').toLowerCase()
  const allowed = (user) => user && allowedIds.has(user.id) && user.email?.toLowerCase() === email && Boolean(user.email_confirmed_at)
  const readSession = (req) => {
    const cookies = (req.headers.cookie ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${cookieName}=`))
    if (cookies.length !== 1) return null
    const token = cookies[0].slice(cookieName.length + 1)
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? hash(token) : null
  }
  const csrf = (req, res, next) => {
    if (!allowedOrigins.has(req.get('origin')) || req.get('X-LKP-Request') !== 'admin') {
      return res.status(403).json({ error: 'Request origin was not accepted.' })
    }
    next()
  }
  const requireAdmin = async (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    const key = readSession(req)
    const session = key && sessions.get(key)
    if (!session || session.expires <= now()) {
      if (key) sessions.delete(key)
      return res.status(401).json({ error: 'Please sign in to the admin dashboard.' })
    }
    try {
      const user = await identity.getUser(session.accessToken)
      if (!allowed(user)) {
        sessions.delete(key)
        return res.status(401).json({ error: 'Your admin session has expired.' })
      }
      req.admin = { id: user.id, email: user.email }
      next()
    } catch {
      res.status(503).json({ error: 'Unable to validate the admin session. Please retry.' })
    }
  }
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
  router.post('/login', csrf, rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, validate: { xForwardedForHeader: false }, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many login attempts. Try again in 15 minutes.' } }), async (req, res) => {
    if (!allowedIds.size) return res.status(503).json({ error: 'Owner login has not been configured yet.' })
    if (typeof req.body?.email !== 'string' || typeof req.body?.password !== 'string' || req.body.email.length > 254 || req.body.password.length > 1024 || !req.body.password) {
      return res.status(400).json({ error: 'Enter your email and password.' })
    }
    try {
      const result = await identity.signIn(req.body.email.trim(), req.body.password)
      if (!result || !allowed(result.user)) return res.status(401).json({ error: 'Email or password was not accepted.' })
      for (const [key, session] of sessions) if (session.expires <= now()) sessions.delete(key)
      if (sessions.size >= 100) return res.status(503).json({ error: 'Please try signing in later.' })
      const token = randomBytes(32).toString('base64url')
      const lifetime = Math.min(3600, result.expiresIn ?? 3600) * 1000
      const oldKey = readSession(req)
      if (oldKey) sessions.delete(oldKey)
      sessions.set(hash(token), { accessToken: result.accessToken, expires: now() + lifetime })
      res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime })
      res.json({ user: { email: result.user.email } })
    } catch {
      res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please retry.' })
    }
  })
  router.get('/session', requireAdmin, (req, res) => res.json({ user: req.admin }))
  router.post('/logout', csrf, (req, res) => {
    const key = readSession(req)
    if (key) sessions.delete(key)
    res.clearCookie(cookieName, cookieOptions)
    res.json({ success: true })
  })
  const protectApi = (req, res, next) => {
    // Exact allowlist: new API endpoints require admin authentication by default.
    if ((['GET', 'HEAD'].includes(req.method) && publicReads.has(req.path)) || (req.method === 'POST' && publicWrites.has(req.path))) return next()
    requireAdmin(req, res, () => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
      csrf(req, res, next)
    })
  }
  return { router, protectApi }
}
