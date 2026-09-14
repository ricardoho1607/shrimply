import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-farm-cash-flow",
  section: "Thu hoạch & Tài chính",
  label: "Dòng tiền trang trại",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Dòng Tiền Trang Trại Tôm: Lập Kế Hoạch Nhu Cầu Tiền Mặt Cho Thức Ăn, Con Giống, Năng Lượng và Doanh Thu Thu Hoạch",
  description:
    "Cẩm nang thực hành quản trị dòng tiền (Cash Flow) cho trang trại nuôi tôm thẻ chân trắng thương phẩm: cách tính vốn ban đầu mua giống, vượt qua 'đáy dòng tiền' căng thẳng nhất ở DOC 60–90 (Cash Valley), kiểm soát chi phí điện dầu, lương nhân công và nhịp điều tiết thanh khoản nhờ thu tỉa và thu dứt điểm.",
  readTime: "7 phút đọc",
  tags: [
    "dòng tiền trang trại tôm",
    "Cash Flow ao tôm",
    "tài chính nuôi tôm",
    "vốn mua thức ăn tôm",
    "vốn lưu động trang trại thủy sản",
    "đáy dòng tiền DOC 60-90",
    "thu tỉa giải tỏa vốn",
    "doanh thu bán tôm",
    "thanh khoản ao tôm",
    "chi phí vận hành trang trại tôm",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-farm-cash-flow-feed-seed-harvest-revenue.jpg",
    alt: "Đồ họa minh họa quản trị dòng tiền trang trại tôm thẻ chân trắng, thể hiện biểu đồ chi tiền mua con giống ban đầu, nhu cầu tiền mặt mua thức ăn tăng vọt giai đoạn sinh khối đỉnh, chi phí điện quạt và nhịp tiền về khi thu hoạch",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Phần mềm quản lý tài chính & dòng tiền trang trại tôm", href: "/vi/features/shrimp-farm-finance" },
  takeaways: [
    "Quản trị dòng tiền tập trung vào độ chuẩn xác về tính thời điểm của thanh khoản (Timing), chứ không chỉ nhìn vào con số lợi nhuận trên giấy tờ khi kết thúc vụ nuôi.",
    "Nhu cầu tiền mặt hàng ngày tăng vọt theo cấp số nhân khi sinh khối trong ao đạt đỉnh ở giai đoạn DOC 60–90, tạo nên 'đáy dòng tiền' (Cash Valley) nguy hiểm trước khi có nguồn thu từ bán tôm.",
    "Kết nối các dự báo sinh học (trọng lượng thân MBW và sức ăn hàng ngày) với chiến lược thu tỉa từng phần (Partial Harvest) là chìa khóa then chốt để duy trì thanh khoản lưu động cho trang trại.",
  ],
  faqs: [
    {
      question: "Tại sao một trang trại tôm có triển vọng lợi nhuận rất cao vẫn có thể rơi vào khủng hoảng thiếu tiền mặt (Cash Crunch)?",
      answer:
        "Khủng hoảng thanh khoản xảy ra do sự lệch pha về thời điểm (Timing Mismatch) giữa các khoản chi tiền mặt hàng ngày và thời điểm thực tế nhận tiền bán tôm. Trang trại buộc phải chi những khoản tiền mặt rất lớn ngay từ đầu vụ để cải tạo ao, mua tôm giống chất lượng cao SPF, mua chế phẩm vi sinh, trả tiền điện dầu hàng tháng, lương nhân công và đặc biệt là chi phí thức ăn tăng vọt sau DOC 45. Trong khi đó, toàn bộ dòng tiền thu về chỉ xuất hiện khi thu hoạch ở cuối vụ, kèm theo thời gian gối đầu nợ từ thương lái hoặc nhà máy từ 7–14 ngày. Nếu trang trại không có quỹ tiền mặt lưu động dự phòng đủ dày, toàn bộ chu trình vận hành có thể bị tê liệt giữa chừng dù ước tính lợi nhuận trên lý thuyết là rất cao.",
    },
    {
      question: "Giai đoạn nào trong vụ nuôi có nhu cầu tiền mặt căng thẳng nhất (Cash Valley / Peak Cash Burn)?",
      answer:
        "Giai đoạn căng thẳng nhất diễn ra từ DOC 60 đến 90. Ở giai đoạn này, sinh khối tôm trong các ao thâm canh và siêu thâm canh vươn tới mức cực đại (thường trên 3–5 tấn mỗi ao), khiến lượng thức ăn tiêu thụ mỗi ngày lên tới hàng trăm kg và ngốn tới 50–60% tổng ngân sách cám của cả vụ. Cùng lúc đó, toàn bộ hệ thống quạt nước và quạt sục khí đáy phải hoạt động hết công suất 18–24 giờ mỗi ngày khiến hóa đơn tiền điện hoặc dầu diesel tăng vọt. Trong khi chưa có dòng tiền bán tôm nào chảy vào tài khoản, thanh khoản của trang trại chạm đáy thấp nhất. Do đó, việc theo dõi dòng tiền hàng tuần ở giai đoạn này mang ý nghĩa sống còn.",
    },
    {
      question: "Kỹ thuật thu tỉa tôm (Partial Harvest / Thinning) giúp giải tỏa áp lực tài chính và thanh khoản cho trang trại như thế nào?",
      answer:
        "Kỹ thuật thu tỉa tôm (thường tiến hành ở giai đoạn DOC 60–75 khi tôm đạt cỡ size 60–80 con/kg) mang lại lợi ích tài chính kép mang tính cứu cánh: (1) Tạo ra ngay dòng tiền mặt thực tế (Cash Inflow) giữa vụ để thanh toán dứt điểm các hóa đơn tiền cám đến hạn hoặc tái đầu tư duy trì trang trại cho đến ngày thu dứt điểm, và (2) Giảm ngay 20–35% sinh khối tôm trong ao, qua đó giảm trực tiếp lượng thức ăn cho ăn hàng ngày và giảm áp lực chạy quạt nước, giúp giảm đáng kể tốc độ đốt tiền mặt (Cash Burn Rate) trong những tuần còn lại của vụ.",
    },
    {
      question: "Cần chuẩn bị quỹ tiền mặt dự phòng khẩn cấp (Safety Cash Buffer) ở mức tỷ lệ bao nhiêu trước khi thả giống?",
      answer:
        "Theo nguyên tắc quản trị rủi ro tài chính nông nghiệp, trang trại nên duy trì một quỹ dự phòng tiền mặt khả dụng tối thiểu từ 15% đến 25% trên tổng dự toán chi phí vận hành (OPEX) của cả vụ. Quỹ này được sử dụng để ứng phó với các tình huống biến động bất ngờ: giá thức ăn hoặc con giống biến động tăng, động cơ quạt nước hoặc máy phát điện gặp sự cố hỏng hóc cần thay mới khẩn cấp, mưa bão kéo dài đòi hỏi tạt tăng cường lượng lớn khoáng chất và vôi xử lý nước, hoặc thương lái dời lịch thu hoạch chậm hơn so với dự kiến.",
    },
    {
      question: "Báo cáo Dòng tiền (Cash Flow) và Báo cáo Giá thành sản xuất (COGS) khác nhau như thế nào trong thực tế quản lý?",
      answer:
        "Báo cáo Dòng tiền (Cash Flow) ghi nhận chính xác thời điểm thực tế tiền mặt chảy vào hoặc rút ra khỏi tài khoản ngân hàng (ví dụ: chi 50 triệu tiền mặt mua đứt 10 tấn cám, hoặc tài khoản nhận tiền khi nhà máy chuyển khoản thanh toán lô tôm thu hoạch). Ngược lại, Báo cáo Giá thành (COGS) ghi nhận chi phí phân bổ gắn với từng kilogram tôm thương phẩm khi lượng cám đó được tôm ăn thực tế trong ao. Việc phân biệt rõ hai báo cáo này giúp người quản lý không bị ảo tưởng tài chính: tiền dư trong tài khoản chưa chắc đã là lãi nếu còn khoản nợ tiền cám gối đầu chưa trả hoặc kho thức ăn đã cạn kiệt.",
    },
  ],
  sections: [
    {
      heading: "Tại sao trang trại tôm phát triển tốt vẫn có nguy cơ đối mặt với khủng hoảng tiền mặt",
      body: [
        "Nhiều chủ trang trại nuôi tôm thương phẩm thường đối diện với một nghịch lý nan giải: tôm trong ao phát triển rất khỏe mạnh, tăng trưởng đều đặn và hứa hẹn một mùa vụ bội thu, nhưng trang trại lại rơi vào tình trạng cạn kiệt tiền mặt đến mức không đủ khả năng mua thêm cám cho những ngày cuối vụ. Nghề nuôi tôm thẻ chân trắng (Litopenaeus vannamei) đòi hỏi nhu cầu vốn lưu động tiền mặt hàng ngày cực lớn. Khâu cải tạo ao (phơi ao, dán vá bạt, hóa chất sát trùng, vôi và men vi sinh nền ao), chi phí mua tôm giống PL đạt chuẩn SPF, tiền điện, tiền dầu và chi phí nhân công đều đòi hỏi phải chi trả tiền mặt ngay lập tức (Upfront Cash Outlays).",
        "Áp lực thanh khoản nặng nề nhất bắt nguồn từ việc mua thức ăn nuôi tôm, vốn chiếm từ 50% đến 70% tổng chi phí sản xuất. Các đại lý cung ứng thức ăn thường áp dụng hạn mức tín dụng và thời hạn thanh toán (Term of Payment) rất nghiêm ngặt. Nếu trang trại không thanh toán đúng hạn, việc giao hàng sẽ bị đình trệ ngay lập tức. Điều này đẩy người nuôi vào thế buộc phải cắt giảm khẩu phần ăn làm tôm bị đói, phân đàn, ăn lẫn nhau hoặc buộc phải thu hoạch non bán tháo với giá rẻ.",
        "Đó là lý do vì sao quản trị dòng tiền thực tế có vai trò sống còn không thua kém gì việc tính toán lợi nhuận trên giấy tờ. Ứng dụng [phần mềm quản lý tài chính & dòng tiền trang trại tôm](/vi/features/shrimp-farm-finance) giúp người quản lý nhìn thấy trước nhu cầu dòng tiền trong nhiều tuần tiếp theo, chủ động ngăn ngừa rủi ro đứt gãy thanh khoản và lập kế hoạch mua sắm vật tư chính xác.",
      ],
    },
    {
      heading: "Biến động dòng tiền qua 4 giai đoạn vụ nuôi: Vượt qua đáy dòng tiền ở DOC 60–90",
      body: [
        "Chi tiêu tiền mặt trong trang trại tôm không rải đều qua các tuần, mà gia tăng theo đường cong hình sin tỷ lệ thuận với sự tăng trưởng sinh khối tôm trong ao. Việc phân tách chu kỳ nuôi thành 4 giai đoạn tài chính giúp chủ trại hình dung rõ nét nhu cầu tiền mặt của mình:",
      ],
      table: {
        columns: [
          "Giai đoạn tài chính",
          "Khoảng thời gian DOC",
          "Đặc điểm chi tiêu tiền mặt",
          "Các khoản mục chi phí chính",
          "Chiến lược quản trị dòng tiền",
        ],
        rows: [
          [
            "Chuẩn bị ao & Thả giống",
            "Trước thả giống – DOC 15",
            "Chi tiền mặt lớn ngay từ đầu (15–20% tổng ngân sách)",
            "Tôm giống PL10–12 SPF, clorine/thuốc tím, vôi dolomite, vá bạt, men vi sinh đáy ao ban đầu",
            "Phải chuẩn bị đủ tiền mặt khả dụng trước khi thả giống; tuyệt đối không thả giống khi chưa có nguồn dự phòng tiền cám giai đoạn sau.",
          ],
          [
            "Tăng trưởng giai đoạn đầu",
            "DOC 16 – 45",
            "Tiêu tiền mặt đều đặn ở mức vừa phải (10–15% tổng ngân sách)",
            "Thức ăn mảnh và viên nhỏ, tiền điện quạt nước ban đêm, tiền công nhật, vitamin và khoáng tạt bổ sung",
            "Kiểm soát chặt chẽ FCR thông qua [hướng dẫn cho tôm thẻ chân trắng ăn](/vi/resources/vannamei-feeding-rate) để triệt tiêu lãng phí cám.",
          ],
          [
            "Đỉnh sinh khối (Đáy dòng tiền)",
            "DOC 46 – 90+",
            "Đốt tiền mặt ở mức báo động đỏ (50–60% tổng ngân sách)",
            "Khối lượng thức ăn cỡ lớn cực khủng mỗi ngày, tiền điện quạt và sục khí đáy 24/24, khoáng chất tạt dồn dập",
            "Cân nhắc giải pháp thu tỉa tôm (Partial Harvest) để thu tiền tươi về ngay, đồng thời giảm lượng cám phải nạp vào ao mỗi ngày.",
          ],
          [
            "Thu hoạch & Quyết toán vụ",
            "Ngày kéo tôm – Đóng ao",
            "Dòng tiền mặt lớn đổ về tài khoản trang trại",
            "Doanh thu bán tôm từ nhà máy/thương lái, trừ chi phí đội kéo lưới, thanh toán dứt điểm công nợ tiền cám và nhà cung ứng",
            "Đối soát sản lượng thực tế và chốt lãi ròng cuối vụ theo [ghi chép & theo dõi thu hoạch tôm](/vi/resources/shrimp-harvest-tracking).",
          ],
        ],
      },
    },
    {
      heading: "Lập kế hoạch tài chính vụ nuôi gắn chặt với dự báo tiêu thụ thức ăn",
      body: [
        "Do thức ăn tôm là cỗ máy hút tiền mặt lớn nhất của trang trại, kế hoạch dòng tiền phải được tích hợp trực tiếp với bảng dự báo tiêu thụ thức ăn theo từng tuần tuổi của tôm. Khi tôm lớn nhanh và bước vào giai đoạn tăng trọng bứt phá, lượng cám cần mua sẽ nhảy vọt gấp nhiều lần.",
        "Ban quản trị trang trại nên đồng bộ kế hoạch xuất nhập kho từ [kiểm soát tồn kho thức ăn ao tôm](/vi/resources/feed-inventory-control) vào lịch biểu dòng tiền mặt để đảm bảo luôn sẵn sàng lượng tiền thanh toán đúng hạn cho đại lý, bảo vệ hạn mức tín dụng và không làm gián đoạn nguồn cám của các ao nuôi.",
      ],
    },
    {
      heading: "Áp dụng chiến lược thu hoạch linh hoạt để giải tỏa áp lực vốn",
      body: [
        "Lựa chọn thời điểm thu hoạch linh hoạt và thực hiện các đợt thu tỉa chọn lọc giúp giải tỏa áp lực tài chính một cách ngoạn mục. Việc thương thảo trước điều khoản thanh toán rõ ràng với các nhà máy chế biến hoặc thương lái (ví dụ: chuyển khoản trong vòng 24–48 giờ sau khi hoàn tất cân tôm) sẽ giúp trang trại chủ động hoàn toàn về nguồn vốn lưu động, tránh được các bẫy nợ xấu và duy trì sự ổn định bền vững.",
      ],
    },
  ],
  checklist: [
    "Lập dự toán chi tiết tiền thức ăn, con giống, điện, khoáng chất và nhân công trước khi ký hợp đồng mua tôm giống.",
    "Bảo đảm duy trì quỹ tiền mặt dự phòng khẩn cấp từ 15–25% trên tổng ngân sách vận hành cả vụ.",
    "Cập nhật dự báo dòng tiền mua cám hàng tuần dựa trên trọng lượng thân mẫu (MBW) và sinh khối thực tế trong ao.",
    "Lên kế hoạch thu tỉa (Partial Harvest) ở giai đoạn DOC 60–75 để chủ động tạo nguồn tiền mặt bổ sung cho trang trại.",
    "Đối soát chặt chẽ các khoản tiền về từ thương lái thu mua tôm với các hóa đơn thức ăn và vật tư đến hạn thanh toán.",
  ],
  sources: [
    {
      title: "Aquaculture Economics and Financing: Management and Analysis",
      publisher: "Wiley-Blackwell Scientific Publications",
      url: "https://www.wiley.com/en-us",
    },
    {
      title: "FAO Aquaculture Technical Paper: Farm Financial Records and Management",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/en/publications/search",
    },
    {
      title: "Economic Evaluation of Partial Harvesting Strategies in Penaeid Shrimp Culture",
      publisher: "Journal of the World Aquaculture Society",
      url: "https://onlinelibrary.wiley.com/journal/17497345",
    },
  ],
};
