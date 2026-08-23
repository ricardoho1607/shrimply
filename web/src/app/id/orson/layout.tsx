import type { ReactNode } from "react";
import Script from "next/script";
import { canonicalUrl, coreSeoPages_id, seoMetadataID } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_id.find(item => item.path === "/id/orson");

export const metadata = seoMetadataID(page!, "/orson");

const relatedOrsonPages = [
  "/resources/fcr-shrimp-farming",
  "/resources/feed-tray-observations",
  "/resources/water-quality-trends",
  "/resources/white-spot-syndrome-virus-shrimp",
  "/id/features/disease-alerts",
].map(path => canonicalUrl(path));

const orsonWebPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page?.title,
  description: page?.description,
  url: canonicalUrl("/id/orson"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/id"),
  },
  about: [
    "Orson AI",
    "kecerdasan tambak udang",
    "analisis respons pakan",
    "tren kualitas air",
    "analisis risiko penyakit",
    "budidaya udang vannamei",
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
  url: canonicalUrl("/id/orson"),
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/id/shrimp-farm-management-software"),
  },
  featureList: [
    "Analisis respons pakan",
    "Interpretasi tren pertumbuhan",
    "Tinjauan pola kualitas air",
    "Konteks risiko penyakit",
    "Prospek kolam 72 jam",
  ],
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

export default function OrsonLayoutID({ children }: { children: ReactNode }) {
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
