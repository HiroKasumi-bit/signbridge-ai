// Trang trò chuyện hai chiều.
// Người Điếc: ký hiệu trước camera -> từ hiện ra -> ghép câu -> "Gửi và đọc to".
// Người nghe: bấm micro, nói -> chữ hiện ra trong khung trò chuyện.
import { camError, drawHands, everyFrame, openCamera } from '../camera.js'
import { createCustom } from '../custom.js'
import { flash, flyWord, micMeter, pop, writeWords } from '../effects.js'
import { t } from '../i18n.js'
import { createRecognizer } from '../recognizer.js'
import { toSentence } from '../sentence.js'
import { onSettings, settings } from '../settings.js'
import { wordName } from '../signs.js'
import { createListener, speak } from '../speech.js'

const $ = id => document.getElementById(id)

export function initChat(getEngine) {
  const cam = $('cam'), video = $('video'), overlay = $('overlay')
  let words = [] // mỗi từ nhớ cả ngôn ngữ ký hiệu: { sign, label }
  const name = w => wordName(w.sign, w.label, settings.ui)

  // ---------- câu nháp ----------
  function renderDraft(newWord = false) {
    const box = $('draft')
    box.innerHTML = words.length ? '' : `<span class="placeholder">${t(settings.ui, 'draft.empty')}</span>`
    words.forEach(w => box.insertAdjacentHTML('beforeend', `<span class="word">${name(w)}</span>`))
    $('send').disabled = !words.length
    if (!newWord) return
    // từ mới bay từ chip trên khung camera xuống câu; không có camera (chạy thử) thì bật ra tại chỗ
    const live = $('live')
    live.hidden ? pop(box.lastElementChild) : flyWord($('liveWord'), box.lastElementChild)
  }
  $('undo').onclick = () => { words.pop(); renderDraft() }
  $('clear').onclick = () => { words = []; renderDraft() }
  $('send').onclick = () => {
    const text = toSentence(words.map(name), settings.ui)
    addMessage('me', t(settings.ui, 'who.me'), text)
    speak(text, settings.ui)
    words = []
    renderDraft()
  }

  // ---------- khung trò chuyện ----------
  function addMessage(side, who, text) {
    const thread = $('thread')
    thread.querySelector('.empty')?.remove()
    const li = document.createElement('li')
    li.className = `msg ${side}`
    li.innerHTML = `<small>${who}</small>`
    thread.append(li)
    writeWords(li, text) // chữ hiện từng từ, như đang được nói ra
    thread.scrollTop = thread.scrollHeight
  }

  // Chỉ khi chạy thử trên máy: cho phép bơm từ/tin nhắn để kiểm tra giao diện
  if (import.meta.env.DEV) {
    window.__loiTayChat = { addWord: (label, sign = settings.sign) => { words.push({ sign, label }); renderDraft(true) }, addMessage, send: () => $('send').click() }
    if (new URLSearchParams(location.search).has('showcase')) { // ảnh chụp minh hoạ: điền sẵn một đoạn hội thoại mẫu
      addMessage('me', 'Bạn · ký hiệu', 'Trạm y tế.')
      addMessage('them', 'Người đối diện · giọng nói', 'Bạn cần đến trạm y tế à? Đi thẳng đường này nhé.')
      words = ['khó_chịu', 'sợ_hãi'].map(label => ({ sign: 'vsl', label })); renderDraft()
    }
  }

  // ---------- micro cho người nghe ----------
  const interim = $('interim'), mic = $('mic')
  const meter = micMeter(mic) // sóng âm theo giọng thật trên nút micro (laptop)
  const say = key => t(settings.ui, key)
  const idle = () => { interim.textContent = say('mic.idle'); interim.classList.remove('on') }
  const listener = createListener({
    onInterim: text => { interim.textContent = text || say('mic.listening'); interim.classList.add('on') },
    onFinal: text => { idle(); addMessage('them', say('who.them'), text) },
    onState: (on, err) => {
      mic.classList.toggle('on', on)
      on ? meter.start() : meter.stop()
      if (on) { interim.textContent = say('mic.listening'); interim.classList.add('on') }
      else if (err === 'not-allowed') interim.textContent = say('mic.denied')
      else if (err) interim.textContent = say('mic.retry')
      else if (interim.textContent === say('mic.listening')) idle()
    },
  })
  if (listener.supported) mic.onclick = () => (mic.classList.contains('on') ? listener.stop() : listener.start(settings.ui))
  else mic.hidden = true
  const micIdle = () => { if (!listener.supported) interim.textContent = say('mic.unsupported'); else if (!mic.classList.contains('on')) idle() }
  micIdle()
  onSettings(() => { renderDraft(); micIdle() }) // đổi ngôn ngữ giao diện: viết lại câu nháp, dòng micro

  // ---------- camera + nhận diện ----------
  const demo = new URLSearchParams(location.search).get('demo') // ?demo=/demo/x.mp4: dùng video thay camera (để kiểm thử)
  $('camStart').onclick = async () => {
    const msg = $('camMsg'), btn = $('camStart')
    btn.disabled = true
    msg.textContent = t(settings.ui, 'cam.loading')
    try {
      const [engine] = await Promise.all([getEngine(), openCamera(video, cam, demo)])
      $('camOff').hidden = true
      $('live').hidden = false
      run(engine)
    } catch (err) {
      console.error('[SignBridge AI] không khởi động được:', err)
      btn.disabled = false
      msg.textContent = t(settings.ui, camError(err))
    }
  }

  // Từ tự dạy (xin chào, tạm biệt, cảm ơn): mẫu đã ghi trước đây vẫn lưu trong máy và vẫn được nhận,
  // dù bảng "Dạy từ mới" đã bỏ khỏi trang này (xem src/custom.js).
  const recognizer = (model, sign) => createRecognizer(model, { custom: createCustom(model, sign) })

  function run({ model, tracker, sign }) {
    let rec = recognizer(model, sign)
    // Đổi ngôn ngữ ký hiệu khi camera đang chạy: nạp "bộ não" mới, không cần bật lại camera.
    onSettings(async s => {
      if (s.sign === sign) return
      const next = await getEngine()
      if (next.sign !== settings.sign) return // người dùng đã đổi tiếp trong lúc tải
      sign = next.sign
      rec = recognizer(next.model, sign)
    })
    const dbg = import.meta.env.DEV ? (window.__loiTay = { frames: 0, withHands: 0, events: [] }) : null
    const liveWord = $('liveWord'), liveBar = $('liveBar'), hint = $('camHint')
    const view = $('chat')
    everyFrame(video, () => {
      // chỉ nhận diện khi đang ở trang trò chuyện (các trang khác dùng chung "mắt")
      if (view.hidden || video.readyState < 2 || video.paused) return
      const { frame, hands, landmarks } = tracker.detect(video, performance.now())
      const hit = rec.push(frame, performance.now())
      if (dbg) { dbg.frames++; dbg.withHands += hands > 0; dbg.current = rec.current && { label: rec.current.label, prob: rec.current.prob }; if (hit) dbg.events.push(hit) }
      hint.hidden = hands > 0
      const cur = rec.current
      liveWord.textContent = hands && cur ? wordName(sign, cur.label, settings.ui) : '…'
      liveBar.style.width = `${hands && cur ? Math.round(cur.prob * 100) : 0}%`
      drawHands(overlay, video, landmarks.hands)
      if (hit) { words.push({ sign, label: hit.word }); renderDraft(true); flash(cam) }
    })
  }
}
