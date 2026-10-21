import { supabase } from './supabaseClient.js'
import { paymentError } from './paymentValidation.js'

function throwIfError(error) {
  if (error) {
    throw paymentError('Payment information could not be saved or loaded. Please retry.', 500)
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
    amount: row.amount,
    status: row.status,
    mode: row.payment_mode,
    refundedAmountPaise: Number(row.refunded_amount_paise ?? 0),
  }
}

export async function getOrder(orderId) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, subtotal_amount, grand_total_amount, status, razorpay_order_id, payment_mode, payment_state')
    .eq('id', orderId)
    .single()

  if (orderError?.code === 'PGRST116') {
    throw paymentError('Order not found.', 404)
  }

  throwIfError(orderError)
  return order
}

export async function attachProviderOrder(orderId, providerOrderId, mode) {
  // A concurrent retry must return the same attached provider order.
  const { data, error } = await supabase.from('orders')
    .update({ razorpay_order_id: providerOrderId, payment_mode: mode })
    .eq('id', orderId).is('razorpay_order_id', null).select('razorpay_order_id').maybeSingle()
  throwIfError(error)
  return data?.razorpay_order_id ?? (await getOrder(orderId)).razorpay_order_id
}

export async function getPayment(orderId) {
  const { data, error } = await supabase.from('payments').select('*')
    .eq('order_id', orderId).eq('provider', 'razorpay').eq('status', 'success').maybeSingle()
  throwIfError(error)
  return data ? toPayment(data) : null
}

export async function savePayment(order, payment, mode) {
  const { data, error } = await supabase.rpc('lkp_record_payment', {
    p_provider_order_id: order.razorpay_order_id, p_payment_id: payment.id,
    p_amount_paise: payment.amount, p_currency: payment.currency, p_mode: mode,
    p_refunded_paise: Number(payment.amount_refunded ?? 0),
  })
  throwIfError(error)
  return toPayment(data)
}

export async function getOrderByProviderId(providerId) {
  const { data, error } = await supabase.from('orders').select('id').eq('razorpay_order_id', providerId).maybeSingle()
  throwIfError(error)
  return data ? getOrder(data.id) : null
}
