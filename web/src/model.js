// "Bộ não" AI, trọng số lưu trong public/model/<vsl|asl>.json:
// - LDA (ai/train.py): nhân ma trận + softmax trên vector tóm tắt của ký hiệu. Luôn có; cũng là "không gian ký hiệu"
//   để so các từ người dùng tự dạy (custom.js).
// - Mạng nơ-ron (ai/nn/, khoá "net", nếu có): xem cả chuỗi khung, chính xác hơn; dùng khi có khung của ký hiệu.
// Không cần thư viện AI nào.
import { runNet } from './net.js'

// Nhãn "không phải từ nào": AI học nó từ video của các từ nó không dạy, để biết bỏ qua cử động bừa.
// Phải trùng với OTHER trong ai/train.py.
export const OTHER = '_khác'

const bytes = b64 => {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}
const f32 = b64 => new Float32Array(bytes(b64))

// Trọng số lưu dạng số nguyên 8-bit (nhẹ gấp 4 lần), mỗi cột một hệ số tỉ lệ: W = số nguyên × hệ số.
const weights = (l, cols) => {
  const scale = f32(l.scale)
  return Float32Array.from(new Int8Array(bytes(l.W)), (q, i) => q * scale[i % cols])
}

// Giải mã trọng số (base64 -> số thực) một lần, ghi đè vào chính object model.
function decode(model) {
  if (model._ready) return model
  model.mean = f32(model.mean)
  model.std = f32(model.std)
  model.layers = model.layers.map(l => ({ W: weights(l, l.shape[1]), b: f32(l.b), rows: l.shape[0], cols: l.shape[1] }))
  model._ready = true
  return model
}

export async function loadModel(url) {
  return decode(await (await fetch(url)).json())
}

/** Điểm thô của AI cho từng từ (trước khi đổi ra xác suất). Cũng dùng làm "không gian ký hiệu" cho từ tự dạy. */
export function scores(model, vec) {
  decode(model)
  let x = vec.map((v, i) => (v - model.mean[i]) / model.std[i])
  model.layers.forEach(({ W, b, rows, cols }, li) => {
    const y = new Float32Array(b)
    for (let r = 0; r < rows; r++) {
      const xr = x[r]
      if (xr === 0) continue
      const off = r * cols
      for (let c = 0; c < cols; c++) y[c] += xr * W[off + c]
    }
    x = li < model.layers.length - 1 ? y.map(v => (v > 0 ? v : 0)) : y
  })
  return x
}

/** Đoán từ cho một ký hiệu. frames (khung của ký hiệu): có thì dùng mạng nơ-ron (nếu model có), không thì LDA. */
export function predict(model, vec, frames = null) {
  const net = frames && model.net
  const x = net ? runNet(model.net, frames) : scores(model, vec)
  const labels = net ? model.net.labels : model.labels
  const m = Math.max(...x)
  const e = x.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  const probs = e.map(v => v / s)
  let best = 0
  probs.forEach((p, i) => { if (p > probs[best]) best = i })
  return { label: labels[best], prob: probs[best], probs }
}
