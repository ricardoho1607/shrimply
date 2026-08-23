import ShrimpFarmManagementLandingVI from "@/components/ShrimpFarmManagementLandingVI";
import { canonicalUrl, featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/shrimp-farm-management-software");

export const metadata = seoMetadataVI(page!, "/shrimp-farm-management-software");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/vi/shrimp-farm-management-software"),
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page?.title,
  description: page?.description,
  url: canonicalUrl("/vi/shrimp-farm-management-software"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/vi"),
  },
  about: [
    "phần mềm quản lý trang trại nuôi tôm",
    "vận hành trang trại nuôi trồng thủy sản",
    "quản lý ao nuôi",
    "kho thức ăn và tồn kho",
    "báo cáo trang trại nuôi tôm",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Trang chủ",
      item: canonicalUrl("/vi"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Phần mềm quản lý trang trại nuôi tôm",
      item: canonicalUrl("/vi/shrimp-farm-management-software"),
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Shrimply giúp quản lý những gì?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply quản lý ao nuôi, thả giống, lấy mẫu tăng trưởng, chất lượng nước, cho ăn, kho thức ăn, thu hoạch, tài sản, báo cáo tài chính, cảnh báo dịch bệnh, thiết lập doanh nghiệp, phân quyền đội ngũ và phân tích thông minh từ Orson AI.",
      },
    },
    {
      "@type": "Question",
      name: "Hệ thống này có phải chỉ dùng để ghi chép dữ liệu không?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Không. Shrimply được thiết kế để giúp các đội ngũ phân tích hồ sơ sản xuất, đánh giá hiệu suất ao nuôi, lập báo cáo và phát hiện sớm các rủi ro vận hành.",
      },
    },
    {
      "@type": "Question",
      name: "Phần mềm có hỗ trợ quy trình làm việc trên cả di động và web không?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Có. Đội ngũ kỹ thuật thực địa có thể ghi lại hoạt động trang trại trên di động, trong khi người quản lý sử dụng dashboard web để đánh giá, phân tích, báo cáo và kiểm soát toàn diện ở cấp doanh nghiệp.",
      },
    },
  ],
};

export default function ShrimpFarmManagementSoftwarePageVI() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ShrimpFarmManagementLandingVI />
    </>
  );
}
