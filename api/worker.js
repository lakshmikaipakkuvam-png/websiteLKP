import { env, DurableObject } from 'cloudflare:workers'
import { httpServerHandler } from 'cloudflare:node'
import { createApp } from './app.js'
import Razorpay from 'razorpay'

// Persist opaque admin sessions across Worker instances. No public route exposes this object.
export class AdminSessions extends DurableObject {
  async get(key) { return this.ctx.storage.get(`session:${key}`) }
  async set(key, session) { await this.ctx.storage.put(`session:${key}`, session) }
  async delete(key) { return this.ctx.storage.delete(`session:${key}`) }
  async entries() {
    return [...await this.ctx.storage.list({ prefix: 'session:' })]
      .map(([key, value]) => [key.slice('session:'.length), value])
  }
  async count() { return (await this.ctx.storage.list({ prefix: 'session:' })).size }
}

const sessionStore = {
  get: (key) => env.ADMIN_SESSIONS.getByName('shop-admin').get(key),
  set: (key, value) => env.ADMIN_SESSIONS.getByName('shop-admin').set(key, value),
  delete: (key) => env.ADMIN_SESSIONS.getByName('shop-admin').delete(key),
  entries: () => env.ADMIN_SESSIONS.getByName('shop-admin').entries(),
  count: () => env.ADMIN_SESSIONS.getByName('shop-admin').count(),
}
const app = createApp({
  sessions: sessionStore, trustProxy: 1, serveFrontend: false,
  configureApi(app) {
    // Protected by the existing admin middleware; performs no payment mutations.
    app.get('/api/runtime-readiness', async (_req, res) => {
      try {
        const gateway = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
        await gateway.orders.all({ count: 1 })
        res.json({ gatewayReady: true })
      } catch {
        res.status(503).json({ gatewayReady: false })
      }
    })
  },
})
app.listen(3000)
const handler = httpServerHandler({ port: 3000 })

export default {
  async fetch(request, bindings, context) {
    // Only a trusted Cloudflare client address is forwarded to Express's rate limiter.
    const headers = new Headers(request.headers)
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '127.0.0.1')
    return handler.fetch(new Request(request, { headers }), bindings, context)
  },
}
