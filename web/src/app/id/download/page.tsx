import "@/app/globals.css";
import { canonicalUrl, coreSeoPages_id, seoMetadataID } from "@/config/seo";
import { GOOGLE_PLAY_URL, SITE_CONFIG } from "@/config/site";
import DownloadPageContentID from "./DownloadPageContentID";

const page = coreSeoPages_id.find(item => item.path === "/id/download");

export const metadata = seoMetadataID(page!, "/download");

const downloadPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page!.title,
  description: page!.description,
  url: canonicalUrl("/id/download"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/id"),
  },
  about: [
    "Aplikasi web iPhone Shrimply",
    "Tambah ke Home Screen",
    "Aplikasi Android Shrimply",
    "Shrimply di Google Play",
    "Aplikasi manajemen tambak udang",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Shrimply tersedia sebagai aplikasi web yang dapat diinstal di iPhone dan sebagai aplikasi native Android di Google Play.",
  url: canonicalUrl("/id/download"),
  downloadUrl: GOOGLE_PLAY_URL,
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/id/shrimp-farm-management-software"),
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function DownloadPageID() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(downloadPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <DownloadPageContentID />
    </>
  );
}
