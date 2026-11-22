// Trang sản phẩm: ba phân khúc găng. Luật của người dùng: phân khúc cao hơn thì pin trâu hơn, dịch nhanh hơn.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { TIERS, price } from '../src/shop/tiers.js'

test('three_tiers_from_lite_to_pro', () => {
  assert.deepEqual(TIERS.map(t => t.id), ['lite', 'plus', 'pro'])
})

test('higher_tiers_have_longer_battery_and_faster_translation', () => {
  for (let i = 1; i < TIERS.length; i++) {
    const lo = TIERS[i - 1], hi = TIERS[i]
    assert.ok(hi.batteryHours > lo.batteryHours, `${hi.id} phải có pin lâu hơn ${lo.id}`)
    assert.ok(hi.latencySec < lo.latencySec, `${hi.id} phải dịch nhanh hơn ${lo.id}`)
    assert.ok(hi.priceMillion > lo.priceMillion, `${hi.id} phải đắt hơn ${lo.id}`)
  }
})

test('prices_are_written_in_full_dong', () => {
  assert.deepEqual(TIERS.map(price), ['600.000đ', '3.490.000đ', '4.990.000đ'])
})

test('every_tier_has_a_picture_and_its_parts', () => {
  for (const t of TIERS) {
    assert.ok(existsSync(new URL(`../public/san-pham/${t.id}.webp`, import.meta.url)), `thiếu ảnh ${t.id}`)
    for (const key of ['fingers', 'hand', 'camera', 'brain', 'battery', 'speaker']) assert.ok(t.parts[key], `${t.id} thiếu ${key}`)
  }
})
