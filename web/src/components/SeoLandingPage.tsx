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
  problem?: {
    title?: string;
    body: string;
  };
  solution?: {
    title?: string;
    body: string;
  };
  workflow?: Array<{
    step: string;
    title: string;
    body: string;
  }>;
  audience?: string[];
  metrics?: string[];
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

function renderHeroTitle(fullTitle: string) {
  if (fullTitle.includes(" for ")) {
    const parts = fullTitle.split(" for ");
    return (
      <>
        {parts[0]} <br />
        <span>for {parts.slice(1).join(" for ")}</span>
      </>
    );
  }
  if (fullTitle.includes(": ")) {
    const parts = fullTitle.split(": ");
    return (
      <>
        {parts[0]} <br />
        <span>{parts.slice(1).join(": ")}</span>
      </>
    );
  }
  return fullTitle;
}

function getHeroMockMetrics(path: string, eyebrow: string) {
  const p = path.toLowerCase();
  if (p.includes("feed")) {
    return {
      badge: "Pond A1 • DOC 62",
      pill: "Feed Lot: CP-SP904",
      m1: { label: "Tray Clearance", value: "4.2", unit: "out of 5 avg" },
      m2: { label: "Current FCR", value: "1.28", unit: "-0.14 vs target" },
      m3: { label: "Daily Ration", value: "42.5", unit: "kg across 4 meals" },
      m4: { label: "Lot Stock", value: "3,450", unit: "kg buffer on hand" },
      footLeft: "Feed Index: Safe Target",
      footRight: "Next meal in 45m",
      orsonNote: "Appetite aligned with morning DO (5.4 mg/L). Safe to maintain planned 42.5 kg ration.",
      insightP1Label: "Daily Feed",
      insightP1Val: "38 → 42.5",
      insightP1Unit: "kg/day",
      insightP2Label: "FCR Trend",
      insightP2Val: "1.34 → 1.28",
      insightP2Unit: "ratio",
    };
  }
  if (p.includes("water")) {
    return {
      badge: "Pond B2 • Continuous Logs",
      pill: "Sensor & Lab Checked",
      m1: { label: "Morning DO", value: "5.4", unit: "mg/L (target >4.0)" },
      m2: { label: "Diurnal pH", value: "7.9", unit: "8.2 afternoon (Δ 0.3)" },
      m3: { label: "Alkalinity", value: "138", unit: "mg/L CaCO₃ buffer" },
      m4: { label: "Toxic NH₃", value: "0.02", unit: "mg/L (safe range)" },
      footLeft: "Temp 29.2°C • Salinity 18 ppt",
      footRight: "Last reading: 25m ago",
      orsonNote: "Dissolved oxygen stability confirmed across 5-day cycle trend. Zero hypoxia warning flags.",
      insightP1Label: "Pre-dawn DO",
      insightP1Val: "5.1 → 5.4",
      insightP1Unit: "mg/L",
      insightP2Label: "Diurnal pH",
      insightP2Val: "7.9 → 8.2",
      insightP2Unit: "pH",
    };
  }
  if (p.includes("growth") || p.includes("sampling")) {
    return {
      badge: "Pond C1 • DOC 75",
      pill: "Cast Net Audit",
      m1: { label: "Latest MBW", value: "18.6", unit: "grams (look-back verified)" },
      m2: { label: "Recent ADG", value: "0.34", unit: "g/day (peak growth)" },
      m3: { label: "Est. Biomass", value: "2,180", unit: "kg (net of harvests)" },
      m4: { label: "Survival", value: "92.4", unit: "% viable population" },
      footLeft: "Count: 54 pcs/kg",
      footRight: "Target 20g in 9 days",
      orsonNote: "Growth trajectory on track for 85-day market target. Pond carrying capacity within safe limits.",
      insightP1Label: "Latest MBW",
      insightP1Val: "16.2 → 18.6",
      insightP1Unit: "g",
      insightP2Label: "Weekly ADG",
      insightP2Val: "0.31 → 0.34",
      insightP2Unit: "g/day",
    };
  }
  return {
    badge: "Pond A1 • Commercial Cycle",
    pill: eyebrow,
    m1: { label: "Cycle DOC", value: "65", unit: "Days of culture" },
    m2: { label: "Current ABW", value: "18.5", unit: "grams per shrimp" },
    m3: { label: "Pond FCR", value: "1.32", unit: "Cumulative feed efficiency" },
    m4: { label: "Survival", value: "92.4", unit: "% viable stock" },
    footLeft: "Pond Area: 2,500 m²",
    footRight: "Live Cloud Sync",
    orsonNote: `All ${eyebrow.toLowerCase()} records connected. Multi-pond variance within normal operating bounds.`,
    insightP1Label: "Feed Logged",
    insightP1Val: "32 → 38",
    insightP1Unit: "kg/day",
    insightP2Label: "Dissolved O₂",
    insightP2Val: "5.8 → 5.2",
    insightP2Unit: "mg/L",
  };
}

