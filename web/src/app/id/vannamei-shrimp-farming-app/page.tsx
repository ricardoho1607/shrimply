import VannameiShrimpFarmingLandingID from "@/components/VannameiShrimpFarmingLandingID";
import { canonicalUrl, featureSeoPages_id, seoMetadataID } from "@/config/seo";

const page = featureSeoPages_id.find(item => item.path === "/id/vannamei-shrimp-farming-app");

export const metadata = seoMetadataID(page!, "/vannamei-shrimp-farming-app");

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/id/vannamei-shrimp-farming-app"),
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
  url: canonicalUrl("/id/vannamei-shrimp-farming-app"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/id"),
  },
  about: [
    "aplikasi budidaya udang vannamei",
    "pelacakan siklus budidaya udang",
    "sampling kolam",
    "pelacakan pakan",
    "monitoring kualitas air",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Apa saja yang dilacak aplikasi ini untuk tambak vannamei?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply melacak setup kolam, DOC, tebar benur, sampling, MBW, ADG, FCR, mortalitas, pemberian pakan, inventaris pakan, kualitas air, panen, laporan keuangan, dan catatan risiko penyakit.",
      },
    },
    {
      "@type": "Question",
      name: "Bisakah tim lapangan mencatat data di aplikasi mobile?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ya. Tim lapangan dapat menggunakan aplikasi mobile untuk aktivitas harian kolam, sementara manajer mengevaluasi catatan tambak yang sama dari web dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "Bagaimana Shrimply membantu pengambilan keputusan operasional?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply menghubungkan catatan sampling terkini, pakan, kualitas air, mortalitas, dan panen agar tim dapat mengevaluasi dinamika pertumbuhan, perubahan nafsu makan, dan risiko operasional dengan konteks yang lebih utuh.",
      },
    },
  ],
};

export default function VannameiShrimpFarmingAppPageID() {
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
      <VannameiShrimpFarmingLandingID />
    </>
  );
}
