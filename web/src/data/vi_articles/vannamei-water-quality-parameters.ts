import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "vannamei-water-quality-parameters",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Chất lượng nước",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Thông Số Chất Lượng Nước Nuôi Tôm Thẻ Chân Trắng: Ngưỡng Mục Tiêu & Dấu Hiệu Cảnh Báo",
  description:
    "Cẩm nang tra cứu thực tế về các thông số chất lượng nước nuôi tôm thẻ chân trắng (Litopenaeus vannamei), cung cấp các khoảng ngưỡng theo ngữ cảnh cho oxy hòa tan, nhiệt độ, pH, độ mặn, độ kiềm, amoniac, nitrit và nitrat.",
  readTime: "11 phút đọc",
  tags: [
    "thông số chất lượng nước tôm thẻ chân trắng",
    "thông số chất lượng nước tôm",
    "chỉ số nước tôm thẻ chân trắng",
    "chất lượng nước lý tưởng nuôi tôm",
    "chất lượng nước ao tôm",
    "bảng thông số nước tôm thẻ",
    "ngưỡng amoniac an toàn cho tôm",
    "độ kiềm chuẩn nuôi tôm thẻ",
    "độ mặn lý tưởng tôm thẻ",
    "ngưỡng DO tôm thẻ chân trắng",
    "độ pH nuôi tôm thẻ",
    "khí độc nitrit trong ao tôm",
    "giám sát chất lượng nước ao tôm",
  ],
  publishedAt: "2026-08-31",
  image: {
    src: "/resources/images/vannamei-water-quality-parameters-infographic.png",
    alt: "Đồ họa Shrimply minh họa ngưỡng tăng trưởng thuận lợi 10 đến 20 ppt cho tôm thẻ chân trắng, dải độ mặn nuôi mở rộng có điều kiện và lời nhắc theo dõi oxy hòa tan, pH, nhiệt độ, amoniac, nitrit, thuần hóa và cân bằng khoáng chất",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Phần Mềm Giám Sát Nước", href: "/vi/features/water-quality-monitoring" },
  takeaways: [
    "Sử dụng các khoảng thông số làm mốc tham chiếu thực tế, không coi là ngưỡng đạt-hỏng tuyệt đối; giai đoạn sinh trưởng, độ mặn, nhiệt độ, mật độ thả giống, mức độ thuần hóa và mô hình ao (ao bạt HDPE hay ao đất) đều làm thay đổi mức độ rủi ro.",
    "Về độ mặn, dải 10–20 ppt là mốc tham chiếu thuận lợi cho tăng trưởng được chứng minh qua các nghiên cứu tôm giống/thiếu niên, trong khi tôm thẻ được thuần hóa chuẩn xác có thể nuôi thành công trên dải độ mặn rộng hơn nhiều.",
    "Phân tích TAN luôn phải đối chiếu đồng thời với pH và nhiệt độ; phân tích nitrit (NO₂⁻) phải xét kèm độ mặn và nồng độ ion clorua; còn nitrat (NO₃⁻) là yếu tố tích lũy dài hạn riêng biệt.",
  ],
  faqs: [
    {
      question: "Các thông số chất lượng nước lý tưởng cho tôm thẻ chân trắng là bao nhiêu?",
      answer:
        "Mốc tham chiếu thực tế cho giai đoạn nuôi thương phẩm gồm: oxy hòa tan (DO) trên 5,0 mg/L, nhiệt độ khoảng 28–32°C, pH ổn định trong khoảng 7,8–8,3 với biên độ dao động ngày đêm thấp, độ mặn khoảng 10–20 ppt khi phù hợp với tôm giống và nguồn cấp nước, độ kiềm khoảng 100–160 mg/L tính theo CaCO₃, cùng các hợp chất nitơ ở mức thấp và ổn định. Đây là các điểm tham chiếu khởi đầu, không phải giới hạn an toàn bất biến; luôn đối chiếu với đường cơ sở của ao, tập tính tôm, giai đoạn phát triển, độ mặn, nhiệt độ và phương pháp kiểm nghiệm.",
    },
    {
      question: "Hàm lượng amoniac an toàn trong ao nuôi tôm là bao nhiêu?",
      answer:
        "Cần duy trì tổng nitơ amoniac (TAN) ở mức thấp và ổn định, nhưng tuyệt đối không đánh giá TAN một cách tách biệt. Tỷ lệ amoniac tự do không ion hóa mang độc tính cao (NH₃) sẽ tăng mạnh khi pH và nhiệt độ tăng, đồng thời biến động theo độ mặn; vì vậy hãy luôn ghi nhận TAN, pH, nhiệt độ, độ mặn, đơn vị tính và thời điểm lấy mẫu cùng lúc. Xu hướng tăng dần hoặc các biểu hiện bất thường về sức ăn tại nhá, bơi lội hay hao hụt tôm đều đòi hỏi phải điều tra ngay lập tức dù một chỉ số đo nhìn qua vẫn có vẻ nằm trong ngưỡng cho phép.",
    },
    {
      question: "Độ kiềm lý tưởng cho tôm thẻ chân trắng là bao nhiêu?",
      answer:
        "Nhiều trang trại nuôi thương phẩm sử dụng mốc khoảng 100–160 mg/L tính theo CaCO₃ làm ngưỡng vận hành, nhưng mục tiêu hữu dụng thực tế phụ thuộc vào độ mặn, độ cứng (hardness), mô hình nuôi (ao bạt hay ao đất) và mức dao động pH giữa sáng và chiều. Hãy kiểm chứng độ chuẩn xác của kết quả đo và tính toán lượng vôi tạt/dolomite hay khoáng chất dựa trên thể tích nước thực tế, độ tinh khiết của sản phẩm, tính chất hóa học nguồn nước và quy trình vận hành tiêu chuẩn (SOP) của trang trại thay vì áp dụng một định lượng cố định theo hecta.",
    },
    {
      question: "Độ mặn lý tưởng nhất để nuôi tôm thẻ chân trắng là bao nhiêu?",
      answer:
        "Nhiều nghiên cứu có kiểm chứng cho thấy tôm thẻ giai đoạn giống và thiếu niên tăng trưởng rất mạnh ở vùng nước lợ độ mặn thấp, bao gồm khoảng 5–15 ppt và 10–30 ppt. Do đó, Shrimply sử dụng mốc 10–20 ppt như một tham chiếu thực tế thuận lợi cho tăng trưởng, chứ không coi đây là mức tối ưu tuyệt đối hay dải đẳng trương cho mọi điều kiện. Năng suất thực tế còn phụ thuộc vào giai đoạn tôm, nhiệt độ, kỹ thuật thuần hóa và sự cân bằng giữa các ion kali, magie, canxi, độ cứng và độ kiềm.",
    },
    {
      question: "Mức oxy hòa tan (DO) tối thiểu an toàn cho tôm là bao nhiêu?",
      answer:
        "Nên duy trì oxy hòa tan lúc rạng sáng (trước khi mặt trời mọc) trên mức 4–5 mg/L và phải đặc biệt lưu tâm nếu phát hiện xu hướng sụt giảm liên tục. Mức độ rủi ro phụ thuộc vào nhiệt độ nước, độ mặn, sinh khối tôm, thời gian phơi nhiễm thiếu oxy, tình trạng đáy ao và độ sâu của tầng nước đo. Nếu DO ở mức thấp hoặc tôm bắt đầu tụ lại quanh mép ao, chân bờ hoặc quanh cánh quạt nước, hãy bật tối đa các giàn quạt nước và hệ thống sục khí đáy an toàn, ngừng tăng cữ thức ăn, kiểm tra lại ở nhiều độ sâu khác nhau và tuân thủ quy trình xử lý sự cố khẩn cấp của trang trại.",
    },
    {
      question: "Độ pH lý tưởng cho ao tôm thẻ chân trắng là bao nhiêu và mức biến động ngày đêm nào là an toàn?",
      answer:
        "Mục tiêu thực tế là duy trì pH trong khoảng 7,8–8,3 với biên độ chênh lệch giữa sáng và chiều ổn định ở mức nhỏ (dưới 0,5 đơn vị). Sự chênh lệch pH ngày đêm quá lớn hoặc biến động đột ngột là hồi chuông cảnh báo cần kiểm tra lại độ kiềm, mật độ tảo, mức độ hô hấp, diễn biến thời tiết và độ chuẩn xác của máy đo; bản thân độ biến thiên này chưa đủ để khẳng định ngay là có sự cố sụp tảo hay bùng phát dịch bệnh.",
    },
  ],
  sections: [
    {
      heading: "Trả lời nhanh: Áp dụng các khoảng thông số theo ngữ cảnh ao nuôi",
      body: [
        "Các khoảng thông số chất lượng nước là điểm khởi đầu hữu ích, nhưng một kết quả đo đơn lẻ không thể khẳng định ao đang an toàn hay nguy hiểm. Luôn so sánh giá trị ghi nhận với các lần đo gần nhất, thời điểm và độ sâu lấy mẫu, tập tính của tôm, phản xạ bắt mồi tại nhá (vó), tổng sinh khối trong ao, thời tiết và dải chỉ số vận hành bình thường của trang trại.",
        "Hãy ưu tiên xử lý ngay các mối nguy cấp bách trước mắt như lượng oxy hòa tan sụt giảm đột ngột hoặc xuất hiện hiện tượng tôm rớt đáy, hao hụt. Đối với các can thiệp điều chỉnh hóa học, cần kiểm chứng lại kết quả thử nghiệm và tuân thủ SOP của trang trại hoặc tham vấn chuyên gia kỹ thuật trước khi tạt khoáng chất, nguồn carbon (mật rỉ), chế phẩm vi sinh, vôi, hóa chất oxy hóa hay bất kỳ sản phẩm xử lý nào.",
      ],
    },
    {
      heading: "Bảng tham chiếu chất lượng nước ao tôm thẻ chân trắng",
      body: [
        "Các chỉ số tham chiếu trong giai đoạn nuôi thương phẩm dưới đây giúp người nuôi xác định thông số nào cần kiểm tra lại và điều tra nguyên nhân. Đây không phải là đơn thuốc can thiệp cố định, và các phương pháp phân tích phòng lab có thể báo cáo amoniac hay nitrit dưới dạng nitơ nguyên tố (N) hoặc dạng ion toàn phần; tuyệt đối không so sánh các giá trị khi chưa quy đổi về cùng một đơn vị đo.",
      ],
      table: {
        columns: [
          "Thông số",
          "Mốc tham chiếu thực tế",
          "Cần theo dõi sát",
          "Mức độ lo ngại cao",
          "Ngữ cảnh làm thay đổi rủi ro",
          "Thời điểm kiểm tra",
          "Biện pháp ứng phó an toàn đầu tiên",
        ],
        rows: [
          [
            "Oxy hòa tan (DO)",
            "> 5,0 mg/L",
            "4,0–5,0 mg/L hoặc xu hướng giảm dần",
            "Duy trì < 4,0 mg/L, đặc biệt khi chạm mức 3,0 mg/L hoặc tôm có biểu hiện bất thường",
            "Nhiệt độ, độ mặn, sinh khối tôm, thời gian phơi nhiễm, độ sâu và nhu cầu tiêu thụ oxy của đáy ao",
            "Lúc rạng sáng và cuối buổi chiều; đo thường xuyên hơn khi sinh khối cao, trời nhiều mây u ám hoặc tôm ăn yếu",
            "Bật tối đa dàn quạt nước và hệ thống sục khí đáy an toàn, ngừng tăng cữ thức ăn, kiểm tra DO ở nhiều tầng nước và thực hiện SOP ứng phó khẩn cấp của trại. Xem thêm [Xu Hướng Chất Lượng Nước](/vi/resources/water-quality-trends).",
          ],
          [
            "Nhiệt độ nước",
            "Khoảng 28–32°C",
            "Dao động ra ngoài đường cơ sở của trại hoặc thay đổi nhanh trong ngày",
            "Nhiệt độ quá thấp hoặc quá cao kéo dài kèm tôm giảm ăn, DO thấp hoặc hành vi bất thường",
            "Cỡ tôm, mức độ thuần hóa, độ mặn, DO, thời tiết và thời gian phơi nhiễm",
            "Buổi sáng và buổi chiều; sau các đợt biến động thời tiết lớn hoặc thay/cấp nước",
            "Kiểm tra kỹ DO và phản xạ ăn ở nhá (vó) trước khi điều chỉnh khẩu phần thức ăn. Xem thêm [Khẩu Phần Ăn Cho Tôm Thẻ Chân Trắng](/vi/resources/vannamei-feeding-rate).",
          ],
          [
            "Độ pH",
            "Khoảng 7,8–8,3 với dao động ngày đêm thấp",
            "Chênh lệch sáng - chiều giãn rộng hoặc dao động ra ngoài ngưỡng cơ sở của ao",
            "Biến động đột ngột, nhiều lần đo chạm ngưỡng < 7,0 hoặc > 9,0, hoặc tôm có biểu hiện bất thường",
            "Độ kiềm, mật độ tảo, hô hấp quần thể, mưa lớn, độ mặn, nhiệt độ và hiệu chuẩn máy đo",
            "Lúc mặt trời mọc và giữa buổi chiều tại các vị trí lấy mẫu cố định",
            "Hiệu chuẩn lại máy đo, kiểm tra độ kiềm và mật độ tảo, áp dụng kế hoạch điều chỉnh riêng cho ao. Xem thêm [Màu Nước & Quản Lý Tảo Ao Tôm](/vi/resources/shrimp-pond-water-colour-algae).",
          ],
          [
            "Độ mặn",
            "10–20 ppt (mốc tham chiếu tăng trưởng thuận lợi)",
            "Khoảng 5–35 ppt vẫn có thể nuôi tốt nếu tôm được thuần hóa chuẩn và tính chất hóa học của nước phù hợp",
            "Biến động đột ngột, vượt ra ngoài ngưỡng thuần hóa của đàn tôm, hoặc tôm giảm ăn và tỷ lệ sống sụt giảm",
            "Giai đoạn phát triển, nhiệt độ, chất lượng thuần hóa, hàm lượng kali, magie, canxi, độ cứng và độ kiềm",
            "Định kỳ hàng tuần và ngay sau các đợt mưa lớn, bốc hơi mạnh hoặc cấp/thay nước",
            "Ổn định tốc độ biến động, kiểm tra bảng cân bằng khoáng đa vi lượng và tính toán lượng bổ sung cẩn thận trước khi tạt muối/khoáng. Đối chiếu với [Thu Thập Dữ Liệu Tăng Trưởng](/vi/features/growth-sampling).",
          ],
          [
            "Tổng độ kiềm (Alkalinity theo CaCO₃)",
            "Khoảng 100–160 mg/L",
            "Dưới ngưỡng mục tiêu của trại hoặc xu hướng giảm dần kèm dao động pH nới rộng",
            "Mất ổn định kéo dài, vỏ tôm mềm mỏng hoặc chậm cứng sau lột xác, không cải thiện sau xử lý",
            "Độ mặn, độ cứng, mô hình nuôi (ao bạt hay ao đất), pH, độ tinh khiết của sản phẩm vôi/khoáng và thể tích ao",
            "Định kỳ hàng tuần và sau các trận mưa rào lớn hoặc sau khi thay nước khối lượng lớn",
            "Xác nhận lại kết quả đo và tính toán lượng vôi/dolomite cần tạt dựa trên thể tích nước và hóa tính nguồn nước. Xem thêm [Khắc Phục Tôm Chậm Lớn & Suy Giảm ADG](/vi/resources/slow-shrimp-growth-adg-troubleshooting).",
          ],
          [
            "Tổng nitơ amoniac (TAN)",
            "Duy trì thấp và ổn định; < 0,5 mg/L là ngưỡng vận hành an toàn thận trọng",
            "Xu hướng tăng dần hoặc ≥ 0,5 mg/L",
            "Nồng độ NH₃-N tính toán tăng cao, chỉ số tiếp tục leo thang, tôm ăn yếu, bơi lội bất thường hoặc rớt đáy",
            "Độ pH, nhiệt độ, độ mặn, đơn vị tính, thời gian phơi nhiễm, sinh khối tôm và tải lượng chất hữu cơ",
            "Tối thiểu 2 lần/tuần trong giai đoạn nuôi thâm canh; đo thường xuyên hơn nếu chỉ số có chiều hướng tăng",
            "Ngừng tăng lượng thức ăn, đối chiếu chỉ số pH và nhiệt độ cùng thời điểm, kiểm tra nhá và hố xi-phông bùn đáy, tuân thủ kế hoạch ứng phó của trại.",
          ],
          [
            "Khí độc amoniac tự do (NH₃-N)",
            "Duy trì càng thấp càng tốt; < 0,05 mg/L là mốc tham chiếu an toàn thận trọng",
            "0,05–0,10 mg/L hoặc xu hướng tăng dần",
            "≥ 0,10 mg/L, đặc biệt khi đi kèm pH cao, nhiệt độ cao hoặc tôm xuất hiện triệu chứng bất thường",
            "TAN, pH, nhiệt độ, độ mặn, phương pháp tính toán, đơn vị đo và thời gian phơi nhiễm",
            "Tính toán dựa trên mẫu nước đo đồng thời TAN, pH, nhiệt độ và độ mặn",
            "Bảo đảm oxy hòa tan dồi dào, ngừng tăng cữ thức ăn, kiểm chứng lại phép tính và áp dụng SOP trại về cấp bù nước hoặc xả xi-phông đáy. Xem thêm [Tối Ưu FCR & Giảm Lãng Phí Thức Ăn](/vi/resources/fcr-shrimp-farming).",
          ],
          [
            "Khí độc Nitrit (NO₂⁻-N)",
            "Duy trì thấp và ổn định; < 0,2 mg/L NO₂-N là ngưỡng tham chiếu an toàn thận trọng",
            "Xu hướng tăng dần hoặc ≥ 0,2 mg/L NO₂-N",
            "Liên tục tăng khi độ mặn hoặc nồng độ ion clorua thấp, tôm giảm ăn, màu sắc thân hoặc hành vi bất thường, hoặc tôm rớt đáy",
            "Độ mặn, hàm lượng clorua, đơn vị đo, kích cỡ tôm, thời gian phơi nhiễm và hệ vi sinh xử lý đáy/nước",
            "Ít nhất 2 lần/tuần vào nửa cuối vụ nuôi; đo dày hơn nếu phát hiện xu hướng tăng",
            "Xác nhận đơn vị đo và nồng độ ion clorua, đảm bảo oxy hòa tan dồi dào, đánh giá lại lượng thức ăn và tải lượng hữu cơ, tính toán lượng muối/clorua bổ sung chuẩn xác trước khi can thiệp.",
          ],
          [
            "Nitrat (NO₃⁻-N)",
            "Duy trì ổn định và nằm trong ngưỡng kiểm soát của mô hình trang trại",
            "Xu hướng tăng liên tục kéo dài",
            "Chỉ số cao hoặc tăng nhanh kèm tôm chậm lớn, ăn yếu hoặc đi kèm các trục trặc chất lượng nước khác",
            "Độ mặn, loại hệ thống nuôi (tuần hoàn RAS, biofloc, hay thay nước), thời gian tích tụ, đơn vị đo, tỷ lệ thay nước và các hợp chất nitơ khác",
            "Định kỳ mỗi 1–2 tuần, hoặc đo thường xuyên hơn trong các hệ thống nuôi ít thay nước",
            "Kiểm chứng xu hướng và rà soát lại lượng chất rắn lơ lửng, hệ vi sinh/biofilter, lượng thức ăn đưa vào và quy trình điều tiết nước cho phép. Xem thêm [Đánh Giá Hiệu Quả Ao Nuôi](/vi/resources/pond-performance).",
          ],
        ],
      },
    },
    {
      heading: "Tại sao cùng một con số lại mang mức độ rủi ro hoàn toàn khác nhau",
      body: [
        "Các ngưỡng giới hạn trong nghiên cứu khoa học được đúc kết từ nhiều cỡ tôm, độ mặn, nhiệt độ, thời gian phơi nhiễm và hệ thống nuôi khác nhau. Hãy sử dụng những con số này để định hướng điều tra, không dùng để thay thế việc quan sát trực tiếp tại ao hoặc SOP của trang trại.",
      ],
      items: [
        "Oxy hòa tan: Chỉ số DO ở tầng đáy thường thấp hơn tầng mặt do tôm tập trung hoạt động và mùn bã hữu cơ phân hủy tiêu thụ nhiều oxy gần lớp trầm tích đáy. Cần đo ở các độ sâu và vị trí đại diện thay vì ngộ nhận rằng một chỉ số đo mặt nước phản ánh cho cả ao.",
        "Nhiệt độ: Nhiệt độ làm thay đổi tốc độ chuyển hóa của tôm, nhu cầu oxy, sức ăn và tỷ lệ TAN chuyển hóa thành khí độc NH₃. Chỉ điều chỉnh khẩu phần thức ăn sau khi đã kiểm tra phản xạ của tôm tại nhá (vó), lượng oxy hòa tan và xu hướng nhiệt độ những ngày gần nhất.",
        "Độ pH và độ kiềm: Quá trình quang hợp của tảo làm tăng pH vào ban ngày và quá trình hô hấp làm giảm pH vào ban đêm. Độ kiềm đóng vai trò hệ đệm giúp nước ao chống lại sự biến động pH quá mức, nhưng độ cứng và cân bằng khoáng chất cũng rất quan trọng đối với quá trình tạo vỏ; một lần đo thấy độ kiềm thấp chưa đủ để xác định nguyên nhân gây ra sự cố lột xác.",
        "Các hợp chất nitơ: TAN bao gồm ion amoni (NH₄⁺) ít độc và khí độc amoniac tự do (NH₃). Nitrit (NO₂⁻) có thể làm giảm khả năng vận chuyển oxy, gây cản trở phân tử hemosianin và rối loạn chuyển hóa năng lượng của tôm, trong khi nitrat (NO₃⁻) thường được theo dõi như một yếu tố tích lũy hữu cơ dài hạn. Cần xác định rõ phòng xét nghiệm báo cáo từng chỉ số dưới dạng nitơ nguyên tố (N) hay dạng ion toàn phần.",
      ],
    },
    {
      heading: "Độ mặn: Mốc tham chiếu tăng trưởng khác biệt với giới hạn chịu đựng hay độc tính",
      body: [
        "Các nghiên cứu có kiểm chứng trên tôm thẻ giai đoạn giống và thiếu niên củng cố quan sát thực tế của người nuôi: nước lợ độ mặn thấp hoàn toàn có thể đem lại tốc độ tăng trưởng rất tốt. Nghiên cứu của [Bray et al.](https://doi.org/10.1016/0044-8486(94)90505-3) ghi nhận trọng lượng cuối vụ cao nhất ở độ mặn 5 và 15 ppt so với các mức 25, 35 và 49 ppt, trong khi một nghiên cứu trên [Indian Journal of Fisheries](https://doi.org/10.21077/ijf.2017.64.2.59404-04) cũng báo cáo tốc độ tăng trưởng mạnh tương đương từ dải 10 đến 30 ppt.",
        "Bằng chứng khoa học đó hỗ trợ khoảng 10–20 ppt như một mốc tham chiếu thực tế thuận lợi cho tăng trưởng, nhưng không biến 10–20 ppt thành mức tối ưu phổ quát hay dải đẳng trương cho mọi điều kiện. Tôm thẻ chân trắng hoàn toàn có thể chịu đựng và phát triển tốt trên dải độ mặn rộng hơn nhiều nếu quy trình thuần hóa, nhiệt độ và sự cân bằng các ion khoáng được đảm bảo.",
        "Bên cạnh đó, độ mặn làm thay đổi mức độ rủi ro hóa học. Độ mặn và hàm lượng ion clorua thấp khiến tôm hấp thụ nitrit qua mang dễ dàng hơn, đồng thời độ mặn ảnh hưởng trực tiếp đến công thức tính toán độc tính của amoniac. Các mối quan hệ tương tác này cần được đánh giá tách biệt với dải độ mặn được dùng làm mốc tham chiếu tăng trưởng.",
      ],
    },
    {
      heading: "Sự tương tác qua lại giữa các thông số cốt lõi",
      body: [
        "Luôn xem xét các thông số có mối liên hệ mật thiết trước khi quyết định mức độ khẩn cấp của tình huống hoặc lựa chọn phương án xử lý:",
      ],
      items: [
        "1. TAN + pH + nhiệt độ + độ mặn: pH và nhiệt độ càng cao thì tỷ lệ khí độc NH₃ không ion hóa càng tăng mạnh. Cần sử dụng công thức tính toán tiêu chuẩn với các số đo được lấy cùng thời điểm, ghi rõ độ mặn và đơn vị đo lường.",
        "2. Nitrit + độ mặn + clorua: Ion clorua có thể làm giảm sự xâm nhập của nitrit qua mang tôm, nhưng nghiên cứu cho thấy việc tạt thêm muối ăn đơn thuần không phải là giải pháp vạn năng cho mọi tình huống. Hãy đo hàm lượng clorua và nitrit, kiểm chứng đơn vị đo và tính toán lượng bổ sung chính xác cho thể tích ao thực tế.",
        "3. pH + độ kiềm + mật độ tảo + thời tiết: Biên độ dao động pH ngày đêm nới rộng thường xuất hiện sau những thay đổi về quang hợp, hô hấp, độ kiềm suy giảm, mưa lớn hoặc thay nước. Cần xác định rõ quy luật trước khi xử lý hóa chất cho ao.",
        "4. DO buổi chiều + DO rạng sáng + sinh khối: DO buổi chiều đạt mức cao nhờ quang hợp không đảm bảo lượng oxy sẽ an toàn trước lúc bình minh. Luôn đối chiếu số liệu ở cả hai thời điểm và tăng cường theo dõi khi sinh khối tôm, lượng mây che phủ hoặc tải lượng chất hữu cơ gia tăng.",
      ],
      note: "Tuyệt đối không so sánh các kết quả kiểm tra TAN, NH₃, nitrit hay nitrat nếu dạng hợp chất hóa học và đơn vị đo chưa được xác định cụ thể.",
    },
    {
      heading: "Quy trình kiểm tra chất lượng nước theo ngày tuổi nuôi (DOC)",
      body: [
        "Trọng tâm giám sát chất lượng nước liên tục biến chuyển theo sự phát triển của đàn tôm và mức tích lũy chất thải hữu cơ trong suốt chu kỳ nuôi:",
      ],
      items: [
        "Giai đoạn ương vèo và đầu vụ (DOC 1–30): Ưu tiên tính ổn định môi trường, kỹ thuật thuần hóa giống, đo pH sáng - chiều, DO, nhiệt độ, độ mặn, độ kiềm và quan sát cẩn thận sau mỗi lần cấp/thay nước.",
        "Giai đoạn giữa vụ (DOC 30–70): Khi lượng thức ăn và sinh khối tôm tăng nhanh, cần giám sát chặt chẽ hơn DO rạng sáng, DO và pH buổi chiều, TAN, nitrit, tình trạng nhá (vó) và tải lượng chất thải đáy ao.",
        "Giai đoạn về đích/cuối vụ (DOC 70+ đến khi thu hoạch): Tần suất kiểm tra được quyết định dựa trên tổng sinh khối ao, công suất quạt/sục khí dự phòng, sức ăn của tôm, xu hướng thông số gần nhất và kế hoạch quản lý rủi ro của trại. Tăng cường kiểm tra ngay khi DO giảm, các hợp chất nitơ tăng cao, thời tiết thay đổi bất lợi hoặc tôm ăn yếu.",
      ],
    },
    {
      heading: "Biện pháp xử lý thực tế khi thông số lệch khỏi ngưỡng an toàn",
      body: [
        "Xác nhận lại kết quả đo, bảo vệ tôm khỏi mối nguy cấp bách trước mắt, sau đó theo dõi sát phản ứng của đàn tôm. Việc sử dụng các sản phẩm hóa học hay chế phẩm sinh học đòi hỏi phải tính toán liều lượng cụ thể theo thể tích ao và tuân thủ đăng ký lưu hành, quy định địa phương, tiêu chuẩn an toàn môi trường và SOP của trang trại.",
      ],
      items: [
        "Oxy hòa tan (DO) thấp: Vận hành toàn bộ dàn quạt nước và hệ thống sục khí đáy an toàn sẵn có, ngừng việc tăng cữ thức ăn, kiểm tra mật độ phân bố của tôm và đo lại DO ở nhiều vị trí, độ sâu. Kích hoạt báo động khẩn cấp nếu tôm dạt mép bờ ao, nổi đầu mặt nước hoặc tụ quanh quạt nước, hoặc nếu chỉ số DO không thể hồi phục.",
        "pH hoặc độ kiềm bất thường: Kiểm tra lại bằng thiết bị đã hiệu chuẩn chuẩn xác, so sánh giá trị sáng - chiều, đánh giá tác động của mưa lớn, mật độ tảo, việc cấp nước mới và độ kiềm hiện tại. Tuyệt đối không giảm bớt quạt nước cần thiết, và không tạt vôi, mật rỉ đường hay men vi sinh dựa trên các liều lượng ước tính chung chung.",
        "TAN hoặc NH₃ tăng cao: Đối chiếu TAN với pH, nhiệt độ và độ mặn; đánh giá lại thức ăn thừa trên nhá, hố xi-phông, hạt lơ lửng và sự lưu chuyển nước. Ngừng tăng lượng thức ăn và tuân thủ SOP của trang trại để điều chỉnh khẩu phần, cấp bù nước sạch hoặc tăng cường xi-phông xả thải đáy ao.",
        "Nitrit tăng cao: Xác định rõ đơn vị là NO₂-N hay ion NO₂⁻ toàn phần, đồng thời đo độ mặn và nồng độ ion clorua. Đánh giá lại hệ vi sinh ao/hệ lọc sinh học, lượng thức ăn đưa vào và tải lượng hữu cơ; lập kế hoạch tính toán liều lượng khoa học trước khi tạt muối hay bổ sung vi sinh.",
        "Xuất hiện tôm rớt đáy hoặc ăn yếu kéo dài: Ghi nhận chính xác dòng thời gian và các kết quả xét nghiệm nước, thu thập mẫu tôm sống bảo quản đúng kỹ thuật, lập tức liên hệ bác sĩ thú y thủy sản, chuyên gia sức khỏe động vật thủy sản, phòng xét nghiệm bệnh phẩm hoặc kỹ sư tư vấn hiện trường giàu kinh nghiệm.",
      ],
    },
    {
      heading: "Cách sử dụng Shrimply để ghi chép và phân tích chất lượng nước",
      body: [
        "Ghi chép các kết quả đo chất lượng nước theo từng ao nuôi và mốc thời gian thực tế, giúp các chủ trang trại và quản lý kỹ thuật dễ dàng đối chiếu xu hướng biến động thay vì dựa vào trí nhớ hay một lần đo đơn lẻ.",
        "Nhập đồng thời các chỉ số pH, nhiệt độ, độ mặn và amoniac khi được lấy từ cùng một đợt kiểm tra mẫu nước. Shrimply lưu trữ và đồng bộ hóa các dữ liệu này; người dùng có thể sử dụng phương pháp tính toán tiêu chuẩn bên ngoài để suy ra nồng độ NH₃ và ghi lại công thức tính cùng đơn vị vào phần ghi chú ao nuôi.",
        "Đối chiếu lịch sử chất lượng nước với nhật ký cho ăn, số liệu chài tôm kiểm tra định kỳ, ước tính sinh khối và tỷ lệ hao hụt. Các dữ liệu này cung cấp bức tranh toàn cảnh để phục vụ điều tra phân tích vận hành; không tự động đưa ra kết luận chẩn đoán nguyên nhân tôm chậm lớn hay bùng phát dịch bệnh.",
      ],
    },
    {
      heading: "Khi nào cần sự hỗ trợ của phòng xét nghiệm hoặc chuyên gia thủy sản",
      body: [
        "Cần kết nối hỗ trợ chuyên môn ngay khi tôm hao hụt liên tục kéo dài, tôm có biểu hiện bơi lội hoặc ngoại hình bất thường, tôm bỏ ăn hoặc giảm ăn qua nhiều cữ liên tiếp, các thông số chất lượng nước biến động cực đoan, các biện pháp can thiệp xử lý không đem lại kết quả, hoặc khi trang trại chưa xác định rõ nguyên nhân bắt nguồn từ lỗi thiết bị đo, hóa lý nguồn nước, hệ vi sinh ao hay dịch bệnh truyền nhiễm.",
        "Chuẩn bị và cung cấp đầy đủ mã định danh ao, ngày tuổi (DOC), mật độ thả giống và ước tính sinh khối hiện tại, lịch sử cho ăn những ngày gần nhất, diễn biến thời gian hao hụt, nhật ký thời tiết và thay nước, bảng kết quả xét nghiệm nước đã hiệu chuẩn kèm giờ đo và đơn vị, hình ảnh thực tế và các phiếu kết quả xét nghiệm phòng lab trước đó.",
      ],
    },
  ],
  checklist: [
    "Hiệu chuẩn và bảo dưỡng máy đo oxy hòa tan (DO) và máy đo pH định kỳ theo đúng hướng dẫn của nhà sản xuất và lịch kiểm soát chất lượng của trang trại.",
    "Đo oxy hòa tan (DO) lúc rạng sáng và cuối buổi chiều tại cùng vị trí và độ sâu cố định, sau đó đối chiếu xu hướng chênh lệch.",
    "Ghi chép đồng thời TAN, pH, nhiệt độ, độ mặn, thời điểm đo, phương pháp thử nghiệm, dạng hóa chất báo cáo và đơn vị tính.",
    "Theo dõi sát sự biến động của pH sáng - chiều song song với độ kiềm, diễn biến thời tiết và lịch trình cấp/thay nước.",
    "Xác định rõ đơn vị đo của nitrit và kiểm tra nồng độ ion clorua trước khi cân nhắc can thiệp bổ sung muối hoặc cân bằng khoáng.",
    "Liên kết chặt chẽ sự biến động của chất lượng nước với phản xạ tại nhá (vó), lịch sử cho ăn, kết quả chài tôm kiểm tra tăng trưởng, sinh khối và tỷ lệ hao hụt.",
  ],
  sources: [
    {
      title: "Shrimp Culture: Pond Design, Operation and Management — Water Quality",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/AC210E/AC210E09.htm",
    },
    {
      title: "Pond Aeration and Water Quality in Commercial Aquaculture",
      publisher: "Boyd & Fast",
      url: "https://www.was.org",
    },
    {
      title: "The Effect of Salinity on Growth and Survival of Penaeus vannamei",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/0044-8486(94)90505-3",
    },
    {
      title: "Growth and Carcass Mineralisation of Pacific Whiteleg Shrimp in Response to Water Salinity",
      publisher: "Indian Journal of Fisheries",
      url: "https://doi.org/10.21077/ijf.2017.64.2.59404-04",
    },
    {
      title: "Acute Toxicity of Ammonia on Litopenaeus vannamei Juveniles at Different Salinity Levels",
      publisher: "Journal of Experimental Marine Biology and Ecology",
      url: "https://doi.org/10.1016/S0022-0981(01)00227-1",
    },
    {
      title: "Nitrite Toxicity to Litopenaeus vannamei in Low-Salt Water",
      publisher: "Journal of the World Aquaculture Society",
      url: "https://doi.org/10.1111/j.1749-7345.2004.tb00109.x",
    },
    {
      title: "Aqueous Ammonia Equilibrium Calculations: Effect of pH and Temperature",
      publisher: "Journal of the Fisheries Research Board of Canada",
      url: "https://doi.org/10.1139/f75-274",
    },
  ],
};
