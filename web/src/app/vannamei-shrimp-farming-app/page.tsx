import VannameiShrimpFarmingLanding from "@/components/VannameiShrimpFarmingLanding";
import { canonicalUrl, featureSeoPages, seoMetadata } from "@/config/seo";

const page = featureSeoPages.find(item => item.path === "/vannamei-shrimp-farming-app");

export const metadata = seoMetadata(page!);

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description: page?.description,
  url: canonicalUrl("/vannamei-shrimp-farming-app"),
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
  url: canonicalUrl("/vannamei-shrimp-farming-app"),
  isPartOf: {
    "@type": "WebSite",
    name: "Shrimply",
    url: canonicalUrl("/"),
  },
  about: [
    "vannamei shrimp farming app",
    "shrimp crop cycle tracking",
    "pond sampling",
    "feed tracking",
    "water quality monitoring",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does the app track for vannamei farms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply tracks pond setup, DOC, stocking, sampling, MBW, ADG, FCR, mortality, feeding, feed inventory, water quality, harvests, finance reports, and disease-risk records.",
      },
    },
    {
      "@type": "Question",
      name: "Can field teams log data on mobile?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Field teams can use the mobile app for daily pond activity while managers review the same farm records from the web dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "How does Shrimply help with operational decisions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Shrimply connects recent sampling, feed, water quality, mortality, and harvest records so teams can review growth movement, appetite changes, and operational risks with better context.",
      },
    },
  ],
};

export default function VannameiShrimpFarmingAppPage() {
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
      <VannameiShrimpFarmingLanding />
    </>
  );
}
