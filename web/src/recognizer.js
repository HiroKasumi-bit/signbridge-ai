// Bộ nhận diện liên tục: tách từng ký hiệu theo lúc HẠ TAY, rồi đoán một lần cho trọn ký hiệu.
// Giống hệt cách AI được học (mỗi video là một ký hiệu trọn vẹn), nên đoán chính xác hơn.
//   - Tay giơ lên (thấy bàn tay, cổ tay cao hơn thắt lưng) -> gom khung vào "đoạn ký hiệu".
//   - Hạ tay ~0,2 giây -> đoán cả đoạn; đủ tự tin thì ra từ.
//   - Ra ký hiệu liền mạch quá 3 giây -> tự chốt đoạn đó.
//   - Trong lúc đang ra ký hiệu, vẫn đoán thử để hiện chữ xem trước (không chốt).
//   - AI đoán "không phải từ nào", hoặc chưa đủ tự tin -> không hiện gì (cử động bừa bị bỏ qua).
import { F, sequenceVector } from './features.js'
import { OTHER, predict } from './model.js'

const hasHands = f => f[F - 1] !== 0 || f[F - 2] !== 0
// Cột 16, 19 = độ cao cổ tay trái/phải tính theo bề rộng vai (dương = thấp hơn vai). Lúc nghỉ ≈ 1,4; lúc ký hiệu ≈ 0.
const raised = f => hasHands(f) && Math.min(f[16], f[19]) < 0.9

export function createRecognizer(model, opts = {}) {
  // custom: các từ người dùng tự dạy (custom.js), được hỏi trước AI chính
  // Mạng nơ-ron (~50 ms mỗi lần đoán) xem trước thưa hơn LDA để camera không bị giật.
  const o = { minProb: model.minProb ?? 0.5, minFrames: 10, restFrames: 6, maxFrames: 90, previewEvery: model.net ? 10 : 4, previewWindow: 40, predictFn: predict, custom: null, ...opts }
  let seg = [], rest = 0, lastWord = null, recorder = null

  // Hỏi từ tự dạy trước, rồi tới AI; chỉ giữ câu trả lời là một từ thật và đủ tự tin.
  const ask = frames => {
    const vec = sequenceVector(frames)
    const r = o.predictFn(model, vec, frames) // có khung thì dùng mạng nơ-ron (nếu model có)
    const mine = o.custom?.match(vec, r)
    if (mine) return mine
    return r.label !== OTHER && r.prob >= o.minProb ? r : null
  }
  function finish() {
    const frames = seg
    seg = []
    if (frames.length < o.minFrames) return null // cử động thoáng qua, bỏ qua
    if (recorder) { recorder(frames); return null } // đang dạy từ mới: chỉ ghi mẫu, không dịch
    const r = ask(frames)
    api.current = r
    if (!r || r.label === lastWord) return null
    lastWord = r.label
    return { word: r.label, prob: r.prob }
  }

  const api = {
    current: null,
    reset() { seg = []; rest = 0; lastWord = null; api.current = null },
    /** Bật chế độ dạy từ: mỗi ký hiệu trọn vẹn được đưa cho fn(frames). Gọi teach(null) để tắt. */
    teach(fn) { recorder = fn; seg = []; api.current = null },
    push(frame) {
      if (raised(frame)) {
        rest = 0
        seg.push(frame)
        if (seg.length >= o.maxFrames) return finish()
        if (seg.length >= o.minFrames && seg.length % o.previewEvery === 0) api.current = ask(seg.slice(-o.previewWindow))
        return null
      }
      if (++rest !== o.restFrames) return null
      const hit = seg.length ? finish() : null // vừa hạ tay đủ lâu: chốt đoạn vừa ra
      lastWord = null // sau khi nghỉ, được phép lặp lại cùng một từ
      api.current = null
      return hit
    },
  }
  return api
}
