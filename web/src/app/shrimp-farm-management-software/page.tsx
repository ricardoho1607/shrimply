import ShrimpFarmManagementLanding from "@/components/ShrimpFarmManagementLanding";
import { canonicalUrl, featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/shrimp-farm-management-software");

export const metadata = seoMetadata(page!);

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  description: page?.description,
  url: canonicalUrl("/shrimp-farm-management-software"),
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
  url: canonicalUrl("/shrimp-farm-management-software"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/"),
  },
  about: [
    "shrimp farm management software",
    "aquaculture farm operations",
    "pond management",
    "feed inventory",
    "shrimp farm reporting",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Shrimply manage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply manages ponds, stocking, sampling, water quality, feeding, feed inventory, harvests, assets, finance reports, disease alerts, company setup, roles, and Orson AI insights.",
      },
    },
    {
      "@type": "Question",
      name: "Is this only for record keeping?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Shrimply is designed to help teams interpret production records, review pond performance, prepare reports, and spot operational risks earlier.",
      },
    },
    {
      "@type": "Question",
      name: "Does it support mobile and web workflows?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Field teams can log farm activity on mobile, while managers use the web dashboard for review, analysis, reporting, and company-level visibility.",
      },
    },
  ],
};

export default function ShrimpFarmManagementSoftwarePage() {
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
      <ShrimpFarmManagementLanding />
    </>
  );
}
