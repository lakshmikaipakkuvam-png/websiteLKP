import { supabase } from './supabaseClient.js'
import { fetchProfile } from './profileRepository.js'

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : null
}

function normalizePhoneNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

function normalizeLocation(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function calculateDeliveryCharge(profile, payload) {
  const locationText = normalizeLocation(`${payload.deliveryDistrict ?? ''} ${payload.deliveryState ?? ''}`)

  if (locationText.includes('chennai') || locationText.includes('madras')) {
    return Number(profile?.deliveryChennaiAmount ?? 50)
  }

  if (locationText.includes('bangalore') || locationText.includes('bengaluru')) {
    return Number(profile?.deliveryBangaloreAmount ?? 70)
  }

  return Number(profile?.deliveryDefaultAmount ?? 60)
}

function normalizeDiscountCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : ''
}

function calculateDiscount(profile, payload, subtotalAmount) {
  const requestedCode = normalizeDiscountCode(payload.discountCode)
  const configuredCode = normalizeDiscountCode(profile?.discountCode)

  if (!requestedCode || !profile?.discountEnabled || !configuredCode || requestedCode !== configuredCode) {
    return { discountCode: null, discountAmount: 0 }
  }

  const minimumOrderAmount = Number(profile.discountMinOrderAmount ?? 0)

  if (subtotalAmount < minimumOrderAmount) {
    return { discountCode: null, discountAmount: 0 }
  }

  const discountValue = Number(profile.discountValue ?? 0)
  const discountAmount = profile.discountType === 'percent'
    ? Math.floor((subtotalAmount * Math.min(discountValue, 100)) / 100)
    : discountValue

  return {
    discountCode: configuredCode,
    discountAmount: Math.min(Math.max(discountAmount, 0), subtotalAmount),
  }
}

function getCategoryLabel(category) {
  if (typeof category === 'string') {
    return category
  }

  return category?.selected ?? category?.name ?? null
}

function formatQuantity(product) {
  const quantity = product.weight_qty_float ?? product.weight_qty_integer

  if (!quantity || !product.weight_unit) {
    return null
  }

  return `${quantity} ${product.weight_unit === 'kg' ? 'Kg' : product.weight_unit}`
}

function getProductPrice(product) {
  return product.offer_price && product.offer_price < product.price ? product.offer_price : product.price
}

function mergeOrderItems(items) {
  const mergedItemsByKey = new Map()

  for (const item of items) {
    const type = item.type ?? 'product'
    const id = type === 'combo' ? item.comboOfferId : item.productId
    const key = `${type}:${id}`
    const quantity = Number(item.quantity)
    const existing = mergedItemsByKey.get(key)

    mergedItemsByKey.set(key, {
      type,
      productId: type === 'product' ? id : null,
      comboOfferId: type === 'combo' ? id : null,
      quantity: (existing?.quantity ?? 0) + quantity,
    })
  }

  return [...mergedItemsByKey.values()]
}

function toOrder(row, items = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    whatsappNumber: row.whatsapp_number,
    deliveryAddress: row.delivery_address,
    deliveryPincode: row.delivery_pincode,
    deliveryState: row.delivery_state,
    deliveryDistrict: row.delivery_district,
    billingSameAsShipping: row.billing_same_as_shipping,
    billingName: row.billing_name,
    billingAddress: row.billing_address,
    billingCity: row.billing_city,
    billingState: row.billing_state,
    billingPincode: row.billing_pincode,
    billingPhone: row.billing_phone,
    customerNotes: row.customer_notes,
    subtotalAmount: row.subtotal_amount,
    deliveryCharge: row.delivery_charge ?? 0,
    discountCode: row.discount_code,
    discountAmount: row.discount_amount ?? 0,
    grandTotalAmount: row.grand_total_amount ?? row.subtotal_amount,
    status: row.status,
    trackingId: row.tracking_id,
    customerId: row.customer_id,
    customer: row.customers ? toCustomer(row.customers) : null,
    payment: Array.isArray(row.payments) ? row.payments.map(toPayment)[0] ?? null : null,
    feedback: Array.isArray(row.feedback_reviews) ? row.feedback_reviews.map(toFeedbackReview)[0] ?? null : null,
    items,
  }
}

function toCustomer(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    phoneNumber: row.phone_number,
    whatsappNumber: row.whatsapp_number,
    deliveryAddress: row.delivery_address,
    deliveryPincode: row.delivery_pincode,
    deliveryState: row.delivery_state,
    deliveryDistrict: row.delivery_district,
    billingSameAsShipping: row.billing_same_as_shipping,
    billingName: row.billing_name,
    billingAddress: row.billing_address,
    billingCity: row.billing_city,
    billingState: row.billing_state,
    billingPincode: row.billing_pincode,
    billingPhone: row.billing_phone,
    orderStatus: row.order_status,
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

function toOrderItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    comboOfferId: row.combo_offer_id,
    itemType: row.item_type,
    comboItems: row.combo_items,
    productName: row.product_name,
    productImageUrl: row.product_image_url,
    categoryLabel: row.category_label,
    weightLabel: row.weight_label,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  }
}

