import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-harvest-tracking",
  section: "Thu hoạch & Tài chính",
  label: "Theo dõi thu hoạch",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Ghi Chép & Theo Dõi Thu Hoạch Tôm: Những Điều Cần Lưu Ý Trước, Trong và Sau Thu Hoạch (Thu Tỉa & Thu Dứt Điểm)",
  description:
    "Cẩm nang thực hành ghi chép và theo dõi thu hoạch tôm thẻ chân trắng thương phẩm: khi nào nên thu tỉa (Partial harvest) hoặc thu dứt điểm (Final harvest), biểu mẫu ghi chép tại bờ ao, phân cỡ size tôm (con/kg), quản lý chuỗi lạnh (Cold chain), kiểm soát hao hụt trọng lượng (Drip loss/Shrinkage) và đối soát sản lượng cuối vụ để tính FCR và lợi nhuận thực tế.",
  readTime: "7 phút đọc",
  tags: [
    "ghi chép thu hoạch tôm",
    "thu hoạch tôm thẻ chân trắng",
    "thu tỉa tôm (Partial harvest)",
    "thu dứt điểm ao tôm (Final harvest)",
    "kích cỡ tôm (con/kg)",
    "hao hụt trọng lượng tôm (Shrinkage)",
    "chuỗi lạnh bảo quản tôm (Cold chain)",
    "thương lái và nhà máy chế biến",
    "giá tôm thương phẩm",
    "đối soát vụ nuôi (Cycle reconciliation)",
  ],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-harvest-tracking-partial-final-harvest.jpg",
    alt: "Đồ họa hướng dẫn ghi chép và theo dõi thu hoạch tôm thẻ chân trắng, minh họa quy trình thu tỉa, thu dứt điểm, cân trọng lượng bờ ao, phân cỡ kích thước, giá bán và đối soát vụ nuôi",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Phần mềm ghi chép & theo dõi thu hoạch tôm", href: "/vi/features/shrimp-harvest-tracking" },
  takeaways: [
    "Dữ liệu thu hoạch phải phân tách rạch ròi giữa thu tỉa giảm mật độ (Partial harvest / Thinning) và thu dứt điểm kết thúc vụ nuôi (Final harvest).",
    "Số liệu thu tỉa ảnh hưởng trực tiếp đến việc tính toán sinh khối còn lại trong ao và quyết định cắt giảm khẩu phần ăn hàng ngày, nhằm tránh nguy cơ dư thừa thức ăn (Overfeeding) làm sập chất lượng nước đáy ao.",
    "Ghi chép chính xác trọng lượng cân bờ ao, phân cỡ size tôm, tỷ lệ loại thải (Reject) và hao hụt mất nước (Drip loss) là cầu nối biến các chỉ số sinh học thành báo cáo tài chính và truy xuất nguồn gốc (Traceability) minh bạch.",
  ],
  faqs: [
    {
      question: "Thời điểm nào là thích hợp nhất để thu hoạch dứt điểm ao tôm thẻ chân trắng?",
      answer:
        "Thời điểm thu dứt điểm không chỉ dựa vào số ngày nuôi (DOC), mà là bài toán cân đối giữa sinh học, kinh tế và môi trường ao: (1) Kích cỡ tôm đạt khoảng size thị trường có giá tốt nhất (ví dụ size 30–50 con/kg); (2) Tốc độ tăng trưởng hàng ngày (ADG) bắt đầu chững lại, chi phí thức ăn cho mỗi gram tăng trọng không còn sinh lời; (3) Sinh khối trong ao chạm hoặc vượt ngưỡng sức tải (Carrying capacity), đặc biệt là công suất quạt nước (khuyến cáo không vượt quá 400–500 kg tôm/HP quạt); (4) Môi trường nước có dấu hiệu bất lợi như nitrit (NO₂⁻) tăng cao kéo dài hoặc DO rạng sáng giảm dưới 4.0 mg/L liên tục; và (5) Lịch thu mua thuận lợi của thương lái hoặc nhà máy chế biến. Trường hợp xuất hiện dấu hiệu dịch bệnh cấp tính nguy hiểm (như WSSV hoặc AHPND), quyết định thu khẩn cấp (Emergency harvest) ngay lập tức là giải pháp tối ưu để bảo toàn vốn.",
    },
    {
      question: "Những thông tin trọng yếu nào bắt buộc phải ghi chép khi tiến hành thu tỉa (Partial harvest)?",
      answer:
        "Khi thu tỉa, cần ghi chép đầy đủ: Ngày giờ thực hiện, mã định danh ao, số mẻ lưới kéo, tổng trọng lượng cả bì (Gross weight), trọng lượng trừ bì rổ/sọt (Tare weight), trọng lượng tôm tịnh (Net weight), kích cỡ bình quân (con/kg) và trọng lượng thân bình quân (MBW), tên thương lái/đơn vị thu mua, đơn giá ký kết trên từng cỡ size, và tỷ lệ tôm mềm/tôm dập loại thải. Ngay khi kết thúc thu tỉa, phải tính tổng số con đã lấy ra khỏi ao [Số con = Khối lượng thu (kg) × Số con/kg] và trừ khỏi số lượng ước tính ban đầu để cập nhật lại sinh khối tồn ao, đồng thời lập tức giảm lượng thức ăn ở cữ tiếp theo để tránh dư thừa gây ô nhiễm đáy ao.",
    },
    {
      question: "Làm thế nào để kiểm soát và giảm thiểu hao hụt trọng lượng (Weight loss / Shrinkage / Drip loss) từ bờ ao đến nhà máy?",
      answer:
        "Để hạn chế hao hụt mất nước thịt tôm: (1) Sốc nhiệt nước đá lập tức (Slurry ice chilling) ở nhiệt độ 0–2°C ngay khi tôm được kéo lên bờ để tôm bất tỉnh nhanh, cơ thịt săn chắc và không mất dịch tế bào; (2) Thực hiện róc nước (Draining) ổn định từ 30–60 giây trước khi đặt lên cân điện tử tại bờ ao để trọng lượng cân không bị ảo do ngậm nước; (3) Đảm bảo tỷ lệ đá/tôm tối thiểu 1:1 (hoặc 1.2:1 nếu vận chuyển xa liên tỉnh), đóng trong thùng xốp hoặc thùng composite cách nhiệt, rải đá xen kẽ từng lớp; và (4) Hiệu chuẩn cân điện tử bằng quả cân chuẩn trước sự chứng kiến của bên mua. Mức hao hụt vận chuyển thông thường chấp nhận được là 1–2%. Nếu vượt quá 3–4%, cần kiểm tra lại nhiệt độ thùng hàng, thời gian di chuyển và tỷ lệ đá ướp.",
    },
    {
      question: "Tại sao bắt buộc phải cắt ăn (ngừng cho ăn) trước khi kéo thu hoạch tôm?",
      answer:
        "Trang trại phải ngừng cho ăn trước thời điểm kéo lưới tối thiểu từ 4 đến 8 giờ để tôm tiêu hóa hết và bài tiết sạch phân trong đường ruột. Nếu tôm còn đầy thức ăn hoặc bùn bã trong ruột, khi ngâm đá và vận chuyển, đường ruột rất dễ bị vỡ nát dưới áp lực cơ học. Hiện tượng này kích hoạt quá trình tự phân hủy bởi enzyme nội tạng (Autolysis), vi khuẩn yếm khí bùng phát nhanh làm đầu tôm bị mềm, lỏng đầu, thâm đen (Melanosis / Black spot) và bốc mùi tanh. Tôm bị vỡ ruột sẽ bị nhà máy đánh tụt phẩm cấp thành tôm dạt, tôm thứ cấp và trừ giá rất nặng.",
    },
    {
      question: "Làm sao để tránh thu hoạch trúng thời điểm tôm đang lột vỏ mềm (Soft-shell)?",
      answer:
        "Tránh lên lịch thu hoạch trùng với chu kỳ lột xác rộ của ao, thường diễn ra vào các kỳ trăng non hoặc trăng rằm (kỳ con nước mùng 1 và ngày rằm âm lịch). Trước ngày thu hoạch dự kiến 2–3 ngày, cần quăng chài kiểm tra mẫu vỏ tôm trên toàn ao; ao chỉ được phép thu hoạch khi tỷ lệ tôm vỏ cứng đạt trên 90%. Nếu phát hiện tỷ lệ tôm mềm hoặc mới lột còn cao, cần hoãn thu 1–2 ngày và tạt bổ sung các khoáng chất tăng độ cứng vỏ nhanh như Canxi Clorua (CaCl₂), Magie Sunfat (MgSO₄), vôi Dolomite hoặc Sodium Bicarbonate (NaHCO₃). Tôm thu khi còn mềm vỏ sẽ mất nước rất nhanh, dễ dập nát và bị trừ giá nặng.",
    },
    {
      question: "Quy trình đối soát vụ nuôi (Cycle reconciliation) để tính FCR thực tế và lợi nhuận ròng gồm những bước nào?",
      answer:
        "Quy trình đối soát gồm: Tổng hợp toàn bộ sản lượng tôm thương phẩm thực tế bán được (cả các đợt thu tỉa và đợt thu dứt điểm cuối vụ). Lấy tổng lượng thức ăn xuất kho sử dụng thực tế chia cho tổng sản lượng tôm thu hoạch để xác định hệ số chuyển đổi thức ăn thực tế (Actual FCR). Lấy tổng doanh thu bán tôm trừ đi toàn bộ chi phí sản xuất (thức ăn, tôm giống, điện/dầu, nhân công, chế phẩm sinh học/hóa chất, chi phí chuẩn bị ao và thu hoạch) để xác định giá thành sản xuất trên mỗi kg tôm (COGS/kg) và lợi nhuận ròng. Cuối cùng, so sánh trọng lượng mẫu chài cuối cùng (MBW) với cỡ size thực tế trên bàn cân để đánh giá độ chuẩn xác của kỹ thuật lấy mẫu nhằm cải tiến cho vụ sau.",
    },
  ],
  sections: [
    {
      heading: "Tầm quan trọng của dữ liệu thu hoạch: Chuyển đổi chỉ số sinh học thành tài chính thực tế",
      body: [
        "Ngày thu hoạch là thời khắc quan trọng nhất khi toàn bộ các chỉ số sinh học tích lũy trong ao suốt nhiều tháng được quy đổi thành giá trị kinh tế và dòng tiền thực tế. Trong suốt chu kỳ nuôi, người quản lý và kỹ thuật viên ao nuôi luôn theo dõi ước tính sinh khối, sức ăn trên vó, tốc độ tăng trưởng hàng ngày (ADG) và trọng lượng thân bình quân (MBW). Tuy nhiên, tất cả những con số đó vẫn chỉ là dữ liệu ước đoán trên mô hình cho đến khi mẻ lưới được kéo lên và từng rổ tôm đặt lên bàn cân thương phẩm.",
        "Việc theo dõi thu hoạch tôm thẻ chân trắng (Litopenaeus vannamei) trong các trang trại thâm canh và siêu thâm canh đòi hỏi sự ghi chép chi tiết, toàn diện: mã ao, ngày giờ thu, số ngày nuôi (DOC), phương pháp thu (kéo lưới đáy ao, thu cống xả túi lưới Monk gate hay dùng máy hút tôm), tổng trọng lượng cả bì, trọng lượng trừ bì sọt rổ, khối lượng tôm tịnh thương phẩm, biểu phân bố kích cỡ size (con/kg), đơn vị thu mua/thương lái, đơn giá theo size, tỷ lệ tôm dạt/tôm mềm loại thải, và chứng từ đối soát thanh toán.",
        "Ngoài việc bảo đảm doanh thu minh bạch, hồ sơ thu hoạch đầy đủ là điều kiện tiên quyết phục vụ truy xuất nguồn gốc (Traceability) theo các tiêu chuẩn thực hành nuôi trồng thủy sản tốt như VietGAP, GlobalG.A.P., BAP hay ASC. Tất cả dữ liệu này có thể được đồng bộ và phân tích trực tiếp qua [phần mềm ghi chép & theo dõi thu hoạch tôm](/vi/features/shrimp-harvest-tracking).",
      ],
    },
    {
      heading: "Bảng so sánh thực hành: Thu tỉa giảm mật độ (Partial Harvest) vs Thu dứt điểm (Final Harvest)",
      body: [
        "Trong kỹ thuật nuôi tôm thẻ mật độ cao, người nuôi thường phải đưa ra quyết định chiến lược giữa thu tỉa từng phần (Partial harvest / Thinning) nhằm giảm áp lực môi trường ao và thu dứt điểm toàn bộ ao (Final harvest) khi kết thúc vụ. Hai phương án này có mục đích, tác động sinh học và yêu cầu ghi chép hoàn toàn khác nhau:",
      ],
      table: {
        columns: ["Tiêu chí so sánh", "Thu tỉa một phần (Partial Harvest / Thinning)", "Thu dứt điểm (Final Harvest)"],
        rows: [
          [
            "Mục đích chính",
            "Giải tỏa sinh khối khi ao chạm ngưỡng sức tải (Carrying capacity), giảm nhu cầu oxy hòa tan (DO), giảm lượng chất thải bài tiết tích lũy đáy ao, thu hồi dòng tiền sớm để thanh toán tiền thức ăn và tạo không gian cho lượng tôm còn lại bứt size lớn nhanh hơn.",
            "Kết thúc toàn bộ chu kỳ nuôi của ao, chuyển hóa 100% sinh khối còn lại thành doanh thu bằng tiền mặt, tháo cạn nước để chuẩn bị vệ sinh, xịt rửa bạt, phơi ao và diệt khuẩn phục vụ vụ nuôi kế tiếp.",
          ],
          [
            "Giai đoạn nuôi (DOC)",
            "Thường thực hiện ở giai đoạn DOC 60–80 khi tôm đạt cỡ size 60–80 con/kg và sinh khối trong ao bắt đầu chạm ngưỡng giới hạn của hệ thống sục khí quạt nước (ví dụ > 1.000–1.200 kg/ao).",
            "Thực hiện ở giai đoạn DOC 85–120+ khi tôm đạt size mục tiêu tối ưu của thị trường (size 30–50 con/kg) hoặc khi tốc độ tăng trưởng (ADG) chững lại không còn bù đắp nổi tiền thức ăn mỗi ngày.",
          ],
          [
            "Phương pháp & Thiết bị",
            "Sử dụng lưới kéo chọn lọc mắt lưới phù hợp hoặc chài chuyên dụng mà không cần rút cạn nước ao; có thể hạ mực nước nhẹ 10–20% tạm thời để thao tác kéo lưới thuận lợi.",
            "Xả cạn nước ao qua cống thoát nước đáy (Monk gate) có gắn túi lưới thu tôm chuyên dụng, dùng máy bơm hút tôm, kết hợp nhân công lội bắt sạch toàn bộ tôm sót đáy ao.",
          ],
          [
            "Tác động đến ao nuôi",
            "Có thể làm xáo trộn lớp bùn đáy ao nếu lưới cào sát đáy, khiến lượng tôm còn lại bị sốc nhẹ hoặc giảm ăn tạm thời trong 1–2 cữ tiếp theo.",
            "Hệ sinh thái ao kết thúc hoàn toàn; bùn thải và mùn bã hữu cơ đáy ao lộ rõ để triển khai ngay các biện pháp hút bùn, xịt rửa bạt và xử lý an toàn sinh học.",
          ],
          [
            "Thao tác kỹ thuật tức thì",
            "Cập nhật ngay số lượng con và sinh khối tồn ao mới vào phần mềm; cắt giảm ngay 20–35% lượng thức ăn hàng ngày ở cữ kế tiếp; chạy tối đa quạt nước và kiểm tra sát sao các chỉ số nước.",
            "Đối soát tổng lượng thức ăn đã xuất kho thực tế với tổng kg tôm thu được; tính hệ số FCR cuối vụ, tỷ lệ sống (SR) thực tế và lợi nhuận ròng; đóng trạng thái vụ nuôi trên hệ thống.",
          ],
          [
            "Tham số ghi chép trọng tâm",
            "Khối lượng tôm tỉa ra, phân bố size thu được, số lượng con ước tính lấy đi, tính toán lại sinh khối tồn ao và điều chỉnh đường cong định mức cho ăn (Feeding rate).",
            "Sản lượng mẻ cuối, tổng sản lượng lũy kế toàn vụ (thu tỉa + thu dứt điểm), size bình quân cuối vụ, tỷ lệ tôm loại thải toàn bộ và chốt sổ tồn kho thức ăn.",
          ],
        ],
      },
      note: "Sai lầm nguy hiểm và phổ biến nhất sau khi thu tỉa là chậm điều chỉnh giảm khẩu phần thức ăn. Nếu lấy đi 25–35% sinh khối tôm nhưng vẫn giữ nguyên lượng cám cho ăn như cũ, ao sẽ rơi vào tình trạng dư thừa thức ăn nghiêm trọng trong 24 giờ đầu. Thức ăn dư chìm xuống đáy sẽ thối rữa nhanh chóng, đẩy nồng độ khí độc NH₃ và NO₂⁻ tăng vọt, đe dọa trực tiếp lượng tôm còn lại trong ao.",
    },
    {
      heading: "Quy chuẩn bảo quản sau thu hoạch, chuỗi lạnh và kiểm soát hao hụt (Shrinkage)",
      body: [
        "Độ tươi ngon và chất lượng thịt tôm sau thu hoạch quyết định trực tiếp đến giá thành thương phẩm và tỷ lệ chấp thuận của các nhà máy chế biến xuất khẩu. Quy trình xử lý sau thu hoạch không chuẩn xác có thể khiến tôm mất phẩm chất nhanh chóng, mềm vỏ, vỡ đầu và hao hụt trọng lượng (Drip loss / Shrinkage) nghiêm trọng. Người nuôi cần tuân thủ nghiêm ngặt 3 nguyên tắc kỹ thuật cốt lõi:",
        "1. Chuẩn bị trước thu hoạch & Cắt ăn (Pre-Harvest Preparation & Fasting): Ngừng cho ăn trước giờ kéo tôm tối thiểu 4 đến 8 tiếng để tôm tống sạch phân trong ruột, ngăn ngừa nguy cơ vỡ ruột gây lỏng đầu và nhiễm khuẩn. Đồng thời, kiểm tra chu kỳ lột xác bằng cách chài mẫu trước 2–3 ngày và đánh tăng cường khoáng chất cứng vỏ (như CaCl₂, MgSO₄, Dolomite) để bảo đảm tỷ lệ tôm vỏ cứng chắc (Hard-shell) đạt trên 90%.",
        "2. Quản lý chuỗi lạnh (Cold Chain) & Sốc nhiệt nước đá (Thermal Shock Chilling): Ngay khi tôm được đưa lên khỏi ao, rửa sạch bùn nhớt bằng nước sạch có độ mặn tương đồng với nước ao. Sau đó đưa ngay tôm vào bể sốc nhiệt chứa nước đá sệt (Slurry ice) được duy trì ổn định ở nhiệt độ 0–2°C. Nhiệt độ lạnh sâu lập tức làm tôm tê liệt bất tỉnh, ức chế enzyme nội tại phá hủy mô cơ thịt và ngăn chặn phản ứng tạo đốm đen (Melanosis). Đóng tôm vào thùng bảo ôn cách nhiệt với tỷ lệ đá:tôm tối thiểu 1:1, rải đá đều từng lớp xen kẽ.",
        "3. Róc nước & Kiểm soát hao hụt trọng lượng (Draining & Shrinkage Control): Trước khi đặt sọt tôm lên bàn cân điện tử, phải để róc nước đều đặn từ 30 đến 60 giây cho mỗi mẻ cân nhằm loại bỏ nước thừa, bảo đảm trọng lượng cân thực chất. Luôn kiểm tra độ chính xác của cân với quả cân chuẩn trước sự chứng kiến của người mua. Tỷ lệ hao hụt thông thường do mất nước mô trong quá trình vận chuyển bờ ao đến nhà máy là 1% đến 2%. Nếu hao hụt vượt quá 3%, cần rà soát lại lượng đá ướp và thời gian vận chuyển.",
      ],
    },
    {
      heading: "Biểu mẫu quy trình ghi chép thu hoạch: Các bước trước, trong và sau thu hoạch",
      body: [
        "Để bảo đảm tính chính xác, minh bạch và làm cơ sở hạch toán tài chính vụ nuôi, quy trình ghi chép thu hoạch được chia làm 3 giai đoạn rõ rệt:",
      ],
      items: [
        "Giai đoạn trước thu hoạch (Chuẩn bị / Trước 1–3 ngày): Chài mẫu kiểm tra trọng lượng thân bình quân (MBW), phân bố size (con/kg), độ đồng đều và tỷ lệ vỏ cứng (>90%); chốt biểu giá thu mua theo từng nhóm size, tỷ lệ trừ bì và lịch điều xe của thương lái; chuẩn bị đá lạnh chất lượng cao với định mức tối thiểu 1 tấn đá/1 tấn tôm dự kiến thu; thông báo lệnh ngừng cho ăn trước giờ kéo 4–8 tiếng.",
        "Giai đoạn trong thu hoạch (Ngày kéo thực tế tại bờ ao): Ghi chép số thứ tự rổ/sọt, trọng lượng cả bì, trọng lượng trừ bì và khối lượng tôm tịnh vào phiếu cân (Tally sheet) theo thời gian thực; đếm mẫu số con mỗi 500 kg tôm để xác định cỡ size thực tế cùng thương lái; cân riêng lượng tôm dạt, tôm mềm hoặc tôm khuyết tật; kiểm tra nhiệt độ thùng bảo ôn luôn dưới 4°C; ký biên bản xác nhận sản lượng với đại diện thu mua sau mỗi chuyến xe.",
        "Giai đoạn sau thu hoạch (Cập nhật dữ liệu và đối soát): Đối với thu tỉa, nhập ngay số liệu vào hệ thống quản lý ao để trừ bớt số con, ước tính lại sinh khối tồn và chỉ đạo giảm khẩu phần cữ sau; đối với thu dứt điểm, thu thập toàn bộ phiếu cân và hóa đơn thanh toán để tổng kết doanh thu, đối chiếu kho thức ăn nhằm tính FCR, tỷ lệ sống (SR) và lợi nhuận ròng cuối vụ.",
      ],
    },
    {
      heading: "Đối soát vụ nuôi (Cycle Reconciliation): Kết nối dữ liệu thu hoạch với các chỉ số sinh học và tài chính",
      body: [
        "Dữ liệu thu hoạch phát huy giá trị lớn nhất khi được kết nối ngược trở lại với toàn bộ lịch sử ghi chép từ ngày thả giống (DOC 0). Phân tích tổng hợp số liệu thu hoạch cùng nhật ký cho ăn, chất lượng nước và lấy mẫu định kỳ giúp ban quản lý trang trại đánh giá chuẩn xác 4 chỉ số hiệu quả cốt lõi:",
        "1. Tỷ lệ sống thực tế toàn vụ (Definitive Survival Rate: SR%): Tính theo công thức: Tỷ lệ sống (%) = [(Khối lượng thu tỉa (kg) × Size bình quân (con/kg)) + (Khối lượng thu dứt điểm (kg) × Size bình quân (con/kg))] ÷ Tổng số giống thả ban đầu × 100. Con số này kiểm chứng độ tin cậy của việc ước tính tỷ lệ chết hàng ngày trong [ghi chép nhật ký ao tôm](/vi/resources/shrimp-farm-record-keeping).",
        "2. Hệ số chuyển đổi thức ăn thực tế (Actual FCR): Tính bằng: FCR = Tổng lượng thức ăn thực tế xuất kho (kg) ÷ Tổng khối lượng tôm thương phẩm thu được (kg) (bao gồm cả thu tỉa và thu dứt điểm). FCR thực tế là thước đo khách quan nhất phản ánh hiệu quả quản lý vó và mức độ lãng phí cám trong ao, đối chiếu thêm tại [hướng dẫn tối ưu hóa hệ số FCR](/vi/resources/fcr-shrimp-farming).",
        "3. Giá thành sản xuất trên mỗi kg tôm (COGS/kg) và Lợi nhuận ròng: Giá thành/kg = Tổng toàn bộ chi phí vận hành trong vụ (giống, thức ăn, điện/dầu, nhân công, chế phẩm sinh học, hóa chất và chi phí thu hoạch) ÷ Tổng số kg tôm bán được thực tế. Nắm vững giá thành sản xuất thực tế giúp chủ trại tự tin đàm phán giá bán với thương lái, xem chi tiết tại [hạch toán giá thành sản xuất ao tôm (COGS)](/vi/resources/shrimp-farm-cogs).",
        "4. Hiệu chuẩn độ chính xác của kỹ thuật lấy mẫu (Sampling Accuracy Calibration): So sánh trọng lượng thân bình quân (MBW) từ đợt chài mẫu cuối cùng trong [biểu đồ tăng trưởng tôm thẻ chân trắng](/vi/resources/vannamei-growth-chart) với cỡ size thực tế trên bàn cân bờ ao. Bất kỳ sự chênh lệch lớn nào cũng chỉ ra khiếm khuyết trong kỹ thuật quăng chài mẫu cần được điều chỉnh trong [lập kế hoạch vụ nuôi tôm](/vi/resources/shrimp-cycle-planning) ở chu kỳ tiếp theo.",
      ],
    },
  ],
  checklist: [
    "Phân tách rõ ràng giữa phiếu ghi chép thu tỉa giảm mật độ (Partial harvest) và thu dứt điểm dọn ao (Final harvest).",
    "Ghi chép đầy đủ mã ao nuôi, ngày giờ, số cân thực tế, phân cỡ size (con/kg), đơn vị thu mua và đơn giá thanh toán trên mỗi kg.",
    "Ngừng cho tôm ăn trước giờ thu hoạch ít nhất 4–8 tiếng và kiểm tra bảo đảm tỷ lệ tôm vỏ cứng đạt trên 90% (tránh kỳ lột xác rộ).",
    "Tuân thủ nghiêm ngặt chuỗi lạnh (Cold chain) bằng cách sốc nhiệt nước đá 0–2°C (tỷ lệ đá:tôm tối thiểu 1:1) và róc nước 30–60 giây trước khi cân.",
    "Cập nhật ngay số lượng con, sinh khối tồn ao và giảm lượng thức ăn hàng ngày tức thì sau khi thu tỉa để chống ô nhiễm nước ao.",
    "Tiến hành đối soát toàn diện vụ nuôi (Cycle reconciliation) với kho thức ăn và nhật ký lấy mẫu để tính toán chính xác FCR, tỷ lệ sống (SR) và lợi nhuận ròng thực tế.",
  ],
  sources: [
    {
      title: "Partial Harvesting: A Smart Strategy for Shrimp Farmers",
      publisher: "Responsible Seafood Advocate",
      url: "https://www.globalseafood.org/advocate/partial-harvesting-a-smart-strategy-for-shrimp-farmers/",
    },
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Comparative Analysis of Profitability and Resource Use Efficiency Between Penaeus monodon and Litopenaeus vannamei in India",
      publisher: "Aquaculture Reports",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8096089/",
    },
  ],
};
