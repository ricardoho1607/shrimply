import "@/app/globals.css";
import { canonicalUrl, coreSeoPages_vi, seoMetadataVI } from "@/config/seo";
import { GOOGLE_PLAY_URL, SITE_CONFIG } from "@/config/site";
import DownloadPageContentVI from "./DownloadPageContentVI";

const page = coreSeoPages_vi.find(item => item.path === "/vi/download");

export const metadata = seoMetadataVI(page!, "/download");

const downloadPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page!.title,
  description: page!.description,
  url: canonicalUrl("/vi/download"),
  inLanguage: "vi",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/vi"),
  },
  about: [
    "Ứng dụng web iPhone Shrimply",
    "Thêm vào Màn hình chính",
    "Ứng dụng Android Shrimply",
    "Shrimply trên Google Play",
    "Ứng dụng quản lý trang trại tôm",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  inLanguage: "vi",
  description:
    "Shrimply có sẵn dưới dạng ứng dụng web có thể cài đặt trên iPhone và ứng dụng Android gốc trên Google Play.",
  url: canonicalUrl("/vi/download"),
  downloadUrl: GOOGLE_PLAY_URL,
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/vi/shrimp-farm-management-software"),
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function DownloadPageVI() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(downloadPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <DownloadPageContentVI />
    </>
  );
}
