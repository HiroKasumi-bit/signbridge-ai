// Trang găng tay: dựng thẻ ba phiên bản, ảnh "bên trong" có đánh số, bảng so sánh từ cùng một bảng dữ liệu
// (src/shop/tiers.js), rồi thêm chuyển động khi cuộn.
import '@fontsource-variable/lexend'
import './shop.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { COMMON, TIERS, price } from './tiers.js'

gsap.registerPlugin(ScrollTrigger, SplitText)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = id => document.getElementById(id)
const IMG = `${import.meta.env.BASE_URL}san-pham/`
const hours = t => `${t.batteryHours} giờ`
const secs = t => `${t.latencySec.toLocaleString('vi-VN')} giây`

// ---------- thẻ ba phiên bản ----------
$('tierGrid').innerHTML = TIERS.map(t => `
  <article class="tier${t.recommended ? ' pick' : ''}" id="tier-${t.id}">
    <figure><img src="${IMG}${t.id}.webp" alt="Găng SignBridge ${t.name}: ${t.look.toLowerCase()}" width="1376" height="768" loading="lazy"></figure>
    <div class="tier-body">
      <div class="tier-head"><h3 class="tier-name">${t.name}</h3>${t.recommended ? '<span class="badge">Nhóm đề xuất</span>' : ''}</div>
      <p class="tier-line">${t.line}</p>
      <p class="price">${price(t)}<small>Giá dự kiến cho một đôi</small></p>
      <div class="big2">
        <div><b data-count="${t.batteryHours}">${hours(t)}</b><span>pin dùng liên tục</span></div>
        <div><b>${secs(t)}</b><span>từ ký hiệu đến tiếng nói</span></div>
      </div>
      <ul class="specs">
        <li><span>Camera</span>${t.parts.camera}</li>
        <li><span>AI dịch</span>${t.parts.brain}</li>
        <li><span>Loa</span>${t.parts.speaker}</li>
      </ul>
      <a class="btn ${t.recommended ? '' : 'primary'}" href="#dat-truoc" data-tier="${t.name}">Đăng ký quan tâm</a>
    </div>
  </article>`).join('')

// bấm "Đăng ký quan tâm": phần cuối trang nhắc đúng phiên bản vừa chọn
document.querySelectorAll('[data-tier]').forEach(a => a.addEventListener('click', () => {
  $('reserveTitle').textContent = `Muốn có găng ${a.dataset.tier} khi ra mắt?`
}))

// ---------- bên trong: ảnh có đánh số (toạ độ % trên ảnh bản Plus) ----------
const PARTS = [
  [17.4, 31.9, 'Hộp cổ tay', 'Mạch xử lý, camera nhìn về mặt người đeo, mô-tơ rung, nút nguồn.'],
  [25.8, 48.2, 'Tấm mu bàn tay', 'Pin dẹt và cảm biến góc 9 trục, nằm êm trong túi vải.'],
  [40.7, 70.3, 'Cảm biến dọc ngón', 'May chìm trong đường hầm vải, đo từng ngón cong bao nhiêu.'],
  [47.2, 18.2, 'Đầu ngón sợi bạc', 'Vải dẫn điện: biết đầu ngón đang chạm vào đâu.'],
  [65.4, 43.0, 'Lòng bàn tay sợi bạc', 'Phân biệt tay chạm da (mặt, cổ) với chạm áo (ngực).'],
  [82.5, 68.4, 'Tab kéo cổ tay', 'Một tay tự đeo hoặc tháo găng trong vài giây.'],
  [85.8, 16.9, 'Hộp loa', 'Đọc to câu nói. Bản Pro có loa ngay trên cổ tay.'],
]
const shot = $('anatomy')
PARTS.forEach(([x, y], i) => shot.insertAdjacentHTML('beforeend', `<span class="pin" style="left:${x}%;top:${y}%" data-i="${i}" aria-hidden="true">${i + 1}</span>`))
$('legend').innerHTML = PARTS.map(([, , name, text], i) => `<li data-i="${i}"><div><b>${name}</b><span>${text}</span></div></li>`).join('')
const light = (i, on) => document.querySelectorAll(`[data-i="${i}"]`).forEach(el => el.classList.toggle('on', on))
document.querySelectorAll('.pin, .legend li').forEach(el => {
  el.addEventListener('pointerenter', () => light(el.dataset.i, true))
  el.addEventListener('pointerleave', () => light(el.dataset.i, false))
})
$('common').innerHTML = COMMON.map(([name, text]) => `<li><b>${name}</b><span>${text}</span></li>`).join('')

