import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "white-spot-syndrome-virus-shrimp",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Virus đốm trắng (WSSV)",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Virus Hội Chứng Đốm Trắng (WSSV) Trên Tôm: Cẩm Nang Ứng Phó Khẩn Cấp Và Quy Trình An Toàn Sinh Học Ngăn Ngừa Lây Lan",
  description:
    "Cẩm nang hướng dẫn thực tế đối phó với virus hội chứng đốm trắng (White Spot Syndrome Virus: WSSV) trên tôm thẻ chân trắng: nhận diện sớm triệu chứng lâm sàng, rủi ro tôm chết cấp tính 80–100%, yếu tố nhiệt độ môi trường kích hoạt, xét nghiệm PCR, cô lập ao khẩn cấp và thiết lập rào cản an toàn sinh học.",
  readTime: "9 phút đọc",
  tags: [
    "WSSV",
    "virus đốm trắng",
    "hội chứng đốm trắng",
    "white spot syndrome virus",
    "bệnh đốm trắng trên tôm",
    "bệnh tôm thẻ chân trắng",
    "xét nghiệm PCR tôm",
    "tôm chết cấp tính",
    "an toàn sinh học trang trại tôm",
    "cách ly ao nuôi",
    "cô lập nguồn nước",
    "thu hoạch chạy dịch",
  ],
  publishedAt: "2026-06-13",
  updatedAt: "2026-07-09",
  image: {
    src: "/resources/images/white-spot-syndrome-virus-wssv-shrimp-guide.png",
    alt: "Infographic cẩm nang ứng phó virus đốm trắng WSSV trên tôm thẻ chân trắng: phát hiện sớm, xét nghiệm PCR, cách ly ao, giám sát nhiệt độ nước kích hoạt và quy trình an toàn sinh học",
    width: 1671,
    height: 941,
  },
  relatedFeature: { label: "Hệ thống cảnh báo dịch bệnh & an toàn sinh học", href: "/vi/features/disease-alerts" },
  takeaways: [
    "WSSV là một trong những loại virus nguy hiểm và lây lan nhanh nhất trong ngành nuôi tôm, có thể gây tỷ lệ chết cấp tính từ 80% đến 100% chỉ trong vòng 3–10 ngày nếu phản ứng bờ ao bị chậm trễ.",
    "Mặc dù các đốm trắng dưới giáp đầu ngực là dấu hiệu điển hình, người nuôi tuyệt đối không được chờ đến khi đốm trắng xuất hiện rõ mới hành động. Tôm bỏ ăn đột ngột trên nhá, bơi lờ đờ tấp mé, tỷ lệ chết tăng vọt và xét nghiệm PCR là những chỉ báo quyết định.",
    "Không có bất kỳ loại hóa chất, kháng sinh hay phương thuốc nào có thể chữa khỏi virus WSSV trong ao nuôi. Biện pháp duy nhất là cô lập tức thì ao bệnh và nguồn nước, ngưng cho ăn, xét nghiệm PCR khẩn cấp, đánh giá thu hoạch chạy dịch hoặc xử lý chlorine triệt để trước khi lây lan toàn trại.",
  ],
  faqs: [
    {
      question: "Dấu hiệu cảnh báo lâm sàng sớm nhất của tôm thẻ chân trắng khi nhiễm virus đốm trắng (WSSV) là gì?",
      answer:
        "Dấu hiệu đầu tiên là lượng thức ăn trên nhá giảm đột ngột từ 30% đến trên 50% chỉ trong vòng 24–48 giờ dù thời tiết không đổi. Tôm trở nên lờ đờ, bơi nổi đầu không định hướng ven mé ao hoặc tấp vào bờ vào ban ngày. Thân tôm chuyển sang màu đỏ hồng hoặc đỏ tía (Reddish discoloration), vỏ tôm mềm nhão và dễ tách rời khỏi cơ thịt (Loose shell), gan tụy teo nhạt màu. Các đốm trắng tròn đường kính 0,5–2,0 mm bên trong giáp đầu ngực và đốt thân thường xuất hiện ở giai đoạn muộn hoặc có thể không rõ nét trên tôm thẻ chân trắng. Do đó, người nuôi tuyệt đối không được chờ nhìn thấy đốm trắng mới bắt đầu cô lập ao.",
    },
    {
      question: "Yếu tố môi trường nước và thời tiết nào kích hoạt virus WSSV bùng phát dữ dội?",
      answer:
        "Sự sụt giảm nhiệt độ nước ao nuôi xuống dưới 27°C (đặc biệt là ngưỡng nhiệt độ 22–26°C do mưa kéo dài, bão hoặc các đợt không khí lạnh) là yếu tố kích hoạt số một đẩy nhanh quá trình nhân đôi của virus WSSV và làm tê liệt hệ miễn dịch của tôm. Các yếu tố thúc đẩy khác gồm: độ mặn sụt giảm đột ngột sau mưa lớn, pH biến động quá 0,5 đơn vị giữa sáng và chiều, oxy hòa tan DO rạng sáng tụt thấp (< 4 mg/L), đáy ao tích tụ nhiều bùn thối hữu cơ và sự xâm nhập của các vật chủ trung gian tự nhiên như cua còng, cá tạp mang mầm bệnh.",
    },
    {
      question: "Có thuốc hoặc kháng sinh nào chữa được tôm bị bệnh đốm trắng WSSV trong ao không?",
      answer:
        "Hoàn toàn không. WSSV là virus có vật chất di truyền DNA chuỗi đôi, kháng sinh hoàn toàn vô tác dụng đối với virus. Việc dùng kháng sinh chỉ gây lãng phí tiền bạc, làm tồn dư hóa chất độc hại trong tôm, phá hủy hệ sinh thái vi sinh ao nuôi và vi phạm nghiêm trọng quy định an toàn thực phẩm. Các chất bổ sung như vitamin C, beta-glucan hay thảo dược chỉ có tác dụng hỗ trợ miễn dịch cho tôm khỏe mạnh trước khi phơi nhiễm, không thể cứu chữa được đàn tôm khi virus đã xâm nhập sâu và phá hủy các cơ quan nội tạng.",
    },
    {
      question: "Quy trình ứng phó khẩn cấp đầu tiên khi nghi ngờ ao tôm bị nhiễm virus đốm trắng là gì?",
      answer:
        "Báo cáo ngay cho ban quản lý trang trại và kích hoạt tình trạng cách ly khẩn cấp (Operational quarantine): 1) Khóa chặt toàn bộ cống cấp và cống thoát nước của ao bệnh, tuyệt đối không xả nước ra kênh chung để tránh phát tán mầm bệnh; 2) Căng dây xua đuổi hoặc giăng lưới chắn chim để ngăn chim nước ăn tôm bệnh rồi gắp sang ao khác; 3) Cấm tuyệt đối di chuyển dụng cụ (nhá ăn, vợt, chài, xô chậu) và nhân công từ ao nghi nhiễm sang ao khác; 4) Lấy mẫu tôm sống có triệu chứng gửi phòng xét nghiệm PCR khẩn cấp; 5) Ngưng ngay việc cho ăn để tránh ô nhiễm đáy ao và đánh giá phương án thu hoạch chạy dịch nếu tôm đạt kích cỡ thương phẩm.",
    },
    {
      question: "Tiêu chí quyết định giữa việc 'Thu hoạch chạy dịch khẩn cấp' và 'Dập dịch bằng hóa chất chlorine hủy ao'?",
      answer:
        "Nếu tôm trong ao đã đạt kích cỡ thương phẩm có giá trị kinh tế (size từ 100 con/kg trở lên, hoặc MBW > 8–10 g) và tỷ lệ sống còn tương đối, người nuôi nên tổ chức thu hoạch chạy dịch ngay lập tức dưới sự giám sát an toàn sinh học gắt gao (toàn bộ nước thải sau thu hoạch phải được giữ lại trong ao và khử trùng chlorine nồng độ cao trước khi xả thải). Ngược lại, nếu tôm còn quá nhỏ (DOC ngắn ngày) hoặc tỷ lệ chết đã lan rộng không thể cứu vãn, bắt buộc phải chọn giải pháp dập dịch triệt để: sử dụng chlorine bột với liều 30–40 ppm rải đều toàn ao để tiêu diệt mầm bệnh virus và các loài vật chủ trung gian, sau đó ngâm nước đến khi hết dư lượng chlorine rồi mới xả bỏ cải tạo ao.",
    },
  ],
  sections: [
    {
      heading: "Đặc tính sinh học của virus đốm trắng WSSV và tác động tàn phá",
      body: [
        "White Spot Syndrome Virus (WSSV) là virus thuộc họ Nimaviridae, có kích thước lớn, chứa DNA chuỗi đôi (dsDNA), có độc lực cực kỳ khủng khiếp trên tôm thẻ chân trắng (Litopenaeus vannamei), tôm sú (Penaeus monodon) và nhiều loài giáp xác hoang dã. Tổ chức Thú y Thế giới (WOAH) xếp WSSV vào danh sách mầm bệnh thủy sản nguy hiểm hàng đầu thế giới.",
        "Điểm khác biệt chí mạng của WSSV so với các bệnh mãn tính như vi bào tử trùng EHP là tốc độ tàn phá cấp tính: trong khi EHP gây chững lớn qua nhiều tuần thì WSSV tấn công trực tiếp vào nhân tế bào của các mô ngoại bì và trung bì (biểu mô dưới vỏ, mang, dạ dày, cơ quan tạo máu), làm tôm kiệt sức và gây chết hàng loạt 80–100% đàn tôm chỉ sau 3–10 ngày bùng phát.",
        "Virus WSSV lây truyền cực nhanh qua con đường ăn thịt đồng loại (Cannibalism) khi tôm khỏe ăn xác tôm chết trong ao, lây qua nguồn nước mang mầm bệnh và lây qua các vật chủ trung gian tự nhiên. Vì vậy, sự chậm trễ trong việc cô lập ao bệnh tính bằng giờ có thể trả giá bằng sự sụp đổ của toàn bộ trang trại.",
      ],
    },
    {
      heading: "Các giai đoạn nhiễm bệnh và dấu hiệu lâm sàng cần theo dõi tại ao",
      body: [
        "Nhận diện đúng giai đoạn nhiễm WSSV giúp kỹ sư bờ ao đưa ra quyết định thu hoạch hay dập dịch kịp thời. Dưới đây là diễn biến 3 giai đoạn lâm sàng điển hình:",
      ],
      table: {
        columns: ["Giai đoạn lây nhiễm WSSV", "Triệu chứng lâm sàng & Hành vi tôm", "Mức độ ăn & Tỷ lệ chết", "Hành động kỹ thuật bắt buộc tại ao"],
        rows: [
          [
            "Giai đoạn ủ bệnh / Tiền lâm sàng (DOC bất kỳ)",
            "Lượng thức ăn trên nhá giảm 30–50%, tôm phản xạ chậm chạp hơn khi kiểm tra nhá, bơi lờ đờ nhẹ.",
            "Thức ăn bắt đầu thừa trong nhá, chưa phát hiện tôm chết rõ rệt hoặc chỉ có 1–2 con ở rốn xả đáy.",
            "Ngưng tăng thức ăn, kiểm tra độ ổn định nhiệt độ và DO, khóa cống nước, lấy mẫu tôm sống gửi xét nghiệm PCR khẩn cấp.",
          ],
          [
            "Giai đoạn cấp tính (Bùng phát triệu chứng)",
            "Tôm bơi lờ đờ ven bờ, tấp mé mặt nước ban ngày, thân đỏ tía hoặc hồng nhạt, vỏ mềm xốp bong cơ thịt.",
            "Tôm giảm ăn > 80% hoặc bỏ ăn hoàn toàn, tỷ lệ tôm chết tăng vọt theo cấp số nhân mỗi ngày.",
            "Cách ly ao tuyệt đối, giăng dây chống chim, khử trùng dụng cụ, đo đạc kích cỡ tôm để chuẩn bị phương án thu hoạch khẩn cấp.",
          ],
          [
            "Giai đoạn nguy cấp (Chết hàng loạt)",
            "Đốm trắng 0,5–2 mm xuất hiện dưới giáp đầu ngực, xác tôm chết chìm la liệt đáy ao, tôm khỏe ăn thịt tôm chết dữ dội.",
            "Tỷ lệ chết đạt 80–100% trong vòng vài ngày, nước ao chứa mật độ hạt virus cực kỳ đậm đặc.",
            "Thu hoạch khẩn cấp ngay nếu tôm đạt kích cỡ thương phẩm; nếu tôm nhỏ, đánh chlorine 30–40 ppm dập dịch triệt để, cấm xả nước ra ngoài.",
          ],
        ],
      },
    },
    {
      heading: "Yếu tố nhiệt độ và môi trường nước kích hoạt dịch bệnh bùng phát",
      body: [
        "Môi trường nước ao nuôi là đòn bẩy quyết định việc tôm mang virus ở trạng thái ẩn (Latent infection) bùng phát thành đợt dịch lâm sàng chết hàng loạt. Nghiên cứu thực nghiệm chứng minh rằng nhiệt độ nước dưới 27°C (đặc biệt là 22–26°C) là tác nhân kích hoạt mạnh nhất, thúc đẩy virus nhân lên với tốc độ cực nhanh trong khi làm suy giảm số lượng tế bào máu (Hemocytes) bảo vệ của tôm.",
        "Điều này lý giải vì sao các đợt dịch đốm trắng thường xuyên bùng phát sau những trận mưa dầm kéo dài, bão lũ làm nước ao lạnh đi nhanh chóng hoặc vào các tháng mùa đông tại miền Bắc và miền Trung Việt Nam. Sự sụt giảm độ mặn đột ngột sau mưa, pH dao động mạnh (> 0,5 đơn vị) và oxy hòa tan DO rạng sáng tụt thấp (< 4 mg/L) càng đẩy tôm vào tình trạng stress cùng cực.",
        "Người nuôi cần liên tục theo dõi [chỉ số chất lượng nước ao nuôi tôm thẻ](/vi/resources/vannamei-water-quality-parameters). Khi dự báo có đợt không khí lạnh hoặc mưa bão, phải chủ động nâng mực nước ao lên trên 1,3–1,5 m để giữ ấm đáy ao, chạy quạt nước giữ oxy cao và tuyệt đối không tăng lượng thức ăn.",
      ],
      note: "Cảnh báo nhiệt độ thấp: Khi nhiệt độ nước ao tụt xuống dưới 27°C, virus WSSV nhân bản nhanh chóng trong khi hệ miễn dịch của tôm bị ức chế. Trong giai đoạn thời tiết chuyển lạnh hoặc mưa lớn, kỹ thuật viên phải tăng tần suất kiểm tra nhá ăn và theo dõi sát sao biểu hiện sức ăn của đàn tôm.",
    },
    {
      heading: "Quy trình lấy mẫu xét nghiệm PCR chẩn đoán xác định mầm bệnh",
      body: [
        "Để có cơ sở pháp lý và kỹ thuật đưa ra các quyết định hệ trọng (như tiêu hủy ao hay thu hoạch sớm), xét nghiệm sinh học phân tử PCR là công cụ duy nhất đáng tin cậy. Kỹ thuật Nested PCR hoặc Real-time qPCR cho phép phát hiện các đoạn gen đặc thù của WSSV với độ nhạy tuyệt đối.",
        "Phương pháp thu mẫu chuẩn: Chọn bắt 10–20 con tôm còn sống nhưng đang bơi lờ đờ hoặc tấp mé bờ. Tuyệt đối không lấy mẫu tôm đã chết thối rữa đáy ao vì enzyme phân hủy sẽ làm đứt gãy cấu trúc DNA của virus, dẫn đến kết quả âm tính giả. Cắt mẫu mô mang tôm, chân bơi hoặc toàn bộ ấu trùng tôm giống cho vào lọ chứa cồn 95% và gửi ngay đến phòng lab đạt chuẩn.",
        "Kết hợp kết quả PCR với dữ liệu theo dõi [tỷ lệ hao hụt hàng ngày](/vi/resources/shrimp-mortality-tracking) và sức ăn trên nhá để ban quản lý trang trại có bức tranh toàn cảnh chính xác nhất.",
      ],
    },
    {
      heading: "Quy trình ứng phó khẩn cấp tại bờ ao khi phát hiện WSSV",
      body: [
        "Khi nghi ngờ hoặc phát hiện ao nuôi bị đốm trắng WSSV, thời gian phản ứng tính bằng giờ sẽ quyết định sự an toàn của các ao còn lại trong trang trại. Toàn bộ nhân viên phải thực hiện nghiêm ngặt quy trình SOP khẩn cấp:",
      ],
      items: [
        "Báo động khẩn cấp và cách ly vận hành: Báo ngay cho quản lý trang trại và áp dụng chế độ cách ly hoàn toàn đối với ao nghi nhiễm. Cấm tuyệt đối di chuyển nước, bùn đáy, tôm sống, vợt, chài, xô chậu, nhá ăn, dây xi-phông và ủng bảo hộ sang ao khác.",
        "Cô lập tuyệt đối hệ thống nước (Strict Water Quarantine): Đóng chặt và khóa niêm phong toàn bộ van cấp và cống xả. Nghiêm cấm xả nước thải ra kênh rạch chung khi chưa được khử trùng chlorine nồng độ cao.",
        "Căng lưới chống chim và rào chắn động vật: Giăng dây cước phản quang hoặc lưới chắn chim trên mặt ao để ngăn chim bói cá, mòng biển sà xuống bắt tôm bệnh rồi làm rơi sang các ao nuôi khác.",
        "Ngưng cho ăn ngay lập tức: Cắt giảm hoàn toàn hoặc ngưng cấp cám 100% để tránh tích tụ chất hữu cơ thối rữa đáy ao làm vi khuẩn bùng phát.",
        "Đánh giá thu hoạch chạy dịch hoặc xử lý tiêu hủy: Nếu tôm đạt kích cỡ thương phẩm có thể bán được, tổ chức kéo lưới thu hoạch nhanh gọn trong ngày dưới sự kiểm soát an toàn sinh học. Toàn bộ nước sau thu hoạch phải đánh chlorine 30–50 ppm ngâm tối thiểu 7 ngày trước khi xả bỏ.",
        "Ghi chép nhật ký dịch tễ đầy đủ: Lưu lại thời điểm bùng phát, diễn biến nhiệt độ, nguồn giống và các ao có nguy cơ phơi nhiễm vào hệ thống để truy xuất nguyên nhân.",
      ],
    },
    {
      heading: "Chiến lược an toàn sinh học đa lớp ngăn ngừa WSSV bền vững",
      body: [
        "Phòng chống virus WSSV đòi hỏi giải pháp an toàn sinh học khép kín ngay từ trước khi thả giống:",
      ],
      items: [
        "Thả giống SPF sạch bệnh: Chỉ sử dụng tôm giống Post-larvae (PL) từ đàn tôm bố mẹ sạch bệnh đặc thù (Specific Pathogen Free - SPF), có chứng nhận xét nghiệm PCR âm tính với WSSV.",
        "Lọc và xử lý nước cấp qua hệ thống ao lắng: Nước biển hoặc nước mặn lấy vào trang trại phải đi qua hệ thống túi lọc vải mịn (200–300 micron) để loại bỏ ấu trùng giáp xác hoang dã. Khử trùng nước trong ao lắng bằng chlorine bột 25–30 ppm hoặc thuốc tím trước khi cấp vào ao nuôi.",
        "Hệ thống rào chắn cua còng và lưới chắn chim: Lắp đặt màng bạt nhựa trơn cao tối thiểu 50 cm xung quanh bờ ao để ngăn chặn cua còng tự nhiên bò vào ao, đồng thời giăng lưới chắn chim trên toàn bộ diện tích nuôi.",
        "Quản lý dụng cụ và hố sát trùng riêng biệt: Mỗi ao phải có một bộ dụng cụ kiểm tra riêng biệt sơn màu phân biệt. Bố trí hố ngâm ủng chứa dung dịch chlorine tại cửa ra vào của từng ao nuôi.",
        "Cải tạo đáy ao và ngắt vụ cách ly: Giữa hai vụ nuôi bắt buộc phải có thời gian ngắt vụ cách ly (Crop holiday). Nạo vét bùn đen, phơi khô đáy ao, bón vôi nóng CaO để nâng pH đáy tiêu diệt toàn bộ mầm bệnh tồn lưu.",
      ],
    },
    {
      heading: "Hỗ trợ phản ứng nhanh với nền tảng Shrimply",
      body: [
        "Tốc độ phản ứng trước dịch bệnh quyết định sự sống còn của doanh nghiệp nuôi tôm. Nền tảng kỹ thuật số Shrimply kết nối dữ liệu môi trường từ [hệ thống giám sát chất lượng nước](/vi/features/water-quality-monitoring) với nhật ký sức ăn và tỷ lệ hao hụt hàng ngày.",
        "Khi phát hiện nhiệt độ nước tụt nhanh kết hợp tôm giảm ăn trên nhá, trợ lý ảo Orson AI và phân hệ [cảnh báo dịch bệnh](/vi/features/disease-alerts) sẽ gửi thông báo khẩn cấp đến điện thoại của người quản lý, kích hoạt các bước kiểm tra an toàn sinh học trước khi dịch bệnh lây lan rộng khắp trang trại.",
      ],
    },
  ],
  checklist: [
    "Theo dõi sát sao sức ăn trên nhá, phản xạ bơi lội ven bờ, màu sắc thân tôm và tỷ lệ hao hụt hàng ngày.",
    "Không chờ đến khi nhìn thấy đốm trắng trên giáp đầu ngực mới tiến hành các biện pháp cách ly ao nuôi.",
    "Lấy mẫu tôm sống có dấu hiệu lờ đờ gửi phòng xét nghiệm PCR đạt chuẩn để xác định mầm bệnh trong 24 giờ.",
    "Phong tỏa tuyệt đối nguồn nước, bùn đáy, dụng cụ, tôm sống và ủng bảo hộ từ ao nghi nhiễm sang ao khác.",
    "Đánh giá thu hoạch khẩn cấp nếu tôm đạt kích cỡ thương phẩm, xử lý chlorine nước thải trước khi xả bỏ.",
    "Chỉ sử dụng con giống SPF có chứng nhận kiểm dịch PCR âm tính với WSSV từ trại giống uy tín.",
    "Lắp đặt hệ thống rào chắn cua còng, lưới chắn chim và túi lọc nước nhiều lớp tại ao lắng.",
    "Cập nhật tức thì các biến động chất lượng nước và tình trạng dịch bệnh lên phần mềm Shrimply để kích hoạt cảnh báo an toàn sinh học.",
  ],
  sources: [
    {
      title: "Infection with White Spot Syndrome Virus",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/fileadmin/Home/eng/Health_standards/aahm/current/2.2.08_WSSV.pdf",
    },
    {
      title: "The Way of Water: Unravelling White Spot Syndrome Virus (WSSV) Transmission Dynamics in Shrimp Aquaculture",
      publisher: "Viruses",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10534367/",
    },
    {
      title: "Biology, Host Range, Pathogenesis and Diagnosis of White Spot Syndrome Virus",
      publisher: "Indian Journal of Virology",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3550756/",
    },
    {
      title: "A Review on Molecular Detection Techniques of White Spot Syndrome Virus",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10029913/",
    },
    {
      title: "White Spot Disease",
      publisher: "Center for Food Security and Public Health",
      url: "https://www.cfsph.iastate.edu/Factsheets/pdfs/white-spot-disease.pdf",
    },
    {
      title: "Analyzing Transmission Dynamics of White Spot Syndrome Virus in Pacific White Shrimp",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/analyzing-transmission-dynamics-of-white-spot-syndrome-virus-in-pacific-white-shrimp/",
    },
    {
      title: "Reducing Disease Risks in Fish Through Better Detection, Management and Prevention",
      publisher: "WorldFish",
      url: "https://www.worldfishcenter.org/publication/reducing-disease-risks-fish-through-better-detection-management-and-prevention",
    },
  ],
};
