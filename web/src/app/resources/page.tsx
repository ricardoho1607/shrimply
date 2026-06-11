import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResourcesHub from "@/components/ResourcesHub";
import { canonicalUrl, coreSeoPages, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticles } from "@/data/resourceLibrary";

const page = coreSeoPages.find(item => item.path === "/resources");

export const metadata = seoMetadata(page!);

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Shrimp Farming Resources",
  description: page!.description,
  url: canonicalUrl("/resources"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
  about: [
    "Shrimp farming",
    "Vannamei shrimp farming",
    "Aquaculture management",
    "Feed conversion ratio",
    "Water quality monitoring",
    "Shrimp disease alerts",
  ],
  mainEntity: {
    "@type": "ItemList",
    itemListElement: resourceArticles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/resources/${article.slug}`),
      name: article.title,
      description: article.description,
    })),
  },
};

export default function ResourcesPage() {
  return (
    <main>
      <Cursor />
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
            Shrimply Resources
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.4s", maxWidth: "1000px", marginBottom: "32px" }}>
            Shrimp farming knowledge hub and <em>resource library.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: "0.6s", maxWidth: "760px", fontSize: "1.08rem", fontWeight: 500 }}>
            Practical vannamei farming guides for feed control, water quality, growth sampling, disease risk, harvest planning, and farm finance.
          </p>
        </div>
      </section>

      <ResourcesHub articles={resourceArticles} />

      <Footer />
    </main>
  );
}
