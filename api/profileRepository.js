import { supabase } from './supabaseClient.js'

function emptyToNull(value) {
  if (typeof value !== 'string') {
    return value ?? null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNonNegativeInteger(value, fallback) {
  const amount = Number(value)
  return Number.isInteger(amount) && amount >= 0 ? amount : fallback
}

function toProfileRow(payload) {
  return {
    name: payload.name.trim(),
    number: payload.number.trim(),
    address: payload.address.trim(),
    instagram_link: emptyToNull(payload.instagramLink),
    facebook_link: emptyToNull(payload.facebookLink),
    whatsapp: emptyToNull(payload.whatsapp),
    delivery_chennai_amount: toNonNegativeInteger(payload.deliveryChennaiAmount, 50),
    delivery_bangalore_amount: toNonNegativeInteger(payload.deliveryBangaloreAmount, 70),
    delivery_default_amount: toNonNegativeInteger(payload.deliveryDefaultAmount, 60),
    discount_enabled: Boolean(payload.discountEnabled),
    discount_code: emptyToNull(payload.discountCode)?.toUpperCase() ?? null,
    discount_type: payload.discountType === 'percent' ? 'percent' : 'amount',
    discount_value: toNonNegativeInteger(payload.discountValue, 0),
    discount_min_order_amount: toNonNegativeInteger(payload.discountMinOrderAmount, 0),
  }
}

function toProfile(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    number: row.number,
    address: row.address,
    instagramLink: row.instagram_link,
    facebookLink: row.facebook_link,
    whatsapp: row.whatsapp,
    deliveryChennaiAmount: row.delivery_chennai_amount ?? 50,
    deliveryBangaloreAmount: row.delivery_bangalore_amount ?? 70,
    deliveryDefaultAmount: row.delivery_default_amount ?? 60,
    discountEnabled: Boolean(row.discount_enabled),
    discountCode: row.discount_code ?? '',
    discountType: row.discount_type ?? 'amount',
    discountValue: row.discount_value ?? 0,
    discountMinOrderAmount: row.discount_min_order_amount ?? 0,
  }
}

function throwIfError(error) {
  if (error) {
    throw error
  }
}

export async function fetchProfile() {
  const { data, error } = await supabase
    .from('profile')
    .select()
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  throwIfError(error)
  return data ? toProfile(data) : null
}

export async function saveProfile(payload) {
  const currentProfile = await fetchProfile()
  const row = toProfileRow(payload)

  if (!currentProfile) {
    const { data, error } = await supabase
      .from('profile')
      .insert(row)
      .select()
      .single()

    throwIfError(error)
    return toProfile(data)
  }

  const { data, error } = await supabase
    .from('profile')
    .update(row)
    .eq('id', currentProfile.id)
    .select()
    .single()

  throwIfError(error)
  return toProfile(data)
}
