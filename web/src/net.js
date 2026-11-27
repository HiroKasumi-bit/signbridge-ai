// Mạng nơ-ron nhận ký hiệu (dạy bằng ai/nn/train.py, xuất bằng ai/nn/export.py): xem cả chuỗi khung của một
// ký hiệu thay vì một vector tóm tắt, nên chính xác hơn LDA. Chỉ là phép nhân ma trận, không cần thư viện AI.
//   khung (N × 149) -> L khung đều nhau -> 184 số mỗi khung + tốc độ (368) -> chuẩn hoá
//   -> [tích chập theo thời gian ×3 + Transformer] × nhóm -> trung bình theo thời gian -> điểm từng từ.
import { F, perFrame } from './features.js'

const B = 184 // số mỗi khung (features.js perFrame)
const bytes = b64 => { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer }
const f32 = b64 => new Float32Array(bytes(b64))
// Trọng số lớp tuyến tính lưu 8-bit, mỗi cột một hệ số tỉ lệ (nhẹ gấp 4 lần)
const lin = l => {
  const q = new Int8Array(bytes(l.W)), scale = f32(l.scale), cols = l.shape[1]
  return { W: Float32Array.from(q, (v, i) => v * scale[i % cols]), b: f32(l.b), rows: l.shape[0], cols }
}
const norm = l => ({ g: f32(l.g), b: f32(l.b) })

/** Giải mã trọng số một lần, ghi đè vào chính object. */
export function decodeNet(net) {
  if (net._ready) return net
  net.mean = f32(net.mean); net.std = f32(net.std)
  net.stem = lin(net.stem); net.top = lin(net.top); net.head = lin(net.head)
  net.blocks = net.blocks.map(b => b.conv
    ? { conv: { fc1: lin(b.conv.fc1), fc2: lin(b.conv.fc2), dw: f32(b.conv.dw), dwb: f32(b.conv.dwb), k: b.conv.k, eca: f32(b.conv.eca) } }
    : { attn: { ln1: norm(b.attn.ln1), ln2: norm(b.attn.ln2), qkv: lin(b.attn.qkv), out: lin(b.attn.out), ff1: lin(b.attn.ff1), ff2: lin(b.attn.ff2), heads: b.attn.heads } })
  net._ready = true
  return net
}

/** Khung của một ký hiệu (N × 149) -> L × 368: L khung đều nhau, 184 số mỗi khung, rồi tốc độ (khung này trừ khung trước). */
export function netInput(frames, L) {
  const has = frames.map(f => f[F - 2] !== 0 || f[F - 1] !== 0)
  const first = has.indexOf(true)
  if (first >= 0) frames = frames.slice(first, has.lastIndexOf(true) + 1) // bỏ khung không có tay ở đầu/cuối
  const n = frames.length, out = new Float32Array(L * 2 * B), row = new Float32Array(F)
  let prev = null
  for (let t = 0; t < L; t++) {
    const pos = t === L - 1 ? n - 1 : (t * (n - 1)) / (L - 1)
    const lo = Math.floor(pos), hi = Math.min(lo + 1, n - 1), w = pos - lo
    for (let j = 0; j < F; j++) row[j] = frames[lo][j] * (1 - w) + frames[hi][j] * w
    const f = perFrame(row)
    out.set(f, t * 2 * B)
    if (prev) for (let j = 0; j < B; j++) out[t * 2 * B + B + j] = f[j] - prev[j]
    prev = f
  }
  return out
}

// x: T hàng × l.rows cột -> T hàng × l.cols cột. Tính 4 hàng một lượt: mỗi trọng số chỉ đọc một lần cho 4 hàng (nhanh gần gấp đôi).
function linear(x, T, l) {
  const { W, b, rows, cols } = l, y = new Float32Array(T * cols)
  for (let t = 0; t < T; t++) y.set(b, t * cols)
  let t = 0
  for (; t + 4 <= T; t += 4) {
    const x0 = t * rows, y0 = t * cols, y1 = y0 + cols, y2 = y1 + cols, y3 = y2 + cols
    for (let r = 0; r < rows; r++) {
      const a0 = x[x0 + r], a1 = x[x0 + rows + r], a2 = x[x0 + 2 * rows + r], a3 = x[x0 + 3 * rows + r], wo = r * cols
      for (let c = 0; c < cols; c++) {
        const w = W[wo + c]
        y[y0 + c] += a0 * w; y[y1 + c] += a1 * w; y[y2 + c] += a2 * w; y[y3 + c] += a3 * w
      }
    }
  }
  for (; t < T; t++) {
    const xo = t * rows, yo = t * cols
    for (let r = 0; r < rows; r++) {
      const v = x[xo + r], wo = r * cols
      for (let c = 0; c < cols; c++) y[yo + c] += v * W[wo + c]
    }
  }
  return y
}
const silu = x => { for (let i = 0; i < x.length; i++) x[i] = x[i] / (1 + Math.exp(-x[i])); return x }
function layerNorm(x, T, { g, b }) {
  const d = g.length, y = new Float32Array(x.length)
  for (let t = 0; t < T; t++) {
    const o = t * d
    let m = 0, v = 0
    for (let i = 0; i < d; i++) m += x[o + i]
    m /= d
    for (let i = 0; i < d; i++) v += (x[o + i] - m) ** 2
    const s = 1 / Math.sqrt(v / d + 1e-5)
    for (let i = 0; i < d; i++) y[o + i] = (x[o + i] - m) * s * g[i] + b[i]
  }
  return y
}
const addTo = (x, h) => { for (let i = 0; i < x.length; i++) x[i] += h[i] }