function createNotFoundError(message = 'Order not found') {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

function createOrderError(message, details, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.details = details
  return error
}

async function upsertCustomer(payload) {
  const customerRow = {
    customer_name: normalizeText(payload.customerName),
    phone_number: normalizePhoneNumber(payload.phoneNumber),
    whatsapp_number: normalizePhoneNumber(payload.whatsappNumber) || null,
    delivery_address: normalizeText(payload.deliveryAddress),
    delivery_pincode: normalizeText(payload.deliveryPincode),
    delivery_state: normalizeText(payload.deliveryState),
    delivery_district: normalizeText(payload.deliveryDistrict),
    billing_same_as_shipping: payload.billingSameAsShipping !== false,
    billing_name: payload.billingSameAsShipping === false ? normalizeText(payload.billingName) : null,
    billing_address: payload.billingSameAsShipping === false ? normalizeText(payload.billingAddress) : null,
    billing_city: payload.billingSameAsShipping === false ? normalizeText(payload.billingCity) : null,
    billing_state: payload.billingSameAsShipping === false ? normalizeText(payload.billingState) : null,
    billing_pincode: payload.billingSameAsShipping === false ? normalizeText(payload.billingPincode) : null,
    billing_phone: payload.billingSameAsShipping === false ? normalizeText(payload.billingPhone) : null,
    order_status: 'confirmed',
  }

  const { data, error } = await supabase
    .from('customers')
    .upsert(customerRow, { onConflict: 'phone_number' })
    .select()
    .single()

  throwIfError(error)
  return data
}

export async function createOrder(payload) {
  const mergedItems = mergeOrderItems(payload.items)
  const productIds = mergedItems.filter((item) => item.type === 'product').map((item) => item.productId)
  const comboOfferIds = mergedItems.filter((item) => item.type === 'combo').map((item) => item.comboOfferId)

  const { data: products, error: productsError } = productIds.length > 0
    ? await supabase
      .from('products')
      .select('id, category, product_name, weight_qty_float, weight_qty_integer, weight_unit, stock_number, price, offer_price, image_urls, draft, active, free_delivery')
      .in('id', productIds)
    : { data: [], error: null }

  throwIfError(productsError)

  const { data: comboOffers, error: comboOffersError } = comboOfferIds.length > 0
    ? await supabase
      .from('combo_offers')
      .select('id, combo_name, combo_price, image_urls, items, draft, active, free_delivery')
      .in('id', comboOfferIds)
    : { data: [], error: null }

  throwIfError(comboOffersError)

  const productsById = new Map(products.map((product) => [product.id, product]))
  const comboOffersById = new Map(comboOffers.map((comboOffer) => [comboOffer.id, comboOffer]))
  const unavailableItems = []

  const orderItems = mergedItems.map((item) => {
    if (item.type === 'combo') {
      const comboOffer = comboOffersById.get(item.comboOfferId)

      if (!comboOffer || comboOffer.draft || !comboOffer.active || !Number.isInteger(comboOffer.combo_price)) {
        unavailableItems.push(item.comboOfferId)
        return null
      }

      return {
        item_type: 'combo',
        product_id: null,
        combo_offer_id: comboOffer.id,
        combo_items: comboOffer.items,
        product_name: comboOffer.combo_name,
        product_image_url: comboOffer.image_urls?.[0] ?? null,
        category_label: 'Combo offer',
        weight_label: `${Array.isArray(comboOffer.items) ? comboOffer.items.length : 0} products`,
        quantity: item.quantity,
        unit_price: comboOffer.combo_price,
        line_total: comboOffer.combo_price * item.quantity,
        _free_delivery: Boolean(comboOffer.free_delivery),
      }
    }

    const product = productsById.get(item.productId)

    if (!product || product.draft || !product.active) {
      unavailableItems.push(item.productId)
      return null
    }

    if (product.stock_number !== null && product.stock_number !== undefined && item.quantity > product.stock_number) {
      unavailableItems.push(item.productId)
      return null
    }

    const unitPrice = getProductPrice(product)

    if (!Number.isInteger(unitPrice) || unitPrice < 0) {
      unavailableItems.push(item.productId)
      return null
    }

    return {
      item_type: 'product',
      product_id: product.id,
      combo_offer_id: null,
      combo_items: null,
      product_name: product.product_name,
      product_image_url: product.image_urls?.[0] ?? null,
      category_label: getCategoryLabel(product.category),
      weight_label: formatQuantity(product),
      quantity: item.quantity,
      unit_price: unitPrice,
      line_total: unitPrice * item.quantity,
      _free_delivery: Boolean(product.free_delivery),
    }
  }).filter(Boolean)

  if (unavailableItems.length > 0 || orderItems.length !== mergedItems.length) {
    throw createOrderError('Some products are unavailable for order.', {
      productIds: unavailableItems,
    })
  }

  const subtotalAmount = orderItems.reduce((total, item) => total + item.line_total, 0)
  const profile = await fetchProfile()
  const hasPaidDeliveryItems = orderItems.some((item) => !item._free_delivery)
  const deliveryCharge = hasPaidDeliveryItems ? calculateDeliveryCharge(profile, payload) : 0
  const { discountCode, discountAmount } = calculateDiscount(profile, payload, subtotalAmount)
  const grandTotalAmount = Math.max(subtotalAmount + deliveryCharge - discountAmount, 0)

  const customer = await upsertCustomer(payload)

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      customer_name: normalizeText(payload.customerName),
      phone_number: normalizePhoneNumber(payload.phoneNumber),
      whatsapp_number: normalizePhoneNumber(payload.whatsappNumber) || null,
      delivery_address: normalizeText(payload.deliveryAddress),
      delivery_pincode: normalizeText(payload.deliveryPincode),
      delivery_state: normalizeText(payload.deliveryState),
      delivery_district: normalizeText(payload.deliveryDistrict),
      billing_same_as_shipping: payload.billingSameAsShipping !== false,
      billing_name: payload.billingSameAsShipping === false ? normalizeText(payload.billingName) : null,
      billing_address: payload.billingSameAsShipping === false ? normalizeText(payload.billingAddress) : null,
      billing_city: payload.billingSameAsShipping === false ? normalizeText(payload.billingCity) : null,
      billing_state: payload.billingSameAsShipping === false ? normalizeText(payload.billingState) : null,
      billing_pincode: payload.billingSameAsShipping === false ? normalizeText(payload.billingPincode) : null,
      billing_phone: payload.billingSameAsShipping === false ? normalizeText(payload.billingPhone) : null,
      customer_notes: normalizeText(payload.customerNotes),
      subtotal_amount: subtotalAmount,
      delivery_charge: deliveryCharge,
      discount_code: discountCode,
      discount_amount: discountAmount,
      grand_total_amount: grandTotalAmount,
      status: 'confirmed',
    })
    .select()
    .single()

  throwIfError(orderError)

  const orderItemsWithOrderId = orderItems.map(({ _free_delivery, ...item }) => ({
    ...item,
    order_id: order.id,
  }))

  const { data: savedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsWithOrderId)
    .select()

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    throw itemsError
  }

  return toOrder({ ...order, customers: customer }, savedItems.map(toOrderItem))
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      payments (*),
      feedback_reviews (*),
      order_items (*)
    `)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'order_items', ascending: true })

  throwIfError(error)

  return data.map((order) => toOrder(
    order,
    (order.order_items ?? []).map(toOrderItem),
  ))
}

export async function fetchOrdersByCustomerPhone(phoneNumber) {
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber)

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      payments (*),
      feedback_reviews (*),
      order_items (*)
    `)
    .or(`phone_number.eq.${normalizedPhoneNumber},whatsapp_number.eq.${normalizedPhoneNumber}`)
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'order_items', ascending: true })

  throwIfError(error)

  return data.map((order) => toOrder(
    order,
    (order.order_items ?? []).map(toOrderItem),
  ))
}

