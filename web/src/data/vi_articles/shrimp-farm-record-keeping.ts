import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-farm-record-keeping",
  section: "Quản lý trang trại",
  label: "Nhật ký trại tôm",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Nhật Ký Trang Trại Tôm: Các Chỉ Số Quan Trọng Cần Theo Dõi Hàng Ngày, Hàng Tuần Và Cả Vụ Nuôi",
  description:
    "Hướng dẫn thực hành các hạng mục nhật ký trang trại tôm thẻ chân trắng quan trọng nhất: kiểm soát lượng cho ăn và canh nhá/vó, đo đạc chất lượng nước sáng - chiều, chài mẫu tăng trưởng, giám sát hao hụt, dữ liệu thu hoạch và đánh giá hiệu quả tài chính vụ nuôi.",
  readTime: "7 phút đọc",
  tags: [
    "nhật ký ao nuôi tôm",
    "ghi chép nhật ký điện tử",
    "nhật ký cho ăn và kiểm tra nhá",
    "chất lượng nước sáng chiều",
    "theo dõi tỷ lệ hao hụt",
    "chài mẫu tăng trưởng MBW và ADG",
    "truy xuất nguồn gốc tôm ASC BAP VietGAP",
    "tồn kho thức ăn",
    "đánh giá hiệu quả kinh tế vụ nuôi",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-farm-record-keeping-daily-weekly-cycle.jpg",
    alt: "Quản lý trang trại tôm kiểm tra nhật ký ghi chép hàng ngày và hàng tuần về lượng thức ăn tiêu thụ, chất lượng nước, tỷ lệ hao hụt, MBW, ADG, sinh khối ước tính và tỷ lệ sống (SR)",
    width: 1448,
    height: 1086,
  },
  relatedFeature: { label: "Phần mềm quản lý trang trại tôm", href: "/vi/shrimp-farm-management-software" },
  takeaways: [
    "Nhật ký ao nuôi là công cụ ra quyết định vận hành hàng ngày của người quản lý trang trại, không phải là thủ tục giấy tờ hành chính.",
    "Nhật ký hàng ngày phải ghi nhận chi tiết lượng phân bổ thức ăn, kết quả kiểm tra nhá/vó, biến động chất lượng nước sáng - chiều, tỷ lệ hao hụt và các quan sát bất thường tại ao.",
    "Đánh giá định kỳ hàng tuần và tổng kết cả vụ giúp kết nối trực tiếp các chỉ tiêu sinh học với chi phí sản xuất thực tế, hệ số FCR và lợi nhuận thu hoạch.",
  ],
  faqs: [
    {
      question: "Tại sao việc ghi chép nhật ký ao tôm hàng ngày lại có ý nghĩa quyết định đến thành bại của vụ nuôi?",
      answer:
        "Ghi chép nhật ký hàng ngày đóng vai trò như hệ thống cảnh báo sớm (early warning system) trước khi các biến động nhỏ chuyển thành sự cố tôm chết hàng loạt. Bằng việc theo dõi chặt chẽ lượng thức ăn tiêu thụ, các chỉ số chất lượng nước sáng - chiều và tỷ lệ hao hụt mỗi ngày, người quản lý trang trại có thể kịp thời điều chỉnh thời gian chạy quạt nước, can thiệp giảm cữ ăn trước khi thức ăn dư làm thối đáy ao, và phát hiện sớm hiện tượng tôm giảm ăn - dấu hiệu chỉ báo đầu tiên của mầm bệnh nguy hiểm.",
    },
    {
      question: "Cách ghi chép nhật ký cho ăn hàng ngày và kiểm tra nhá/vó (feed tray) chuẩn xác là gì?",
      answer:
        "Kỹ thuật viên cần ghi chép chính xác số kilôgam thức ăn rải xuống ao trong từng cữ. Sau khi cho ăn từ 1,5 đến 2 giờ, bắt buộc phải kéo nhá/vó để kiểm tra và ghi nhận tỷ lệ thức ăn còn lại (hết sạch, còn dưới 10%, dư 20–50% hoặc không ăn). Nếu thức ăn trên nhá còn dư vượt ngưỡng quy định, phải lập tức giữ nguyên hoặc cắt giảm lượng thức ăn của cữ kế tiếp theo quy trình chuẩn (SOP), ngăn chặn tình trạng dư thừa thức ăn gây bùng phát khí độc và ô nhiễm đáy ao.",
    },
    {
      question: "Thời điểm và tần suất đo đạc các chỉ tiêu chất lượng nước trong ngày như thế nào là chuẩn?",
      answer:
        "Các chỉ tiêu chất lượng nước biến động mạnh, đặc biệt là oxy hòa tan (DO) và pH, phải được đo đạc và ghi nhận tối thiểu hai lần mỗi ngày vào các khung giờ cố định: lúc rạng sáng (khoảng 05:00 khi DO xuống thấp nhất trong ngày) và đầu giờ chiều (khoảng 15:00–16:00 khi quá trình quang hợp của tảo và chỉ số pH đạt đỉnh cao nhất). Các thông số hóa lý chuyên sâu như độ kiềm, amonia tự do (TAN) và nitrit (NO₂⁻) cần được kiểm tra định kỳ 2 đến 3 ngày một lần. Xem hướng dẫn chi tiết tại [Thông số chất lượng nước tôm thẻ chân trắng](/vi/resources/vannamei-water-quality-parameters).",
    },
    {
      question: "Sự khác biệt cốt lõi giữa nhật ký cho ăn hàng ngày và dữ liệu chài mẫu tăng trưởng là gì?",
      answer:
        "Nhật ký cho ăn hàng ngày ghi nhận khối lượng thức ăn thực tế xuất kho và phải kích hoạt nghiệp vụ khấu trừ tồn kho vật lý của trang trại theo quy tắc nhập trước xuất trước (FIFO). Ngược lại, chài mẫu tăng trưởng định kỳ hàng tuần là một quan sát sinh học thuần túy nhằm xác định trọng lượng bình quân (MBW) và tốc độ tăng trưởng ngày (ADG) để ước tính sinh khối và tính toán tỷ lệ cho ăn (feeding rate) cho tuần kế tiếp. Dữ liệu chài mẫu tuyệt đối không được kích hoạt nghiệp vụ trừ kho thức ăn.",
    },
    {
      question: "Những hồ sơ nào bắt buộc phải tổng kết cuối vụ để phục vụ truy xuất nguồn gốc (traceability) và đánh giá VietGAP / ASC / BAP?",
      answer:
        "Để đáp ứng yêu cầu kiểm toán truy xuất nguồn gốc của các thị trường xuất khẩu và tiêu chuẩn chứng nhận nuôi trồng thủy sản (như VietGAP, ASC, BAP hay GlobalG.A.P.), báo cáo tổng kết cuối vụ phải bao gồm: chứng nhận nguồn gốc tôm giống (hatchery) và kết quả xét nghiệm PCR sạch bệnh, nhật ký sử dụng toàn bộ các lô thức ăn kèm mã số lô sản xuất (batch/lot number), nhật ký bổ sung chế phẩm sinh học và khoáng chất xử lý nước, bảng theo dõi chất lượng nước cả vụ, chi tiết sản lượng thu tỉa và thu toàn bộ, bảng phân cỡ thương phẩm (size) và biên bản giao nhận tôm cho nhà máy chế biến.",
    },
    {
      question: "Vì sao chuyển đổi từ sổ tay giấy sang phần mềm quản lý trang trại kỹ thuật số giúp tối ưu hóa hiệu quả vận hành?",
      answer:
        "Phần mềm quản lý trang trại kỹ thuật số loại bỏ hoàn toàn các rủi ro sổ ghi chép bị ướt, rách nát, thất lạc hoặc chữ viết tay nhòe khó đọc ngoài hiện trường ao nuôi. Dữ liệu do kỹ thuật viên nhập trực tiếp từ điện thoại ở bờ ao sẽ đồng bộ tức thì lên bảng điều khiển (dashboard) của ban quản lý, tự động vẽ đồ thị xu hướng MBW, ADG, FCR và ước tính sinh khối theo thời gian thực. Nhờ đó, chủ trang trại có thể giám sát toàn diện mọi ao nuôi từ xa và đưa ra quyết định can thiệp kịp thời trước khi rủi ro phát triển thành tổn thất tài chính. Tham khảo giải pháp tại [Phần mềm quản lý trang trại tôm](/vi/shrimp-farm-management-software).",
    },
  ],
  sections: [
    {
      heading: "Tại sao nhật ký ao nuôi thay đổi chất lượng quyết định vận hành",
      body: [
        "Việc ghi chép nhật ký ao nuôi một cách kỷ luật giúp người quản lý và kỹ thuật viên đưa ra quyết định dựa trên dữ liệu thực tế của từng ao, thay vì phỏng đoán cảm tính hay dựa vào trí nhớ dễ sai sót. Hướng dẫn ghi chép nhật ký nuôi trồng thủy sản của Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc (FAO) khẳng định rằng việc theo dõi phân bổ thức ăn, diễn biến chất lượng nước, tăng trưởng đàn tôm và quản lý tồn kho vật tư là những công cụ nền tảng trong quản trị nông trại thương phẩm hiện đại.",
        "Đối với các mô hình nuôi tôm thẻ chân trắng (Litopenaeus vannamei) thâm canh và siêu thâm canh, những dữ liệu có giá trị kinh tế cao nhất gồm có: định mức thức ăn hàng ngày, kết quả kiểm tra nhá/vó, biến động tồn kho cám, các thông số chất lượng nước quan trọng, số liệu chài mẫu kiểm tra tôm, tỷ lệ hao hụt, lịch sử xử lý vi sinh/khoáng chất, sản lượng thu hoạch và chi tiết chi phí sản xuất. Toàn bộ các biến số này mang lại sức mạnh phân tích vượt trội khi được kết nối đồng bộ theo từng ao và từng chu kỳ nuôi thông qua [Phần mềm quản lý trang trại tôm](/vi/shrimp-farm-management-software).",
      ],
    },
    {
      heading: "Nhật ký hàng ngày: Theo dõi lượng thức ăn, chất lượng nước và tỷ lệ hao hụt",
      body: [
        "Nhật ký vận hành hàng ngày tại ao nuôi phải trả lời rõ 4 câu hỏi cốt lõi mỗi ngày: đàn tôm đã ăn bao nhiêu và phản hồi trên nhá/vó ra sao, có ghi nhận bất thường nào về màu nước hay đáy ao không, chất lượng nước biến động như thế nào giữa các khung giờ, và có xuất hiện tôm chết hoặc dấu hiệu bơi lội bất thường hay không. Bản ghi thức ăn cần ghi chú rõ mã số cỡ hạt (cám mảnh, cám viên số mấy) và số lô sản xuất (batch/lot), bởi vì thức ăn bị ẩm mốc hoặc bảo quản sai cách trong kho có thể làm giảm mạnh tốc độ tăng trưởng của tôm.",
        "Ghi chép chất lượng nước bắt buộc phải gắn liền với mốc thời gian đo đạc chuẩn xác. Các thông số môi trường then chốt như oxy hòa tan (DO) và pH liên tục biến đổi suốt 24 giờ do chu kỳ quang hợp của tảo vào ban ngày và quá trình hô hấp vào ban đêm. Kết quả đo lúc rạng sáng (05:00–05:30) và đầu giờ chiều (15:00–16:00) phản ánh hai trạng thái sinh thái hoàn toàn khác biệt, đóng vai trò quyết định trong việc điều chỉnh thời gian chạy quạt nước và phân bổ cữ cho ăn. Tìm hiểu thêm các ngưỡng khuyến nghị an toàn tại [Thông số chất lượng nước tôm thẻ chân trắng](/vi/resources/vannamei-water-quality-parameters).",
        "Ghi nhận hao hụt hàng ngày cần thống kê số lượng tôm chết thu gom tại lưới chắn rốn ao (central drain) hoặc lượn lờ ven bờ, quan sát độ đầy đường ruột (ruột đầy, ruột đứt khúc hay ruột rỗng) và đánh giá màu sắc khối gan tụy (nâu đen bóng, teo nhạt hay sưng viêm) khi kiểm tra tôm trên nhá.",
      ],
    },
    {
      heading: "Ma trận nhật ký trang trại tôm: Các chỉ số hàng ngày, hàng tuần và cả chu kỳ nuôi",
      body: [
        "Nhằm chuẩn hóa quy trình thu thập dữ liệu cho đội ngũ kỹ thuật và công nhân tại ao, trang trại nên áp dụng ma trận ghi chép dưới đây làm quy trình vận hành tiêu chuẩn (SOP):",
      ],
      table: {
        columns: ["Tần suất ghi chép", "Hạng mục nhật ký", "Thông số & Dữ liệu cốt lõi", "Mục tiêu & Quyết định can thiệp kỹ thuật"],
        rows: [
          [
            "Hàng ngày (Từng cữ cho ăn)",
            "Thức ăn & Kiểm tra nhá/vó",
            "Lượng cám (kg) mỗi cữ/ao, tỷ lệ thức ăn dư trên nhá (sau 1,5–2 giờ), sức ăn, mã thức ăn & số lô/batch",
            "Điều chỉnh tăng, giữ nguyên hoặc cắt giảm lượng thức ăn cữ kế tiếp nhằm ngăn ngừa dư thừa gây ô nhiễm và thối đáy ao",
          ],
          [
            "Hàng ngày (Rạng sáng & Đầu giờ chiều)",
            "Chất lượng nước then chốt",
            "DO rạng sáng (05:00) & DO chiều (15:00), nhiệt độ nước, pH sáng vs chiều, độ trong đĩa Secchi, màu nước ao",
            "Bố trí thời gian vận hành dàn quạt nước và oxy đáy, phát hiện sớm nguy cơ sụp tảo hoặc tảo nở hoa, hạn chế sốc môi trường cho tôm",
          ],
          [
            "Hàng ngày (Sáng sớm & Chiều tối)",
            "Tỷ lệ hao hụt & Dấu hiệu bệnh",
            "Số lượng tôm chết tại xi-phông đáy rốn ao/mặt lưới chắn, tôm tấp mé, độ đầy đường ruột, màu sắc gan tụy trên nhá",
            "Cảnh báo sớm nguy cơ bùng phát dịch bệnh (AHPND/hoại tử gan tụy cấp, EHP, đốm trắng WSSV, phân trắng), cách ly ao và rà soát an toàn sinh học",
          ],
          [
            "Định kỳ 2–3 ngày/lần",
            "Hóa lý nước chuyên sâu",
            "Độ kiềm (mg/L CaCO₃), tổng đạm amonia (TAN), nitrit (NO₂⁻), độ mặn (ppt), khoáng Canxi (Ca), Magie (Mg)",
            "Tính toán liều lượng tạt vôi/khoáng tạt nâng kiềm, bổ sung vi sinh xử lý khí độc (vi sinh nitrat hóa), điều chỉnh tần suất xi-phông",
          ],
          [
            "Hàng tuần (Bắt đầu từ DOC 30)",
            "Chài mẫu tăng trưởng",
            "Trọng lượng trung bình (ABW/MBW), tốc độ tăng trưởng ngày (ADG), độ đồng đều (hệ số biến thiên CV), sinh khối ước tính, tỷ lệ sống (SR)",
            "Hiệu chỉnh bảng định mức thức ăn hàng ngày theo sinh khối thực tế, đánh giá sức tải ao nuôi (carrying capacity), lập kế hoạch thu hoạch",
          ],
          [
            "Cả vụ nuôi (Thả giống đến Thu hoạch)",
            "Sản xuất, Chi phí & Tài chính",
            "Nguồn gốc giống PL, số lượng thả, sản lượng thu tỉa & thu toàn bộ, phân bổ size thương phẩm, FCR cả vụ, tổng chi phí cám/điện/nhân công, lợi nhuận ròng",
            "Đánh giá hiệu quả kinh tế (COGS/kg), so sánh hiệu suất giữa các ao, hoàn thiện hồ sơ truy xuất nguồn gốc (VietGAP, ASC, BAP)",
          ],
        ],
      },
    },
    {
      heading: "Nhật ký hàng tuần: Chài mẫu tăng trưởng, ước tính sinh khối và tỷ lệ sống (SR)",
      body: [
        "Đánh giá định kỳ hàng tuần đóng vai trò cầu nối giữa nhật ký vận hành hàng ngày và sản lượng thu hoạch cuối vụ. Báo cáo hàng tuần cần tổng hợp trọng lượng thân trung bình (MBW/ABW), tốc độ tăng trưởng bình quân ngày (ADG), ước tính sinh khối hiện diện trong ao (standing biomass), tỷ lệ sống dự kiến (survival rate / SR), tổng lượng thức ăn đã tiêu thụ lũy kế và xu hướng biến động chất lượng nước.",
        "Lưu ý quan trọng: số liệu chài mẫu tăng trưởng là quan sát sinh học thuần túy nhằm theo dõi sức lớn của tôm và cân đối lại khẩu phần ăn cho tuần kế tiếp. Số liệu chài mẫu tuyệt đối không được kích hoạt nghiệp vụ trừ kho cám, khác hoàn toàn với nhật ký cho ăn hàng ngày nơi lượng thức ăn thực tế xuất kho phải được khấu trừ tồn kho tức thì. Hãy đối chiếu các chỉ số hàng tuần này với bảng điểm tại [Hiệu suất ao nuôi](/vi/resources/pond-performance) để phát hiện sớm hiện tượng tôm bị chững lớn.",
      ],
    },
    {
      heading: "Hồ sơ tổng kết cả vụ: Thu hoạch, hạch toán tài chính và truy xuất nguồn gốc (Traceability)",
      body: [
        "Khi chu kỳ nuôi kết thúc, toàn bộ dữ liệu ao nuôi phải được tổng hợp vào bảng cân đối vụ nuôi hoàn chỉnh. Hồ sơ này lưu trữ ngày thả giống, trại sản xuất giống bố mẹ và phiếu xét nghiệm PCR sạch bệnh, nhật ký sử dụng chế phẩm sinh học và hóa chất xử lý, chi tiết sản lượng và bảng phân cỡ tôm (size) của từng đợt thu tỉa cũng như thu hoạch cạn ao, tổng lượng thức ăn tiêu thụ, hệ số chuyển đổi thức ăn thực tế (FCR), chi phí điện năng/dầu máy, tiền lương nhân công và doanh thu bán tôm thực nhận.",
        "Bên cạnh việc tính toán biên lợi nhuận ròng và giá thành sản xuất trên mỗi kg tôm thương phẩm (COGS), sự đầy đủ và minh bạch của nhật ký cả vụ là điều kiện tiên quyết để vượt qua các kỳ đánh giá chứng nhận quốc tế và nội địa (như VietGAP, GlobalG.A.P., ASC, BAP). Năng lực truy xuất nguồn gốc từ con giống, nguồn thức ăn đến sản phẩm tôm đông lạnh tại nhà máy chế biến chỉ có thể được chứng minh khi dữ liệu nhật ký ao nuôi được ghi chép trung thực, liên tục và chuẩn xác.",
      ],
    },
    {
      heading: "Chuyển đổi số từ sổ tay truyền thống sang nền tảng quản lý trang trại thông minh",
      body: [
        "Rất nhiều trang trại nuôi tôm hiện nay vẫn duy trì thói quen ghi chép vào các cuốn sổ tay bằng giấy để tại chòi ao hoặc nhập liệu rời rạc trên các bảng tính Excel cá nhân. Phương thức thủ công này bộc lộ nhiều điểm yếu: chữ viết tay mờ nhòe khó đọc, sổ sách dễ bị ướt hoặc rách nát ngoài hiện trường, chậm trễ trong việc báo cáo số liệu cho chủ trang trại, và dữ liệu quá khứ dễ thất lạc mỗi khi có sự thay đổi nhân sự kỹ thuật.",
        "Việc ứng dụng nền tảng số hóa như Shrimply cho phép kỹ thuật viên ghi nhận cữ ăn, thông số nước và số liệu chài mẫu trực tiếp trên điện thoại thông minh ngay tại bờ ao, kể cả khi mất kết nối mạng. Dữ liệu sẽ tự động đồng bộ ngay khi có mạng lên màn hình quản lý tập trung, kích hoạt cảnh báo tức thời khi các chỉ số nước chạm ngưỡng nguy hiểm, tự động tính toán đường cong tăng trưởng MBW, ADG, FCR và giúp chủ trang trại nắm bắt chính xác dòng tiền và chi phí sản xuất từng ngày.",
      ],
    },
  ],
  checklist: [
    "Ghi nhận lượng phân bổ thức ăn từng cữ, tỷ lệ thức ăn dư trên nhá/vó và biến động tồn kho cám vật lý theo thời gian thực.",
    "Đo đạc và lưu trữ các chỉ tiêu chất lượng nước then chốt (đặc biệt là DO và pH) tối thiểu 2 lần mỗi ngày vào các khung giờ cố định (rạng sáng và đầu giờ chiều).",
    "Thống kê số lượng tôm hao hụt hàng ngày, theo dõi hoạt động bơi lội và kiểm tra tình trạng gan tụy, đường ruột trên nhá.",
    "Tổ chức chài mẫu tăng trưởng định kỳ hàng tuần từ DOC 30 để cập nhật chính xác MBW, ADG, sinh khối ước tính và hệ số FCR lũy kế.",
    "Liên kết toàn bộ dữ liệu chài mẫu, chất lượng nước và chi phí vận hành trực tiếp với từng vụ nuôi của từng ao cụ thể.",
    "Duy trì buổi họp rà soát hiệu suất hàng tuần cùng đội ngũ kỹ thuật ao để kịp thời điều chỉnh kỹ thuật trước khi ao phát sinh sự cố.",
    "Ứng dụng [Phần mềm quản lý trang trại tôm](/vi/shrimp-farm-management-software) để số hóa toàn diện nhật ký ao nuôi và sẵn sàng cho các kỳ đánh giá truy xuất nguồn gốc ASC / BAP / VietGAP.",
  ],
  sources: [
    {
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
    {
      title: "How do I keep track of the results of feeding?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
  ],
};
