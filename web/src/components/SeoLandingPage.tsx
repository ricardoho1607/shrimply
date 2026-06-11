import Link from "next/link";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export type SeoLandingPageProps = {
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
};

export default function SeoLandingPage({
  eyebrow,
  title,
  intro,
  sections,
  related,
}: SeoLandingPageProps) {
  return (
    <main>
      <Cursor />
      <Navbar />

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
