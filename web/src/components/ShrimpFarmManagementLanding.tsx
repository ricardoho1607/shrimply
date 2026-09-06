import Link from "next/link";
import {
  Activity,
  BarChart3,
  Cpu,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  Maximize2,
  RefreshCcwDot,
  Scale,
  Settings,
  Shrimp,
  TrendingUp,
  Zap,
} from "lucide-react";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RevealOnScroll from "@/components/RevealOnScroll";

const workflowCards = [
  {
    label: "Pond command",
    title: "Cycle records in one place",
    body: "Track DOC, stocking, survival, biomass, harvests, mortality, and pond notes without splitting the cycle story across files.",
  },
  {
    label: "Feed control",
    title: "Feed, stock, and appetite",
    body: "Connect feed inventory, feeding activity, tray response, and FCR so managers can see how daily actions affect pond performance.",
  },
  {
    label: "Finance clarity",
    title: "Costs and reports",
    body: "Turn operating records into cash flow, COGS, profit and loss, projection, and shrimp performance reports that explain the numbers.",
  },
];

const operatingAreas = [
  "Pond setup and cycle tracking",
  "Sampling, MBW, ADG, FCR, and biomass",
  "Feed inventory and feeding logs",
  "Water quality and risk signals",
  "Harvests, finance, assets, and reports",
  "Role-based team workflows",
];

const proofPoints = [
  ["01", "Pond records", "Give owners and managers a shared view of active cycles, stocking, mortality, sampling, harvests, and pond status."],
  ["02", "Feed control", "Keep feed stock, feed use, appetite, and reorder context connected to each pond cycle."],
  ["03", "Risk context", "Review water quality, disease alerts, growth movement, and unusual patterns before they become expensive surprises."],
  ["04", "Reports", "Generate operational and finance reports that are useful for reviews, planning, and team accountability."],
];

