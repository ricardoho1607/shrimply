import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "white-feces-disease-shrimp",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Bệnh phân trắng (WFD)",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Bệnh Phân Trắng Trên Tôm Thẻ Chân Trắng (WFD): Nguyên Nhân, Phản Ứng Khẩn Cấp Và Giải Pháp Phòng Ngừa Bền Vững",
  description:
    "Cẩm nang toàn diện về bệnh phân trắng trên tôm thẻ chân trắng (WFD / WFS): nhận diện sớm sợi phân trắng nổi góc ao, mối liên hệ đồng nhiễm giữa vi bào tử trùng EHP và vi khuẩn Vibrio, kiểm soát chất lượng nước, ứng phó khẩn cấp và sử dụng vi sinh Bacillus bảo vệ đường ruột.",
  readTime: "9 phút đọc",
  tags: [
    "bệnh phân trắng tôm thẻ",
    "bệnh phân trắng",
    "WFD",
    "WFS",
    "phân trắng nổi mặt nước",
    "vi bào tử trùng EHP",
    "vi khuẩn Vibrio",
    "men vi sinh Bacillus",
    "vi sinh xử lý nước ao tôm",
    "sức khỏe đường ruột tôm",
  ],
  publishedAt: "2026-06-12",
  updatedAt: "2026-09-13",
  image: {
    src: "/resources/images/white-feces-disease-wfd-shrimp-guide.png",
    alt: "Cẩm nang quản lý bệnh phân trắng trên tôm thẻ chân trắng (WFD): triệu chứng lâm sàng, rủi ro đồng nhiễm EHP và Vibrio, thông số môi trường nước, quy trình ứng phó khẩn cấp và giải pháp men vi sinh",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Hệ thống cảnh báo dịch bệnh & an toàn sinh học", href: "/vi/features/disease-alerts" },
  takeaways: [
    "Bệnh phân trắng (WFD/WFS) là một hội chứng đa yếu tố (Multifactorial syndrome) liên quan chặt chẽ đến sự tổn thương hệ vi nhung mao gan tụy và suy thoái hệ sinh thái ao nuôi, không đơn thuần do một mầm bệnh duy nhất.",
    "Tải lượng hữu cơ cao, thức ăn thừa thối rữa đáy ao, biến thiên pH/độ kiềm, oxy hòa tan DO sụt giảm, tích tụ amonia/nitrit và sự đồng nhiễm giữa bào tử EHP với vi khuẩn Vibrio độc lực cao tạo nên tác động cộng hưởng bùng phát bệnh.",
    "Phòng ngừa dài hạn phụ thuộc vào quy trình cải tạo ao triệt để, kiểm tra giống sạch bệnh (SPF/PCR), duy trì ổn định môi trường hóa lý, kiểm soát nhá ăn nghiêm ngặt và bổ sung chủng vi sinh Bacillus chất lượng cao thường xuyên.",
  ],
  faqs: [
    {
      question: "Dấu hiệu cảnh báo sớm nhất của bệnh phân trắng (WFD) trên tôm thẻ là gì?",
      answer:
        "Dấu hiệu dễ nhận thấy nhất bằng mắt thường là những sợi phân trắng nổi thành bè trên mặt nước (thường trôi dạt về góc cuối hướng gió, ven bờ hoặc góc tụ quạt nước) và các đoạn phân trắng dính bám trên nhá ăn. Tuy nhiên, trước đó 2–3 ngày, đàn tôm đã có những chỉ dấu báo động sớm: tôm giảm ăn đột ngột, thức ăn dư thừa trên nhá, đường ruột tôm teo nhỏ, rỗng ruột hoặc xuất hiện các đoạn màu trắng sữa đứt khúc, khối gan tụy nhợt nhạt teo tóp, tôm mềm vỏ, phân đàn rõ rệt và tốc độ tăng trưởng ngày (ADG) bị chững lại.",
    },
    {
      question: "Bệnh phân trắng có phải chỉ do duy nhất một loại vi khuẩn gây ra không?",
      answer:
        "Không. Các công trình nghiên cứu khoa học quốc tế khẳng định bệnh phân trắng là hội chứng đa nguyên nhân. Thử nghiệm gây nhiễm trong phòng thí nghiệm chứng minh sự tương tác cộng hưởng bệnh lý (Synergistic relationship) giữa vi bào tử trùng Enterocytozoon hepatopenaei (EHP)—loài ký sinh gây bong tróc tế bào biểu mô ống gan tụy biến dạng thành thể ATM—và các chủng vi khuẩn Vibrio parahaemolyticus hoặc Vibrio spp. độc lực cao, dưới sự kích hoạt của môi trường nước ô nhiễm nhiều chất hữu cơ và mất cân bằng hệ vi sinh đường ruột (Gut dysbiosis).",
    },
    {
      question: "Các bước xử lý khẩn cấp đầu tiên khi phát hiện phân trắng nổi mặt nước là gì?",
      answer:
        "Thực hiện ngay 3 hành động khẩn cấp: 1) Cắt giảm ngay 30–50% lượng thức ăn hàng ngày hoặc ngưng cho ăn 1 cữ để chặn đứng tích tụ chất hữu cơ thối rữa đáy ao; 2) Vận hành tối đa dàn quạt nước và hệ thống oxy đáy 24/24 để duy trì DO > 5,0 mg/L, đồng thời xả đáy xi-phông nhẹ nhàng để loại bỏ sợi phân trắng và bùn thải; 3) Thiết lập rào cản an toàn sinh học cách ly ao bệnh, không dùng chung vợt, nhá ăn, dây xi-phông sang ao khác và sát trùng dụng cụ bằng chlorine hoặc thuốc tím nồng độ cao.",
    },
  ],
  sections: [
    {
      heading: "Bản chất thực sự của hội chứng phân trắng (WFD / WFS) trên tôm",
      body: [
        "Hội chứng phân trắng (White Feces Disease - WFD hoặc White Feces Syndrome - WFS) là bệnh lý tiêu hóa thường xuất hiện từ ngày nuôi thứ 40 đến 80 khi sinh khối tôm tăng nhanh và tải lượng chất thải hữu cơ trong ao nuôi bắt đầu tích tụ lớn. Khi bệnh xảy ra, người nuôi quan sát thấy các sợi phân tôm màu trắng nổi lềnh bềnh trên mặt nước dạt về góc ao hoặc bám vào thành nhá kiểm tra thức ăn.",
        "Tôm mắc bệnh có biểu hiện đường ruột rỗng, ruột đứt khúc lượn sóng hoặc chứa dịch màu trắng đục, gan tụy teo nhạt màu, vỏ mềm mỏng óp cơ, tôm chậm lớn phân đàn nghiêm trọng và xuất hiện hao hụt rải rác chìm dưới đáy ao. Nếu không xử lý kịp thời, hệ số FCR sẽ tăng vọt và chi phí vụ nuôi bị đội lên nhanh chóng.",
        "Về mặt bệnh học, các sợi phân trắng thực chất là sự tích tụ của các tế bào biểu mô vi nhung mao ống gan tụy bị bong tróc, hoại tử và biến tính (Aggregated Transformed Microvilli - ATM), kết hợp với dịch nhầy đường ruột và vi khuẩn. Đây là tổn thương mô học nghiêm trọng, làm mất hoàn toàn khả năng tiêu hóa và hấp thu dinh dưỡng của tôm.",
      ],
    },
    {
      heading: "Cơ chế đồng nhiễm: Sự kết hợp nguy hiểm giữa vi bào tử trùng EHP và vi khuẩn Vibrio",
      body: [
        "Nghiên cứu đăng trên tạp chí khoa học PLOS ONE đã tái lập thành công hội chứng phân trắng trên tôm thẻ chân trắng thông qua thử nghiệm cảm nhiễm kết hợp: tôm đã nhiễm sẵn vi bào tử trùng EHP khi tiếp xúc với chủng vi khuẩn Vibrio parahaemolyticus sẽ bùng phát các triệu chứng phân trắng điển hình và tỷ lệ chết tăng cao.",
        "Bào tử EHP ký sinh trong tế bào biểu mô gan tụy làm tổn thương cấu trúc thành ruột và phá vỡ hàng rào miễn dịch tự nhiên. Điều này tạo điều kiện thuận lợi cho các loài vi khuẩn cơ hội thuộc chi Vibrio xâm nhập sâu vào mô mạch máu, tiết ra các độc tố hoại tử tế bào làm đường ruột tôm viêm loét nặng nề.",
        "Đồng thời, sự suy giảm tính đa dạng sinh học của hệ vi sinh đường ruột (Dysbiosis) làm mất đi các vi khuẩn có lợi cạnh tranh, biến đường ruột tôm thành môi trường thuận lợi cho vi khuẩn kỵ khí sinh độc tố phát triển mạnh.",
      ],
    },
    {
      heading: "Các chỉ số môi trường nước thúc đẩy bùng phát bệnh phân trắng",
      body: [
        "Sự bùng phát phân trắng không diễn ra ngẫu nhiên mà luôn có các dấu hiệu báo trước từ xu hướng biến động chất lượng nước trong 3 đến 5 ngày trước đó. Việc theo dõi chặt chẽ dữ liệu giúp người nuôi can thiệp trước khi triệu chứng phân trắng xuất hiện rõ ràng.",
        "Các thông số môi trường rủi ro cao bao gồm: oxy hòa tan (DO) ban đêm và rạng sáng tụt xuống dưới 3,5 mg/L, độ kiềm (Alkalinity) dưới 100 ppm làm giảm khả năng đệm nước, độ trong đĩa Secchi giảm nhanh (< 25 cm) do tảo tàn hoặc bùng phát tảo độc, hàm lượng amonia tự do (TAN) và nitrit (NO₂⁻) tăng cao, và mật độ khuẩn Vibrio trên đĩa thạch TCBS (đặc biệt là khuẩn lạc màu xanh) vượt ngưỡng an toàn (> 10³ CFU/mL). Chi tiết xem tại [Bảng chỉ số chất lượng nước ao tôm thẻ](/vi/resources/vannamei-water-quality-parameters).",
        "Tải lượng hữu cơ đáy ao (TOM) tăng cao do cho ăn dư thừa là nguồn cơ chất dồi dào nuôi dưỡng khuẩn Vibrio. Khi kết hợp với sự xáo trộn môi trường do thời tiết nắng nóng gay gắt hoặc mưa dầm làm pH biến thiên mạnh (> 0,5 đơn vị/ngày), sức đề kháng của tôm bị suy giảm nghiêm trọng, kích hoạt mầm bệnh phân trắng bùng phát (xem thêm tại [Phân tích xu hướng chất lượng nước ao tôm](/vi/resources/water-quality-trends)).",
      ],
    },
    {
      heading: "Phác đồ phản ứng khẩn cấp tại bờ ao khi phát hiện phân trắng",
      body: [
        "Bước 1: Giảm tải áp lực lên hệ tiêu hóa của tôm và môi trường ao nuôi bằng cách giảm ngay 30–50% khẩu phần ăn hàng ngày. Tuyệt đối không cố ép tôm ăn khi tôm đang bệnh. Việc cho ăn dư thừa lúc này chỉ làm trầm trọng thêm tình trạng ô nhiễm đáy và nuôi dưỡng vi khuẩn có hại.",
        "Bước 2: Tăng cường sục khí oxy đáy và chạy tối đa quạt nước để duy trì DO luôn trên 5,0 mg/L. Môi trường giàu oxy giúp tôm duy trì trao đổi chất và ức chế các dòng vi khuẩn yếm khí sinh độc tố dưới đáy ao. Tiến hành xi-phông đáy ao nhẹ nhàng để loại bỏ phân trắng và xác tôm chết, kết hợp bổ sung khoáng tạt và vôi dolomite để ổn định độ kiềm 120–150 ppm.",
        "Bước 3: Cô lập ao nuôi (Quarantine) để ngăn chặn nguy cơ lây lan chéo sang các ao lân cận. Nghiêm cấm dùng chung thiết bị (nhá ăn, vợt vớt, chài mẫu, dây xi-phông) giữa các ao. Nhân viên phải sát trùng ủng và tay chân bằng cồn hoặc dung dịch khử trùng trước và sau khi thao tác tại ao bệnh (tham khảo thêm tại [Hệ thống cảnh báo dịch bệnh tôm](/vi/resources/shrimp-disease-alerts)).",
      ],
    },
    {
      heading: "Phục hồi chức năng gan ruột và kiểm soát vi khuẩn bằng giải pháp sinh học",
      body: [
        "Không có loại 'thuốc tiên' nào có thể dập tắt bệnh phân trắng ngay lập tức. Chiến lược hồi phục bền vững phải dựa trên nguyên lý giải độc gan tụy, tái thiết hệ nhung mao ruột và cân bằng lại hệ vi sinh vật đường ruột.",
        "Trộn vào thức ăn các chế phẩm hỗ trợ đường ruột: bổ sung axit hữu cơ (axit formic, axit butyric) để hạ pH đường ruột ức chế khuẩn Vibrio, kết hợp chiết xuất thảo dược bảo vệ tế bào gan (như cao diệp hạ châu, silymarin), beta-glucan tăng cường miễn dịch và vitamin C chống stress. Chia nhỏ lượng thức ăn thành nhiều cữ nhỏ để tôm hấp thu tối đa mà không gây quá tải cho đường ruột đang bị viêm loét.",
        "Nghiêm cấm tuyệt đối việc lạm dụng kháng sinh trôi nổi không rõ nguồn gốc để tạt xuống ao hoặc trộn ăn bừa bãi. Kháng sinh phổ rộng sẽ tiêu diệt sạch cả vi khuẩn có lợi trong ruột tôm, làm teo gan tụy nhanh hơn, gây lờn thuốc kháng sinh (AMR) và tồn dư hóa chất khiến tôm bị cấm xuất khẩu.",
      ],
    },
    {
      heading: "Vai trò của men vi sinh Bacillus trong phòng ngừa chủ động",
      body: [
        "Các chủng vi sinh vật có ích thuộc chi Bacillus (như Bacillus subtilis, Bacillus licheniformis, Bacillus amyloliquefaciens) đóng vai trò nền tảng trong việc kiểm soát bệnh phân trắng nhờ khả năng tiết enzyme phân giải chất hữu cơ và sản sinh bacteriocin ức chế vi khuẩn Vibrio.",
        "Các công trình nghiên cứu hiện đại khẳng định việc bổ sung vi sinh Bacillus vào môi trường nước và thức ăn từ đầu vụ nuôi giúp thiết lập quần thể vi sinh vật cạnh tranh vị trí bám dính trên niêm mạc ruột tôm, ngăn ngừa sự khu trú của khuẩn gây hại và ổn định chất lượng nước ao nuôi thâm canh.",
        "Vi sinh phải được sử dụng như một chương trình phòng vệ chủ động, duy trì tạt định kỳ hàng tuần từ khi thả giống, chứ không phải giải pháp 'chữa cháy' thụ động chỉ được sử dụng khi đáy ao đã bị đen thối và tôm đã nổi phân trắng khắp mặt nước.",
      ],
    },
    {
      heading: "Chiến lược phòng bệnh phân trắng tổng thể từ đầu vụ",
      body: [
        "Cải tạo đáy ao kỹ lưỡng: nạo vét bùn đáy triệt để, phơi khô đáy ao, xử lý vôi nóng CaO (nâng pH đất > 12 để kích nổ và tiêu diệt bào tử EHP cứng đầu), sau đó khử trùng bằng chlorine hoặc hóa chất sát khuẩn được phép sử dụng.",
        "Chọn tôm giống sạch bệnh (SPF) từ các trại sản xuất uy tín có chứng nhận xét nghiệm PCR âm tính với EHP, WSSV và AHPND. Loại bỏ ngay những lô giống có đường ruột mảnh nhỏ, gan tụy teo nhạt màu hoặc tỷ lệ dị hình cao.",
        "Quản lý lượng thức ăn chặt chẽ thông qua việc theo dõi sức ăn trên nhá kết hợp chài mẫu kiểm tra trọng lượng bình quân (MBW). Tránh tối đa hiện tượng cho ăn dư thừa—nguyên nhân số một tạo môi trường cho bệnh phân trắng phát tác (tham khảo chi tiết kỹ thuật tại [Hướng dẫn kiểm tra nhá và sức ăn của tôm](/vi/resources/feed-tray-observations) và [Khắc phục tôm chậm lớn và suy giảm ADG](/vi/resources/slow-shrimp-growth-adg-troubleshooting)).",
      ],
    },
  ],
  checklist: [
    "Quan sát sợi phân trắng nổi góc cuối gió và bám dính trên nhá ăn vào mỗi ca kiểm tra buổi sáng.",
    "Theo dõi độ đầy đường ruột, phân tôm chìm hay nổi, độ teo của gan tụy và tỷ lệ tôm mềm vỏ khi kiểm tra nhá.",
    "Kiểm tra định kỳ DO rạng sáng, độ kiềm, pH sáng chiều, amonia TAN, nitrit NO₂⁻ và đếm khuẩn Vibrio trên đĩa thạch TCBS.",
    "Cắt giảm ngay 30–50% lượng thức ăn khi phát hiện tôm ăn chậm hoặc xuất hiện phân trắng rải rác.",
    "Tăng cường tối đa quạt nước và sục khí đáy để giữ DO > 5,0 mg/L liên tục trong giai đoạn xử lý ao.",
    "Xi-phông đáy ao cẩn thận để loại bỏ phân trắng và bùn cặn, cô lập tuyệt đối thiết bị dụng cụ giữa các ao.",
    "Bổ sung axit hữu cơ, thảo dược bổ gan và men vi sinh Bacillus vào thức ăn theo hướng dẫn của chuyên gia.",
  ],
  sources: [
    {
      title: "White Feces Syndrome, A Multifactorial Syndrome of Cultured Shrimp: A Mini Review",
      publisher: "Fishes",
      url: "https://www.mdpi.com/2410-3888/7/6/339",
    },
    {
      title: "Experimental Reproduction of White Feces Syndrome in Whiteleg Shrimp, Penaeus vannamei",
      publisher: "PLOS ONE",
      url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0261289",
    },
    {
      title: "Structure and Co-Occurrence Patterns of Bacterial Communities Associated with White Faeces Disease Outbreaks in Pacific White-Leg Shrimp",
      publisher: "Scientific Reports",
      url: "https://www.nature.com/articles/s41598-020-68891-6",
    },
    {
      title: "Rationally Designed Probiotics Prevent Shrimp White Feces Syndrome via the Probiotics-Gut Microbiome-Immunity Axis",
      publisher: "npj Biofilms and Microbiomes",
      url: "https://www.nature.com/articles/s41522-024-00509-5",
    },
    {
      title: "Effects of Probiotics on Ammonia Degradation in Vitro and in Pacific White Shrimp Ponds",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/effects-of-probiotics-on-ammonia-degradation-in-vitro-and-in-pacific-white-shrimp-ponds/",
    },
    {
      title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
      publisher: "Fish and Shellfish Immunology Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
    },
  ],
};
