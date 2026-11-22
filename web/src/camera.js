// Camera dùng chung cho các trang nhận diện trực tiếp (Trò chuyện, Ký hiệu riêng).

/** Mở camera trước vào thẻ <video>. demo: đường dẫn video dùng thay camera (để kiểm thử). */
export async function openCamera(video, cam, demo = null) {
  if (demo) {
    video.src = demo; video.loop = true
  } else {
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
    cam.classList.add('mirror') // như nhìn gương; AI vẫn nhận ảnh gốc
  }
  // Trình duyệt có thể tạm dừng video khi tab ở chế độ nền: không coi là lỗi, sẽ tự phát lại
  try { await video.play() } catch (err) { if (err.name !== 'AbortError') throw err }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && video.paused) video.play().catch(() => {})
  })
}

/** Lỗi khi mở camera -> khoá câu báo lỗi trong i18n. */
export const camError = err => err?.name === 'NotAllowedError' ? 'cam.denied' : err?.name === 'NotFoundError' ? 'cam.none' : 'cam.fail'

/** Gọi fn mỗi khi video có khung hình mới. */
export function everyFrame(video, fn) {
  const tick = () => { fn(); video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick) }
  tick()
}

/** Chấm các điểm khớp tay lên hình (chấm nhỏ, màu thương hiệu). */
export function drawHands(overlay, video, hands) {
  const ctx = overlay.getContext('2d')
  if (overlay.width !== video.videoWidth) { overlay.width = video.videoWidth; overlay.height = video.videoHeight }
  ctx.clearRect(0, 0, overlay.width, overlay.height)
  hands.forEach((h, i) => {
    ctx.fillStyle = i ? '#FFC431' : '#1FB3A6'
    for (const p of h) { ctx.beginPath(); ctx.arc(p.x * overlay.width, p.y * overlay.height, 3.5, 0, 7); ctx.fill() }
  })
}
