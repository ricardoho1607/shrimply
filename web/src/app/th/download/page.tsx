import "@/app/globals.css";
import { canonicalUrl, coreSeoPages_th, seoMetadataTH } from "@/config/seo";
import { GOOGLE_PLAY_URL, SITE_CONFIG } from "@/config/site";
import DownloadPageContentTH from "./DownloadPageContentTH";

const page = coreSeoPages_th.find(item => item.path === "/th/download");

export const metadata = seoMetadataTH(page!, "/download");

const downloadPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page!.title,
  description: page!.description,
  url: canonicalUrl("/th/download"),
  inLanguage: "th",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/th"),
  },
  about: [
    "เว็บแอป iPhone Shrimply",
    "เพิ่มไปยังหน้าจอหลัก",
    "แอป Android Shrimply",
    "Shrimply บน Google Play",
    "แอปจัดการฟาร์มกุ้ง",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  inLanguage: "th",
  description:
    "Shrimply พร้อมใช้งานเป็นเว็บแอปที่สามารถติดตั้งบน iPhone และเป็นแอปเนทีฟ Android บน Google Play",
  url: canonicalUrl("/th/download"),
  downloadUrl: GOOGLE_PLAY_URL,
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/th/shrimp-farm-management-software"),
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function DownloadPageTH() {
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
      <DownloadPageContentTH />
    </>
  );
}
