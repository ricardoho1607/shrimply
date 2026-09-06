import Link from "next/link";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  Droplets,
  Heart,
  Home,
  LayoutGrid,
  Scale,
  Settings,
  TrendingUp,
  Zap,
} from "lucide-react";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import RevealOnScroll from "@/components/RevealOnScroll";

const cycleStats = [
  ["01", "DOC clarity", "Keep stocking date, pond age, sampling, mortality, and harvest context connected across the crop cycle."],
  ["02", "Growth signals", "Review MBW, ADG, FCR, survival, and biomass movement without rebuilding the numbers manually."],
  ["03", "Daily checks", "Capture feed, water quality, mortality, and pond notes from the field before records get lost."],
  ["04", "Manager view", "Give managers a cleaner web dashboard for pond review, reports, finance, and follow-up decisions."],
];

const workflowCards = [
  {
    label: "Field logging",
    title: "Fast entries from the pond edge",
    body: "Technicians can record vannamei pond activity from mobile, including sampling, mortality, feed, water quality, and daily notes.",
  },
  {
    label: "Cycle review",
    title: "Crop-cycle context for managers",
    body: "Owners and managers can compare DOC, MBW, ADG, FCR, feed movement, survival, and harvest readiness from the web dashboard.",
  },
  {
    label: "Decision support",
    title: "Better signals before the harvest",
    body: "Shrimply connects growth, appetite, water quality, and risk records so farms can see what changed and where to investigate.",
  },
];

const appCoverage = [
  "Stocking, DOC, pond status, and crop-cycle records",
  "Sampling, MBW, ADG, FCR, survival, and biomass",
  "Feed activity, appetite context, and feed inventory",
  "Water quality logs and recent trend review",
  "Mortality, harvest planning, and production reports",
  "Mobile field work with web dashboard review",
];

