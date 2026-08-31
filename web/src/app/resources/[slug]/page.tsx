import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cursor from "@/components/Cursor";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StockingDensityCalculator from "@/components/StockingDensityCalculator";
import ShrimpFeedCalculator from "@/components/ShrimpFeedCalculator";
import { canonicalUrl, seoMetadata } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { getResourceArticle, resourceArticles } from "@/data/resourceLibrary";

type ResourcePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const stripSubtitle = (title: string) => title.split(":")[0];

const relatedFeatureLabels: Record<string, string> = {
  "/shrimp-farm-management-software": "Shrimp farm management software",
  "/vannamei-shrimp-farming-app": "Vannamei shrimp farming app",
  "/features/feed-inventory": "Shrimp feed inventory tracking",
  "/features/water-quality-monitoring": "Shrimp pond water quality monitoring",
  "/features/growth-sampling": "Shrimp growth sampling and MBW tracking",
  "/features/shrimp-harvest-tracking": "Shrimp harvest tracking software",
  "/features/shrimp-farm-finance": "Shrimp farm finance tracking",
  "/features/disease-alerts": "Shrimp disease alerts and biosecurity",
  "/resources": "Shrimp farming resources library",
};

const buildArticleFaqs = (article: NonNullable<ReturnType<typeof getResourceArticle>>) => {
  if (article.faqs?.length) {
    return article.faqs;
  }

  const topic = stripSubtitle(article.title).toLowerCase();
  const primaryTag = article.tags?.[0] ?? article.section.toLowerCase();
  const firstSection = article.sections[0];

  return [
    {
      question: `What is ${topic}?`,
      answer: firstSection
        ? `${firstSection.body[0]} ${article.takeaways[0]}`
        : article.description,
    },
    {
      question: `Why does ${primaryTag} matter for shrimp farmers?`,
      answer: article.takeaways.join(" "),
    },
    {
      question: `What should farmers review when managing ${primaryTag}?`,
      answer: article.checklist.join(" "),
    },
  ];
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
  const primaryRelatedLabel = relatedFeatureLabels[article.relatedFeature.href] ?? article.relatedFeature.label;
  const relatedInternalLinks = [
    {
      href: article.relatedFeature.href,
      label: primaryRelatedLabel,
      description: article.relatedFeature.href === "/resources"
        ? "Browse more Shrimply guides for feed, water quality, growth, disease, harvest, and finance workflows."
        : `Explore how ${primaryRelatedLabel.toLowerCase()} connects with this farm guide in Shrimply.`,
    },
    ...relatedArticles.map(related => ({
      href: `/resources/${related.slug}`,
      label: related.title,
      description: related.description,
    })),
  ];
  if (!relatedInternalLinks.some(link => link.href === "/resources")) {
    relatedInternalLinks.push({
      href: "/resources",
      label: "Shrimp farming resources library",
      description: "Browse more practical Shrimply guides for vannamei farm operations and management.",
    });
  }
  const faqs = buildArticleFaqs(article);

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
    relatedLink: relatedInternalLinks.map(link => canonicalUrl(link.href)),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    image: article.image ? `${SITE_CONFIG.url}${article.image.src}` : undefined,
  };
  const faqJsonLd = {
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
        name: "Resources",
        item: canonicalUrl("/resources"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl(`/resources/${article.slug}`),
      },
    ],
  };
  const relatedPagesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Related Shrimply pages for ${article.title}`,
    itemListElement: relatedInternalLinks.map((link, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: link.label,
      description: link.description,
      url: canonicalUrl(link.href),
    })),
  };

  const webAppJsonLd = article.slug === "vannamei-stocking-density" ? {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Vannamei Shrimp Stocking Density & Biomass Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    url: canonicalUrl(`/resources/${article.slug}#calculator`),
    description: "Free interactive aquaculture calculator for shrimp farmers to calculate PL stocking counts, expected harvest biomass, aeration horsepower, and carrying capacity.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  } : article.slug === "vannamei-feeding-rate" ? {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Vannamei Shrimp Feed Calculator & Feeding Rate Table",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    url: canonicalUrl(`/resources/${article.slug}#calculator`),
    description: "Free interactive aquaculture calculator to estimate Pacific white shrimp daily feed rations, per-meal distribution, and feed tray allocations from biomass and body weight.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  } : null;

  return (
    <main>
      <Cursor />
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(relatedPagesJsonLd) }}
      />
      {webAppJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
      ) : null}

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
            {article.slug === "vannamei-stocking-density" ? (
              <div style={{ marginTop: "28px" }}>
                <a
                  href="#calculator"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "rgba(187, 225, 250, 0.28)",
                    color: "var(--navy)",
                    padding: "12px 22px",
                    border: "1px solid rgba(50, 130, 184, 0.35)",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    textDecoration: "none",
                  }}
                >
                  Open Stocking Calculator
                </a>
              </div>
            ) : article.slug === "vannamei-feeding-rate" ? (
              <div style={{ marginTop: "28px" }}>
                <a
                  href="#calculator"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "rgba(187, 225, 250, 0.28)",
                    color: "var(--navy)",
                    padding: "12px 22px",
                    border: "1px solid rgba(50, 130, 184, 0.35)",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    textDecoration: "none",
                  }}
                >
                  Open Shrimp Feed Calculator
                </a>
              </div>
            ) : null}
            {article.image ? (
              <Image
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
            <div className="mobile-stack-grid resource-article-layout" style={{ display: "grid", gridTemplateColumns: "0.34fr 0.66fr", gap: "72px", alignItems: "start" }}>
              <aside className="resource-article-takeaways" style={{ position: "sticky", top: "110px" }}>
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

              <div className="resource-article-content">
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
                        {section.items ? (
                          section.ordered ? (
                            <ol style={{ display: "grid", gap: "14px", paddingLeft: "24px" }}>
                              {section.items.map(item => (
                                <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{item}</li>
                              ))}
                            </ol>
                          ) : (
                            <ul style={{ display: "grid", gap: "14px", paddingLeft: "22px" }}>
                              {section.items.map(item => (
                                <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{item}</li>
                              ))}
                            </ul>
                          )
                        ) : null}
                        {section.table ? (
                          <div className="resource-table-frame">
                            <p className="resource-table-scroll-hint">Scroll sideways to see all columns.</p>
                            <div
                              className="resource-table-scroll"
                              role="region"
                              tabIndex={0}
                              aria-label={`${section.heading} table, scroll horizontally to see all columns`}
                            >
                              <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", background: "var(--white)" }}>
                                <thead>
                                  <tr style={{ background: "var(--off-white)" }}>
                                    {section.table.columns.map(column => (
                                      <th
                                        key={column}
                                        scope="col"
                                        style={{ padding: "15px", textAlign: "left", color: "var(--ink)", fontSize: "0.78rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--slate)" }}
                                      >
                                        {column}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.table.rows.map((row, rowIndex) => (
                                    <tr key={`${section.heading}-${row[0]}-${rowIndex}`}>
                                      {row.map((cell, cellIndex) => (
                                        <td
                                          key={`${cell}-${cellIndex}`}
                                          style={{ padding: "15px", verticalAlign: "top", color: "var(--ocean)", fontSize: "0.9rem", fontWeight: cellIndex === 0 ? 700 : 500, borderBottom: rowIndex === section.table!.rows.length - 1 ? undefined : "1px solid var(--slate)" }}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                        {section.note ? (
                          <aside style={{ borderLeft: "4px solid var(--sky)", background: "var(--off-white)", borderRadius: "0 12px 12px 0", padding: "18px 20px", color: "var(--ocean)", fontWeight: 600 }}>
                            <strong style={{ color: "var(--ink)" }}>Avoid: </strong>{section.note}
                          </aside>
                        ) : null}
                        {section.heading.toLowerCase().includes("calculator") ? (
                          <div id="calculator" style={{ marginTop: "16px", scrollMarginTop: "100px" }}>
                            {article.slug === "vannamei-feeding-rate" ? (
                              <ShrimpFeedCalculator />
                            ) : (
                              <StockingDensityCalculator />
                            )}
                          </div>
                        ) : null}
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
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Common Questions</div>
                  <div style={{ display: "grid", gap: "18px" }}>
                    {faqs.map(faq => (
                      <div key={faq.question} style={{ borderTop: "1px solid var(--slate)", paddingTop: "18px" }}>
                        <h2 className="feature-title" style={{ fontSize: "1.25rem", marginBottom: "10px" }}>
                          {faq.question}
                        </h2>
                        <p style={{ color: "var(--ocean)", fontWeight: 500 }}>{faq.answer}</p>
                      </div>
                    ))}
                  </div>
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
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Related Shrimply Pages</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
                    {relatedInternalLinks.map(related => (
                      <Link
                        href={related.href}
                        key={related.href}
                        style={{ background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "14px", padding: "22px" }}
                      >
                        <h3 className="feature-title" style={{ fontSize: "1.18rem", marginBottom: "10px" }}>{related.label}</h3>
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
