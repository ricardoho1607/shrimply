import "@/app/globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cursor from "@/components/Cursor";
import FooterID from "@/components/FooterID";
import NavbarID from "@/components/NavbarID";
import StockingDensityCalculator from "@/components/StockingDensityCalculator";
import ShrimpFeedCalculator from "@/components/ShrimpFeedCalculator";
import { canonicalUrl, seoMetadataID } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { getResourceArticleID, resourceArticlesID } from "@/data/resourceLibraryID";

type ResourcePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const stripSubtitle = (title: string) => title.split(":")[0];

const renderInlineLinks = (text: string): React.ReactNode => {
  if (!text.includes("[") || !text.includes("](") || !text.includes(")")) {
    return text;
  }

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, href] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    const isExternal = href.startsWith("http://") || href.startsWith("https://");
    if (isExternal) {
      parts.push(
        <a
          key={`${href}-${matchIndex}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "underline" }}
        >
          {linkText}
        </a>
      );
    } else {
      parts.push(
        <Link
          key={`${href}-${matchIndex}`}
          href={href}
          style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "underline" }}
        >
          {linkText}
        </Link>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

const relatedFeatureLabelsID: Record<string, string> = {
  "/id/shrimp-farm-management-software": "Software manajemen tambak udang",
  "/id/vannamei-shrimp-farming-app": "Aplikasi budidaya udang vannamei",
  "/id/features/feed-inventory": "Pelacakan inventaris pakan udang",
  "/id/features/water-quality-monitoring": "Monitoring kualitas air kolam udang",
  "/id/features/growth-sampling": "Sampling pertumbuhan & bobot udang MBW",
  "/id/features/shrimp-harvest-tracking": "Software pelacakan panen udang",
  "/id/features/shrimp-farm-finance": "Pencatatan keuangan tambak udang",
  "/id/features/disease-alerts": "Peringatan penyakit udang & biosekuriti",
  "/id/resources": "Pusat panduan budidaya udang",
};

const buildArticleFaqs = (article: NonNullable<ReturnType<typeof getResourceArticleID>>) => {
  if (article.faqs?.length) {
    return article.faqs;
  }

  const topic = stripSubtitle(article.title).toLowerCase();
  const primaryTag = article.tags?.[0] ?? article.section.toLowerCase();
  const firstSection = article.sections[0];

  return [
    {
      question: `Apa itu ${topic}?`,
      answer: firstSection
        ? `${firstSection.body[0]} ${article.takeaways[0]}`
        : article.description,
    },
    {
      question: `Mengapa ${primaryTag} penting bagi petambak udang?`,
      answer: article.takeaways.join(" "),
    },
    {
      question: `Apa yang harus dievaluasi petambak saat memantau ${primaryTag}?`,
      answer: article.checklist.join(" "),
    },
  ];
};

export function generateStaticParams() {
  return resourceArticlesID.map(article => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticleID(slug);

  if (!article) {
    return {};
  }

  const metadata = seoMetadataID(
    {
      path: `/id/resources/${article.slug}`,
      title: `${article.title} | Panduan Shrimply`,
      description: article.description,
    },
    `/resources/${article.slug}`
  );

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

export default async function ResourceArticlePageID({ params }: ResourcePageProps) {
  const { slug } = await params;
  const article = getResourceArticleID(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = resourceArticlesID
    .filter(item => item.section === article.section && item.slug !== article.slug)
    .slice(0, 2);
  const primaryRelatedLabel = relatedFeatureLabelsID[article.relatedFeature.href] ?? article.relatedFeature.label;
  const relatedInternalLinks = [
    {
      href: article.relatedFeature.href,
      label: primaryRelatedLabel,
      description: article.relatedFeature.href === "/id/resources"
        ? "Jelajahi lebih banyak panduan Shrimply untuk alur kerja pakan, kualitas air, pertumbuhan, penyakit, panen, dan keuangan."
        : `Pelajari bagaimana ${primaryRelatedLabel.toLowerCase()} terhubung dengan panduan operasional tambak ini di Shrimply.`,
    },
    ...relatedArticles.map(related => ({
      href: `/id/resources/${related.slug}`,
      label: related.title,
      description: related.description,
    })),
  ];
  if (!relatedInternalLinks.some(link => link.href === "/id/resources")) {
    relatedInternalLinks.push({
      href: "/id/resources",
      label: "Pusat panduan budidaya udang",
      description: "Jelajahi panduan praktis Shrimply lainnya untuk operasional dan manajemen budidaya tambak vannamei.",
    });
  }
  const faqs = buildArticleFaqs(article);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: canonicalUrl(`/id/resources/${article.slug}`),
    inLanguage: "id-ID",
    author: {
      "@type": "Person",
      name: article.author?.name ?? "Tim Operasional Teknis Shrimply",
      jobTitle: article.author?.role ?? "Spesialis Operasi & Data Akuakultur",
    },
    editor: article.reviewer ? {
      "@type": "Person",
      name: article.reviewer.name,
      jobTitle: article.reviewer.role,
      description: article.reviewer.credentials,
    } : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_CONFIG.url}/shrimplylogo_v2.png`,
      },
    },
    mainEntityOfPage: canonicalUrl(`/id/resources/${article.slug}`),
    about: [article.section, "Budidaya udang", "Budidaya udang vannamei", "Manajemen akuakultur"],
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
        name: "Beranda",
        item: canonicalUrl("/id"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Panduan",
        item: canonicalUrl("/id/resources"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl(`/id/resources/${article.slug}`),
      },
    ],
  };
  const relatedPagesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Halaman Shrimply terkait untuk ${article.title}`,
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
    name: "Kalkulator Padat Tebar & Biomassa Udang Vannamei",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    url: canonicalUrl(`/id/resources/${article.slug}#calculator`),
    description: "Kalkulator akuakultur interaktif gratis untuk petambak udang menghitung kebutuhan benur PL, estimasi biomassa panen, kebutuhan kincir air HP, dan daya dukung kolam.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  } : article.slug === "vannamei-feeding-rate" ? {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Kalkulator Pakan Udang Vannamei & Tabel Feeding Rate",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    browserRequirements: "Requires JavaScript",
    url: canonicalUrl(`/id/resources/${article.slug}#calculator`),
    description: "Kalkulator akuakultur interaktif gratis untuk memperkirakan ransum pakan harian udang vaname, pembagian porsi pakan, dan alokasi anco dari biomassa dan bobot udang.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  } : null;

  return (
    <main>
      <Cursor />
      <NavbarID />
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
            <Link href="/id/resources" className="eyebrow" style={{ display: "inline-block", marginBottom: "24px" }}>
              Panduan Shrimply / {article.label}
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
              <span className="eyebrow" style={{ color: "var(--blue)" }}>Panduan operasional tambak</span>
              {article.updatedAt ? (
                <>
                  <span style={{ color: "var(--fog)" }}>/</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>
                    Diperbarui: {article.updatedAt}
                  </span>
                </>
              ) : article.publishedAt ? (
                <>
                  <span style={{ color: "var(--fog)" }}>/</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--ocean)", fontWeight: 600 }}>
                    Diterbitkan: {article.publishedAt}
                  </span>
                </>
              ) : null}
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
                  Buka Kalkulator Padat Tebar
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
                  Buka Kalkulator Pakan Udang
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
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Poin Kunci</div>
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
                            {renderInlineLinks(paragraph)}
                          </p>
                        ))}
                        {section.items ? (
                          section.ordered ? (
                            <ol style={{ display: "grid", gap: "14px", paddingLeft: "24px" }}>
                              {section.items.map(item => (
                                <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{renderInlineLinks(item)}</li>
                              ))}
                            </ol>
                          ) : (
                            <ul style={{ display: "grid", gap: "14px", paddingLeft: "22px" }}>
                              {section.items.map(item => (
                                <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{renderInlineLinks(item)}</li>
                              ))}
                            </ul>
                          )
                        ) : null}
                        {section.table ? (
                          <div className="resource-table-frame">
                            <p className="resource-table-scroll-hint">Geser ke samping untuk melihat seluruh kolom.</p>
                            <div
                              className="resource-table-scroll"
                              role="region"
                              tabIndex={0}
                              aria-label={`Tabel ${section.heading}, gulir horizontal untuk melihat seluruh kolom`}
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
                                          {renderInlineLinks(cell)}
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
                            <strong style={{ color: "var(--ink)" }}>Hindari: </strong>{renderInlineLinks(section.note)}
                          </aside>
                        ) : null}
                        {section.heading.toLowerCase().includes("kalkulator") || section.heading.toLowerCase().includes("calculator") ? (
                          <div id="calculator" style={{ marginTop: "16px", scrollMarginTop: "100px" }}>
                            {article.slug === "vannamei-feeding-rate" ? (
                              <ShrimpFeedCalculator locale="id" />
                            ) : (
                              <StockingDensityCalculator locale="id" />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ))}
                </div>

                <section style={{ marginTop: "72px", background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "18px", padding: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Checklist Petambak</div>
                  <h2 className="feature-title" style={{ fontSize: "1.7rem", marginBottom: "20px" }}>
                    Penerapan di Lapangan
                  </h2>
                  <ul style={{ display: "grid", gap: "14px", paddingLeft: "20px" }}>
                    {article.checklist.map(item => (
                      <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section style={{ marginTop: "56px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Pertanyaan yang Sering Diajukan</div>
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
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Sumber dan Referensi Bacaan</div>
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

                <section style={{ marginTop: "64px", background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "18px", padding: "32px" }}>
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Penulis & Peninjau Ahli</div>
                  <div style={{ display: "grid", gap: "24px" }}>
                    <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "var(--sky)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--navy)", fontSize: "1.15rem", flexShrink: 0 }}>
                        {(article.author?.name || "S").charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)" }}>
                            Ditulis oleh {article.author?.name ?? "Tim Operasional Teknis Shrimply"}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--ocean)", fontWeight: 600 }}>
                            • {article.author?.role ?? "Spesialis Operasi & Data Akuakultur"}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "var(--ocean)", lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                          {article.author?.bio ?? "Praktisi tambak udang vannamei dan insinyur akuakultur yang berdedikasi pada pencatatan data kolam yang presisi, manajemen kualitas air berbasis bukti, dan optimalisasi biomassa panen."}
                        </p>
                      </div>
                    </div>

                    {article.reviewer ? (
                      <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", borderTop: "1px solid var(--slate)", paddingTop: "22px" }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(15, 76, 117, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--primary)", fontSize: "1.15rem", flexShrink: 0 }}>
                          ✓
                        </div>
                        <div>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)" }}>
                              Tinjauan Teknis: {article.reviewer.name}
                            </span>
                            <span style={{ fontSize: "0.85rem", color: "var(--ocean)", fontWeight: 600 }}>
                              • {article.reviewer.role}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.95rem", color: "var(--ocean)", lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                            {article.reviewer.credentials}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {(article.publishedAt || article.updatedAt) ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", borderTop: "1px solid var(--slate)", paddingTop: "18px", fontSize: "0.84rem", color: "var(--ocean)", fontWeight: 600 }}>
                        {article.publishedAt ? <span>Diterbitkan: {article.publishedAt}</span> : null}
                        {article.updatedAt ? <span>Terakhir diperbarui: {article.updatedAt}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section style={{ marginTop: "64px", borderTop: "1px solid var(--slate)", paddingTop: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Halaman Terkait Shrimply</div>
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

      <FooterID />
    </main>
  );
}