export default function VannameiShrimpFarmingLanding() {
  return (
    <main>
      <RevealOnScroll />
      <Cursor />
      <Navbar />

      <section className="hero van-hero">
        <div className="hero-left van-hero-copy">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.3s" }}>
            Vannamei Shrimp Farming App
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.52s", margin: "24px 0" }}>
            Capture every vannamei cycle <em>from pond to report.</em>
          </h1>
          <p className="animate-hero van-hero-intro" style={{ animationDelay: "0.76s" }}>
            Shrimply helps vannamei farms log field activity, track growth, monitor feed and water
            quality, review pond performance, and prepare reports from one mobile and web platform.
          </p>
          <div className="animate-hero mobile-cta-row van-hero-actions" style={{ animationDelay: "0.98s" }}>
            <Link href="/auth/join" prefetch={false} className="btn-primary">Start for free</Link>
            <Link href="/shrimp-farm-management-software" className="btn-outline">Farm Software</Link>
          </div>
        </div>

        <div className="hero-right van-hero-visual">
          <div className="hero-glow" />
          <div className="van-device-stage">
            <div className="van-web-panel">
              <div className="app-title-bar">
                <div className="app-dot red" />
                <div className="app-dot yel" />
                <div className="app-dot grn" />
                <div className="app-url">shrimplytech.com/dashboard</div>
              </div>
              <div className="van-web-body">
                <div className="db-sidebar van-sidebar">
                  <div className="sb-icon active"><LayoutGrid size={14} /></div>
                  <div className="sb-icon"><Activity size={14} /></div>
                  <div className="sb-icon"><Home size={14} /></div>
                  <div className="sb-icon"><Settings size={14} /></div>
                </div>
                <div className="van-web-main">
                  <div className="van-web-header">
                    <div>
                      <span>Crop cycle</span>
                      <strong>Vannamei Block A</strong>
                    </div>
                    <div className="van-sync-pill">Synced</div>
                  </div>
                  <div className="van-metric-grid">
                    <div>
                      <span>DOC</span>
                      <strong>45</strong>
                    </div>
                    <div>
                      <span>MBW</span>
                      <strong>18.5g</strong>
                    </div>
                    <div>
                      <span>FCR</span>
                      <strong>1.32</strong>
                    </div>
                  </div>
                  <div className="van-growth-card">
                    <div className="van-card-title">
                      <TrendingUp size={15} />
                      Growth trend
                    </div>
                    <div className="van-bars">
                      <span style={{ height: "38%" }} />
                      <span style={{ height: "48%" }} />
                      <span style={{ height: "62%" }} />
                      <span style={{ height: "70%" }} />
                      <span style={{ height: "84%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="van-phone">
              <div className="van-phone-speaker" />
              <div className="van-phone-screen">
                <div className="van-phone-top">
                  <span>Today</span>
                  <strong>Pond A1</strong>
                </div>
                <div className="van-phone-card active">
                  <div>
                    <ClipboardList size={17} />
                    <span>Sampling</span>
                  </div>
                  <strong>MBW 18.5g</strong>
                </div>
                <div className="van-phone-grid">
                  <div>
                    <Scale size={15} />
                    <span>Biomass</span>
                    <strong>1.24t</strong>
                  </div>
                  <div>
                    <Heart size={15} />
                    <span>Survival</span>
                    <strong>92%</strong>
                  </div>
                </div>
                <div className="van-phone-card">
                  <div>
                    <Droplets size={17} />
                    <span>Water quality</span>
                  </div>
                  <strong>Stable</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        {cycleStats.map(([number, label, description], index) => (
          <div className={`stat-box r d${index + 1}`} key={label}>
            <div className="stat-num">{number}</div>
            <div className="stat-lbl">{label}</div>
            <div className="stat-desc" style={{ fontWeight: 500 }}>{description}</div>
          </div>
        ))}
      </section>

      <section className="section van-workflows">
        <div className="container">
          <div className="van-section-heading">
            <div className="eyebrow r d1">Vannamei workflow</div>
            <h2 className="section-title r d2">
              Built around the records that shape <em>crop decisions.</em>
            </h2>
          </div>
          <div className="features-grid van-feature-grid">
            {workflowCards.map((card, index) => (
              <article className={`feature-card r d${index + 1}`} key={card.title}>
                <div className="van-card-label">{card.label}</div>
                <h3 className="feature-title" style={{ marginBottom: "16px" }}>{card.title}</h3>
                <p style={{ fontWeight: 500 }}>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="highlight van-dark-section">
        <div className="highlight-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
              Mobile plus web
            </div>
            <h2 className="section-title" style={{ color: "var(--white)", marginBottom: "24px" }}>
              Field teams log faster. <em>Managers review better.</em>
            </h2>
            <p className="van-dark-copy">
              Vannamei farms need daily records that stay useful after the pond check is done.
              Shrimply keeps the mobile workflow simple while preserving the context managers need
              for growth review, feed decisions, and reporting.
            </p>
            <div className="van-check-grid">
              {appCoverage.map(item => (
                <div className="van-check" key={item}>
                  <span />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/how-it-works" className="btn-primary van-dark-button">See the Platform</Link>
          </div>

          <div className="r d3 van-analysis-panel">
            <div className="van-analysis-header">
              <div>
                <span>Orson review</span>
                <strong>Growth variation context</strong>
              </div>
              <Zap size={22} />
            </div>
            <div className="van-analysis-list">
              <div>
                <BarChart3 size={18} />
                <span>Latest MBW improved, but ADG slowed compared with the previous sampling.</span>
              </div>
              <div>
                <Droplets size={18} />
                <span>Morning dissolved oxygen dipped twice since the last sampling window.</span>
              </div>
              <div>
                <Database size={18} />
                <span>Review feed tray clearance before increasing the next ration schedule.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section van-faq-section">
        <div className="container mobile-stack-grid van-faq-grid">
          <div className="r d1">
            <div className="eyebrow" style={{ marginBottom: "16px" }}>Questions</div>
            <h2 className="section-title">
              A practical app for <em>vannamei farm teams.</em>
            </h2>
          </div>
          <div className="van-faq-list r d2">
            <details open>
              <summary>What does the app track for vannamei farms?</summary>
              <p>Shrimply tracks pond setup, DOC, stocking, sampling, MBW, ADG, FCR, mortality, feeding, feed inventory, water quality, harvests, finance reports, and disease-risk records.</p>
            </details>
            <details>
              <summary>Can field teams log data on mobile?</summary>
              <p>Yes. Field teams can use the mobile app for daily pond activity while managers review the same farm records from the web dashboard.</p>
            </details>
            <details>
              <summary>How does Shrimply help with operational decisions?</summary>
              <p>It connects recent sampling, feed, water quality, mortality, and harvest records so teams can review growth movement, appetite changes, and operational risks with better context.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="section van-final-cta">
        <div className="container r d1">
          <div className="eyebrow" style={{ marginBottom: "16px" }}>Shrimply</div>
          <h2 className="section-title">
            Give vannamei production a cleaner <em>daily workflow.</em>
          </h2>
          <p>
            Capture the records that matter in the field, then use them for growth review, feed
            control, reporting, and better cycle visibility.
          </p>
          <div className="mobile-cta-row">
            <Link href="/auth/join" prefetch={false} className="btn-primary">Start for free</Link>
            <Link href="/resources" className="btn-outline">Education Hub</Link>
          </div>
        </div>
      </section>

      <Footer />

    </main>
  );
}