// Khối tích chập: mở rộng kênh -> tích chập theo thời gian từng kênh -> chú ý theo kênh (ECA) -> thu kênh, cộng dồn.
function convBlock(x, T, { fc1, fc2, dw, dwb, k, eca }) {
  const h = silu(linear(x, T, fc1)), e = fc1.cols, pad = k >> 1, g = new Float32Array(T * e)
  for (let t = 0; t < T; t++) {
    for (let c = 0; c < e; c++) {
      let s = dwb[c]
      for (let j = 0; j < k; j++) {
        const tt = t + j - pad
        if (tt >= 0 && tt < T) s += h[tt * e + c] * dw[c * k + j]
      }
      g[t * e + c] = s
    }
  }
  const m = new Float32Array(e)
  for (let t = 0; t < T; t++) for (let c = 0; c < e; c++) m[c] += g[t * e + c] / T
  const ek = eca.length, ep = ek >> 1, gate = new Float32Array(e)
  for (let c = 0; c < e; c++) {
    let s = 0
    for (let j = 0; j < ek; j++) { const cc = c + j - ep; if (cc >= 0 && cc < e) s += m[cc] * eca[j] }
    gate[c] = 1 / (1 + Math.exp(-s))
  }
  for (let t = 0; t < T; t++) for (let c = 0; c < e; c++) g[t * e + c] *= gate[c]
  addTo(x, linear(g, T, fc2))
}

// Khối Transformer: mỗi khung "nhìn" mọi khung khác (chú ý nhiều đầu), rồi một lớp biến đổi riêng từng khung.
function attnBlock(x, T, { ln1, ln2, qkv, out, ff1, ff2, heads }) {
  const d = out.rows, dh = d / heads, z = linear(layerNorm(x, T, ln1), T, qkv), a = new Float32Array(T * d), p = new Float32Array(T)
  const sc = 1 / Math.sqrt(dh)
  for (let h = 0; h < heads; h++) {
    for (let i = 0; i < T; i++) {
      let mx = -Infinity
      for (let j = 0; j < T; j++) {
        let s = 0
        for (let u = 0; u < dh; u++) s += z[i * 3 * d + h * dh + u] * z[j * 3 * d + d + h * dh + u]
        p[j] = s * sc
        if (p[j] > mx) mx = p[j]
      }
      let sum = 0
      for (let j = 0; j < T; j++) { p[j] = Math.exp(p[j] - mx); sum += p[j] }
      for (let j = 0; j < T; j++) {
        const w = p[j] / sum
        for (let u = 0; u < dh; u++) a[i * d + h * dh + u] += w * z[j * 3 * d + 2 * d + h * dh + u]
      }
    }
  }
  addTo(x, linear(a, T, out))
  addTo(x, linear(silu(linear(layerNorm(x, T, ln2), T, ff1)), T, ff2))
}

/** Điểm thô của mạng cho từng nhãn (trước softmax), từ các khung của một ký hiệu. */
export function runNet(net, frames) {
  decodeNet(net)
  const T = net.L, x0 = netInput(frames, T), n = net.mean.length
  for (let i = 0; i < x0.length; i++) x0[i] = (x0[i] - net.mean[i % n]) / net.std[i % n]
  const x = linear(x0, T, net.stem)
  for (const b of net.blocks) b.conv ? convBlock(x, T, b.conv) : attnBlock(x, T, b.attn)
  const top = silu(linear(x, T, net.top)), c = net.top.cols, pooled = new Float32Array(c)
  for (let t = 0; t < T; t++) for (let i = 0; i < c; i++) pooled[i] += top[t * c + i] / T
  return linear(pooled, 1, net.head)
}
