import type { ReactNode } from "react";
import Script from "next/script";
import { canonicalUrl, coreSeoPages_id, seoMetadataID } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

const page = coreSeoPages_id.find(item => item.path === "/id");

export const metadata = seoMetadataID(page!, "/");

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Shrimply",
  url: canonicalUrl("/id"),
  logo: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
  description: page?.description,
  sameAs: [canonicalUrl("/id")],
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android",
  url: canonicalUrl("/id"),
  image: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage.path}`,
  description: page?.description,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Pelacakan kinerja kolam",
    "Manajemen inventaris pakan",
    "Monitoring kualitas air",
    "Sampling pertumbuhan dan pelacakan MBW",
    "Pelacakan panen",
    "Laporan keuangan tambak udang",
    "Pelacakan aset",
    "Peringatan penyakit",
    "Wawasan akuakultur Orson AI",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_CONFIG.name,
  url: canonicalUrl("/id"),
  description: page?.description,
  inLanguage: "id",
};

export default function IndonesianRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {children}
    </>
  );
}
