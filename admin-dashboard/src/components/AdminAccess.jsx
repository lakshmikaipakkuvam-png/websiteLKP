import { useEffect, useState } from 'react'
import { adminFetch, ADMIN_API_URL } from '../adminApi'

export default function AdminAccess({ children }) {
  const [state, setState] = useState('loading')
  const [email, setEmail] = useState('lakshmikaipakkuvam@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const expired = () => { setState('login'); setError('Please sign in again.') }
    window.addEventListener('admin-session-expired', expired)
    adminFetch(`${ADMIN_API_URL}/auth/admin/session`).then((response) => {
      if (active) setState(response.ok ? 'signed-in' : 'login')
    }).catch(() => { if (active) { setState('login'); setError('Unable to connect. Please retry.') } })
    return () => { active = false; window.removeEventListener('admin-session-expired', expired) }
  }, [])
  async function login(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await adminFetch(`${ADMIN_API_URL}/auth/admin/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.')
      setPassword(''); setState('signed-in')
    } catch (failure) { setError(failure.message || 'Unable to sign in.') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try {
      const response = await adminFetch(`${ADMIN_API_URL}/auth/admin/logout`, { method: 'POST' })
      if (!response.ok) throw new Error('Sign-out failed. Please retry.')
      setState('login'); setPassword('')
    } catch { setError('Unable to sign out. Please retry.') }
    finally { setBusy(false) }
  }
  if (state === 'loading') return <main className="p-8" role="status">Checking your session…</main>
  if (state === 'signed-in') return <>
    <div className="flex items-center justify-end gap-4 bg-white px-5 py-2 text-sm">
      {error && <span role="alert">{error}</span>}
      <button type="button" onClick={logout} disabled={busy} className="rounded border px-4 py-2">Sign out</button>
    </div>
    {children}
  </>
  return <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
    <form onSubmit={login} className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Owner sign in</h1>
      <p className="text-sm text-gray-600">Lakshmi Kai Pakkuvam administration</p>
      <label className="block">Email<input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 block w-full rounded border p-3" /></label>
      <label className="block">Password<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 block w-full rounded border p-3" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-black p-3 text-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      <a href="/" className="block text-center text-sm underline">Back to shop</a>
    </form>
  </main>
}
