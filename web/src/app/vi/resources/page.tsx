import Link from "next/link";
import Cursor from "@/components/Cursor";
import FooterVI from "@/components/FooterVI";
import NavbarVI from "@/components/NavbarVI";
import ResourcesHub from "@/components/ResourcesHub";
import { canonicalUrl, coreSeoPages_vi, seoMetadataVI } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticlesVI } from "@/data/resourceLibraryVI";

const page = coreSeoPages_vi.find(item => item.path === "/vi/resources");

export const metadata = seoMetadataVI(page!, "/resources");

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
  .map(slug => resourceArticlesVI.find(article => article.slug === slug))
  .filter((article): article is NonNullable<typeof article> => Boolean(article));

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Cẩm nang nuôi tôm & Trung tâm kiến thức Shrimply",
  description: page!.description,
  url: canonicalUrl("/vi/resources"),
  dateModified: page!.lastModified,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
  about: [
    "Nuôi tôm thẻ chân trắng",
    "Nuôi trồng thủy sản",
    "Quản lý trang trại tôm",
    "Hệ số chuyển đổi thức ăn FCR",
    "Chỉ số chất lượng nước ao tôm",
    "Cảnh báo và phòng ngừa dịch bệnh tôm",
  ],
  mainEntity: {
    "@type": "ItemList",
    itemListElement: resourceArticlesVI.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/vi/resources/${article.slug}`),
      name: article.title,
      description: article.description,
    })),
  },
};

export default function VietnameseResourcesPage() {
  return (
    <main>
      <Cursor />
      <NavbarVI />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
            Cẩm nang Shrimply
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.4s", maxWidth: "1000px", marginBottom: "32px" }}>
            Trung tâm kiến thức nuôi tôm & <em>Thư viện cẩm nang thực hành</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: "0.6s", maxWidth: "760px", fontSize: "1.08rem", fontWeight: 500 }}>
            Cẩm nang nuôi tôm thẻ chân trắng thương phẩm toàn diện về quản lý thức ăn, chất lượng nước, thu mẫu tăng trưởng, kiểm soát dịch bệnh, kế hoạch thu hoạch và tài chính trang trại.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Cẩm nang trọng tâm cho người nuôi tôm</div>
          <h2 className="section-title" style={{ maxWidth: "880px", marginBottom: "24px" }}>
            Bắt đầu từ các chủ đề tối ưu hóa thức ăn và kiểm soát dịch bệnh được quan tâm nhiều nhất
          </h2>
          <p style={{ maxWidth: "760px", fontWeight: 500, marginBottom: "34px" }}>
            Các cẩm nang này kết nối trực tiếp các vấn đề thực tiễn tại ao nuôi với các tính năng của Shrimply về kho thức ăn, dữ liệu ao nuôi, an toàn sinh học và cảnh báo dịch bệnh.
          </p>
          <div className="resource-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            {priorityGuides.map(article => (
              <Link
                href={`/vi/resources/${article.slug}`}
                key={article.slug}
                style={{
                  display: "block",
                  padding: "24px",
                  borderRadius: "16px",
                  border: "1px solid var(--slate)",
                  background: "var(--off-white)",
                  color: "inherit",
                }}
              >
                <span className="eyebrow" style={{ color: "var(--blue)", marginBottom: "12px", display: "inline-block" }}>
                  {article.label}
                </span>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "12px", color: "var(--navy)" }}>{article.title}</h3>
                <p style={{ fontSize: "0.95rem", color: "var(--ocean)", fontWeight: 500, marginBottom: "18px" }}>
                  {article.description}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--ocean)" }}>
                  <span style={{ fontWeight: 600 }}>{article.readTime}</span>
                  <span style={{ fontWeight: 700, color: "var(--navy)" }}>Đọc tiếp →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ResourcesHub articles={resourceArticlesVI} locale="vi" />

      <FooterVI />
    </main>
  );
}
