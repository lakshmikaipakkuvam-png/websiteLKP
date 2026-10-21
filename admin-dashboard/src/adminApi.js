// Admin cookies belong to the site's origin. Vite proxies /api in development.
export const ADMIN_API_URL = '/api'

export async function adminFetch(url, options = {}) {
  const headers = new Headers(options.headers)
  if (!['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase())) headers.set('X-LKP-Request', 'admin')
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin', cache: 'no-store' })
  if (response.status === 401 && !url.endsWith('/login')) window.dispatchEvent(new Event('admin-session-expired'))
  return response
}
