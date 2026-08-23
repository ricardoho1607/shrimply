import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/disease-alerts");

export const metadata = seoMetadataVI(page!, "/features/disease-alerts");

export default function DiseaseAlertsPageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/disease-alerts"
      eyebrow="Cảnh báo dịch bệnh"
      title="Cảnh báo dịch bệnh tôm và an toàn sinh học giúp trang trại ứng phó kịp thời."
      intro="Shrimply giúp các trang trại theo dõi cảnh báo dịch bệnh, nguy cơ bùng phát dịch ở khu vực lân cận, tín hiệu an toàn sinh học và các điều kiện ao nuôi cần can thiệp xử lý nhanh."
      sections={[
        {
          title: "Nhận biết sớm nguy cơ an toàn sinh học",
          body: "Nguy cơ dịch bệnh có thể lây lan rất nhanh giữa các vùng nuôi. Shrimply giúp các đội ngũ nhận biết các tín hiệu cảnh báo sớm để chủ động phòng ngừa trước khi thiệt hại gia tăng.",
        },
        {
          title: "Bối cảnh rủi ro bảo mật và thiết thực",
          body: "Khả năng cảnh báo dịch bệnh phải bảo vệ an toàn cho trang trại mà không làm lộ dữ liệu nội bộ của doanh nghiệp. Shrimply được thiết kế theo quy trình an toàn sinh học bảo mật tuyệt đối.",
        },
        {
          title: "Kết nối cảnh báo với điều kiện ao nuôi",
          body: "Cảnh báo dịch bệnh phát huy hiệu quả cao nhất khi được xem xét cùng với chất lượng nước, sức ăn, tốc độ tăng trưởng và xu hướng tỷ lệ chết. Shrimply liên kết chặt chẽ các tín hiệu này.",
        },
        {
          title: "Dễ dàng ưu tiên các bước xử lý ứng phó",
          body: "Các quyết định an toàn sinh học trở nên nhanh chóng và chuẩn xác hơn khi cảnh báo được đánh giá cùng bối cảnh rủi ro cụ thể của từng ao thay vì xử lý như những thông báo rời rạc.",
        },
        {
          title: "Lưu trữ dữ liệu phục vụ phòng ngừa tương lai",
          body: "Lưu giữ toàn bộ lịch sử cảnh báo, tỷ lệ chết, chất lượng nước và biện pháp can thiệp của ao giúp trang trại rút ra bài học kinh nghiệm sau khi áp lực dịch bệnh qua đi.",
        },
      ]}
      checklist={[
        "Xem xét cảnh báo dịch bệnh song song với chất lượng nước ao nuôi, sức ăn ở sàng/nhá, tỷ lệ chết và biến động tăng trưởng.",
        "Giữ kín dữ liệu nội bộ của trang trại khỏi chế độ xem công khai hoặc người mua trừ khi chủ động chia sẻ.",
        "Ghi nhận đầy đủ các bước xử lý để phục vụ đánh giá và phòng ngừa rủi ro cho các vụ sau.",
        "Ưu tiên can thiệp các ao vừa nhận cảnh báo từ bên ngoài vừa xuất hiện dấu hiệu căng thẳng (stress) nội bộ.",
        "Sử dụng lịch sử dịch bệnh để củng cố và nâng cao quy trình an toàn sinh học sau mỗi đợt dịch.",
      ]}
      faqs={[
        {
          question: "Cảnh báo dịch bệnh có thay thế được chẩn đoán thực địa không?",
          answer: "Không. Cảnh báo giúp nâng cao nhận thức sớm và lập kế hoạch ứng phó nhanh, nhưng trang trại vẫn cần kết hợp chẩn đoán xét nghiệm, chuyên môn kỹ thuật và quy trình an toàn sinh học chuẩn.",
        },
        {
          question: "Tại sao cần kết nối cảnh báo dịch bệnh với nhật ký ao nuôi?",
          answer: "Cảnh báo dịch bệnh sẽ hữu ích hơn nhiều khi người quản lý có thể đối chiếu ngay với chất lượng nước, mức tiêu thụ thức ăn, tỷ lệ chết, tăng trưởng và quan sát thực tế gần nhất tại ao.",
        },
        {
          question: "Shrimply bảo vệ dữ liệu riêng tư của trang trại như thế nào?",
          answer: "Shrimply được xây dựng dựa trên quyền sở hữu dữ liệu của doanh nghiệp và quy trình bảo mật nghiêm ngặt, đảm bảo dữ liệu nội bộ không bị chia sẻ ra bên ngoài hoặc người mua trừ khi có sự cho phép rõ ràng.",
        },
      ]}
      related={[
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách giám sát rủi ro dịch bệnh tích hợp liền mạch vào vận hành ao và hệ thống báo cáo." },
        { href: "/vi/features/water-quality-monitoring", label: "Giám sát chất lượng nước ao nuôi", description: "Đánh giá các điều kiện ao nuôi giúp củng cố nhận định về căng thẳng và nguy cơ dịch bệnh." },
        { href: "/vi/features/growth-sampling", label: "Lấy mẫu tăng trưởng và theo dõi tỷ lệ chết", description: "Kết nối cảnh báo dịch bệnh với biến động tăng trưởng, sức ăn và hồ sơ tỷ lệ hao hụt." },
        { href: "/resources/shrimp-disease-alerts", label: "Hướng dẫn cảnh báo dịch bệnh tôm", description: "Tìm hiểu cách bối cảnh cảnh báo hỗ trợ trang trại phản ứng nhanh và đánh giá an toàn sinh học." },
        { href: "/resources/white-feces-disease-shrimp", label: "Hướng dẫn bệnh phân trắng ở tôm (WFD)", description: "Tìm hiểu triệu chứng, phản ứng cho ăn và dữ liệu ao nuôi để hỗ trợ kiểm soát bệnh phân trắng." },
        { href: "/vi/orson", label: "Orson AI phân tích rủi ro", description: "Xem cách Orson sử dụng dữ liệu ao nuôi gần nhất để phân tích tín hiệu tăng trưởng, thức ăn, nước và dịch bệnh." },
      ]}
    />
  );
}
