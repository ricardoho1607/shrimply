import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/shrimp-harvest-tracking");

export const metadata = seoMetadataVI(page!, "/features/shrimp-harvest-tracking");

export default function ShrimpHarvestTrackingPageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/shrimp-harvest-tracking"
      eyebrow="Theo dõi thu hoạch tôm"
      title="Phần mềm theo dõi thu hoạch tôm cho kết quả ao nuôi và lịch sử sản xuất."
      intro="Shrimply giúp các trang trại theo dõi sản lượng thu hoạch, kích cỡ tôm, kết quả từng ao nuôi, tổng kết vụ nuôi và lịch sử sản xuất để chủ trang trại nắm rõ sản lượng thực tế của từng ao."
      sections={[
        {
          title: "Ghi nhận kết quả thu hoạch chính xác",
          body: "Theo dõi trọng lượng thu hoạch, kích cỡ tôm và kết quả cấp ao nuôi để mỗi vụ nuôi khép lại với dữ liệu sản xuất rõ ràng thay vì các ghi chép rời rạc.",
        },
        {
          title: "Kết nối thu hoạch với ước tính quần đàn",
          body: "Hồ sơ thu hoạch ảnh hưởng trực tiếp đến số lượng tôm còn lại trong ao và hiệu suất cuối vụ, do đó Shrimply luôn liên kết dữ liệu thu hoạch với các tính toán và báo cáo ao nuôi.",
        },
        {
          title: "Nâng cao khả năng sẵn sàng kết nối người mua",
          body: "Hồ sơ thu hoạch rõ ràng giúp trang trại nắm bắt sản lượng hiện có, kích cỡ tôm trung bình và lịch sử sản xuất khi lập kế hoạch bán hàng hoặc mở rộng kết nối trên thị trường.",
        },
        {
          title: "Tính toán thu hoạch một phần chuẩn xác",
          body: "Thu hoạch một phần làm thay đổi mật độ quần đàn còn lại và diễn giải sinh khối, vì vậy mọi hoạt động thu hoạch cần được ghi nhận liền mạch trong hồ sơ vụ nuôi đang hoạt động.",
        },
        {
          title: "Khép lại quy trình đánh giá hiệu suất vụ nuôi",
          body: "Dữ liệu thu hoạch hoàn thiện bức tranh sản xuất toàn diện bằng cách liên kết thả giống, sử dụng thức ăn, lấy mẫu tăng trưởng, tỷ lệ chết, chất lượng nước, chi phí và sản lượng thu hoạch cuối cùng.",
        },
      ]}
      checklist={[
        "Ghi nhận trọng lượng thu hoạch, kích cỡ tôm, ngày thu hoạch, ao nuôi và hình thức thu hoạch.",
        "Phân tách rõ ràng giữa thu hoạch một phần và thu hoạch cuối vụ khi đánh giá kết quả vụ nuôi.",
        "Cập nhật lại bối cảnh mật độ quần đàn và sinh khối ngay sau mỗi đợt thu hoạch.",
        "Liên kết kết quả thu hoạch với các báo cáo thức ăn, lấy mẫu tăng trưởng, tỷ lệ chết và tài chính.",
        "Duy trì khả năng sẵn sàng kết nối người mua và lập kế hoạch bán hàng dựa trên số liệu sản xuất thực tế mới nhất.",
      ]}
      faqs={[
        {
          question: "Tại sao việc ghi chép thu hoạch một phần lại quan trọng?",
          answer: "Thu hoạch một phần loại bớt sinh khối và số lượng tôm khỏi ao trước khi kết thúc vụ nuôi. Nếu không được ghi nhận, các chỉ số FCR, sinh khối, quần thể tôm và khả năng sinh lời sẽ bị sai lệch.",
        },
        {
          question: "Trang trại nuôi tôm cần ghi lại những thông tin gì trong quá trình thu hoạch?",
          answer: "Trang trại cần ghi nhận mã ao nuôi, ngày thu hoạch, sản lượng trọng lượng, kích cỡ tôm, hình thức thu hoạch, thông tin người mua hoặc giao dịch bán, cùng các ghi chú giải thích kết quả thu hoạch.",
        },
        {
          question: "Theo dõi thu hoạch giúp ích gì cho các báo cáo quản lý?",
          answer: "Hồ sơ thu hoạch kết nối sản lượng thực tế với lượng thức ăn đã dùng, tỷ lệ hao hụt chết, số liệu lấy mẫu, chi phí và doanh thu, giúp chủ trang trại đánh giá toàn diện kết quả của toàn bộ vụ nuôi.",
        },
      ]}
      related={[
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách kết quả thu hoạch hoàn thiện hồ sơ sản xuất ao nuôi toàn diện." },
        { href: "/vi/features/shrimp-farm-finance", label: "Theo dõi tài chính trang trại tôm", description: "Liên kết sản lượng thu hoạch, doanh thu, giá vốn sản xuất và đánh giá lợi nhuận vụ nuôi." },
        { href: "/vi/features/growth-sampling", label: "Lấy mẫu tăng trưởng và theo dõi sinh khối", description: "Sử dụng dữ liệu MBW, sinh khối, quần đàn và tỷ lệ chết trước khi lập kế hoạch thu hoạch." },
        { href: "/resources/shrimp-harvest-tracking", label: "Hướng dẫn theo dõi thu hoạch tôm", description: "Đọc tài liệu về trọng lượng thu hoạch, kích cỡ tôm, thu hoạch một phần và kết quả vụ nuôi." },
        { href: "/resources/pond-performance", label: "Hướng dẫn hiệu suất ao nuôi", description: "Hiểu rõ cách so sánh sản lượng cuối cùng với hồ sơ thả giống, thức ăn, chất lượng nước và tỷ lệ hao hụt." },
        { href: "/vi/how-it-works", label: "Cách Shrimply hoạt động", description: "Theo dõi quy trình từ ghi nhận thực địa đến xem xét của quản lý, báo cáo và lịch sử sản xuất." },
      ]}
    />
  );
}
