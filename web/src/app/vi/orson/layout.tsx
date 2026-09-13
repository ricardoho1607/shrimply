import "@/app/globals.css";
import type { ReactNode } from "react";
import { canonicalUrl, coreSeoPages_vi, seoMetadataVI } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_vi.find(item => item.path === "/vi/orson");

export const metadata = seoMetadataVI(page!, "/orson");

const relatedOrsonPages = [
  "/resources/fcr-shrimp-farming",
  "/resources/feed-tray-observations",
  "/resources/water-quality-trends",
  "/resources/white-spot-syndrome-virus-shrimp",
  "/vi/features/disease-alerts",
].map(path => canonicalUrl(path));

const orsonWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page?.title,
  description: page?.description,
  url: canonicalUrl("/vi/orson"),
  inLanguage: "vi",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/vi"),
  },
  about: [
    "Orson AI",
    "Trí tuệ nhân tạo nuôi tôm",
    "Phân tích phản hồi thức ăn",
    "Xu hướng chất lượng nước",
    "Phân tích rủi ro dịch bệnh",
    "Nuôi tôm thẻ chân trắng vannamei",
  ],
  relatedLink: relatedOrsonPages,
  significantLink: relatedOrsonPages,
};

const orsonSoftwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Orson AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/vi/orson"),
  inLanguage: "vi",
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/vi/shrimp-farm-management-software"),
  },
  featureList: [
    "Phân tích phản hồi thức ăn",
    "Giải đoán xu hướng tăng trưởng",
    "Đánh giá mô hình chất lượng nước",
    "Bối cảnh rủi ro dịch bệnh",
    "Dự báo ao nuôi 72 giờ",
  ],
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

export default function OrsonLayoutVI({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orsonWebPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orsonSoftwareJsonLd) }}
      />
      {children}
    </>
  );
}