// ---------- bảng so sánh ----------
const ROWS = [
  ['Giá dự kiến (một đôi)', t => `<b>${price(t)}</b>`],
  ['Pin dùng liên tục', t => `<b>${hours(t)}</b>`],
  ['Từ ký hiệu đến tiếng nói', t => `<b>${secs(t)}</b>`],
  ['Cảm biến ngón', t => t.parts.fingers],
  ['Cảm biến bàn tay', t => t.parts.hand],
  ['Camera nét mặt', t => t.parts.camera],
  ['AI dịch', t => t.parts.brain],
  ['Pin', t => t.parts.battery],
  ['Loa', t => t.parts.speaker],
  ['Kiểu dáng', t => t.look],
]
const cls = t => (t.recommended ? ' class="pick"' : '')
$('compareTable').innerHTML = `
  <thead><tr><th scope="col"></th>${TIERS.map(t => `<th scope="col"${cls(t)}>${t.name}</th>`).join('')}</tr></thead>
  <tbody>${ROWS.map(([label, f]) => `<tr><th scope="row">${label}</th>${TIERS.map(t => `<td${cls(t)}>${f(t)}</td>`).join('')}</tr>`).join('')}</tbody>`

// thanh trên có đường kẻ khi đã cuộn
const nav = document.querySelector('.nav')
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true })

// ---------- chuyển động ----------
if (!calm) {
  await document.fonts.ready
  const words = SplitText.create('.title .line', { type: 'words', mask: 'words' })
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from(words.words, { yPercent: 140, duration: 1.1, stagger: 0.06 }, 0.1)
    .fromTo('.hl', { '--bar': 0 }, { '--bar': 1, duration: 0.9, ease: 'expo.inOut' }, 0.7)
    .from(['.status', '.lead', '.hero .actions'], { y: 22, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.3)
    .fromTo('.hero-shot', { clipPath: 'inset(8% 8% 8% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.4, ease: 'expo.inOut' }, 0.2)
    .from('.hero-shot img', { scale: 1.12, duration: 1.8 }, 0.2)

  const rise = (targets, trigger, opts = {}) => gsap.from(targets, { y: 34, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1, ...opts, scrollTrigger: { trigger, start: 'top 82%' } })
  document.querySelectorAll('section .h2').forEach(h => rise([h, h.nextElementSibling], h))
  rise('.tier', '.tier-grid', { stagger: 0.14, y: 60 })
  // số giờ pin đếm lên khi thẻ hiện ra
  document.querySelectorAll('[data-count]').forEach(b => {
    const n = { v: 0 }, end = +b.dataset.count
    gsap.to(n, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => { b.textContent = `${Math.round(n.v)} giờ` }, scrollTrigger: { trigger: b, start: 'top 90%' } })
  })
  gsap.from('.pin', { scale: 0, duration: 0.6, ease: 'back.out(2.4)', stagger: 0.09, scrollTrigger: { trigger: shot, start: 'top 70%' } })
  rise('.legend li', '.legend', { stagger: 0.07, y: 18 })
  rise('.common li', '.common', { stagger: 0.06, y: 18 })
  rise('tbody tr', '.table-wrap', { stagger: 0.05, y: 12 })
  rise('.honest li', '.honest ul', { stagger: 0.08, y: 18 })
  rise(['.reserve-text', '.reserve .actions'], '.reserve', { stagger: 0.12 })
}
