import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-farm-cogs",
  section: "Thu hoạch & Tài chính",
  label: "Giá thành sản xuất (COGS)",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Giá Thành Sản Xuất Ao Tôm (COGS): Phân Tích Chi Phí Thực Tế & Giá Thành Trên Mỗi Kilogram Tôm Trong Từng Vụ Nuôi",
  description:
    "Vụ nuôi tôm của bạn có thực sự sinh lời? Tìm hiểu cách tính toán giá thành sản xuất (COGS) và chi phí trên mỗi kilogram tôm thương phẩm một cách chính xác bằng cách liên kết chi phí thức ăn, con giống, điện năng, dầu máy, khoáng chất, nhân công, khấu hao và sản lượng thu hoạch thực tế.",
  readTime: "7 phút đọc",
  tags: [
    "giá thành sản xuất tôm",
    "COGS trang trại tôm",
    "chi phí sản xuất tôm trên kg",
    "lợi nhuận nuôi tôm thẻ chân trắng",
    "cơ cấu chi phí ao tôm",
    "chi phí thức ăn tôm",
    "tài chính trang trại thủy sản",
    "chi phí vụ nuôi tôm",
    "biên lợi nhuận ao tôm",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-farm-cogs-cycle-cost-profitability.jpg",
    alt: "Đồ họa phân tích cơ cấu giá thành sản xuất ao tôm (COGS), minh họa tỷ trọng chi phí thức ăn, con giống, điện dầu, khoáng chất xử lý nước, nhân công, chi phí thu hoạch, giá thành mỗi kg và biên lợi nhuận vụ nuôi",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Phần mềm quản lý tài chính & hạch toán trang trại tôm", href: "/vi/features/shrimp-farm-finance" },
  takeaways: [
    "Giá thành sản xuất (COGS / Cost of Goods Sold) liên kết trực tiếp mọi khoản chi phí vận hành ao nuôi với sản lượng sinh khối tôm thương phẩm thực tế bán được.",
    "Các nhóm chi phí trọng yếu như thức ăn (50–60%), tôm giống PL, tiền điện chạy quạt/bơm, dầu diesel, khoáng chất, men vi sinh và nhân công phải được phân bổ chi tiết cho từng ao nuôi cụ thể.",
    "Phân tích hiệu quả tài chính và biên lợi nhuận chỉ thực sự chuẩn xác khi dữ liệu sinh học ao nuôi (FCR, tỷ lệ sống SR, tăng trọng ADG, cỡ size) được đối chiếu đồng bộ với sổ sách kế toán.",
  ],
  faqs: [
    {
      question: "Sự khác biệt giữa COGS, OPEX chung và CAPEX trong quản lý tài chính trang trại tôm là gì?",
      answer:
        "Giá thành sản xuất (COGS) là toàn bộ chi phí trực tiếp và gián tiếp phát sinh nhằm tạo ra sinh khối tôm trong vụ nuôi của ao cụ thể đó (thức ăn, tôm giống, điện chạy quạt, khoáng chất, chế phẩm vi sinh và nhân công trực tiếp). OPEX chung là chi phí vận hành bộ máy gián tiếp của toàn trang trại không phụ thuộc vào sinh khối từng ao (lương văn phòng, phí thuê đất hàng năm, giấy phép môi trường). CAPEX (Chi phí vốn đầu tư) là các khoản chi mua sắm tài sản cố định dài hạn (như đào ao bạt mới, trạm biến áp, máy phát điện dự phòng lớn). CAPEX không được hạch toán hết vào một vụ nuôi mà phải trích khấu hao dần theo số ngày nuôi thực tế (DOC) của từng ao.",
    },
    {
      question: "Những hạng mục chi phí nào bắt buộc phải đưa vào công thức tính COGS cho một vụ nuôi tôm?",
      answer:
        "Cơ cấu COGS chuẩn của một ao tôm thẻ thâm canh bao gồm 7 nhóm chi phí chính: (1) Chi phí tôm giống (giống PL chất lượng cao SPF, xét nghiệm PCR bệnh, chi phí vận chuyển oxy); (2) Chi phí thức ăn tôm (các số cám từ giai đoạn úm đến về đích); (3) Chi phí năng lượng (tiền điện chạy quạt nước, sục khí đáy, máy bơm cấp thoát và dầu diesel máy phát điện); (4) Hóa chất, khoáng chất & men vi sinh (clorine, thuốc tím, vôi dolomite, canxi, magie, kali, men vi sinh đáy); (5) Chi phí nhân công trực tiếp (lương kỹ thuật phụ trách ao, công nhân rải thức ăn, xi-phông đáy và thưởng sản lượng); (6) Chi phí vệ sinh ao và thu hoạch (tiền công xịt rửa bạt, nhân công kéo lưới, đá ướp lạnh); và (7) Chi phí trích khấu hao tài sản ao nuôi (mô tơ, cánh quạt nước, bạt HDPE, ống sục khí theo ngày nuôi).",
    },
    {
      question: "Tại sao chi phí thức ăn chiếm tới 50–60% tổng chi phí và làm thế nào để kiểm soát không bị bội chi?",
      answer:
        "Thức ăn tôm có hàm lượng đạm cao (30–40%), được chế biến từ bột cá, bột mực và các axit amin thiết yếu có giá thành đắt đỏ, do đó luôn chiếm tỷ trọng lớn nhất trong ngân sách vụ nuôi. Kiểm soát chi phí thức ăn không đồng nghĩa với việc cắt giảm khẩu phần tùy tiện khiến tôm còi cọc và chậm lớn, mà phải kiểm soát thông qua hệ số chuyển đổi thức ăn (FCR). Mỗi mức tăng 0.1 của hệ số FCR (ví dụ từ 1.2 lên 1.3) làm tăng giá thành sản xuất từ 2.000 đến 4.000 VNĐ trên mỗi kg tôm. Biện pháp kiểm soát tối ưu là kiểm tra vó định kỳ nghiêm ngặt, gia giảm thức ăn theo thời tiết và oxy hòa tan (DO), lắp máy cho ăn tự động và quản lý kho theo nguyên tắc nhập trước xuất trước (FIFO).",
    },
    {
      question: "Công thức tính giá thành sản xuất trên mỗi kilogram tôm (COGS/kg) cho ao có thu tỉa được tính như thế nào?",
      answer:
        "Công thức tính chuẩn: Giá thành trên mỗi kg (VNĐ/kg) = Tổng toàn bộ chi phí sản xuất của ao (VNĐ) ÷ Tổng khối lượng tôm thương phẩm thực tế bán được (kg) (bao gồm cả các đợt thu tỉa Partial Harvest và đợt thu dứt điểm Final Harvest). Chỉ số giá thành/kg này chính là 'mức giá hòa vốn' tối thiểu để người nuôi dựa vào đó đàm phán giá bán với thương lái hoặc nhà máy nhằm bảo đảm tỷ suất lợi nhuận kỳ vọng.",
    },
    {
      question: "Tại sao sản lượng thu hoạch tổng tấn rất cao nhưng ao nuôi vẫn có thể bị lỗ hoặc lãi rất thấp?",
      answer:
        "Sản lượng tổng tấn cao có thể tạo ra ảo tưởng thành công nếu chi phí bị đội lên mất kiểm soát. Ao nuôi vẫn có nguy cơ thua lỗ hoặc hiệu quả kinh tế rất thấp nếu: (1) Hệ số FCR quá cao do dư thừa thức ăn, lợi nhuận bị thức ăn 'ăn mòn'; (2) Thời gian nuôi kéo dài quá mức (DOC cao) trong khi tốc độ tăng trọng (ADG) chững lại, khiến chi phí điện quạt và nhân công tích lũy tăng vọt; (3) Tỷ lệ sống thấp do tôm chết ngầm đáy ao mà không phát hiện kịp, khiến lượng thức ăn bỏ ra nuôi tôm chết; hoặc (4) Tôm thu hoạch rơi vào cỡ size nhỏ, tôm mềm vỏ hoặc đốm đen làm giá bán thực tế bị trừ sâu so với giá thị trường.",
    },
    {
      question: "Làm thế nào để phân bổ các chi phí dùng chung (điện văn phòng, xe vận chuyển nội bộ, trạm phát điện chính) về từng ao?",
      answer:
        "Chi phí dùng chung của trang trại nên được phân bổ về từng ao theo các tiêu chí cố định và nhất quán: (1) Phân bổ theo tỷ lệ diện tích mặt nước hoặc thể tích khối nước đối với tiền thuê đất, chi phí bảo vệ và chiếu sáng chung; (2) Phân bổ theo số giờ vận hành hoặc số ngày nuôi (DOC) đối với trạm bơm cấp nước chính hoặc máy phát điện chung; hoặc (3) Phân bổ theo tỷ lệ tiêu thụ thức ăn đối với chi phí kho bãi và bảo quản. Tính nhất quán trong phương pháp phân bổ giúp so sánh chính xác hiệu quả giữa các ao nuôi.",
    },
  ],
  sections: [
    {
      heading: "Tầm quan trọng sống còn của giá thành sản xuất (COGS) trong nuôi tôm thẻ chân trắng",
      body: [
        "Giá thành sản xuất (Cost of Goods Sold / COGS) là thước đo tài chính chuẩn xác nhất phản ánh chi phí thực tế mà trang trại đã chi ra để tạo nên mỗi kilogram tôm thương phẩm bán ra thị trường. Nếu không tính toán COGS chi tiết theo từng ao, một vụ nuôi có thể trông rất hoành tráng khi nhìn vào sản lượng hàng chục tấn tôm trên bàn cân, nhưng thực tế trang trại lại bị thâm hụt vốn hoặc chỉ hòa vốn vì những chi phí ẩn phát sinh mất kiểm soát.",
        "Các nghiên cứu kinh tế thủy sản đều khẳng định: chi phí thức ăn, con giống, điện/dầu, hóa chất xử lý nước và nhân công là các biến phí cốt lõi quyết định sự sống còn của nghề nuôi tôm. Trong đó, quản lý thức ăn mang tính then chốt kép: vừa là khoản chi lớn nhất, vừa là nguồn gốc gây ô nhiễm môi trường ao nuôi. Việc hạch toán chi phí chi tiết theo từng ao nuôi qua [phần mềm quản lý tài chính & hạch toán trang trại tôm](/vi/features/shrimp-farm-finance) giúp chủ trại sớm phát hiện các bất thường về chi phí để xử lý kịp thời trước khi vụ nuôi khép lại.",
      ],
    },
    {
      heading: "Cơ cấu chi phí ao tôm: Phân tích 7 thành phần cấu thành COGS trong từng vụ nuôi",
      body: [
        "Để thiết lập hệ thống tính COGS kỷ luật và minh bạch cho mô hình nuôi tôm thẻ chân trắng (Litopenaeus vannamei), các khoản chi trực tiếp và hỗ trợ cần được phân loại thành 7 nhóm chi phí gắn liền với từng chu kỳ ao nuôi:",
      ],
      items: [
        "1. Chi phí thức ăn tôm (50%–60% tổng COGS): Khoản biến phí lớn nhất. Kiểm soát chi phí này bằng cách tối ưu hóa hệ số FCR qua kiểm tra vó nghiêm ngặt theo [hướng dẫn tối ưu hóa hệ số FCR](/vi/resources/fcr-shrimp-farming) và kiểm kê kho định kỳ trong [kiểm soát tồn kho thức ăn ao tôm](/vi/resources/feed-inventory-control).",
        "2. Chi phí tôm giống (8%–15% tổng COGS): Chi phí mua tôm giống Postlarvae (PL 8–10) từ các trại giống uy tín đạt chuẩn sạch bệnh SPF (Specific Pathogen Free), kèm chứng nhận xét nghiệm PCR âm tính với WSSV, YHV, EHP và AHPND.",
        "3. Chi phí năng lượng điện và nhiên liệu dầu (12%–18% tổng COGS): Tiền điện vận hành dàn quạt nước cánh quạt (Paddle Wheel), quạt sục khí đáy (Roots Blower), máy bơm cấp thoát nước và dầu diesel cho máy phát điện dự phòng.",
        "4. Hóa chất, khoáng chất và men vi sinh (6%–10% tổng COGS): Hóa chất xử lý nước ban đầu (Clorine, thuốc tím), vôi nông nghiệp (Dolomite, Canxi Cacbonat, NaHCO₃), khoáng chất kích lột vỏ và cứng vỏ (Magie, Canxi, Kali) và chế phẩm sinh học phân hủy mùn bã hữu cơ.",
        "5. Chi phí nhân công trực tiếp (5%–8% tổng COGS): Lương kỹ thuật phụ trách ao, công nhân cho ăn, công nhân xi-phông hút bùn ca đêm và các khoản thưởng theo năng suất tỷ lệ sống của ao.",
        "6. Chi phí chuẩn bị ao và thu hoạch (3%–6% tổng COGS): Công xịt rửa bạt, sửa chữa cống xả, tiền thuê đội thợ kéo lưới, nước đá ngâm tôm và rổ sọt thu hoạch theo quy trình tại [ghi chép & theo dõi thu hoạch tôm](/vi/resources/shrimp-harvest-tracking).",
        "7. Khấu hao tài sản và thiết bị ao nuôi (3%–5% tổng COGS): Trích khấu hao thiết bị quạt nước, máy bơm nước và bạt chống thấm HDPE dựa trên số ngày nuôi thực tế (DOC) của vụ.",
      ],
      note: "Nguyên tắc kế toán trang trại: Chi phí đầu tư tài sản cố định dài hạn (CAPEX) như đào mở rộng ao mới hay mua trạm biến áp không bao giờ được tính dồn hết vào chi phí của một vụ nuôi duy nhất, mà phải trích khấu hao đều theo số ngày nuôi thực tế (DOC).",
    },
    {
      heading: "Bảng tỷ trọng cơ cấu chi phí chuẩn của mô hình nuôi tôm thâm canh",
      body: [
        "Bảng dưới đây tổng hợp cơ cấu chi phí chuẩn trong mô hình nuôi tôm thẻ thâm canh và siêu thâm canh (Intensive / Super-intensive), cùng các nguyên nhân gây bội chi thường gặp và giải pháp kiểm soát thực tế:",
      ],
      table: {
        columns: ["Hạng mục chi phí", "Tỷ trọng chuẩn (%)", "Nguyên nhân gây bội chi", "Giải pháp kiểm soát tại trang trại"],
        rows: [
          [
            "Chi phí thức ăn tôm",
            "50% – 60%",
            "Cho ăn dư thừa (Overfeeding), FCR tăng cao, cám ẩm mốc/hết hạn, tôm chết ngầm đáy ao không phát hiện kịp.",
            "Canh vó nghiêm ngặt, giảm cám khi DO thấp hoặc thời tiết xấu, áp dụng nguyên tắc FIFO trong kho thức ăn.",
          ],
          [
            "Chi phí điện năng và dầu máy",
            "12% – 18%",
            "Chạy quạt nước thừa công suất khi sinh khối tôm còn nhỏ, động cơ cũ tiêu hao điện, rò rỉ dầu diesel.",
            "Điều chỉnh lịch quạt theo sinh khối và chỉ số DO thực tế, kiểm tra dòng điện ampe động cơ, lắp rơ-le hẹn giờ tự động.",
          ],
          [
            "Chi phí tôm giống PL",
            "8% – 15%",
            "Giống nhiễm mầm bệnh tiềm ẩn, tỷ lệ sống thấp trong 30 ngày đầu, thả mật độ quá dày vượt sức tải ao.",
            "Xét nghiệm PCR độc lập trước khi thả giống, thuần hóa nhiệt độ độ mặn kỹ lưỡng, tính mật độ thả tương thích với mã lực quạt.",
          ],
          [
            "Khoáng chất, hóa chất & vi sinh",
            "6% – 10%",
            "Đánh khoáng tùy tiện không đo đạc, nước ao sập tảo liên tục phải dùng nhiều vôi, chế phẩm vi sinh kém chất lượng.",
            "Đo kiềm, canxi, magie định kỳ trước khi bổ sung, ủ nhân sinh khối men vi sinh đúng quy trình kỹ thuật.",
          ],
          [
            "Chi phí nhân công trực tiếp",
            "5% – 8%",
            "Năng suất lao động thấp, thiếu nhân lực trong ngày thu hoạch, trùng lặp công việc do ghi chép giấy tờ thủ công.",
            "Ứng dụng phần mềm số hóa ghi chép tại bờ ao, phân công quy trình cho ăn và kiểm tra vó rõ ràng, áp dụng cơ chế thưởng năng suất.",
          ],
          [
            "Chi phí chuẩn bị ao và thu hoạch",
            "3% – 6%",
            "Phơi ao không kỹ dẫn đến phải xử lý lại nhiều lần, hao hụt trọng lượng tôm (Drip loss) do thiếu đá ướp.",
            "Vệ sinh ao đúng quy trình kỹ thuật, chuẩn bị sẵn lượng đá lạnh bảo ôn đạt chuẩn để triệt tiêu hao hụt tôm.",
          ],
          [
            "Khấu hao tài sản thiết bị ao",
            "3% – 5%",
            "Thiết bị hư hỏng sớm do không bảo dưỡng định kỳ, nước mặn gây rỉ sét ăn mòn mô tơ và khung giá đỡ.",
            "Rửa sạch nước ngọt và tra mỡ bảo quản thiết bị sau thu hoạch, theo dõi lịch sử bảo trì bảo dưỡng trên hệ thống.",
          ],
        ],
      },
    },
    {
      heading: "Kết nối dữ liệu sinh học ao nuôi với phân tích chi phí và biên lợi nhuận",
      body: [
        "Giá thành trên mỗi kilogram tôm không thể đánh giá độc lập dưới góc nhìn kế toán đơn thuần, mà luôn gắn bó mật thiết với các chỉ số sinh học của ao nuôi: tỷ lệ sống (SR), hệ số chuyển đổi thức ăn (FCR), tốc độ tăng trọng hàng ngày (ADG) và kích cỡ size tôm thương phẩm đạt được.",
        "Khi kết hợp đồng bộ hai luồng dữ liệu này, ban quản lý trang trại sẽ nhìn rõ bản chất: lợi nhuận thu được là nhờ sinh khối tôm phát triển vượt bậc, nhờ đón đầu được giá thị trường thuận lợi, hay nhờ kỷ luật kiểm soát chi phí chặt chẽ. Đây cũng là cơ sở vững chắc để xây dựng kế hoạch quản lý [dòng tiền trang trại tôm](/vi/resources/shrimp-farm-cash-flow) cho chu kỳ nuôi tiếp theo.",
      ],
    },
  ],
  checklist: [
    "Hạch toán chi phí thức ăn, con giống, điện dầu, khoáng chất và nhân công tách biệt theo từng mã ao nuôi.",
    "Kết nối nhật ký chi phí với dữ liệu tăng trưởng, kiểm tra vó và số liệu thu hoạch trên một nền tảng quản trị duy nhất.",
    "Tính toán ngay giá thành sản xuất trên mỗi kg (COGS/kg) sau mỗi đợt thu tỉa và thu dứt điểm ao nuôi.",
    "Đối chiếu biến động của giá thành mỗi kg với hệ số FCR và tỷ lệ sống để phát hiện các khâu gây lãng phí ngân sách.",
    "Phân bổ khấu hao tài sản ao nuôi và chi phí dùng chung của toàn trang trại theo các tiêu chuẩn phân bổ nhất quán.",
  ],
  sources: [
    {
      title: "Bioeconomics and Profitability Analysis of Whiteleg Shrimp (Litopenaeus vannamei) Farming",
      publisher: "Aquaculture Economics & Management",
      url: "https://www.tandfonline.com/loi/uaqm20",
    },
    {
      title: "FAO Technical Guidelines for Responsible Fisheries: Aquaculture Development and Feed Management",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/en/publications/search",
    },
    {
      title: "Better Management Practices for Commercial Penaeid Shrimp Farming",
      publisher: "Network of Aquaculture Centres in Asia-Pacific (NACA)",
      url: "https://enaca.org/",
    },
  ],
};
