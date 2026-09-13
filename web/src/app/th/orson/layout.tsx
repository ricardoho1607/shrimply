import "@/app/globals.css";
import type { ReactNode } from "react";
import { canonicalUrl, coreSeoPages_th, seoMetadataTH } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_th.find(item => item.path === "/th/orson");

export const metadata = seoMetadataTH(page!, "/orson");

const relatedOrsonPages = [
  "/resources/fcr-shrimp-farming",
  "/resources/feed-tray-observations",
  "/resources/water-quality-trends",
  "/resources/white-spot-syndrome-virus-shrimp",
  "/th/features/disease-alerts",
].map(path => canonicalUrl(path));

const orsonWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page?.title,
  description: page?.description,
  url: canonicalUrl("/th/orson"),
  inLanguage: "th",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/th"),
  },
  about: [
    "Orson AI",
    "ปัญญาประดิษฐ์สำหรับฟาร์มกุ้ง",
    "การวิเคราะห์การตอบสนองต่ออาหาร",
    "แนวโน้มคุณภาพน้ำ",
    "การวิเคราะห์ความเสี่ยงของโรค",
    "การเลี้ยงกุ้งขาวแวนนาไม",
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
  url: canonicalUrl("/th/orson"),
  inLanguage: "th",
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/th/shrimp-farm-management-software"),
  },
  featureList: [
    "การวิเคราะห์การตอบสนองต่ออาหาร",
    "การแปลผลแนวโน้มการเติบโต",
    "การตรวจสอบรูปแบบคุณภาพน้ำ",
    "บริบทความเสี่ยงของโรค",
    "การคาดการณ์สภาพบ่อล่วงหน้า 72 ชั่วโมง",
  ],
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

export default function OrsonLayoutTH({ children }: { children: ReactNode }) {
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
