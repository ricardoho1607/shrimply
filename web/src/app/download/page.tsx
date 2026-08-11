import { canonicalUrl, coreSeoPages, seoMetadata } from "@/config/seo";
import { GOOGLE_PLAY_URL, SITE_CONFIG } from "@/config/site";
import DownloadPageContent from "./DownloadPageContent";

const page = coreSeoPages.find(item => item.path === "/download");

export const metadata = seoMetadata(page!);

const downloadPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page!.title,
  description: page!.description,
  url: canonicalUrl("/download"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/"),
  },
  about: [
    "Shrimply iPhone web app",
    "Add to Home Screen",
    "Shrimply Android app",
    "Shrimply on Google Play",
    "Shrimp farm management app",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description: "Shrimply is available as an installable web app on iPhone and as a native Android app on Google Play.",
  url: canonicalUrl("/download"),
  downloadUrl: GOOGLE_PLAY_URL,
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/shrimp-farm-management-software"),
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

export default function DownloadPage() {
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
      <DownloadPageContent />
    </>
  );
}
