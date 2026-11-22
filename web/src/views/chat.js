// Trang trò chuyện hai chiều.
// Người Điếc: ký hiệu trước camera -> từ hiện ra -> ghép câu -> "Gửi và đọc to".
// Người nghe: bấm micro, nói -> chữ hiện ra trong khung trò chuyện.
import { CUSTOM_WORDS, createCustom, customName } from '../custom.js'
import { flash, flyWord, micMeter, pop, writeWords } from '../effects.js'
import { sequenceVector } from '../features.js'
import { t } from '../i18n.js'
import { createRecognizer } from '../recognizer.js'
import { toSentence } from '../sentence.js'
import { onSettings, settings } from '../settings.js'
import { wordName } from '../signs.js'
import { createListener, speak } from '../speech.js'

const $ = id => document.getElementById(id)

export function initChat(getEngine) {
  const cam = $('cam'), video = $('video'), overlay = $('overlay'), ctx = overlay.getContext('2d')
  let words = [] // mỗi từ nhớ cả ngôn ngữ ký hiệu: { sign, label }
  const name = w => wordName(w.sign, w.label, settings.ui)
  let rec = null, custom = null // bộ nhận diện đang chạy và các từ tự dạy của ngôn ngữ đang chọn

  // ---------- dạy từ mới (xin chào, tạm biệt, cảm ơn): người dùng tự ghi mẫu, xem src/custom.js ----------
  const TARGET = 8
  const teachBox = $('teach'), teachStatus = $('teachStatus'), teachClear = $('teachClear')
  let teaching = null // từ đang ghi mẫu
  const tt = (key, vars) => t(settings.ui, key, vars)
  function renderTeach() {
    $('teachWords').innerHTML = CUSTOM_WORDS.map(w => `<button type="button" class="teach-word${teaching === w.id ? ' on' : ''}" data-id="${w.id}">
      <b>${w[settings.ui]}</b><span>${tt('teach.count', { n: custom ? custom.count(w.id) : 0 })}</span></button>`).join('')
    teachClear.hidden = !teaching
  }
  function stopTeach() { teaching = null; rec?.teach(null); renderTeach() }
  function startTeach(id) {
    if (!rec) { teachStatus.textContent = tt('teach.needCam'); return }
    teaching = id
    const w = customName(id, settings.ui)
    let n = 0
    teachStatus.textContent = tt('teach.recording', { w, n, target: TARGET })
    rec.teach(frames => { // mỗi lần làm xong một ký hiệu (hạ tay) là một mẫu
      custom.add(id, sequenceVector(frames))
      n++
      flash(cam)
      if (n >= TARGET) { stopTeach(); teachStatus.textContent = tt('teach.done', { w }) }
      else { teachStatus.textContent = tt('teach.recording', { w, n, target: TARGET }); renderTeach() }
    })
    renderTeach()
  }
  $('teachOpen').onclick = () => { teachBox.hidden = false; renderTeach(); teachBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }
  $('teachClose').onclick = () => { stopTeach(); teachBox.hidden = true; teachStatus.textContent = '' }
  $('teachWords').onclick = e => { const b = e.target.closest('[data-id]'); if (b) startTeach(b.dataset.id) }
  teachClear.onclick = () => {
    if (!teaching || !custom) return
    const id = teaching
    stopTeach()
    custom.clear(id)
    teachStatus.textContent = tt('teach.cleared', { w: customName(id, settings.ui) })
    renderTeach()
  }
  onSettings(renderTeach)

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
      const [engine] = await Promise.all([getEngine(), startSource()])
      $('camOff').hidden = true
      $('live').hidden = false
      run(engine)
    } catch (err) {
      console.error('[SignBridge AI] không khởi động được:', err)
      btn.disabled = false
      msg.textContent = t(settings.ui, err?.name === 'NotAllowedError' ? 'cam.denied' : err?.name === 'NotFoundError' ? 'cam.none' : 'cam.fail')
    }
  }

  async function startSource() {
    if (demo) {
      video.src = demo; video.loop = true
    } else {
      video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      cam.classList.add('mirror') // như nhìn gương; AI vẫn nhận ảnh gốc
    }
    // Trình duyệt có thể tạm dừng video khi tab ở chế độ nền: không coi là lỗi, sẽ tự phát lại
    try { await video.play() } catch (err) { if (err.name !== 'AbortError') throw err }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && video.paused && (video.srcObject || video.src)) video.play().catch(() => {})
  })

  function run({ model, tracker, sign }) {
    custom = createCustom(model, sign)
    rec = createRecognizer(model, { custom })
    renderTeach()
    // Đổi ngôn ngữ ký hiệu khi camera đang chạy: nạp "bộ não" mới, không cần bật lại camera.
    onSettings(async s => {
      if (s.sign === sign) return
      const next = await getEngine()
      if (next.sign !== settings.sign) return // người dùng đã đổi tiếp trong lúc tải
      sign = next.sign
      stopTeach()
      custom = createCustom(next.model, sign) // mỗi ngôn ngữ ký hiệu có bộ từ tự dạy riêng
      rec = createRecognizer(next.model, { custom })
      renderTeach()
    })
    const dbg = import.meta.env.DEV ? (window.__loiTay = { frames: 0, withHands: 0, events: [] }) : null
    const liveWord = $('liveWord'), liveBar = $('liveBar'), hint = $('camHint')
    const view = $('chat')
    const tick = () => {
      // chỉ nhận diện khi đang ở trang trò chuyện (trang dịch video dùng chung "mắt")
      if (!view.hidden && video.readyState >= 2 && !video.paused) {
        const { frame, hands, landmarks } = tracker.detect(video, performance.now())
        const hit = rec.push(frame, performance.now())
        if (dbg) { dbg.frames++; dbg.withHands += hands > 0; dbg.current = rec.current && { label: rec.current.label, prob: rec.current.prob }; if (hit) dbg.events.push(hit) }
        hint.hidden = hands > 0
        const cur = rec.current
        liveWord.textContent = hands && cur ? wordName(sign, cur.label, settings.ui) : '…'
        liveBar.style.width = `${hands && cur ? Math.round(cur.prob * 100) : 0}%`
        draw(landmarks)
        if (hit) { words.push({ sign, label: hit.word }); renderDraft(true); flash(cam) }
      }
      video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
    }
    tick()
  }

  // Chấm các điểm khớp tay lên hình (chấm nhỏ, màu thương hiệu)
  function draw({ hands }) {
    if (overlay.width !== video.videoWidth) { overlay.width = video.videoWidth; overlay.height = video.videoHeight }
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    hands.forEach((h, i) => {
      ctx.fillStyle = i ? '#FFC431' : '#1FB3A6'
      for (const p of h) { ctx.beginPath(); ctx.arc(p.x * overlay.width, p.y * overlay.height, 3.5, 0, 7); ctx.fill() }
    })
  }
}