export default function SeoLandingPage({
  path,
  eyebrow,
  title,
  intro,
  problem,
  solution,
  workflow = [],
  audience = [],
  metrics = [],
  sections,
  related,
  checklist = [],
  faqs = [],
}: SeoLandingPageProps) {
  const pageUrl = canonicalUrl(path);
  const heroMock = getHeroMockMetrics(path, eyebrow);

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
      url: canonicalUrl("/shrimp-farm-management-software"),
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

  const relatedPagesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Related Shrimply pages for ${eyebrow}`,
    itemListElement: related.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: link.label,
      description: link.description,
      url: canonicalUrl(link.href),
    })),
  };

  return (
    <main className="ocean-home">
      <Cursor />
      <Navbar />

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

      {/* Hero Section styled with main landing page typography & layout */}
      <section className="hero wrap" style={{ minHeight: "auto", paddingTop: "35px", paddingBottom: "64px" }}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-line" />
            {eyebrow}
          </div>
          <h1>{renderHeroTitle(title)}</h1>
          <p>{intro}</p>
          <div className="hero-actions">
            <Link className="button" href="/auth/join" prefetch={false}>
              Start for free
            </Link>
            <a className="text-link" href="#workflow">
              See Farm Workflow →
            </a>
          </div>
          <div className="hero-notes">
            <span>✓ Live Firestore sync</span>
            <span>✓ Multi-pond overview</span>
            <span>✓ Offline Android logging</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="pond-glass" style={{ position: "relative", bottom: "auto", left: "auto", right: "auto" }}>
            <div className="pond-glass-title">
              <span>
                <span className="status-dot" />
                {heroMock.badge}
              </span>
              <span>{heroMock.pill}</span>
            </div>
            <div className="pond-metrics">
              <div>
                <small>{heroMock.m1.label}</small>
                <strong>{heroMock.m1.value}</strong>
                <em>{heroMock.m1.unit}</em>
              </div>
              <div>
                <small>{heroMock.m2.label}</small>
                <strong>{heroMock.m2.value}</strong>
                <em>{heroMock.m2.unit}</em>
              </div>
            </div>
            <div className="pond-metrics" style={{ borderTop: "1px solid #e6eff4", paddingTop: "14px" }}>
              <div>
                <small>{heroMock.m3.label}</small>
                <strong style={{ fontSize: "26px" }}>{heroMock.m3.value}</strong>
                <em>{heroMock.m3.unit}</em>
              </div>
              <div>
                <small>{heroMock.m4.label}</small>
                <strong style={{ fontSize: "26px" }}>{heroMock.m4.value}</strong>
                <em>{heroMock.m4.unit}</em>
              </div>
            </div>
            <div className="glass-bottom">
              <span>{heroMock.footLeft}</span>
              <span>{heroMock.footRight}</span>
            </div>
          </div>

          <div className="orson-float" style={{ position: "relative", bottom: "auto", left: "auto", right: "auto", marginTop: "14px" }}>
            <div className="ai-icon">AI</div>
            <div>
              <strong>Orson Intelligence</strong>
              <small>{heroMock.orsonNote}</small>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Architecture Band */}
      <div className="foundation wrap">
        <span>Farm-Proven Architecture</span>
        <div>✓ Live Field Logs</div>
        <div>✓ Offline Mobile Sync</div>
        <div>✓ Role-Based Permissions</div>
        <div>✓ Multi-Pond Analytics</div>
      </div>

      {/* Problem & Solution */}
      {(problem || solution) ? (
        <section className="section wrap" style={{ paddingTop: "68px", paddingBottom: "68px" }}>
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-line" />
                OPERATIONAL REALITY
              </div>
              <h2>
                Precision Pond Management<br />
                <span>Without the Chaos</span>
              </h2>
            </div>
            <p className="section-intro">
              How standardizing {eyebrow.toLowerCase()} protects pond biomass, feed efficiency, and crop margins.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "28px" }}>
            {problem ? (
              <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "12px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#fef2f2", color: "#b91c1c", fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: "5px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
                  The Operational Challenge
                </div>
                <h3 style={{ fontSize: "21px", fontWeight: 650, color: "#092232", marginBottom: "12px" }}>
                  {problem.title || "Field Bottlenecks & Scattered Logs"}
                </h3>
                <p style={{ color: "#586f7e", fontSize: "15px", lineHeight: 1.8, margin: 0 }}>
                  {problem.body}
                </p>
              </div>
            ) : null}
            {solution ? (
              <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: 700, padding: "5px 12px", borderRadius: "5px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px" }}>
                  The Shrimply Solution
                </div>
                <h3 style={{ fontSize: "21px", fontWeight: 650, color: "#092232", marginBottom: "12px" }}>
                  {solution.title || "Connected Pond Records & Clear Signals"}
                </h3>
                <p style={{ color: "#586f7e", fontSize: "15px", lineHeight: 1.8, margin: 0 }}>
                  {solution.body}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Core Capabilities */}
      <section id="features" className="section wrap">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" />
              CORE CAPABILITIES
            </div>
            <h2>
              Engineered for Precision.<br />
              <span>Built for Farm Teams.</span>
            </h2>
          </div>
          <p className="section-intro">
            Real-time tools designed specifically for intensive and semi-intensive vannamei farm operations.
          </p>
        </div>
        <div className="capabilities" style={{ borderTop: "1px solid #e1ebf0", paddingTop: "40px" }}>
          {sections.map(section => (
            <article key={section.title} style={{ display: "flex", flexDirection: "column" }}>
              <h4>{section.title}</h4>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Farm Operational Workflow */}
      {workflow.length ? (
        <section id="workflow" className="section wrap workflow">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-line" />
                FARM WORKFLOW
              </div>
              <h2>
                How Teams Run This<br />
                <span>Day to Day</span>
              </h2>
            </div>
            <p className="section-intro">
              A repeatable operating cadence connecting technicians in the field with managers in the office.
            </p>
          </div>
          <div className="steps" style={{ gridTemplateColumns: `repeat(${Math.min(workflow.length, 3)}, 1fr)` }}>
            {workflow.map((step, idx) => (
              <article key={step.step}>
                <div className="step-top">
                  <span>0{idx + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className="step-tag">{step.step}</span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Orson AI Intelligence Section */}
      <section id="orson" className="orson-section">
        <div className="wrap orson-grid">
          <div className="orson-copy">
            <div className="eyebrow">AQUACULTURE INTELLIGENCE</div>
            <h2>
              Context before action.<br />
              <span>Powered by Orson AI.</span>
            </h2>
            <p>
              Orson connects your daily {eyebrow.toLowerCase()} records with water quality history, feeding trends, and sampling records to explain performance across every pond.
            </p>
            <Link className="button light" href="/orson">
              Explore Orson AI
            </Link>
            <div className="orson-footnote">
              ✓ Multi-day look-back analysis prevents knee-jerk feeding & treatment errors
            </div>
          </div>
          <div className="conversation">
            <div className="conversation-head">
              <div>
                <strong>Orson</strong>
                <small>Assistant • Real-Time Correlation</small>
              </div>
              <span className="example">Live Farm Prompt</span>
            </div>
            <div className="conversation-body">
              <div className="question">How is {eyebrow.toLowerCase()} trending in Pond A1?</div>
              <div className="answer">
                <span className="reply-label">Cross-referencing 5-day cycle logs</span>
                <p>{heroMock.orsonNote}</p>
                <div className="insight-pair">
                  <div>
                    <small>{heroMock.insightP1Label}</small>
                    <strong>{heroMock.insightP1Val} <span>{heroMock.insightP1Unit}</span></strong>
                  </div>
                  <div>
                    <small>{heroMock.insightP2Label}</small>
                    <strong>{heroMock.insightP2Val} <span>{heroMock.insightP2Unit}</span></strong>
                  </div>
                </div>
                <div className="next-check">
                  <span>
                    <strong>Recommended action:</strong> Maintain planned protocol. Continue recording feed tray response and environmental parameters twice daily.
                  </span>
                </div>
              </div>
              <div className="conversation-caption">Verified biological intelligence for farm decisions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience & Metrics */}
      {(audience.length || metrics.length) ? (
        <section className="section wrap">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "40px", borderTop: "1px solid #e1ebf0", paddingTop: "50px" }}>
            {audience.length ? (
              <div>
                <div className="eyebrow">
                  <span className="tiny-line" />
                  WHO IT IS FOR
                </div>
                <h3 style={{ fontSize: "24px", margin: "16px 0 20px", fontWeight: 600, color: "#092232" }}>
                  Built for every role on the farm
                </h3>
                <ul style={{ display: "grid", gap: "12px", paddingLeft: "18px", color: "#586f7e", fontSize: "15px", lineHeight: 1.7 }}>
                  {audience.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {metrics.length ? (
              <div>
                <div className="eyebrow">
                  <span className="tiny-line" />
                  CONNECTED METRICS
                </div>
                <h3 style={{ fontSize: "24px", margin: "16px 0 20px", fontWeight: 600, color: "#092232" }}>
                  Key Production Indicators
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {metrics.map(metric => (
                    <span key={metric} style={{ background: "#f0f6fa", border: "1px solid #dce8f0", padding: "8px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 650, color: "#0f4c75" }}>
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Checklist */}
      {checklist.length ? (
        <section className="section wrap">
          <div style={{ background: "#f3f8fc", border: "1px solid #dce8f0", borderRadius: "12px", padding: "40px 48px" }}>
            <div className="eyebrow">
              <span className="tiny-line" />
              OPERATIONAL CHECKLIST
            </div>
            <h2 style={{ fontSize: "32px", margin: "16px 0 24px", fontWeight: 600, letterSpacing: "-1px", color: "#092232" }}>
              What this software helps your farm control
            </h2>
            <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", paddingLeft: "20px", color: "#365f7c", fontSize: "15px", fontWeight: 500, lineHeight: 1.6 }}>
              {checklist.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FAQs */}
      {faqs.length ? (
        <section className="section wrap">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-line" />
                QUESTIONS & ANSWERS
              </div>
              <h2>
                Frequently Asked Questions<br />
                <span>About {eyebrow}</span>
              </h2>
            </div>
            <p className="section-intro">
              Practical answers for shrimp farm operators and production managers.
            </p>
          </div>
          <div style={{ display: "grid", gap: "16px", borderTop: "1px solid #e1ebf0", paddingTop: "24px" }}>
            {faqs.map(faq => (
              <article key={faq.question} style={{ padding: "16px 0", borderBottom: "1px solid #edf3f7" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 650, color: "#092232", marginBottom: "10px" }}>{faq.question}</h3>
                <p style={{ color: "#586f7e", fontSize: "15px", lineHeight: 1.8, margin: 0 }}>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Final Call to Action - matching main landing page */}
      <section className="final-cta wrap">
        <div>
          <div className="eyebrow">
            <span className="tiny-line" />
            EVERY CYCLE STARTS WITH A CLEARER VIEW
          </div>
          <h2>
            Your next harvest.<br />
            <span>Your bigger picture.</span>
          </h2>
          <p>Run your pond cycles with cleaner data, better feed conversion, and tighter operating control.</p>
        </div>
        <div className="final-actions">
          <Link className="button" href="/auth/join" prefetch={false}>
            Start for free
          </Link>
          <span>Mobile in the field. Web in the office.</span>
        </div>
      </section>

      {/* Related Shrimply Solutions */}
      <section className="section wrap" style={{ paddingTop: 0, paddingBottom: "70px" }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-line" />
              CONNECTED WORKFLOWS
            </div>
            <h2>
              Explore More Solutions<br />
              <span>Across Your Farm</span>
            </h2>
          </div>
          <p className="section-intro">
            Shrimply connects biological observations, inventory, water quality, and finance into one ecosystem.
          </p>
        </div>
        <div className="capabilities" style={{ borderTop: "none", paddingTop: 0, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {related.map(link => (
            <Link key={link.href} href={link.href} style={{ background: "#fff", border: "1px solid #e1ebf0", borderRadius: "10px", padding: "24px" }}>
              <h4>{link.label}</h4>
              <p>{link.description}</p>
              <span>Explore solution →</span>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
