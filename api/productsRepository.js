import { supabase } from './supabaseClient.js'

const DEFAULT_PRODUCT_PLACEMENT = {
  best_sellers: false,
  new_arrivals: false,
  current_offers: false,
}
const OFFER_TYPES = new Set(['none', 'limited_time', 'festival'])

function normalizeCategory(category) {
  if (!category) {
    return { selected: null, options: [] }
  }

  if (typeof category === 'string') {
    return { selected: category, options: [category] }
  }

  const options = Array.isArray(category.options) ? category.options : []

  return {
    selected: category.selected ?? null,
    subcategorySelected: category.subcategorySelected ?? null,
    options,
    subcategoryOptions: Array.isArray(category.subcategoryOptions) ? category.subcategoryOptions : [],
  }
}

function normalizeProductPlacement(productPlacement) {
  return {
    ...DEFAULT_PRODUCT_PLACEMENT,
    ...(productPlacement ?? {}),
  }
}

function normalizeOfferType(offerType) {
  return OFFER_TYPES.has(offerType) ? offerType : 'none'
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toIntegerOrNull(value) {
  const number = toNumberOrNull(value)
  return Number.isInteger(number) ? number : null
}

function toProductRow(payload) {
  const fallbackQuantity = toNumberOrNull(payload.weightQty)

  return {
    category: normalizeCategory(payload.category),
    category_id: payload.categoryId || null,
    subcategory_id: payload.subcategoryId || null,
    product_placement: normalizeProductPlacement(payload.productPlacement),
    product_name: payload.productName,
    weight_qty_float: toNumberOrNull(payload.weightQtyFloat) ?? fallbackQuantity,
    weight_qty_integer: toIntegerOrNull(payload.weightQtyInteger) ?? (Number.isInteger(fallbackQuantity) ? fallbackQuantity : null),
    weight_unit: ['kg', 'gram', 'ml'].includes(payload.weightUnit) ? payload.weightUnit : null,
    stock_number: toIntegerOrNull(payload.stockNumber),
    description: payload.description ?? null,
    ingredient: payload.ingredient ?? null,
    storage_text: payload.storageText ?? null,
    shelf_text: payload.shelfText ?? null,
    price: toIntegerOrNull(payload.price),
    offer_price: toIntegerOrNull(payload.offerPrice),
    offer_type: normalizeOfferType(payload.offerType),
    free_delivery: Boolean(payload.freeDelivery),
    image_urls: payload.imageUrls ?? [],
    draft: payload.draft ?? false,
    active: payload.active ?? true,
  }
}

function toProduct(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    productPlacement: row.product_placement,
    productName: row.product_name,
    weightQtyFloat: row.weight_qty_float,
    weightQtyInteger: row.weight_qty_integer,
    weightUnit: row.weight_unit,
    stockNumber: row.stock_number,
    description: row.description,
    ingredient: row.ingredient,
    storageText: row.storage_text,
    shelfText: row.shelf_text,
    price: row.price,
    offerPrice: row.offer_price,
    offerType: row.offer_type ?? 'none',
    freeDelivery: Boolean(row.free_delivery),
    imageUrls: row.image_urls,
    draft: row.draft,
    active: row.active,
  }
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert(toProductRow(payload))
    .select()
    .single()

  throwIfError(error)
  return toProduct(data)
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('products')
    .update(toProductRow(payload))
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toProduct(data)
}

export async function updateProductActive(id, active) {
  const { data, error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toProduct(data)
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  throwIfError(error)
}

export async function appendCategoryToProduct(id, categoryLabel) {
  const { data: product, error: findError } = await supabase
    .from('products')
    .select('category')
    .eq('id', id)
    .single()

  throwIfError(findError)

  const category = normalizeCategory(product.category)
  const options = category.options.includes(categoryLabel)
    ? category.options
    : [...category.options, categoryLabel]

  const { data, error } = await supabase
    .from('products')
    .update({
      category: {
        ...category,
        selected: category.selected ?? categoryLabel,
        options,
      },
    })
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return toProduct(data)
}

export async function fetchAvailableProducts() {
  const { data, error } = await supabase
    .from('products')
    .select()
    .eq('draft', false)
    .order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toProduct)
}

export async function fetchPublicProducts(filter = 'all') {
  let query = supabase
    .from('products')
    .select()
    .eq('draft', false)

  if (filter === 'offers') {
    query = query.or('offer_price.not.is.null,product_placement->>current_offers.eq.true,offer_type.neq.none')
  }

  if (filter === 'hot-selling') {
    query = query.eq('product_placement->>best_sellers', 'true')
  }

  if (filter === 'new-launched') {
    query = query.eq('product_placement->>new_arrivals', 'true')
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toProduct)
}

export async function fetchPublicPromotionalProducts() {
  const { data, error } = await supabase
    .from('products')
    .select()
    .eq('draft', false)
    .in('offer_type', ['limited_time', 'festival'])
    .order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toProduct)
}

export async function fetchDraftProducts() {
  const { data, error } = await supabase
    .from('products')
    .select()
    .eq('draft', true)
    .order('created_at', { ascending: false })

  throwIfError(error)
  return data.map(toProduct)
}