export async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (*),
      payments (*),
      feedback_reviews (*),
      order_items (*)
    `)
    .eq('id', id)
    .single()

  if (error?.code === 'PGRST116') {
    throw createNotFoundError()
  }

  throwIfError(error)

  return toOrder(data, (data.order_items ?? []).map(toOrderItem))
}

export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select(`
      *,
      customers (*),
      payments (*),
      feedback_reviews (*),
      order_items (*)
    `)
    .single()

  if (error?.code === 'PGRST116') {
    throw createNotFoundError()
  }

  throwIfError(error)

  if (data.customer_id) {
    const { error: customerError } = await supabase
      .from('customers')
      .update({ order_status: status })
      .eq('id', data.customer_id)

    throwIfError(customerError)
  }

  return toOrder(data, (data.order_items ?? []).map(toOrderItem))
}

export async function updateOrderTrackingId(id, trackingId) {
  const normalizedTrackingId = typeof trackingId === 'string' && trackingId.trim()
    ? trackingId.trim()
    : null

  const { data, error } = await supabase
    .from('orders')
    .update({ tracking_id: normalizedTrackingId })
    .eq('id', id)
    .select(`
      *,
      customers (*),
      payments (*),
      feedback_reviews (*),
      order_items (*)
    `)
    .single()

  if (error?.code === 'PGRST116') {
    throw createNotFoundError()
  }

  throwIfError(error)
  return toOrder(data, (data.order_items ?? []).map(toOrderItem))
}
