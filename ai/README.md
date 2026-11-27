# Phần AI: dạy máy hiểu ngôn ngữ ký hiệu

Thư mục này dạy AI nhận ra **183 ký hiệu ngôn ngữ ký hiệu Việt Nam** (VSL, ngôn ngữ chính) và **250 ký hiệu ngôn ngữ ký hiệu Mỹ** (ASL, bằng mạng nơ-ron: xem mục "ASL bằng mạng nơ-ron"), đồng thời **bỏ qua cử động không phải ký hiệu nó biết**, rồi xuất "bộ não" AI cho website dùng. Mỗi ngôn ngữ một bộ não riêng.

## AI hoạt động thế nào

```
Video ký hiệu ──► MediaPipe chấm điểm ──► 149 con số mỗi khung ──► 8 khung + số liệu tổng hợp (2.024 số) ──► LDA ──► "khẩu trang" (89%) hoặc "không phải từ nào"
```

1. **Mắt (MediaPipe của Google)** tìm hai bàn tay và cơ thể trong từng khung hình. Mỗi bàn tay được chấm 21 điểm khớp. Trên người lấy 7 điểm: mũi, hai vai, hai khuỷu tay, hai cổ tay.
2. **Bộ đo cử chỉ** (`sign/features.py`) đổi các điểm đó thành 149 con số. Mọi vị trí được tính so với hai vai, nên AI biết tay đang ở gần mặt hay trước ngực, dù người đứng xa hay gần camera.
3. **Gom cả ký hiệu.** Một ký hiệu kéo dài khoảng 1–2 giây. Máy làm như sau:
   - cắt bỏ phần đầu và cuối không có tay;
   - chọn **8 khung đều nhau** để giữ thứ tự chuyển động;
   - thêm **vị trí trung bình, độ dao động và độ dao động tốc độ** của cả chuỗi;
   - thêm **hình dạng tay** cho mỗi bàn tay: ngón tay tính từ cổ tay, chia cho độ dài lòng bàn tay, nên không phụ thuộc người đứng xa hay gần.
4. **Bộ não** là phân tích biệt thức tuyến tính (LDA): mỗi nhãn có một bộ trọng số, nhãn nào được điểm cao nhất thì thắng.
   - Ngoài 183 từ còn một nhãn **"không phải từ nào"**, học từ video của các từ AI không dạy.
   - App chỉ hiện chữ khi AI đoán ra một từ thật **và** đủ tự tin (từ 45% trở lên). Còn lại thì bỏ qua.
   - Trọng số được nén về số nguyên 8-bit, nên cả bộ não chỉ nặng 0,5 MB.

## Dữ liệu VSL

