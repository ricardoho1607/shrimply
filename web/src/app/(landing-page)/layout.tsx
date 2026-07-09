import type { ReactNode } from "react";
import Script from "next/script";
import { canonicalUrl, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

export const metadata = seoMetadata({
  path: "/",
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Shrimply",
  url: canonicalUrl("/"),
  logo: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
  description: SITE_CONFIG.description,
  sameAs: [canonicalUrl("/")],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  url: canonicalUrl("/"),
  image: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage.path}`,
  description: SITE_CONFIG.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Pond performance tracking",
    "Feed inventory management",
    "Water quality monitoring",
    "Growth sampling and MBW tracking",
    "Harvest tracking",
    "Shrimp farm finance reports",
    "Asset tracking",
    "Disease alerts",
    "Orson AI aquaculture insights",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: canonicalUrl("/"),
  description: SITE_CONFIG.description,
  inLanguage: "en",
  hasPart: canonicalUrl("/resources"),
};

export default function LandingPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script
        id="shrimply-organization-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Script
        id="shrimply-software-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <Script
        id="shrimply-website-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {children}
    </>
  );
}
