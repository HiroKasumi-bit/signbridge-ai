// Từ tự dạy: người dùng ghi vài mẫu cho một từ, app nhận bằng cách so với mẫu gần nhất.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { D } from '../src/features.js'
import { createCustom as makeCustom, MIN_SAMPLES } from '../src/custom.js'
import { createRecognizer } from '../src/recognizer.js'
import { F } from '../src/features.js'
import { OTHER } from '../src/model.js'

const model = {}
const memStore = () => { const m = new Map(); return { get: k => m.get(k) ?? null, set: (k, v) => m.set(k, v) } }
// so thẳng vector (thay cho không gian của AI); AI chính luôn đoán "không phải từ nào"
const OPTS = { embed: v => v, main: () => ({ label: OTHER, prob: 0.9 }) }
const createCustom = (m, sign, store, opts = OPTS) => makeCustom(m, sign, store, opts)
// vector quanh một "tâm": mỗi mẫu lệch ngẫu nhiên nhỏ (như mỗi lần làm ký hiệu hơi khác nhau)
let seed = 1
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
const around = (center, spread = 0.15) => Float32Array.from({ length: D }, (_, i) => center[i] + spread * rnd())
const A = Float32Array.from({ length: D }, (_, i) => Math.sin(i))
const B = Float32Array.from({ length: D }, (_, i) => Math.cos(i * 1.7))

function taught(store = memStore()) {
  const c = createCustom(model, 'vsl', store)
  for (let k = 0; k < 5; k++) { c.add('xin_chào', around(A)); c.add('cảm_ơn', around(B)) }
  return c
}

test('recognizes_a_new_sample_of_a_taught_word', () => {
  assert.equal(taught().match(around(A))?.label, 'xin_chào')
  assert.equal(taught().match(around(B))?.label, 'cảm_ơn')
})

test('ignores_movements_far_from_every_taught_word', () => {
  const far = Float32Array.from({ length: D }, (_, i) => 3 * Math.sin(i * 0.37 + 1))
  assert.equal(taught().match(far), null)
})

test('ignores_a_movement_halfway_between_two_words', () => {
  const mid = A.map((a, i) => (a + B[i]) / 2)
  assert.equal(taught().match(mid), null)
})

test('a_word_needs_a_few_samples_before_it_counts', () => {
  const c = createCustom(model, 'vsl', memStore())
  for (let k = 0; k < MIN_SAMPLES - 1; k++) c.add('tạm_biệt', around(A))
  assert.equal(c.match(around(A)), null)
  c.add('tạm_biệt', around(A))
  assert.equal(c.match(around(A))?.label, 'tạm_biệt')
})

test('samples_are_kept_per_sign_language_and_survive_reload', () => {
  const store = memStore()
  taught(store)
  assert.equal(createCustom(model, 'vsl', store).count('xin_chào'), 5)
  assert.equal(createCustom(model, 'asl', store).count('xin_chào'), 0)
})

test('clearing_a_word_forgets_it', () => {
  const c = taught()
  c.clear('xin_chào')
  assert.equal(c.count('xin_chào'), 0)
  assert.notEqual(c.match(around(A))?.label, 'xin_chào')
})

test('the_main_ai_can_veto_when_it_is_sure_of_a_word_it_knows', () => {
  const c = taught()
  assert.equal(c.match(around(A), { label: 'ho', prob: 0.95 }), null)
  assert.equal(c.match(around(A), { label: 'ho', prob: 0.3 })?.label, 'xin_chào')
})

test('no_veto_when_the_taught_samples_themselves_look_like_that_word', () => {
  // ký hiệu "xin chào" của người dùng tình cờ giống từ "ho" mà AI đã biết: không được chặn nhầm
  const c = createCustom(model, 'vsl', memStore(), { embed: v => v, main: () => ({ label: 'ho', prob: 0.9 }) })
  for (let k = 0; k < 5; k++) c.add('xin_chào', around(A))
  assert.equal(c.match(around(A), { label: 'ho', prob: 0.9 })?.label, 'xin_chào')
})

// ---- nối vào bộ nhận diện ----
const handFrame = () => { const f = new Float32Array(F); f.fill(0.1); f[F - 2] = 0; f[F - 1] = 1; return f }
const rest = () => new Float32Array(F)
const sign = () => [...Array.from({ length: 30 }, handFrame), ...Array.from({ length: 10 }, rest)]

test('a_taught_word_wins_over_the_main_model', () => {
  const custom = { match: () => ({ label: 'xin_chào', prob: 0.9 }) }
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.99 }), custom })
  const hits = sign().map((f, i) => rec.push(f, i * 33)).filter(Boolean)
  assert.deepEqual(hits.map(h => h.word), ['xin_chào'])
})

test('teaching_mode_hands_each_sign_to_the_recorder_and_says_nothing', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.99 }) })
  const recorded = []
  rec.teach(frames => recorded.push(frames.length))
  const hits = sign().map((f, i) => rec.push(f, i * 33)).filter(Boolean)
  assert.deepEqual(hits, [])
  assert.deepEqual(recorded, [30])
})
