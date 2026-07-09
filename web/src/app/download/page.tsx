import Link from "next/link";
import { AlertCircle, CheckCircle2, Smartphone, UsersRound, type LucideIcon } from "lucide-react";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { canonicalUrl, coreSeoPages, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import DownloadRequestForm from "./DownloadRequestForm";

const page = coreSeoPages.find(item => item.path === "/download");

export const metadata = seoMetadata(page!);

const downloadPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: page!.title,
  description: page!.description,
  url: canonicalUrl("/download"),
  isPartOf: {
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/"),
  },
  about: [
    "Shrimply Android app",
    "Android closed testing",
    "Shrimp farm management app",
    "Vannamei shrimp farming app",
  ],
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Shrimply Android App",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Android",
  description: "Shrimply is currently available on Android through a closed testing track for shrimp farms and aquaculture teams.",
  url: canonicalUrl("/download"),
  isPartOf: {
    "@type": "SoftwareApplication",
    name: SITE_CONFIG.name,
    url: canonicalUrl("/shrimp-farm-management-software"),
  },
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/LimitedAvailability",
  },
};

export default function DownloadPage() {
  return (
    <main>
      <Cursor />
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(downloadPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />

      <section className="section" style={{ minHeight: "82vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(360px, 0.75fr)", gap: "56px", alignItems: "center" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: "20px" }}>Android Closed Testing</div>
              <h1 style={{ maxWidth: "900px", marginBottom: "28px" }}>
                Request access to the Shrimply Android app.
              </h1>
              <p style={{ maxWidth: "720px", fontSize: "1.08rem", fontWeight: 500, color: "var(--ocean)", marginBottom: "32px" }}>
                Shrimply is not publicly available in the app stores yet. Right now, the mobile app is available only for approved Android closed testers.
              </p>
              <div style={{ display: "grid", gap: "14px", maxWidth: "680px" }}>
                <StatusLine icon={Smartphone} title="Android only for now" body="The current closed-testing build is available for Android users. iOS access is not open yet." />
                <StatusLine icon={UsersRound} title="Closed tester approval required" body="Submit the request form and we will review whether your farm or team is a good fit for the current testing track." />
                <StatusLine icon={AlertCircle} title="Not a public production release" body="Use the closed test for early feedback, workflow validation, and Android compatibility checks." />
              </div>
              <div className="mobile-cta-row" style={{ display: "flex", gap: "16px", marginTop: "36px", flexWrap: "wrap" }}>
                <Link href="/vannamei-shrimp-farming-app" className="btn-outline">View App Features</Link>
                <Link href="/resources" className="btn-outline">Read Resources</Link>
              </div>
            </div>

            <div style={{ background: "var(--white)", border: "1px solid var(--slate)", borderRadius: "16px", padding: "28px", boxShadow: "0 20px 60px rgba(13, 33, 55, 0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", color: "var(--blue)", fontWeight: 800 }}>
                <CheckCircle2 size={20} />
                Tester request
              </div>
              <h2 className="feature-title" style={{ fontSize: "1.7rem", marginBottom: "10px" }}>Join the Android test list</h2>
              <p style={{ color: "var(--ocean)", fontWeight: 500, marginBottom: "24px" }}>
                Send your details so the Shrimply team can review your request and follow up with Android closed-testing instructions.
              </p>
              <DownloadRequestForm />
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)", paddingTop: "80px", paddingBottom: "80px" }}>
        <div className="container" style={{ maxWidth: "980px" }}>
          <div className="eyebrow" style={{ marginBottom: "18px" }}>Before You Request</div>
          <h2 className="section-title" style={{ fontSize: "clamp(2.1rem, 3vw, 3.2rem)", marginBottom: "26px" }}>
            What closed testers should expect.
          </h2>
          <div className="features-grid">
            <article className="feature-card">
              <h3 className="feature-title" style={{ marginBottom: "12px" }}>Android device required</h3>
              <p style={{ fontWeight: 500 }}>Closed testing is currently limited to Android. Please use the same Google account email you want added to the testing track.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title" style={{ marginBottom: "12px" }}>Early testing feedback</h3>
              <p style={{ fontWeight: 500 }}>The goal is to validate farm workflows, device compatibility, and daily field usage before wider release.</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title" style={{ marginBottom: "12px" }}>Manual approval</h3>
              <p style={{ fontWeight: 500 }}>Requests are reviewed before access is granted. Submitting the form does not automatically add you to the test.</p>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function StatusLine({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: "14px", alignItems: "start", padding: "16px", background: "var(--white)", border: "1px solid var(--slate)", borderRadius: "14px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--accent)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} />
      </div>
      <div>
        <h2 className="feature-title" style={{ fontSize: "1.06rem", marginBottom: "6px" }}>{title}</h2>
        <p style={{ color: "var(--ocean)", fontWeight: 500 }}>{body}</p>
      </div>
    </div>
  );
}
