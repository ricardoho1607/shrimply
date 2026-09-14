import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-disease-alerts",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Cảnh báo dịch bệnh",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Cảnh Báo Dịch Bệnh Tôm: Biến Quan Sát Hiện Trường Thành Phản Ứng Khẩn Cấp Kịp Thời",
  description:
    "Dấu hiệu lâm sàng sớm của dịch bệnh trên tôm thẻ chân trắng là gì? Cách kết hợp theo dõi tỷ lệ hao hụt, sức ăn trên nhá, chất lượng nước, tập tính bơi lội và quy trình an toàn sinh học để xây dựng phản ứng khẩn cấp nhanh chóng, dựa trên bằng chứng thực tế tại ao nuôi.",
  readTime: "7 phút đọc",
  tags: [
    "cảnh báo dịch bệnh tôm",
    "dấu hiệu bệnh tôm",
    "phòng ngừa dịch bệnh tôm",
    "an toàn sinh học ao tôm",
    "phát hiện sớm vi khuẩn Vibrio",
    "bệnh hoại tử gan tụy cấp AHPND",
    "vi bào tử trùng EHP",
    "bệnh đốm trắng WSSV",
    "hội chứng đục cơ IMNV",
    "tỷ lệ hao hụt tôm",
    "cách ly ao nuôi tôm",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-disease-alerts-vibrio-ahpnd-biosecurity.jpg",
    alt: "Đồ họa thông tin Shrimply về hệ thống cảnh báo dịch bệnh tôm, thể hiện phản xạ ăn trên nhá, tỷ lệ hao hụt hàng ngày, chất lượng nước, tập tính bơi lội, vi khuẩn Vibrio, AHPND, an toàn sinh học và quy trình ứng phó khẩn cấp của trang trại",
    width: 1536,
    height: 1024,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần Mềm Cảnh Báo Dịch Bệnh", href: "/vi/features/disease-alerts" },
  takeaways: [
    "Tốc độ kiểm soát dịch bệnh của trang trại tăng vọt khi đội ngũ kỹ thuật kiên trì theo dõi các tín hiệu cảnh báo sớm (Early Warning Signals) trên từng ao nuôi mỗi ngày.",
    "Hệ thống cảnh báo dịch bệnh bắt buộc phải tích hợp đồng thời xu hướng tỷ lệ hao hụt, phản xạ ăn trên nhá (vó), tập tính bơi lội, độ ổn định của chất lượng nước và tình hình dịch tễ khu vực xung quanh.",
    "Kích hoạt ngay lập tức quy trình an toàn sinh học (Biosecurity) nghiêm ngặt và cách ly ao nghi nhiễm là biện pháp then chốt để ngăn chặn lây nhiễm chéo, bảo toàn sinh khối và giảm thiểu thiệt hại tài chính.",
  ],
  faqs: [
    {
      question: "Các dấu hiệu lâm sàng sớm cảnh báo tôm thẻ chân trắng bắt đầu nhiễm bệnh là gì?",
      answer:
        "Cần đặc biệt cảnh giác trước chuỗi bất thường: tôm giảm ăn đột ngột hoặc thức ăn còn thừa trên nhá (vó), tôm bơi lờ đờ ở mặt nước, tấp mé hoặc nổi đầu vào ban ngày, khối gan tụy teo nhỏ, nhợt nhạt hoặc sưng phù mất giọt dầu, đường ruột rỗng hoặc đứt khúc, tôm mềm vỏ kinh niên sau lột xác, cơ thịt trắng đục (đục cơ), màu sắc cơ thể chuyển sang đỏ ửng hoặc nhợt nhạt, số lượng tôm chết rải rác tăng dần tại rốn xi-phông hoặc lưới chắn cống, cùng sự dao động bất thường của các chỉ tiêu môi trường nước. Các biểu hiện này chưa thể khẳng định chính xác tên mầm bệnh cụ thể, nhưng là điều kiện tiên quyết kích hoạt rà soát toàn diện ao nuôi và gửi mẫu xét nghiệm kiểm chứng ngay lập tức.",
    },
    {
      question: "Làm thế nào để trang trại ngăn chặn dịch bệnh lây nhiễm chéo giữa các ao nuôi?",
      answer:
        "Kiểm soát an toàn sinh học (Biosecurity) đa tầng là chìa khóa then chốt: ưu tiên chọn tôm giống sạch bệnh (SPF) có chứng nhận xét nghiệm PCR âm tính; lắp đặt lưới lọc nước mịn tại mương cấp và hệ thống lưới ngăn chim, rào chắn cua còng; quản lý riêng biệt hoàn toàn dụng cụ thao tác (chài mẫu, khay nhá, vợt vớt, xô cho ăn) theo từng ao và sát trùng thường xuyên; nghiêm cấm xả nước hoặc tuần hoàn nước từ ao có tôm bất thường sang các ao lân cận; thiết lập hố nhúng ủng và thau rửa tay sát khuẩn tại lối vào từng bờ ao; đồng thời kích hoạt trạng thái cô lập (quarantine) đối với ao nghi nhiễm ngay khi xuất hiện triệu chứng đầu tiên.",
    },
    {
      question: "Bước phản ứng khẩn cấp đầu tiên cần làm ngay khi phát hiện ao tôm có dấu hiệu nhiễm bệnh nguy hiểm là gì?",
      answer:
        "Hành động ngay trong những giờ đầu tiên: lập tức cắt giảm 30–50% khẩu phần ăn hoặc tạm ngừng cho ăn hoàn toàn để chặn đứng nguồn ô nhiễm đáy ao và kiềm chế vi khuẩn bùng phát; vận hành tối đa công suất giàn quạt nước và sục khí đáy để duy trì nồng độ oxy hòa tan (DO) luôn trên 5,0 mg/L nhằm hỗ trợ tôm chống chịu stress sinh lý; đóng chặt cống cấp và cống xả (cô lập nguồn nước) không để mầm bệnh phát tán ra nguồn nước chung; tuyệt đối không di chuyển dụng cụ hay nhân viên từ ao này sang ao khác; tiến hành thu thập mẫu tôm sống có dấu hiệu bệnh và mẫu nước vô trùng để gửi gấp tới phòng xét nghiệm chẩn đoán PCR và đếm khuẩn Vibrio (đĩa thạch TCBS); đồng thời hội ý với chuyên gia thú y thủy sản để đánh giá nguy cơ và chuẩn bị kịch bản thu hoạch khẩn cấp nếu đàn tôm đã đạt kích cỡ thương phẩm có giá trị.",
    },
  ],
  sections: [
    {
      heading: "Các thông số then chốt bắt buộc phải có trong hệ thống cảnh báo sớm dịch bệnh tôm",
      body: [
        "Hệ thống cảnh báo dịch bệnh không thể chờ đợi đến khi xảy ra sự cố tôm chết hàng loạt nghiêm trọng. Trong quy trình thâm canh tôm thẻ chân trắng (Litopenaeus vannamei), các nguy cơ mầm bệnh hầu như luôn được báo trước bởi chuỗi bất thường tinh tế: thức ăn trên nhá bắt đầu dư thừa, tôm bơi lờ đờ ở tầng mặt hoặc bơi dạt ven bờ ao, màu sắc cơ thể nhợt nhạt hoặc ửng đỏ, khối gan tụy teo nhỏ và mất màu nâu đen đặc trưng, tôm mềm vỏ sau lột, và bắt đầu xuất hiện xác tôm chết rải rác thu gom tại rốn xi-phông đáy ao.",
        "Các tài liệu hướng dẫn quản trị rủi ro dịch bệnh thủy sản của WorldFish luôn nhấn mạnh tầm quan trọng của việc phát hiện sớm chuẩn xác, quản lý môi trường ao nuôi chủ động và thực hành phòng bệnh đa tầng. Báo cáo chuyên ngành của Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc (FAO) về nuôi tôm thẻ chân trắng cũng xác định rõ các triệu chứng lâm sàng và biện pháp kiểm soát đối với những mối đe dọa dịch bệnh hàng đầu như vi khuẩn Vibrio gây bệnh hoại tử gan tụy cấp (AHPND / EMS), virus đốm trắng (WSSV), vi bào tử trùng EHP và virus gây hoại tử cơ (IMNV). Tích hợp những dữ liệu quan sát hiện trường này vào [Phần Mềm Cảnh Báo Dịch Bệnh](/vi/features/disease-alerts) sẽ giúp người nuôi chủ động xử lý sớm hơn nhiều ngày trước khi dịch bệnh lây lan mất kiểm soát.",
      ],
    },
    {
      heading: "Bảng nhận diện cảnh báo các mầm bệnh nguy hiểm: Vibrio, AHPND, WSSV, EHP và IMNV",
      body: [
        "Mỗi tác nhân gây bệnh trong ao nuôi tôm đều có những đặc điểm triệu chứng lâm sàng và quy luật tác động đặc trưng. Việc nắm bắt chính xác các dấu hiệu nhận biết này giúp đội ngũ kỹ thuật trang trại phân biệt rõ ràng giữa hiện tượng tôm bị sốc môi trường nước thông thường với một nguy cơ bùng phát dịch bệnh truyền nhiễm nguy hiểm:",
      ],
      table: {
        columns: ["Mầm bệnh / Tên bệnh", "Dấu hiệu cảnh báo sớm", "Diễn biến sức ăn & Tỷ lệ hao hụt", "Hành động ứng phó khẩn cấp tại ao"],
        rows: [
          [
            "AHPND / EMS (Hoại tử gan tụy cấp do Vibrio parahaemolyticus)",
            "Gan tụy teo nhỏ, nhợt nhạt hoặc đen chai cứng, đường ruột rỗng không có thức ăn, tôm mềm vỏ; thường xuất hiện ở giai đoạn tôm nhỏ (DOC < 35 ngày)",
            "Sức ăn trên nhá tụt dốc không phanh trong vòng 24–48 giờ; tôm rớt đáy hàng loạt và tăng vọt tại hố rốn xi-phông đáy ao",
            "Ngừng cho ăn ngay lập tức, bật tối đa quạt nước và sục khí đáy, cô lập ao tuyệt đối, đóng cống xả, gửi mẫu chạy PCR và cấy khuẩn đĩa thạch TCBS",
          ],
          [
            "WSSV (Bệnh đốm trắng do White Spot Syndrome Virus)",
            "Xuất hiện đốm trắng đường kính 0,5–2 mm dưới giáp đầu ngực, thân tôm ửng đỏ, tôm bơi lờ đờ không định hướng tấp vào bờ ao",
            "Tỷ lệ chết bùng phát đột ngột với cấp số nhân, có thể làm hao hụt 80–100% đàn tôm trong ao chỉ sau 3–7 ngày phát bệnh",
            "Cách ly ao cực kỳ nghiêm ngặt, giăng lưới ngăn chim và rào chắn cua còng, cấm xả nước sống ra ngoài; đánh giá kích cỡ để thu hoạch khẩn cấp nếu đạt giá trị thương phẩm",
          ],
          [
            "EHP (Vi bào tử trùng Enterocytozoon hepatopenaei)",
            "Đàn tôm phân đàn nghiêm trọng (bắn size), tôm còi cọc chậm lớn dù vẫn ăn, xuất hiện sợi phân trắng nổi trôi dạt góc ao",
            "Tỷ lệ chết trực tiếp thấp nhưng tôm chững lớn hoàn toàn, tốc độ tăng trọng ngày (ADG) dậm chân tại chỗ và hệ số FCR tăng vọt",
            "Hiệu chỉnh lại cữ ăn theo sinh khối thực, tăng cường xi-phông hút bùn đáy ao, khử trùng triệt để dụng cụ và không tuần hoàn nước sang ao khác",
          ],
          [
            "IMNV (Bệnh đục cơ do Infectious Myonecrosis Virus)",
            "Cơ thịt các đốt phần đuôi trắng đục như luộc chín (hoại tử cơ), thường bộc phát sau các cơn sốc độ mặn, nhiệt độ hoặc tụt oxy hòa tan",
            "Tôm chết rải rác dai dẳng hàng ngày sau các sự kiện biến động chất lượng nước hoặc thời tiết cực đoan",
            "Duy trì oxy hòa tan (DO) luôn > 5 mg/L, tránh tối đa thao tác gây stress đàn tôm, giảm lượng thức ăn và bổ sung vitamin C cùng khoáng chất",
          ],
          [
            "Bệnh phát sáng / Nhiễm khuẩn Vibrio toàn thân (Systemic Vibriosis)",
            "Tôm phát sáng lấp lánh trong bóng đêm, mang chuyển màu nâu đen, đốm đen melan hóa trên vỏ, gan tụy sưng rồi teo xơ",
            "Tôm rớt đáy lai rai liên tục nhiều ngày, phản xạ bắt mồi tại khay nhá suy giảm rõ rệt",
            "Bổ sung chế phẩm sinh học men vi sinh Bacillus đối kháng liều cao, tăng cường sục khí, định kỳ xi-phông xử lý bùn bã đáy ao",
          ],
        ],
      },
    },
    {
      heading: "Tại sao tín hiệu cảnh báo bệnh cần đặt trong ngữ cảnh vận hành của trang trại",
      body: [
        "Số lượng tôm hao hụt hay lượng thức ăn dư trên nhá không thể được đánh giá chuẩn xác nếu tách rời khỏi môi trường ao nuôi thực tế. Việc phát hiện một vài con tôm chết ở ao tôm nhỏ có số ngày nuôi (DOC) thấp mang mức độ cảnh báo nguy cấp hơn nhiều so với việc thấy tôm rớt rải rác ở ao chuẩn bị thu hoạch có mật độ sinh khối rất cao.",
        "Tín hiệu cảnh báo dịch bệnh bắt buộc phải được đối chiếu trực tiếp với mã số từng ao, ngày tuổi (DOC), diễn biến chuỗi dữ liệu chất lượng nước (như sụt giảm DO rạng sáng, biên độ dao động pH ngày đêm, hay nồng độ khí độc nitrit tăng cao như được phân tích trong [Thông Số Chất Lượng Nước Nuôi Tôm Thẻ Chân Trắng](/vi/resources/vannamei-water-quality-parameters)), phản xạ ăn tại nhá, cùng lịch sử chài mẫu tăng trưởng tại [Phần Mềm Quản Lý Tăng Trưởng & Thu Mẫu](/vi/features/growth-sampling). Nếu thiếu ngữ cảnh tổng hợp này, đội ngũ quản lý ao nuôi rất dễ phản ứng thái quá (overreact) trước các hiện tượng sinh lý bình thường như chu kỳ lột xác đồng loạt, hoặc ngược lại xem nhẹ (underreact) dấu hiệu cảnh báo của một đợt bùng phát mầm bệnh nguy hiểm.",
        "Hệ thống cảnh báo số đóng vai trò như đòn bẩy thúc đẩy đội ngũ kỹ thuật viên rà soát bằng chứng thực tế tại hiện trường nhanh nhất có thể, chứ không nhằm mục đích tự động đưa ra kết luận chẩn đoán thay thế cho phòng xét nghiệm bệnh học thủy sản.",
      ],
    },
    {
      heading: "Quy trình an toàn sinh học khẩn cấp: Mảnh ghép hành động của hệ thống cảnh báo",
      body: [
        "Hệ thống cảnh báo sớm sẽ trở nên vô nghĩa nếu không đi kèm với một kế hoạch hành động dứt khoát và chuẩn hóa tại ao nuôi. Khi một ao xuất hiện các tín hiệu bất thường đáng ngờ, quy trình an toàn sinh học (Biosecurity) khẩn cấp phải được kích hoạt tức thì nhằm cô lập nguồn bệnh, không để lây lan sang các ao nuôi khác trong toàn trang trại:",
      ],
      items: [
        "Cách ly triệt để dụng cụ thao tác: Tuyệt đối cấm sử dụng chung chài lấy mẫu, khay nhá, vợt vớt tôm, xô rải thức ăn và dây dẫn sục khí giữa ao nghi nhiễm với các ao nuôi khác. Bố trí các thùng dung dịch sát trùng (Chlorine, Iodine hoặc thuốc tím) để khử trùng toàn bộ dụng cụ và đặt hố nhúng ủng sát trùng ngay tại lối lên xuống bờ ao.",
        "Cô lập nguồn nước (Water Quarantine): Khóa chặt các cống cấp và van xả đáy của ao nuôi. Tuyệt đối không xả nước hoặc tuần hoàn dòng chảy sang mương chung khi chưa qua quy trình tiêu độc khử trùng nhằm bảo vệ an toàn cho các ao lân cận và nguồn nước tự nhiên bên ngoài.",
        "Kiểm soát và cắt giảm khẩu phần thức ăn: Giảm ngay từ 30% đến 50% lượng thức ăn hàng ngày, hoặc cắt cữ cho ăn tạm thời nếu kiểm tra nhá thấy thức ăn thừa nhiều. Việc này giúp ngăn chặn thức ăn thối rữa dưới đáy ao làm bùng phát khí độc và vi khuẩn cơ hội.",
        "Vận hành tối đa hệ thống sục khí và quạt nước: Tăng cường chạy quạt nước liên tục để đảm bảo hàm lượng oxy hòa tan (DO) luôn duy trì trên 5,0 mg/L suốt cả ngày lẫn đêm. Cung cấp đầy đủ oxy là yếu tố sống còn giúp tôm chống chịu stress sinh lý và gia tăng sức đề kháng.",
        "Lấy mẫu gửi phòng xét nghiệm chẩn đoán: Thu thập mẫu tôm sống có biểu hiện triệu chứng bất thường và mẫu nước ao theo phương pháp vô trùng, nhanh chóng chuyển đến phòng xét nghiệm bệnh học thủy sản chuyên nghiệp để chạy xét nghiệm PCR và cấy đĩa thạch TCBS định lượng vi khuẩn Vibrio.",
        "Xây dựng kịch bản thu hoạch khẩn cấp (thu chạy dịch): Nếu kết quả chẩn đoán khẳng định tôm nhiễm virus nguy hiểm (như đốm trắng WSSV) và đàn tôm đã đạt kích cỡ có thể tiêu thụ được, cần khẩn trương lên kế hoạch thu hoạch có kiểm soát, sau đó xử lý tiêu độc khử trùng toàn bộ nước ao bằng Chlorine liều cao trước khi thải bỏ.",
      ],
    },
  ],
  checklist: [
    "Theo dõi và ghi nhận sức ăn trên nhá, tỷ lệ hao hụt tại rốn xi-phông, tập tính bơi lội và độ ổn định chất lượng nước trên từng ao mỗi ngày.",
    "Xác lập cụ thể các ngưỡng cảnh báo sớm và quy trình thao tác chuẩn (SOP) ứng phó khẩn cấp cùng đội ngũ kỹ thuật trước khi bắt đầu vụ nuôi.",
    "Kích hoạt tức thì quy trình cô lập nguồn nước, cách ly dụng cụ và khử trùng ủng bảo hộ ngay khi phát hiện tín hiệu bất thường đầu tiên.",
    "Lưu trữ và cập nhật toàn bộ lịch sử cảnh báo cùng các biện pháp can thiệp lên hệ thống số để rút kinh nghiệm và chủ động phòng ngừa cho các vụ nuôi tiếp theo.",
  ],
  sources: [
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
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
  ],
};
