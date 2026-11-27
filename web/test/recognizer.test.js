import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRecognizer } from '../src/recognizer.js'
import { F } from '../src/features.js'
import { OTHER } from '../src/model.js'

// Khung "đang giơ tay": cổ tay ngang vai (y≈0.1 đơn vị vai), có tay phải.
const handFrame = () => { const f = new Float32Array(F); f.fill(0.1); f[F - 2] = 0; f[F - 1] = 1; return f }
// Khung "hạ tay": không thấy bàn tay.
const emptyFrame = () => new Float32Array(F)
// Khung "tay thả thấp": thấy bàn tay nhưng cổ tay ở dưới thắt lưng (y = 1.5 đơn vị vai).
const lowFrame = () => { const f = handFrame(); f[16] = 1.5; f[19] = 1.5; return f }
const run = (rec, frames, t0 = 0) => frames.map((f, i) => rec.push(f, t0 + i * 33)).filter(Boolean)
const many = (n, make) => Array.from({ length: n }, make)

test('no_hands_never_fires', () => {
  let calls = 0
  const rec = createRecognizer({}, { predictFn: () => { calls++; return { label: 'ho', prob: 0.99 } } })
  assert.equal(run(rec, many(60, emptyFrame)).length, 0)
  assert.equal(calls, 0)
})

test('sign_then_rest_fires_once', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.9 }) })
  const events = run(rec, [...many(30, handFrame), ...many(10, emptyFrame)])
  assert.deepEqual(events.map(e => e.word), ['ho'])
})

test('decides_on_the_whole_sign_after_hands_drop', () => {
  // AI chỉ được hỏi cho trọn ký hiệu: lần chốt dùng đủ 30 khung có tay, và xảy ra sau khi hạ tay.
  const seen = []
  const rec = createRecognizer({}, { predictFn: (m, v, frames) => { seen.push(frames.length); return { label: 'ho', prob: 0.9 } } })
  const frames = [...many(30, handFrame), ...many(10, emptyFrame)]
  const firedAt = frames.findIndex((f, i) => rec.push(f, i * 33))
  assert.ok(firedAt >= 30, `chốt quá sớm ở khung ${firedAt}`)
  assert.equal(seen.at(-1), 30)
})

test('lowered_hands_count_as_rest', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.9 }) })
  assert.equal(run(rec, [...many(30, handFrame), ...many(10, lowFrame)]).length, 1)
})

test('holding_the_same_sign_does_not_repeat', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.9 }) })
  assert.equal(run(rec, many(300, handFrame)).length, 1) // ~10 giây giữ tay
})

test('two_signs_separated_by_rest', () => {
  let label = 'ho'
  const rec = createRecognizer({}, { predictFn: () => ({ label, prob: 0.9 }) })
  const a = run(rec, [...many(30, handFrame), ...many(10, emptyFrame)], 0)
  label = 'mệt'
  const b = run(rec, [...many(30, handFrame), ...many(10, emptyFrame)], 2000)
  assert.deepEqual([...a, ...b].map(e => e.word), ['ho', 'mệt'])
})

test('short_blip_is_ignored', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.9 }) })
  assert.equal(run(rec, [...many(4, handFrame), ...many(10, emptyFrame)]).length, 0)
})

test('low_confidence_never_fires', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.3 }) })
  assert.equal(run(rec, [...many(30, handFrame), ...many(10, emptyFrame)]).length, 0)
})

test('not_a_sign_never_fires', () => {
  // AI trả lời "không phải từ nào" (cử động bừa) -> không ra chữ, dù tự tin đến đâu.
  const rec = createRecognizer({}, { predictFn: () => ({ label: OTHER, prob: 0.99 }) })
  assert.equal(run(rec, [...many(30, handFrame), ...many(10, emptyFrame)]).length, 0)
})

test('not_a_sign_shows_no_preview', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: OTHER, prob: 0.99 }) })
  run(rec, many(30, handFrame))
  assert.equal(rec.current, null)
})

test('weak_guess_shows_no_preview', () => {
  const rec = createRecognizer({}, { predictFn: () => ({ label: 'ho', prob: 0.1 }) })
  run(rec, many(30, handFrame))
  assert.equal(rec.current, null)
})

test('threshold_comes_from_the_model', () => {
  // Ngưỡng tự tin được chọn lúc train (đo trên người lạ) và lưu trong model.json.
  const rec = createRecognizer({ minProb: 0.2 }, { predictFn: () => ({ label: 'ho', prob: 0.3 }) })
  assert.equal(run(rec, [...many(30, handFrame), ...many(10, emptyFrame)]).length, 1)
})

test('long_continuous_signing_is_cut_at_max_length', () => {
  let n = 0
  const rec = createRecognizer({}, { predictFn: () => ({ label: ++n < 40 ? 'ho' : 'mệt', prob: 0.9 }) })
  const words = run(rec, many(240, handFrame)).map(e => e.word) // 8 giây liền không hạ tay
  assert.ok(words.length >= 1 && words[0] === 'ho')
})

test('a_neural_net_model_previews_less_often', () => {
  // mạng nơ-ron nặng hơn LDA (~50 ms mỗi lần): chữ xem trước được đoán thưa hơn để camera không giật
  const count = model => {
    let calls = 0
    const rec = createRecognizer(model, { predictFn: () => { calls++; return { label: 'ho', prob: 0.9 } } })
    run(rec, many(40, handFrame))
    return calls
  }
  assert.ok(count({ net: {} }) <= count({}) / 2, `${count({ net: {} })} vs ${count({})}`)
})
