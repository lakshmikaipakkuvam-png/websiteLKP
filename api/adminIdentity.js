import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient.js'

export const adminIdentity = {
  async signIn(email, password) {
    // Never sign in on the shared service-role database client.
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data.session) return null
    return { user: data.user, accessToken: data.session.access_token, expiresIn: data.session.expires_in }
  },
  async getUser(token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (error) return null
    return data.user
  },
}
