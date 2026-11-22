// Điểm khởi động: chuyển trang theo thanh dưới, đổi ngôn ngữ (giao diện, ký hiệu),
// và tải "mắt" + "bộ não" AI khi cần lần đầu.
import './style.css'
import { calm, slideTo, staggerIn } from './effects.js'
import { applyStatic, t } from './i18n.js'
import { loadModel } from './model.js'
import { onSettings, setSettings, settings } from './settings.js'
import { SIGNS, wordName } from './signs.js'
import { createTracker } from './tracker.js'
import { initChat } from './views/chat.js'
import { initMine } from './views/mine.js'
import { initVideo } from './views/video.js'
import { initVocab } from './views/vocab.js'

// Chỉ tải AI (~30 MB) khi người dùng bật camera hoặc chọn video, để mở trang nhanh.
// "Mắt" dùng chung; mỗi ngôn ngữ ký hiệu một "bộ não", tải lần đầu khi được chọn.
const models = {}
let tracker = null
export function getEngine() {
  const sign = settings.sign
  models[sign] ??= loadModel(`${import.meta.env.BASE_URL}model/${sign}.json`).catch(err => { delete models[sign]; throw err })
  tracker ??= createTracker().catch(err => { tracker = null; throw err })
  return Promise.all([models[sign], tracker]).then(([model, tracker]) => ({ model, tracker, sign }))
}

const views = { chat: 'chat', video: 'video-view', vocab: 'vocab', mine: 'mine' }
const tabInd = document.querySelector('.tab-ind')
function route(first = false) {
  const key = location.hash.slice(1) in views ? location.hash.slice(1) : 'chat'
  for (const [k, id] of Object.entries(views)) document.getElementById(id).hidden = k !== key
  scrollTo(0, 0)
  document.querySelectorAll('.tabs a').forEach(a =>
    a.dataset.tab === views[key] ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'))
  slideTo(tabInd, document.querySelector('.tabs a[aria-current]'), first) // ô nền trượt sang tab mới
  if (key === 'vocab' && !first) staggerIn(document.querySelectorAll('#groups .word'))
}
// Chuyển trang mượt (View Transitions) khi trình duyệt hỗ trợ; không thì đổi ngay.
addEventListener('hashchange', () => {
  if (!document.startViewTransition || calm) return route()
  document.startViewTransition(() => route()).ready.catch(() => {}) // tab đang ẩn thì trình duyệt bỏ hiệu ứng, trang vẫn đổi
})
const snapTab = () => slideTo(tabInd, document.querySelector('.tabs a[aria-current]'), true)
addEventListener('resize', snapTab)
document.fonts.ready.then(snapTab) // font về làm tab rộng ra: đặt lại ô nền cho khít
route(true)

// Viết lại mọi chữ cố định trên trang theo lựa chọn hiện tại.
function renderText({ ui, sign }) {
  const s = SIGNS[sign]
  document.documentElement.lang = ui
  document.title = t(ui, 'meta.title')
  applyStatic(document, ui, {
    n: s.words.length,
    lang: t(ui, `lang.${sign}`),
    examples: s.examples.map(w => wordName(sign, w, ui)).join(', '),
    example: wordName(sign, s.examples[0], ui),
  })
  document.getElementById('creditData').innerHTML = t(ui, `credit.${sign}`)
  document.getElementById('signSwitch').hidden = Object.keys(SIGNS).length < 2
  document.querySelectorAll('[data-sign]').forEach(b => { b.hidden = !(b.dataset.sign in SIGNS); b.setAttribute('aria-pressed', b.dataset.sign === sign) })
  document.querySelectorAll('[data-ui]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ui === ui))
}
document.querySelectorAll('[data-sign]').forEach(b => { b.onclick = () => setSettings({ sign: b.dataset.sign }) })
document.querySelectorAll('[data-ui]').forEach(b => { b.onclick = () => setSettings({ ui: b.dataset.ui }) })
onSettings(renderText)
renderText(settings)

initChat(getEngine)
initVideo(getEngine)
initVocab()
initMine(getEngine)
