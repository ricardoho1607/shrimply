import VannameiShrimpFarmingLandingTH from "@/components/VannameiShrimpFarmingLandingTH";
import { canonicalUrl, featureSeoPages_th, seoMetadataTH } from "@/config/seo";

const page = featureSeoPages_th.find(item => item.path === "/th/vannamei-shrimp-farming-app");

export const metadata = seoMetadataTH(page!, "/vannamei-shrimp-farming-app");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/th/vannamei-shrimp-farming-app"),
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
  url: canonicalUrl("/th/vannamei-shrimp-farming-app"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/th"),
  },
  about: [
    "แอปเลี้ยงกุ้งขาวแวนนาไม",
    "การติดตามรอบการเลี้ยงกุ้ง",
    "การสุ่มตัวอย่างในบ่อ",
    "การติดตามการให้อาหาร",
    "การตรวจสอบคุณภาพน้ำ",
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "หน้าหลัก",
      item: canonicalUrl("/th"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "แอปเลี้ยงกุ้งขาวแวนนาไม",
      item: canonicalUrl("/th/vannamei-shrimp-farming-app"),
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "แอปนี้ติดตามอะไรบ้างสำหรับฟาร์มกุ้งแวนนาไม?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply ติดตามการตั้งค่าบ่อ, DOC, การปล่อยลูกกุ้ง, การสุ่มตัวอย่าง, MBW, ADG, FCR, อัตราการตาย, การให้อาหาร, สต็อกอาหาร, คุณภาพน้ำ, การเก็บเกี่ยว, รายงานการเงิน และบันทึกความเสี่ยงของโรค",
      },
    },
    {
      "@type": "Question",
      name: "ทีมงานภาคสนามสามารถบันทึกข้อมูลผ่านแอปมือถือได้หรือไม่?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ได้ ทีมงานภาคสนามสามารถใช้แอปมือถือบันทึกกิจกรรมประจำวันหน้าบ่อได้ ขณะที่ผู้จัดการประเมินข้อมูลเดียวกันผ่านแดชบอร์ดบนเว็บ",
      },
    },
    {
      "@type": "Question",
      name: "Shrimply ช่วยในการตัดสินใจในการดำเนินงานอย่างไร?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply เชื่อมโยงบันทึกการสุ่มตัวอย่างล่าสุด อาหาร คุณภาพน้ำ อัตราการตาย และการเก็บเกี่ยว เพื่อให้ทีมประเมินการเติบโต พฤติกรรมการกิน และความเสี่ยงในการดำเนินงานได้อย่างรอบด้าน",
      },
    },
  ],
};

export default function VannameiShrimpFarmingAppPageTH() {
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
      <VannameiShrimpFarmingLandingTH />
    </>
  );
}
