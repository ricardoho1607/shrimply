import Link from "next/link";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResourcesHub from "@/components/ResourcesHub";
import { canonicalUrl, coreSeoPages, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticles } from "@/data/resourceLibrary";

const page = coreSeoPages.find(item => item.path === "/resources");

export const metadata = seoMetadata(page!);

const priorityGuideSlugs = [
  "fcr-shrimp-farming",
  "white-spot-syndrome-virus-shrimp",
  "white-feces-disease-shrimp",
  "feed-tray-observations",
  "ehp-shrimp-disease",
] as const;

const priorityGuides = priorityGuideSlugs
  .map(slug => resourceArticles.find(article => article.slug === slug))
  .filter((article): article is NonNullable<typeof article> => Boolean(article));

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Shrimp Farming Resources",
  description: page!.description,
  url: canonicalUrl("/resources"),
  dateModified: page!.lastModified,
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

      <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Popular Farmer Guides</div>
          <h2 className="section-title" style={{ maxWidth: "880px", marginBottom: "24px" }}>
            Start with feed efficiency and disease-risk topics farmers are searching for.
          </h2>
          <p style={{ maxWidth: "760px", fontWeight: 500, marginBottom: "34px" }}>
            These guides connect practical farm questions with the Shrimply workflows for feed inventory, pond records, biosecurity, and disease alerts.
          </p>
          <div className="resource-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            {priorityGuides.map(article => (
              <Link
                href={`/resources/${article.slug}`}
                key={article.slug}
                style={{
                  display: "block",
                  border: "1px solid var(--slate)",
                  borderRadius: "14px",
                  padding: "22px",
                  background: "var(--off-white)",
                }}
              >
                <span className="eyebrow" style={{ display: "block", marginBottom: "12px" }}>{article.label}</span>
                <h3 className="feature-title" style={{ fontSize: "1.18rem", marginBottom: "10px" }}>{article.title}</h3>
                <p style={{ fontWeight: 500 }}>{article.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ResourcesHub articles={resourceArticles} />

      <Footer />
    </main>
  );
}
