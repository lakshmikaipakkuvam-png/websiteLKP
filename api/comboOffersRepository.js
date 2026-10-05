import { supabase } from './supabaseClient.js'

const OFFER_TYPES = new Set(['none', 'limited_time', 'festival'])

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : null
}

function normalizeOfferType(offerType) {
  return OFFER_TYPES.has(offerType) ? offerType : 'none'
}

function toIntegerOrNull(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function getProductPrice(product) {
  return product.offer_price && product.offer_price < product.price ? product.offer_price : product.price
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

function toComboOffer(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comboName: row.combo_name,
    description: row.description,
    comboPrice: row.combo_price,
    imageUrls: row.image_urls,
    productIds: row.product_ids,
    items: row.items,
    offerType: row.offer_type ?? 'none',
    freeDelivery: Boolean(row.free_delivery),
    active: row.active,
    draft: row.draft,
  }
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

function createComboError(message, details, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.details = details
  return error
}

async function buildComboItems(productIds) {
  const uniqueProductIds = [...new Set(productIds)]

  if (uniqueProductIds.length === 0) {
    return { productIds: [], items: [] }
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, category, product_name, weight_qty_float, weight_qty_integer, weight_unit, price, offer_price, image_urls, draft, active')
    .in('id', uniqueProductIds)

  throwIfError(error)

  const productsById = new Map(products.map((product) => [product.id, product]))
  const unavailableProductIds = uniqueProductIds.filter((productId) => {
    const product = productsById.get(productId)
    return !product || product.draft || !product.active
  })

  if (unavailableProductIds.length > 0) {
    throw createComboError('Some selected products are unavailable for combo offers.', {
      productIds: unavailableProductIds,
    })
  }

  return {
    productIds: uniqueProductIds,
    items: uniqueProductIds.map((productId) => {
      const product = productsById.get(productId)

      return {
        productId: product.id,
        productName: product.product_name,
        productImageUrl: product.image_urls?.[0] ?? null,
        categoryLabel: getCategoryLabel(product.category),
        weightLabel: formatQuantity(product),
        unitPrice: getProductPrice(product),
      }
    }),
  }
}

async function toComboOfferRow(payload, draft) {
  const { productIds, items } = await buildComboItems(payload.productIds ?? [])

  return {
    combo_name: normalizeText(payload.comboName),
    description: normalizeText(payload.description),
    combo_price: toIntegerOrNull(payload.comboPrice),
    offer_type: normalizeOfferType(payload.offerType),
    free_delivery: Boolean(payload.freeDelivery),
    image_urls: payload.imageUrls ?? [],
    product_ids: productIds,
    items,
    active: payload.active ?? true,
    draft,
  }
}

export async function createComboOffer(payload, draft = false) {
  const row = await toComboOfferRow(payload, draft)
  const { data, error } = await supabase
    .from('combo_offers')
    .insert(row)
    .select()
    .single()

  throwIfError(error)
  return toComboOffer(data)
}

export async function updateComboOffer(id, payload) {
  const row = await toComboOfferRow(payload, payload.draft ?? false)
  const { data, error } = await supabase
    .from('combo_offers')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toComboOffer(data)
}

export async function updateComboOfferActive(id, active) {
  const { data, error } = await supabase
    .from('combo_offers')
    .update({ active })
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toComboOffer(data)
}

export async function deleteComboOffer(id) {
  const { error } = await supabase
    .from('combo_offers')
    .delete()
    .eq('id', id)

  throwIfError(error)
}

export async function fetchComboOffers({ draft } = {}) {
  let query = supabase
    .from('combo_offers')
    .select()

  if (typeof draft === 'boolean') {
    query = query.eq('draft', draft)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toComboOffer)
}

export async function fetchPublicComboOffers() {
  const { data, error } = await supabase
    .from('combo_offers')
    .select()
    .eq('draft', false)
    .order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toComboOffer)
}

export async function fetchPublicPromotionalComboOffers() {
  const { data, error } = await supabase
    .from('combo_offers')
    .select()
    .eq('draft', false)
    .in('offer_type', ['limited_time', 'festival'])
    .order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toComboOffer)
}