- Lấy từ **VieSign-10K** của tác giả Cap Pham Dinh Thang, đăng trên Zenodo (https://zenodo.org/records/23610105), giấy phép **CC BY 4.0**. Giấy phép này cho dùng cả vào mục đích thương mại, miễn là ghi nguồn.
- Cả gói có 7.664 video, 1.182 từ, 57 người. Nhưng đa số từ chỉ có 3–4 video.
- **Chọn từ để dạy:**
  1. Xét 389 từ có ít nhất 8 video.
  2. Chấm thử trên người lạ. Từ nào AI nhận đúng dưới 40% thì không dạy: có 206 từ như vậy, ví dụ bác sĩ, mệt, ho, vì các từ này dễ lẫn với từ khác. Còn lại **183 từ**.
  3. Video của tất cả các từ không dạy (999 từ) dùng làm ví dụ cho nhãn "không phải từ nào".
- **Nhân bản dữ liệu:** từ mỗi video, máy tạo thêm 10 biến thể: lật gương (để AI hiểu cả người thuận tay trái), xoay nhẹ, to nhỏ, cắt đầu cuối, tay hơi run.

## Độ chính xác VSL (số thật)

Kết quả lần train ngày 17/11/2026, chấm trên **người lạ**: người làm ký hiệu lúc kiểm tra chưa từng xuất hiện lúc AI học. Bước chọn từ cũng làm lại trong mỗi lần chấm và chỉ dựa trên dữ liệu học, để con số không bị đẹp giả.

| Khi bắt buộc chọn 1 trong 183 từ | Kết quả |
|---|---|
| Đoán đúng ngay lần đầu | **59,8%** |
| Từ đúng nằm trong 5 gợi ý đầu | 73,8% |

Khi chạy thật, app chỉ hiện chữ lúc AI đủ tự tin (ngưỡng 0,45):

| Người dùng làm | Nhận đúng | Nhận nhầm sang từ khác | Không hiện gì |
|---|---|---|---|
| Một trong 183 từ | **35,6%** | 4,2% | 60,1% |
| Ký hiệu của từ AI chưa từng thấy (giống giơ tay bừa) | — | **8,5%** bị nhận thành chữ | 91,5% |

App **ít khi nói sai, nhưng hay bỏ sót**. Nếu không thấy chữ hiện ra, người dùng làm lại ký hiệu rõ hơn.

**Các cách đã thử** (chấm trên người lạ):
- **Chọn kiểu AI** (dạy cả 389 từ, cùng một phần kiểm tra, tính "đúng ngay lần đầu"):
  - LDA: 32,5%
  - hồi quy logistic: 23,6%
  - mạng nơ-ron nhỏ: 20,6%
- **Dạy cả 389 từ** thì khi bật bộ lọc, app chỉ nhận đúng 17% và bỏ sót 76%. Vì vậy chỉ dạy những từ AI học được.
- **Riêng 20 từ khám bệnh**, có bộ lọc: chỉ nhận đúng 17%. Dữ liệu hiện có chưa đủ để nhận tin cậy các từ này.
- **Bản cũ ngày 16/11** (20 từ khám bệnh): đạt 63,8% khi bắt buộc chọn 1 trong 20 từ. Nhưng bản đó không có nhãn "không phải từ nào", nên cử động bừa cũng bị dịch thành chữ.

**Muốn chính xác hơn:** cần nhiều video hơn cho mỗi từ (VSL400, hoặc nhóm tự thu), nhất là các từ khám bệnh.

Số mới nhất luôn nằm ở `metrics` trong `web/public/model/vsl.json` và `asl.json`.

## Ngôn ngữ ký hiệu Mỹ (ASL)

**Dữ liệu:** bộ Google Isolated Sign Language Recognition trên Kaggle (cuộc thi `asl-signs`), do Deaf Professional Arts Network và Georgia Institute of Technology thu, giấy phép **CC BY 4.0**. Có 94.477 mẫu, 250 từ, 21 người, quay bằng điện thoại. Bộ này không có video, chỉ có điểm khớp đã chấm sẵn bằng MediaPipe Holistic (bản cũ của MediaPipe).

**Đổi sang dạng app dùng** (`extract_asl.py`):
- Mỗi khung có 543 điểm (mặt, hai tay, người), được đổi thành 149 con số giống hệt bản VSL.
- Dữ liệu không ghi tỉ lệ khung hình của video gốc, nên máy ước lượng cho từng người: so tỉ lệ cơ thể (khoảng mũi–vai chia bề rộng vai) với VieSign, nơi đã biết tỉ lệ khung. Kết quả 0,55–0,78 (điện thoại quay dọc), lưu ở `data/asl/aspect.json`.
- Lúc dạy, máy kéo giãn ngang ngẫu nhiên ±10%, để AI không phụ thuộc vào con số ước lượng.

**Dạy bằng điểm Holistic, chạy bằng điểm của web có ổn không?** Web dùng MediaPipe Tasks, không phải Holistic. Đã thử trên VSL (183 từ, một phần kiểm tra, khoảng 480 video):

| Dạy bằng | Thử bằng | Đúng ngay lần đầu |
|---|---|---|
| Tasks | Tasks | 74,2% |
| Holistic | Tasks | 74,4% |
| Holistic | Holistic | 70,9% |

Chênh lệch không đáng kể, nên dạy bằng dữ liệu Holistic vẫn dùng được trên web.

**Nhãn "không phải từ nào":** dùng 6.837 video VieSign, chấm lại bằng Holistic (`extract_holistic.py`) cho cùng kiểu với dữ liệu ASL. Đây là ký hiệu thật nhưng không phải ASL, nên AI phải học cách bỏ qua.
- Bỏ ra 827 video của các từ cùng nghĩa với một từ ASL (mắt, uống, ngủ…), vì ký hiệu hai nước cho các từ này thường giống nhau.
- Đã thử cả khi giữ và khi bỏ các video này: kết quả gần như nhau (đúng ngay lần đầu 57,2% và 57,3%).

**Kết quả LDA (bản cũ, 18/11/2026)**, chấm trên người lạ, cách chấm giống VSL: dạy **112/250 từ**.

| Khi bắt buộc chọn 1 trong 112 từ | Kết quả |
|---|---|
| Đoán đúng ngay lần đầu | **57,3%** |
| Từ đúng nằm trong 5 gợi ý đầu | 78,2% |

Khi chạy thật, app chỉ hiện chữ lúc AI đủ tự tin (ngưỡng 0,20, chọn sao cho ký hiệu lạ bị nhận thành chữ không quá 10%):

| Người dùng làm | Nhận đúng | Nhận nhầm sang từ khác | Không hiện gì |
|---|---|---|---|
| Một trong 112 từ | **23,2%** | 3,6% | 73,1% |
| Ký hiệu VSL của từ không có trong ASL | — | **9,1%** bị nhận thành chữ | 90,9% |

**Vì sao kém VSL dù nhiều dữ liệu hơn:** LDA chỉ chia các từ bằng "đường thẳng". Thử 30 mẫu mà AI **đã được học**, nó vẫn chỉ đoán đúng 16. Vậy kiểu AI này đã hết sức, không phải thiếu dữ liệu. Bước tiếp theo nên thử mạng nơ-ron: phần web đã chạy được bộ não nhiều lớp.

## ASL bằng mạng nơ-ron (27/11/2026, thay LDA)

LDA đã hết sức với ASL, nên ASL chuyển sang mạng nơ-ron (thư mục `nn/`). VSL vẫn dùng LDA vì mỗi từ VSL chỉ có vài chục video: lần thử trước, mạng nơ-ron nhỏ trên VSL còn kém LDA (20,6% so với 32,5%).

**Cách làm** (học theo lời giải hạng nhất cuộc thi Kaggle, thu nhỏ cho vừa web):
- **Đầu vào:** cả chuỗi khung của ký hiệu, lấy đều 32 khung. Mỗi khung có 184 số như LDA (vị trí 7 điểm người, vị trí và hình dạng hai bàn tay, có tay hay không), cộng tốc độ (khung này trừ khung trước): 368 số.
- **Mạng:** 2 nhóm, mỗi nhóm 3 khối tích chập theo thời gian và 1 khối Transformer, rồi lấy trung bình theo thời gian và chấm điểm 250 từ cộng "không phải từ nào". Có 0,83 triệu tham số, nén 8-bit.
- **Nhân bản dữ liệu ngay trên GPU, mỗi lượt học một kiểu khác:**
  - lật gương, cắt đầu cuối, ký nhanh chậm không đều;
  - xoay ±15°, to nhỏ ±20%, nghiêng, co giãn ngang;
  - từng bàn tay xoay hoặc dời chỗ một chút, tay run, thỉnh thoảng mất tay vài khung.
- **Học:** 80 lượt, khoảng 13 phút trên RTX 4060 Laptop.
- **Chấm:** cùng cách chia người lạ như LDA (5 phần, người lúc kiểm tra chưa từng xuất hiện lúc học).

**Kết quả** (250 từ, người lạ, cả 5 phần):

| Khi bắt buộc chọn 1 trong 250 từ | Kết quả |
|---|---|
| Đoán đúng ngay lần đầu | **65,9%** |
| Từ đúng nằm trong 5 gợi ý đầu | 85,3% |
| Số từ nhận đúng từ 40% trở lên | 236/250 (LDA: 112) |

So cùng điều kiện với LDA (cả 5 phần, cùng 112 từ LDA đã dạy, chỉ chọn trong 112 từ đó): mạng nơ-ron **83,1%**, LDA 57,3%. Từng phần: 56,1%, 65,6%, 68,5%, 68,6%, 70,1% (250 từ): mỗi nhóm người lạ khó dễ khác nhau.

Khi chạy thật, app chỉ hiện chữ khi AI đủ tự tin (so với LDA cũ: nhận đúng 23,2%, nhầm 3,6%, bỏ sót 73,1%, cử động lạ 9,1%). Ngưỡng 0,45 được chọn sao cho **khi đã hiện chữ thì ít nhất 8/10 lần đúng**, và cử động lạ bị nhận thành chữ không quá 10%:

| Người dùng làm | Nhận đúng | Nhận nhầm sang từ khác | Không hiện gì |
|---|---|---|---|
| Một trong 250 từ | **57,0%** | 12,9% | 30,1% |
| Ký hiệu VSL của từ không có trong ASL | — | **0,7%** bị nhận thành chữ | 99,3% |

**Các cách đã thử** (phần 1/5, cùng cách chấm):

| Thử | Đúng ngay lần đầu |
|---|---|
| MLP trên vector tóm tắt 2.024 số (như LDA) | 28,8% |
| Tích chập + Transformer, 1,25 triệu tham số, 60 lượt | 55,8% |
| To hơn (1,77 triệu), 150 lượt | 56,2% |
| Nhân bản mạnh, 1,25 triệu tham số | 56,3% |
| **Nhân bản mạnh, 0,83 triệu tham số (chọn: ngang kết quả, chạy nhanh hơn)** | **56,1%** |
| Cùng mạng 1,25 triệu, nhưng chia NGẪU NHIÊN (người kiểm tra đã gặp lúc học) | 80,2% |

**Vì sao không được 90% như Kaggle:**
- Đội hạng nhất Kaggle đạt 89,3%, nhưng họ học trên cả 21 người rồi chấm trên bộ kiểm tra riêng của cuộc thi, nên không so trực tiếp được.
- Dòng cuối bảng trên cho thấy: ở phần 1, nếu đã gặp người đó lúc học thì mạng đúng 80%, gặp người lạ thì chỉ 56%. Gặp người mới là khó nhất.
- Một dự án độc lập chấm đúng kiểu người lạ trên cùng bộ dữ liệu (github.com/shravnchandr/Sign-Language-Translation) đạt 68–72% (giữ lại 3 người). Họ dùng mô hình lớn hơn nhiều và có cả điểm mắt, môi. Mạng của mình đạt 65,9% mà chỉ dùng tay và vai.
- App của mình chưa dò mặt, để camera chạy nhanh. Thêm điểm môi và mắt là bước tiếp theo nếu cần chính xác hơn.

**Trên web** (`web/src/net.js`): JavaScript thuần, khoảng 20 ms mỗi ký hiệu trên Chrome laptop. Phần LDA vẫn nằm trong `asl.json`, vì các từ người dùng tự dạy được so trong "không gian" của LDA.

## Các file

| File | Làm gì |
|---|---|
| `fetch_viesign.py` | Tải cả gói VieSign-10K (5,9 GB) theo từng mảnh 32 MB, tải song song và tự thử lại khi Zenodo lỗi. Sau đó giải nén video và ghi `data/labels.csv`. |
| `sign/landmarks.py` | Cho máy "xem" một video bằng MediaPipe, rồi đổi ra các con số. |
| `sign/features.py` | Bộ đo cử chỉ. File `web/src/features.js` là bản dịch y hệt sang JavaScript. |
| `extract_all.py` | Xem toàn bộ video, chạy song song nhiều nhân CPU. Với 7.664 video mất khoảng 2 giờ. |
| `train.py` | Chọn từ AI học được, nhân bản dữ liệu, dạy LDA, chấm điểm trung thực, chọn ngưỡng tự tin. Xuất `web/public/model/<vsl\|asl>.json` và `web/src/words/<vsl\|asl>.json` (danh sách cho trang Từ vựng). Mỗi ngôn ngữ mất khoảng 20 phút. |
| `extract_holistic.py` | Chấm lại mọi video VieSign bằng MediaPipe Holistic (cùng kiểu với dữ liệu ASL), làm nhãn "không phải từ nào" cho ASL. Khoảng 2 giờ. |
| `extract_asl.py` | Đổi dữ liệu ASL của Google sang 149 số mỗi khung, ước lượng tỉ lệ khung từng người, thêm video VieSign làm "không phải từ nào". |
| `nn/cache.py` | Gom mọi mẫu vào một file (`data/<ngôn ngữ>/nn_cache.npz`, khoảng 2 GB với ASL) để dạy mạng nơ-ron nhanh. |
| `nn/train.py` | Dạy mạng nơ-ron trên GPU, chấm trên người lạ giống `train.py`, hoặc dạy bản cuối (`--final`). |
| `nn/export.py` | Gộp BatchNorm, nén 8-bit, ghép vào `web/public/model/<ngôn ngữ>.json` (khoá `net`), kiểm tra bản nén bằng numpy và ghi `tests/fixtures/parity_nn.json` cho web đối chiếu. |
| `tests/` | Kiểm thử tự động, gồm cả bài đối chiếu để bản web và bản Python tính ra cùng một kết quả. |

## Chạy lại từ đầu

```bash
uv sync
uv run python fetch_viesign.py
curl -L -o models/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
curl -L -o models/pose_landmarker_lite.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
uv run python extract_all.py
uv run python train.py
uv run pytest -q
```

ASL (cần tài khoản Kaggle, và phải bấm đồng ý luật cuộc thi `asl-signs` trên trang Kaggle trước; gói nặng 37 GB):

```bash
uvx --with six kaggle competitions download -c asl-signs -p data/asl
uv run --no-project --python 3.12 --with mediapipe==0.10.14 --with opencv-python --with "numpy<2" python extract_holistic.py
uv run python extract_asl.py
uv run python train.py asl
```

Mạng nơ-ron cho ASL (cần GPU NVIDIA; PyTorch khoảng 2,5 GB):

```bash
uv sync --group nn
uv run python -m nn.cache asl
uv run python -m nn.train asl --dim 128 --aug strong --epochs 80 --folds all --tag cv   # chấm 5 phần, khoảng 1 giờ
uv run python -m nn.train asl --dim 128 --aug strong --epochs 80 --final --tag final    # bản cuối, khoảng 13 phút
uv run python -m nn.export asl --tag final --metrics data/nn_asl_conv_cv_metrics.json
```
