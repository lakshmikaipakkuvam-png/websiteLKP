// Shared by the storefront estimate and the authoritative order calculation.
export function getWeightGrams(product) {
  const label = String(product.weightLabel ?? '').trim().match(/^([\d.]+)\s*(kg|gram|g|ml)$/i)
  const quantity = Number(product.weightQtyFloat ?? product.weight_qty_float
    ?? product.weightQtyInteger ?? product.weight_qty_integer ?? label?.[1])
  const unit = String(product.weightUnit ?? product.weight_unit ?? label?.[2] ?? '').toLowerCase()
  if (!Number.isFinite(quantity) || quantity <= 0 || !['kg', 'gram', 'g', 'ml'].includes(unit)) {
    throw new Error('Shipping weight must be configured for every product.')
  }
  // Launch policy: liquid volume is estimated at 1 ml = 1 gram.
  // Integer milligrams avoid floating-point errors at whole-kilogram boundaries.
  return Math.round(quantity * (unit === 'kg' ? 1000000 : 1000)) / 1000
}

export function getItemWeightGrams(product) {
  return Array.isArray(product.items)
    ? product.items.reduce((total, item) => total + getWeightGrams(item), 0)
    : getWeightGrams(product)
}

export function calculateDeliveryCharge(address, totalWeightGrams) {
  const district = String(address.deliveryDistrict ?? '').trim().toLowerCase()
  const state = String(address.deliveryState ?? '').trim().toLowerCase().replace(/\s+/g, '')
  const isChennai = ['chennai', 'madras'].includes(district) && state === 'tamilnadu'
  const kilograms = Math.max(1, Math.ceil(Math.round(totalWeightGrams * 1000) / 1000000))
  return kilograms * (isChennai ? 80 : 100)
}
