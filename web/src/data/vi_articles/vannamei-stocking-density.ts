import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-stocking-density",
  section: "Quản lý trang trại",
  label: "Mật độ thả giống",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Mật độ Thả Giống Tôm Thẻ Chân Trắng (PL/m²): Hướng Dẫn Kỹ Thuật Toàn Diện & Công Cụ Tính",
  description: "Tính toán mật độ thả giống tôm thẻ chân trắng (PL/m²), tổng lượng tôm giống (PL) cần thả, công suất quạt nước (HP) và sức tải sinh học của ao (Carrying capacity) với công cụ tính toán và cẩm nang kỹ thuật thực chiến.",
  readTime: "8 phút đọc",
  tags: [
    "mật độ thả tôm thẻ chân trắng per m2",
    "mật độ thả tôm thẻ",
    "mật độ thả giống tôm",
    "số lượng tôm trên mét vuông",
    "PL trên m2",
    "mật độ nuôi tôm thâm canh",
    "mật độ nuôi bán thâm canh",
    "mật độ nuôi tôm siêu thâm canh",
    "thả bao nhiêu con tôm một mét vuông",
    "công cụ tính mật độ thả tôm thẻ",
  ],
  publishedAt: "2026-08-29",
  image: {
    src: "/resources/images/vannamei-stocking-density-infographic.jpg",
    alt: "Infographic mật độ thả giống tôm thẻ chân trắng (PL/m²) phân theo các mô hình quảng canh, bán thâm canh, thâm canh và siêu thâm canh, cùng tỷ lệ sống (SR), trọng lượng thân (ABW), sinh khối và công suất quạt nước",
    width: 1376,
    height: 768,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần mềm Quản lý Tăng trưởng & Lấy mẫu Tôm", href: "/vi/features/growth-sampling" },
  takeaways: [
    "Mật độ thả giống đơn thuần không quyết định độ an toàn của ao nuôi—sinh khối cực đại tại thời điểm thu hoạch và công suất quạt khí (mã lực HP) mới là yếu tố then chốt.",
    "Khung mật độ thả giống thương phẩm chuẩn: Quảng canh cải tiến (5–15 PL/m²), Bán thâm canh (20–50 PL/m²), Thâm canh (60–150 PL/m²), và Siêu thâm canh (150–300+ PL/m²).",
    "Duy trì quy chuẩn nghiêm ngặt tối thiểu 1 HP (mã lực) quạt khí cơ học cho mỗi 400 đến 500 kg sinh khối tôm hiện diện trong ao.",
    "Tính toán ngược từ mục tiêu thu hoạch: Sức tải sinh học ao nuôi (Carrying Capacity) → Công suất quạt khí hiện có → Trọng lượng bình quân mục tiêu (ABW) → Tỷ lệ sống dự kiến (SR) → Mật độ thả giống cần thiết.",
  ],
  faqs: [
    {
      question: "Mật độ thả giống tôm thẻ chân trắng khuyến nghị trên mỗi m² là bao nhiêu?",
      answer: "Mật độ thả giống tôm thẻ chân trắng (Litopenaeus vannamei) phụ thuộc trực tiếp vào cơ sở hạ tầng ao và hệ thống cung cấp oxy: 5–15 PL/m² đối với ao đất quảng canh cải tiến; 20–50 PL/m² đối với ao bán thâm canh; 60–150 PL/m² đối với ao thâm canh lót bạt HDPE có quạt nước cơ học; và 150–300+ PL/m² đối với bể tròn nổi hoặc hệ thống raceway siêu thâm canh trang bị sục khí oxy tinh khiết liên tục.",
    },
    {
      question: "Nên thả bao nhiêu con tôm post (PL) trên mỗi mét vuông ao nuôi?",
      answer: "Số lượng tôm giống trên mỗi mét vuông phải tương thích với công suất quạt khí cực đại và khả năng gom xả chất thải đáy ao. Một ao thâm canh tiêu chuẩn (ao đất đầm chặt hoặc lót bạt) với hệ thống quạt nước 8–10 HP/ha thường thả từ 60 đến 100 PL/m². Nếu công suất sục khí dưới ngưỡng 1 HP cho mỗi 500 kg sinh khối dự kiến, bắt buộc phải giảm mật độ thả để tránh tình trạng sụp oxy hòa tan lúc rạng sáng.",
    },
    {
      question: "Cách tính toán mật độ thả giống và tổng số lượng tôm giống (PL) cần đặt mua như thế nào?",
      answer: "Nhân diện tích mặt nước ao nuôi (m²) với mật độ thả mục tiêu (PL/m²). Ví dụ, ao diện tích 2.500 m² thả với mật độ 100 PL/m² sẽ cần 250.000 con giống (PL). Bạn nên cộng thêm 5% đến 10% lượng giống hao hụt thuần dưỡng (tổng cộng 262.500 đến 275.000 PL) nhằm bù đắp cho tỷ lệ hao hụt do sốc vận chuyển và thích nghi môi trường ban đầu.",
    },
    {
      question: "Sức tải sinh học của ao nuôi (Carrying capacity) là gì và giới hạn mật độ thả giống ra sao?",
      answer: "Sức tải sinh học (Carrying capacity) là tổng trọng lượng sinh khối tôm tối đa mà hệ sinh thái ao có thể duy trì mà không làm suy giảm chất lượng nước hoặc làm ngừng trệ sự tăng trưởng của tôm. Riêng mật độ thả không thể quyết định sức tải—công suất quạt khí cơ học hiện hữu (1 HP cho 400–500 kg sinh khối) cùng khả năng xi-phông, gom thải bùn đáy mới là yếu tố ấn định giới hạn an toàn này.",
    },
    {
      question: "Cần bao nhiêu mã lực (HP) quạt nước cho mỗi kg sinh khối tôm?",
      answer: "Các trang trại nuôi tôm thương phẩm yêu cầu tối thiểu 1 mã lực (HP) quạt lông nhím (cánh quạt nước) hoặc hệ thống sục khí đáy cho mỗi 400 đến 500 kg sinh khối tôm trong ao. Ví dụ, một ao chuẩn bị thu hoạch đạt 4.000 kg tôm đòi hỏi phải có 8 đến 10 HP máy quạt khí vận hành liên tục suốt đêm.",
    },
    {
      question: "Mật độ thả giống cao có làm giảm tốc độ tăng trưởng và kích cỡ thu hoạch của tôm không?",
      answer: "Có. Các công trình nghiên cứu và thực nghiệm tại đầm tôm chứng minh rằng mật độ trên 100–120 PL/m² làm gia tăng cạnh tranh không gian sống và khoáng chất hòa tan, thường làm giảm tốc độ tăng trưởng hàng ngày (ADG) từ 15% đến 25% và kéo dài thời gian nuôi để đạt kích cỡ thương phẩm lớn (tôm về size 30 con/kg).",
    },
    {
      question: "Mật độ thả giống an toàn cho ao đất so với ao lót bạt HDPE là bao nhiêu?",
      answer: "Ao đất không lót bạt không nên thả quá 30–50 PL/m² vì chất thải hữu cơ từ tôm tích tụ sẽ chuyển hóa thành lớp bùn đen yếm khí cực độc ở đáy ao. Ngược lại, ao lót bạt HDPE toàn phần có hố xi-phông rốn ao (central drain) có thể nuôi an toàn từ 80–150 PL/m² nếu đảm bảo đủ công suất quạt nước tạo dòng gom tụ chất thải.",
    },
    {
      question: "Khi nào người nuôi nên thu tỉa (sang thưa) để kiểm soát mật độ ao nuôi?",
      answer: "Nên tiến hành thu tỉa (giảm 20% đến 35% sinh khối) khi tổng trọng lượng tôm trong ao đạt mức 85% công suất tải của hệ thống quạt khí, hoặc khi nồng độ DO lúc rạng sáng giảm xuống dưới 4,0 mg/L sau ngày nuôi thứ 65 (DOC 65). Việc thu tỉa giải tỏa áp lực tiêu thụ oxy ngay lập tức, hạ nhu cầu thức ăn và kích thích tôm còn lại phát triển bứt phá.",
    },
  ],
  sections: [
    {
      heading: "Câu trả lời nhanh: Khung mật độ thả giống mục tiêu theo từng mô hình nuôi",
      body: [
        "Tôm thẻ chân trắng (Litopenaeus vannamei) nổi tiếng với tập tính bầy đàn và khả năng chịu đựng mật độ cao vượt trội hơn hẳn so với tôm sú (Penaeus monodon). Dẫu vậy, ngưỡng mật độ thả an toàn vẫn bị giới hạn nghiêm ngặt bởi hạ tầng ao nuôi, khả năng tuần hoàn/thay nước và công suất hệ thống quạt khí cơ học.",
        "Trước khi đặt mua tôm giống (Post-larvae/PL) từ trại giống (hatchery), bà con cần cân đối mật độ mục tiêu tương thích với cấp độ mô hình canh tác:",
      ],
      table: {
        columns: ["Mô hình nuôi", "Mật độ thả (PL/m²)", "Hạ tầng ao & Công suất quạt khí", "Sinh khối mục tiêu (kg/m²)", "Năng suất thu hoạch phổ biến"],
        rows: [
          ["Quảng canh cải tiến", "5 – 15 PL/m²", "Ao đất lớn/rừng ngập mặn; thay nước tự nhiên theo thủy triều; sục khí 0 – 2 HP", "0,1 – 0,4 kg/m²", "1,0 – 3,5 tấn / ha"],
          ["Bán thâm canh", "20 – 50 PL/m²", "Ao đất đầm nén kỹ; quạt nước cơ học (4 – 8 HP/ha); thức ăn công nghiệp hoàn toàn", "0,5 – 1,2 kg/m²", "5,0 – 11,0 tấn / ha"],
          ["Thâm canh (Intensive)", "60 – 150 PL/m²", "Lót bạt nhựa HDPE toàn phần; hố xi-phông đáy rốn ao; quạt nước chuyên dụng (16 – 28 HP/ha)", "1,2 – 2,5 kg/m²", "12,0 – 25,0 tấn / ha"],
          ["Siêu thâm canh (Super-intensive)", "150 – 300+ PL/m²", "Bể tròn lót bạt HDPE/bê tông; sục khí oxy tinh khiết + đĩa sục khí micro-pore; xi-phông rốn ao xả đáy hàng ngày", "3,0 – 8,0+ kg/m²", "30,0 – 80,0+ tấn / ha"],
        ],
      },
      note: "Tuyệt đối không lựa chọn mật độ thả giống chỉ dựa vào giá tôm giống rẻ hay kỳ vọng doanh thu viển vông. Nếu ao nuôi chưa lót bạt HDPE hoặc thiếu hệ thống quạt khí cơ học vận hành liên tục, việc thả trên 50 PL/m² chắc chắn sẽ gây tích tụ bùn đen đáy ao độc hại và dẫn đến sự cố sụp đổ oxy hòa tan sau ngày nuôi thứ 60 (DOC 60).",
    },
    {
      heading: "Mối liên kết cốt lõi: Vì sao mật độ đơn thuần không quyết định sự an toàn của vụ nuôi",
      body: [
        "Sai lầm nguy hại phổ biến trong ngành nuôi tôm là nhìn nhận mật độ thả như một con số độc lập. Người nuôi thường hỏi: 'Tôi có thể thả 100 PL/m² không?' Câu trả lời chuẩn xác về mặt sinh học phải là: 'Sinh khối tôm lúc thu hoạch dự kiến đạt bao nhiêu tấn, và bạn đang có bao nhiêu mã lực (HP) quạt nước?'",
        "Mật độ thả chỉ là biến số đầu vào khởi điểm. Một vụ nuôi tôm an toàn và có lãi phụ thuộc hoàn toàn vào chuỗi mắt xích sinh học đồng bộ: Mật độ thả giống → Tỷ lệ sống (SR) → Trọng lượng bình quân thân tôm (ABW/MBW) → Tổng sinh khối trong ao → Công suất hệ thống quạt khí → Sức tải sinh học của ao (Carrying Capacity).",
        "Hãy xem xét bài học so sánh thực tế giữa hai ao nuôi cạnh nhau:",
        "Ao A thả 100 PL/m² trong ao đất không lót bạt. Do điều kiện môi trường nước và đáy ao bị quá tải, tỷ lệ sống tụt xuống 50%, tôm bị chững lớn ở trọng lượng ABW 15 gram. Sinh khối thu hoạch thực tế đạt 0,75 kg/m² (7,5 tấn/ha). Vụ nuôi có thu hoạch nhưng hệ số thức ăn (FCR) đội lên quá cao khiến lợi nhuận hoàn toàn bốc hơi.",
        "Ao B chỉ thả 80 PL/m² trong ao được đầu tư quạt nước bài bản. Đáy ao sạch sẽ giúp giữ vững tỷ lệ sống 85%, tôm phát triển vượt trội đạt kích cỡ 25 gram/con (về size 40 con/kg). Sinh khối thu hoạch thực tế lên tới 1,70 kg/m² (17,0 tấn/ha)—tạo ra lượng chất thải, nhu cầu thức ăn và lượng tiêu thụ oxy cao gấp hơn 2 lần Ao A, dù lượng tôm giống ban đầu thả ít hơn 20%!",
        "Bởi vậy, các nhà quản lý trang trại chuyên nghiệp luôn áp dụng nguyên tắc tính toán ngược: xác định sức tải sinh học an toàn tối đa và giới hạn công suất quạt khí của ao trước, sau đó mới suy ra mật độ thả giống hợp lý.",
      ],
    },
    {
      heading: "Công cụ tính toán mật độ thả tôm thẻ chân trắng",
      body: [
        "Sử dụng công cụ tính toán dưới đây để lập mô hình mô phỏng vụ nuôi trước khi đặt hàng tôm giống từ trại sản xuất. Điều chỉnh diện tích mặt nước ao nuôi, mật độ mục tiêu, tỷ lệ sống dự kiến và trọng lượng thu hoạch bình quân (ABW) để dự toán tổng số lượng tôm post cần thả, tổng công suất quạt nước (HP) đòi hỏi và tải lượng sinh học tổng thể của ao.",
        "Ví dụ tính toán định mức tiêu chuẩn: Một ao nuôi 2.500 m² thả mật độ 100 PL/m² cần 250.000 con post (PL). Với tỷ lệ sống dự kiến 75% và trọng lượng thu hoạch bình quân 20 gram (size 50 con/kg), ao sẽ tạo ra 3.750 kg (3,75 tấn) sinh khối tôm. Để duy trì sinh khối cực đại này một cách an toàn, ao bắt buộc phải có từ 8 đến 10 HP quạt nước vận hành ổn định tại giai đoạn về đích.",
      ],
      note: "Luôn dự phòng thêm 5% đến 10% lượng tôm giống hao hụt khi đặt hàng. Ví dụ, nếu kết quả tính toán ao cần 250.000 PL, hãy đặt mua từ 262.500 đến 275.000 PL để bù trừ sai số quy cách đóng bao đóng thùng và tỷ lệ hao hụt do sốc nhiệt, sốc độ mặn trong quá trình vận chuyển và thả giống.",
    },
    {
      heading: "Sức tải sinh học (Carrying capacity) và quy tắc thiết kế công suất quạt khí",
      body: [
        "Sức tải sinh học (Carrying capacity) là trọng lượng sinh khối tôm tối đa mà hệ sinh thái ao nuôi có thể nâng đỡ mà không gây suy thoái phẩm chất nước hoặc làm sụt giảm tốc độ tăng trưởng. Trong kỹ thuật nuôi tôm thẻ chân trắng hiện đại, sức tải sinh học gần như bị chi phối tuyệt đối bởi nguồn cấp oxy hòa tan và năng lực thu gom, xử lý chất thải đáy ao.",
        "Quy tắc vàng về sục khí trong nuôi tôm thương phẩm (được đúc kết bởi GS. Claude Boyd và khuyến cáo trong các cẩm nang FAO) là: 1 Mã lực (HP) sục khí cơ học nâng đỡ được từ 400 đến 500 kg sinh khối tôm sống.",
        "Ở giai đoạn đầu vụ (DOC 1–30), quá trình quang hợp của tảo tự nhiên kết hợp vận hành quạt nước nhẹ nhàng đã đáp ứng dư giả nhu cầu hô hấp của tôm nhỏ. Tuy nhiên, sau ngày nuôi 60 (DOC 60), nhu cầu oxy tăng vọt theo hàm lũy thừa do tổng lượng tiêu thụ oxy cộng dồn của sinh khối tôm lớn, vi khuẩn nitrat hóa và quá trình phân hủy yếm khí của bùn bã hữu cơ đáy ao.",
        "Nếu chỉ số oxy hòa tan (DO) lúc rạng sáng giảm xuống dưới 4,0 mg/L, tôm sẽ lập tức giảm ăn, tốc độ tăng trọng hàng ngày (ADG) chững lại và nguy cơ bùng phát vi khuẩn Vibrio cũng như hội chứng phân trắng (WFS) tăng gấp nhiều lần.",
      ],
      table: {
        columns: ["Tổng sinh khối tôm (kg)", "Mật độ sinh khối (Ao 2.500 m²)", "Công suất quạt tối thiểu (1 HP / 500 kg)", "Công suất quạt khuyến nghị (1 HP / 400 kg)", "Kiểm soát bùn đáy & Quy trình vận hành"],
        rows: [
          ["1.000 kg", "0,40 kg/m²", "2,0 HP", "2,5 HP", "Đáy ao sạch; quá trình khoáng hóa tự nhiên diễn ra tốt; quạt nước chạy ngắt quãng."],
          ["2.000 kg", "0,80 kg/m²", "4,0 HP", "5,0 HP", "Bắt đầu tích tụ chất thải hữu cơ ở tâm ao; quạt nước vận hành xuyên suốt đêm."],
          ["3.500 kg", "1,40 kg/m²", "7,0 HP", "8,8 HP", "Tải lượng hữu cơ cao; bắt buộc xả hố xi-phông định kỳ; quạt nước chạy 100% công suất từ nửa đêm."],
          ["5.000 kg", "2,00 kg/m²", "10,0 HP", "12,5 HP", "Tiệm cận giới hạn sức tải ao thâm canh; bắt buộc lót bạt HDPE và hút xi-phông đáy hàng ngày."],
          ["7.500 kg+", "3,00+ kg/m²", "15,0 HP", "18,8 HP+", "Tải lượng siêu thâm canh; bắt buộc cấp oxy tinh khiết/ống sục venturi và hệ thống máy phát điện dự phòng tự động."],
        ],
      },
    },
    {
      heading: "Dấu hiệu cảnh báo ao tôm đang bị quá tải mật độ",
      body: [
        "Thả giống vượt quá sức tải sinh học của ao không phải lúc nào cũng dẫn đến hiện tượng tôm chết hàng loạt ngay lập tức. Thông thường, nó gây ra stress mãn tính dưới mức gây chết (sub-lethal stress), âm thầm bào mòn hiệu quả chuyển hóa thức ăn và triệt tiêu lợi nhuận cả vụ nuôi. Hãy cảnh giác với các dấu hiệu điển hình sau trong quá trình kiểm tra ao và lấy mẫu định kỳ:",
      ],
      items: [
        "Tôm tụ tập quanh dòng chảy quạt nước vào ban ngày: Tôm bơi lờ đờ hoặc gom lại ở vệt nước quạt ban ngày là biểu hiện tôm bị thiếu oxy nghiêm trọng hoặc đang tháo chạy khỏi khí độc hydro sunfua (H2S) bốc lên từ đáy ao.",
        "Phân đàn mạnh, chênh lệch kích cỡ lớn khi chài kiểm tra mẫu: Một mẻ chài thu được cả tôm lớn 18g lẫn tôm còi cọc 9g chứng tỏ đang xảy ra sự cạnh tranh thức ăn khốc liệt do mật độ nuôi quá dày.",
        "Oxy hòa tan (DO) lúc rạng sáng < 3,8 mg/L: DO tầng đáy đo từ 04:00 đến 05:30 sáng tụt xuống dưới 3,8 mg/L là bằng chứng xác thực sinh khối tôm trong ao đã vượt quá công suất đáp ứng của dàn quạt khí.",
        "Bọt nâu dày đặc kéo dài trên mặt nước: Váng bọt màu nâu tích tụ ở góc cuối gió khó tan phản ánh hàm lượng chất hữu cơ hòa tan tăng vọt do tích tụ phân tôm và xác tảo tàn.",
        "Tốc độ tăng trưởng chững lại sau DOC 50: Tốc độ tăng trọng bình quân ngày (ADG) giảm xuống dưới 0,15 g/ngày dù sàng ăn (nhá ăn) vẫn hết sạch là tín hiệu cho thấy ao đã chạm ngưỡng sức chứa.",
        "Tôm bị mềm vỏ và mang bẩn (đen mang, vàng mang): Mật độ quá dày làm bùng phát độc lực amonia tổng số (TAN > 1,0 mg/L) và nitrit (NO2-N > 0,5 mg/L), ức chế quá trình tái tạo vỏ cứng sau lột xác.",
      ],
    },
    {
      heading: "Các nguyên nhân phổ biến dẫn đến thất bại do mật độ và cách kiểm tra",
      body: [
        "1. Bố trí quạt khí thiếu công suất so với sinh khối cực đại: Người nuôi thường chỉ tính toán số dàn quạt theo nhu cầu ở ngày nuôi 30 (DOC 30) thay vì dự toán tải trọng của ngày 80 lúc chuẩn bị thu hoạch. Dấu hiệu xác minh: Đo DO đạt 6,5 mg/L lúc 14:00 chiều nhưng sụt thảm hại xuống 2,8 mg/L lúc 04:30 rạng sáng.",
        "2. Đánh giá sai tỷ lệ sống ban đầu dẫn đến cho ăn dư thừa: Lầm tưởng tỷ lệ sống đạt 85% trong khi thực tế chỉ còn 60% khiến lượng thức ăn hàng ngày bị thừa nghiêm trọng, gây đầu độc nền đáy ao. Dấu hiệu xác minh: Lượng tôm chài mẫu thực tế thấp hơn nhiều so với dự tính của bảng định mức thức ăn, kèm theo bùn đáy ao có hiện tượng đen hóa.",
        "3. Nón bùn chất thải lan rộng vượt khỏi hố xi-phông trung tâm: Ở mật độ trên 100 PL/m², tốc độ lắng đọng chất thải hữu cơ vượt quá tốc độ gom dòng chảy của quạt nước, phủ kín các vùng cho tôm ăn bằng lớp bùn lắng yếm khí độc hại. Dấu hiệu xác minh: Khi kéo chài mẫu, bùn đen có mùi trứng thối đặc trưng của khí độc H2S bám chặt vào chân chì của chài.",
        "4. Thả tôm giống trôi nổi, kém chất lượng, sức đề kháng yếu: Con giống không có chứng nhận SPF (sạch mầm bệnh) dễ bị hao hụt lớn trong 14 ngày đầu, khiến số tôm còn lại phát triển lệch kích cỡ và dễ nhiễm bệnh. Dấu hiệu xác minh: Mẫu tôm giống không vượt qua bài kiểm tra sốc formalin hoặc sốc nhiệt (thử nghiệm trên 100 con post) trước khi thả ra ao nuôi.",
      ],
    },
    {
      heading: "Hành động cấp bách khi sinh khối đe dọa vượt quá sức tải ao nuôi",
      body: [
        "Nếu số liệu kiểm tra mẫu hàng tuần cho thấy tổng sinh khối đang tiệm cận hoặc vượt quá công suất của hệ thống quạt khí (vượt quá 500 kg sinh khối/1 HP), bà con cần hành động dứt khoát để bảo vệ đàn tôm:",
        "1. Tiến hành thu tỉa (sang bớt sinh khối): Thu hoạch chọn lọc từ 20% đến 35% lượng tôm kích cỡ lớn nhất bằng lưới chài hoặc lú/bẫy thu tỉa. Thu tỉa giúp giải tỏa tức thì áp lực oxy, giảm chi phí thức ăn mỗi ngày và tạo không gian cho lượng tôm còn lại bứt phá trọng lượng.",
        "2. Điều chỉnh góc quay và vị trí dàn quạt nước: Căn chỉnh hướng dòng chảy của quạt lông nhím để tạo dòng xoáy tròn đủ mạnh, gom toàn bộ xác hữu cơ và bùn bã vào tâm hố xi-phông rốn ao, bảo vệ khu vực rìa chân bờ ao luôn sạch cho tôm ăn.",
        "3. Giảm ngay 15% đến 25% khẩu phần ăn hàng ngày: Khi chỉ số DO rạng sáng thấp hơn 4,0 mg/L hoặc nồng độ nitrit (NO2-N) vượt quá 0,5 mg/L, bắt buộc phải cắt giảm thức ăn ngay. Tôm trong điều kiện thiếu oxy sẽ tiêu hóa rất kém; lượng cám dư thừa sẽ phân hủy làm nước ô nhiễm cấp tính.",
      ],
      note: "Tuyệt đối không tăng lượng thức ăn hoặc bổ sung phân đạm tự do nhằm thúc tôm chậm lớn 'bắt kịp đàn' trong ao nuôi quá tải. Đạm dư thừa sẽ nhanh chóng phân hủy tạo thành khí độc amonia tự do (NH3) và hydro sunfua (H2S), dẫn đến nguy cơ tôm chết rải rác hoặc chết hàng loạt.",
    },
    {
      heading: "Chiến lược thả giống dài hạn và quản lý vụ nuôi bền vững",
      body: [
        "Nuôi tôm bền vững và hiệu quả kinh tế cao đòi hỏi phải linh hoạt điều chỉnh mật độ thả giống theo mùa vụ thời tiết và lộ trình nâng cấp hạ tầng trang trại:",
        "Ứng dụng giai đoạn ương vèo (nursery) tập trung: Ương tôm giống (từ PL10 đến PL12) trong bể vèo nhỏ có sục khí mạnh trong 18 đến 25 ngày cho tới khi đạt kích cỡ tôm giống lớn (0,5 đến 1,0 gram/con) giúp tăng tỷ lệ sống toàn vụ thêm 15% đến 20%. Mô hình này cũng rút ngắn thời gian nuôi trong ao lớn gần một tháng, giảm thiểu rõ rệt rủi ro bùng phát dịch bệnh.",
        "Điều chỉnh mật độ theo mùa vụ thời tiết: Giảm mật độ thả từ 20% đến 30% vào mùa mưa hoặc các tháng lạnh nhiệt độ thấp, khi khả năng tạo oxy từ quang hợp bị suy giảm và các cơn mưa dông lớn dễ gây phân tầng nước, sốc độ mặn.",
        "Theo dõi số liệu vụ nuôi theo thời gian thực: Ứng dụng Shrimply để ghi nhận trọng lượng mẫu chài hàng tuần, theo dõi xu hướng tăng trưởng MBW và đối chiếu sinh khối ao nuôi với công suất quạt khí thực tế trước khi thả giống cho vụ tiếp theo.",
      ],
    },
  ],
  checklist: [
    "Tính toán ngược mật độ thả giống mục tiêu từ công suất hệ thống quạt khí (1 HP cho mỗi 400–500 kg sinh khối cực đại).",
    "Đặt tôm giống (PL) kèm tỷ lệ hao hụt dự phòng từ 5% đến 10% để bù đắp sốc vận chuyển và thuần hóa ban đầu.",
    "Đo đạc kiểm tra oxy hòa tan (DO) lúc rạng sáng (04:00 – 05:30) mỗi ngày, duy trì DO tầng đáy luôn trên mức 4,0 mg/L.",
    "Tiến hành chài kiểm tra mẫu định kỳ hàng tuần để theo dõi ABW, kiểm chứng ADG và giám sát sinh khối thực tế trong ao.",
    "Lập kế hoạch thu tỉa kịp thời nếu sinh khối tôm đạt 85% công suất tải sục khí trước khi tôm đạt size thu hoạch mong muốn.",
    "Ghi chép nhật ký thả giống, trọng lượng mẫu và lượng thức ăn hàng ngày trên Shrimply để tránh nguy cơ vượt sức tải ao nuôi.",
  ],
  sources: [
    {
      title: "Growth and Survival of Litopenaeus vannamei at Different Stocking Densities",
      publisher: "FAO AGRIS",
      url: "https://agris.fao.org/search/en/providers/124569/records/66743ee7eb5a381a3380f4b1",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
  ],
};
