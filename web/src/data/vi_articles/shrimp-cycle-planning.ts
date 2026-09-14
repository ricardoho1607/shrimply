import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-cycle-planning",
  section: "Quản lý trang trại",
  label: "Lập kế hoạch vụ nuôi",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Lập Kế Hoạch Vụ Nuôi Tôm: Từ Thả Giống Đến Thu Hoạch Chuẩn Xác Không Phỏng Đoán",
  description: "Hướng dẫn thực hành lập kế hoạch vụ nuôi tôm thẻ chân trắng (Litopenaeus vannamei): xác định mục tiêu thả giống, dự trù nhu cầu thức ăn, các mốc kiểm tra chài mẫu tăng trưởng, đánh giá rủi ro vận hành và tính toán thời điểm thu hoạch chuẩn xác.",
  readTime: "6 phút đọc",
  tags: [
    "lập kế hoạch vụ nuôi tôm thẻ chân trắng",
    "lịch thả giống PL",
    "mục tiêu sinh khối thu hoạch",
    "dự trù thức ăn theo từng giai đoạn",
    "chuẩn bị ao và phơi ao",
    "quản lý rủi ro thời tiết mùa vụ",
    "chài mẫu kiểm tra tôm",
    "tôm thẻ chân trắng",
    "ngày nuôi DOC",
    "thời điểm thu hoạch",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-cycle-planning-stocking-harvest-vannamei.jpg",
    alt: "Infographic lập kế hoạch vụ nuôi tôm thẻ chân trắng từ lịch thả giống và dự trù thức ăn đến các mốc chài mẫu, đánh giá rủi ro và khung thời gian thu hoạch",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Ứng dụng nuôi tôm thẻ chân trắng", href: "/vi/vannamei-shrimp-farming-app" },
  takeaways: [
    "Kế hoạch vụ nuôi phải xác định rõ kích cỡ tôm mục tiêu (size thu hoạch), mật độ thả giống, dự trù nhu cầu thức ăn và các mốc đánh giá định kỳ có thể đo lường được.",
    "Các mốc kiểm tra chài mẫu tăng trưởng định kỳ giúp kỹ thuật viên điều chỉnh lượng thức ăn hàng ngày và chiến lược thu hoạch kịp thời trước những tuần cao điểm cuối vụ.",
    "Quản lý rủi ro dịch bệnh và kiểm soát ổn định chất lượng nước phải được tích hợp trực tiếp vào kế hoạch vận hành hàng ngày, thay vì chỉ phản ứng bị động khi sự cố xảy ra.",
  ],
  faqs: [
    {
      question: "Mật độ thả giống bao nhiêu là phù hợp cho tôm thẻ chân trắng?",
      answer: "Không có một con số mật độ thả giống an toàn chung cho mọi trang trại. Mật độ nuôi thương phẩm tiêu chuẩn dao động từ 5–15 con/m² (PL/m²) đối với ao đất quảng canh/bán thâm canh, 20–50 con/m² đối với hệ thống bán thâm canh có quạt nước, đến 60–150 con/m² (thậm chí 200–300 con/m² ở mô hình công nghệ cao) cho ao lót bạt HDPE thâm canh có hệ thống quạt nước và sục khí đáy chuyên dụng. Hãy sử dụng [Công cụ tính mật độ thả giống tôm thẻ chân trắng](/vi/resources/vannamei-stocking-density) của chúng tôi để mô phỏng nhu cầu giống PL, sức tải sinh học của ao (carrying capacity) và công suất dàn quạt khí cần thiết.",
    },
    {
      question: "Các bước lập kế hoạch vụ nuôi tôm từ khi thả giống đến lúc thu hoạch gồm những gì?",
      answer: "Bắt đầu bằng việc xác định kích cỡ thu hoạch mục tiêu (size tôm / trọng lượng thân trung bình ABW) và khung thời gian thu hoạch kỳ vọng; xây dựng lịch thả giống (số lượng giống PL và tiêu chuẩn chứng nhận SPF/SPR); ước tính tỷ lệ sống (SR); tính toán đường cong nhu cầu thức ăn theo từng giai đoạn; lên lịch các mốc chài mẫu kiểm tra tăng trưởng (trọng lượng trung bình MBW và tốc độ tăng trưởng hàng ngày ADG); thiết lập ngưỡng thông số chất lượng nước an toàn; xây dựng quy trình chuẩn (SOP) phòng ngừa dịch bệnh; và hoạch định dòng tiền vận hành (cash flow). Xuyên suốt vụ nuôi, hãy liên tục đối chiếu và hiệu chỉnh kế hoạch dựa trên dữ liệu chài mẫu thực tế, mức ăn trên vó/nhấc nhá, tỷ lệ hao hụt hàng ngày và kết quả thu tỉa.",
    },
  ],
  sections: [
    {
      heading: "Các thành phần cốt lõi của một kế hoạch vụ nuôi thực tế",
      body: [
        "Kế hoạch vụ nuôi tôm thẻ chân trắng cần bắt đầu bằng việc xác định rõ thông số ao nuôi, nguồn gốc và uy tín trại giống (post-larvae / PL), lịch thả giống, tổng số lượng giống thả, tỷ lệ sống kỳ vọng (survival rate / SR), kích cỡ tôm mục tiêu khi thu hoạch (size / ABW), số ngày nuôi dự kiến (Day of Culture / DOC), dự trù thức ăn theo từng giai đoạn và lịch trình kiểm tra chất lượng nước hàng ngày. Những thông số cơ sở này tạo nên thước đo quy chuẩn (baseline) vững chắc cho mọi quyết định kỹ thuật trong suốt chu kỳ nuôi.",
        "Lập kế hoạch chính xác là yếu tố sống còn vì tôm thẻ chân trắng (Litopenaeus vannamei) rất nhạy cảm với mật độ thả, kỹ thuật cho ăn, độ ổn định của môi trường nước ao và quy trình an toàn sinh học ngăn ngừa dịch bệnh. Bản kế hoạch vụ nuôi cung cấp cho người quản lý và kỹ thuật viên ao một điểm tựa khách quan khi tốc độ tăng trưởng hàng ngày (ADG) bị chững lại, khả năng bắt mồi trên nhá giảm hoặc khi thời tiết chuyển biến bất thường làm tăng nguy cơ dịch bệnh.",
      ],
      table: {
        columns: ["Giai đoạn vụ nuôi", "Số ngày nuôi (DOC)", "Trọng tâm vận hành & Thức ăn", "Mốc kiểm soát sinh học", "Biện pháp quản lý rủi ro chính"],
        rows: [
          [
            "Chuẩn bị ao, phơi ao & Thả giống",
            "DOC 0 – 15",
            "Cải tạo đáy ao, phơi ao triệt để, khử trùng nguồn nước, gây màu nước (tảo/vi sinh), thuần dưỡng nhiệt độ & độ mặn, cho ăn thăm dò định mức ban đầu",
            "Kiểm tra chất lượng tôm giống (thử sốc formol/độ mặn), đánh giá tỷ lệ sống ban đầu sau khi thả",
            "Tránh thả tôm giống khi trời mưa lớn hoặc nhiệt độ biến động mạnh; đảm bảo dư lượng hóa chất khử trùng (clo/iodine) về mức 0 ppm trước khi thả",
          ],
          [
            "Giai đoạn đầu vụ (Ươm dưỡng & Tăng trưởng sớm)",
            "DOC 16 – 45",
            "Bắt đầu kiểm tra lượng ăn qua nhá/vó (feed tray), chuyển đổi cỡ hạt thức ăn từ dạng mảnh (crumble) sang dạng viên nhỏ (pellet), định kỳ bổ sung men vi sinh đường ruột và vi sinh đáy",
            "Kiểm tra sắc tố gan tụy và độ đầy đường ruột, ghi nhận tỷ lệ hao hụt hàng ngày, chài mẫu nhỏ hoặc xúc mẫu kiểm tra hình thái",
            "Cảnh giác hiện tượng tụt độ kiềm (< 100 ppm) trong các đợt tôm lột xác đồng loạt; duy trì chênh lệch pH sáng – chiều không vượt quá 0,5 đơn vị",
          ],
          [
            "Giai đoạn tăng trưởng bứt phá & Đạt đỉnh sinh khối",
            "DOC 46 – 80",
            "Tính toán khẩu phần ăn dựa trên kết quả chài mẫu MBW định kỳ hàng tuần, vận hành tối đa công suất quạt nước về đêm (tối thiểu 1 HP cho mỗi 400–500 kg sinh khối mục tiêu)",
            "Theo dõi sát tốc độ tăng trưởng ngày (mục tiêu ADG > 0,25–0,35 g/ngày), kiểm tra hệ số FCR lũy kế, giám sát chặt chẽ lượng thức ăn dư trên nhá",
            "Chất hữu cơ tích tụ nhiều ở khu vực rốn ao; xi-phông đáy định kỳ hàng ngày để ngăn chặn khí độc amonia tự do (NH3) và khí độc nitrit (NO2-) bùng phát",
          ],
          [
            "Giai đoạn về đích & Khung thời gian thu hoạch",
            "DOC 81 – 110+",
            "Tối ưu hóa hiệu quả chuyển đổi thức ăn, xem xét phương án thu tỉa (partial harvest) nhằm giải tỏa áp lực sinh khối, chuẩn bị sẵn sàng hậu cần thu hoạch và đầu ra thương lái",
            "Đạt mục tiêu kích cỡ thu hoạch (ví dụ: về size 30–50 con/kg), kiểm tra độ chắc vỏ và độ bóng cơ (tránh thu hoạch vào thời điểm tôm đang lột xác rộ)",
            "Mục tiêu sinh khối thu hoạch tiếp cận ngưỡng tải sinh học của ao (carrying capacity); rủi ro tụt oxy hòa tan (DO < 4,0 mg/L) vào rạng sáng; quản lý rủi ro thời tiết mùa vụ khi trời âm u kéo dài",
          ],
        ],
      },
      note: "Tuyệt đối không thả tôm giống khi các chỉ số môi trường nước ao chưa duy trì ổn định ít nhất 5 đến 7 ngày sau quá trình khử trùng. Sự ổn định của độ kiềm (120–150 ppm), độ pH (7,8–8,2) và việc nước hoàn toàn sạch dư lượng hóa chất khử khuẩn đóng vai trò quyết định đến tỷ lệ sống của tôm giống hơn là việc cố ép thả theo ngày đã định trước.",
    },
    {
      heading: "Thiết lập nhịp độ kiểm tra đánh giá trước khi thả giống",
      body: [
        "Các trang trại nuôi tôm thương phẩm cần xác lập rõ nhịp độ kiểm tra vận hành ngay từ trước khi đưa con giống vào ao: khi nào bắt đầu chài mẫu kiểm tra tôm, tần suất đo trọng lượng bình quân (MBW) ra sao, những thông số chất lượng nước nào phải đo đạc hàng ngày và thời điểm diễn ra các cuộc họp rà soát kỹ thuật hàng tuần. Nếu thiếu một quy trình nhịp nhàng, việc thu thập nhật ký ao nuôi sẽ bị ngắt quãng, khiến việc phân tích diễn biến vụ nuôi trở nên thiếu tin cậy.",
        "Nhịp độ vận hành chuẩn mực đã được chứng minh hiệu quả trên các vùng nuôi thực tế gồm: kiểm tra nước ao và nhá thức ăn hàng ngày, đánh giá định kỳ hiệu suất ao nuôi mỗi tuần, và tiến hành chài mẫu theo lịch trình khi tôm đạt kích cỡ đủ lớn để đo lường chuẩn xác (thường bắt đầu từ DOC 30 đến 35). Chu kỳ cụ thể có thể linh hoạt điều chỉnh tùy theo mô hình nuôi (quảng canh cải tiến, bán thâm canh, thâm canh hay siêu thâm canh), mật độ thả và quy trình vận hành tiêu chuẩn (SOP) của trang trại.",
      ],
      items: [
        "Kiểm tra hàng ngày (Mỗi ngày): Đo và ghi chép nồng độ oxy hòa tan (DO) vào thời điểm rạng sáng (04:30–05:30) và đầu giờ chiều, đo pH sáng và chiều, nhiệt độ nước, độ trong bằng đĩa Secchi, kiểm tra sức ăn trên nhá/vó (sau khi rải thức ăn 1,5–2 giờ) và quan sát hoạt động của đàn tôm dọc bờ ao.",
        "Đánh giá hàng tuần (Định kỳ 7 ngày): Thực hiện chài mẫu kiểm tra tôm để xác định trọng lượng trung bình (MBW), tính toán tốc độ tăng trưởng bình quân hàng ngày (ADG), ước tính sinh khối hiện diện (standing biomass), tính toán hệ số FCR lũy kế và cân đối lại bảng cho ăn trong tuần tiếp theo. Tham khảo [Bảng đánh giá hiệu suất ao nuôi](/vi/resources/pond-performance) để nắm trọn vẹn khung đánh giá chuyên sâu.",
        "Phân tích hóa lý & Vi sinh định kỳ (Cách 3–5 ngày): Kiểm tra các chỉ tiêu phòng xét nghiệm bao gồm tổng đạm amonia (TAN), nitrit (NO2-), độ kiềm, khoáng chất hòa tan (Ca, Mg) và mật độ vi khuẩn Vibrio trên đĩa thạch TCBS. Xem hướng dẫn chi tiết tại [Thông số chất lượng nước tôm thẻ chân trắng](/vi/resources/vannamei-water-quality-parameters).",
        "Kiểm toán vụ nuôi & Dự trù thức ăn theo từng giai đoạn (Định kỳ 2 tuần): Đối chiếu tổng lượng thức ăn đã tiêu thụ với lượng hàng tồn thực tế trong kho cám nhằm kịp thời đặt hàng các mã thức ăn số lớn tiếp theo, ngăn ngừa nguy cơ đứt gãy nguồn cung đúng vào giai đoạn tôm ăn mạnh nhất.",
      ],
    },
    {
      heading: "Kết nối kế hoạch sinh học với dòng tiền và chiến lược thu hoạch",
      body: [
        "Một kế hoạch vụ nuôi hoàn chỉnh không chỉ tập trung vào các chỉ số sinh học mà còn phải dự báo chính xác thời điểm nhu cầu thức ăn đạt đỉnh, giai đoạn nào nên tiến hành thu tỉa và thời điểm nào các khoản chi phí tiền mặt (cash outflow) sẽ tăng cao nhất. Sự liên kết này giúp gắn kết năng suất sinh học tại ao nuôi với năng lực tài chính của trang trại, thay vì đợi đến khi thu hoạch cạn ao mới ngồi tính toán lỗ lãi.",
        "Trong mô hình nuôi tôm thẻ chân trắng thâm canh, hơn 65% đến 70% tổng chi phí thức ăn và chi phí điện năng / dầu chạy máy phát điện tập trung vào nửa sau của chu kỳ nuôi (từ sau DOC 60 trở đi). Việc chủ động dự trù các chi phí tăng vọt này qua kế hoạch dòng tiền giúp trang trại không rơi vào cảnh cạn kiệt vốn lưu động đúng thời điểm đàn tôm cần lượng thức ăn tối đa để bứt phá về size lớn có giá thương phẩm cao.",
        "Đồng thời, hãy đưa chiến lược thu tỉa vào kế hoạch ngay từ đầu vụ. Nếu mật độ thả ban đầu cao (chẳng hạn > 100 PL/m²), việc thu tỉa bớt 25% đến 35% sinh khối ở giai đoạn DOC 65–75 sẽ ngay lập tức giải tỏa áp lực tải sinh học của ao, giảm thiểu nguy cơ sụt giảm oxy hòa tan về đêm, đem lại dòng tiền quay vòng để mua thức ăn, đồng thời tạo không gian thoáng đãng cho lượng tôm còn lại trong ao tăng trưởng thần tốc để đạt các size lớn cao cấp.",
      ],
      note: "Tránh tâm lý trì hoãn thu hoạch chỉ để cố nuôi tôm lên size lớn hơn khi các chỉ tiêu môi trường nước ao bắt đầu có dấu hiệu suy thoái nghiêm trọng (nitrit tăng vọt, tảo tàn sụt giảm độ trong, hoặc oxy hòa tan ban đêm không giữ nổi trên mức 4,0 mg/L dù đã chạy hết công suất quạt khí). Khoản lợi nhuận kỳ vọng từ chênh lệch giá tôm size lớn có thể tan biến hoàn toàn nếu ao nuôi bị sự cố tôm chết hàng loạt do vượt quá sức tải sinh học.",
    },
  ],
  checklist: [
    "Xác định rõ mật độ thả giống, kích cỡ thu hoạch mục tiêu (size/ABW), tỷ lệ sống kỳ vọng (SR) và khung thời gian thu hoạch dự kiến ngay từ đầu vụ.",
    "Lập biểu đồ dự trù thức ăn theo từng giai đoạn và lịch đặt hàng thức ăn trước khi bắt đầu thả giống vào ao.",
    "Lên lịch kiểm tra chài mẫu hàng tuần và duy trì các buổi rà soát đánh giá chỉ số ao nuôi một cách kỷ luật.",
    "Đưa kế hoạch phòng ngừa dịch bệnh, các ngưỡng chất lượng nước nguy hại và quy trình ứng phó quản lý rủi ro thời tiết mùa vụ vào phương án vận hành.",
    "Lập bảng dự phóng dòng tiền vận hành hàng tháng và chuẩn bị sẵn các kịch bản thu tỉa khi sinh khối tiến gần sức tải của ao.",
    "Ứng dụng [Phần mềm quản lý trang trại tôm](/vi/shrimp-farm-management-software) để số hóa nhật ký cho ăn hàng ngày, theo dõi chất lượng nước và dữ liệu chài mẫu theo thời gian thực.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
