import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { canonicalUrl, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { getResourceArticle, resourceArticles } from "@/data/resourceLibrary";

type ResourcePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return resourceArticles.map(article => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    return {};
  }

  const metadata = seoMetadata({
    path: `/resources/${article.slug}`,
    title: `${article.title} | Shrimply Resources`,
    description: article.description,
  });

  if (!article.image) {
    return metadata;
  }

  const imageUrl = `${SITE_CONFIG.url}${article.image.src}`;

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: article.image.width,
          height: article.image.height,
          alt: article.image.alt,
        },
      ],
    },
    twitter: {
      ...metadata.twitter,
      images: [imageUrl],
    },
  };
}

export default async function ResourceArticlePage({ params }: ResourcePageProps) {
  const { slug } = await params;
  const article = getResourceArticle(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = resourceArticles
    .filter(item => item.section === article.section && item.slug !== article.slug)
    .slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: canonicalUrl(`/resources/${article.slug}`),
    author: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
      },
    },
    mainEntityOfPage: canonicalUrl(`/resources/${article.slug}`),
    about: [article.section, "Shrimp farming", "Vannamei shrimp farming", "Aquaculture management"],
    keywords: article.tags,
    datePublished: article.publishedAt,
    image: article.image ? `${SITE_CONFIG.url}${article.image.src}` : undefined,
  };

  return (
    <main>
      <Cursor />
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article style={{ background: "var(--off-white)" }}>
        <header className="section" style={{ paddingBottom: "72px", minHeight: "72vh", display: "flex", alignItems: "center" }}>
          <div className="container" style={{ maxWidth: "1040px" }}>
            <Link href="/resources" className="eyebrow" style={{ display: "inline-block", marginBottom: "24px" }}>
              Shrimply Resources / {article.label}
            </Link>
            <h1 style={{ maxWidth: "980px", fontSize: "clamp(3rem, 5vw, 5.8rem)", lineHeight: 0.98, marginBottom: "30px" }}>
              {article.title}
            </h1>
            <p style={{ maxWidth: "760px", fontSize: "1.12rem", fontWeight: 500, color: "var(--ocean)" }}>
              {article.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "34px", alignItems: "center" }}>
              <span className="eyebrow" style={{ color: "var(--blue)" }}>{article.readTime}</span>
              <span style={{ color: "var(--fog)" }}>/</span>
              <span className="eyebrow" style={{ color: "var(--blue)" }}>Farm management guide</span>
            </div>
            {article.image ? (
              <img
                src={article.image.src}
                alt={article.image.alt}
                width={article.image.width}
                height={article.image.height}
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  height: "auto",
                  objectFit: "cover",
                  border: "1px solid var(--slate)",
                  borderRadius: "18px",
                  marginTop: "48px",
                  boxShadow: "0 24px 64px rgba(13, 33, 55, 0.10)",
                }}
              />
            ) : null}
          </div>
        </header>

        <section className="section" style={{ paddingTop: "72px", background: "var(--white)" }}>
          <div className="container" style={{ maxWidth: "1120px" }}>
            <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "0.34fr 0.66fr", gap: "72px", alignItems: "start" }}>
              <aside style={{ position: "sticky", top: "110px" }}>
                <div style={{ background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "16px", padding: "28px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Key Takeaways</div>
                  <ul style={{ display: "grid", gap: "14px", listStyle: "none" }}>
                    {article.takeaways.map(takeaway => (
                      <li key={takeaway} style={{ color: "var(--ocean)", fontWeight: 500 }}>
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div>
                <div style={{ display: "grid", gap: "54px" }}>
                  {article.sections.map(section => (
                    <section key={section.heading}>
                      <h2 className="section-title" style={{ fontSize: "clamp(2rem, 3vw, 3rem)", marginBottom: "24px" }}>
                        {section.heading}
                      </h2>
                      <div style={{ display: "grid", gap: "20px" }}>
                        {section.body.map(paragraph => (
                          <p key={paragraph} style={{ fontSize: "1.04rem", color: "var(--ocean)", fontWeight: 500 }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <section style={{ marginTop: "72px", background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "18px", padding: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Farmer Checklist</div>
                  <h2 className="feature-title" style={{ fontSize: "1.7rem", marginBottom: "20px" }}>
                    What to apply on the farm
                  </h2>
                  <ul style={{ display: "grid", gap: "14px", paddingLeft: "20px" }}>
                    {article.checklist.map(item => (
                      <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section style={{ marginTop: "56px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Sources and Further Reading</div>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {article.sources.map(source => (
                      <a
                        href={source.url}
                        key={source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "block",
                          borderTop: "1px solid var(--slate)",
                          padding: "18px 0",
                        }}
                      >
                        <span style={{ display: "block", color: "var(--ink)", fontWeight: 700 }}>{source.title}</span>
                        <span className="eyebrow" style={{ display: "block", marginTop: "6px" }}>{source.publisher}</span>
                      </a>
                    ))}
                  </div>
                </section>

                <section style={{ marginTop: "64px", borderTop: "1px solid var(--slate)", paddingTop: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Related Topics</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                    {relatedArticles.map(related => (
                      <Link
                        href={`/resources/${related.slug}`}
                        key={related.slug}
                        style={{ background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "14px", padding: "22px" }}
                      >
                        <h3 className="feature-title" style={{ fontSize: "1.18rem", marginBottom: "10px" }}>{related.title}</h3>
                        <p style={{ fontWeight: 500 }}>{related.description}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </article>

      <Footer />
    </main>
  );
}
