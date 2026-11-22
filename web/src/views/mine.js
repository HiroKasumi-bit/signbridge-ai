// Tab "Ký hiệu riêng" (tính năng trả phí, tạm mở bằng mật khẩu: src/lock.js).
// Người dùng tự sáng tạo ký hiệu; mỗi ký hiệu mang một từ hoặc cả một câu do họ gõ.
//   - Tạo: gõ nghĩa -> "Ghi ký hiệu" -> làm ký hiệu 8 lần, mỗi lần hạ tay xuống là một mẫu.
//   - Dùng: làm ký hiệu -> câu hiện lên và được đọc to.
// Đang phát triển: ký hiệu riêng chỉ được nhận trong tab này. Mẫu lưu trong máy, tách khỏi các từ
// đã dạy ở Trò chuyện, dùng chung cho VSL và ASL (mẫu là số đo cử chỉ, không phụ thuộc ngôn ngữ).
import { camError, drawHands, everyFrame, openCamera } from '../camera.js'
import { createCustom, MIN_SAMPLES } from '../custom.js'
import { flash } from '../effects.js'
import { sequenceVector } from '../features.js'
import { t } from '../i18n.js'
import { createLock } from '../lock.js'
import { createRecognizer } from '../recognizer.js'
import { onSettings, settings } from '../settings.js'
import { speak } from '../speech.js'

const $ = id => document.getElementById(id)
const KEY = 'signbridge.mine.v1'
const TARGET = 8 // số lần làm ký hiệu mỗi lượt ghi

