import ShrimpFarmManagementLandingID from "@/components/ShrimpFarmManagementLandingID";
import { canonicalUrl, featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/shrimp-farm-management-software");

export const metadata = seoMetadataID(page!, "/shrimp-farm-management-software");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/id/shrimp-farm-management-software"),
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
  url: canonicalUrl("/id/shrimp-farm-management-software"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/id"),
  },
  about: [
    "software manajemen tambak udang",
    "operasional tambak akuakultur",
    "manajemen kolam",
    "inventaris pakan",
    "laporan tambak udang",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apa saja yang dikelola oleh Shrimply?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply mengelola kolam, tebar benur, sampling, kualitas air, pemberian pakan, inventaris pakan, panen, aset, laporan keuangan, peringatan penyakit, pengaturan perusahaan, peran tim, dan wawasan Orson AI.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah ini hanya untuk pencatatan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tidak. Shrimply dirancang untuk membantu tim menginterpretasikan catatan produksi, mengevaluasi kinerja kolam, menyusun laporan, dan mendeteksi risiko operasional lebih awal.",
      },
    },
    {
      "@type": "Question",
      name: "Apakah mendukung alur kerja mobile dan web?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya. Tim lapangan dapat mencatat aktivitas tambak di mobile, sementara manajer menggunakan web dashboard untuk evaluasi, analisis, pelaporan, dan visibilitas tingkat perusahaan.",
      },
    },
  ],
};

export default function ShrimpFarmManagementSoftwarePageID() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <ShrimpFarmManagementLandingID />
    </>
  );
}
