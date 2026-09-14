import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultNutritionReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "feed-tray-observations",
  section: "Thức ăn & Kho bãi",
  label: "Kiểm tra nhá thức ăn",
  author: defaultResourceAuthorVI,
  reviewer: defaultNutritionReviewerVI,
  title: "Kiểm Tra Nhá Thức Ăn (Vó Ăn): Đọc Vị Sức Ăn Của Tôm Trước Khi Thức Ăn Biến Thành Chất Thải Đáy Ao",
  description:
    "Hướng dẫn thực hành kiểm tra nhá (vó) thức ăn cho người nuôi tôm thẻ chân trắng: kỹ thuật đánh giá sức ăn, tỷ lệ thức ăn bỏ nhá 0,8–1,5%, thời gian canh nhá 1–2,5 giờ theo cỡ tôm, chẩn đoán đường ruột và gan tụy, điều chỉnh cữ ăn tiếp theo và ngăn ngừa rủi ro ô nhiễm nước.",
  readTime: "7 phút đọc",
  tags: [
    "kiểm tra nhá thức ăn",
    "vó cho ăn",
    "sức ăn của tôm",
    "canh nhá tôm",
    "phản xạ bắt mồi",
    "thức ăn dư thừa",
    "chất lượng nước ao tôm",
    "điều chỉnh cữ ăn",
    "đường ruột tôm",
    "quản lý thức ăn tôm thẻ",
  ],
  publishedAt: "2026-06-08",
  updatedAt: "2026-09-12",
  image: {
    src: "/resources/images/shrimp-feed-tray-observation-vannamei-pond.png",
    alt: "Kỹ thuật viên kiểm tra nhá thức ăn (vó ăn) trong ao nuôi tôm thẻ chân trắng thương phẩm để đánh giá sức ăn, độ đầy đường ruột và lượng thức ăn tiêu thụ thực tế",
    width: 1448,
    height: 1086,
  },
  relatedFeature: { label: "Phần mềm Quản lý Thức ăn & Kho bãi", href: "/vi/features/feed-inventory" },
  takeaways: [
    "Nhá (vó) thức ăn là công cụ thực địa giúp người nuôi quan sát trực tiếp phản xạ bắt mồi và sức ăn thực tế của tôm, thay vì phỏng đoán cảm tính từ bảng định mức trên giấy.",
    "Kết quả kiểm tra nhá phải luôn được đối chiếu đồng bộ với chất lượng nước (DO, pH, nhiệt độ), thời tiết, chu kỳ lột xác và dấu hiệu sức khỏe của tôm trước khi quyết định can thiệp.",
    "Cố định tỷ lệ thức ăn bỏ nhá (0,8%–1,5%), canh dỡ nhá đúng thời gian quy định (1–2,5 giờ theo cỡ tôm) và ghi chép nhật ký chuẩn xác giúp loại bỏ thức ăn thừa, giảm thiểu FCR và bảo vệ nền đáy ao.",
  ],
  faqs: [
    {
      question: "Nên cho tôm ăn bao nhiêu thức ăn mỗi ngày là hợp lý?",
      answer:
        "Hãy sử dụng kế hoạch định mức cho ăn hoặc bảng tỷ lệ thức ăn theo sinh khối của trang trại làm mốc khởi điểm (baseline). Sau đó, điều chỉnh linh hoạt theo sinh khối ước tính thực tế, kích cỡ tôm (MBW), kết quả kiểm tra nhá thức ăn, số liệu chài mẫu mới nhất, các chỉ tiêu chất lượng nước (đặc biệt là oxy hòa tan DO và nhiệt độ), điều kiện thời tiết và tỷ lệ hao hụt hàng ngày. Tuyệt đối không tăng lượng thức ăn chỉ vì thấy nhá hết sạch mà không kiểm chứng xem tốc độ tăng trưởng và sức tải môi trường của ao có đáp ứng được hay không.",
    },
    {
      question: "Thức ăn còn thừa trên nhá (vó) phản ánh điều gì?",
      answer:
        "Thức ăn thừa trên nhá có thể do cho ăn vượt quá nhu cầu thực tế (overfeeding) hoặc sức ăn của đàn tôm bị suy giảm do stress môi trường: nồng độ oxy hòa tan (DO) bị tụt thấp, biến động chất lượng nước (khí độc NH3, NO2- tăng cao hoặc pH dao động mạnh), tôm bước vào chu kỳ lột xác đồng loạt (mass molting), thời tiết thay đổi đột ngột (mưa lớn, nhiệt độ nước giảm sâu) hoặc giai đoạn khởi phát của dịch bệnh. Kỹ thuật viên cần đối chiếu kết quả trên nhiều nhá và rà soát nhật ký môi trường trước khi đưa ra quyết định cắt giảm thức ăn quy mô lớn.",
    },
    {
      question: "Tỷ lệ thức ăn bỏ vào nhá (vó) bao nhiêu là chuẩn xác?",
      answer:
        "Quy chuẩn thực hành tại các trang trại nuôi tôm thương phẩm thường phân bổ từ 0,8% đến 1,5% (hoặc 1% đến 2% tùy mật độ và giai đoạn nuôi) trong tổng lượng thức ăn của cữ ăn đó để chia đều cho tất cả các nhá trong ao. Ví dụ: Nếu cữ ăn đó rải 20 kg thức ăn và ao đặt 4 chiếc nhá, với tỷ lệ bỏ nhá 1,2%, tổng lượng thức ăn cho cả 4 nhá là 240 g, tương đương 60 g cho mỗi chiếc nhá. Yếu tố then chốt là phải cân hoặc đong bằng ca định lượng đồng nhất giữa các cữ để đảm bảo tính chuẩn xác và nhất quán của dữ liệu đánh giá.",
    },
    {
      question: "Thời gian canh nhá (thời gian dỡ kiểm tra nhá) sau khi rải thức ăn là bao lâu?",
      answer:
        "Thời gian canh nhá được điều chỉnh theo ngày tuổi (DOC) và kích cỡ tôm (MBW): Giai đoạn tôm nhỏ (DOC 15–30, tôm < 3 g), tôm di chuyển chậm nên thời gian canh nhá từ 2,0 đến 2,5 giờ; Giai đoạn tôm lứa (DOC 31–60, tôm 3–12 g), thời gian canh nhá rút xuống 1,5 đến 2,0 giờ; Giai đoạn tôm lớn (DOC > 60 hoặc tôm > 12–15 g) hoặc vào các cữ trưa khi nhiệt độ nước cao và trao đổi chất mạnh, thời gian canh nhá chỉ từ 1,0 đến 1,5 giờ. Việc canh dỡ nhá đúng giờ giúp đánh giá chính xác sức ăn trước khi viên thức ăn bị rã nát trong nước.",
    },
    {
      question: "Cần kiểm tra những chỉ tiêu sinh học nào khi kéo nhá lên?",
      answer:
        "Bên cạnh việc quan sát lượng viên thức ăn còn lại, kỹ thuật viên bắt buộc phải kiểm tra 5 chỉ tiêu sinh học lâm sàng trên tôm: (1) Sức vận động và độ linh hoạt của tôm trên nhá (búng nhảy khỏe mạnh hay lờ đờ, yếu ớt); (2) Độ đầy của đường ruột (ruột căng đầy thức ăn, ruột đứt đoạn ngắt quãng, hay rỗng ruột); (3) Tình trạng khối gan tụy (gan màu nâu đen đồng nhất, săn chắc hay sưng to, teo nhỏ, nhợt nhạt, ửng đỏ); (4) Trạng thái phân tôm (sợi phân chắc, chìm đáy hay nhão nhớt, nổi màng, có mủ trắng - dấu hiệu bệnh phân trắng WFS); và (5) Vỏ lột xác (nhận biết đàn tôm đang lột xác đồng loạt).",
    },
    {
      question: "Quy tắc chuẩn điều chỉnh tăng hoặc giảm lượng thức ăn ở cữ tiếp theo dựa trên kết quả kiểm tra nhá?",
      answer:
        "Nếu tất cả các nhá hết sạch hoàn toàn (0% thức ăn thừa) và chất lượng nước tối ưu, có thể tăng cữ ăn tiếp theo thêm 5%–10% (tổng mức tăng không quá 10% trong vòng 24 giờ). Nếu nhá còn vương một ít thức ăn vụn (< 10%), giữ nguyên lượng thức ăn (hold). Nếu thức ăn thừa ở mức vừa phải (20%–50%), giảm lượng thức ăn cữ tiếp theo từ 20%–30%. Nếu thức ăn còn thừa nhiều (> 50% hoặc gần như còn nguyên), cần cắt giảm 50%–100% hoặc ngưng cữ tiếp theo (skip feed), lập tức bật tối đa quạt khí và khẩn trương kiểm tra toàn diện các chỉ tiêu môi trường và sức khỏe tôm.",
    },
  ],
  sections: [
    {
      heading: "Bản chất của việc kiểm tra nhá: Đọc vị phản xạ bắt mồi và sức ăn thực tế của tôm",
      body: [
        "Nhá thức ăn (hay vó cho ăn, sàng ăn) là công cụ quan trắc thực địa đơn giản nhưng giữ vai trò quyết định trong các mô hình nuôi tôm thẻ chân trắng thâm canh và siêu thâm canh, nhằm xác nhận đàn tôm có tiêu thụ hết lượng thức ăn dự kiến hay không. Nhá không phải là công cụ tính toán chính xác tuyệt đối sinh khối tôm trong ao, mà đóng vai trò như một 'cửa sổ sinh học trực tiếp' giúp kỹ thuật viên đọc vị sức ăn, hành vi vận động và sức khỏe đường ruột của tôm trước khi lượng cám dư thừa kịp phân hủy thành chất độc hại ở nền đáy.",
        "Theo các tài liệu kỹ thuật nuôi trồng thủy sản của FAO (Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc), nhá cho ăn có hai chức năng song hành: vừa là nơi cung cấp thức ăn cục bộ, vừa là công cụ giám sát mức độ tiêu thụ dinh dưỡng và tốc độ tăng trưởng. Trong nuôi tôm thương phẩm, chi phí thức ăn chiếm từ 50% đến 70% tổng chi phí vận hành vụ nuôi. Thức ăn không được tôm ăn hết không chỉ làm lãng phí tiền của người nuôi mà còn nhanh chóng phân hủy tạo ra khí độc amoniac (NH₃) và nitrit (NO₂⁻), rút cạn nồng độ oxy hòa tan (DO), hình thành lớp bùn đen kỵ khí dưới đáy ao và kích thích vi khuẩn gây bệnh Vibrio bùng phát.",
      ],
    },
    {
      heading: "Chuẩn hóa quy trình vận hành nhá: Vị trí đặt, tỷ lệ thức ăn bỏ nhá và thời gian canh dỡ",
      body: [
        "Độ tin cậy của việc kiểm tra nhá phụ thuộc hoàn toàn vào việc tuân thủ quy trình vận hành chuẩn (SOP) một cách nhất quán tại bờ ao. Việc đặt nhá sai vị trí hoặc thời gian dỡ nhá tùy tiện sẽ tạo ra dữ liệu ảo (sai lệch), dẫn đến những quyết định tăng giảm thức ăn sai lầm gây tổn hại cho cả vụ nuôi.",
        "Các kỹ sư và chủ trang trại chuyên nghiệp luôn áp dụng các nguyên tắc chuẩn hóa sau:",
      ],
      items: [
        "Vị trí đặt nhá thức ăn: Đặt nhá cách chân bờ ao khoảng 2 đến 4 mét tại vùng đáy ao sạch, cứng, bằng phẳng và tuyệt đối không đặt vào khu vực tích tụ bùn đen rốn ao. Nhá phải nằm ngoài dòng nước chảy xiết trực diện của cánh quạt nước nhưng vẫn nằm trên tuyến đường di chuyển tìm mồi tự nhiên của tôm. Với ao nuôi diện tích 1.000–3.000 m², thông thường bố trí từ 4 đến 6 chiếc nhá phân bổ đều xung quanh ao.",
        "Tỷ lệ thức ăn bỏ vào nhá (0,8%–1,5%): Cân định lượng khoảng 0,8% đến 1,5% (hoặc 1%–2% tùy giai đoạn) tổng lượng thức ăn của cữ ăn đó để rải đều vào các nhá trong ao. Kỹ thuật viên phải sử dụng ca đong có vạch chia hoặc cân tiểu ly điện tử đã hiệu chuẩn để đảm bảo tỷ lệ thức ăn bỏ vào nhá luôn đồng nhất giữa các cữ ăn, tránh ước lượng bằng tay hay bằng mắt.",
        "Thời gian canh dỡ nhá (1,0–2,5 giờ theo cỡ tôm): Thời gian kéo dỡ nhá cần được điều chỉnh chính xác theo kích cỡ tôm (MBW) và tốc độ trao đổi chất: Giai đoạn tôm giống mới thả đến tôm nhỏ (DOC 15–30, tôm < 3 g) canh dỡ sau 2,0–2,5 giờ; Giai đoạn tôm lứa (DOC 31–60, tôm 3–12 g) canh dỡ sau 1,5–2,0 giờ; Giai đoạn tôm lớn (DOC > 60 hoặc tôm > 12–15 g) canh dỡ sau 1,0–1,5 giờ. Canh dỡ đúng giờ đảm bảo tôm có đủ thời gian bắt mồi trước khi viên cám bị rã nát và phân rã vào môi trường nước.",
      ],
    },
    {
      heading: "Các chỉ tiêu quan sát sinh học: Đánh giá thức ăn thừa, đường ruột, gan tụy và phân tôm",
      body: [
        "Khi kỹ thuật viên kéo nhá lên khỏi mặt nước một cách nhẹ nhàng, tuyệt đối không chỉ chăm chú nhìn xem viên cám còn hay hết. Mỗi lần dỡ nhá thực chất là một lần thăm khám lâm sàng trực tiếp sức khỏe của đàn tôm.",
        "Các chỉ tiêu sinh học trọng yếu bắt buộc phải kiểm tra kỹ trên nhá bao gồm:",
      ],
      items: [
        "Đánh giá định lượng lượng thức ăn còn thừa: Quan sát khách quan tỷ lệ thức ăn còn sót lại trên lưới nhá (hết sạch hoàn toàn 0%, còn vương một ít hạt vụn < 10%, thức ăn thừa mức trung bình 20%–50%, hoặc thức ăn còn thừa nhiều trên 50% đến gần như nguyên vẹn).",
        "Độ đầy của đường ruột tôm (độ no): Chọn ngẫu nhiên vài con tôm trên nhá và soi dưới ánh sáng tự nhiên. Tôm khỏe mạnh, bắt mồi tích cực sẽ có ruột căng đầy thức ăn (Full gut), thức ăn liên tục tạo thành một dải màu nâu sẫm đều đặn từ đốt đầu đến chóp đuôi. Nếu đường ruột trống rỗng, đứt khúc từng đoạn ngắt quãng hoặc có màu trắng đục, đó là dấu hiệu tôm đã ngừng ăn do sốc môi trường hoặc đang gặp vấn đề ở hệ tiêu hóa.",
        "Tình trạng khối gan tụy (Hepatopancreas): Gan tụy ở phần đầu tôm khỏe mạnh phải có kích thước đầy đặn, màng bao sắc nét, màu nâu đen bóng hoặc nâu vàng sẫm tự nhiên. Nếu thấy gan tụy bị sưng to, teo nhỏ, nhũn mềm, nhợt nhạt hoặc ửng đỏ bất thường, đây là tín hiệu cảnh báo nguy hiểm của tình trạng nhiễm độc đáy ao hoặc giai đoạn đầu của bệnh hoại tử gan tụy cấp (AHPND) hoặc nhiễm vi bào tử trùng (EHP).",
        "Đặc điểm phân tôm (Feces): Các sợi phân tôm bám lại trên mặt nhá phải có dạng hình trụ thuôn dài, chắc, dai và chìm xuống đáy. Nếu phân nát vụn, nhão nhớt, nổi bồng bềnh trên mặt nước hoặc xuất hiện các sợi phân màu trắng, đây là triệu chứng cảnh báo sớm của hội chứng phân trắng (WFS).",
        "Vỏ lột xác của tôm (Molting shells): Việc phát hiện nhiều mảnh vỏ tôm lột trên nhá cho thấy đàn tôm trong ao đang bước vào chu kỳ lột xác đồng loạt (mass molting). Trong giai đoạn này, sức ăn của tôm sẽ tự nhiên giảm sút từ 20%–40% trong vòng 24 đến 48 giờ, do đó cần chủ động ghìm lượng thức ăn lại để không làm ôi thiu đáy ao.",
      ],
    },
    {
      heading: "Bảng đánh giá thức ăn thừa trên nhá và quy chuẩn điều chỉnh cữ ăn tiếp theo",
      body: [
        "Tuyệt đối không điều chỉnh lượng thức ăn theo cảm tính hay phỏng đoán chủ quan. Hãy áp dụng quy trình điều chỉnh cữ ăn chuẩn hóa (SOP) dựa trên kết quả kiểm tra nhá và điều kiện ao nuôi như sau:",
      ],
      table: {
        columns: [
          "Kết quả kiểm tra nhá",
          "Tình trạng sinh học & Môi trường ao",
          "Điều chỉnh cữ ăn tiếp theo",
          "Hành động vận hành & Kiểm soát nước",
        ],
        rows: [
          [
            "Hết sạch (0% thức ăn thừa)",
            "Sức ăn mạnh, sinh khối tăng nhanh hoặc định mức cho ăn chưa đủ",
            "Tăng nhẹ 5% – 10% lượng thức ăn cữ sau (nếu DO và nhiệt độ tối ưu)",
            "Duy trì quạt nước bình thường, kiểm tra amoniac và nitrit định kỳ",
          ],
          [
            "Còn ít (< 10% thức ăn vụn)",
            "Khẩu phần thức ăn vừa vặn, phù hợp với sinh khối và sức tải của ao",
            "Giữ nguyên lượng thức ăn (Hold feeding ration)",
            "Vận hành quạt khí và đo đạc các chỉ tiêu nước theo lịch trình",
          ],
          [
            "Thừa vừa phải (20% – 50%)",
            "Tôm giảm ăn, bắt đầu chu kỳ lột xác, cho ăn dư nhẹ hoặc DO suy giảm",
            "Cắt giảm 20% – 30% lượng thức ăn cữ tiếp theo",
            "Đo ngay nồng độ DO và nhiệt độ nước; vệ sinh sạch thức ăn ôi thiu trên nhá",
          ],
          [
            "Thừa nhiều (> 50% đến nguyên nhá)",
            "Tôm bị stress nặng, oxy tụt nguy cấp (< 3,5 mg/L), khí độc bùng phát hoặc dịch bệnh",
            "Ngưng cữ ăn tiếp theo (Skip feed) hoặc cắt giảm 50% – 100%",
            "Bật toàn bộ hệ thống quạt khí khẩn cấp, rà soát tôm rớt đáy và xét nghiệm mẫu tôm",
          ],
        ],
      },
      note: "Quy tắc an toàn sống còn: Không được phép tăng tổng lượng thức ăn cả ngày vượt quá 10% trong vòng 24 giờ, ngay cả khi các nhá đều hết sạch thức ăn liên tục. Việc thúc mồi quá nhanh sẽ làm vượt ngưỡng tự làm sạch sinh học của ao và là nguyên nhân hàng đầu khiến khí độc amoniac (NH3) và nitrit (NO2-) bùng nổ đột ngột.",
    },
    {
      heading: "Tránh phản ứng thái quá trước một nhá đơn lẻ: Nguyên tắc liên kết dữ liệu toàn diện",
      body: [
        "Một chiếc nhá còn thức ăn không phải là căn cứ để cắt giảm ồ ạt lượng thức ăn của toàn bộ ao. Ngược lại, một chiếc nhá hết sạch bóng cũng không đồng nghĩa với việc toàn bộ đàn tôm trong ao đang bị đói. Hướng dòng chảy của quạt nước, khu vực lắng tụ bùn bã hữu cơ hay các vùng nước quẩn thiếu oxy (vùng chết) có thể khiến tôm tập trung không đều ở các góc ao.",
        "Nguyên tắc vận hành tối ưu trong nuôi tôm công nghiệp là ghi chép số liệu của tất cả các nhá một cách có hệ thống, tính trung bình mức độ ăn của toàn ao, sau đó đối chiếu đa chiều với các yếu tố môi trường:",
        "Nồng độ oxy hòa tan (DO): Nếu DO giảm xuống dưới ngưỡng an toàn (< 4,0 mg/L), quá trình hô hấp của tôm bị ức chế khiến tôm tự động ngừng bắt mồi. Cố tình rải thêm thức ăn trong lúc thiếu oxy chỉ đẩy nhanh tốc độ tôm chết ngạt rớt đáy.",
        "Nhiệt độ nước ao: Khi nhiệt độ nước sụt giảm do mưa lớn kéo dài hoặc thời tiết trở lạnh (< 26°C), cường độ trao đổi chất của tôm giảm từ 30% đến 50%. Lúc này cần chủ động cắt giảm lượng thức ăn tương ứng ngay lập tức.",
        "Độ pH và các hợp chất nitơ độc: Độ pH dao động quá lớn (> 0,5 đơn vị giữa sáng và chiều) cùng với sự gia tăng của tổng amoniac (TAN) và nitrit (NO₂⁻) sẽ gây stress sinh lý nghiêm trọng, ức chế phản xạ thèm ăn của đàn tôm.",
        "Để thiết lập định mức khẩu phần ăn ban đầu chuẩn xác trước khi kiểm tra nhá, hãy tham khảo [Bảng tra & Công cụ tính tỷ lệ cho ăn tôm thẻ chân trắng](/vi/resources/vannamei-feeding-rate) để xác định lượng thức ăn theo tỷ lệ phần trăm sinh khối và trọng lượng thân trung bình (MBW). Đồng thời, hãy chuẩn hóa việc ghi chép nhật ký ao qua [Phần mềm Quản lý Nhật ký Trại Tôm](/vi/resources/shrimp-farm-record-keeping) và định kỳ đánh giá hiệu quả chuyển đổi dinh dưỡng tại [Tối Ưu Hóa Hệ Số FCR Trong Nuôi Tôm](/vi/resources/fcr-shrimp-farming).",
      ],
    },
  ],
  checklist: [
    "Đặt nhá thức ăn ở vị trí đại diện (đáy bằng phẳng, sạch bùn đen, ngoài luồng nước xiết của quạt khí).",
    "Cân đong lượng thức ăn bỏ vào nhá chuẩn xác và nhất quán (0,8% đến 1,5% tổng lượng thức ăn cữ đó).",
    "Nghiêm túc dỡ canh nhá đúng giờ quy định (1,0 đến 2,5 giờ tùy theo kích cỡ tôm và ngày tuổi DOC).",
    "Quan sát kỹ các chỉ tiêu sinh học trên tôm khi kéo nhá gồm độ đầy đường ruột, màu sắc gan tụy, trạng thái phân tôm và dấu hiệu lột xác.",
    "Lấy trung bình kết quả đánh giá của tất cả các nhá trước khi ra quyết định tăng, giữ nguyên hay cắt giảm cữ ăn tiếp theo.",
    "Kiểm tra nồng độ oxy hòa tan (DO), nhiệt độ nước và thời tiết trước khi phê duyệt bất kỳ quyết định tăng thức ăn nào.",
    "Vệ sinh sạch sẽ nhá thức ăn, loại bỏ hoàn toàn thức ăn cũ ôi thiu và rong nhớt bám trên lưới trước mỗi cữ cho ăn mới.",
  ],
  sources: [
    {
      title: "Shrimp Feed Management: Issues and Perspectives",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/T583/root/18.pdf",
    },
    {
      title: "How do I keep track of the results of feeding?",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/4/s4314e/s4314e0a.htm",
    },
    {
      title: "Nutrient Impacts of Finfish Aquaculture",
      publisher: "NOAA Fisheries",
      url: "https://www.fisheries.noaa.gov/aquaculture/nutrient-impacts-finfish-aquaculture",
    },
  ],
};
