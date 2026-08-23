import ShrimpFarmManagementLandingTH from "@/components/ShrimpFarmManagementLandingTH";
import { canonicalUrl, featureSeoPages_th, seoMetadataTH } from "@/config/seo";

const page = featureSeoPages_th.find(item => item.path === "/th/shrimp-farm-management-software");

export const metadata = seoMetadataTH(page!, "/shrimp-farm-management-software");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/th/shrimp-farm-management-software"),
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
  url: canonicalUrl("/th/shrimp-farm-management-software"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/th"),
  },
  about: [
    "ซอฟต์แวร์จัดการฟาร์มกุ้ง",
    "การดำเนินงานฟาร์มเพาะเลี้ยงสัตว์น้ำ",
    "การจัดการบ่อเลี้ยงกุ้ง",
    "คลังสินค้าและสต็อกอาหาร",
    "รายงานฟาร์มกุ้ง",
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
      name: "ซอฟต์แวร์จัดการฟาร์มกุ้ง",
      item: canonicalUrl("/th/shrimp-farm-management-software"),
    },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Shrimply ช่วยจัดการอะไรบ้าง?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply จัดการบ่อเลี้ยง การปล่อยลูกกุ้ง การสุ่มตัวอย่าง คุณภาพน้ำ การให้อาหาร สต็อกอาหาร การเก็บเกี่ยว สินทรัพย์ รายงานการเงิน การแจ้งเตือนโรค การตั้งค่าบริษัท บทบาทหน้าที่ของทีม และข้อมูลเชิงลึกจาก Orson AI",
      },
    },
    {
      "@type": "Question",
      name: "ระบบนี้ใช้สำหรับการบันทึกข้อมูลเพียงอย่างเดียวหรือไม่?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ไม่ใช่ Shrimply ได้รับการออกแบบมาเพื่อช่วยทีมวิเคราะห์บันทึกการผลิต ประเมินประสิทธิภาพของบ่อ จัดทำรายงาน และตรวจจับความเสี่ยงในการดำเนินงานได้ตั้งแต่เนิ่นๆ",
      },
    },
    {
      "@type": "Question",
      name: "รองรับการทำงานทั้งบนมือถือและเว็บหรือไม่?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ใช่ ทีมงานภาคสนามสามารถบันทึกกิจกรรมในฟาร์มผ่านมือถือ ในขณะที่ผู้จัดการสามารถใช้เว็บแดชบอร์ดสำหรับการประเมินผล การวิเคราะห์ การรายงาน และการควบคุมภาพรวมระดับองค์กร",
      },
    },
  ],
};

export default function ShrimpFarmManagementSoftwarePageTH() {
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
      <ShrimpFarmManagementLandingTH />
    </>
  );
}
