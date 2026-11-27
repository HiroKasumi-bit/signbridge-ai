// Mạng nơ-ron ASL: bản chạy trên web (src/net.js) phải ra cùng kết quả với Python (ai/nn/export.py ghi mẫu đối chiếu).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { D } from '../src/features.js'
import { predict } from '../src/model.js'

const fx = JSON.parse(readFileSync(new URL('../../ai/tests/fixtures/parity_nn.json', import.meta.url)))
const model = JSON.parse(readFileSync(new URL('../public/model/asl.json', import.meta.url)))
const close = (a, b, tol) => {
  assert.equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) <= tol, `index ${i}: ${a[i]} vs ${b[i]}`)
}
const frames = s => s.frames.map(f => Float32Array.from(f))

test('net_probs_match_python', () => {
  for (const s of fx.samples) close(predict(model, null, frames(s)).probs, s.probs, 1e-3)
})

test('net_answers_with_its_own_word_list', () => {
  const r = predict(model, null, frames(fx.samples[0]))
  assert.ok(model.net.labels.includes(r.label))
})

test('without_frames_the_linear_model_still_answers', () => {
  // từ người dùng tự dạy (custom.js) chỉ có vector tóm tắt, không có khung: vẫn dùng phần LDA cũ
  const r = predict(model, new Float32Array(D))
  assert.ok(model.labels.includes(r.label))
  assert.equal(r.probs.length, model.labels.length)
})

test('net_runs_fast_enough_for_live_camera', () => {
  const f = frames(fx.samples[0])
  predict(model, null, f) // lần đầu giải mã trọng số
  const t0 = performance.now()
  for (let i = 0; i < 10; i++) predict(model, null, f)
  const ms = (performance.now() - t0) / 10
  console.log(`    mạng nơ-ron: ${ms.toFixed(1)} ms mỗi ký hiệu`)
  assert.ok(ms < 150, `${ms} ms`)
})
