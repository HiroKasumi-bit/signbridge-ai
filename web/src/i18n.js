// Câu chữ giao diện bằng tiếng Việt và tiếng Anh. Thêm câu mới thì thêm ở CẢ HAI thứ tiếng
// (test/i18n.test.js kiểm tra hai bên đủ như nhau). {tên} được thay bằng giá trị lúc hiển thị.

const vi = {
  'meta.title': 'SignBridge AI · Phiên dịch ngôn ngữ ký hiệu',
  'brand.home': 'SignBridge AI, về trang trò chuyện',
  'brand.sub': 'Phiên dịch ngôn ngữ ký hiệu',
  'switch.sign': 'Ngôn ngữ ký hiệu',
  'switch.ui': 'Ngôn ngữ giao diện',
  'nav': 'Chuyển trang',
  'tab.chat': 'Trò chuyện',
  'tab.video': 'Dịch video',
  'tab.vocab': 'Từ vựng',
  'lang.vsl': 'ngôn ngữ ký hiệu Việt Nam',
  'lang.asl': 'ngôn ngữ ký hiệu Mỹ (ASL)',

  'cam.msg': 'Ra ký hiệu trước camera. SignBridge AI đổi thành chữ và đọc to cho người đối diện.',
  'cam.start': 'Bật camera',
  'cam.try': 'Thử: {examples}… <a href="#vocab">Xem đủ {n} từ</a><br>Hình ảnh chỉ xử lý trên máy bạn.',
  'cam.hint': 'Đưa tay vào khung hình',
  'cam.loading': 'Đang tải AI nhận diện… (lần đầu khoảng 30 MB, các lần sau nhanh hơn)',
  'cam.denied': 'Bạn chưa cho phép dùng camera. Bấm biểu tượng ổ khoá trên thanh địa chỉ, cho phép camera rồi bấm lại.',
  'cam.none': 'Không tìm thấy camera trên máy này.',
  'cam.fail': 'Chưa khởi động được. Kiểm tra mạng rồi thử lại.',

  'draft.label': 'Câu đang ghép',
  'draft.undo': 'Xoá từ cuối',
  'draft.clear': 'Xoá hết',
  'draft.empty': 'Từ nhận được sẽ hiện ở đây',
  'draft.send': 'Gửi và đọc to',
  'teach.open': 'Dạy từ mới',
  'teach.title': 'Dạy từ mới cho AI',
  'teach.hint': 'Chọn một từ rồi làm ký hiệu đó trước camera 8 lần, mỗi lần xong hạ tay xuống. Mẫu chỉ lưu trên máy này.',
  'teach.count': '{n} mẫu',
  'teach.needCam': 'Bật camera trước đã.',
  'teach.recording': 'Làm ký hiệu “{w}” rồi hạ tay: đã ghi {n}/{target} mẫu',
  'teach.done': 'Xong “{w}”. Làm thử ký hiệu đó để kiểm tra.',
  'teach.clear': 'Xoá mẫu từ đang chọn',
  'teach.cleared': 'Đã xoá mẫu của “{w}”.',
  'teach.close': 'Đóng',
  'thread.label': 'Cuộc trò chuyện',
  'thread.empty': 'Câu bạn gửi và lời người đối diện nói sẽ hiện ở đây, chữ to, dễ đọc.',
  'who.me': 'Bạn · ký hiệu',
  'who.them': 'Người đối diện · giọng nói',
  'mic.idle': 'Người đối diện bấm micro rồi nói',
  'mic.label': 'Người đối diện bấm để nói',
  'mic.listening': 'Đang nghe…',
  'mic.denied': 'Chưa được phép dùng micro. Bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép.',
  'mic.retry': 'Chưa nghe rõ, bấm micro để thử lại.',
  'mic.unsupported': 'Trình duyệt này chưa nghe được giọng nói. Hãy mở bằng Chrome hoặc Edge.',

  'video.title': 'Dịch video',
  'video.lead': 'Chọn video có người ra ký hiệu. SignBridge AI xem từng khung hình và liệt kê các từ nhận được.',
  'video.pick': 'Chọn video',
  'video.formats': 'MP4, MOV hoặc WEBM. Video chỉ xử lý trên máy bạn.',
  'video.loading': 'Đang tải AI nhận diện…',
  'video.loadFail': 'Chưa tải được AI. Kiểm tra mạng rồi thử lại.',
  'video.bad': 'Không đọc được video này. Hãy thử một file MP4 khác.',
  'video.watching': 'Đang xem video…',
  'video.found': 'Nhận được {n} ký hiệu:',
  'video.none': 'Không tìm thấy ký hiệu nào trong video này.',

  'vocab.title': 'SignBridge AI hiểu được gì?',
  'vocab.lead': 'Bản thử nghiệm nhận diện <b>{n}</b> ký hiệu {lang}. Ra từng ký hiệu rõ ràng, sau mỗi từ hạ tay xuống một chút. Cử động không phải ký hiệu sẽ được bỏ qua.',
  'vocab.search': 'Tìm từ, ví dụ: {example}',
  'vocab.searchLabel': 'Tìm từ',
  'vocab.found': 'Tìm thấy {n} từ',
  'vocab.none': 'Chưa có từ “{q}”. SignBridge AI đang học thêm.',
  'credit.vsl': 'Dữ liệu huấn luyện: <a href="https://zenodo.org/records/23610105" target="_blank" rel="noopener">VieSign-10K</a> của Cap Pham Dinh Thang (giấy phép CC BY 4.0).',
  'credit.asl': 'Dữ liệu huấn luyện: <a href="https://www.kaggle.com/competitions/asl-signs" target="_blank" rel="noopener">Google Isolated Sign Language Recognition</a> của Deaf Professional Arts Network và Georgia Tech (giấy phép CC BY 4.0).',
  'credit.rest': 'Nhận diện điểm khớp: MediaPipe của Google (Apache 2.0).<br>Dự án khởi nghiệp của nhóm học sinh lớp 11A4 và 11A8, Trường THPT Lê Quý Đôn · Giáo viên hướng dẫn: cô Lê Thị Thúy.',
}

