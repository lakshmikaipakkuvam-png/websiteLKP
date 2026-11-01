import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateDeliveryCharge, getItemWeightGrams, getWeightGrams } from '../admin-dashboard/src/delivery.js'

const chennai = { deliveryDistrict: 'Chennai', deliveryState: 'Tamil Nadu' }
const elsewhere = { deliveryDistrict: 'Coimbatore', deliveryState: 'Tamil Nadu' }

test('minimum charge and every kilogram boundary use the requested rates', () => {
  for (const [grams, chennaiCharge, outsideCharge] of [
    [1, 80, 100], [250, 80, 100], [999, 80, 100], [1000, 80, 100],
    [1001, 160, 200], [1999, 160, 200], [2000, 160, 200], [2001, 240, 300],
  ]) {
    assert.equal(calculateDeliveryCharge(chennai, grams), chennaiCharge)
    assert.equal(calculateDeliveryCharge(elsewhere, grams), outsideCharge)
  }
})

test('only Chennai district in Tamil Nadu gets the Chennai rate', () => {
  for (const address of [
    { deliveryDistrict: 'Bangalore', deliveryState: 'Karnataka' },
    { deliveryDistrict: 'Chennai', deliveryState: 'Karnataka' },
    { deliveryDistrict: 'Chengalpattu', deliveryState: 'Tamil Nadu' },
  ]) assert.equal(calculateDeliveryCharge(address, 1001), 200)
  assert.equal(calculateDeliveryCharge({ deliveryDistrict: ' CHENNAI ', deliveryState: ' Tamil Nadu ' }, 500), 80)
})

test('sum mixed product weights and quantities before rounding once', () => {
  const first = getWeightGrams({ weightQtyFloat: 0.25, weightUnit: 'kg' })
  const second = getWeightGrams({ weight_qty_integer: 500, weight_unit: 'gram' })
  assert.equal(calculateDeliveryCharge(chennai, first + second), 80)
  assert.equal(calculateDeliveryCharge(chennai, first * 3 + second), 160)
  const tenth = getWeightGrams({ weightQtyFloat: 0.1, weightUnit: 'kg' })
  assert.equal(calculateDeliveryCharge(chennai, tenth * 10), 80)
})

test('combo contents and combo quantities contribute to combined weight', () => {
  const combo = { items: [{ weightLabel: '0.5 Kg' }, { weightLabel: '250 gram' }] }
  assert.equal(getItemWeightGrams(combo), 750)
  assert.equal(calculateDeliveryCharge(elsewhere, getItemWeightGrams(combo) * 2), 200)
})

test('approved liquid estimate treats ml as grams', () => {
  assert.equal(getWeightGrams({ weightQtyInteger: 500, weightUnit: 'ml' }), 500)
  assert.equal(getItemWeightGrams({ items: [{ weightLabel: '1001 ml' }] }), 1001)
})

test('missing or invalid weights cannot silently undercharge', () => {
  for (const product of [{}, { weightQtyFloat: -1, weightUnit: 'kg' }, { weightLabel: 'unknown' }]) {
    assert.throws(() => getWeightGrams(product), /Shipping weight/)
  }
})
