import type { ReactNode } from "react";
import { canonicalUrl, coreSeoPages_th, seoMetadataTH } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_th.find(item => item.path === "/th");

export const metadata = seoMetadataTH(page!, "/");

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Shrimply",
  url: canonicalUrl("/th"),
  logo: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
  description: page?.description,
  sameAs: [canonicalUrl("/th")],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  url: canonicalUrl("/th"),
  image: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage.path}`,
  description: page?.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "การติดตามประสิทธิภาพบ่อ",
    "การจัดการคลังสินค้าอาหาร",
    "การตรวจสอบคุณภาพน้ำ",
    "การสุ่มตัวอย่างการเติบโตและการติดตาม MBW",
    "การติดตามการเก็บเกี่ยว",
    "รายงานการเงินฟาร์มกุ้ง",
    "การติดตามสินทรัพย์",
    "การแจ้งเตือนโรค",
    "ข้อมูลเชิงลึกการเพาะเลี้ยงสัตว์น้ำจาก Orson AI",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: canonicalUrl("/th"),
  description: page?.description,
  inLanguage: "th",
};

export default function ThaiRootLayout({ children }: { children: ReactNode }) {
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
