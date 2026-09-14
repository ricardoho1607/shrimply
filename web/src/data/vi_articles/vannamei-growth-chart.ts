import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-growth-chart",
  section: "Tăng trưởng & Thu mẫu",
  label: "Biểu đồ tăng trưởng",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Biểu Đồ Tăng Trưởng Tôm Thẻ Chân Trắng: Trọng Lượng Chuẩn ABW, Tốc Độ ADG và Kích Cỡ Theo DOC",
  description:
    "Theo dõi trọng lượng chuẩn của tôm thẻ chân trắng (Litopenaeus vannamei) theo từng ngày tuổi nuôi (DOC). Đối chiếu trọng lượng thân bình quân (ABW/MBW), tốc độ tăng trưởng bình quân ngày (ADG) và kích cỡ thương phẩm (size con/kg) để tối ưu hóa vụ nuôi.",
  readTime: "7 phút đọc",
  tags: [
    "biểu đồ tăng trưởng tôm thẻ chân trắng",
    "tốc độ tăng trưởng tôm thẻ",
    "tăng trưởng tôm theo DOC",
    "trọng lượng tôm thẻ theo ngày tuổi",
    "ADG tôm thẻ chân trắng",
    "tăng trọng bình quân ngày của tôm",
    "ABW tôm thẻ",
    "MBW tôm thẻ chân trắng",
    "bảng kích cỡ tôm thẻ",
    "trọng lượng tôm thẻ 30 ngày",
    "trọng lượng tôm thẻ 60 ngày",
    "trọng lượng tôm thẻ 90 ngày",
  ],
  publishedAt: "2026-08-29",
  image: {
    src: "/resources/images/vannamei-growth-chart-abw-adg-doc.png",
    alt: "Infographic Shrimply minh họa đường cong tăng trưởng chuẩn của tôm thẻ chân trắng, trọng lượng thân bình quân (ABW) và tốc độ tăng trưởng bình quân ngày (ADG) theo ngày tuổi từ DOC 30 đến DOC 120",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần mềm Quản lý Tăng trưởng & Lấy mẫu Tôm", href: "/vi/features/growth-sampling" },
  takeaways: [
    "Tôm thẻ chân trắng nuôi thương phẩm trong ao thâm canh và bán thâm canh thường đạt trọng lượng 10–12 g tại ngày nuôi thứ 60 (DOC 60) và đạt 18–22 g tại ngày nuôi thứ 90 (DOC 90).",
    "Đàn tôm khỏe mạnh đạt mức tăng trọng từ 0,25 g đến 0,35 g mỗi ngày (ADG) trong giai đoạn tăng trưởng bứt phá cao điểm từ ngày nuôi 45 đến ngày 80.",
    "Tuyệt đối không tăng lượng thức ăn chỉ vì thấy tôm chậm lớn; luôn kiểm tra nồng độ oxy hòa tan lúc rạng sáng và lượng thức ăn thừa trên nhá (sàn ăn) trước tiên.",
  ],
  faqs: [
    {
      question: "Trọng lượng chuẩn của tôm thẻ chân trắng ở ngày nuôi thứ 30, 60 và 90 (DOC) là bao nhiêu?",
      answer:
        "Trong điều kiện nuôi thương phẩm tiêu chuẩn (mật độ 60–120 PL/m², nhiệt độ nước 28–32°C), tôm thẻ chân trắng thường đạt trọng lượng 3,2–4,5 g tại DOC 30; 10,5–12,5 g tại DOC 60; và 18,5–22,0 g tại DOC 90.",
    },
    {
      question: "Chỉ số ADG (tốc độ tăng trọng bình quân ngày) thế nào là tốt đối với tôm thẻ chân trắng?",
      answer:
        "Mục tiêu ADG chuẩn kỹ thuật là 0,10–0,15 g/ngày trong giai đoạn ương vèo và tôm nhỏ (DOC 1–30), tăng vọt lên 0,25–0,35 g/ngày trong giai đoạn tăng trưởng bứt phá (DOC 45–80), và giảm dần tự nhiên về mức 0,20–0,26 g/ngày sau DOC 90.",
    },
    {
      question: "Mất bao lâu để tôm thẻ chân trắng đạt kích cỡ thu hoạch thương phẩm?",
      answer:
        "Tôm thẻ chân trắng đạt kích cỡ thương phẩm phổ biến (20 gram/con tương đương size 50 con/kg) trong khoảng 85 đến 100 ngày nuôi. Để nuôi về kích cỡ lớn hơn (28–32 gram/con tương đương size 30–35 con/kg), thời gian nuôi thường kéo dài từ 115 đến 130 ngày.",
    },
    {
      question: "Tại sao tôm không tăng trọng dù nhá (sàn ăn) lúc nào cũng sạch thức ăn?",
      answer:
        "Nhá ăn sạch chỉ chứng tỏ thức ăn trên nhá đã được tiêu thụ hết. Nếu trọng lượng tôm dậm chân tại chỗ, có thể do tỷ lệ sống (SR) trong ao cao hơn dự tính (dẫn đến lượng thức ăn phân bổ trên mỗi cá thể bị thiếu), thức ăn rải không đều khắp ao, hoặc tôm bị nhiễm vi bào tử trùng EHP (Enterocytozoon hepatopenaei) phá hủy ống gan tụy khiến tôm không hấp thu được dinh dưỡng.",
    },
    {
      question: "Cách quy đổi trọng lượng bình quân của tôm (ABW/MBW) ra kích cỡ (size con/kg) như thế nào?",
      answer:
        "Lấy 1.000 chia cho trọng lượng thân bình quân (ABW tính bằng gram). Ví dụ: 1.000 chia cho 11,5 g tương đương kích cỡ khoảng 87 con/kg (size 87).",
    },
    {
      question: "Mật độ thả giống cao có làm chậm tốc độ tăng trưởng của từng cá thể tôm không?",
      answer:
        "Có. Trong các ao nuôi thả trên 120–150 con/m², sự cạnh tranh gay gắt về không gian hoạt động, thức ăn và khoáng chất hòa tan thường làm giảm tốc độ tăng trọng bình quân của từng con từ 15% đến 25% so với ao mật độ thấp hơn. Người nuôi có thể tính toán mật độ an toàn và giới hạn công suất sục khí bằng [Công cụ Tính Mật độ Thả Giống Tôm Thẻ](/vi/resources/vannamei-stocking-density).",
    },
  ],
  sections: [
    {
      heading: "Tóm tắt nhanh: Tốc độ tăng trưởng chuẩn của tôm thẻ chân trắng",
      body: [
        "Tôm thẻ chân trắng (Litopenaeus vannamei) khỏe mạnh thường đạt trọng lượng 10 đến 12 gram ở ngày nuôi thứ 60 (DOC 60) và 18 đến 22 gram ở ngày nuôi thứ 90 (DOC 90) trong các mô hình ao nuôi thâm canh và bán thâm canh thương phẩm.",
        "Tốc độ tăng trưởng bắt đầu chậm trong 30 ngày đầu tiên (tăng khoảng 0,10 đến 0,15 g/ngày), bứt phá mạnh mẽ sau ngày 40 (thường vượt mức 0,25 đến 0,35 g/ngày), và chậm dần một cách tự nhiên khi sinh khối trong ao tiệm cận sức tải sinh học (carrying capacity). Nếu tôm của bạn tăng trưởng dưới 0,18 g/ngày sau ngày nuôi thứ 45 (DOC 45), hãy kiểm tra ngay nồng độ oxy hòa tan ban đêm và lượng thức ăn thừa trên nhá.",
      ],
    },
    {
      heading: "Tầm quan trọng của việc theo dõi tốc độ tăng trưởng tôm",
      body: [
        "Chi phí thức ăn chiếm từ 50% đến 60% tổng chi phí vận hành trang trại. Nếu tốc độ lớn của tôm bị chững lại trong khi lượng cám cho ăn vẫn liên tục tăng theo ngày tuổi, thức ăn dư thừa sẽ tích tụ và thối rữa dưới đáy ao, làm suy thoái nghiêm trọng chất lượng nước và đội hệ số chuyển đổi thức ăn (FCR) lên cao.",
        "Đo đạc trọng lượng chính xác qua các lần chài mẫu còn giúp người nuôi ước tính đúng sinh khối thực tế trong ao, đảm bảo không bao giờ vượt quá công suất cung cấp của hệ thống quạt nước và sục khí, đồng thời lựa chọn thời điểm thu hoạch tối ưu tương ứng với các khung giá thương lái thu mua theo kích cỡ tôm (size).",
      ],
    },
    {
      heading: "Biểu đồ & Bảng tăng trưởng tôm thẻ chân trắng theo ngày tuổi (DOC)",
      body: [
        "Bảng dưới đây trình bày các khoảng tăng trưởng mục tiêu của tôm thẻ chân trắng (L. vannamei) trong các ao nuôi thương phẩm tiêu chuẩn (mật độ thả 60–120 PL/m², nhiệt độ nước 28–32°C, độ mặn 15–25 ppt, hàm lượng đạm thức ăn 35–38%).",
      ],
      table: {
        columns: ["Ngày tuổi (DOC)", "Trọng lượng chuẩn / ABW (g)", "Tốc độ ADG chuẩn (g/ngày)", "Kích cỡ (Size con/kg)", "Ngữ cảnh sản xuất & Các mốc kỹ thuật"],
        rows: [
          ["DOC 30", "3,2 – 4,5 g", "0,10 – 0,15 g/ngày", "220 – 310 con/kg", "Chuyển giao từ thức ăn ương vèo sang thức ăn viên tôm nhỏ; đợt chài mẫu kiểm tra đầu tiên."],
          ["DOC 45", "6,5 – 8,2 g", "0,20 – 0,26 g/ngày", "120 – 155 con/kg", "Bắt đầu giai đoạn tăng trưởng nhanh; việc canh nhá và điều chỉnh thức ăn trở nên đặc biệt quan trọng."],
          ["DOC 60", "10,5 – 12,5 g", "0,25 – 0,32 g/ngày", "80 – 95 con/kg", "Mốc giữa vụ nuôi; sinh khối ao tăng vọt, nhu cầu tiêu thụ oxy hòa tan gia tăng nhanh chóng."],
          ["DOC 75", "14,5 – 17,0 g", "0,28 – 0,35 g/ngày", "58 – 70 con/kg", "Giai đoạn tăng trọng hàng ngày đạt đỉnh (đỉnh ADG); theo dõi sát sao hiện tượng tụt oxy ban đêm."],
          ["DOC 90", "18,5 – 22,0 g", "0,25 – 0,33 g/ngày", "45 – 55 con/kg", "Kích cỡ thu hoạch thương phẩm tiêu chuẩn (size 50 con/kg); cân nhắc phương án thu tỉa (sang thưa)."],
          ["DOC 105", "22,5 – 26,0 g", "0,22 – 0,30 g/ngày", "38 – 45 con/kg", "Tốc độ lớn giảm dần tự nhiên; hiệu quả chuyển đổi thức ăn bắt đầu giảm khi sinh khối đạt đỉnh."],
          ["DOC 120", "26,0 – 30,5 g", "0,18 – 0,26 g/ngày", "32 – 38 con/kg", "Kích cỡ tôm lớn thương phẩm (về size 30 con/kg); giai đoạn rủi ro cao đối với chất lượng nước và đáy ao."],
        ],
      },
      note: "Tốc độ tăng trưởng thực tế phụ thuộc vào mật độ thả giống, nhiệt độ môi trường và chế độ quản lý thức ăn. Các ao nuôi mật độ cao (>150 con/m²) thường có tốc độ tăng trọng cá thể chậm hơn (0,18–0,22 g/ngày).",
    },
    {
      heading: "Cách tính tốc độ tăng trưởng bình quân ngày (ADG)",
      body: [
        "Tôm không tăng trưởng cứng nhắc theo số ngày trên lịch—mà phát triển dựa trên tốc độ tăng trưởng bình quân ngày (ADG) giữa hai đợt chài mẫu liên tiếp.",
        "Công thức: ADG (g/ngày) = (Trọng lượng mẫu hiện tại − Trọng lượng mẫu lần trước) / Số ngày giữa hai lần chài mẫu",
        "Ví dụ: Nếu tôm của bạn đạt trọng lượng bình quân 5,4 g ở ngày 48 và đạt 7,2 g ở ngày 55 (sau 7 ngày), thì mức tăng trọng là 1,8 g chia cho 7 ngày = 0,26 g/ngày. Với tốc độ phát triển này, trọng lượng bình quân dự kiến (ABW) ở đợt kiểm tra mẫu tuần tiếp theo (ngày 62) sẽ đạt khoảng 9,0 g.",
      ],
    },
    {
      heading: "Dấu hiệu cảnh báo tôm bị chững lớn (chậm lớn)",
      body: [
        "Phát hiện sớm tình trạng tôm chậm lớn sẽ giúp người nuôi tiết kiệm hàng triệu đồng tiền thức ăn lãng phí. Hãy chú ý các dấu hiệu cảnh báo sau trong các đợt chài mẫu hàng tuần và kiểm tra nhá ăn hàng ngày:",
      ],
      items: [
        "Tôm bị phân đàn (chênh lệch kích cỡ lớn): Sự cách biệt rõ rệt giữa tôm lớn và tôm nhỏ trong cùng một mẻ chài cho thấy sự cạnh tranh thức ăn không đồng đều hoặc đàn tôm đang ủ bệnh dưới dạng cận lâm sàng.",
        "Thức ăn thừa trên nhá: Thức ăn còn dư trên nhá sau 2 đến 2,5 giờ là tín hiệu báo động tôm đang giảm ăn hoặc bỏ ăn đột ngột.",
        "Đường ruột trống hoặc đứt khúc: Đường ruột tôm trong suốt, có dịch lỏng hoặc đứt khúc trong các cữ ăn ban ngày cho thấy tôm ăn yếu, đường ruột bị tổn thương hoặc đường ruột có vấn đề.",
        "Chỉ số ADG tụt xuống dưới 0,18 g/ngày (sau DOC 45): Tốc độ tăng trọng sụt giảm hơn 25% so với số liệu ghi nhận ở tuần trước đó.",
        "Oxy hòa tan (DO) ban đêm < 3,8 mg/L: Tình trạng thiếu dưỡng khí dưới ngưỡng nguy hại sẽ làm tôm ngừng lớn dù không ghi nhận tôm chết rớt đáy.",
      ],
    },
    {
      heading: "Nguyên nhân phổ biến và các bước kiểm tra xác minh",
      body: [
        "1. Thiếu oxy hòa tan lúc rạng sáng (DO thấp): Đo nồng độ DO trong khoảng từ 04:00 đến 06:00 sáng tại tầng đáy ao. Chỉ số dưới 3,8 mg/L buộc tôm phải chuyển sang trạng thái duy trì sinh tồn thay vì tích lũy sinh khối để tăng trọng.",
        "2. Cho ăn thiếu định lượng hoặc rải cám không đều: Thức ăn trên nhá hết sạch chỉ trong 45 phút, nhưng kết quả chài mẫu lại cho thấy tôm phân đàn mạnh do những con tôm khỏe tranh giành hết phần ăn của những con yếu hơn.",
        "3. Ao nuôi chạm ngưỡng sức tải sinh học (Carrying capacity): Tôm chững lớn sau ngày 75 (DOC 75) khi tổng sinh khối vượt quá công suất vận hành của dàn quạt khí (tiêu chuẩn tối thiểu 1 HP cho mỗi 400–500 kg sinh khối).",
        "4. Mất cân bằng khoáng và độ kiềm thấp: Độ kiềm dưới 100 mg/L CaCO₃ hoặc thiếu hụt khoáng vi lượng khiến tôm khó làm cứng vỏ sau khi lột xác, làm gián đoạn chu kỳ tăng trưởng.",
        "5. Nhiễm vi bào tử trùng EHP mãn tính: Nhá ăn vẫn sạch bình thường, nhưng chỉ số ADG dậm chân tại chỗ dưới mức 0,12 g/ngày, thường kèm theo hiện tượng tôm đi phân trắng (bệnh phân trắng) hoặc gan tụy teo nhợt nhạt.",
      ],
    },
    {
      heading: "Hành động cấp thiết khi tôm bị chững lớn",
      body: [
        "Thứ nhất, kiểm tra ngay nồng độ oxy hòa tan (DO) lúc rạng sáng để đảm bảo oxy tầng đáy luôn duy trì trên 4,0 mg/L trước khi mặt trời mọc.",
        "Thứ hai, nếu nhá ăn còn thừa thức ăn, hãy cắt giảm ngay 15% đến 20% khẩu phần ăn hàng ngày để bảo vệ môi trường nước và đáy ao không bị nhiễm bẩn.",
        "Thứ ba, đo kiểm độ kiềm trong ao và duy trì ở mức 120–160 mg/L bằng cách bổ sung natri bicacbonat (NaHCO₃ / bicar z) hoặc vôi nông nghiệp chất lượng cao.",
        "Tuyệt đối không tăng thêm thức ăn vào ao nhằm 'thúc tôm lớn bù' cho kịp tiến độ. Lượng thức ăn dư thừa sẽ phân hủy ở đáy ao, gây bùng phát khí độc amonia (NH₃) và nitrit (NO₂⁻) cực kỳ nguy hiểm.",
      ],
    },
  ],
  checklist: [
    "Thu mẫu tôm vào cùng một khung giờ và cùng ngày cố định mỗi tuần bằng chài sạch, kích cỡ mắt lưới chuẩn.",
    "Tính toán tốc độ tăng trưởng bình quân ngày (ADG) giữa các đợt chài mẫu hàng tuần để phát hiện sớm nguy cơ tôm chậm lớn trước khi phát sinh sự cố.",
    "Đo nồng độ oxy hòa tan trước lúc bình minh (04:00 – 06:00 sáng) để ngăn ngừa tình trạng sốc do thiếu oxy tầng đáy.",
    "Điều chỉnh lượng thức ăn hàng ngày dựa vào việc kiểm tra nhá sau 2 giờ, không dựa đơn thuần vào bảng tính theo ngày tuổi.",
    "Ghi nhận số liệu trọng lượng chài mẫu hàng tuần trực tiếp vào Shrimply để theo dõi đường cong tăng trưởng và dự báo ngày thu hoạch chính xác.",
    "Gửi mẫu đến phòng xét nghiệm thủy sản đạt chuẩn để xét nghiệm PCR kiểm tra mầm bệnh (như EHP) nếu tôm ngừng lớn liên tục trên 14 ngày.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Growth Dynamics and Feeding Management of Pacific White Shrimp in Commercial Ponds",
      publisher: "World Aquaculture Society",
      url: "https://www.was.org",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "Manual on Pond Culture of Penaeid Shrimp: Indicators of Problems in a Pond",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/ac006e/AC006E11.htm",
    },
  ],
};
