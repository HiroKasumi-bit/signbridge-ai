// Các ngôn ngữ ký hiệu app hiểu. Mỗi ngôn ngữ: danh sách từ (do ai/train.py xuất, khớp với model)
// và tên hiển thị tiếng Việt / tiếng Anh cho từng từ (names), cùng vài từ gợi ý để thử.
import vslWords from './words/vsl.json' with { type: 'json' }
import vslNames from './words/vsl.names.json' with { type: 'json' }
import aslWords from './words/asl.json' with { type: 'json' }
import aslNames from './words/asl.names.json' with { type: 'json' }
import { wordLabel } from './sentence.js'

export const SIGNS = {
  vsl: { words: vslWords, names: vslNames, examples: ['khẩu_trang', 'điện_thoại', 'đúng', 'sai'] },
  asl: { words: aslWords, names: aslNames, examples: ['thankyou', 'drink', 'water', 'sleep'] },
}

// Từ người dùng tự dạy (trang Trò chuyện → "Dạy từ mới", xem custom.js), dùng chung cho VSL và ASL.
export const CUSTOM_WORDS = [
  { id: 'xin_chào', vi: 'xin chào', en: 'hello' },
  { id: 'tạm_biệt', vi: 'tạm biệt', en: 'goodbye' },
  { id: 'cảm_ơn', vi: 'cảm ơn', en: 'thank you' },
]
export const customName = (label, ui) => CUSTOM_WORDS.find(w => w.id === label)?.[ui]

// Cách ký từng từ (trang Từ vựng): VSL có video thật VieSign trong app (ai/vocab_clips.py);
// ASL mở từ điển SignASL.org (video người thật). Nhãn ASL viết liền thì đổi sang từ SignASL dùng.
const ASL_SLUG = {
  thankyou: 'thank-you', frenchfries: 'french-fries', icecream: 'ice-cream', haveto: 'have-to',
  callonphone: 'call', glasswindow: 'window', hesheit: 'he', minemy: 'mine', weus: 'we', owie: 'hurt', shhh: 'shh', hen: 'chicken',
}
export const signVideo = (sign, label) => (sign === 'vsl' ? `${import.meta.env?.BASE_URL ?? '/'}signs/vsl/${encodeURIComponent(label)}.mp4` : null)
export const signLink = (sign, label) => (sign === 'asl' ? `https://www.signasl.org/sign/${ASL_SLUG[label] ?? label.toLowerCase()}` : null)

// Tên một từ theo ngôn ngữ giao diện; không có bản dịch thì dùng nhãn gốc (bỏ dấu gạch dưới).
export const wordName = (sign, label, ui) => customName(label, ui) ?? SIGNS[sign]?.names[label]?.[ui] ?? wordLabel(label)
