import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultNutritionReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-feeding-rate",
  section: "Thức ăn & Kho bãi",
  label: "Tỷ lệ cho ăn",
  author: defaultResourceAuthorVI,
  reviewer: defaultNutritionReviewerVI,
  title: "Bảng & Công Cụ Tính Tỷ Lệ Cho Ăn Tôm Thẻ Chân Trắng: Khẩu Phần Thức Ăn Hàng Ngày Theo Trọng Lượng Thân",
  description:
    "Ước tính khẩu phần thức ăn hàng ngày cơ bản cho tôm thẻ chân trắng từ sinh khối hiện diện và trọng lượng bình quân (ABW/MBW), sau đó hiệu chỉnh chuẩn xác qua kiểm tra nhá (vó), kết quả chài mẫu, thu tỉa và chất lượng nước.",
  readTime: "9 phút đọc",
  tags: [
    "tỷ lệ cho ăn tôm thẻ chân trắng",
    "bảng cho ăn tôm thẻ",
    "bảng định mức thức ăn tôm",
    "lượng thức ăn tôm hàng ngày",
    "tỷ lệ cho ăn theo trọng lượng thân",
    "phần trăm thức ăn tôm",
    "định mức thức ăn tôm thẻ",
    "công thức tính thức ăn tôm",
    "công cụ tính thức ăn tôm",
    "kiểm tra nhá thức ăn",
    "quản lý thức ăn tôm",
    "cữ ăn trong ngày",
  ],
  publishedAt: "2026-08-31",
  image: {
    src: "/resources/images/vannamei-feeding-rate-calculator-infographic.png",
    alt: "Infographic hướng dẫn tính tỷ lệ cho ăn tôm thẻ chân trắng: ước tính sinh khối, áp dụng tỷ lệ phần trăm theo trọng lượng thân, chia cữ ăn trong ngày và đối chiếu kiểm chứng qua kiểm tra nhá, chài mẫu và chất lượng nước",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần mềm Quản lý Thức ăn & Kho bãi", href: "/vi/features/feed-inventory" },
  takeaways: [
    "Công cụ tính toán sử dụng đường cong tỷ lệ cho ăn nuôi thương phẩm chuẩn của Shrimply bắt đầu từ kích cỡ 1,65 g ABW; đây là khẩu phần cơ sở tham chiếu (baseline), không phải chỉ định cố định bất di bất dịch.",
    "Lượng thức ăn hàng ngày (kg) = Sinh khối hiện diện (kg) × Tỷ lệ cho ăn (%) ÷ 100.",
    "Nếu ước tính sinh khối từ số lượng post thả ban đầu, hãy lấy số lượng tôm sống ước tính trừ đi tổng số tôm đã thu tỉa lũy kế trước khi nhân với trọng lượng bình quân.",
    "Luôn kiểm chứng lại mọi khẩu phần tính toán bằng cách kiểm tra nhiều nhá (vó), đối chiếu số liệu chài mẫu (MBW), nhật ký tôm hao hụt, các chỉ số chất lượng nước và bảng khuyến nghị của nhà sản xuất thức ăn.",
  ],
  faqs: [
    {
      question: "Tỷ lệ cho ăn khuyến nghị cho tôm thẻ chân trắng là bao nhiêu?",
      answer:
        "Không có một tỷ lệ phần trăm cố định duy nhất nào an toàn cho mọi ao nuôi. Công cụ tính của Shrimply áp dụng đường cong tham chiếu nuôi thương phẩm giảm dần từ 6,5% sinh khối/ngày ở kích cỡ 1,65–3,0 g ABW xuống 2,1% khi tôm đạt trên 33 g. Tuy nhiên, khẩu phần thực tế cuối cùng vẫn phụ thuộc vào độ chính xác của ước tính sinh khối, hàm lượng đạm thức ăn, nguồn thức ăn tự nhiên, nhiệt độ nước, nồng độ oxy hòa tan (DO) và phản xạ bắt mồi thực tế trên nhá (vó).",
    },
    {
      question: "Cách tính lượng thức ăn hàng ngày cho tôm thẻ như thế nào?",
      answer:
        "Nhân sinh khối hiện diện trong ao với tỷ lệ cho ăn (%) rồi chia cho 100: Lượng thức ăn hàng ngày (kg) = Sinh khối (kg) × Tỷ lệ (%) ÷ 100. Ví dụ, một ao có sinh khối 3.000 kg với tỷ lệ cơ sở 3,3% sẽ cần 99 kg thức ăn/ngày trước khi thực hiện các bước tinh chỉnh theo kiểm tra nhá và chất lượng nước.",
    },
    {
      question: "Nên chia bao nhiêu cữ cho tôm thẻ chân trắng ăn mỗi ngày?",
      answer:
        "Các trang trại thương phẩm thường chia lượng thức ăn trong ngày thành 3 đến 5 cữ (hoặc rải liên tục qua máy cho ăn tự động - auto-feeder). Tần suất cho ăn phụ thuộc vào kích cỡ tôm, độ bền trong nước của viên cám (pellet water stability), phương pháp cho ăn (rải tay hay máy), nhân công và điều kiện môi trường ao. Hãy lấy khuyến cáo trên bao bì cám và quy trình chuẩn (SOP) của trang trại làm lịch ban đầu, sau đó đối chiếu kết quả kiểm tra nhiều nhá và tốc độ tăng trưởng trước khi thay đổi số cữ.",
    },
    {
      question: "Nên rải bao nhiêu lượng thức ăn vào nhá (vó) kiểm tra?",
      answer:
        "Công cụ tính mặc định áp dụng tỷ lệ 1,2% của mỗi cữ ăn chia đều cho toàn bộ số nhá trong ao, nhưng thông số này hoàn toàn có thể điều chỉnh theo quy trình chuẩn của trại. Các tài liệu kỹ thuật thương phẩm áp dụng tỷ lệ nhá khác nhau tùy theo cỡ tôm (thường dao động từ 0,8% đến 2,0%). Điều cốt lõi là giữ vững tính nhất quán của phương pháp và theo dõi xu hướng bắt mồi, thay vì coi một con số phần trăm duy nhất là quy chuẩn tuyệt đối.",
    },
    {
      question: "Thời gian canh nhá (canh vó) kiểm tra thức ăn tôm bao lâu là chuẩn?",
      answer:
        "Khung thời gian canh nhá thực tế phổ biến là khoảng 2,5 giờ đối với tôm nhỏ (giai đoạn mới sang ao), 1,5–2,0 giờ ở giai đoạn giữa vụ nuôi thương phẩm, và 1,0–1,5 giờ đối với tôm cỡ lớn (> 15–20 g). Hãy điều chỉnh thời gian canh nhá phù hợp với độ tan rã của viên cám, kích cỡ tôm, phương thức cho ăn và quy trình thao tác chuẩn (SOP) của trang trại.",
    },
    {
      question: "Nhiệt độ nước và oxy hòa tan (DO) ảnh hưởng thế nào đến tỷ lệ cho tôm ăn?",
      answer:
        "Cả hai yếu tố đều tác động trực tiếp đến cường độ bắt mồi và tốc độ trao đổi chất, nhưng mức độ phản ứng sẽ khác nhau theo kích cỡ tôm và tốc độ biến động của môi trường nước. Nếu nồng độ oxy hòa tan (DO) xuống thấp dưới ngưỡng an toàn của trại (< 4–5 mg/L) hoặc đang trên đà sụt giảm, cần hoãn cữ ăn hoặc chủ động giảm lượng cám, tăng cường chạy quạt/sục khí và kiểm tra lại chỉ số trước khi cho ăn; không nên chỉ áp dụng máy móc một tỷ lệ cắt giảm duy nhất cho mọi tình huống.",
    },
    {
      question: "Shrimply có tự động tính toán tỷ lệ cho ăn và sinh khối ao nuôi không?",
      answer:
        "Có. Shrimply tự động tính toán các chỉ số ao nuôi từ số lượng thả giống, nhật ký tôm chết hao hụt, sản lượng thu hoạch/thu tỉa, trọng lượng bình quân (MBW) và nhật ký xuất kho thức ăn, đồng thời áp dụng chính xác đường cong tỷ lệ cho ăn này. Khi có đủ chuỗi dữ liệu, hệ thống sẽ cảnh báo hiện tượng chênh lệch giữa lượng thức ăn thực tế và sinh khối ước tính (feed-to-biomass mismatch) để đội ngũ kỹ thuật điều tra xác minh, thay vì tự ý kết luận về sức ăn hay nguyên nhân bệnh lý.",
    },
  ],
  sections: [
    {
      heading: "Tóm tắt nhanh: Tính toán khẩu phần cơ sở, sau đó kiểm chứng thực tế tại ao",
      body: [
        "Ước tính sinh khối tôm hiện diện trong ao, áp dụng tỷ lệ cho ăn (%) tương ứng với trọng lượng bình quân (ABW/MBW) hợp lệ gần nhất từ [bảng theo dõi tăng trưởng tôm thẻ chân trắng](/vi/resources/vannamei-growth-chart), sau đó chia đều tổng lượng thức ăn trong ngày theo số cữ ăn quy định của trang trại.",
        "Kết quả tính toán chỉ là khẩu phần xuất phát điểm (khẩu phần cơ sở). Sai số ước tính sinh khối, các đợt thu tỉa, mật độ thức ăn tự nhiên, chất lượng cám, nhiệt độ nước, nồng độ oxy hòa tan và sức khỏe đàn tôm đều có thể làm thay đổi khả năng tiêu thụ thức ăn thực tế của ao nuôi.",
        "Hãy kiểm tra nhiều nhá (vó) đại diện và rà soát lại nhật ký chài mẫu, số liệu tôm hao hụt, lịch sử thu tỉa và các thông số chất lượng nước trước khi quyết định tăng hoặc giữ nguyên lượng thức ăn tính toán.",
      ],
    },
    {
      heading: "Đường cong tỷ lệ cho ăn cơ sở cho tôm thẻ chân trắng",
      body: [
        "Dưới đây là các điểm mốc tham chiếu trong đường cong nuôi thương phẩm chuẩn của Shrimply. Công cụ tính toán sử dụng phương pháp nội suy tuyến tính giữa các điểm mốc giúp tỷ lệ cho ăn biến đổi mượt mà theo từng mức tăng trọng lượng thân (ABW/MBW) của tôm.",
        "Các bảng định mức cho ăn được công bố có thể có sự chênh lệch do công thức dinh dưỡng của từng hãng cám, mật độ thả nuôi, độ phì nhiêu tự nhiên của ao, độ ổn định của môi trường nước và mục tiêu hệ số FCR khác nhau. Hãy xem đường cong này như một khung tham chiếu quản lý nhất quán, đồng thời luôn so sánh với hướng dẫn của nhà sản xuất thức ăn và phản xạ ăn thực tế của ao.",
      ],
      table: {
        columns: [
          "Điểm mốc trọng lượng (ABW/MBW)",
          "Tỷ lệ cho ăn cơ sở (% sinh khối/ngày)",
        ],
        rows: [
          ["1,65–3,0 g", "6,5%"],
          ["5,0 g", "5,5%"],
          ["7,5 g", "4,2%"],
          ["10,5 g", "3,6%"],
          ["14,0 g", "3,3%"],
          ["17,5 g", "3,1%"],
          ["21,0 g", "2,9%"],
          ["25,0 g", "2,7%"],
          ["29,0 g", "2,5%"],
          ["33,0 g", "2,3%"],
          ["> 33,0 g", "2,1%"],
        ],
      },
      note: "Không sử dụng công cụ tính nuôi thương phẩm này cho tôm có kích cỡ dưới 1,65 g ABW. Giai đoạn ương vèo (nursery) thường áp dụng chế độ cho ăn riêng theo hướng dẫn của trại giống hoặc nhà sản xuất thức ăn dựa trên số lượng post-larvae (PL) và ngày tuổi DOC.",
    },
    {
      heading: "Công cụ tính khẩu phần thức ăn tôm thẻ chân trắng tương tác",
      body: [
        "Sử dụng công cụ tính toán này cho tôm có trọng lượng từ 1,65 g ABW trở lên. Nhập sinh khối hiện diện đã biết, hoặc ước tính sinh khối từ số lượng tôm giống thả ban đầu, tỷ lệ sống (SR), số lượng tôm đã thu tỉa lũy kế và trọng lượng bình quân (ABW).",
        "Công cụ này áp dụng cùng một thuật toán nội suy tuyến tính như trên hệ thống quản lý ao nuôi của Shrimply. Sau đó, công cụ sẽ chia khẩu phần cơ bản hàng ngày theo số cữ ăn bạn lựa chọn và tính toán lượng thức ăn cụ thể cần rải vào từng nhá (vó) kiểm tra.",
      ],
      note: "Khẩu phần tính toán không phải là mức trần tuyệt đối hay mệnh lệnh cưỡng chế. Nếu kết quả kiểm tra nhá, chất lượng nước, thời tiết, hành vi tôm hoặc tốc độ tăng trưởng gần đây không đồng nhất với số liệu tính toán, hãy tuân thủ quy trình cho ăn an toàn của trang trại và điều tra nguyên nhân trước cữ ăn tiếp theo.",
    },
    {
      heading: "Cách tính lượng thức ăn hàng ngày cho tôm: Công thức dựa trên sinh khối",
      body: [
        "Để tính toán khẩu phần thức ăn cơ bản hàng ngày, cần xác định sinh khối hiện diện trong ao và tỷ lệ cho ăn (%) tương ứng với trọng lượng bình quân (ABW/MBW) hợp lệ mới nhất.",
        "Công thức tính toán cốt lõi là: Lượng thức ăn hàng ngày (kg) = Sinh khối hiện diện (kg) × [Tỷ lệ cho ăn (%) ÷ 100].",
        "Trong trường hợp chưa biết chính xác sinh khối: Số lượng tôm hiện tại = (Số giống thả ban đầu × Tỷ lệ sống %) − Số lượng tôm thu tỉa lũy kế. Sinh khối hiện diện (kg) = Số lượng tôm hiện tại × ABW (g) ÷ 1.000.",
        "Ví dụ minh họa 1: Ở trọng lượng 12,0 g ABW, đường cong tham chiếu nội suy tỷ lệ cho ăn cơ bản là 3,47%. Với ao có sinh khối 3.500 kg, lượng thức ăn cần dùng là 3.500 × 0,0347 = 121,5 kg/ngày, tương đương khoảng 30,4 kg cho mỗi cữ nếu chia làm 4 cữ ăn trong ngày.",
        "Ví dụ minh họa 2: Ao thả 200.000 con giống post, tỷ lệ sống ước đạt 80% và đã thu tỉa 20.000 con, số tôm còn lại trong ao là 140.000 con. Ở trọng lượng 8,0 g ABW, sinh khối ao đạt 1.120 kg và tỷ lệ cho ăn nội suy là 4,10%, cho ra lượng thức ăn 45,9 kg/ngày trước khi tinh chỉnh theo phản xạ nhá và chất lượng nước.",
      ],
    },
    {
      heading: "Quản lý nhá (vó) thức ăn: Duy trì tính nhất quán của phương pháp theo dõi",
      body: [
        "Nhá cho ăn (còn gọi là vó, anco, hay sàn ăn) giúp đội ngũ kỹ thuật theo dõi và so sánh phản xạ bắt mồi của đàn tôm theo thời gian để kiểm soát [hệ số FCR](/vi/resources/fcr-shrimp-farming). Tuy nhiên, nhá không thể đo lường chính xác tuyệt đối sức ăn của từng cá thể tôm ở mọi ngóc ngách trong ao.",
        "Các quy trình thương phẩm đưa ra tỷ lệ thức ăn rải vào nhá và thời gian canh nhá khác nhau tùy theo cỡ tôm. Công cụ tính toán mặc định áp dụng tỷ lệ 1,2% của mỗi cữ ăn chia đều cho tất cả các nhá; hãy điều chỉnh tỷ lệ này cho khớp với quy trình chuẩn (SOP) bằng văn bản của trại, đồng thời giữ cố định vị trí đặt nhá, thời gian canh và định lượng rải cám vào nhá.",
        "Bố trí nhiều nhá đại diện ở các vị trí khác nhau trong ao. Tuyệt đối tránh đặt toàn bộ nhá trên cùng một dòng chảy quạt nước, góc nước tù hoặc khu vực tích tụ bùn bã hữu cơ (xi-phông), vì vị trí đặt sai lệch sẽ làm biến dạng kết quả đánh giá sức ăn.",
      ],
      items: [
        "Tất cả các nhá đều hết sạch thức ăn trong một cữ: Ghi nhận kết quả vào nhật ký, nhưng tuyệt đối không vội vàng tăng thức ăn chỉ dựa trên một lần quan sát duy nhất. Hãy kiểm chứng tính nhất quán qua các cữ tiếp theo, đối chiếu tốc độ tăng trọng (ADG) và độ ổn định của chất lượng nước.",
        "Thức ăn còn dư trên 10% ở nhiều nhá: Chủ động cắt giảm lượng thức ăn ở cữ kế tiếp theo quy trình chuẩn của trại, đồng thời kiểm tra ngay nồng độ oxy hòa tan (DO), nhiệt độ nước, biến động pH, diễn biến thời tiết và khả năng vận động của tôm.",
        "Kết quả giữa các nhá không đồng đều (nhá hết, nhá còn nhiều): Rà soát lại độ đồng đều khi rải thức ăn (hoặc góc phun của máy cho ăn tự động), vị trí đặt nhá, hướng dòng chảy quạt nước, vùng tích tụ bùn đáy và xác nhận xem tất cả các nhá có được bỏ cám và kéo lên kiểm tra đúng cùng một khung giờ hay không.",
        "Sức ăn trên nhá liên tục yếu hoặc xuất hiện tôm chết rải rác: Ngừng ngay việc tăng thức ăn và tham vấn chuyên gia kỹ thuật hoặc bác sĩ thú y thủy sản; quan sát nhá đơn thuần không thể chẩn đoán chính xác nguyên nhân bệnh truyền nhiễm.",
      ],
    },
    {
      heading: "Kiểm tra chất lượng nước và thời tiết trước khi cho ăn",
      body: [
        "Oxy hòa tan (DO): Kiểm tra chỉ số DO thực tế và xu hướng biến động trước mỗi cữ cho ăn, đặc biệt là cữ sáng sớm (pre-dawn) và sau các đợt thời tiết cực đoan. Nếu hàm lượng DO thấp hơn ngưỡng an toàn của trại (< 4–5 mg/L) hoặc đang trên đà sụt giảm, hãy ưu tiên vận hành tối đa dàn quạt khí, tạm hoãn hoặc giảm lượng thức ăn của cữ đó và đo lại DO trước khi tiếp tục cho ăn. Xem thêm các ngưỡng chuẩn tại [thông số chất lượng nước tôm thẻ chân trắng](/vi/resources/vannamei-water-quality-parameters).",
        "Nhiệt độ nước: Cường độ bắt mồi thay đổi rõ rệt theo nhiệt độ và kích cỡ thân tôm. Các nghiên cứu khoa học chỉ ra rằng nhiệt độ tối ưu cho tốc độ tăng trưởng nhanh nhất có sự khác biệt theo từng cỡ tôm, do đó không thể áp dụng một hệ số điều chỉnh nhiệt độ cố định duy nhất cho mọi ao nuôi.",
        "Mưa lớn, biến động mật độ tảo, dao động pH và độ mặn: So sánh các chỉ số môi trường với dải dao động thông thường của ao và phản xạ ăn trên nhá gần nhất. Nên áp dụng các mức điều chỉnh thức ăn nhỏ, có tính chất thử nghiệm và dễ đảo ngược, sau đó quan sát phản ứng ở cữ kế tiếp thay vì tự động cắt giảm một tỷ lệ cứng nhắc.",
        "Thức ăn tự nhiên và chất lượng thức ăn viên: Độ phì nhiêu sinh học của ao, độ bền trong nước của viên cám, mùi vị dẫn dụ bắt mồi (palatability) và hàm lượng dinh dưỡng đều tác động đến lượng cám công nghiệp tôm ăn vào. Hãy tuân thủ hướng dẫn trên bao bì thức ăn và kiểm tra điều kiện bảo quản kho bãi hoặc phẩm chất cám khi thấy phản xạ bắt mồi tại nhá suy giảm đột ngột.",
      ],
    },
    {
      heading: "Cách Shrimply tự động hóa tính toán tỷ lệ cho ăn và theo dõi sinh khối ao",
      body: [
        "Shrimply tổng hợp số lượng post thả giống ban đầu, nhật ký hao hụt hàng ngày, sản lượng thu tỉa lũy kế từ [nhật ký trang trại tôm](/vi/resources/shrimp-farm-record-keeping) và số liệu chài mẫu trọng lượng bình quân (MBW) hợp lệ mới nhất để ước tính số lượng cá thể và sinh khối hiện diện trong ao. Dữ liệu bị bỏ sót hoặc chậm cập nhật sẽ làm giảm độ tin cậy của phép tính, vì vậy ứng dụng đóng vai trò hỗ trợ đắc lực chứ không thay thế việc kiểm tra thực địa của kỹ thuật viên.",
        "Đường cong tỷ lệ cho ăn hiển thị trên trang này được đồng bộ hoàn toàn với thuật toán quản lý ao nuôi của Shrimply. Khi có đủ chuỗi dữ liệu thực tế, giao diện quản lý ao sẽ so sánh sinh khối ước tính từ lượng thức ăn tiêu thụ với sinh khối đo đạc qua chài mẫu, từ đó cảnh báo những chênh lệch lặp lại bất thường (feed-to-biomass mismatch) để đội ngũ trang trại kịp thời điều tra nguyên nhân. Đối với trang trại tính khẩu phần theo ngày tuổi DOC, tham khảo thêm phương pháp tại [chỉ số thức ăn tôm](/vi/resources/shrimp-feed-index-calculation).",
        "Nhật ký cho ăn thực tế sẽ tự động khấu trừ lượng tồn kho thức ăn trong kho bãi qua tính năng [quản lý kho thức ăn](/vi/features/feed-inventory). Ngược lại, nhật ký chài mẫu sinh học chỉ lưu trữ các quan sát sinh trưởng như MBW và lượng cám tham chiếu chứ tuyệt đối không khấu trừ kho cám, ngăn chặn việc nhầm lẫn giữa dữ liệu quan sát sinh học và nghiệp vụ xuất kho hàng hóa.",
      ],
    },
    {
      heading: "Dấu hiệu cảnh báo sai lệch trong phân bổ khẩu phần thức ăn",
      body: [
        "Hãy nhìn nhận những biểu hiện dưới đây như các tín hiệu thực địa cần kiểm tra xác minh ngay, chứ không phải kết luận duy nhất cho một nguyên nhân:",
      ],
      items: [
        "Dấu hiệu cho ăn dư thừa (overfeeding): Thức ăn liên tục còn thừa trên nhiều nhá, hệ số FCR có xu hướng tăng xấu, chênh lệch giữa thức ăn và sinh khối ngày càng lớn, đáy ao chuyển màu đen hoặc bốc mùi hôi thối, hoặc nồng độ oxy hòa tan (DO) lúc rạng sáng suy giảm liên tục.",
        "Dấu hiệu cho ăn thiếu định mức (underfeeding): Nhá luôn hết sạch bóng thức ăn nhưng tôm lớn chậm (ADG thấp - xem hướng dẫn [xử lý tôm chậm lớn](/vi/resources/slow-shrimp-growth-adg-troubleshooting)), tôm bơi lội sục tìm mồi dọc chân bờ ao, hoặc lượng thức ăn hàng ngày liên tục thấp hơn nhiều so với đường cong sinh khối cơ sở.",
        "Dấu hiệu phân bổ thức ăn không đều: Kết quả giữa các nhá chênh lệch quá lớn hoặc đàn tôm bị phân đàn (lệch cỡ) rõ rệt. Cần kiểm tra bán kính rải cám của máy tự động hoặc người rải, dòng chảy quạt nước, vị trí cắm nhá, kỹ thuật chài mẫu và số lượng tôm ước tính trước khi chỉ quy kết cho tổng lượng thức ăn.",
        "Dấu hiệu sai lệch dữ liệu ghi chép: Biểu đồ tăng trưởng hoặc FCR đột ngột biến động mạnh sau các đợt quên ghi nhận tôm chết, thiếu nhật ký thu tỉa, sót phiếu xuất cám hoặc số liệu chài mẫu MBW không chuẩn. Hãy chuẩn hóa lại dữ liệu sổ sách trước khi thực hiện những thay đổi lớn về khẩu phần ăn.",
      ],
    },
    {
      heading: "Khi nào cần tạm dừng tăng thức ăn và tham vấn ý kiến chuyên gia",
      body: [
        "Cần khẩn trương báo cáo cấp trên hoặc mời chuyên gia thú y thủy sản hỗ trợ kỹ thuật khi tỷ lệ tôm chết tiếp diễn, tôm có biểu hiện bơi tấp mé, đổi màu cơ thể hoặc mang gan bất thường, sức ăn tại nhá liên tục yếu qua nhiều cữ liên tiếp, các chỉ tiêu chất lượng nước (DO, TAN, NO₂⁻) không thể ổn định, hoặc ao nuôi không có chuyển biến tích cực sau các bước can thiệp thận trọng. Việc quan sát nhá thức ăn và công cụ tính toán không thể thay thế cho xét nghiệm chẩn đoán bệnh truyền nhiễm.",
      ],
    },
  ],
  checklist: [
    "Sử dụng số liệu trọng lượng bình quân (MBW) hợp lệ mới nhất và ước tính số lượng tôm đã tính đủ hao hụt và các đợt thu tỉa lũy kế.",
    "Tính toán khẩu phần cơ sở hàng ngày và chia đều theo lịch các cữ ăn trong ngày của trang trại.",
    "Rải thức ăn vào nhá, bố trí vị trí và canh giờ kiểm tra nhiều nhá với phương pháp chuẩn hóa đồng nhất ở mọi cữ.",
    "Đo đạc oxy hòa tan (DO), nhiệt độ nước, xu hướng biến động pH, điều kiện thời tiết và hành vi của tôm trước khi quyết định tăng cữ thức ăn.",
    "Thực hiện điều chỉnh thức ăn với biên độ nhỏ, có thể thu hồi linh hoạt và kiểm chứng phản ứng ở cữ canh nhá cũng như đợt chài mẫu tiếp theo.",
    "Ghi chép riêng biệt nhật ký xuất kho thức ăn thực tế và nhật ký chài mẫu sinh học để số liệu tồn kho và hệ số FCR luôn chuẩn xác và đáng tin cậy.",
  ],
  sources: [
    {
      title: "Modelling and simulation of feeding rate for Litopenaeus vannamei based on body weight and environmental parameters",
      publisher: "Automatika",
      url: "https://www.tandfonline.com/doi/abs/10.1080/00051144.2022.2031540",
    },
    {
      title: "Study and Analysis of Feeds and Fertilizers for Sustainable Aquaculture Development: Indonesia",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/a1444e/a1444e09.pdf",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "Temperature Effects on Growth, Feeding Rate and Feed Conversion of the Pacific White Shrimp",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/0044-8486(95)00032-1",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
  ],
};
