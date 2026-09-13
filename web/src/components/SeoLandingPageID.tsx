import "@/app/globals.css";
import Link from "next/link";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import NavbarID from "@/components/NavbarID";
import { canonicalUrl } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

export type SeoLandingPageIDProps = {
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
  related: Array<{
    href: string;
    label: string;
    description?: string;
  }>;
  checklist?: string[];
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
};

export default function SeoLandingPageID({
  path,
  eyebrow,
  title,
  intro,
  sections,
  related,
  checklist = [],
  faqs = [],
}: SeoLandingPageIDProps) {
  const pageUrl = canonicalUrl(path);
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: intro,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: canonicalUrl("/id"),
    },
    about: [eyebrow, "Budidaya udang", "Manajemen akuakultur", "Budidaya udang vannamei"],
    significantLink: related.map(link => canonicalUrl(link.href)),
    relatedLink: related.map(link => canonicalUrl(link.href)),
  };
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Shrimply ${eyebrow}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    description: intro,
    url: pageUrl,
    isPartOf: {
      "@type": "SoftwareApplication",
      name: SITE_CONFIG.name,
      url: canonicalUrl("/id/shrimp-farm-management-software"),
    },
    featureList: [
      ...sections.map(section => section.title),
      ...checklist.slice(0, 5),
    ],
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: canonicalUrl("/id"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: eyebrow,
        item: pageUrl,
      },
    ],
  };
  const faqJsonLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(faq => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;
  const relatedPagesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Halaman Shrimply terkait untuk ${eyebrow}`,
    itemListElement: related.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: link.label,
      description: link.description,
      url: canonicalUrl(link.href),
    })),
  };

  return (
    <main>
      <Cursor />
      <NavbarID />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedPagesJsonLd) }}
      />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "20px" }}>{eyebrow}</div>
          <h1 style={{ maxWidth: "980px", marginBottom: "30px" }}>{title}</h1>
          <p style={{ maxWidth: "720px", fontSize: "1.08rem", fontWeight: 500, color: "var(--muted)" }}>
            {intro}
          </p>
          <div className="mobile-cta-row" style={{ display: "flex", gap: "16px", marginTop: "40px" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Mulai Gratis</Link>
            <Link href="/id" className="btn-outline">Kembali ke Beranda</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <div className="features-grid">
            {sections.map(section => (
              <article className="feature-card" key={section.title}>
                <h2 className="feature-title" style={{ marginBottom: "16px" }}>{section.title}</h2>
                <p style={{ fontWeight: 500 }}>{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {checklist.length ? (
        <section className="section" style={{ background: "var(--off-white)", paddingTop: "80px", paddingBottom: "80px" }}>
          <div className="container" style={{ maxWidth: "980px" }}>
            <div className="eyebrow" style={{ marginBottom: "18px" }}>Checklist Alur Kerja Tambak</div>
            <h2 className="section-title" style={{ fontSize: "clamp(2.1rem, 3vw, 3.2rem)", marginBottom: "26px" }}>
              Hal yang dibantu kendalikan oleh alur kerja ini untuk tambak.
            </h2>
            <ul style={{ display: "grid", gap: "14px", paddingLeft: "20px" }}>
              {checklist.map(item => (
                <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {faqs.length ? (
        <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
          <div className="container" style={{ maxWidth: "980px" }}>
            <div className="eyebrow" style={{ marginBottom: "18px" }}>Pertanyaan Umum</div>
            <div style={{ display: "grid", gap: "18px" }}>
              {faqs.map(faq => (
                <article key={faq.question} style={{ borderTop: "1px solid var(--slate)", paddingTop: "18px" }}>
                  <h2 className="feature-title" style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
                    {faq.question}
                  </h2>
                  <p style={{ color: "var(--ocean)", fontWeight: 500 }}>{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section dark-section" style={{ textAlign: "center" }}>
        <div className="dark-glow"></div>
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Halaman Shrimply Terkait</div>
          <h2 className="section-title" style={{ maxWidth: "760px", margin: "0 auto 36px", color: "var(--white)" }}>
            Jelajahi alur kerja manajemen tambak udang lainnya.
          </h2>
          <div
            className="resource-card-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "14px",
              textAlign: "left",
            }}
          >
            {related.map(link => (
              <Link
                href={link.href}
                key={link.href}
                style={{
                  minHeight: "118px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "14px",
                  padding: "20px",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                <h3 className="feature-title" style={{ color: "var(--white)", fontSize: "1.08rem", marginBottom: "10px" }}>
                  {link.label}
                </h3>
                {link.description ? (
                  <p style={{ color: "rgba(255,255,255,0.72)", fontWeight: 500, fontSize: "0.94rem" }}>
                    {link.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FooterID />
    </main>
  );
}
