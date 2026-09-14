import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "ehp-shrimp-disease",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Vi bào tử trùng (EHP)",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Vi Bào Tử Trùng EHP Trong Ao Nuôi Tôm: Nguyên Nhân Khiến Tôm Chậm Lớn, Còi Cọc Và Giải Pháp Ngăn Chặn Tái Nhiễm Bền Vững",
  description:
    "Cẩm nang thực hành kiểm soát vi bào tử trùng EHP (Enterocytozoon hepatopenaei) trên tôm thẻ chân trắng: nhận diện sớm tôm phân đàn còi cọc, xét nghiệm khẳng định PCR, xử lý bào tử đáy ao bằng vôi nóng CaO (pH > 12), sự thật về việc điều trị và quy trình an toàn sinh học ngăn ngừa tái phát.",
  readTime: "9 phút đọc",
  tags: [
    "vi bào tử trùng EHP",
    "Enterocytozoon hepatopenaei",
    "tôm còi cọc chậm lớn",
    "tôm phân đàn",
    "xét nghiệm PCR tôm giống",
    "tế bào ống gan tụy tôm",
    "bào tử EHP đáy ao",
    "xử lý vôi nóng CaO",
    "cải tạo ao tôm",
    "men vi sinh Bacillus",
    "an toàn sinh học nuôi tôm",
    "hệ thống cảnh báo bệnh tôm",
  ],
  publishedAt: "2026-06-13",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/ehp-shrimp-disease-guide.png",
    alt: "Cẩm nang quản lý vi bào tử trùng EHP trong ao tôm thẻ chân trắng: tôm còi cọc chậm lớn, xét nghiệm PCR, kiểm soát và tiêu diệt bào tử đáy ao, ứng phó khẩn cấp và giải pháp an toàn sinh học dài hạn",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Hệ thống cảnh báo dịch bệnh & an toàn sinh học", href: "/vi/features/disease-alerts" },
  takeaways: [
    "EHP (Enterocytozoon hepatopenaei) là vi bào tử trùng ký sinh nội bào tấn công trực tiếp vào biểu mô ống gan tụy của tôm, làm tê liệt khả năng hấp thu dinh dưỡng, khiến tôm chậm lớn mãn tính, phân đàn nghiêm trọng, FCR tăng vọt dù không gây chết hàng loạt cấp tính.",
    "Không thể chẩn đoán chính xác EHP chỉ bằng mắt thường. Nghi ngờ ao nhiễm EHP bắt buộc phải được xét nghiệm khẳng định bằng phương pháp sinh học phân tử (PCR / qPCR) kết hợp đối soát xu hướng MBW, ADG, FCR và sức ăn trên nhá.",
    "Hiện chưa có bất kỳ loại thuốc hay kháng sinh nào có thể tiêu diệt hoặc chữa khỏi hoàn toàn bào tử EHP trong cơ thể tôm sống. Kiểm soát EHP phụ thuộc 100% vào phòng bệnh: giống sạch bệnh PCR (SPF), kích nổ và triệt tiêu bào tử đáy ao bằng vôi nóng CaO (pH > 12) và an toàn sinh học khép kín.",
  ],
  faqs: [
    {
      question: "Vi bào tử trùng EHP là gì và gây thiệt hại kinh tế như thế nào cho trang trại nuôi tôm?",
      answer:
        "EHP (Enterocytozoon hepatopenaei) là vi bào tử trùng nội bào có kích thước siêu nhỏ, tạo bào tử đề kháng cao, ký sinh và nhân lên bên trong tế bào biểu mô ống gan tụy tôm thẻ chân trắng—cơ quan trung tâm đảm nhiệm chức năng tiết enzyme tiêu hóa, hấp thu dưỡng chất và tích lũy năng lượng. Khi các ống gan tụy bị phá hủy, tôm dù ăn khỏe vẫn không hấp thu được thức ăn, dẫn đến tôm còi cọc (Stunting), phân đàn kích cỡ chênh lệch rất lớn trong cùng một ao, FCR tăng cao và thường mở đường cho vi khuẩn Vibrio đồng nhiễm gây bệnh phân trắng (WFD). Dù không gây chết tôm ồ ạt như đốm trắng WSSV hay hoại tử gan tụy AHPND, EHP làm mất trắng lợi nhuận do tôm nuôi mãi không lớn và tiêu tốn lượng thức ăn khổng lồ.",
    },
    {
      question: "Tại sao tuyệt đối không được dùng kháng sinh để trị bệnh EHP trên tôm?",
      answer:
        "Bởi vì EHP là sinh vật nhân thực thuộc nhóm vi bào tử trùng (Microsporidia), có quan hệ gần với nấm, hoàn toàn không phải là vi khuẩn. Kháng sinh chỉ có tác dụng ức chế hoặc tiêu diệt vi khuẩn, không có bất kỳ cơ chế sinh học nào tác động được lên vi bào tử trùng EHP. Việc trộn kháng sinh cho tôm ăn không những không trị được EHP mà còn phá hủy hệ vi sinh có lợi đường ruột, làm suy gan tụy nhanh hơn, gây nguy cơ vi khuẩn lờn thuốc (AMR) và để lại tồn dư kháng sinh khiến tôm bị cấm xuất khẩu và thương lái ép giá thu mua.",
    },
    {
      question: "Quy trình tiêu diệt bào tử EHP đáy ao khi cải tạo ao nuôi hiệu quả nhất?",
      answer:
        "Bào tử EHP có lớp vỏ dày cấu tạo bằng chitin chịu đựng cực tốt trước hóa chất sát trùng thông thường. Quy trình khoa học triệt tiêu bào tử gồm 4 bước: 1) Nạo vét sạch bùn đen và chất thải hữu cơ đáy ao đưa vào khu xử lý riêng biệt; 2) Bón vôi nóng (Quicklime - CaO) với liều lượng 500–1.000 kg/1.000 m² rải đều trên nền đáy ao còn ẩm hoặc pha nước vôi đặc quét phủ mặt bạt HDPE để nâng pH đất/bề mặt lên trên 12 kéo dài liên tục ít nhất 3–5 ngày. Môi trường kiềm cực cao (pH > 12) sẽ kích nổ ống cực (Polar tube extrusion) của bào tử ra ngoài môi trường rỗng, làm bào tử tự tiêu hủy vĩnh viễn; 3) Phơi ao khô nỏ dưới nắng to từ 10–14 ngày; 4) Khử trùng nước ao lắng bằng chlorine 20–30 ppm trước khi cấp vào ao nuôi.",
    },
    {
      question: "Khi nào người nuôi nên nghi ngờ ao tôm bị nhiễm EHP thay vì vấn đề môi trường thông thường?",
      answer:
        "Cần nghi ngờ ngay EHP khi: các chỉ số chất lượng nước trong ao (DO, pH, độ mặn, nhiệt độ) hoàn toàn ổn định, tôm ăn hết sạch thức ăn trên nhá theo định mức nhưng tốc độ tăng trưởng bình quân ngày (ADG) bị chững lại nghiêm trọng (dưới 0,10–0,15 g/ngày sau ngày nuôi DOC 35–40 trở đi), đồng thời xuất hiện sự phân đàn kích cỡ rất lớn (khi chài mẫu thấy tôm 5–6 gam lẫn lộn với tôm 11–12 gam). Nếu hiện tượng này kéo dài qua 2–3 đợt thu mẫu liên tiếp, phải gửi mẫu tôm sống đi xét nghiệm PCR ngay lập tức.",
    },
  ],
  sections: [
    {
      heading: "Bản chất vi bào tử trùng EHP: Kẻ phá hoại thầm lặng gan tụy tôm",
      body: [
        "EHP (Enterocytozoon hepatopenaei) được phát hiện lần đầu trên tôm sú (Penaeus monodon) tại Thái Lan năm 2009 và sau đó lây lan mạnh trên tôm thẻ chân trắng (Litopenaeus vannamei) tại khắp các vùng nuôi tôm châu Á. Khác với các mầm bệnh virus cấp tính gây chết hàng loạt, EHP là 'kẻ đánh cắp lợi nhuận thầm lặng'.",
        "Bào tử EHP xâm nhập vào tế bào biểu mô ống gan tụy, sinh sản nhân lên và làm phá hủy cấu trúc tế bào, khiến gan tụy teo nhỏ và mất chức năng tiêu hóa. Tôm bị nhiễm EHP có thể ăn liên tục nhưng lượng thức ăn không được chuyển hóa thành cơ thịt, dẫn đến hiện tượng tôm chậm lớn còi cọc kéo dài.",
        "Thiệt hại nặng nề nhất nằm ở chi phí thức ăn chìm và thời gian nuôi kéo dài mà không tăng size tôm. Khi chi phí thức ăn chiếm 50–60% giá thành nuôi, việc tôm dừng lớn ở size 80–100 con/kg sẽ đẩy giá thành sản xuất lên cao hơn giá bán, dẫn đến thua lỗ nặng nề.",
      ],
    },
    {
      heading: "Dấu hiệu lâm sàng và chỉ báo nhận diện EHP tại đầm nuôi",
      body: [
        "Chỉ báo đặc trưng nhất của ao nhiễm EHP là đồ thị tăng trưởng ngày (ADG) bị bẻ ngang sau 35–45 ngày nuôi. Trọng lượng thân bình quân (MBW) tăng rất chậm dù lượng cám cấp vào ao vẫn tăng theo ngày tuổi.",
        "Khi chài mẫu kiểm tra, người nuôi sẽ ghi nhận sự phân đàn cực kỳ nghiêm trọng: trong cùng một mẻ chài xuất hiện tôm chênh lệch nhau gấp đôi về trọng lượng. Một số con tôm có vỏ mềm nhão, cơ lưng đục hoặc xuất hiện các đoạn ruột trắng rải rác do đồng nhiễm khuẩn Vibrio.",
        "Tổ chức Thú y Thế giới (WOAH) khuyến cáo rằng EHP không biểu hiện triệu chứng đặc hiệu ngoài da rõ rệt, do đó không thể kết luận chỉ dựa vào quan sát bề ngoài. Cần đối chiếu dữ liệu MBW, ADG và hệ số FCR trên [phần mềm quản lý trang trại nuôi tôm](/vi/shrimp-farm-management-software) kết hợp với xét nghiệm phòng lab để có kết luận chính xác.",
      ],
      items: [
        "Tôm chững lớn (Stunting): ADG tụt dốc dưới 0,10 g/ngày sau DOC 40 dù tôm vẫn bắt mồi bình thường.",
        "Phân đàn kích cỡ gay gắt (Severe size disparity): Chênh lệch size tôm trong cùng ao vượt quá 30–40%.",
        "Hệ số FCR tăng vọt bất thường: Lượng thức ăn tiêu thụ lớn nhưng không tạo ra sinh khối tôm tăng trưởng.",
        "Tế bào ống gan tụy teo tóp: Soi tươi dưới kính hiển vi thấy ống gan tụy rỗng giọt dầu (Lipid droplets) và xuất hiện nhiều thể bào tử.",
        "Xuất hiện phân trắng nổi mặt ao: Thường xuyên xảy ra khi EHP kết hợp với vi khuẩn Vibrio gây tổn thương hoại tử biểu mô ruột.",
      ],
    },
    {
      heading: "Phương thức lây truyền và vòng đời của bào tử EHP trong ao nuôi",
      body: [
        "Bào tử EHP lây lan chủ yếu theo chiều ngang (Horizontal transmission) qua đường tiêu hóa. Tôm khỏe ăn phải phân tôm chứa bào tử hoặc ăn thịt đồng loại bị nhiễm bệnh chết chìm dưới đáy ao sẽ bị lây nhiễm trực tiếp.",
        "Bên cạnh đó, bào tử EHP có thể tồn tại dai dẳng trong lớp bùn đáy ao từ vụ nuôi trước nếu quy trình cải tạo ao không triệt để. Nguồn nước cấp từ kênh rạch tự nhiên có chứa sinh vật mang mầm bệnh (cua, còng, nhuyễn thể hai mảnh vỏ, tôm tạp) cũng là nguồn lây nhiễm đáng kể.",
        "Tại các trại giống (Hatchery), nguồn thức ăn tươi sống như giun nhiều tơ (Polychaetes/rươi) cho tôm bố mẹ ăn nếu không được chiếu xạ gamma hoặc xử lý đông lạnh sâu cũng là ổ chứa truyền EHP sang ấu trùng tôm giống.",
      ],
      table: {
        columns: ["Con đường lây truyền", "Cơ chế xâm nhập", "Mức độ rủi ro", "Giải pháp kiểm soát bắt buộc"],
        rows: [
          [
            "Tôm giống Post-larvae (PL)",
            "Lây truyền dọc hoặc ngang từ tôm bố mẹ và môi trường trại giống",
            "Cực kỳ nguy hiểm / Rất cao",
            "Bắt buộc xét nghiệm PCR (nested PCR hoặc Real-time qPCR) âm tính trước khi xuất bán và thả ao.",
          ],
          [
            "Tập tính ăn thịt đồng loại (Cannibalism)",
            "Tôm khỏe ăn xác tôm bệnh chết dưới đáy ao",
            "Rất cao trong ao nuôi",
            "Xi-phông đáy ao thường xuyên, nhặt sạch xác tôm, duy trì DO > 5 mg/L và không để tôm thiếu ăn.",
          ],
          [
            "Phân tôm và bùn đáy ao nhiễm bệnh",
            "Bào tử đào thải qua phân tích tụ dày đặc trong lớp bùn đen đáy ao",
            "Cao",
            "Nạo vét sạch bùn đáy, bón vôi nóng CaO (pH > 12) kích nổ bào tử và phơi khô đáy ao triệt để.",
          ],
          [
            "Dụng cụ dùng chung giữa các ao",
            "Bào tử bám dính vào chài lưới, nhá ăn, vợt vớt, dây xi-phông, ủng bảo hộ",
            "Cao",
            "Quy định dụng cụ riêng biệt từng ao, sát trùng bằng dung dịch chlorine hoặc thuốc tím sau mỗi ca làm việc.",
          ],
          [
            "Thức ăn tươi sống cho tôm bố mẹ",
            "Tôm bố mẹ ăn rươi tươi, giun biển hoặc sò huyết chứa bào tử EHP",
            "Rất cao tại trại giống",
            "Sử dụng thức ăn tươi đã tiệt trùng bằng chiếu xạ gamma hoặc đông lạnh sâu -20°C tối thiểu 48 giờ.",
          ],
        ],
      },
    },
    {
      heading: "Phương pháp xét nghiệm chẩn đoán xác định EHP",
      body: [
        "Để khẳng định chắc chắn sự hiện diện của EHP, phương pháp xét nghiệm sinh học phân tử Polymerase Chain Reaction (PCR) là tiêu chuẩn vàng. Trong đó, kỹ thuật Nested-PCR (PCR lồng) và Real-time qPCR (sử dụng mẫu dò TaqMan) cho độ nhạy và độ đặc hiệu cao nhất, có thể phát hiện lượng bào tử rất nhỏ ngay từ giai đoạn ấu trùng PL10–PL12.",
        "Kỹ thuật soi tươi mô gan tụy dưới kính hiển vi quang học độ phóng đại 1.000x (nhuộm Giemsa hoặc Phloxine B) có thể phát hiện các thể bào tử hình bầu dục kích thước khoảng 1,1 x 1,8 µm. Tuy nhiên, phương pháp này đòi hỏi kỹ thuật viên có kinh nghiệm chuyên sâu và khó phát hiện khi mật độ bào tử còn thấp.",
        "Ngay khi phát hiện tôm có biểu hiện chững lớn bất thường, người nuôi nên thu thập 15–20 mẫu tôm sống còn hoạt động cho vào cồn 95% hoặc bảo quản lạnh chuyển ngay đến các phòng xét nghiệm thú y thủy sản đạt chuẩn ISO để có kết quả chính xác trong 24 giờ.",
      ],
    },
    {
      heading: "Sự thật về việc điều trị EHP: Không có thuốc đặc trị trong ao nuôi",
      body: [
        "Người nuôi cần hết sức cảnh giác trước những lời quảng cáo về các loại thuốc 'trị dứt điểm EHP' hay 'tiêu diệt bào tử trong gan tôm'. Đến nay, giới khoa học thủy sản quốc tế chưa công nhận bất kỳ loại thuốc hóa học hay kháng sinh nào có khả năng tiêu diệt hoàn toàn bào tử EHP trong tế bào gan tụy tôm nuôi thương phẩm mà không làm chết tôm hoặc để lại dư lượng độc hại.",
        "Các sản phẩm bổ sung dinh dưỡng, thảo dược bảo vệ gan (như cao diệp hạ châu, silymarin, chiết xuất tỏi) và men vi sinh probiotic có tác dụng nâng đỡ sức đề kháng, hỗ trợ tế bào gan tụy phục hồi và cải thiện khả năng tiêu hóa, giúp tôm duy trì tốc độ lớn tốt hơn, nhưng không thể 'quét sạch' bào tử EHP ra khỏi cơ thể.",
        "Do đó, đầu tư tiền bạc vào các loại thuốc trôi nổi đắt tiền không giải quyết được gốc rễ vấn đề mà chỉ làm tăng thêm chi phí sản xuất. Chiến lược đúng đắn duy nhất là tập trung toàn lực vào phòng ngừa và kiểm soát môi trường (tham khảo thêm tại [Cảnh báo dịch bệnh và an toàn sinh học ao tôm](/vi/resources/shrimp-disease-alerts)).",
      ],
      note: "Cảnh báo an toàn thực phẩm: Tuyệt đối không tự ý trộn các hóa chất diệt nấm, thuốc trừ sâu hoặc kháng sinh cấm vào thức ăn để diệt EHP. Đây là hành vi vi phạm pháp luật nghiêm trọng, gây ngộ độc tôm và dẫn đến việc cả lô tôm bị tiêu hủy khi kiểm tra an toàn vệ sinh thực phẩm.",
    },
    {
      heading: "Quy trình cải tạo ao triệt để tiêu diệt bào tử EHP bằng vôi nóng CaO",
      body: [
        "Bào tử EHP được bảo vệ bởi lớp vỏ chitin vô cùng bền vững, có thể tồn tại qua nhiều tháng trong điều kiện khô hạn hoặc ngâm nước thông thường. Cơ chế tiêu diệt duy nhất đã được khoa học chứng minh là 'kích nổ sớm ống cực' (Polar tube extrusion) bằng độ kiềm cực cao.",
        "Khi tiếp xúc với môi trường có pH > 12, bào tử EHP bị kích thích phóng sợi ống cực ra ngoài. Một khi đã phóng ống cực ra môi trường rỗng mà không gặp tế bào vật chủ, bào tử sẽ cạn kiệt năng lượng và tự chết trong vòng vài giờ.",
        "Quy trình xử lý đáy ao đạt chuẩn:",
      ],
      items: [
        "Nạo vét sạch hoàn toàn lớp bùn đen hữu cơ đáy ao sau khi thu hoạch vụ trước, tập kết bùn vào khu vực cách ly.",
        "Bón vôi nóng (Quicklime - CaO) với liều lượng 500–1.000 kg/1.000 m² khi đáy ao còn ẩm. Đối với ao bạt HDPE, pha nước vôi đặc quét phủ đều toàn bộ mặt bạt và các góc chết.",
        "Đo đạc kiểm tra độ pH bề mặt đáy ao, đảm bảo pH duy trì liên tục trên 12 trong suốt 3–5 ngày để kích nổ toàn bộ bào tử EHP tồn đọng.",
        "Phơi ao khô nỏ dưới ánh nắng mặt trời trực tiếp trong 10–14 ngày cho đến khi nền đáy khô nứt nẻ hoàn toàn.",
        "Khử trùng nguồn nước ao lắng bằng chlorine 25–30 ppm hoặc thuốc tím 3–5 ppm, lọc qua túi lọc vải dày nhiều lớp trước khi cấp vào ao nuôi thương phẩm.",
      ],
    },
    {
      heading: "Kiểm soát rủi ro EHP toàn diện với nền tảng dữ liệu Shrimply",
      body: [
        "Khả năng phát hiện sớm EHP sẽ tăng lên gấp nhiều lần khi người quản lý kết nối toàn bộ dữ liệu ao nuôi trên nền tảng kỹ thuật số: từ nhật ký thả giống, nguồn gốc trại giống, chỉ số môi trường nước hàng ngày đến kết quả chài mẫu đo MBW và ADG định kỳ.",
        "Khi kỹ thuật viên nhập số liệu thu mẫu định kỳ, hệ thống Shrimply sẽ tự động tính toán ADG thực tế và đối chiếu với đường cong tăng trưởng chuẩn của tôm thẻ. Nếu nhận thấy tốc độ tăng trưởng sụt giảm bất thường đi kèm với hệ số phân đàn vượt ngưỡng an toàn, hệ thống sẽ kích hoạt cảnh báo nguy cơ EHP để quản lý can thiệp kịp thời (xem thêm tại [Biểu đồ tăng trưởng tôm thẻ chân trắng](/vi/resources/vannamei-growth-chart) và [Quản lý hệ số FCR nuôi tôm](/vi/resources/fcr-shrimp-farming)).",
      ],
    },
  ],
  checklist: [
    "Xét nghiệm kiểm tra PCR tôm giống PL10–PL12 âm tính với EHP trước khi thả nuôi.",
    "Lưu trữ hồ sơ xuất xứ nguồn giống, mã lô sản xuất và kết quả kiểm dịch giống vào nhật ký số.",
    "Theo dõi chặt chẽ chỉ số ADG, độ phân đàn kích cỡ và hệ số FCR trong các lần thu mẫu định kỳ.",
    "Gửi mẫu tôm sống xét nghiệm PCR ngay khi nhận thấy tôm chững lớn kéo dài sau DOC 35.",
    "Không dùng chung bất kỳ dụng cụ nào giữa ao nghi nhiễm EHP với các ao nuôi khác trong trại.",
    "Bón vôi nóng CaO nâng pH đáy ao > 12 kéo dài 3–5 ngày để kích nổ và triệt tiêu bào tử khi cải tạo ao.",
    "Bổ sung men vi sinh Bacillus và thảo dược bảo vệ gan định kỳ để nâng đỡ sức khỏe tiêu hóa cho tôm.",
  ],
  sources: [
    {
      title: "Infection with Enterocytozoon hepatopenaei (EHP)",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/app/uploads/2022/11/a-woah-ehp-disease-card-sept-2022.pdf",
    },
    {
      title: "Urgent Appeal to Control Spread of the Shrimp Microsporidian Parasite Enterocytozoon hepatopenaei",
      publisher: "Network of Aquaculture Centres in Asia-Pacific",
      url: "https://enaca.org/?id=101",
    },
    {
      title: "Enterocytozoon hepatopenaei Infection in Shrimp: Diagnosis, Interventions, and Food Safety Guidelines",
      publisher: "Microorganisms",
      url: "https://www.mdpi.com/2076-2607/12/1/21",
    },
    {
      title: "Quantification of Enterocytozoon hepatopenaei (EHP) in Penaeid Shrimps Using TaqMan Probe-Based Quantitative PCR",
      publisher: "Pathogens",
      url: "https://www.mdpi.com/2076-0817/8/4/233",
    },
    {
      title: "The Emerging Pathogen Enterocytozoon hepatopenaei Drives a Degenerative Cyclic Pattern in the Hepatopancreas Microbiome",
      publisher: "Scientific Reports",
      url: "https://www.nature.com/articles/s41598-022-19127-2",
    },
    {
      title: "Robins McIntosh on Everything You Need to Know About EHP and Shrimp Farming, Part 2",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/robins-mcintosh-on-everything-you-need-to-know-about-ehp-and-shrimp-farming-part-2/",
    },
    {
      title: "The Role of Probiotics in Vannamei Shrimp Aquaculture Performance",
      publisher: "Fish and Shellfish Immunology Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10082739/",
    },
  ],
};
