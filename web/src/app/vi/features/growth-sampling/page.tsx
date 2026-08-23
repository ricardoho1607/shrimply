import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/growth-sampling");

export const metadata = seoMetadataVI(page!, "/features/growth-sampling");

export default function GrowthSamplingPageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/growth-sampling"
      eyebrow="Lấy mẫu tăng trưởng"
      title="Phần mềm lấy mẫu tăng trưởng tôm để theo dõi MBW, ADG, sinh khối và tỷ lệ sống."
      intro="Shrimply giúp các trang trại theo dõi dữ liệu lấy mẫu tăng trưởng tôm, MBW, tỷ lệ chết, tỷ lệ sống, quan sát thức ăn, sinh khối, quần đàn, ADG và các chỉ số FCR mà không trừ nhầm dữ liệu lấy mẫu vào tồn kho."
      sections={[
        {
          title: "Theo dõi MBW và chiều hướng tăng trưởng",
          body: "Dữ liệu lấy mẫu giúp đội ngũ hiểu rõ tôm có phát triển đúng kỳ vọng hay không. Shrimply sắp xếp lịch sử MBW và tiến trình tăng trưởng một cách có hệ thống theo từng ao và vụ nuôi.",
        },
        {
          title: "Dự báo chính xác hơn từ dữ liệu chất lượng hơn",
          body: "Dữ liệu lấy mẫu tin cậy giúp nâng cao độ chuẩn xác khi ước tính sinh khối, lập kế hoạch thức ăn, thời điểm thu hoạch và dự báo tài chính, đồng thời dễ dàng nhận diện dữ liệu bị thiếu.",
        },
        {
          title: "Thiết kế phù hợp với thực tế vận hành trang trại",
          body: "Dữ liệu thực tế tại ao đôi khi bị phân mảnh. Shrimply áp dụng logic tính toán an toàn và phương án dự phòng thực tế để báo cáo luôn hữu ích mà không che đậy các ghi chép còn thiếu.",
        },
        {
          title: "Bảo vệ dự báo khỏi các giả định thiếu căn cứ",
          body: "Chất lượng lấy mẫu ảnh hưởng trực tiếp đến ước tính sinh khối, kế hoạch thức ăn và thời điểm thu hoạch, vì vậy Shrimply luôn hiển thị độ tin cậy của dữ liệu khi tính toán dựa trên số liệu hạn chế.",
        },
        {
          title: "Kết nối tăng trưởng với lịch sử chất lượng nước và cho ăn",
          body: "Kết quả lấy mẫu mang lại giá trị cao nhất khi được đánh giá cùng phản hồi thức ăn gần đây và biến động chất lượng nước thay vì chỉ xem xét một con số trọng lượng đơn lẻ.",
        },
      ]}
      checklist={[
        "Lưu trữ MBW và quan sát thức ăn dưới dạng số liệu chuẩn xác để phục vụ tính toán đáng tin cậy.",
        "Sử dụng giá trị MBW hợp lệ gần nhất khi số liệu lấy mẫu mới nhất bị thiếu hoặc bằng không.",
        "Đánh giá toàn diện ADG, sinh khối, tỷ lệ sống, tỷ lệ chết và FCR cùng nhau.",
        "Tách biệt lượng thức ăn quan sát khi lấy mẫu khỏi việc trừ xuất kho thức ăn thực tế.",
        "So sánh kết quả lấy mẫu mới với lịch sử chất lượng nước và nhật ký cho ăn gần đây.",
      ]}
      faqs={[
        {
          question: "Lấy mẫu tăng trưởng có làm trừ tồn kho thức ăn không?",
          answer: "Không. Lượng thức ăn trong phiếu lấy mẫu chỉ phục vụ bối cảnh sinh học, tính FCR và dự báo. Tồn kho thức ăn thực tế chỉ bị trừ thông qua nhật ký cho ăn.",
        },
        {
          question: "Những thông số lấy mẫu nào quan trọng nhất cho quyết định quản lý ao tôm?",
          answer: "MBW, tỷ lệ chết, tỷ lệ sống, quan sát thức ăn, quần đàn, sinh khối, ADG và bối cảnh FCR giúp người quản lý nắm rõ chiều hướng tăng trưởng và thời điểm sẵn sàng thu hoạch.",
        },
        {
          question: "Shrimply xử lý dữ liệu lấy mẫu bị phân mảnh như thế nào?",
          answer: "Shrimply sử dụng logic tính toán cẩn trọng và các phương án dự phòng thực tế để báo cáo luôn phát huy giá trị, đồng thời thể hiện rõ các điểm dữ liệu chưa đầy đủ.",
        },
      ]}
      related={[
        { href: "/vi/vannamei-shrimp-farming-app", label: "Ứng dụng nuôi tôm thẻ chân trắng", description: "Xem bối cảnh ứng dụng di động và web để theo dõi DOC, MBW, ADG, FCR và dữ liệu ao nuôi." },
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách dữ liệu lấy mẫu hỗ trợ hiệu suất ao, báo cáo, tài chính và kế hoạch thu hoạch." },
        { href: "/vi/features/feed-inventory", label: "Quản lý kho thức ăn", description: "Tách biệt luân chuyển tồn kho thức ăn thực tế khỏi quan sát lượng thức ăn khi lấy mẫu." },
        { href: "/vi/features/water-quality-monitoring", label: "Giám sát chất lượng nước", description: "So sánh kết quả lấy mẫu với xu hướng chất lượng nước gần đây và tín hiệu stress của ao." },
        { href: "/resources/pond-performance", label: "Hướng dẫn hiệu suất ao nuôi", description: "Đọc cách phân tích dữ liệu lấy mẫu, thức ăn, tỷ lệ chết và thu hoạch để đánh giá vụ nuôi." },
        { href: "/resources/shrimp-cycle-planning", label: "Hướng dẫn lập kế hoạch vụ nuôi tôm", description: "Sử dụng dữ liệu tăng trưởng để lập kế hoạch thả giống, cho ăn, dự báo và thời điểm thu hoạch." },
      ]}
    />
  );
}
