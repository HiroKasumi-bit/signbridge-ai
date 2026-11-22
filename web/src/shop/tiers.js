// Ba phân khúc găng SignBridge AI (trang /san-pham/). Phân khúc cao hơn: pin lâu hơn, dịch nhanh hơn.
// Pin và độ trễ là MỤC TIÊU thiết kế, chưa đo trên bản mẫu thật. Giá là giá dự kiến.
// Cấu tạo theo nghiên cứu linh kiện ở dự án găng: ~/Projects/gang-tay-ky-hieu/docs/02-linh-kien-va-vai.md
export const TIERS = [
  {
    id: 'lite', name: 'Lite', line: 'Gọn nhẹ, để bắt đầu',
    priceMillion: 0.6, batteryHours: 2, latencySec: 1.0,
    look: 'Găng thun mịn xám than, hộp cổ tay bo tròn như viên sỏi',
    parts: {
      fingers: 'Dải cảm biến uốn mềm may chìm dọc 5 ngón',
      hand: 'Cảm biến góc 9 trục ở mu bàn tay',
      camera: '1 camera ở cổ tay găng phải',
      brain: 'AI dịch chạy trên điện thoại, găng gửi số đo qua Bluetooth',
      battery: 'Pin 500 mAh trong hộp cổ tay',
      speaker: 'Đọc to qua điện thoại',
    },
  },
  {
    id: 'plus', name: 'Plus', line: 'Pin cả buổi, dịch ngay trên găng', recommended: true,
    priceMillion: 3.49, batteryHours: 5, latencySec: 0.6,
    look: 'Găng xanh đậm thương hiệu, cổ tay gọn, pin dẹt nằm êm trên mu bàn tay',
    parts: {
      fingers: 'Dải cảm biến uốn mềm, dây nối ngắn về mu tay nên ít nhiễu',
      hand: 'Cảm biến 9 trục tự tính góc (BNO055), nhanh và ít trôi',
      camera: '1 camera cổ tay, tự bật khi giơ tay để tiết kiệm pin',
      brain: 'AI dịch ngay trên găng, chỉ gửi chữ đi',
      battery: 'Pin dẹt 1000 mAh trên mu bàn tay',
      speaker: 'Hộp loa viên sỏi đi kèm',
    },
  },
  {
    id: 'pro', name: 'Pro', line: 'Nhanh nhất, có loa ngay trên tay',
    priceMillion: 4.99, batteryHours: 7, latencySec: 0.4,
    look: 'Găng thể thao trắng, hộp cổ tay có loa và nút nguồn vàng',
    parts: {
      fingers: 'Cảm biến góc trên từng ngón, đọc 100 lần mỗi giây',
      hand: 'Cảm biến 9 trục tự tính góc (BNO055)',
      camera: '2 camera, mỗi găng một chiếc: tay này khuất thì tay kia vẫn thấy mặt',
      brain: 'AI dịch ngay trên cả hai găng',
      battery: 'Pin 1000 mAh trên mu tay và 300 mAh ở cổ tay',
      speaker: 'Loa ngay trên hộp cổ tay',
    },
  },
]

// Có ở cả ba phiên bản
export const COMMON = [
  ['Vải sợi bạc ở đầu ngón và lòng bàn tay', 'Biết tay đang chạm mặt hay chạm áo, phân biệt những ký hiệu khác nhau ở chỗ chạm.'],
  ['Nam châm nhỏ giữa hai găng', 'Biết hai tay đang gần hay chạm nhau.'],
  ['Mô-tơ rung ở cổ tay', 'Rung nhẹ báo cho người Điếc biết câu đã được đọc to xong.'],
  ['Tháo rời phần điện tử', 'Nhấc hộp mạch ra là giặt được găng.'],
  ['Sạc USB-C', 'Dùng chung dây sạc điện thoại.'],
]

// Ghi giá đầy đủ kiểu Việt Nam: 600.000đ, 3.490.000đ
export const price = t => `${Math.round(t.priceMillion * 1e6).toLocaleString('vi-VN')}đ`
