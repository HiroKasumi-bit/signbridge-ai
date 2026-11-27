// Trang từ vựng: mọi ký hiệu app hiểu (theo ngôn ngữ ký hiệu đang chọn), xếp theo chữ cái đầu, có ô tìm kiếm.
// Tên từ hiện theo ngôn ngữ giao diện; tìm kiếm không cần gõ dấu.
// Bấm vào từ để xem cách ký: VSL mở khung video thật (VieSign), ASL mở SignASL.org ở thẻ mới.
import { staggerIn } from '../effects.js'
import { t } from '../i18n.js'
import { plain } from '../sentence.js'
import { onSettings, settings } from '../settings.js'
import { SIGNS, signLink, signVideo, wordName } from '../signs.js'

const letter = label => (label[0] === 'đ' || label[0] === 'Đ' ? 'Đ' : plain(label[0]).toUpperCase())

export function initVocab() {
  const groups = document.getElementById('groups')
  const count = document.getElementById('vcount')
  const input = document.getElementById('vsearch')
  let items = []

  function load({ sign, ui }) {
    items = SIGNS[sign].words.map(id => { const label = wordName(sign, id, ui); return { id, label, key: plain(label) } })
      .sort((a, b) => a.label.localeCompare(b.label, ui))
    document.getElementById('vhint').textContent = t(ui, `vocab.hint.${sign}`)
    render()
  }

  const chip = it => {
    const link = signLink(settings.sign, it.id)
    return link
      ? `<a class="word" href="${link}" target="_blank" rel="noopener">${it.label}</a>`
      : `<button type="button" class="word" data-id="${it.id}">${it.label}</button>`
  }

  function render() {
    const q = plain(input.value.trim())
    const byLetter = new Map()
    for (const it of items) {
      if (!it.key.includes(q)) continue
      const k = letter(it.label)
      byLetter.set(k, [...(byLetter.get(k) ?? []), it])
    }
    const shown = [...byLetter.values()].reduce((n, ws) => n + ws.length, 0)
    groups.innerHTML = [...byLetter].map(([k, ws]) =>
      `<section class="group"><h2>${k}</h2><div>${ws.map(chip).join('')}</div></section>`,
    ).join('')
    count.textContent = !q ? '' : t(settings.ui, shown ? 'vocab.found' : 'vocab.none', { n: shown, q: input.value.trim() })
  }
  input.addEventListener('input', () => { render(); staggerIn(groups.querySelectorAll('.word')) }) // kết quả tìm hiện so le

  // ---------- khung xem cách ký (VSL) ----------
  const dialog = document.getElementById('signDialog'), video = document.getElementById('sdVideo'), slow = document.getElementById('sdSlow')
  const setSpeed = r => { video.playbackRate = r; slow.textContent = t(settings.ui, r < 1 ? 'sign.normal' : 'sign.slow') }
  groups.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]')
    if (!b) return
    document.getElementById('sdTitle').textContent = b.textContent
    video.src = signVideo(settings.sign, b.dataset.id)
    dialog.showModal()
    setSpeed(1)
    video.play().catch(() => {})
  })
  slow.onclick = () => setSpeed(video.playbackRate < 1 ? 1 : 0.5)
  document.getElementById('sdClose').onclick = () => dialog.close()
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close() }) // bấm ra ngoài khung để đóng
  dialog.addEventListener('close', () => { video.pause(); video.removeAttribute('src'); video.load() })

  onSettings(load)
  load(settings)
}
