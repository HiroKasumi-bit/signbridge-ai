// "Dạy từ mới": người dùng tự ghi vài mẫu cho một từ (làm ký hiệu rồi hạ tay), app nhận từ đó bằng cách
// so với mẫu gần nhất. Không cần dạy lại AI. Mẫu lưu trong máy (localStorage), riêng cho VSL và ASL.
//
// Cách so (đã thử trên dữ liệu VieSign thật, xem web/README.md):
// - so trong "không gian ký hiệu" của AI (điểm thô của AI cho từng từ), không so thẳng số đo khớp;
// - ngưỡng mỗi từ = trung vị khoảng cách giữa MỌI CẶP mẫu của nó × LOOSEN: mẫu càng đều thì càng chặt.
//   (Đo trên 5 lần làm "khó chịu" của một người: giữa các lần 0,40–0,98; từ khác của chính người đó ≥ 1,40.
//   Dùng mọi cặp thay vì mẫu gần nhất, để hai mẫu gần như trùng nhau không kéo ngưỡng về 0.)
// - phải gần từ này hơn hẳn từ tự dạy kế bên (MARGIN);
// - AI chính được phủ quyết: nếu nó chắc chắn đây là một từ nó đã biết thì không nhận thành từ tự dạy,
//   trừ khi chính các mẫu của từ tự dạy cũng bị AI đoán thành từ đó (ký hiệu tình cờ giống nhau).
import { OTHER, predict, scores } from './model.js'
export { CUSTOM_WORDS, customName } from './signs.js'

export const MIN_SAMPLES = 3 // dưới số mẫu này thì từ chưa được dùng
const KEY = 'signbridge.custom.v1'
const LOOSEN = 1.3 // dò trên ASL thật và VSL thật, ưu tiên nhận ra ký hiệu của người dạy (xem web/README.md)
const MARGIN = 0.85
const VETO = 0.6
const NEEDED = 2 // phải nằm trong ngưỡng của ít nhất bấy nhiêu mẫu (1 mẫu thì dễ khớp tình cờ)

const localStore = {
  get: k => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}
const enc = v => { const b = new Uint8Array(Float32Array.from(v).buffer); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s) }
const dec = s => { const bin = atob(s); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new Float32Array(b.buffer) }
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d } return Math.sqrt(s / a.length) }
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

/**
 * opts.embed(vec): đưa vector ký hiệu vào không gian so sánh (mặc định: điểm thô của AI).
 * opts.main(vec): đoán của AI chính { label, prob } (mặc định: predict), dùng để phủ quyết.
 */
export function createCustom(model, sign, store = localStore, opts = {}) {
  const embed = opts.embed ?? (v => scores(model, v))
  const main = opts.main ?? (v => predict(model, v))
  const loosen = opts.loosen ?? LOOSEN, veto = opts.veto ?? VETO, needed = opts.needed ?? NEEDED
  const read = () => { try { return JSON.parse(store.get(KEY)) ?? {} } catch { return {} } }
  const all = read()
  const mine = (all[sign] ??= {})
  const save = () => store.set(KEY, JSON.stringify(all))

  let cache = null // tính lại khi mẫu đổi
  function prepared() {
    if (cache) return cache
    cache = {}
    for (const [label, list] of Object.entries(mine)) {
      if (list.length < MIN_SAMPLES) continue
      const raw = list.map(dec)
      const es = raw.map(embed)
      let pairs = []
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) pairs.push(dist(es[i], es[j]))
      const real = pairs.filter(d => d > 0.05) // bỏ cặp gần như trùng nhau (ghi nhầm hai lần một cử động)
      if (real.length) pairs = real
      // những từ AI chính hay đoán cho chính các mẫu này: không dùng để phủ quyết từ này
      const lookalike = new Set(raw.map(main).filter(r => r.label !== OTHER && r.prob >= veto).map(r => r.label))
      cache[label] = { es, limit: median(pairs) * loosen, lookalike }
    }
    return cache
  }

  return {
    count: label => (mine[label] ?? []).length,
    add(label, vec) { (mine[label] ??= []).push(enc(vec)); cache = null; save() },
    clear(label) { delete mine[label]; cache = null; save() },
    /** Trả về { label, prob } nếu cử động khớp một từ tự dạy, không thì null. guess: đoán sẵn của AI chính (nếu có). */
    match(vec, guess = null) {
      const words = Object.entries(prepared())
      if (!words.length) return null
      const q = embed(vec)
      const near = words.map(([label, w]) => {
        const ds = w.es.map(s => dist(q, s)).sort((a, b) => a - b)
        return { label, w, d: ds[0], within: ds.filter(d => d <= w.limit).length }
      }).sort((a, b) => a.d - b.d)
      const [best, next] = near
      if (best.within < Math.min(needed, best.w.es.length)) return null
      if (next && best.d > next.d * MARGIN) return null
      const g = guess ?? main(vec)
      if (g.label !== OTHER && g.prob >= veto && !best.w.lookalike.has(g.label)) return null
      return { label: best.label, prob: Math.max(0.5, 1 - best.d / (best.w.limit * 2)) }
    },
  }
}
