import type { ResourceArticle } from "../resourceLibrary";
import { defaultResourceAuthorVI, defaultOperationsReviewerVI } from "./metadata";

export const article: ResourceArticle = {
  slug: "pond-performance",
  section: "Quản lý trang trại",
  label: "Quản lý trang trại",
  author: defaultResourceAuthorVI,
  reviewer: defaultOperationsReviewerVI,
  title: "Hiệu suất ao nuôi: Bảng điểm ao tôm (Scorecard) phản ánh thực chất kết quả vận hành",
  description: "Tìm hiểu cách người nuôi tôm đánh giá toàn diện hiệu suất ao nuôi thông qua dữ liệu thả giống, tỷ lệ sống (SR), lượng thức ăn sử dụng, chất lượng nước, chài mẫu (sampling), thu hoạch và hồ sơ chi phí cả vụ.",
  readTime: "6 phút đọc",
  tags: ["hiệu suất ao nuôi", "DOC", "tỷ lệ sống (SR)", "nhật ký trang trại", "đánh giá hàng tuần"],
  publishedAt: "2026-06-08",
  image: {
    src: "/resources/images/shrimp-pond-performance-scorecard-vannamei-farm.jpg",
    alt: "Infographic đánh giá hiệu suất ao tôm thể hiện các chỉ số chài mẫu, nhật ký cho ăn, chất lượng nước, tài chính thu hoạch, MBW, ADG, tỷ lệ sống (SR) và hệ số FCR",
    width: 1672,
    height: 941,
  },
  relatedFeature: { label: "Phần mềm quản lý trang trại tôm", href: "/vi/shrimp-farm-management-software" },
  takeaways: [
    "Hiệu suất ao nuôi là bức tranh tổng hòa giữa các chỉ tiêu sinh học, kỷ luật vận hành và hiệu quả chi phí.",
    "Nhật ký cho ăn, chất lượng nước, tỷ lệ hao hụt và số liệu chài mẫu cần được đánh giá đồng bộ thay vì riêng lẻ.",
    "Phương pháp đánh giá ao nuôi hiệu quả nhất là đối chiếu liên tục giữa số liệu thực tế tại ao với kế hoạch vụ nuôi ban đầu.",
  ],
  sections: [
    {
      heading: "Tại sao hiệu suất ao nuôi không chỉ dừng lại ở sản lượng thu hoạch",
      body: [
        "Một ao nuôi có thể đạt sản lượng thu hoạch cao nhưng vẫn tiềm ẩn hiệu suất kém nếu tiêu tốn quá nhiều thức ăn, tỷ lệ hao hụt lớn hoặc phải xử lý hóa chất khẩn cấp vào cuối vụ. Đối với người quản lý trang trại, hiệu suất thực sự phải là sự kết hợp chặt chẽ giữa tốc độ tăng trưởng, tỷ lệ sống (SR), hiệu quả sử dụng thức ăn (FCR), độ ổn định của môi trường nước và lợi nhuận bán tôm thực tế.",
        "Đó là lý do Shrimply xâu chuỗi toàn bộ dữ liệu ao nuôi thành một câu chuyện vận hành thống nhất. Số liệu chài mẫu giải thích tốc độ phát triển. Nhật ký cho ăn giải thích mức độ tiêu thụ và sức ăn. Dữ liệu chất lượng nước giải thích các tác nhân gây sốc môi trường. Trong khi đó, hồ sơ thu hoạch và tài chính chứng minh liệu vụ nuôi có thực sự mang lại biên lợi nhuận kỳ vọng hay không.",
      ],
    },
    {
      heading: "Những chỉ số người nuôi tôm cần đối chiếu và đánh giá mỗi tuần",
      body: [
        "Một buổi đánh giá hàng tuần thực tế cần đối chiếu ngày tuổi tôm (DOC), kích cỡ mục tiêu, trọng lượng bình quân mới nhất (MBW), tốc độ tăng trưởng bình quân ngày (ADG), ước tính sinh khối, lượng thức ăn tiêu thụ, tỷ lệ hao hụt, xu hướng chất lượng nước và mọi dấu hiệu cảnh báo mầm bệnh. Mục tiêu không phải là đưa ra dự đoán hoàn hảo, mà là phát hiện sớm những ao đang có xu hướng lệch khỏi kế hoạch ban đầu để kịp thời can thiệp kỹ thuật.",
        "Các nghiên cứu và tài liệu thực hành nuôi tốt (BMP) đều khẳng định cùng một nguyên lý vận hành: quản lý cho ăn chuẩn xác, giữ ổn định chất lượng nước, phòng ngừa dịch bệnh chủ động và ghi chép nhật ký chặt chẽ luôn song hành với nhau. Việc chỉ xem xét một chỉ số đơn lẻ có thể giúp việc quản lý trên sổ sách có vẻ đơn giản, nhưng lại làm giảm độ chính xác và tăng rủi ro khi kiểm soát thực tế tại ao.",
      ],
    },
    {
      heading: "Cách phần mềm nâng cao chất lượng đánh giá ao nuôi",
      body: [
        "Số hóa nhật ký giúp việc so sánh hiệu suất giữa các ao trở nên nhanh chóng và chuẩn xác hơn, cho phép đội ngũ kỹ thuật nhận biết ngay việc tôm chậm lớn bắt nguồn từ giảm ăn, biến động chất lượng nước, hao hụt ngầm dưới đáy hay sai số khi chài mẫu. Điều này đặc biệt giá trị đối với các trang trại quy mô nhiều ao, kỹ thuật viên thay ca liên tục và trước đây phải dựa vào các cuốn sổ tay ghi chép rời rạc.",
      ],
    },
  ],
  checklist: [
    "Đánh giá đồng bộ các chỉ số MBW, ADG, lượng thức ăn tiêu thụ, tỷ lệ hao hụt và xu hướng chất lượng nước.",
    "So sánh tiến độ của từng ao với kế hoạch thả giống ban đầu và khung thời gian thu hoạch mục tiêu.",
    "Gắn cờ cảnh báo ngay cho những ao có lượng thức ăn tăng nhưng tốc độ tăng trưởng (ADG) không tăng tương ứng.",
    "Liên kết toàn bộ dữ liệu thu hoạch và chi phí vận hành trực tiếp với từng vụ nuôi của ao đó.",
  ],
  sources: [
    {
      title: "Cultured Aquatic Species Information Programme: Penaeus vannamei",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/DOCUMENT/aquaculture/CulturedSpecies/file/en/en_whitelegshrimp.htm",
    },
    {
      title: "Best Management Practices for a Mangrove-Friendly Shrimp Farming",
      publisher: "SEAFDEC Aquaculture Department",
      url: "https://repository.seafdec.org/handle/20.500.12066/1947",
    },
    {
      title: "Management for Freshwater Fish Culture: Record Keeping",
      publisher: "Food and Agriculture Organization of the United Nations (FAO)",
      url: "https://www.fao.org/fishery/docs/CDrom/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm",
    },
  ],
};