export default function ShrimpFarmManagementLanding() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <Navbar />

      <section className="hero seo-hero">
        <div className="hero-left seo-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Shrimp Farm Management Software
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Run every pond cycle <em>with cleaner control.</em>
          </h1>
          <p className="animate-hero seo-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply brings ponds, feed, sampling, water quality, inventory, harvests, finance,
            disease alerts, and reporting into one aquaculture operating system.
          </p>
          <div className="animate-hero mobile-cta-row seo-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Start for free</Link>
            <Link href="/how-it-works" className="btn-outline">See How It Works</Link>
          </div>
        </div>

        <div className="hero-right seo-hero-visual">
          <div className="hero-glow" />
          <div className="seo-dashboard app-mockup">
            <div className="app-title-bar">
              <div className="app-dot red" />
              <div className="app-dot yel" />
              <div className="app-dot grn" />
              <div className="app-url">shrimplytech.com/dashboard/ponds</div>
            </div>
            <div className="db-layout">
              <div className="db-sidebar">
                <div className="sb-icon active"><LayoutGrid size={14} /></div>
                <div className="sb-icon"><Activity size={14} /></div>
                <div className="sb-icon"><Home size={14} /></div>
                <div className="sb-icon"><Settings size={14} /></div>
              </div>
              <div className="db-main seo-db-main">
                <div className="seo-db-header">
                  <div>
                    <span>Farm overview</span>
                    <strong>North Block</strong>
                  </div>
                  <div className="seo-status-pill">Live sync</div>
                </div>

                <div className="seo-metric-row">
                  <div className="seo-metric">
                    <span>Active ponds</span>
                    <strong>12</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Feed stock</span>
                    <strong>8.4t</strong>
                  </div>
                  <div className="seo-metric">
                    <span>Reports ready</span>
                    <strong>5</strong>
                  </div>
                </div>

                <div className="app-pond-card seo-pond-card">
                  <div className="app-pond-header">
                    <div className="app-pond-name">Pond A1</div>
                    <div className="app-doc-badge" style={{ background: "#1e6fa8" }}>DOC 45</div>
                  </div>
                  <div className="app-pond-details">
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Scale size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Biomass</span>
                          <span className="val">1,240 kg</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Shrimp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Population</span>
                          <span className="val">85,200</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <Heart size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Survival</span>
                          <span className="val">92.4%</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <Maximize2 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">Size</span>
                          <span className="val">54 pcs/kg</span>
                        </div>
                      </div>
                    </div>
                    <div className="app-pond-row">
                      <div className="app-pond-item">
                        <TrendingUp size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">ADG</span>
                          <span className="val">0.24 g/day</span>
                        </div>
                      </div>
                      <div className="app-pond-item">
                        <BarChart3 size={14} className="icon" />
                        <div className="col">
                          <span className="lbl">FCR</span>
                          <span className="val">1.32</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="seo-alert-card">
                  <div>
                    <span>Orson note</span>
                    <strong>Feed pressure is rising faster than biomass. Review tray clearance before increasing tomorrow&apos;s ration.</strong>
                  </div>
                  <Zap size={18} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        {proofPoints.map(([number, label, description], index) => (
          <div className={`stat-box r d${index + 1}`} key={label}>
            <div className="stat-num">{number}</div>
            <div className="stat-lbl">{label}</div>
            <div className="stat-desc" style={{ fontWeight: 500 }}>{description}</div>
          </div>
        ))}
      </section>

      <section className="section seo-workflows">
        <div className="container">
          <div className="seo-section-heading">
            <div className="eyebrow r d1">Farm OS</div>
            <h2 className="section-title r d2">
              Replace scattered records with one <em>operating view.</em>
            </h2>
          </div>
          <div className="features-grid seo-feature-grid">
            {workflowCards.map((card, index) => (
              <article className={`feature-card r d${index + 1}`} key={card.title}>
                <div className="seo-card-label">{card.label}</div>
                <h3 className="feature-title" style={{ marginBottom: "16px" }}>{card.title}</h3>
                <p style={{ fontWeight: 500 }}>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="highlight seo-platform-section">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
              Built for shrimp operations
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              The daily work stays practical. <em>The data gets stronger.</em>
            </h2>
            <p className="seo-dark-copy">
              Shrimply keeps the field workflow simple while giving owners and managers a cleaner view of
              production, biological performance, costs, and reporting readiness.
            </p>
            <div className="seo-check-grid">
              {operatingAreas.map(item => (
                <div className="seo-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/resources" className="btn-primary seo-dark-button">Explore Resources</Link>
          </div>

          <div className="r d3 seo-ops-panel">
            <div className="seo-ops-header">
              <div>
                <span>Management layer</span>
                <strong>What Shrimply connects</strong>
              </div>
              <Cpu size={22} />
            </div>
            <div className="seo-ops-list">
              <div>
                <Layers size={18} />
                <span>Mobile field logs sync into the web dashboard.</span>
              </div>
              <div>
                <Activity size={18} />
                <span>Sampling and water quality history support better growth reviews.</span>
              </div>
              <div>
                <RefreshCcwDot size={18} />
                <span>Inventory, harvests, and finance reports stay tied to farm operations.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section seo-faq-section">
        <div className="container mobile-stack-grid seo-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Questions</div>
            <h2 className="section-title">
              Built for farm teams, <em>not generic spreadsheets.</em>
            </h2>
          </div>
          <div className="seo-faq-list r d2">
            <details open>
              <summary>What does Shrimply manage?</summary>
              <p>Ponds, stocking, sampling, water quality, feeding, feed inventory, harvests, assets, finance reports, disease alerts, company setup, roles, and Orson AI insights.</p>
            </details>
            <details>
              <summary>Is this only for record keeping?</summary>
              <p>No. The platform is designed to help teams interpret production records, review pond performance, prepare reports, and spot operational risks earlier.</p>
            </details>
            <details>
              <summary>Does it support mobile and web workflows?</summary>
              <p>Yes. Field teams can log farm activity on mobile, while managers use the web dashboard for review, analysis, reporting, and company-level visibility.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section seo-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Give every pond cycle a cleaner <em>management system.</em>
          </h2>
          <p>
            Start with the daily records your farm already needs, then build better visibility across
            production, inventory, finance, reporting, and biological risk.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Start for free</Link>
            <Link href="/vannamei-shrimp-farming-app" className="btn-outline">Vannamei App</Link>
          </div>
        </div>
      </section>

      <Footer />

    </main>
  );
}
