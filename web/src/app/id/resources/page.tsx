import Link from "next/link";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import NavbarID from "@/components/NavbarID";
import ResourcesHub from "@/components/ResourcesHub";
import { canonicalUrl, coreSeoPages_id, seoMetadataID } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticlesID } from "@/data/resourceLibraryID";

const page = coreSeoPages_id.find(item => item.path === "/id/resources");

export const metadata = seoMetadataID(page!, "/resources");

const priorityGuideSlugs = [
  "vannamei-water-quality-parameters",
  "vannamei-feeding-rate",
  "vannamei-stocking-density",
  "vannamei-growth-chart",
  "fcr-shrimp-farming",
  "white-spot-syndrome-virus-shrimp",
  "white-feces-disease-shrimp",
  "feed-tray-observations",
] as const;

const priorityGuides = priorityGuideSlugs
  .map(slug => resourceArticlesID.find(article => article.slug === slug))
  .filter((article): article is NonNullable<typeof article> => Boolean(article));

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Panduan Budidaya Udang & Pusat Edukasi Shrimply",
  description: page!.description,
  url: canonicalUrl("/id/resources"),
  dateModified: page!.lastModified,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
  about: [
    "Budidaya udang",
    "Budidaya udang vannamei",
    "Manajemen akuakultur",
    "Feed conversion ratio",
    "Monitoring kualitas air",
    "Peringatan penyakit udang",
  ],
  mainEntity: {
    "@type": "ItemList",
    itemListElement: resourceArticlesID.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/id/resources/${article.slug}`),
      name: article.title,
      description: article.description,
    })),
  },
};

export default function IndonesianResourcesPage() {
  return (
    <main>
      <Cursor />
      <NavbarID />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
            Panduan Shrimply
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.4s", maxWidth: "1000px", marginBottom: "32px" }}>
            Pusat edukasi budidaya udang dan <em>perpustakaan panduan.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: "0.6s", maxWidth: "760px", fontSize: "1.08rem", fontWeight: 500 }}>
            Panduan praktis budidaya vannamei untuk manajemen pakan, kualitas air, sampling pertumbuhan, risiko penyakit, rencana panen, dan keuangan tambak.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Panduan Terpopuler Petambak</div>
          <h2 className="section-title" style={{ maxWidth: "880px", marginBottom: "24px" }}>
            Mulai dari topik efisiensi pakan dan mitigasi risiko penyakit yang paling banyak dicari.
          </h2>
          <p style={{ maxWidth: "760px", fontWeight: 500, marginBottom: "34px" }}>
            Panduan ini menghubungkan pertanyaan praktis di lapangan dengan fitur Shrimply untuk inventaris pakan, data kolam, biosekuriti, dan deteksi penyakit.
          </p>
          <div className="resource-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            {priorityGuides.map(article => (
              <Link
                href={`/id/resources/${article.slug}`}
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

      <ResourcesHub articles={resourceArticlesID} locale="id" />

      <FooterID />
    </main>
  );
}
