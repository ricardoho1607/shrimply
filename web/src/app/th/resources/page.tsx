import Link from "next/link";
import Cursor from "@/components/Cursor";
import FooterTH from "@/components/FooterTH";
import NavbarTH from "@/components/NavbarTH";
import ResourcesHub from "@/components/ResourcesHub";
import { canonicalUrl, coreSeoPages_th, seoMetadataTH } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { resourceArticlesTH } from "@/data/resourceLibraryTH";

const page = coreSeoPages_th.find(item => item.path === "/th/resources");

export const metadata = seoMetadataTH(page!, "/resources");

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
  .map(slug => resourceArticlesTH.find(article => article.slug === slug))
  .filter((article): article is NonNullable<typeof article> => Boolean(article));

const collectionPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "ศูนย์รวมคู่มือการเลี้ยงกุ้ง & แหล่งความรู้ Shrimply",
  description: page!.description,
  url: canonicalUrl("/th/resources"),
  dateModified: page!.lastModified,
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
  },
  about: [
    "การเลี้ยงกุ้งขาวแวนนาไม",
    "การเพาะเลี้ยงสัตว์น้ำ",
    "การจัดการฟาร์มกุ้ง",
    "อัตราแลกเนื้อ FCR",
    "การตรวจวัดคุณภาพน้ำในบ่อกุ้ง",
    "การแจ้งเตือนและป้องกันโรคกุ้ง",
  ],
  mainEntity: {
    "@type": "ItemList",
    itemListElement: resourceArticlesTH.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(`/th/resources/${article.slug}`),
      name: article.title,
      description: article.description,
    })),
  },
};

export default function ThaiResourcesPage() {
  return (
    <main>
      <Cursor />
      <NavbarTH />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
            คู่มือ Shrimply
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.4s", maxWidth: "1000px", marginBottom: "32px" }}>
            ศูนย์การเรียนรู้การเพาะเลี้ยงกุ้งและ <em>คลังคู่มือปฏิบัติการ</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: "0.6s", maxWidth: "760px", fontSize: "1.08rem", fontWeight: 500 }}>
            คู่มือการเลี้ยงกุ้งขาวแวนนาไมเชิงพาณิชย์ที่ครอบคลุมการจัดการอาหาร คุณภาพน้ำ การสุ่มตัวอย่างการเติบโต ความเสี่ยงด้านโรค การวางแผนจับกุ้ง และการเงินฟาร์ม
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>คู่มือยอดนิยมสำหรับเกษตรกร</div>
          <h2 className="section-title" style={{ maxWidth: "880px", marginBottom: "24px" }}>
            เริ่มต้นจากหัวข้อการเพิ่มประสิทธิภาพอาหารและการควบคุมโรคที่มีการค้นหามากที่สุด
          </h2>
          <p style={{ maxWidth: "760px", fontWeight: 500, marginBottom: "34px" }}>
            คู่มือเหล่านี้เชื่อมโยงคำถามเชิงปฏิบัติการหน้าบ่อเข้ากับฟีเจอร์ของ Shrimply สำหรับคลังอาหาร ข้อมูลบ่อ ระบบความปลอดภัยทางชีวภาพ และการแจ้งเตือนโรค
          </p>
          <div className="resource-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            {priorityGuides.map(article => (
              <Link
                href={`/th/resources/${article.slug}`}
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
                  <span style={{ fontWeight: 700, color: "var(--navy)" }}>อ่านต่อ →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ResourcesHub articles={resourceArticlesTH} locale="th" />

      <FooterTH />
    </main>
  );
}
