import crypto from 'node:crypto'
import { supabase } from './supabaseClient.js'

function throwIfError(error) {
  if (error) {
    throw error
  }
}

function toPayment(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    orderId: row.order_id,
    customerId: row.customer_id,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    providerSignatureId: row.provider_signature_id,
    amount: row.amount,
    status: row.status,
  }
}

function createNotFoundError(message = 'Order not found') {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

export async function createTestPayment(orderId) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, subtotal_amount, grand_total_amount')
    .eq('id', orderId)
    .single()

  if (orderError?.code === 'PGRST116') {
    throw createNotFoundError()
  }

  throwIfError(orderError)

  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      customer_id: order.customer_id,
      provider: 'test',
      provider_order_id: `test_order_${crypto.randomUUID()}`,
      provider_payment_id: `test_pay_${crypto.randomUUID()}`,
      provider_signature_id: `test_sig_${crypto.randomUUID()}`,
      amount: order.grand_total_amount ?? order.subtotal_amount,
      status: 'success',
    })
    .select()
    .single()

  throwIfError(error)
  return toPayment(data)
}
