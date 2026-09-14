import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultTechnicalReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "shrimp-pond-water-colour-algae",
  section: "Chất lượng nước, Sức khỏe & Rủi ro",
  label: "Chất lượng nước",
  author: defaultResourceAuthorVI,
  reviewer: defaultTechnicalReviewerVI,
  title: "Màu Nước Ao Tôm: Các Loại Tảo, Rủi Ro và Giải Pháp Quản Lý",
  description: "Tìm hiểu ý nghĩa các màu nước ao tôm như xanh lục, nâu trà, xanh lam, đỏ mận, nước trong hoặc nước xanh đen, cùng hướng dẫn giám sát và quản lý hệ tảo an toàn, bền vững.",
  readTime: "13 phút đọc",
  tags: [
    "màu nước ao tôm",
    "thực vật phù du ao tôm",
    "tảo trong ao nuôi tôm",
    "vi khuẩn lam tảo lam",
    "sụp tảo rớt tảo",
    "oxy hòa tan",
  ],
  publishedAt: "2026-08-28",
  image: {
    src: "/resources/images/shrimp-pond-water-colour-algae-infographic.jpg",
    alt: "Infographic Shrimply so sánh các màu nước ao tôm: xanh lục, nâu vàng, xanh lam và xanh đen cùng hướng dẫn giám sát chất lượng nước",
    width: 1672,
    height: 941,
  },
  updatedAt: "2026-09-12",
  relatedFeature: { label: "Phần mềm Quản lý Chất lượng Nước", href: "/vi/features/water-quality-monitoring" },
  takeaways: [
    "Màu nước chỉ là dấu hiệu nhận biết ban đầu, không phải là kết luận định danh chính xác loài tảo hay chẩn đoán tuyệt đối về tình trạng ao nuôi.",
    "Màu nước biến đổi nhanh chóng là tín hiệu cảnh báo cần kiểm tra khẩn cấp oxy hòa tan (DO), pH, độ trong đĩa Secchi, khí độc amonia (NH3/TAN) và nitrit (NO2).",
    "Luôn soi mẫu dưới kính hiển vi để xác định nhóm sinh vật phù du chiếm ưu thế trước khi quyết định tạt bất kỳ loại hóa chất hay chế phẩm xử lý nào.",
  ],
  sections: [
    {
      heading: "Tóm tắt nhanh",
      body: [
        "Màu nước ao tôm cung cấp manh mối ban đầu quan trọng về mật độ thực vật phù du (tảo) và những biến động sinh học trong môi trường nước. Tuy nhiên, chỉ dựa vào màu nước quan sát bằng mắt thường thì không thể định danh chính xác loài tảo cũng như không thể khẳng định đợt nở hoa của tảo (algae bloom) có gây độc hại hay không.",
        "Khi màu nước thay đổi nhanh chóng, bước đầu tiên cần làm là đo ngay nồng độ oxy hòa tan (DO), pH, độ trong (đĩa Secchi), khí độc amonia và nitrit. Nếu tôm có biểu hiện tụ tập quanh dàn quạt nước, bơi lờ đờ sát mặt nước hoặc ghi nhận hiện tượng tôm chết rớt đáy, hãy kích hoạt ngay quy trình xử lý cấp cứu khẩn cấp.",
      ],
    },
    {
      heading: "Tại sao màu nước ao nuôi tôm lại quan trọng",
      body: [
        "Một quần thể thực vật phù du phát triển ổn định giúp sản sinh oxy hòa tan qua quá trình quang hợp vào ban ngày, hấp thu các muối dinh dưỡng vô cơ dư thừa và cung cấp nguồn thức ăn tự nhiên giàu dưỡng chất cho tôm nhỏ. Nước màu nâu trà giàu tảo silic (tảo khuê / Diatoms) thường mang lại nhiều lợi ích lớn cho ao nuôi, nhưng sự hiện diện thực tế của chúng không thể chỉ khẳng định qua cảm quan màu nước mắt thường.",
        "Mật độ tảo phát triển quá dày đặc hoặc thiếu ổn định có thể đẩy pH buổi chiều tăng vọt, tiêu hao cạn kiệt oxy hòa tan vào ban đêm do quá trình hô hấp và làm tăng nguy cơ sụt giảm oxy nghiêm trọng (oxygen crash) vào lúc rạng sáng. Khi tảo tàn hoặc sụp tảo (plankton crash), vi khuẩn dị dưỡng sẽ phân hủy xác tảo chết và ngốn sạch lượng oxy hòa tan còn lại. Nước ao có thể nhanh chóng chuyển sang trong veo hoặc đục màu nước vo gạo, kèm theo sự bùng phát dữ dội của khí độc amonia và mùn bã hữu cơ lơ lửng.",
      ],
    },
    {
      heading: "Bảng tra cứu nhanh màu nước ao nuôi tôm",
      body: [
        "Hãy sử dụng màu nước như một tín hiệu nhắc nhở để tiến hành đo đạc các chỉ tiêu hóa lý thực tế, thay vì vội vàng đưa ra kết luận chẩn đoán. Ví dụ, vi khuẩn lam (tảo lam) không chỉ biểu hiện màu xanh lam mà đôi khi có thể xuất hiện với sắc thái nâu xám, vàng lục hoặc thậm chí đỏ sẫm.",
      ],
      table: {
        columns: ["Màu nước", "Dấu hiệu chỉ điểm khả dĩ", "Lợi ích tiềm năng hoặc rủi ro", "Hành động kiểm tra tiếp theo"],
        rows: [
          ["Xanh lục (xanh đọt chuối)", "Tảo lục (Chlorophytes) hoặc quần thể thực vật phù du hỗn hợp", "Mật độ nở hoa ổn định rất có lợi cho ao; nếu phát triển quá dày đặc sẽ làm tụt giảm oxy nghiêm trọng vào ban đêm", "Đo DO trước lúc bình minh, đo pH chiều muộn và kiểm tra độ trong đĩa Secchi"],
          ["Xanh vàng (vàng lục)", "Hỗn hợp tảo lục, vi khuẩn lam hoặc vật chất hữu cơ lơ lửng", "Có thể là trạng thái sinh học bình thường hoặc dấu hiệu cảnh báo sự chuyển giao loài tảo ưu thế", "So sánh màu nước liên tục qua nhiều ngày và soi mẫu kiểm tra dưới kính hiển vi"],
          ["Nâu vàng (màu trà nhạt)", "Nhiều khả năng là tảo silic (tảo khuê / Diatoms) hoặc phù sa, hạt đất sét lơ lửng", "Tảo silic thúc đẩy năng suất tự nhiên và là thức ăn giàu dinh dưỡng, nhưng màu nước mắt thường chưa phải bằng chứng khoa học", "Kiểm tra độ trong đĩa Secchi, soi kính hiển vi và đánh giá chất lượng nguồn nước cấp vào"],
          ["Nâu đậm (màu trà đậm / nâu cánh gián)", "Có thể do tảo silic, tảo giáp (Dinoflagellates) hoặc hỗn hợp nhiều nhóm tảo", "Có thể mang lại lợi ích hoặc gây hại nghiêm trọng tùy thuộc vào loài vi tảo ưu thế và mật độ tế bào", "Soi kính hiển vi định danh sinh vật, theo dõi sát dao động nồng độ oxy hòa tan (DO) và pH"],
          ["Xanh lam (xanh ngọc / xanh mực)", "Nhiều khả năng do vi khuẩn lam (tảo lam / Cyanobacteria)", "Một số loài tiết độc tố sinh học, gây mùi hôi tanh bùn đất (geosmin), làm suy thoái chất lượng nước và tổn thương gan tụy tôm", "Quan sát váng bọt nhớt nổi trên mặt nước, tổ chức soi kính hiển vi hoặc gửi mẫu phòng xét nghiệm chuyên sâu"],
          ["Xanh đậm (xanh rêu đặc quánh)", "Hiện tượng tảo nở hoa quá mức (mật độ tảo cực dày)", "Nguy cơ rất cao: pH vọt cao buổi chiều, DO tụt dốc nguy cấp lúc rạng sáng và dễ sụp tảo hàng loạt", "Đo DO trước khi mặt trời mọc, đo pH lúc sáng sớm và chiều muộn, kiểm tra độ trong đĩa Secchi"],
          ["Đỏ hoặc nâu đỏ (nước màu bã trầu)", "Các loài vi tảo có sắc tố đỏ, bao gồm cả tảo giáp (Dinoflagellates)", "Một số loài có thể tiết độc tố sinh học, bám dính gây tổn thương hoặc tắc nghẽn mang tôm", "Soi kính hiển vi định danh chính xác loài sinh vật trước khi đưa ra bất kỳ giải pháp xử lý nào"],
          ["Nước trong (nước trơ / mất màu)", "Mật độ tảo quá nghèo nàn, vừa xảy ra hiện tượng sụp tảo hoặc quá trình keo tụ lắng đọng mạnh", "Suy giảm năng suất tự nhiên; hiện tượng nước trong đột ngột thường báo trước khủng hoảng thiếu oxy hoặc bùng nổ khí độc", "Đo khẩn cấp nồng độ oxy hòa tan, khí độc amonia, nitrit và kiểm tra lại lịch sử màu nước những ngày gần nhất"],
          ["Đục như sữa hoặc trắng đục vo gạo", "Xác tảo tàn phân hủy, bùng phát vi khuẩn, hạt sét mịn lơ lửng hoặc tích tụ mùn bã hữu cơ", "Dấu hiệu của quá trình phân hủy hữu cơ kịch liệt tiêu hao lượng lớn oxy hòa tan", "Kiểm tra oxy hòa tan, amonia, mùi hôi của nước, tình trạng bùn hố xiphông đáy và soi tươi dưới kính hiển vi"],
        ],
      },
    },
    {
      heading: "Tảo trong ao tôm: Có lợi hay có hại?",
      body: [
        "Tảo không phải là tác nhân mặc định gây hại cho ao nuôi. Câu hỏi quan trọng cần xác định là liệu quần thể tảo đó có ổn định, mật độ có nằm trong ngưỡng cho phép và diễn biến của oxy hòa tan cũng như pH có duy trì an toàn hay không.",
        "Một hệ tảo ổn định sẽ bổ sung nguồn oxy dồi dào nhờ quang hợp vào ban ngày, hấp thu các hợp chất dinh dưỡng dư thừa, che chắn bớt ánh sáng chiếu xuống đáy ao để ngăn chặn rong đáy (rong nhớt, rong đuôi chồn) phát triển, đồng thời là nguồn thức ăn tự nhiên quý giá cho ấu trùng tôm (post-larvae) và các sinh vật phù du có ích. Ngược lại, một đợt bùng phát tảo mất kiểm soát sẽ rút cạn oxy vào ban đêm, đẩy pH buổi chiều lên quá cao (> 9,0), rất dễ bị sụp tảo hàng loạt sau những đợt mưa dầm thiếu nắng, hoặc có thể chứa các loài vi tảo tiết độc tố nguy hiểm.",
      ],
    },
    {
      heading: "Các ngưỡng tham chiếu chất lượng nước thực tế",
      body: [
        "Các số liệu dưới đây là các mốc tham chiếu thực hành quản lý ao nuôi phổ biến, không phải là giới hạn bất biến cho mọi mô hình. Đối tượng nuôi, mật độ thả, tổng sinh khối đàn tôm, nhiệt độ nước, độ mặn, kết cấu công trình ao và quy trình vận hành riêng của từng trang trại đều tác động đến ngưỡng an toàn thực tế.",
      ],
      table: {
        columns: ["Chỉ tiêu đo đạc", "Ngưỡng tham chiếu thực tế", "Dấu hiệu cảnh báo nguy hiểm", "Bối cảnh kỹ thuật quan trọng"],
        rows: [
          ["Oxy hòa tan (DO)", "Mục tiêu luôn duy trì trên 4,0 mg/L (tối ưu > 5,0 mg/L)", "Chỉ số DO lúc rạng sáng liên tục sụt giảm hoặc tôm có biểu hiện stress, nổi đầu", "Nhu cầu oxy thay đổi theo kích cỡ tôm, tổng sinh khối trong ao, nhiệt độ nước và độ mặn"],
          ["Độ pH", "Khoảng thích hợp thông thường từ 7,5–8,5 (biên độ dao động ngày đêm < 0,5)", "pH buổi chiều tiệm cận hoặc vượt quá 9,0 (đặc biệt nguy hiểm nếu ≥ 9,5)", "Luôn so sánh chỉ số đo lúc bình minh và chiều muộn thay vì chỉ căn cứ vào một thời điểm duy nhất"],
          ["Độ trong (đĩa Secchi)", "Khoảng 30–40 cm đối với ao quản lý hệ tảo thương phẩm tốt (cho phép 25–40 cm)", "Dưới 25 cm báo hiệu mật độ tảo quá dày đặc; trên 45–50 cm nước quá trong", "Chỉ phản ánh chính xác mật độ tảo khi độ đục không bị chi phối bởi hạt phù sa hoặc chất lơ lửng vô cơ"],
          ["Màu nước ao", "Duy trì trạng thái ổn định qua từng ngày", "Màu nước đổi màu đột ngột, nước mất màu trong veo, nổi báng bọt/váng nhớt hoặc xuất hiện màu lạ", "Quan sát tại cùng một vị trí cố định, cùng góc nhìn và cùng thời điểm mỗi ngày"],
        ],
      },
    },
    {
      heading: "Nước ao màu xanh lục (nước xanh)",
      body: [
        "Nước ao có màu xanh lục (xanh đọt chuối hoặc xanh nõn chuối) thường biểu thị sự chiếm ưu thế của tảo lục (Chlorophytes) hoặc một quần xã thực vật phù du hỗn hợp lành tính. Quần thể tảo lục phát triển ổn định giúp nâng cao năng suất sinh học của ao nuôi, đặc biệt là trong giai đoạn đầu đến giữa vụ.",
        "Tuy nhiên, nếu nước ao chuyển sang màu xanh rêu đậm đặc quánh, điều đó cảnh báo mật độ thực vật phù du đã vượt ngưỡng kiểm soát. Vào ban ngày, quá trình quang hợp mạnh có thể tạo ra nồng độ oxy hòa tan và pH rất cao, nhưng mọi sinh vật trong ao đều tiêu thụ oxy sau khi mặt trời lặn. Thời điểm lượng oxy hòa tan chạm đáy thấp nhất và nguy hiểm nhất cho tôm thường rơi vào khoảng 4:00 - 5:30 sáng trước khi mặt trời mọc.",
      ],
      items: [
        "Đo nồng độ oxy hòa tan (DO) trước lúc mặt trời mọc và vào chiều muộn.",
        "Đo pH vào lúc sáng sớm và chiều muộn để đánh giá biên độ dao động trong ngày.",
        "Theo dõi độ trong đĩa Secchi, phản xạ ăn của tôm trên nhá (sàn ăn) và hành vi của đàn tôm.",
      ],
    },
    {
      heading: "Nước ao màu nâu hoặc nâu vàng (màu nước trà)",
      body: [
        "Nước ao màu nâu vàng (màu vỏ đỗ, màu nước trà) thường phản ánh sự phát triển của tảo silic (tảo khuê / Diatoms) – nhóm vi tảo được coi là nguồn thức ăn tự nhiên giàu axit béo không no và khoáng chất tuyệt vời cho tôm. Tuy nhiên, màu nước nâu cũng có thể xuất phát từ sự bùng phát của tảo giáp (Dinoflagellates), hạt phù sa/đất xói mòn từ bờ ao, hoặc hỗn hợp nhiều loại sinh vật phù du khác.",
        "Tuyệt đối không vội vàng kết luận ao nước màu nâu là 'tảo khuê có lợi' nếu chưa soi kiểm tra dưới kính hiển vi. Hai ao tôm có màu nước nâu nhìn bằng mắt thường rất giống nhau nhưng có thể đang chứa hai hệ sinh thái vi sinh vật hoàn toàn đối nghịch về mức độ an toàn.",
      ],
    },
    {
      heading: "Nước ao màu xanh lam (xanh ngọc / tảo lam)",
      body: [
        "Nước có màu xanh lam đậm, xuất hiện các vệt màng sơn trôi nổi, báng bọt đặc hoặc váng nhầy trên mặt nước kèm theo mùi bùn đất tanh nồng (geosmin) là dấu hiệu cảnh báo đặc trưng của vi khuẩn lam (tảo lam / Cyanobacteria). Nhiệt độ nước cao, nắng gắt kéo dài, sự xáo trộn tầng nước kém (ao tĩnh) cùng với sự tích tụ dư thừa nitơ và photpho từ thức ăn thừa là những điều kiện lý tưởng kích thích tảo lam bùng phát.",
        "Nhiều loài vi khuẩn lam có khả năng tiết ra độc tố sinh học (như microcystin) gây teo gan tụy, viêm ruột và hoại tử đường tiêu hóa của tôm, nhưng việc chỉ nhìn màu nước không thể khẳng định nồng độ độc tố cụ thể. Hãy nhanh chóng lấy mẫu soi kính hiển vi hoặc gửi mẫu đến phòng xét nghiệm chuyên môn nếu tôm có biểu hiện bỏ ăn, ruột đứt khúc hoặc xuất hiện hao hụt bất thường.",
      ],
    },
    {
      heading: "Nước ao màu đỏ hoặc nâu đỏ (nước màu bã trầu)",
      body: [
        "Nước ao chuyển sang màu đỏ gạch, nâu đỏ hoặc màu bã trầu thường do sự bùng phát của tảo giáp (Dinoflagellates) hoặc các loài vi tảo chứa sắc tố carotenoid khác. Một số loài tảo giáp tương đối vô hại, nhưng cũng có những chi loài tiết độc tố sinh học cực mạnh, tiết chất nhầy bám dính gây nghẽn mang tôm hoặc gây tụt giảm oxy nghiêm trọng.",
        "Cần xem xét kỹ: Màu đỏ xuất hiện nhanh hay chậm, có tạo thành các vệt màu loang lổ hay tụ mảng trên mặt nước hay không, phản xạ bơi lội của tôm, tỷ lệ hao hụt tôm rớt đáy, nồng độ oxy hòa tan trước rạng sáng và soi mẫu định danh dưới kính hiển vi. Tránh việc đưa ra quyết định xử lý hóa chất chỉ dựa trên nhận định cảm tính về màu nước.",
      ],
    },
    {
      heading: "Nước trong hoặc đục sữa và hiện tượng sụp tảo (rớt tảo)",
      body: [
        "Nước ao trong dần dần từ từ có thể chỉ đơn thuần do mật độ thực vật phù du thưa thớt, nghèo dinh dưỡng. Tuy nhiên, nếu nước ao đang có màu đậm mà đột ngột chuyển sang trong veo chỉ sau một đêm hoặc vài giờ, đó là dấu hiệu chắc chắn của hiện tượng sụp tảo (rớt tảo / plankton crash).",
        "Sau khi sụp tảo, nguồn sinh oxy tự nhiên từ quang hợp bị cắt đứt hoàn toàn, trong khi quần thể vi khuẩn dị dưỡng sẽ tiêu thụ lượng oxy khổng lồ để phân hủy sinh khối xác tảo chết chìm dưới đáy. Khí độc amonia (NH3/TAN) và mùn bã hữu cơ sẽ tăng vọt, tạo điều kiện cho vi khuẩn có hại (như Vibrio) bùng nổ hoặc làm bùng phát một đợt nở hoa của loài tảo độc khác khó kiểm soát hơn.",
      ],
    },
    {
      heading: "Các dấu hiệu cảnh báo một đợt nở hoa nguy hiểm của tảo",
      body: [
        "Sự thay đổi bất thường trong hành vi của tôm cũng có thể do sốc nhiệt, mầm bệnh truyền nhiễm hoặc các thông số hóa lý khác suy giảm. Hãy luôn kiểm tra toàn diện các chỉ số môi trường ao nuôi trước khi đưa ra kết luận về nguyên nhân gốc rễ.",
      ],
      items: [
        "Màu nước ao thay đổi quá nhanh, nước đột ngột trong veo hoặc bề mặt hình thành lớp váng bọt, màng sơn dính nhớt.",
        "Nước ao bốc mùi tanh hôi nồng nặc, mùi trứng thối (H2S) hoặc mùi ẩm mốc khó chịu.",
        "Độ trong đĩa Secchi tụt dốc nhanh chóng (< 25 cm) hoặc chênh lệch giữa pH sáng và pH chiều nới rộng (> 0,5 đơn vị).",
        "Nồng độ oxy hòa tan (DO) đo lúc rạng sáng (trước bình minh) liên tục giảm dần qua từng ngày.",
        "Tôm ăn chậm hoặc bỏ ăn trên nhá (sàn ăn), tôm bơi lờ đờ tập trung dày đặc gần dàn quạt nước hoặc dạt vào mé ao.",
        "Tôm nổi đầu, bơi sát mặt nước vào ban ngày hoặc bắt đầu ghi nhận hiện tượng tôm rớt đáy tích tụ ở hố xiphông.",
        "Tảo có dấu hiệu tàn, nước đổi màu hoặc sụp tảo sau chuỗi ngày thời tiết âm u, mưa dầm thiếu nắng.",
      ],
    },
    {
      heading: "Nguyên nhân phổ biến và các bước kiểm tra chi tiết",
      body: [
        "Hãy phân loại và đánh giá các khả năng dựa trên số liệu đo đạc thực tế và nhật ký ao nuôi, thay vì chỉ phỏng đoán nguyên nhân qua biểu hiện màu sắc bên ngoài.",
      ],
      ordered: true,
      items: [
        "Dư thừa thức ăn và tích tụ mùn bã hữu cơ: Kiểm tra lượng thức ăn thừa trên nhá, rà soát lại bảng tính sinh khối đàn tôm, đo độ dày lớp bùn đáy ở khu vực gom tụ và điều chỉnh khẩu phần cho ăn hợp lý.",
        "Hàm lượng dinh dưỡng hòa tan quá cao: Đo nồng độ amonia (TAN/NH3), nitrit (NO2) và photphat, đồng thời kiểm tra lại nhật ký cho ăn cũng như việc sử dụng các loại phân bón vi lượng, chế phẩm sinh học gần đây.",
        "Mất cân bằng tỷ lệ dinh dưỡng (N:P): Dựa vào kết quả định danh mẫu tảo qua kính hiển vi và tư vấn từ chuyên gia kỹ thuật thủy sản có chuyên môn, thay vì cứng nhắc áp dụng một tỷ lệ N:P lý thuyết chung chung.",
        "Tích tụ bùn đáy hữu cơ (chất thải đáy ao): Kiểm tra hố xiphông trung tâm và ngửi mùi trầm tích đáy; bùn màu đen kịt hoặc bốc mùi trứng thối (khí độc H2S) cho thấy đáy ao đang bị yếm khí nghiêm trọng.",
        "Sự lưu chuyển dòng nước và sục khí yếu: Kiểm tra các góc chết trong ao nơi dòng chảy từ quạt nước không tới được, khu vực dồn ứ váng bọt và hiện tượng màu nước không đồng nhất giữa các vị trí.",
        "Thời tiết nắng nóng gay gắt kéo dài: So sánh diễn biến màu nước, xu hướng tăng vọt của pH buổi chiều và biến động oxy hòa tan liên tục qua nhiều ngày nắng to.",
        "Nguồn nước cấp (nước từ kênh/sông) chưa đảm bảo an toàn: Kiểm tra kỹ nước trong ao lắng/ao sẵn sàng về mật độ tảo tạp, hàm lượng hạt phù sa lơ lửng và rủi ro mầm bệnh trước khi cấp bổ sung vào ao nuôi.",
        "Mưa lớn làm xáo trộn tầng nước hoặc giảm độ mặn đột ngột: Đo độ mặn và nồng độ oxy ở nhiều tầng nước khác nhau (tầng mặt và tầng đáy), bởi nước mưa ngọt nhẹ hơn sẽ tạo thành một lớp phân tầng trên bề mặt gây sốc môi trường và làm sụp tảo.",
      ],
    },
    {
      heading: "Quy trình xử lý khẩn cấp tại hiện trường",
      body: [
        "Luôn ưu tiên bảo vệ nồng độ oxy hòa tan và an toàn sinh mạng của đàn tôm lên hàng đầu, sau đó xác minh chính xác điều gì đã thay đổi trước khi lựa chọn bất kỳ biện pháp can thiệp nào.",
      ],
      ordered: true,
      items: [
        "Đo nồng độ oxy hòa tan (DO) trước lúc mặt trời mọc (4:00 - 5:00 sáng). Bật tối đa tất cả các dàn quạt nước và hệ thống sục khí oxy đáy nếu DO giảm thấp (< 4 mg/L) hoặc tôm có dấu hiệu nổi đầu, stress; duy trì đo lặp lại liên tục cho đến khi chỉ số DO và hành vi của tôm ổn định trở lại.",
        "Đo pH vào sáng sớm (6:00) và chiều muộn (15:00 - 16:00). Nước ao xanh đặc kèm theo pH buổi chiều tăng vọt cảnh báo quá trình quang hợp diễn ra dữ dội; nếu chênh lệch pH ngày đêm vượt quá 0,5 đơn vị, đó là tín hiệu đỏ cho thấy hệ đệm của ao đang bị mất kiểm soát.",
        "Kiểm tra nhá ăn (sàn ăn) và rà soát sinh khối thực tế. Ngay lập tức cắt giảm 30–50% lượng thức ăn hoặc ngừng cữ cho ăn tiếp theo nếu tôm bỏ mồi, tôm yếu hoặc nước ao biến động; tuyệt đối không ép ăn dựa trên định mức số liệu đã lên lịch từ trước.",
        "Kiểm tra đáy ao và gom xả xác tảo tàn. Tiến hành xiphông đáy nhẹ nhàng để loại bỏ xác tảo chết tích tụ ở hố gom chất thải (nếu thiết kế ao có hệ thống xiphông), tránh khuấy động mạnh làm phân tán bùn đen độc hại ngược vào cột nước.",
        "Xác định loài thực vật phù du ưu thế bằng kính hiển vi hoặc gửi mẫu khẩn cấp đến phòng lab uy tín khi màu nước biến động nhanh, xuất hiện váng bọt nhớt hoặc sức khỏe tôm suy giảm rõ rệt.",
        "Đánh giá chất lượng nước cấp thay thế. Chỉ tiến hành thay nước hoặc cấp bù khi nguồn nước từ ao lắng đã qua xử lý triệt để, được lọc qua túi lọc mịn và đảm bảo an toàn sinh học tuyệt đối; kiểm soát để việc cấp nước không làm xáo trộn đột ngột nhiệt độ, độ mặn hoặc pH.",
        "Liên hệ ngay với bác sĩ thú y thủy sản hoặc chuyên gia bệnh học tôm giàu kinh nghiệm nếu hiện tượng tôm rớt đáy kéo dài, tôm stress không hồi phục hoặc có dấu hiệu nghi ngờ nhiễm mầm bệnh truyền nhiễm cấp tính.",
      ],
      note: "Tuyệt đối không tùy tiện tạt hóa chất diệt tảo (như đồng sunfat CuSO4, BKC, formaline), thuốc sát trùng, khoáng chất hay men vi sinh chỉ vì nhìn thấy màu nước khác lạ. Việc bức tử một đợt nở hoa của tảo quá nhanh sẽ gây sốc môi trường tàn khốc, làm cạn kiệt sạch oxy hòa tan và giải phóng độc tố ồ ạt khiến tôm chết hàng loạt.",
    },
    {
      heading: "Chiến lược quản lý và ổn định hệ tảo dài hạn",
      body: [
        "Sự ổn định bền vững của màu nước và hệ sinh thái ao tôm bắt nguồn từ kỷ luật quản lý thức ăn, kiểm soát chất thải, vận hành quạt khí, an toàn sinh học nguồn nước cấp và giám sát dữ liệu chặt chẽ—chứ không phải trông chờ vào bất kỳ 'chế phẩm thần dược' xử lý tảo nào.",
      ],
      items: [
        "Điều chỉnh khẩu phần ăn khớp chính xác với tốc độ tăng trưởng sinh khối thực tế và kết quả kiểm tra nhá thức ăn.",
        "Bố trí công suất quạt nước và sục khí đáy tương xứng với tải lượng sinh khối tôm ngày càng tăng trong ao.",
        "Thường xuyên xiphông hút sạch mùn bã đáy ao trong suốt vụ nuôi và cải tạo, xử lý triệt để đáy ao giữa các vụ mùa.",
        "Theo dõi định kỳ xu hướng tích lũy các hợp chất nitơ vô cơ (TAN, NH3, NO2) và hàm lượng chất hữu cơ lơ lửng.",
        "Bảo vệ nguồn nước cấp qua hệ thống ao lắng lắng lọc nhiều cấp, lưới lọc mịn và khử trùng an toàn sinh học trước khi đưa vào ao nuôi.",
        "Duy trì độ kiềm (Alkalinity) ổn định từ 120–160 mg/L CaCO3 để giữ ổn định hệ đệm pH, bổ sung vôi và khoáng tạt định kỳ theo đặc thù nguồn nước trang trại.",
        "So sánh và đối chiếu các thông số vận hành hiện tại với dữ liệu của những vụ nuôi thành công trước đó để nhận diện sớm rủi ro.",
        "Sử dụng kính hiển vi định kỳ để kiểm tra biến động của các dòng tảo và mật độ khuẩn trong ao.",
        "Ghi chép tỉ mỉ diễn biến thời tiết, lượng mưa, các đợt cấp thay nước và biểu hiện thay đổi màu nước vào nhật ký điện tử.",
      ],
    },
    {
      heading: "Lịch trình giám sát chất lượng nước thực tế",
      body: [
        "Tần suất kiểm tra cần được tăng cường khi mật độ tảo dày lên, thời tiết thay đổi đột ngột, tăng lượng thức ăn hoặc khi tôm có dấu hiệu bị stress.",
      ],
      table: {
        columns: ["Chỉ tiêu giám sát", "Thời điểm đo đạc đề xuất", "Trường hợp cần tăng tần suất kiểm tra"],
        rows: [
          ["Oxy hòa tan (DO)", "Trước bình minh (5:00) và chiều muộn (16:00), đo hàng ngày", "Tảo nở hoa dày, trời âm u kéo dài, tăng khẩu phần thức ăn hoặc tôm có biểu hiện mệt mỏi"],
          ["Độ pH", "Lúc mặt trời mọc (6:00) và chiều muộn (15:00 - 16:00), đo hàng ngày", "Màu nước đổi màu nhanh hoặc biên độ dao động pH ngày đêm vượt quá 0,5"],
          ["Màu nước ao", "Quan sát tại cùng một vị trí và thời điểm mỗi ngày", "Bất kỳ khi nào màu nước đổi màu bất thường hoặc nước mất màu đột ngột"],
          ["Độ trong đĩa Secchi", "Đo hàng ngày vào khoảng 10:00 - 11:00 sáng dưới điều kiện ánh sáng tương đồng", "Nước ao chuyển màu đậm đặc hoặc nồng độ DO buổi sáng có xu hướng tụt dốc"],
          ["Sức ăn trên nhá (sàn ăn)", "Kiểm tra tại tất cả các cữ kiểm tra nhá theo quy trình", "Tôm ăn chậm, thừa thức ăn hoặc môi trường nước có biến động"],
          ["Tỷ lệ hao hụt & hành vi tôm", "Quan sát tối thiểu mỗi ngày một lần và khi xiphông", "Xuất hiện dấu hiệu stress, tôm bơi lờ đờ, tôm tấp mé hoặc nghi ngờ nhiễm bệnh"],
          ["Độ kiềm (Alkalinity)", "Theo lịch kiểm tra chất lượng nước định kỳ của trang trại (2–3 lần/tuần)", "Sau các cơn mưa lớn hoặc khi chỉ số pH dao động thất thường"],
          ["Khí độc Amonia và Nitrit", "Theo quy trình kiểm tra định kỳ (1–2 lần/tuần)", "Xảy ra hiện tượng sụp tảo, dư thừa nhiều thức ăn hoặc tôm rớt đáy gia tăng"],
          ["Định danh thực vật phù du (soi kính)", "Định kỳ hàng tuần nếu trang trại có trang bị kính hiển vi", "Xuất hiện váng bọt nhớt, nước có mùi lạ, màu nước thay đổi nhanh hoặc ao bất ổn kéo dài"],
        ],
      },
    },
    {
      heading: "Ứng dụng Shrimply để theo dõi và kiểm soát chất lượng ao nuôi",
      body: [
        "Shrimply giúp bạn hệ thống hóa và đối chiếu các dữ liệu nhật ký ao nuôi theo thời gian thực. Phần mềm là công cụ hỗ trợ ra quyết định dựa trên dữ liệu, không thay thế cho xét nghiệm mẫu tảo tại phòng lab hay chẩn đoán thú y trực tiếp.",
      ],
      items: [
        "Ghi chép nồng độ oxy hòa tan, pH, độ kiềm, amonia (TAN/NH3), nitrit (NO2), độ mặn và nhiệt độ trong phân hệ Chất Lượng Nước.",
        "So sánh trực quan xu hướng biến động pH sáng - chiều và biểu đồ oxy hòa tan ngày đêm để kịp thời phát hiện nguy cơ sụp tảo.",
        "Đối chiếu Nhật Ký Thức Ăn với ước tính sinh khối thực tế và kết quả Lấy Mẫu Định Kỳ để điều chỉnh lượng ăn chính xác.",
        "Ghi nhận số lượng tôm chết trong Nhật Ký Hao Hụt (Tử Vong) nhằm theo dõi thời điểm khởi phát và tốc độ lây lan của rủi ro.",
        "So sánh dữ liệu ao hiện tại với lịch sử các Vụ Nuôi Thành Công trước đây để tìm ra công thức vận hành tối ưu.",
        "Xuất báo cáo dữ liệu hoàn chỉnh để chia sẻ nhanh chóng với quản lý trang trại, kỹ sư thủy sản hoặc đơn vị xét nghiệm chẩn đoán.",
      ],
    },
    {
      heading: "Khi nào cần liên hệ chuyên gia hoặc phòng xét nghiệm chuyên sâu",
      body: [
        "Hãy cung cấp cho đơn vị xét nghiệm đầy đủ số liệu đo chất lượng nước gần nhất, nhật ký cho ăn, biểu đồ hao hụt tôm, ghi chép biến động thời tiết và mẫu nước đại diện được thu thập đúng kỹ thuật bảo quản.",
      ],
      items: [
        "Hiện tượng tôm chết rớt đáy tiếp diễn hoặc tỷ lệ hao hụt tăng vọt từng ngày.",
        "Tôm vẫn tiếp tục nổi đầu, tấp mé hoặc bơi lờ đờ gần mặt nước dù đã tăng cường toàn bộ quạt oxy.",
        "Hệ tảo lam (xanh ngọc), tảo giáp đỏ hoặc màu nước dị thường kéo dài dai dẳng không thể khống chế bằng các biện pháp sinh học.",
        "Váng nhớt, màng bọt đặc quánh hình thành trên bề mặt diện rộng hoặc ao bốc mùi hôi thối nồng nặc.",
        "Ao nuôi liên tục bị sụp tảo nhiều lần hoặc các chỉ số chất lượng nước không có dấu hiệu cải thiện.",
        "Nghi ngờ tôm bị nhiễm độc tố sinh học từ tảo hoặc bùng phát dịch bệnh truyền nhiễm nguy hiểm (AHPND/EMS, WSSV, EHP).",
      ],
    },
  ],
  checklist: [
    "Đo oxy hòa tan (DO) trước bình minh và lập tức tăng cường sục khí, quạt nước nếu nồng độ DO giảm hoặc tôm có biểu hiện stress.",
    "So sánh chỉ số pH lúc mặt trời mọc và lúc chiều muộn thay vì chỉ dựa vào một lần đo duy nhất trong ngày.",
    "Kiểm tra định kỳ độ trong đĩa Secchi, khí độc amonia, nitrit, thức ăn dư trên nhá, bùn đáy hố xiphông và diễn biến thời tiết.",
    "Luôn soi kính hiển vi để xác định chính xác nhóm tảo chiếm ưu thế trước khi quyết định can thiệp bằng hóa chất xử lý nước.",
    "Chỉ sử dụng nguồn nước cấp an toàn, đã qua lắng lọc mịn và bảo đảm nghiêm ngặt an toàn sinh học khi cần cấp bù hoặc thay nước.",
    "Liên hệ ngay với chuyên gia bệnh học thủy sản khi hiện tượng tôm chết kéo dài hoặc có dấu hiệu nghi ngờ dịch bệnh truyền nhiễm.",
  ],
  faqs: [
    {
      question: "Màu nước nào là tốt nhất cho ao nuôi tôm?",
      answer: "Không có một màu nước duy nhất nào là tối ưu tuyệt đối cho mọi điều kiện. Nước màu xanh lục nhạt hoặc màu nâu trà (tảo khuê) phát triển ổn định đều rất có lợi cho ao tôm, nhưng việc theo dõi các chỉ số đo đạc thực tế và định danh bằng kính hiển vi mang tính quyết định hơn nhiều so với việc chỉ nhìn màu sắc mắt thường.",
    },
    {
      question: "Nước ao màu xanh lá có tốt cho tôm thẻ chân trắng không?",
      answer: "Nước có màu xanh lục đọt chuối với mật độ vừa phải và ổn định giúp tạo môi trường rất tốt cho tôm phát triển. Tuy nhiên, nếu nước chuyển sang màu xanh đen đặc quánh hoặc đổi màu đột ngột thì đó là dấu hiệu cảnh báo mật độ tảo quá dày, gây nguy cơ tụt giảm oxy nghiêm trọng về đêm.",
    },
    {
      question: "Tại sao nước ao tôm lại chuyển sang màu xanh đen đặc quánh?",
      answer: "Nguyên nhân phổ biến nhất là do thực vật phù du bùng phát quá mức, hàm lượng dinh dưỡng dư thừa (nitơ và photpho), tích tụ nhiều chất thải hữu cơ từ thức ăn thừa và thời tiết nắng gắt kéo dài. Cần kiểm chứng chính xác tình trạng này bằng đĩa Secchi, đo pH sáng - chiều, đo DO và soi mẫu dưới kính hiển vi.",
    },
    {
      question: "Nguyên nhân nào dẫn đến sự xuất hiện của tảo lam trong ao tôm?",
      answer: "Nhiệt độ nước cao, cường độ ánh sáng mạnh, tích tụ dư thừa muối dinh dưỡng hòa tan và sự luân chuyển nước kém trong ao là điều kiện thuận lợi cho vi khuẩn lam (tảo lam) phát triển chiếm ưu thế. Thành phần loài cụ thể và điều kiện thực tế của ao nuôi sẽ quyết định mức độ rủi ro độc tố sinh học.",
    },
    {
      question: "Làm thế nào để người nuôi kiểm soát hiện tượng tảo nở hoa một cách an toàn?",
      answer: "Hãy bắt đầu bằng việc bảo vệ oxy hòa tan, tăng cường chạy quạt khí, theo dõi pH, giảm ngay lượng thức ăn, xiphông hút bỏ mùn bã đáy ao và soi kính hiển vi định danh sinh vật. Chỉ nên xem xét cấp thay nước hoặc các biện pháp xử lý khác sau khi đã đánh giá kỹ lưỡng mức độ an toàn sinh học, thể trạng tôm và có hướng dẫn từ cán bộ kỹ thuật giàu kinh nghiệm.",
    },
    {
      question: "Điều gì sẽ xảy ra khi tảo trong ao tôm bất ngờ chết hàng loạt (sụp tảo)?",
      answer: "Nước ao có thể nhanh chóng trở nên trong suốt hoặc chuyển sang màu trắng đục như nước vo gạo. Quá trình phân hủy xác tảo chết của vi khuẩn sẽ ngốn sạch oxy hòa tan trong ao và làm bùng phát nồng độ khí độc amonia cũng như chất hữu cơ độc hại.",
    },
    {
      question: "Hiện tượng sụp tảo (rớt tảo) ảnh hưởng đến oxy hòa tan (DO) như thế nào?",
      answer: "Ao nuôi bị mất đi hoàn toàn nguồn sản xuất oxy ban ngày từ quá trình quang hợp, trong khi vi khuẩn dị dưỡng tiêu tốn lượng oxy cực lớn để phân hủy xác tảo. Thời điểm nồng độ DO tụt thấp nhất và đe dọa sinh mạng tôm nhiều nhất thường là vào rạng sáng trước lúc bình minh.",
    },
    {
      question: "Tảo silic (tảo khuê / Diatoms) có thực sự có lợi cho ao tôm không?",
      answer: "Tảo silic là nguồn thức ăn tự nhiên giàu dinh dưỡng vượt trội và thúc đẩy sự sinh sản của các loài giáp xác phù du có ích. Dù vậy, chỉ riêng màu nước nâu trà thì chưa thể khẳng định chắc chắn rằng tảo silic đang thực sự chiếm ưu thế nếu chưa soi kiểm tra dưới kính hiển vi.",
    },
    {
      question: "Làm thế nào để nhận biết chính xác các loài tảo gây hại trong ao nuôi?",
      answer: "Phương pháp chuẩn xác nhất là soi mẫu nước dưới kính hiển vi quang học và gửi mẫu đến phòng xét nghiệm chuyên sâu khi nghi ngờ có sự hiện diện của độc tố sinh học. Màu nước lạ và mùi hôi tanh chỉ là các tín hiệu cảnh báo ban đầu chứ không phải bằng chứng khoa học khẳng định.",
    },
    {
      question: "Nên kiểm tra màu nước và hệ sinh vật phù du trong ao nuôi tôm với tần suất thế nào?",
      answer: "Nên quan sát màu nước mỗi ngày tại cùng một vị trí và cùng khung giờ cố định. Cần lập tức soi kiểm tra quần xã thực vật phù du dưới kính hiển vi bất cứ khi nào nhận thấy sự thay đổi về màu nước, độ trong đĩa Secchi, xuất hiện mùi lạ, tôm giảm ăn hoặc các chỉ số chất lượng nước có diễn biến bất thường.",
    },
  ],
  sources: [
    {
      title: "Australian Prawn Farming Manual",
      publisher: "Australian Centre for International Agricultural Research",
      url: "https://www.aciar.gov.au/sites/default/files/legacy/node/737/Australian%20prawnfarming%20manual%20final.pdf",
    },
    {
      title: "Manual on Pond Culture of Penaeid Shrimp: Indicators of Problems in a Pond",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/ac006e/AC006E11.htm",
    },
    {
      title: "Shrimp Culture: Pond Design, Operation and Management — Water Quality",
      publisher: "Food and Agriculture Organization of the United Nations",
      url: "https://www.fao.org/4/AC210E/AC210E09.htm",
    },
    {
      title: "Cyanobacteria (Blue-Green Algae) and Water Quality",
      publisher: "Australian Government",
      url: "https://www.waterquality.gov.au/issues/blue-green-algae",
    },
    {
      title: "Characterising and Managing Harmful Algal Blooms That Cause Production Loss on Australian Prawn Farms",
      publisher: "Queensland Department of Agriculture and Fisheries",
      url: "https://era.dpi.qld.gov.au/id/eprint/6101/",
    },
    {
      title: "Co-Occurrence of White Shrimp Mortalities and Microcystin Toxin in a Shrimp Facility",
      publisher: "Aquaculture",
      url: "https://doi.org/10.1016/j.aquaculture.2006.08.037",
    },
    {
      title: "Phytoplankton Succession in Intensive Marine Shrimp Culture Ponds",
      publisher: "Aquaculture Research",
      url: "https://doi.org/10.1046/j.1355-557x.2002.00671.x",
    },
  ],
};
