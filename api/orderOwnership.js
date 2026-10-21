import { supabase } from './supabaseClient.js'
import { validateOrderId, paymentError } from './paymentValidation.js'

export function createOrderAuthorizer(client) {
 return async function requireOwnedOrder(orderId, sessionHash) {
  validateOrderId(orderId)
  if (!sessionHash) throw paymentError('Open this order in the browser where you placed it.', 403)
  const { data, error } = await client.from('orders').select('id')
    .eq('id', orderId).eq('owner_session_hash', sessionHash).maybeSingle()
  if (error) throw paymentError('Unable to check order access. Please retry.', 503)
  if (!data) throw paymentError('Order not found.', 404)
 }
}
export const requireOwnedOrder = createOrderAuthorizer(supabase)
