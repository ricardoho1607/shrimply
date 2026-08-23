import type { ReactNode } from "react";
import { canonicalUrl, coreSeoPages_vi, seoMetadataVI } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_vi.find(item => item.path === "/vi");

export const metadata = seoMetadataVI(page!, "/");

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Shrimply",
  url: canonicalUrl("/vi"),
  logo: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
  description: page?.description,
  sameAs: [canonicalUrl("/vi")],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  url: canonicalUrl("/vi"),
  image: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage.path}`,
  description: page?.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Theo dõi hiệu suất ao nuôi",
    "Quản lý kho thức ăn",
    "Giám sát chất lượng nước",
    "Lấy mẫu tăng trưởng và theo dõi MBW",
    "Theo dõi thu hoạch",
    "Báo cáo tài chính trang trại tôm",
    "Theo dõi tài sản",
    "Cảnh báo dịch bệnh",
    "Thông tin chi tiết nuôi trồng thủy sản từ Orson AI",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: canonicalUrl("/vi"),
  description: page?.description,
  inLanguage: "vi",
};

export default function VietnameseRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {children}
    </>
  );
}
