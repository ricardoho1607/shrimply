import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-mortality-tracking",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Theo dõi tỷ lệ hao hụt",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Theo Dõi Tỷ Lệ Hao Hụt Tôm: Ghi Nhận Hao Hụt Thực Tế Để Bảo Vệ Sinh Khối, FCR Và Kế Hoạch Thu Hoạch",
  description:
    "Tại sao tôm chết trong ao? Tìm hiểu cách ghi chép và phân tích tỷ lệ hao hụt hàng ngày giúp kỹ sư phát hiện sớm rủi ro dịch bệnh, loại bỏ 'sinh khối ảo', kiểm soát chuẩn xác hệ số FCR và lập kế hoạch thu hoạch tối ưu lợi nhuận.",
  readTime: "7 phút đọc",
  tags: [
    "theo dõi tỷ lệ hao hụt tôm",
    "tôm chết trong ao",
    "hao hụt cấp tính",
    "tỷ lệ sống của tôm (SR)",
    "rủi ro dịch bệnh tôm",
    "ước tính sinh khối tôm",
    "bệnh hoại tử gan tụy cấp AHPND",
    "tôm chết đáy ẩn",
    "kiểm soát FCR thực tế",
    "kiểm tra rốn xi-phông đáy ao",
    "kiểm tra nhá ăn",
    "tính toán số lượng tôm tồn ao",
  ],
  publishedAt: "2026-06-08",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/shrimp-mortality-tracking-survival-biomass.jpg",
    alt: "Infographic theo dõi tỷ lệ hao hụt tôm thẻ chân trắng: ghi chép tỷ lệ chết, ước tính tỷ lệ sống SR, bảo vệ sinh khối thực tế, ngăn ngừa phồng FCR và kích hoạt phản ứng an toàn sinh học",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Hệ thống cảnh báo dịch bệnh & an toàn sinh học", href: "/vi/features/disease-alerts" },
  takeaways: [
    "Tỷ lệ hao hụt không được ghi nhận sẽ tạo ra 'sinh khối ảo' (Phantom Biomass), dẫn đến tình trạng cho ăn dư thừa kéo dài, FCR tăng vọt và sai lệch nghiêm trọng dự báo sản lượng thu hoạch.",
    "Đường cong xu hướng hao hụt hàng ngày (Daily Mortality Trend) có giá trị cảnh báo sớm (Early Warning) vượt trội hơn nhiều so với tổng kết tỷ lệ sống (SR) cuối vụ nuôi.",
    "Phát hiện xác tôm tại rốn xi-phông, hố gom bùn giữa ao hoặc trên nhá ăn phải được liên kết tức thì với biến động chất lượng nước, sức ăn và quy trình an toàn sinh học khẩn cấp.",
  ],
  faqs: [
    {
      question: "Tại sao tôm thẻ chân trắng trong ao chết rải rác hoặc chết cấp tính đột ngột?",
      answer:
        "Tôm chết có thể do nhiều nguyên nhân kết hợp: khủng hoảng chất lượng nước (sụt giảm oxy hòa tan DO rạng sáng < 3,0 mg/L, tích tụ khí độc TAN hoặc NO₂⁻, biến thiên pH quá mức, khí độc H₂S thoát từ đáy ao), nhiễm mầm bệnh cấp tính (độc tố PirA/PirB từ AHPND/EMS ở tôm nhỏ, virus đốm trắng WSSV, vi khuẩn Vibrio tấn công máu), sốc môi trường sau mưa lớn hạ độ mặn đột ngột, hoặc hội chứng tôm rớt đáy khi lột xác do mất cân bằng khoáng canxi/magie. Khi phát hiện tôm chết, cần ghi nhận ngay thời điểm, vị trí xuất hiện, trạng thái vỏ và ruột, sức ăn trên nhá và kết quả đo đạc môi trường mới nhất.",
    },
    {
      question: "Hao hụt tôm ảnh hưởng trực tiếp đến hệ số FCR và kế hoạch thu hoạch như thế nào?",
      answer:
        "Mỗi con tôm chết đi đều đã tiêu thụ một lượng thức ăn nhất định nhưng không còn tạo ra sinh khối thương phẩm để bán. Nếu không ghi nhận hao hụt và không hạ định mức thức ăn, kỹ thuật viên sẽ tiếp tục cấp cám dựa trên sinh khối cũ cao hơn thực tế (cho ăn dư thừa). Điều này làm hư đáy ao và đẩy FCR thực tế tăng vọt. Ngoài ra, ước tính sai sinh khối còn làm vỡ kế hoạch thu hoạch, sai lệch cỡ tôm xuất bán và ảnh hưởng nghiêm trọng đến dòng tiền trang trại.",
    },
    {
      question: "Sự khác biệt giữa xác tôm chết thấy trên nhá ăn và xác tôm tại rốn xi-phông đáy ao là gì?",
      answer:
        "Xác tôm trên nhá thường là những cá thể còn đủ sức bơi vào khu vực cho ăn trước khi kiệt sức, thường liên quan đến tôm yếu sau lột xác hoặc cạnh tranh dinh dưỡng. Ngược lại, xác tôm gom về rốn xi-phông giữa ao phản ánh 'hao hụt đáy ao bị che giấu' (Hidden mortality). Tôm suy hô hấp hoặc nhiễm bệnh nặng sẽ chìm xuống đáy và bị dòng quạt nước gom vào hố xả thải. Dạng hao hụt đáy này thường không thể hiện trên mặt nước cho đến khi số lượng tôm chết đã tích lũy rất lớn.",
    },
    {
      question: "Công thức hiệu chỉnh số lượng tôm tồn và sinh khối thực tế khi phát hiện hao hụt?",
      answer:
        "Sử dụng công thức: Số lượng tôm thực tế = (Số lượng giống thả ban đầu − Tổng số tôm chết ghi nhận được − Hệ số bù đắp hao hụt đáy và tôm ăn thịt lẫn nhau) − Sản lượng tôm đã thu tỉa trước đó. Sau đó tính: Sinh khối thực tế (kg) = (Số lượng tôm thực tế × MBW mới nhất (gam)) / 1.000. Ngay sau đó phải hạ định mức thức ăn hàng ngày tương ứng để tránh ô nhiễm ao nuôi.",
    },
    {
      question: "Khi nào chủ trang trại nên quyết định thu hoạch khẩn cấp (Emergency Harvest)?",
      answer:
        "Thu hoạch khẩn cấp cần được cân nhắc khi: tỷ lệ chết tăng đột biến (ví dụ > 2–3% tổng đàn mỗi ngày kéo dài liên tục 2–3 ngày), tôm giảm ăn nghiêm trọng (thức ăn trên nhá dư > 50–70%), xét nghiệm phòng lab xác nhận mầm bệnh virus nguy hiểm không thể điều trị (như WSSV hoặc AHPND độc lực cao), chất lượng nước suy sụp không thể phục hồi và tôm đã đạt kích cỡ thương phẩm tối thiểu mà thương lái hoặc nhà máy chấp nhận thu mua.",
    },
  ],
  sections: [
    {
      heading: "Tại sao ghi nhận hao hụt là công cụ sống còn trong kiểm soát chi phí",
      body: [
        "Hao hụt tôm làm thay đổi trực tiếp số lượng cá thể sống trong ao. Khi số liệu này bị bỏ quên hoặc ghi chép đối phó, ao nuôi sẽ rơi vào tình trạng 'sinh khối ảo' (Phantom biomass)—nơi người nuôi tin rằng đàn tôm vẫn đủ số lượng, trong khi hàng vạn con đã chết và phân hủy dưới đáy ao.",
        "Hậu quả tài chính xuất hiện ngay lập tức ở hệ số FCR. Lượng thức ăn đắt tiền tiếp tục được rải xuống ao để nuôi những con tôm không tồn tại, khiến thức ăn thừa thối rữa, khí độc bùng phát và [hệ số chuyển đổi thức ăn (FCR)](/vi/resources/fcr-shrimp-farming) tăng vọt ngoài tầm kiểm soát.",
        "Mặt khác, đồ thị tỷ lệ hao hụt hàng ngày hoạt động như hệ thống cảnh báo sớm. Số tôm chết tăng từ 5 con lên 20 con, 50 con và 100 con mỗi ngày là hồi chuông báo động đỏ về dịch bệnh, có giá trị hành động cao hơn rất nhiều so với con số tỷ lệ sống (SR) thụ động nhận được vào ngày tát cạn thu hoạch ao.",
      ],
      note: "Nguyên tắc sinh khối chính xác: Khi xác định mẫu hình hao hụt rõ rệt, phải cập nhật ngay số lượng tôm tồn trong [phần mềm thu mẫu và theo dõi tăng trưởng tôm](/vi/features/growth-sampling) để tự động hạ mức thức ăn hàng ngày trước khi đáy ao bị ngộ độc hữu cơ.",
    },
    {
      heading: "4 vị trí then chốt kiểm soát hao hụt: Nhá ăn, rốn xi-phông, mé bờ ao và hệ số ăn nhau",
      body: [
        "Tôm thẻ chân trắng (Litopenaeus vannamei) là loài sống đáy (Benthic organism) và có tập tính ăn thịt đồng loại (Cannibalism) khi bạn cùng ao bị ốm yếu hoặc vừa mới lột xác. Do đó, số xác tôm nổi lên mặt nước thường chỉ là phần nổi của tảng băng chìm.",
        "Để đánh giá mức độ hao hụt sát với thực tế nhất, đội ngũ kỹ thuật bờ ao cần kiểm tra đều đặn 4 vị trí sau:",
      ],
      items: [
        "Nhá ăn (vó cho ăn): Quan sát tôm lờ đờ, mềm vỏ bất thường, ruột rỗng hoặc xác tôm bị đồng loại rỉa dở khi vào kiểm tra nhá sau 1,5–2 giờ cho ăn.",
        "Rốn xi-phông và hố gom bùn giữa ao: Đây là điểm chiến lược quan trọng nhất vì xác tôm chết chìm sẽ bị luồng nước của dàn quạt gom vào giữa ao. Việc đếm số lượng hoặc cân trọng lượng xác tôm xả ra trong mỗi ca xi-phông sáng và chiều là chỉ báo chuẩn xác nhất về hao hụt đáy.",
        "Lưới chắn cửa cống và ven bờ ao: Tôm bơi lờ đờ tấp mé mặt nước vào ban ngày thường là dấu hiệu của thiếu oxy nghiêm trọng, ngộ độc khí hoặc nhiễm trùng huyết do vi khuẩn.",
        "Hệ số bù hao hụt ăn nhau (Cannibalism Factor): Những con tôm khỏe mạnh sẽ tiêu thụ sạch xác tôm yếu trong vòng vài giờ. Trong các ao [nuôi mật độ cao và siêu thâm canh](/vi/resources/vannamei-stocking-density), mỗi xác tôm nguyên vẹn thu được tại rốn xi-phông thường tương ứng với 2–3 con khác đã bị ăn mất hoàn toàn không để lại dấu tích.",
      ],
    },
    {
      heading: "Ma trận phân loại mức độ hao hụt và quy trình ứng phó khẩn cấp (SOP)",
      body: [
        "Nhằm giúp quản lý trang trại và kỹ thuật viên bờ ao đưa ra quyết định kịp thời và chuẩn hóa, áp dụng ma trận phân cấp hao hụt sau đây:",
      ],
      table: {
        columns: [
          "Mức độ hao hụt",
          "Tỷ lệ hao hụt hàng ngày",
          "Dấu hiệu cảnh báo & Nguyên nhân khả nghi",
          "Tác động đến sinh khối & FCR",
          "Quy trình xử lý khẩn cấp tại bờ ao (SOP)",
        ],
        rows: [
          [
            "Hao hụt nền bình thường (Baseline)",
            "< 0,05% – 0,1% tổng đàn/ngày (vài con xuất hiện rải rác khi xi-phông hoặc kiểm tra nhá)",
            "Tôm lột xác dính vỏ rải rác, cạnh tranh tự nhiên, tôm giống yếu đào thải sau thả.",
            "Tác động rất nhỏ đến sinh khối, FCR duy trì ổn định theo kế hoạch vụ nuôi.",
            "Ghi nhật ký hàng ngày, duy trì khẩu phần ăn theo định mức và đo đạc chất lượng nước định kỳ.",
          ],
          [
            "Hao hụt mức cảnh báo (Warning / Moderate)",
            "0,1% – 0,5% tổng đàn/ngày kéo dài liên tục 2–3 ngày",
            "Thiếu oxy rạng sáng (< 3,5 mg/L), tích tụ TAN hoặc NO₂⁻, biến động độ mặn sau mưa bão, nhiễm khuẩn Vibrio hoặc EHP mãn tính.",
            "Ước tính sinh khối bắt đầu sai lệch, nguy cơ phồng FCR nếu không cắt giảm thức ăn kịp thời.",
            "Giảm ngay 20–30% lượng thức ăn, chạy quạt nước tối đa công suất, rà soát [các thông số chất lượng nước ao tôm](/vi/resources/vannamei-water-quality-parameters) và tăng tần suất xả thải xi-phông.",
          ],
          [
            "Hao hụt mức nguy cấp / Dịch bệnh bùng phát (Critical Outbreak)",
            "> 0,5% – 2%+ tổng đàn/ngày tăng vọt đột ngột hoặc theo cấp số nhân",
            "Bùng phát virus đốm trắng (WSSV), độc tố vi khuẩn hoại tử gan tụy cấp (AHPND), đáy ao cạn kiệt oxy hoàn toàn hoặc xì khí độc H₂S.",
            "Sinh khối sụt giảm nhanh chóng, thức ăn dư thừa gây ô nhiễm nghiêm trọng nếu tiếp tục cho ăn.",
            "Cắt giảm hoàn toàn thức ăn (Stop feeding), đóng cống cô lập ao nuôi, kích hoạt [hệ thống cảnh báo dịch bệnh](/vi/features/disease-alerts), gửi mẫu PCR khẩn cấp và chuẩn bị phương án thu hoạch khẩn.",
          ],
        ],
      },
    },
    {
      heading: "Hướng dẫn ghi chép dữ liệu hao hụt chuẩn xác và có giá trị sử dụng",
      body: [
        "Ghi lại số con chết đơn thuần là chưa đủ để phân tích chuyên sâu. Dữ liệu có giá trị cao nhất khi được gắn kết với thông số môi trường, phản xạ ăn mồi và lịch sử xử lý ao.",
        "Mỗi khi phát hiện tôm chết hoặc có dấu hiệu bất thường, cần ghi vào [nhật ký ao nuôi tôm](/vi/resources/shrimp-farm-record-keeping): ngày và tuổi nuôi DOC, mã số ao, số lượng tôm đếm được thực tế (Confirmed count) hoặc trọng lượng xác (kg), phân định rõ ràng giữa số đếm thực tế và số ước tính.",
        "Bên cạnh đó, cần ghi chép bệnh tích lâm sàng: tình trạng gan tụy (teo nhỏ, nhợt nhạt, sưng hay đỏ bầm), độ đầy đường ruột (đầy, rỗng hay đứt khúc ziczac), độ cứng của vỏ tôm, tình trạng mang (sạch, bám rong hay thâm đen), cùng các chỉ số môi trường đo cùng ngày như DO rạng sáng, pH sáng chiều, TAN, NO₂⁻ và nhiệt độ nước.",
      ],
    },
    {
      heading: "Ứng dụng dữ liệu hao hụt để cập nhật sinh khối, thức ăn và kế hoạch xuất bán",
      body: [
        "Khi đã xác định được xu hướng hao hụt, bước hành động quan trọng nhất là tính toán lại số lượng tôm tồn trong ao theo công thức: Số lượng tôm thực tế = (Số giống thả ban đầu − Hao hụt tích lũy ghi nhận − Hệ số hao hụt ngầm) − Số lượng đã thu hoạch.",
        "Kết hợp số lượng tôm tồn với trọng lượng bình quân (MBW) từ đợt chài mẫu mới nhất, tính toán sinh khối hiện có và điều chỉnh lượng thức ăn mỗi cữ theo [bảng tra tỷ lệ cho ăn tôm thẻ chân trắng](/vi/resources/vannamei-feeding-rate) để chấm dứt lãng phí thức ăn và giữ vững chỉ tiêu FCR.",
        "Việc cập nhật sinh khối chính xác cũng giúp người quản lý điều chỉnh lịch xuất bán, thương lượng giá cả theo cỡ tôm thực tế và bảo đảm dòng tiền ổn định theo đúng [kế hoạch vụ nuôi tôm](/vi/resources/shrimp-cycle-planning).",
      ],
    },
    {
      heading: "Quy trình an toàn sinh học và tiêu hủy xác tôm đúng kỹ thuật",
      body: [
        "Phát hiện tỷ lệ hao hụt tăng cao đòi hỏi phải kích hoạt các rào cản an toàn sinh học ngay lập tức để bảo vệ các ao nuôi lân cận. Nghiêm cấm tuyệt đối việc vứt xác tôm chết xuống kênh cấp thoát nước chung hoặc vứt bừa bãi ven bờ ao, vì chim, chuột, cua còng và nguồn nước sẽ làm lây lan mầm bệnh ra toàn trang trại.",
        "Toàn bộ xác tôm thu gom từ xi-phông, rốn ao hay nhá ăn phải được cho vào thùng chứa có nắp đậy kín, sau đó ngâm khử trùng bằng dung dịch chlorine nồng độ cao hoặc đốt và chôn lấp với vôi bột tại khu xử lý rác cách ly xa khu nuôi. Dụng cụ như chài mẫu, nhá ăn, vợt vớt và ủng bảo hộ của công nhân phải được sát trùng trước khi chuyển sang ao khác.",
        "Nếu nghi ngờ dịch bệnh nguy hiểm, cần lấy mẫu tôm sống có triệu chứng đem gửi phòng xét nghiệm PCR và nuôi cấy vi khuẩn trên đĩa thạch TCBS để có chẩn đoán chính xác nhất, tránh việc tự ý dùng kháng sinh bừa bãi làm tồn dư hóa chất và ảnh hưởng đến tiêu chuẩn xuất khẩu tôm sạch.",
      ],
    },
  ],
  checklist: [
    "Đếm và ghi nhận số lượng tôm chết hàng ngày cho từng ao nuôi từ rốn xi-phông, nhá ăn và mé bờ.",
    "Phân tách rõ ràng giữa số đếm thực tế (Confirmed count) và ước tính hao hụt ngầm (Estimated loss).",
    "Cập nhật lại số lượng tôm tồn và sinh khối thực tế ngay khi phát hiện xu hướng hao hụt kéo dài.",
    "Hạ khẩu phần thức ăn hàng ngày tương ứng với sinh khối mới để ngăn ngừa ô nhiễm đáy ao và tăng FCR.",
    "Đối chiếu đường cong hao hụt với oxy hòa tan rạng sáng, biến thiên pH sáng chiều và sức ăn trên nhá.",
    "Thu gom xác tôm vào thùng kín để khử trùng bằng chlorine hoặc chôn lấp với vôi nóng, tuyệt đối không vứt ra kênh rãnh.",
    "Gửi mẫu xét nghiệm PCR / vi khuẩn TCBS ngay khi tỷ lệ hao hụt vượt ngưỡng cảnh báo để có phác đồ can thiệp chuẩn xác.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
    {
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
  ],
};
