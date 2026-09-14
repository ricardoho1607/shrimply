import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "slow-shrimp-growth-adg-troubleshooting",
  section: "Tăng trưởng & Thu mẫu",
  label: "Xử lý chậm lớn & ADG",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Tôm Chậm Lớn & Suy Giảm ADG: Cẩm Nang Chẩn Đoán & Khắc Phục Cho Ao Tôm Thẻ Chân Trắng",
  description:
    "Tại sao tôm chậm lớn? Hướng dẫn đối chiếu trọng lượng bình quân (MBW), tốc độ tăng trọng ngày (ADG), phản xạ ăn ở nhá (vó), xu hướng chất lượng nước, tỷ lệ sống và dấu hiệu bệnh lý để tìm đúng nguyên nhân trước khi vỡ kế hoạch thu hoạch.",
  readTime: "8 phút đọc",
  tags: [
    "tôm chậm lớn",
    "xử lý tôm chậm lớn",
    "suy giảm ADG",
    "tốc độ tăng trưởng bình quân ngày",
    "trọng lượng bình quân MBW",
    "sinh khối ao tôm",
    "tỷ lệ sống của tôm",
    "tăng trưởng tôm thẻ chân trắng",
    "tôm phân đàn lệch size",
    "thu mẫu tôm",
    "kiểm tra nhá cho ăn",
    "vi bào tử trùng EHP",
  ],
  publishedAt: "2026-07-10",
  image: {
    src: "/resources/images/slow-shrimp-growth-adg-troubleshooting-vannamei.png",
    alt: "Đồ họa thông tin Shrimply hướng dẫn chẩn đoán và khắc phục tôm thẻ chân trắng chậm lớn thông qua kiểm chứng thu mẫu, xác thực sinh khối và tỷ lệ sống, phản xạ kiểm tra nhá, xu hướng chất lượng nước và đánh giá sức khỏe tôm",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần Mềm Quản Lý Tăng Trưởng & Thu Mẫu", href: "/vi/features/growth-sampling" },
  takeaways: [
    "Tôm chậm lớn là một tín hiệu bất thường cần điều tra toàn diện, bản thân nó không phải là một chẩn đoán bệnh độc lập.",
    "Cần xác thực lại kỹ thuật thu mẫu, ước tính sinh khối và tỷ lệ sống (SR) trước khi thay đổi thức ăn, tạt hóa chất xử lý hoặc điều chỉnh kế hoạch thu hoạch.",
    "Quy trình đánh giá hiệu quả phải liên kết chặt chẽ giữa MBW, ADG với phản xạ ăn tại nhá, xu hướng chất lượng nước, tỷ lệ sống thực tế, áp lực mật độ và các quan sát lâm sàng.",
  ],
  faqs: [
    {
      question: "Tại sao tôm thẻ chân trắng trong ao nuôi lại chậm lớn?",
      answer:
        "Tôm chậm lớn có thể xuất phát từ việc thu mẫu thiếu nhất quán hoặc sai số kỹ thuật, ước tính sai lệch sinh khối và tỷ lệ sống (SR), phân bố thức ăn không đồng đều dưới đáy ao, tôm giảm ăn do stress chất lượng nước (như thiếu oxy hòa tan hoặc khí độc amoniac, nitrit cao), mật độ nuôi vượt quá sức tải sinh học của ao, biến động thời tiết bất lợi, hoặc các bệnh nhiễm trùng mạn tính như vi bào tử trùng EHP (Enterocytozoon hepatopenaei) và hội chứng phân trắng (WFD). Cần đánh giá tổng thể bức tranh vận hành ao nuôi thay vì vội vàng quy kết cho một nguyên nhân đơn lẻ.",
    },
    {
      question: "Cách tính tốc độ tăng trưởng bình quân hàng ngày (ADG) trong nuôi tôm như thế nào?",
      answer:
        "Tốc độ tăng trọng bình quân hàng ngày (ADG - Average Daily Gain / Growth) được tính bằng mức tăng trọng lượng bình quân (MBW) chia cho số ngày cách nhau giữa hai lần thu mẫu có cùng phương pháp: ADG = (MBW lần này − MBW lần trước) / số ngày giữa hai lần thu mẫu. Nếu ao mới chỉ có một kết quả thu mẫu hợp lệ đầu tiên, có thể ước tính sơ bộ bằng công thức: (MBW hiện tại − trọng lượng giống thả ban đầu) / số ngày nuôi (DOC); tuy nhiên, giá trị tính từ một điểm duy nhất này sẽ có độ tin cậy thấp hơn nhiều so với việc theo dõi chu kỳ đều đặn.",
    },
    {
      question: "Nhá (vó) ăn hết sạch nhưng trọng lượng tôm (MBW) vẫn dậm chân tại chỗ có ý nghĩa gì?",
      answer:
        "Nhá sạch chỉ chứng minh rằng thức ăn đặt trên khay nhá đó đã được tôm ăn hết, chứ không chứng minh rằng khẩu phần cho ăn của cả ao là chuẩn xác hay sinh khối ước tính đã đúng. Nếu nhá liên tục sạch nhưng MBW không tăng, trước hết hãy kiểm tra xem tỷ lệ sống và sinh khối thực tế có đang cao hơn dự tính hay không — việc đánh giá thấp số lượng tôm thực tế sẽ dẫn đến tình trạng thiếu thức ăn trên mỗi cá thể (underfeeding), khiến tôm tranh ăn dữ dội làm nhá hết rất nhanh nhưng tôm lại không đủ dinh dưỡng để tăng trưởng. Sau đó, hãy kiểm tra độ rải đều của thức ăn quanh ao, vị trí đặt nhá, độ đầy đường ruột của tôm, mức độ phân đàn lệch size, xu hướng chất lượng nước và các dấu hiệu nhiễm khuẩn hoặc EHP trước khi quyết định tăng cữ thức ăn.",
    },
  ],
  sections: [
    {
      heading: "Tôm chậm lớn là tín hiệu cảnh báo—hãy hành động trước khi thức ăn biến thành chất thải ô nhiễm",
      body: [
        "Tôm chậm lớn không phải là một vấn đề đơn nhất có một bài thuốc đặc trị tức thời. Đó là hồi chuông cảnh báo rằng hệ sinh thái ao nuôi đang không thể chuyển hóa lượng thức ăn đưa vào, điều kiện môi trường nước và tiềm năng con giống thành mức tăng trọng mong đợi. Hãy coi đây là một chuỗi bất thường mang tính quy luật khi chỉ số MBW (trọng lượng bình quân) hoặc ADG (tốc độ tăng trọng ngày) liên tục không đạt [kế hoạch vụ nuôi](/vi/resources/shrimp-cycle-planning), hiện tượng phân đàn lệch kích cỡ gia tăng, hoặc lượng thức ăn tiêu thụ lũy kế tăng đều nhưng sinh khối tôm lại dậm chân tại chỗ.",
        "Tuyệt đối không tự động tăng lượng thức ăn một cách mù quáng. Trước tiên, hãy xác thực lại độ tin cậy của số liệu, sau đó xác định chính xác yếu tố nào đang kìm hãm đà tăng trưởng của đàn tôm. Không có một con số mục tiêu ADG vạn năng áp dụng chung cho mọi trại tôm thẻ chân trắng: [mật độ thả giống](/vi/resources/vannamei-stocking-density), mô hình công nghệ ao (ao bạt hay ao đất), mùa vụ thời tiết, độ mặn nguồn nước, chất lượng thức ăn, công suất giàn quạt nước, áp lực dịch bệnh và kích cỡ thu hoạch mục tiêu đều chi phối mức ADG thực tế có thể đạt được.",
      ],
    },
    {
      heading: "Bước 1: Xác thực xem tôm có thực sự chậm lớn hay không",
      body: [
        "Tính toán tốc độ tăng trưởng bình quân hàng ngày theo công thức: ADG = (MBW lần này − MBW lần trước) / số ngày giữa hai lần thu mẫu. Hãy so sánh kết quả giữa từ hai lần thu mẫu chuẩn xác trở lên với cùng một phương pháp chài, đồng thời ghi chép chi tiết: số ngày nuôi (DOC), số lượng tôm mẫu được đếm và cân, khu vực chài mẫu, chỉ số MBW, mức độ phân đàn (size variation), lượng thức ăn đã xuất kho, tỷ lệ hao hụt hàng ngày và các chỉ số chất lượng nước trong tuần gần nhất.",
        "Một lần chài mẫu cho kết quả thấp chưa hẳn đồng nghĩa với việc đàn tôm bị chững tăng trưởng, bởi đó có thể do sai số thao tác hoặc vị trí quăng chài rơi vào khu vực tập trung tôm nhỏ. Tuy nhiên, nếu MBW và ADG tiếp tục dậm chân tại chỗ qua nhiều lần thu mẫu đối chứng liên tiếp, hãy xử lý sự việc như một vấn đề suy giảm hiệu suất ao thực sự. Nếu có một đợt thu mẫu bị nghi ngờ về độ chuẩn xác hoặc bị gián đoạn, hãy đánh dấu là 'chưa chắc chắn' (uncertain) và lên lịch chài mẫu kiểm chứng lại ngay trước khi đưa ra quyết định thay đổi lớn về khẩu phần thức ăn hay thời điểm thu hoạch.",
      ],
    },
    {
      heading: "Bước 2: Đánh giá hiện tượng nhá (vó) sạch thức ăn một cách chuẩn xác",
      body: [
        "Nhá sạch chỉ chứng minh lượng thức ăn đặt trong khay nhá đó đã được dọn hết. Điều này không hề chứng minh đàn tôm đang tăng trưởng tốt, khẩu phần ăn đã hợp lý hay ao nuôi đang thiếu thức ăn. Nếu nhá liên tục sạch bong nhưng đường cong MBW vẫn đi ngang, việc đầu tiên cần làm là kiểm tra xem tỷ lệ sống (SR) và sinh khối tôm thực tế có đang cao hơn nhiều so với dự tính hay không. Khi đánh giá thấp số lượng tôm thực có trong ao, đàn tôm sẽ bị thiếu hụt thức ăn trên từng cá thể, dẫn đến việc tôm đói nên dọn sạch nhá chớp nhoáng nhưng sinh khối cá thể lại không thể lớn lên.",
        "Tiếp theo, hãy rà soát lại độ phân bổ thức ăn trên toàn bộ diện tích đáy ao, vị trí đặt nhá có bị gom luồng hay không, mức độ no và tính liên tục của đường ruột tôm, tỷ lệ phân đàn, [xu hướng chất lượng nước](/vi/resources/vannamei-water-quality-parameters), tỷ lệ tôm chết rải rác và các biểu hiện nguy cơ dịch bệnh. Ngược lại, nếu nhá còn dư thừa thức ăn, tôm giảm ăn hoặc bơi lờ đờ ở tầng đáy, tuyệt đối không được tăng lượng thức ăn. Hãy giữ nguyên hoặc chủ động cắt giảm khẩu phần từng bước theo quy trình thao tác chuẩn (SOP) của trang trại, đồng thời khẩn trương kiểm tra chất lượng nước và sức khỏe tôm.",
      ],
    },
    {
      heading: "Bước 3: Ổn định môi trường nước trước khi thúc cữ thức ăn",
      body: [
        "Stress do suy giảm chất lượng nước có thể làm tê liệt khả năng tiêu hóa và kìm hãm tăng trưởng của tôm rất lâu trước khi các sự cố tôm chết hàng loạt bộc lộ ra ngoài. Hãy phân tích chuỗi dữ liệu xu hướng trong nhiều ngày liên tiếp của các chỉ tiêu oxy hòa tan (DO), độ pH sáng - chiều, nhiệt độ nước, độ mặn, tổng đạm amoniac (TAN) và khí độc nitrit (NO₂⁻) — thay vì chỉ nhìn vào một kết quả đo tức thời. Nếu nồng độ oxy hòa tan có xu hướng sụt giảm (< 4,0–5,0 mg/L) hoặc sức ăn tại nhá tụt giảm, hãy kiểm tra ngay công suất giàn quạt nước, rà soát các điểm góc chết (dead zones) tích tụ chất thải, tải lượng hữu cơ đáy ao, [sự biến động màu nước và mật độ tảo](/vi/resources/shrimp-pond-water-colour-algae), cũng như lịch sử các lần tăng cữ thức ăn gần nhất. Không được tăng thức ăn cho đến khi sức ăn của tôm và độ ổn định của môi trường nước đã phục hồi hoàn toàn.",
        "Nếu phát hiện nồng độ amoniac (TAN) hoặc nitrit leo thang, cần lập tức ngừng việc tăng cữ thức ăn, cắt giảm triệt để lượng thức ăn dư thừa để bảo vệ [hệ số FCR](/vi/resources/fcr-shrimp-farming), đồng thời kiểm tra vệ sinh đáy ao qua việc xả thải rốn xi-phông, tăng cường sục khí tối đa và áp dụng các biện pháp xử lý nước theo quy trình chuẩn của trang trại. Khắc phục môi trường sinh thái ao nuôi luôn là ưu tiên cốt lõi và mang tính quyết định hơn nhiều so với việc chỉ loay hoay điều chỉnh bảng định mức thức ăn.",
      ],
    },
    {
      heading: "Bước 4: Tính toán lại tỷ lệ sống (SR) và ước tính sinh khối thực tế",
      body: [
        "Mọi quyết định điều chỉnh thức ăn phải dựa trên sinh khối thực tế đang hiện diện trong ao, chứ không thể dựa mãi vào mật độ con giống thả nuôi ban đầu. Hãy đối chiếu kỹ lưỡng số liệu tôm hao hụt hàng ngày, kết quả quăng chài kiểm tra, số lượng tôm đếm được trên mỗi mẻ chài và thể trạng của tôm. Nếu tỷ lệ sống (SR) bị đánh giá thấp, đàn tôm trong ao sẽ chịu cảnh quá tải cá thể cạnh tranh một khẩu phần quá ít ỏi. Ngược lại, nếu ao có hiện tượng tôm rớt đáy ngầm mà người nuôi không phát hiện, trang trại sẽ rơi vào tình trạng cho ăn dư thừa nghiêm trọng do tính khẩu phần trên một lượng sinh khối ảo không còn tồn tại.",
        "Hãy cập nhật lại số lượng cá thể ước tính và sinh khối ao nuôi trước khi thiết lập kế hoạch cho ăn mới thông qua [tính năng thu mẫu tăng trưởng](/vi/features/growth-sampling). Khi tính ra sinh khối thực tế cao hơn hoặc thấp hơn dự tính, không nên vội vã đảo lộn lượng thức ăn ngay lập tức: trước hết hãy xác nhận có bao nhiêu tôm còn trong ao, tôm có đang tích cực bắt mồi hay không, và điều kiện chất lượng nước của ao có đủ sức tải để nâng tải lượng thức ăn hay không.",
      ],
    },
    {
      heading: "Bước 5: Nhận diện nguy cơ bệnh học mà không phỏng đoán cảm tính",
      body: [
        "Hiện tượng tôm chậm lớn kéo dài, tôm phân đàn nghiêm trọng (bắn size), hệ số FCR đội lên cao, đường ruột nhạt màu, đứt khúc hoặc trống rỗng vào giờ ăn, tôm mềm vỏ kinh niên sau lột xác, xuất hiện sợi phân trắng nổi trên mặt nước, hoặc tỷ lệ tôm rớt đáy âm ỉ... đều có thể là dấu hiệu cảnh báo bệnh lý bên cạnh các vấn đề về thức ăn hay chất lượng nước. Tuy nhiên, chỉ riêng dấu hiệu tôm chậm lớn thì không thể tự chẩn đoán chính xác là do vi bào tử trùng EHP (Enterocytozoon hepatopenaei), hội chứng phân trắng (WFD), nhiễm khuẩn Vibrio hay một mầm bệnh nào khác nếu thiếu bằng chứng xét nghiệm.",
        "Hãy ghi chép rõ ràng diễn biến theo từng ao nuôi và ngày tuổi (DOC), kiểm soát chặt chẽ việc luân chuyển chài lưới, khay nhá, ủng bảo hộ, dụng cụ đo đạc, nguồn nước xả, bùn xi-phông và sự di chuyển của nhân viên giữa ao nghi nhiễm và các ao bình thường. Đồng thời, nhanh chóng gửi mẫu tôm đến phòng xét nghiệm bệnh học thủy sản có uy tín để chạy xét nghiệm PCR hoặc soi kính hiển vi khi hiện tượng chậm lớn tiếp diễn. Tuyệt đối không tùy tiện sử dụng thuốc kháng sinh hay hóa chất diệt khuẩn để thay thế cho bằng chứng xét nghiệm, sự ổn định của môi trường nước và một kế hoạch ứng phó an toàn sinh học có kiểm soát.",
      ],
    },
    {
      heading: "Kế hoạch hành động 48 giờ thực tế tại hiện trường",
      body: [
        "Ngày 1 (Hôm nay): Kiểm chứng lại chỉ số MBW, công thức tính ADG, kỹ thuật quăng chài và số lượng mẫu tôm cân thử; kiểm tra khay nhá 2 tiếng sau cữ ăn, quan sát tập tính bơi lội của tôm, kiểm tra đáy ao xem có tôm chết chìm không và rà soát hệ thống quạt nước sục khí; ghi nhận đầy đủ các thông số chất lượng nước cùng diễn biến thời tiết; giữ nguyên cữ thức ăn (không tăng cữ) cho đến khi hoàn tất việc đánh giá toàn diện ao nuôi.",
        "Ngày 2 (Ngày mai): So sánh đối chiếu số liệu của 3 đến 5 lần thu mẫu gần nhất, chuỗi dữ liệu chất lượng nước, phản xạ ăn ở nhá, nhật ký cho ăn hàng ngày và tỷ lệ hao hụt; khoanh vùng một vấn đề vận hành rõ rệt và cốt lõi nhất; sau đó tiến hành can thiệp xử lý từng bước có kiểm soát và ghi chép nhật ký hành động đầy đủ. Đến kỳ thu mẫu tiếp theo, tính toán lại toàn bộ MBW, ADG, tỷ lệ sống (SR), sinh khối và hệ số FCR. Nếu đà tăng trưởng vẫn dậm chân tại chỗ hoặc phát sinh các triệu chứng bệnh lâm sàng mới, hãy nâng cấp quy trình chẩn đoán xét nghiệm chuyên sâu thay vì lặp lại các biện pháp can thiệp thử nghiệm chưa được chứng minh.",
      ],
    },
    {
      heading: "Xác nhận sự phục hồi tăng trưởng qua hồ sơ dữ liệu",
      body: [
        "Một ao nuôi không thể được coi là đã phục hồi đà tăng trưởng chỉ vì thấy nhá ăn sạch hoặc màu nước trông tươi đẹp hơn trong một ngày. Việc phục hồi thực sự phải được chứng minh thông qua sự cải thiện sức ăn ổn định, các chỉ số môi trường nước nằm trong ngưỡng an toàn, tỷ lệ tôm hao hụt hàng ngày duy trì ở mức bình thường, và đặc biệt là sự bật tăng rõ rệt của chỉ số MBW cùng ADG ở đợt thu mẫu đối chứng tiếp theo.",
        "Shrimply đồng hành cùng đội ngũ kỹ thuật và người quản lý trang trại liên kết dữ liệu thu mẫu định kỳ, nhật ký cho ăn từng cữ, xu hướng chất lượng nước, theo dõi hao hụt, nhật ký phòng trừ dịch bệnh và kế hoạch thu hoạch vào cùng một [thẻ đánh giá hiệu suất ao nuôi](/vi/resources/pond-performance) thống nhất — giúp người nuôi nhìn thấy rõ ràng liệu một giải pháp can thiệp có thực sự đem lại sự chuyển biến và cải thiện tốc độ tăng trưởng của đàn tôm hay không.",
      ],
    },
  ],
  checklist: [
    "Xác thực lại giá trị MBW, số lượng tôm mẫu, kỹ thuật thu mẫu và số ngày cách nhau giữa các lần chài trước khi đưa ra quyết định dựa trên chỉ số ADG.",
    "Kiểm chứng lại tỷ lệ sống (SR) và ước tính sinh khối trước khi tăng thức ăn trong tình huống nhá ăn hết sạch nhưng MBW vẫn đứng yên.",
    "Đánh giá đồng bộ việc phân bổ thức ăn, vị trí đặt khay nhá, độ đầy đường ruột của tôm, xu hướng chất lượng nước, tỷ lệ hao hụt và mức độ tôm phân đàn lệch size.",
    "Tuyệt đối không tăng lượng thức ăn khi tôm có biểu hiện giảm ăn hoặc các chỉ số chất lượng nước đang dao động bất ổn.",
    "Khắc phục vấn đề vận hành cốt lõi nhất một cách tuần tự từng bước và ghi chép chi tiết toàn bộ hành động can thiệp vào nhật ký ao.",
    "Kịp thời kích hoạt quy trình an toàn sinh học và gửi mẫu xét nghiệm chẩn đoán bệnh (PCR) khi tôm chậm lớn kéo dài hoặc xuất hiện dấu hiệu bệnh lý bất thường.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
    {
      title: "Infection with Enterocytozoon hepatopenaei (EHP)",
      publisher: "World Organisation for Animal Health",
      url: "https://www.woah.org/app/uploads/2022/11/a-woah-ehp-disease-card-sept-2022.pdf",
    },
  ],
};
