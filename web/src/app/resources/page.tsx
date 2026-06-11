import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResourcesHub from "@/components/ResourcesHub";
import { coreSeoPages, seoMetadata } from "@/config/seo";
import { resourceArticles } from "@/data/resourceLibrary";

const page = coreSeoPages.find(item => item.path === "/resources");

export const metadata = seoMetadata(page!);

export default function ResourcesPage() {
  return (
    <main>
      <Cursor />
      <Navbar />

      <section className="section" style={{ minHeight: "78vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
        <div className="container">
          <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
            Shrimply Resources
          </div>
          <h1 className="animate-hero" style={{ animationDelay: "0.4s", maxWidth: "1000px", marginBottom: "32px" }}>
            Shrimp farming knowledge hub and <em>resource library.</em>
          </h1>
          <p className="animate-hero" style={{ animationDelay: "0.6s", maxWidth: "760px", fontSize: "1.08rem", fontWeight: 500 }}>
            Practical vannamei farming guides for feed control, water quality, growth sampling, disease risk, harvest planning, and farm finance.
          </p>
        </div>
      </section>

      <ResourcesHub articles={resourceArticles} />

      <Footer />
    </main>
  );
}
