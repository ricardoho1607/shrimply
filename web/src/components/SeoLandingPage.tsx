import Link from "next/link";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { canonicalUrl } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";

export type SeoLandingPageProps = {
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
  }>;
  checklist?: string[];
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
};

export default function SeoLandingPage({
  path,
  eyebrow,
  title,
  intro,
  sections,
  related,
  checklist = [],
  faqs = [],
}: SeoLandingPageProps) {
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
      url: canonicalUrl("/"),
    },
    about: [eyebrow, "Shrimp farming", "Aquaculture management", "Vannamei shrimp farming"],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: canonicalUrl("/"),
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

  return (
    <main>
      <Cursor />
      <Navbar />
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

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: "20px" }}>{eyebrow}</div>
          <h1 style={{ maxWidth: "980px", marginBottom: "30px" }}>{title}</h1>
          <p style={{ maxWidth: "720px", fontSize: "1.08rem", fontWeight: 500, color: "var(--muted)" }}>
            {intro}
          </p>
          <div className="mobile-cta-row" style={{ display: "flex", gap: "16px", marginTop: "40px" }}>
            <Link href="/auth/join" className="btn-primary">Start Free Trial</Link>
            <Link href="/" className="btn-outline">Back to Home</Link>
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
            <div className="eyebrow" style={{ marginBottom: "18px" }}>Farm Workflow Checklist</div>
            <h2 className="section-title" style={{ fontSize: "clamp(2.1rem, 3vw, 3.2rem)", marginBottom: "26px" }}>
              What this workflow should help the farm control.
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
            <div className="eyebrow" style={{ marginBottom: "18px" }}>Common Questions</div>
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
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Related Shrimply Pages</div>
          <h2 className="section-title" style={{ maxWidth: "760px", margin: "0 auto 36px", color: "var(--white)" }}>
            Explore more shrimp farm management workflows.
          </h2>
          <div className="mobile-cta-row" style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "center" }}>
            {related.map(link => (
              <Link
                href={link.href}
                className="btn-outline"
                key={link.href}
                style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.82)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
