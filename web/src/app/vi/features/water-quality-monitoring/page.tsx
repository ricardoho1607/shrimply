import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/water-quality-monitoring");

export const metadata = seoMetadataVI(page!, "/features/water-quality-monitoring");

export default function WaterQualityMonitoringPageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/water-quality-monitoring"
      eyebrow="Giám sát chất lượng nước"
      title="Phần mềm giám sát chất lượng nước ao tôm giúp nhận diện và kiểm soát rủi ro hàng ngày rõ ràng hơn."
      intro="Shrimply giúp các trang trại ghi chép và theo dõi xu hướng chất lượng nước ao tôm, hỗ trợ đội ngũ ao nuôi kết nối các chỉ số DO, pH, nhiệt độ, độ mặn, độ kiềm, khí độc và các thông số khác với các quyết định vận hành."
      sections={[
        {
          title: "Biến các lần đo thành biểu đồ xu hướng rõ ràng",
          body: "Một chỉ số đo đơn lẻ mang lại thông tin nhất định, nhưng chiều hướng biến động mới là yếu tố quyết định. Shrimply lưu trữ lịch sử chất lượng nước để đội ngũ có thể theo dõi sự biến chuyển qua các lần đo gần nhất.",
        },
        {
          title: "Kết nối chất lượng nước với sự tăng trưởng của tôm",
          body: "Khi có dữ liệu lấy mẫu mới, lịch sử chất lượng nước giúp lý giải sự biến động tăng trưởng, thay đổi sức ăn, dấu hiệu stress hoặc hiệu suất bất thường của ao nuôi.",
        },
        {
          title: "Hỗ trợ phản ứng và xử lý kịp thời",
          body: "Ghi chép chất lượng nước rõ ràng giúp dễ dàng nhận biết ao nào cần xử lý ngay, điều kiện ao nào đang ổn định và nơi nào bắt đầu xuất hiện cảnh báo sinh học.",
        },
        {
          title: "Đánh giá lịch sử gần đây, không chỉ dựa vào một chỉ số đơn lẻ",
          body: "Shrimply hiển thị lịch sử chất lượng nước gần đây song song với hồ sơ ao, giúp người quản lý xác định xem chỉ số bất thường là sự cố tạm thời hay là một phần của xu hướng rủi ro.",
        },
        {
          title: "Cung cấp dữ liệu bối cảnh chuẩn xác cho Orson AI",
          body: "Lịch sử chất lượng nước nâng cao hiệu quả phân tích ao nuôi của Orson AI, vì các tín hiệu tăng trưởng, sức ăn và rủi ro trở nên rõ ràng hơn khi có dữ liệu môi trường gần đây hỗ trợ.",
        },
      ]}
      checklist={[
        "Ghi chép nhất quán các chỉ số DO, pH, nhiệt độ, độ mặn, độ kiềm, khí độc và các thông số chuyên biệt của trang trại.",
        "Xem xét chiều hướng biến động qua các ghi chép gần đây trước khi kết luận ao nuôi đang ổn định.",
        "So sánh sự biến động của chất lượng nước với MBW, ADG, sức ăn và tỷ lệ chết.",
        "Gắn cảnh báo cho các ao có chỉ số bất thường lặp lại để người quản lý kiểm tra và xử lý nhanh chóng.",
        "Sử dụng lịch sử chất lượng nước để giải thích sự thay đổi tăng trưởng giữa các đợt lấy mẫu.",
      ]}
      faqs={[
        {
          question: "Tại sao nên theo dõi xu hướng chất lượng nước thay vì chỉ xem chỉ số đo của ngày hôm nay?",
          answer: "Một chỉ số đơn lẻ chỉ cho biết trạng thái tại thời điểm đo, nhưng xu hướng biến động cho thấy tình trạng ao nuôi đang tốt lên, xấu đi hay liên tục vượt ngưỡng rủi ro.",
        },
        {
          question: "Chất lượng nước liên kết với kết quả lấy mẫu như thế nào?",
          answer: "Khi tạo hồ sơ lấy mẫu mới, lịch sử chất lượng nước gần đây giúp giải thích nguyên nhân gây biến động tăng trưởng, thay đổi sức ăn, stress hoặc hiệu suất ao bất thường.",
        },
        {
          question: "Shrimply có giúp so sánh rủi ro giữa các ao nuôi không?",
          answer: "Có. Việc sắp xếp ghi chép chất lượng nước theo từng ao và vụ nuôi giúp đội ngũ nhận biết ngay ao nào đang ổn định và ao nào cần sự can thiệp vận hành khẩn cấp.",
        },
      ]}
      related={[
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách giám sát chất lượng nước tích hợp vào hiệu suất ao, báo cáo và quy trình vận hành." },
        { href: "/vi/features/disease-alerts", label: "Cảnh báo dịch bệnh trên tôm", description: "Kết nối điều kiện ao bất thường với rủi ro dịch bệnh và an toàn sinh học." },
        { href: "/vi/features/growth-sampling", label: "Lấy mẫu tăng trưởng và theo dõi MBW", description: "Sử dụng lịch sử chất lượng nước để giải thích sự biến động tăng trưởng giữa các lần lấy mẫu." },
        { href: "/resources/water-quality-trends", label: "Hướng dẫn xu hướng chất lượng nước", description: "Đọc tài liệu về cách theo dõi DO, pH, độ mặn, khí độc và chiều hướng biến động." },
        { href: "/resources/shrimp-disease-alerts", label: "Hướng dẫn cảnh báo dịch bệnh", description: "Tìm hiểu cách hệ thống cảnh báo trở nên hiệu quả hơn khi kết nối với dữ liệu ao nuôi." },
        { href: "/vi/orson", label: "Trợ lý Orson AI cho ao nuôi", description: "Xem cách lịch sử chất lượng nước giúp nâng cao bối cảnh cho AI phân tích ao nuôi." },
      ]}
    />
  );
}
