# Website SignBridge AI

SignBridge AI giúp người Điếc và người nghe trò chuyện với nhau. AI chạy **ngay trong trình duyệt**: hình từ camera không bị gửi đi đâu, và không cần máy chủ.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Sau đó mở địa chỉ mà Vite in ra màn hình (thường là http://localhost:5173).

- **Camera** chỉ chạy trên `localhost` hoặc trang `https`.
- **Micro nghe giọng nói** chạy tốt nhất trên Chrome hoặc Edge.
- **Mẹo khi trình bày:** ra từng ký hiệu rõ ràng, sau mỗi từ **hạ tay xuống** một chút để app chốt từ.
- **Đổi ngôn ngữ:** hai nút ở góc trên. **VSL | ASL** chọn ngôn ngữ ký hiệu (Việt Nam hoặc Mỹ), **VI | EN** chọn chữ trên giao diện. Lựa chọn được nhớ cho lần sau. Có thể mở thẳng bằng địa chỉ, ví dụ `?sign=asl&ui=en`.
- **Thử khi không có camera:** đặt một video ký hiệu vào `public/demo/` (thư mục này không đưa lên git), rồi mở `http://localhost:5173/?demo=/demo/ten-video.mp4`. Website sẽ dùng video thay cho camera.

## Trang giới thiệu

Trang `/gioi-thieu/` (https://signbridge-vn.pages.dev/gioi-thieu/) kể chuyện về sản phẩm, dùng để trưng bày trên laptop.
- **Phần mở màn** là một đoạn phim logo 3D render bằng Blender Cycles. Hai bàn tay trượt vào, bong bóng bật lên, ba chấm "đang gõ", rồi camera lùi ra.
- **Chữ trên trang** hiện theo nhịp phim. Cuộn xuống thì camera lao vào panel xanh ngọc, chuyển sang cảnh tiếp theo.

Phim nằm ở `public/gioi-thieu/` và được làm lại bằng hai bước:

```bash
blender -b --factory-startup --python render/logo_scene.py -- anim   # khoảng 20 phút với card RTX
bash render/encode.sh                                                # ghép khung thành video
```

`render/logo_scene.py` dựng toàn bộ cảnh bằng code:
- **Hình logo:** cùng đường nét với `public/logo.svg`.
- **Chất liệu:** satin mờ, cạnh vát nhỏ và sắc.
- **Ánh sáng:** một softbox chính trên-trái, đèn phụ, đèn viền.
- **Màu:** chế độ "Khronos PBR Neutral" để giữ đúng màu thương hiệu.

Muốn xem nhanh một khung tĩnh thì chạy `-- still`.

## Từ tự dạy (xin chào, tạm biệt, cảm ơn)

AI chính chưa học ba từ này. Trước đây người dùng tự dạy bằng bảng "Dạy từ mới" trên trang Trò chuyện (8 mẫu mỗi từ, riêng cho VSL và ASL). Bảng đó đã được bỏ khỏi giao diện, nhưng **mẫu đã dạy vẫn lưu trong trình duyệt** (khoá `signbridge.custom.v1`) và trang Trò chuyện **vẫn nhận** các từ đó. Xoá dữ liệu trình duyệt hoặc đổi máy thì mất mẫu.

Cách nhận (`src/custom.js`): so cử động mới với các mẫu trong "không gian ký hiệu" của AI (điểm thô AI cho từng từ). Nhận là từ tự dạy khi:
- cử động gần ít nhất 2 mẫu của từ đó, trong ngưỡng riêng của từ (trung vị khoảng cách giữa các mẫu × 1,3);
- gần từ này hơn hẳn từ tự dạy kế bên;
- AI chính không chắc chắn (≥ 60%) đó là một từ khác nó đã biết.

Đã đo trên dữ liệu thật:
- **ASL** (8 người, mỗi người tự dạy hello, bye, thankyou bằng 8 mẫu của chính mình): nhận đúng 90% số lần làm lại. Khoảng 16% ký hiệu khác của cùng người đó bị nhận nhầm thành một trong ba từ.
- **VSL, chạy thật trong trình duyệt bằng camera giả:** dạy "xin chào" bằng 8 lần làm của một người. Những lần làm khác của chính người đó được nhận 4/6 lần ở lượt chạy đầu, 6/6 ở lượt sau. Các từ khác trong video thử (điện thoại, khẩu trang) vẫn ra đúng.

Nghĩa là: hợp nhất với **chính người đã dạy**, cùng chỗ ngồi và ánh sáng. Người khác làm thì có thể không nhận.

## Ký hiệu riêng (tính năng trả phí)

Tab thứ 4, **Ký hiệu riêng**: người Điếc tự sáng tạo ký hiệu cho những điều họ hay nói. Mỗi ký hiệu mang một từ hoặc cả một câu do họ gõ (ví dụ "Tôi cần đi vệ sinh").
1. Nhập mật khẩu để mở khoá. Mở một lần là trình duyệt nhớ; bấm "Khoá lại" để khoá.
2. Bật camera, gõ nghĩa, bấm **Ghi ký hiệu**, rồi làm ký hiệu đó 8 lần (mỗi lần hạ tay xuống).
3. Làm ký hiệu: câu hiện ở ô "Vừa nhận" và được đọc to. "Ghi thêm" để thêm mẫu, "Xoá" để bỏ ký hiệu.

Đang phát triển nên:
- ký hiệu riêng **chỉ được nhận trong tab này**; trong tab này cũng chỉ nhận ký hiệu riêng, không nhận từ của AI chính;
- mẫu lưu trong trình duyệt (khoá `signbridge.mine.v1`), tách khỏi các từ tự dạy ở trên, dùng chung cho VSL và ASL;
- mật khẩu chỉ là khoá để trình diễn: nó được băm nhưng vẫn nằm trong code web (`src/lock.js`). Thu phí thật cần tài khoản và máy chủ.

Cách nhận giống hệt từ tự dạy (`src/custom.js`). Thử bằng camera giả: tạo "Tôi cần đi vệ sinh" từ 8 lần làm một ký hiệu của một người, rồi phát video có ký hiệu đó lẫn với các từ khác. Câu được nhận 5 lần, các từ khác (điện thoại, khẩu trang) không làm hiện câu nào.

## Đưa lên mạng

Web chạy trên **Cloudflare Pages** tại https://signbridge-vn.pages.dev (dự án Pages `signbridge-vn`). Sau khi sửa code:

```bash
npm test
npm run deploy
```

`npm run deploy` đóng gói web rồi tải thư mục `dist/` lên Cloudflare bằng `wrangler` (máy cần đăng nhập Cloudflare: `npx wrangler login`). Mỗi lần push lên `main`, GitHub Actions vẫn chạy kiểm thử và cập nhật bản phụ trên GitHub Pages.

## Kiểm thử

```bash
npm test
```

Lệnh này chạy 6 nhóm kiểm thử:
- **Đối chiếu với Python:** bộ đo cử chỉ, bộ não LDA và mạng nơ-ron ASL trên web phải ra **cùng con số** với bản Python (`ai/`). Mạng nơ-ron còn phải chạy đủ nhanh cho camera.
- **Bộ nhận diện liên tục:**
  - không có tay thì không ra từ;
  - chỉ chốt sau khi hạ tay, cho trọn ký hiệu;
  - giữ nguyên tay thì không lặp từ;
  - cử động thoáng qua bị bỏ qua;
  - AI đoán "không phải từ nào" hoặc chưa đủ tự tin thì không hiện gì.
- **Từ tự dạy:**
  - nhận lại cử động giống mẫu, bỏ qua cử động khác hẳn hoặc lưng chừng;
  - chưa đủ 3 mẫu thì chưa dùng;
  - mẫu nhớ riêng cho VSL và ASL, xoá được;
  - AI chính chắc chắn là từ khác thì không nhận nhầm;
  - lúc đang ghi mẫu thì không hiện từ;
  - ký hiệu riêng lưu chỗ khác, không đụng vào từ đã dạy.
- **Khoá tab Ký hiệu riêng:** sai mật khẩu thì vẫn khoá; đúng thì mở và nhớ; bỏ qua chữ hoa, dấu cách thừa; khoá lại được.
- **Ghép câu và tìm từ** (gõ không dấu vẫn tìm được).
- **Hai ngôn ngữ giao diện:**
  - tiếng Việt và tiếng Anh có đủ cùng một bộ câu chữ;
  - mọi từ của mỗi ngôn ngữ ký hiệu đều có tên tiếng Việt và tiếng Anh;
  - lựa chọn lạ trong địa chỉ hoặc bộ nhớ bị bỏ qua.

## Các file

| File | Làm gì |
|---|---|
| `index.html` | Khung của cả 4 trang: Trò chuyện, Dịch video, Từ vựng, Ký hiệu riêng. |
| `src/main.js` | Chuyển trang, đổi chữ khi bấm VI/EN, và tải AI của ngôn ngữ ký hiệu đang chọn khi cần lần đầu. |
| `src/settings.js` | Nhớ lựa chọn VSL/ASL và VI/EN (trong trình duyệt), báo cho các trang khi đổi. |
| `src/i18n.js` | Toàn bộ chữ trên giao diện, bản tiếng Việt và tiếng Anh. Thẻ HTML có `data-t="..."` được tự điền chữ. |
| `src/signs.js` | Danh sách ngôn ngữ ký hiệu: mỗi ngôn ngữ có danh sách từ, tên từ hai thứ tiếng và vài từ ví dụ. |
| `src/tracker.js` | "Mắt": MediaPipe dò tay và người trong từng khung hình. |
| `src/features.js` | Bộ đo cử chỉ: đổi điểm khớp thành 149 con số. Đây là bản dịch y hệt của `ai/sign/features.py`. |
| `src/model.js` | "Bộ não". VSL: LDA (0,5 MB, trọng số 8-bit), chỉ là nhân ma trận + softmax. ASL: mạng nơ-ron (`net.js`) khi có khung của ký hiệu; phần LDA vẫn giữ để so các từ tự dạy. Không cần thư viện AI. |
| `src/net.js` | Mạng nơ-ron ASL (dạy bằng `ai/nn/`): xem cả chuỗi 32 khung của ký hiệu, tích chập theo thời gian + Transformer, khoảng 20 ms mỗi ký hiệu trên Chrome laptop. Chữ xem trước được đoán thưa hơn (mỗi 10 khung) để camera không giật. |
| `src/recognizer.js` | Tách từng ký hiệu theo lúc **hạ tay**: giơ tay thì gom khung, hạ tay ~0,2 giây thì đoán cả đoạn (giống lúc AI học). Ra liền mạch quá 3 giây thì tự chốt. AI đoán "không phải từ nào" hoặc dưới ngưỡng tự tin thì bỏ qua. |
| `src/custom.js` | Lưu mẫu người dùng tự ghi và nhận các ký hiệu đó (từ tự dạy, ký hiệu riêng). `recognizer.js` hỏi nó trước khi hỏi AI chính. |
| `src/lock.js` | Khoá tab Ký hiệu riêng bằng mật khẩu (tạm thời, thay cho tài khoản trả phí). |
| `src/camera.js` | Mở camera, vẽ điểm khớp tay, chạy theo từng khung hình. Dùng chung cho Trò chuyện và Ký hiệu riêng. |
| `src/words/vsl.json`, `asl.json` | Danh sách từ AI biết, do `ai/train.py` xuất ra cùng lúc với model nên luôn khớp nhau. |
| `src/words/vsl.names.json`, `asl.names.json` | Tên mỗi từ bằng tiếng Việt và tiếng Anh, để hiện chữ đúng ngôn ngữ giao diện. |
| `src/sentence.js` | Ghép các từ thành câu. |
| `src/speech.js` | Đọc to câu, và nghe người đối diện nói, bằng tiếng Việt hoặc tiếng Anh theo giao diện. Dùng tính năng có sẵn của trình duyệt. |
| `src/views/*.js` | Phần xử lý riêng của từng trang. |
| `src/style.css` | Giao diện. Màu lấy từ cờ cộng đồng người Điếc: xanh ngọc, vàng, xanh đậm. |
| `public/model/vsl.json`, `asl.json` | Bộ não đã học cho từng ngôn ngữ ký hiệu, do `ai/train.py` xuất ra. Chỉ tải bộ não của ngôn ngữ đang chọn. |
| `public/mediapipe/` | Model dò tay và người cùng phần chạy MediaPipe, dùng cho chế độ không cần mạng. |

## Nguồn

- **Dữ liệu huấn luyện VSL:** VieSign-10K, tác giả Cap Pham Dinh Thang, giấy phép CC BY 4.0.
- **Dữ liệu huấn luyện ASL:** Google Isolated Sign Language Recognition (Kaggle), thu bởi Deaf Professional Arts Network và Georgia Institute of Technology, giấy phép CC BY 4.0.
- **Nhận diện điểm khớp:** MediaPipe của Google, giấy phép Apache 2.0.
- **Phông chữ:** Lexend, giấy phép SIL Open Font License.
- **Hiệu ứng chuyển động:** GSAP.

## Ảnh chụp

`screenshots/`: trò chuyện (điện thoại, laptop), dịch video, từ vựng.