export function initMine(getEngine) {
  const tt = (key, vars) => t(settings.ui, key, vars)

  // ---------- khoá ----------
  const lock = createLock(), lockBox = $('mineLock'), app = $('mineApp'), pass = $('minePass'), err = $('mineErr')
  const showApp = () => { lockBox.hidden = lock.unlocked(); app.hidden = !lock.unlocked() }
  $('mineForm').onsubmit = async e => {
    e.preventDefault()
    const ok = await lock.unlock(pass.value)
    err.textContent = ok ? '' : tt('mine.wrong')
    if (ok) { pass.value = ''; showApp() } else pass.select()
  }
  $('mineLockBtn').onclick = () => { stop(); lock.lock(); showApp() }
  showApp()

  // ---------- danh sách ký hiệu + ghi mẫu ----------
  // Luôn chỉ một bản "mine" đang dùng; tạo lại (đọc lại từ máy) khi đã có bộ não AI để so sánh.
  let mine = createCustom(null, 'all', undefined, { key: KEY }), rec = null, recording = null
  const list = $('mList'), status = $('mStatus'), meaning = $('mMeaning'), recordBtn = $('mRecord').firstElementChild

  function render() {
    const labels = mine.labels()
    list.replaceChildren(...labels.map(label => {
      const li = document.createElement('li')
      li.dataset.label = label
      li.classList.toggle('on', recording?.label === label)
      li.innerHTML = '<span><b></b><small></small></span><button type="button" class="text-btn strong" data-act="more"></button><button type="button" class="text-btn" data-act="del"></button>'
      li.querySelector('b').textContent = label // chữ người dùng gõ: luôn đặt bằng textContent
      li.querySelector('small').textContent = tt('mine.count', { n: mine.count(label) })
      li.querySelector('[data-act=more]').textContent = tt('mine.more')
      li.querySelector('[data-act=del]').textContent = tt('mine.delete')
      return li
    }))
    $('mEmpty').hidden = labels.length > 0
    recordBtn.textContent = tt(recording ? 'mine.stop' : 'mine.record')
  }

  function start(label) {
    label = label.trim()
    if (!label) { status.textContent = tt('mine.needMeaning'); meaning.focus(); return }
    if (!rec) { status.textContent = tt('mine.needCam'); return }
    recording = { label, n: 0 }
    status.textContent = tt('mine.recording', { w: label, n: 0, target: TARGET })
    rec.teach(frames => { // mỗi lần làm xong một ký hiệu (hạ tay) là một mẫu
      mine.add(label, sequenceVector(frames))
      flash(cam)
      if (++recording.n >= TARGET) stop()
      else { status.textContent = tt('mine.recording', { w: label, n: recording.n, target: TARGET }); render() }
    })
    render()
  }
  function stop() {
    if (recording) {
      const w = recording.label
      status.textContent = mine.count(w) >= MIN_SAMPLES ? tt('mine.done', { w }) : tt('mine.few', { w, n: MIN_SAMPLES })
    }
    recording = null
    rec?.teach(null)
    render()
  }
  $('mNew').onsubmit = e => {
    e.preventDefault()
    if (recording) return stop()
    start(meaning.value)
    if (recording) meaning.value = ''
  }
  list.onclick = e => {
    const b = e.target.closest('button')
    if (!b) return
    const label = b.closest('li').dataset.label
    if (b.dataset.act === 'more') return start(label)
    if (recording?.label === label) { recording = null; rec?.teach(null) }
    mine.clear(label)
    status.textContent = tt('mine.deleted', { w: label })
    render()
  }
  onSettings(render)
  render()

  // ---------- camera + nhận diện ----------
  const cam = $('mCam'), video = $('mVideo'), overlay = $('mOverlay')
  $('mCamStart').onclick = async () => {
    const msg = $('mCamMsg'), btn = $('mCamStart')
    btn.disabled = true
    msg.textContent = tt('cam.loading')
    try {
      const [engine] = await Promise.all([getEngine(), openCamera(video, cam)])
      $('mCamOff').hidden = true
      $('mLive').hidden = false
      run(engine)
    } catch (e) {
      console.error('[SignBridge AI] không khởi động được:', e)
      btn.disabled = false
      msg.textContent = tt(camError(e))
    }
  }

  // Bộ nhận diện chỉ nhận ký hiệu riêng: từ của AI chính bị bỏ qua (minProb vô cực),
  // AI chính chỉ còn dùng để phủ quyết khi nó chắc chắn đó là một từ nó đã biết.
  function use(model) {
    const was = recording?.label
    recording = null
    mine = createCustom(model, 'all', undefined, { key: KEY })
    rec = createRecognizer(model, { custom: mine, minProb: Infinity })
    if (was) start(was) // đổi VSL/ASL giữa chừng: ghi tiếp với bộ não mới
    else render()
  }

  function run({ model, tracker, sign }) {
    use(model)
    onSettings(async s => {
      if (s.sign === sign) return
      const next = await getEngine()
      if (next.sign !== settings.sign) return // người dùng đã đổi tiếp trong lúc tải
      sign = next.sign
      use(next.model)
    })
    const view = $('mine'), liveWord = $('mLiveWord'), liveBar = $('mLiveBar'), hint = $('mCamHint'), said = $('mSaid')
    const dbg = import.meta.env.DEV ? (window.__loiTayMine = { events: [] }) : null
    everyFrame(video, () => {
      if (view.hidden || app.hidden || video.readyState < 2 || video.paused) return
      const { frame, hands, landmarks } = tracker.detect(video, performance.now())
      const hit = rec.push(frame, performance.now())
      hint.hidden = hands > 0
      const cur = !recording && hands ? rec.current : null
      liveWord.textContent = recording ? tt('mine.live', { n: recording.n, target: TARGET }) : cur ? cur.label : '…'
      liveBar.style.width = `${recording ? Math.round((recording.n / TARGET) * 100) : cur ? Math.round(cur.prob * 100) : 0}%`
      drawHands(overlay, video, landmarks.hands)
      if (hit) {
        said.textContent = hit.word
        speak(hit.word, settings.ui)
        flash(cam)
        dbg?.events.push(hit)
      }
    })
  }
}
