import { supabase } from './supabaseClient.js'

function throwIfError(error) {
  if (error) {
    throw error
  }
}

function toFeedbackReview(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    orderId: row.order_id,
    customerId: row.customer_id,
    paymentId: row.payment_id,
    rating: row.rating,
    message: row.message,
  }
}

function toPublicFeedbackReview(row) {
  const linkedCustomer = Array.isArray(row.customers) ? row.customers[0] : row.customers
  const linkedOrder = Array.isArray(row.orders) ? row.orders[0] : row.orders

  return {
    id: row.id,
    createdAt: row.created_at,
    source: 'customer',
    rating: row.rating,
    message: row.message,
    imageUrls: [],
    customerName: linkedOrder?.customer_name ?? linkedCustomer?.customer_name ?? 'Customer',
  }
}

function toAdminCustomerReview(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: 'admin',
    rating: row.rating,
    message: row.message,
    imageUrls: row.image_urls ?? [],
    customerName: row.customer_name || 'Verified customer',
    active: row.active,
  }
}

export async function createFeedbackReview(payload) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id')
    .eq('id', payload.orderId)
    .single()

  throwIfError(orderError)

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, order_id, customer_id, status')
    .eq('id', payload.paymentId)
    .eq('order_id', order.id)
    .eq('status', 'success')
    .single()

  throwIfError(paymentError)

  const { data, error } = await supabase
    .from('feedback_reviews')
    .upsert({
      order_id: order.id,
      customer_id: payment.customer_id ?? order.customer_id,
      payment_id: payment.id,
      rating: Number(payload.rating),
      message: typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : null,
    }, { onConflict: 'order_id' })
    .select()
    .single()

  throwIfError(error)
  return toFeedbackReview(data)
}

export async function fetchPublicFeedbackReviews(limit = 4) {
  const [{ data: customerReviews, error }, { data: adminReviews, error: adminError }] = await Promise.all([
    supabase
    .from('feedback_reviews')
    .select('id, created_at, rating, message, customers(customer_name), orders(customer_name)')
    .not('message', 'is', null)
    .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('admin_customer_reviews')
      .select()
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  throwIfError(error)
  throwIfError(adminError)

  return [
    ...(customerReviews ?? [])
    .filter((review) => typeof review.message === 'string' && review.message.trim())
      .map(toPublicFeedbackReview),
    ...(adminReviews ?? []).map(toAdminCustomerReview),
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, limit)
}

export async function fetchAdminCustomerReviews() {
  const { data, error } = await supabase
    .from('admin_customer_reviews')
    .select()
    .order('created_at', { ascending: false })

  throwIfError(error)
  return (data ?? []).map(toAdminCustomerReview)
}

export async function createAdminCustomerReview(payload) {
  const row = {
    customer_name: typeof payload.customerName === 'string' && payload.customerName.trim() ? payload.customerName.trim() : null,
    rating: payload.rating ? Number(payload.rating) : null,
    message: typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : null,
    image_urls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
    active: payload.active !== false,
  }

  const { data, error } = await supabase
    .from('admin_customer_reviews')
    .insert(row)
    .select()
    .single()

  throwIfError(error)
  return toAdminCustomerReview(data)
}

export async function updateAdminCustomerReviewActive(id, active) {
  const { data, error } = await supabase
    .from('admin_customer_reviews')
    .update({ active })
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toAdminCustomerReview(data)
}

export async function deleteAdminCustomerReview(id) {
  const { error } = await supabase
    .from('admin_customer_reviews')
    .delete()
    .eq('id', id)

  throwIfError(error)
}
