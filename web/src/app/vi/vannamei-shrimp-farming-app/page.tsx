import VannameiShrimpFarmingLandingVI from "@/components/VannameiShrimpFarmingLandingVI";
import { canonicalUrl, featureSeoPages_vi, seoMetadataVI } from "@/config/seo";

const page = featureSeoPages_vi.find(item => item.path === "/vi/vannamei-shrimp-farming-app");

export const metadata = seoMetadataVI(page!, "/vannamei-shrimp-farming-app");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/vi/vannamei-shrimp-farming-app"),
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
  url: canonicalUrl("/vi/vannamei-shrimp-farming-app"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/vi"),
  },
  about: [
    "ứng dụng nuôi tôm thẻ chân trắng vannamei",
    "theo dõi chu kỳ vụ nuôi tôm",
    "lấy mẫu tăng trưởng ao nuôi",
    "theo dõi cho ăn",
    "giám sát chất lượng nước",
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
      name: "Ứng dụng nuôi tôm thẻ chân trắng Vannamei",
      item: canonicalUrl("/vi/vannamei-shrimp-farming-app"),
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ứng dụng theo dõi những gì cho các trang trại nuôi tôm thẻ chân trắng?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply theo dõi thiết lập ao, DOC, thả giống, lấy mẫu, MBW, ADG, FCR, tỷ lệ chết, cho ăn, kho thức ăn, chất lượng nước, thu hoạch, báo cáo tài chính và hồ sơ rủi ro dịch bệnh.",
      },
    },
    {
      "@type": "Question",
      name: "Đội ngũ thực địa có thể ghi chép dữ liệu trên di động không?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Có. Đội ngũ kỹ thuật thực địa có thể sử dụng ứng dụng di động để ghi lại các hoạt động hàng ngày ngay tại ao nuôi, trong khi các nhà quản lý đánh giá cùng dữ liệu đó qua dashboard trên web.",
      },
    },
    {
      "@type": "Question",
      name: "Shrimply hỗ trợ đưa ra các quyết định vận hành như thế nào?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply kết nối các ghi chép lấy mẫu gần đây, thức ăn, chất lượng nước, tỷ lệ chết và thu hoạch để đội ngũ đánh giá sự tăng trưởng, thay đổi sức ăn và rủi ro vận hành với đầy đủ bối cảnh nhất.",
      },
    },
  ],
};

export default function VannameiShrimpFarmingAppPageVI() {
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
      <VannameiShrimpFarmingLandingVI />
    </>
  );
}
