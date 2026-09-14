import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultNutritionReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-feed-index-calculation",
  section: "Thức ăn & Kho bãi",
  label: "Chỉ số sử dụng thức ăn",
  author: defaultResourceAuthorVI,
  reviewer: defaultNutritionReviewerVI,
  title: "Chỉ Số Thức Ăn Tôm: Cách Tính Lượng Thức Ăn Hàng Ngày Chuẩn Xác Không Cảm Tính",
  description: "Tìm hiểu phương pháp tính chỉ số thức ăn tôm để ước tính lượng thức ăn hàng ngày từ ngày nuôi (DOC), số lượng tôm và mục tiêu tăng trưởng (ADG)—cùng phương pháp điều chỉnh chuẩn xác theo dữ liệu thực tế tại ao.",
  readTime: "8 phút đọc",
  tags: [
    "chỉ số thức ăn tôm",
    "công thức tính chỉ số thức ăn",
    "lượng thức ăn tôm hàng ngày",
    "ngày nuôi DOC",
    "tốc độ tăng trưởng ADG",
    "tỷ lệ cho ăn theo trọng lượng thân",
    "kiểm tra nhá thức ăn",
    "quản lý thức ăn tôm thẻ chân trắng",
  ],
  publishedAt: "2026-08-28",
  image: {
    src: "/resources/images/shrimp-feed-index-calculation-infographic.png",
    alt: "Infographic Shrimply hướng dẫn cách kết hợp ngày nuôi (DOC), số lượng tôm, mục tiêu ADG, kiểm tra nhá thức ăn, số liệu chài mẫu, chất lượng nước và tỷ lệ hao hụt để tính toán chỉ số thức ăn hàng ngày",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần mềm Quản lý Thức ăn & Kho bãi", href: "/vi/features/feed-inventory" },
  takeaways: [
    "Chỉ số thức ăn cung cấp khẩu phần ăn khởi điểm hàng ngày dựa trên ngày nuôi (DOC), số lượng tôm trong ao và mục tiêu tăng trưởng bình quân ngày (ADG).",
    "Kiểm tra nhá thức ăn, chài mẫu tăng trưởng, tỷ lệ sống (SR), số lượng tôm hao hụt, thu tỉa và chất lượng nước thực tế là căn cứ quyết định để chốt lượng thức ăn cuối cùng.",
    "Chỉ số thức ăn là công cụ dự trù định mức cho tương lai, trong khi hệ số FCR đánh giá hiệu quả chuyển hóa thức ăn thành sinh khối trong quá khứ.",
  ],
  faqs: [
    {
      question: "Cách tính khẩu phần thức ăn hàng ngày theo chỉ số thức ăn như thế nào?",
      answer: "Công thức thực tế thường dùng là: Lượng thức ăn hàng ngày (kg) = Ngày nuôi (DOC) × Số lượng tôm trong ao × (Chỉ số thức ăn ÷ 100) ÷ 1.000. Hãy xem kết quả tính toán là khẩu phần khởi điểm và luôn điều chỉnh linh hoạt dựa trên quan sát thực tế tại ao và kiểm tra nhá thức ăn.",
    },
    {
      question: "Chỉ số thức ăn (Feed Index) có giống với hệ số FCR không?",
      answer: "Không. Chỉ số thức ăn là công cụ lập kế hoạch dự trù khẩu phần ăn trước khi cho ăn, còn FCR (hệ số chuyển đổi thức ăn) so sánh lượng thức ăn đã tiêu thụ với lượng sinh khối tôm thực tế thu được.",
    },
  ],
  sections: [
    {
      heading: "Tóm tắt nhanh",
      body: [
        "Chỉ số thức ăn (Feed Index) là phương pháp lập kế hoạch được sử dụng để ước tính lượng thức ăn mà ao tôm cần tiếp nhận mỗi ngày. Phương pháp này dựa trên số ngày nuôi (DOC), số lượng tôm hiện diện trong ao và một chỉ số định mức gắn liền với tốc độ tăng trưởng bình quân hàng ngày mục tiêu (ADG).",
        "Kết quả tính toán chỉ là khẩu phần ăn khởi điểm. Việc kiểm tra nhá thức ăn (sàn ăn/vó), chài mẫu kiểm tra tôm, tỷ lệ sống (SR), số lượng tôm hao hụt, các đợt thu tỉa và diễn biến chất lượng nước ao vẫn là những căn cứ quan trọng nhất để điều chỉnh lượng thức ăn thực tế cuối cùng.",
      ],
    },
    {
      heading: "Công thức tính chỉ số thức ăn tôm",
      body: [
        "Công thức phổ biến trong quản lý ao tôm thương phẩm là: Lượng thức ăn hàng ngày (kg) = DOC × Số lượng tôm trong ao × (Chỉ số thức ăn ÷ 100) ÷ 1.000.",
        "Ví dụ minh họa: Một ao nuôi ở ngày thứ 30 (DOC 30) với số lượng ước tính 100.000 con tôm và áp dụng chỉ số thức ăn 0,40: 30 × 100.000 × (0,40 ÷ 100) ÷ 1.000 = 12 kg/ngày.",
        "Như vậy, định mức thức ăn khởi điểm cho ngày hôm đó là 12 kg, được chia đều cho các cữ ăn trong ngày theo lịch trình cho ăn của trang trại (ví dụ 4 hoặc 5 cữ ăn mỗi ngày).",
      ],
    },
    {
      heading: "Cách lựa chọn chỉ số thức ăn phù hợp",
      body: [
        "Nhiều trang trại thường bắt đầu với chỉ số thức ăn gấp khoảng 1,5 đến 2 lần tốc độ tăng trưởng bình quân ngày mục tiêu (ADG). Ví dụ, nếu mục tiêu ADG là 0,20 g/ngày, chỉ số thức ăn khởi điểm thường được chọn trong khoảng 0,30 đến 0,40.",
        "Đây là quy ước kinh nghiệm trong lập kế hoạch vận hành trại, không phải là một quy luật sinh học bất biến. Chỉ số chính xác phụ thuộc vào kích cỡ tôm (MBW), chất lượng và hàm lượng đạm thức ăn, mật độ thả giống, tỷ lệ sống (SR), điều kiện môi trường đáy ao, phương thức cho ăn (rải tay hay máy cho ăn tự động) và dữ liệu thực tế từ các vụ nuôi trước.",
      ],
    },
    {
      heading: "Phân biệt chỉ số thức ăn, tỷ lệ cho ăn và hệ số FCR",
      body: [
        "Chỉ số thức ăn hướng về tương lai (dự trù trước). Hệ số FCR nhìn về quá khứ (đánh giá lại). Không có bất kỳ chỉ số nào nên được xem xét đơn lẻ mà không đối chiếu với bức tranh tổng thể của ao.",
      ],
      table: {
        columns: ["Chỉ số / Phương pháp", "Mục đích chính", "Thời điểm áp dụng"],
        rows: [
          [
            "Chỉ số thức ăn (Feed Index)",
            "Lập kế hoạch lượng thức ăn hàng ngày dựa trên ngày nuôi (DOC), số lượng tôm và mục tiêu tăng trưởng",
            "Trước khi cho ăn (dự trù định mức hàng ngày)",
          ],
          [
            "Tỷ lệ cho ăn (Feed Rate - % thân)",
            "Tính toán lượng thức ăn theo tỷ lệ phần trăm sinh khối tôm ước tính trong ao",
            "Sau khi có số liệu chài mẫu tôm chuẩn xác",
          ],
          [
            "Hệ số FCR (Chuyển đổi thức ăn)",
            "So sánh tổng lượng thức ăn đã tiêu thụ với lượng sinh khối tôm gia tăng",
            "Trong các buổi đánh giá định kỳ hoặc sau khi thu hoạch",
          ],
        ],
      },
    },
    {
      heading: "Nguyên nhân khiến phép tính chỉ số thức ăn bị sai lệch",
      body: [
        "Công thức này có thể tính dư thừa thức ăn (overfeeding) nếu người nuôi tiếp tục dùng số lượng tôm thả ban đầu mà không cập nhật số tôm hao hụt hoặc số tôm đã đánh bắt sau các đợt thu tỉa. Ngược lại, công thức có thể ước tính thiếu thức ăn (underfeeding) khi tôm phát triển nhanh hơn dự kiến hoặc khi chỉ số thức ăn lựa chọn quá thấp.",
        "Sai số khi chài mẫu cũng có thể làm sai lệch quyết định cho ăn. Một mẻ chài thu gom phần lớn tôm to, hoạt động mạnh ở gần quạt nước sẽ làm thổi phồng trọng lượng bình quân thân (MBW) và tổng sinh khối ước tính của cả ao.",
        "Tài liệu hướng dẫn của FAO (Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc) nhấn mạnh rằng kế hoạch cho ăn phải liên tục thích ứng với kích cỡ tôm, tỷ lệ sống ước tính, điều kiện môi trường nước ao và hành vi bắt mồi thực tế trên nhá—chứ không duy trì cố định một con số trong suốt cả vụ nuôi.",
      ],
    },
    {
      heading: "Quy trình điều chỉnh lượng thức ăn an toàn",
      body: [
        "Công tác quản lý thức ăn phải liên tục điều chỉnh theo đà phát triển của đàn tôm và sự thay đổi của môi trường ao nuôi.",
      ],
      ordered: true,
      items: [
        "Kiểm tra nhiều nhá (vó) thức ăn đồng thời: Một chiếc nhá hết sạch hay còn đầy thức ăn không đủ để đại diện cho toàn bộ đáy ao.",
        "Đối chiếu kết quả chài mẫu mới nhất: So sánh trọng lượng thân trung bình (MBW) và tốc độ tăng trưởng hàng ngày (ADG) thực tế với mục tiêu ban đầu.",
        "Cập nhật lại số lượng tôm thực tế: Điều chỉnh số lượng tôm dựa trên số lượng tôm hao hụt ghi nhận hàng ngày và các đợt thu tỉa.",
        "Đo đạc kỹ các chỉ tiêu chất lượng nước: Kiểm tra nồng độ oxy hòa tan (DO), nhiệt độ nước, độ pH, amonia tự do (NH3/TAN) và nitrit (NO2-) trước khi quyết định tăng thức ăn.",
        "Điều chỉnh từng bước thận trọng: Tránh tăng mạnh lượng thức ăn chỉ dựa trên kết quả của một cữ nhá ăn tốt duy nhất.",
        "Xác nhận và theo dõi phản ứng của ao: Quan sát các cữ nhá tiếp theo, các chỉ số môi trường nước, tỷ lệ hao hụt đáy ao và kết quả chài mẫu định kỳ.",
      ],
      note: "Tuyệt đối không tự động tăng thức ăn mỗi ngày chỉ vì công thức toán học chỉ định như vậy. Bảng tính không thể phát hiện được hiện tượng tôm giảm ăn, chu kỳ lột xác đồng loạt, tình trạng thiếu oxy rạng sáng, nguy cơ dịch bệnh hay sai lệch trong ước tính tỷ lệ sống.",
    },
    {
      heading: "Dấu hiệu cảnh báo cần rà soát lại chỉ số thức ăn",
      body: [
        "Dấu hiệu cảnh báo dư thừa thức ăn (overfeeding) bao gồm: Thức ăn còn thừa lặp đi lặp lại trên nhiều nhá, hệ số FCR tăng trong khi ADG chững lại, lượng thức ăn sử dụng tăng nhanh hơn mức tăng sinh khối, nồng độ oxy hòa tan (DO) lúc sáng sớm sụt giảm, hoặc nồng độ amonia (TAN), nitrit (NO2-), bùn đen và chất hữu cơ tích tụ nhiều ở rốn ao.",
        "Dấu hiệu cảnh báo thiếu thức ăn (underfeeding) bao gồm: Nhá thức ăn hết sạch nhanh bất thường trong nhiều cữ kiểm tra liên tiếp, tốc độ tăng trưởng (ADG) vẫn dưới mức mục tiêu dù chất lượng nước tốt và tôm khỏe mạnh, thức ăn phân bổ không đều, hoặc số lượng tôm và sinh khối thực tế trong ao lớn hơn ước tính.",
        "Các dấu hiệu trên là cảnh báo vận hành chứ không phải bằng chứng kết luận. Hãy kiểm tra toàn diện nhật ký ao nuôi trước khi quyết định thay đổi khẩu phần ăn.",
      ],
    },
    {
      heading: "Ứng dụng Shrimply để theo dõi và chuẩn hóa chỉ số thức ăn",
      body: [
        "Ghi chép lượng thức ăn thực tế trong [Lịch sử cho ăn](/vi/features/feed-inventory). Sử dụng tính năng [Chài mẫu tăng trưởng](/vi/features/growth-sampling) để so sánh MBW và ADG với mục tiêu tăng trọng. Ghi nhận số lượng tôm hao hụt và các đợt thu tỉa để số lượng tôm ước tính luôn sát với thực tế.",
        "Đối chiếu sự thay đổi thức ăn với diễn biến tại [Giám sát chất lượng nước](/vi/features/water-quality-monitoring), đồng thời đối soát lượng thức ăn sử dụng với [Kho thức ăn](/vi/features/feed-inventory) trước khi tin tưởng vào số liệu FCR. Dữ liệu chài mẫu chỉ dùng để theo dõi tăng trưởng sinh học và tuyệt đối không trừ tồn kho thức ăn; chỉ những cữ cho ăn thực tế mới được phép ghi giảm kho.",
        "Nếu trang trại áp dụng phương pháp tỷ lệ phần trăm theo sinh khối thay vì đường cong chỉ số theo ngày tuổi DOC, hãy sử dụng [Bảng tra & Công cụ tính tỷ lệ cho ăn tôm thẻ chân trắng](/vi/resources/vannamei-feeding-rate) làm mốc tham chiếu khởi điểm.",
      ],
    },
    {
      heading: "Khi nào cần tham vấn ý kiến chuyên gia thủy sản",
      body: [
        "Cần xin ý kiến tư vấn từ chuyên gia kỹ thuật khi phản xạ bắt mồi của tôm vẫn yếu kéo dài, tôm chết rải rác tiếp diễn, tôm có biểu hiện bơi lờ đờ bất thường, các chỉ số chất lượng nước dao động bất ổn, hoặc tốc độ tăng trưởng sụt giảm dù nhật ký cho ăn và chài mẫu đều đáng tin cậy. Tuyệt đối không vội chẩn đoán dịch bệnh chỉ dựa vào lượng thức ăn dư trên nhá hay tình trạng tôm chậm lớn.",
      ],
    },
  ],
  checklist: [
    "Tính toán khẩu phần thức ăn khởi điểm từ ngày nuôi (DOC), số lượng tôm ước tính và chỉ số thức ăn mục tiêu của trang trại.",
    "Xem kết quả tính toán là định mức tham khảo ban đầu, không phải là chỉ dẫn cho ăn tự động thiếu kiểm soát.",
    "Kiểm tra đồng thời nhiều nhá thức ăn và rà soát các số liệu gần nhất về MBW, ADG, hao hụt, thu tỉa và chất lượng nước.",
    "Cập nhật lại số lượng tôm trong ao khi có dữ liệu chính xác về tôm hao hụt hoặc sau các đợt thu tỉa.",
    "Điều chỉnh lượng thức ăn từng bước thận trọng và kiểm chứng phản xạ ăn của đàn tôm trước khi thực hiện điều chỉnh tiếp theo.",
  ],
  sources: [
    {
      title: "Monte Carlo Algorithm Applications in Shrimp Farming: Monitoring Systems and Feed Optimization",
      publisher: "International Journal of New Media Technology",
      url: "https://ejournals.umn.ac.id/index.php/IJNMT/article/download/4301/1780/19422",
    },
    {
      title: "How Much Feed Will They Need? How Do I Feed and How Often?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e09.htm",
    },
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
  ],
};
