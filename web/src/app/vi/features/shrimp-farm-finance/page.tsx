import SeoLandingPageVI from "@/components/SeoLandingPageVI";
import { featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/features/shrimp-farm-finance");

export const metadata = seoMetadataVI(page!, "/features/shrimp-farm-finance");

export default function ShrimpFarmFinancePageVI() {
  return (
    <SeoLandingPageVI
      path="/vi/features/shrimp-farm-finance"
      eyebrow="Tài chính trang trại tôm"
      title="Theo dõi tài chính trang trại tôm cho dòng tiền, giá vốn hàng bán COGS, lãi lỗ và dự báo."
      intro="Shrimply giúp các trang trại sắp xếp hồ sơ và báo cáo tài chính xuyên suốt dòng tiền, giá vốn hàng bán (COGS), lãi lỗ (P&L), chi phí kho thức ăn, doanh thu thu hoạch và các dự báo tài chính dựa trên giả định thực tế."
      sections={[
        {
          title: "Phân tách rõ ràng các loại báo cáo",
          body: "Dòng tiền, COGS, lãi lỗ và dự báo tài chính trả lời các câu hỏi kinh doanh hoàn toàn khác nhau. Shrimply giữ các loại báo cáo này minh bạch thay vì gộp chung vào một bảng tính mập mờ.",
        },
        {
          title: "Gắn liền chi phí với hoạt động thực tế",
          body: "Dữ liệu thức ăn, vật tư kho, thu hoạch và vụ nuôi cung cấp bối cảnh thực tế cho tài chính trang trại. Điều này giúp các báo cáo tài chính dễ giải trình và dễ hành động hơn.",
        },
        {
          title: "Dự báo dựa trên giả định, không phải lời hứa",
          body: "Các dự báo tài chính phải luôn dựa trên các giả định đo lường được. Shrimply định hình các dự báo như một công cụ lập kế hoạch hữu ích, không phải cam kết cứng nhắc.",
        },
        {
          title: "Giải thích rõ nguyên nhân biến động chi phí",
          body: "Báo cáo tài chính trở nên giá trị hơn nhiều khi liên kết sự biến động chi phí với lượng thức ăn sử dụng, thời điểm thu hoạch, giá trị hàng tồn kho và hiệu suất ao nuôi.",
        },
        {
          title: "Hỗ trợ chủ trang trại ra quyết định",
          body: "Chủ trang trại cần những báo cáo tách bạch rõ thời điểm luân chuyển tiền mặt, chi phí sản xuất, mức sinh lời và các giả định dự báo để đưa ra những quyết định điều hành chính xác.",
        },
      ]}
      checklist={[
        "Phân tách rõ ràng giữa dòng tiền, giá vốn hàng bán COGS, lãi lỗ (P&L) và dự báo kế hoạch.",
        "Gắn chi phí thức ăn, con giống, vật tư, nhân công, thu hoạch và các chi phí khác vào từng vụ nuôi cụ thể.",
        "Trình bày minh bạch các giả định khi xây dựng và theo dõi dự báo tài chính.",
        "Đối chiếu doanh thu thu hoạch song song với chi phí sản xuất và kết quả từng ao nuôi.",
        "Ghi chú chất lượng dữ liệu khi có các chứng từ hoặc bản ghi chưa hoàn tất.",
      ]}
      faqs={[
        {
          question: "Tại sao cần tách biệt dòng tiền, COGS, lãi lỗ P&L và dự báo tài chính?",
          answer: "Mỗi báo cáo trả lời một câu hỏi kinh doanh khác nhau. Gộp chung chúng lại có thể che khuất việc vấn đề bắt nguồn từ thời điểm dòng tiền (cash timing), chi phí sản xuất thực tế, biên lợi nhuận hay giả định lập kế hoạch.",
        },
        {
          question: "Các dự báo tài chính của Shrimply có phải là cam kết lợi nhuận không?",
          answer: "Không. Các dự báo được thiết kế như những công cụ lập kế hoạch dựa trên các giả định thực tế về vụ nuôi, không phải là sự đảm bảo chắc chắn về sản lượng hay lợi nhuận thu hoạch.",
        },
        {
          question: "Dữ liệu vận hành trang trại giúp cải thiện báo cáo tài chính như thế nào?",
          answer: "Hồ sơ thức ăn, xuất nhập kho, thu hoạch và chu kỳ ao nuôi cung cấp bối cảnh vận hành thực tế cho các con số tài chính, giúp báo cáo dễ hiểu, minh bạch và dễ dàng tối ưu hóa chi phí.",
        },
      ]}
      related={[
        { href: "/vi/shrimp-farm-management-software", label: "Phần mềm quản lý trang trại nuôi tôm", description: "Xem cách tài chính liên kết với nhật ký ao nuôi, kho hàng, báo cáo và sản lượng thu hoạch." },
        { href: "/vi/features/feed-inventory", label: "Quản lý kho thức ăn và theo dõi chi phí", description: "Theo dõi tồn kho và xuất nhập thức ăn để giá trị kho hỗ trợ kiểm soát chi phí trang trại." },
        { href: "/vi/features/shrimp-harvest-tracking", label: "Theo dõi thu hoạch tôm", description: "Kết nối trọng lượng thu hoạch và giá bán với doanh thu và khả năng sinh lời của vụ nuôi." },
        { href: "/resources/shrimp-farm-cogs", label: "Hướng dẫn giá vốn hàng bán (COGS) trang trại tôm", description: "Tìm hiểu cách phân tách chi phí sản xuất khỏi thời điểm dòng tiền và dự báo." },
        { href: "/resources/shrimp-farm-cash-flow", label: "Hướng dẫn dòng tiền trang trại tôm", description: "Hiểu lý do tại sao biến động tiền mặt và báo cáo lợi nhuận lại phục vụ các mục tiêu khác nhau." },
        { href: "/vi/how-it-works", label: "Cách Shrimply hoạt động", description: "Theo dõi luồng vận hành từ ghi chép tại trang trại đến báo cáo tài chính và đánh giá của chủ trại." },
      ]}
    />
  );
}
