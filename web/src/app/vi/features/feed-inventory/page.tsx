import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/feed-inventory");

export const metadata = seoMetadataVI(page!, "/features/feed-inventory");

export default function FeedInventoryPageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/feed-inventory"
      eyebrow="Quản lý kho thức ăn"
      title="Phần mềm quản lý kho thức ăn tôm cho các trang trại cần độ chính xác về tồn kho và nhật ký cho ăn."
      intro="Shrimply giúp các trang trại theo dõi tồn kho thức ăn, thương hiệu thức ăn, nhật ký cho ăn, kiểm tra nhá/vó, nhu cầu đặt hàng và luân chuyển kho để mọi quyết định cho ăn luôn gắn liền với vận hành thực tế tại ao."
      sections={[
        {
          title: "Nắm rõ lượng thức ăn sẵn có trong kho",
          body: "Theo dõi các thương hiệu thức ăn và luân chuyển tồn kho tập trung tại một nơi, giúp người quản lý luôn biết rõ lượng tồn thực tế trước khi kế hoạch cho ăn dẫn đến thiếu hụt thức ăn.",
        },
        {
          title: "Tách biệt nhật ký cho ăn khỏi dữ liệu lấy mẫu",
          body: "Nhật ký cho ăn ghi nhận hoạt động xuất kho thực tế để trừ tồn kho. Trong khi đó, lượng thức ăn khi lấy mẫu là quan sát sinh học dùng để tính FCR và dự báo. Shrimply tách biệt rõ ràng hai quy trình này.",
        },
        {
          title: "Gắn kết lượng thức ăn sử dụng với hiệu suất tăng trưởng",
          body: "Khi nhật ký cho ăn và việc kiểm tra nhá/vó được liên kết với tốc độ tăng trưởng, sinh khối, tỷ lệ chết và kết quả thu hoạch, trang trại sẽ có cái nhìn rõ ràng hơn về FCR và hiệu quả kinh tế vụ nuôi.",
        },
        {
          title: "Phát hiện sớm nguy cơ hết hàng trong kho",
          body: "Dễ dàng ngăn ngừa tình trạng thiếu thức ăn khi quyết định đặt hàng bổ sung dựa trên tồn kho thực tế, nhu cầu từng ao và lượng cho ăn gần đây thay vì ước lượng cảm tính.",
        },
        {
          title: "Đảm bảo tính minh bạch và trách nhiệm quản lý kho",
          body: "Đội ngũ trang trại có thể kiểm tra loại thức ăn nào đã được xuất, sử dụng cho ao nào và sự luân chuyển đó tương quan thế nào với hiệu suất ao cũng như giá trị tồn kho.",
        },
      ]}
      checklist={[
        "Theo dõi thương hiệu thức ăn, số lượng bao và luân chuyển kho trước khi xuất thức ăn cho các ao.",
        "Ghi nhận nhật ký cho ăn và kiểm tra nhá/vó như thao tác kho thực tế để trừ tồn kho chính xác.",
        "Tách biệt lượng thức ăn quan sát khi lấy mẫu khỏi hệ thống trừ tồn kho.",
        "Đánh giá lượng thức ăn sử dụng cùng với sinh khối, FCR, tỷ lệ chết và kết quả thu hoạch.",
        "Theo dõi nhu cầu đặt hàng sớm trước khi sự thiếu hụt thức ăn làm gián đoạn kế hoạch nuôi.",
      ]}
      faqs={[
        {
          question: "Shrimply có trừ tồn kho thức ăn từ dữ liệu lấy mẫu không?",
          answer: "Không. Shrimply chỉ trừ tồn kho từ nhật ký cho ăn thực tế. Lượng thức ăn ghi trong phiếu lấy mẫu là dữ liệu sinh học phục vụ tính toán FCR và dự báo tăng trưởng.",
        },
        {
          question: "Tại sao quản lý kho thức ăn lại quan trọng đối với chỉ số FCR của trang trại tôm?",
          answer: "FCR phụ thuộc vào độ chính xác của số liệu sử dụng thức ăn. Nếu việc xuất thức ăn bị ước lượng sai hoặc thất thoát, trang trại không thể so sánh chính xác lượng thức ăn tiêu thụ với lượng sinh khối tăng thêm.",
        },
        {
          question: "Người quản lý có thể kiểm tra tồn kho trước khi lập kế hoạch cho ăn không?",
          answer: "Có. Quy trình được thiết kế để người quản lý đối chiếu tồn kho sẵn có, thương hiệu thức ăn, nhật ký cho ăn và nhu cầu của từng ao trước khi tình trạng thiếu thức ăn trở thành sự cố vận hành.",
        },
      ]}
      related={[
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách quản lý kho thức ăn kết nối với vận hành ao, tài chính, thu hoạch và báo cáo." },
        { href: "/vi/vannamei-shrimp-farming-app", label: "Ứng dụng nuôi tôm thẻ chân trắng", description: "Xem tổng quan ứng dụng di động và web để ghi chép dữ liệu trang trại tôm thẻ hàng ngày." },
        { href: "/vi/features/growth-sampling", label: "Lấy mẫu tăng trưởng và theo dõi FCR", description: "Kết nối độ chính xác của lượng thức ăn với việc phân tích MBW, sinh khối, ADG và FCR." },
        { href: "/resources/feed-inventory-control", label: "Hướng dẫn kiểm soát kho thức ăn tôm", description: "Đọc tài liệu thực tế về luân chuyển kho, dự báo đặt hàng và trách nhiệm quản lý thức ăn." },
        { href: "/resources/fcr-shrimp-farming", label: "FCR trong nuôi tôm", description: "Hiểu lý do vì sao ghi chép thức ăn chuẩn xác là yếu tố then chốt để phân tích hệ số chuyển đổi thức ăn." },
        { href: "/vi/how-it-works", label: "Cách thức hoạt động của Shrimply", description: "Theo dõi quy trình vận hành từ ghi chép tại ao đến kiểm tra của quản lý và báo cáo tổng hợp." },
      ]}
    />
  );
}
