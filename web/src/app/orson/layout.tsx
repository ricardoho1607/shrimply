import type { ReactNode } from "react";
import Script from "next/script";
import { canonicalUrl, coreSeoPages, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages.find(item => item.path === "/orson");

export const metadata = seoMetadata(page!);

const relatedOrsonPages = [
  "/resources/fcr-shrimp-farming",
  "/resources/feed-tray-observations",
  "/resources/water-quality-trends",
  "/resources/white-spot-syndrome-virus-shrimp",
  "/features/disease-alerts",
].map(path => canonicalUrl(path));

const orsonWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page?.title,
  description: page?.description,
  url: canonicalUrl("/orson"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/"),
  },
  about: [
    "Orson AI",
    "shrimp farm intelligence",
    "feed response analysis",
    "water quality trends",
    "disease risk analysis",
    "vannamei shrimp farming",
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
  url: canonicalUrl("/orson"),
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/shrimp-farm-management-software"),
  },
  featureList: [
    "Feed response analysis",
    "Growth trend interpretation",
    "Water quality pattern review",
    "Disease-risk context",
    "72-hour pond outlook",
  ],
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

export default function OrsonLayout({ children }: { children: ReactNode }) {
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