const en = {
  'meta.title': 'SignBridge AI · Sign language interpreter',
  'brand.home': 'SignBridge AI, back to chat',
  'brand.sub': 'Sign language interpreter',
  'switch.sign': 'Sign language',
  'switch.ui': 'Interface language',
  'nav': 'Pages',
  'tab.chat': 'Chat',
  'tab.video': 'Translate video',
  'tab.vocab': 'Vocabulary',
  'lang.vsl': 'Vietnamese Sign Language',
  'lang.asl': 'American Sign Language (ASL)',

  'cam.msg': 'Sign in front of the camera. SignBridge AI turns your signs into text and reads them aloud.',
  'cam.start': 'Turn on camera',
  'cam.try': 'Try: {examples}… <a href="#vocab">See all {n} signs</a><br>The video stays on your device.',
  'cam.hint': 'Bring your hands into view',
  'cam.loading': 'Loading the recognition AI… (about 30 MB the first time, faster afterwards)',
  'cam.denied': 'Camera access is blocked. Click the lock icon in the address bar, allow the camera, then try again.',
  'cam.none': 'No camera found on this device.',
  'cam.fail': 'Could not start. Check your connection and try again.',

  'draft.label': 'Your sentence',
  'draft.undo': 'Remove last word',
  'draft.clear': 'Clear all',
  'draft.empty': 'Recognized signs appear here',
  'draft.send': 'Send and read aloud',
  'teach.open': 'Teach a new sign',
  'teach.title': 'Teach the AI a new sign',
  'teach.hint': 'Pick a word, then sign it in front of the camera 8 times, lowering your hands after each one. Samples stay on this device.',
  'teach.count': '{n} samples',
  'teach.needCam': 'Turn on the camera first.',
  'teach.recording': 'Sign “{w}”, then lower your hands: {n}/{target} samples recorded',
  'teach.done': 'Done with “{w}”. Try signing it to check.',
  'teach.clear': 'Delete samples of the selected word',
  'teach.cleared': 'Deleted the samples of “{w}”.',
  'teach.close': 'Close',
  'thread.label': 'Conversation',
  'thread.empty': 'Your sentences and what the other person says appear here in large, easy-to-read text.',
  'who.me': 'You · signs',
  'who.them': 'Other person · voice',
  'mic.idle': 'The other person taps the mic and speaks',
  'mic.label': 'Other person: tap to speak',
  'mic.listening': 'Listening…',
  'mic.denied': 'Microphone access is blocked. Click the lock icon in the address bar to allow it.',
  'mic.retry': 'Didn’t catch that. Tap the mic to try again.',
  'mic.unsupported': 'This browser can’t listen to speech. Please open the app in Chrome or Edge.',

  'video.title': 'Translate a video',
  'video.lead': 'Choose a video of someone signing. SignBridge AI watches every frame and lists the signs it recognizes.',
  'video.pick': 'Choose video',
  'video.formats': 'MP4, MOV or WEBM. The video stays on your device.',
  'video.loading': 'Loading the recognition AI…',
  'video.loadFail': 'Could not load the AI. Check your connection and try again.',
  'video.bad': 'Can’t read this video. Try another MP4 file.',
  'video.watching': 'Watching the video…',
  'video.found': 'Recognized {n} signs:',
  'video.none': 'No signs found in this video.',

  'vocab.title': 'What does SignBridge AI understand?',
  'vocab.lead': 'This trial version recognizes <b>{n}</b> signs in {lang}. Sign one word at a time and lower your hands briefly after each one. Movements that are not signs are ignored.',
  'vocab.search': 'Search, e.g. {example}',
  'vocab.searchLabel': 'Search signs',
  'vocab.found': 'Found {n} signs',
  'vocab.none': 'No sign for “{q}” yet. SignBridge AI is still learning.',
  'credit.vsl': 'Training data: <a href="https://zenodo.org/records/23610105" target="_blank" rel="noopener">VieSign-10K</a> by Cap Pham Dinh Thang (CC BY 4.0).',
  'credit.asl': 'Training data: <a href="https://www.kaggle.com/competitions/asl-signs" target="_blank" rel="noopener">Google Isolated Sign Language Recognition</a> by Deaf Professional Arts Network and Georgia Tech (CC BY 4.0).',
  'credit.rest': 'Landmark detection: Google MediaPipe (Apache 2.0).<br>A student startup project by classes 11A4 and 11A8, Le Quy Don High School · Advisor: Ms. Le Thi Thuy.',
}

export const STR = { vi, en }

export function t(ui, key, vars = {}) {
  const s = STR[ui]?.[key] ?? vi[key] ?? key
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Điền chữ vào trang theo thuộc tính: data-t (chữ thường), data-t-html (có thẻ HTML, chỉ dùng chuỗi trong file này),
// data-t-attr="aria-label:khóa;title:khóa" (thuộc tính).
export function applyStatic(root, ui, vars) {
  root.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(ui, el.dataset.t, vars) })
  root.querySelectorAll('[data-t-html]').forEach(el => { el.innerHTML = t(ui, el.dataset.tHtml, vars) })
  root.querySelectorAll('[data-t-attr]').forEach(el => {
    for (const pair of el.dataset.tAttr.split(';')) {
      const [attr, key] = pair.split(':')
      el.setAttribute(attr, t(ui, key, vars))
    }
  })
}
