import "@/app/globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cursor from "@/components/Cursor";
import FooterVI from "@/components/FooterVI";
import NavbarVI from "@/components/NavbarVI";
import StockingDensityCalculator from "@/components/StockingDensityCalculator";
import ShrimpFeedCalculator from "@/components/ShrimpFeedCalculator";
import { canonicalUrl, seoMetadataVI } from "@/config/seo";
import { SITE_CONFIG } from "@/config/site";
import { getResourceArticleVI, resourceArticlesVI } from "@/data/resourceLibraryVI";

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

const relatedFeatureLabelsVI: Record<string, string> = {
  "/vi/shrimp-farm-management-software": "Phần mềm quản lý trang trại tôm",
  "/vi/vannamei-shrimp-farming-app": "Ứng dụng nuôi tôm thẻ chân trắng",
  "/vi/features/feed-inventory": "Hệ thống quản lý thức ăn và kho hàng",
  "/vi/features/water-quality-monitoring": "Hệ thống giám sát chất lượng nước ao tôm",
  "/vi/features/growth-sampling": "Lấy mẫu tăng trưởng và trọng lượng tôm MBW",
  "/vi/features/shrimp-harvest-tracking": "Phần mềm theo dõi sản lượng thu hoạch tôm",
  "/vi/features/shrimp-farm-finance": "Hệ thống hạch toán tài chính trang trại tôm",
  "/vi/features/disease-alerts": "Hệ thống cảnh báo dịch bệnh và an toàn sinh học",
  "/vi/resources": "Trung tâm cẩm nang nuôi tôm Shrimply",
};

const buildArticleFaqs = (article: NonNullable<ReturnType<typeof getResourceArticleVI>>) => {
  if (article.faqs?.length) {
    return article.faqs;
  }

  const topic = stripSubtitle(article.title);
  const primaryTag = article.tags?.[0] ?? article.section;
  const firstSection = article.sections[0];

  return [
    {
      question: `${topic} là gì?`,
      answer: firstSection
        ? `${firstSection.body[0]} ${article.takeaways[0]}`
        : article.description,
    },
    {
      question: `Tại sao ${primaryTag} lại quan trọng đối với người nuôi tôm?`,
      answer: article.takeaways.join(" "),
    },
    {
      question: `Người nuôi tôm cần đánh giá những gì khi theo dõi ${primaryTag}?`,
      answer: article.checklist.join(" "),
    },
  ];
};

export function generateStaticParams() {
  return resourceArticlesVI.map(article => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getResourceArticleVI(slug);

  if (!article) {
    return {};
  }

  const metadata = seoMetadataVI(
    {
      path: `/vi/resources/${article.slug}`,
      title: `${article.title} | Cẩm nang Shrimply`,
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

export default async function ResourceArticlePageVI({ params }: ResourcePageProps) {
  const { slug } = await params;
  const article = getResourceArticleVI(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = resourceArticlesVI
    .filter(item => item.section === article.section && item.slug !== article.slug)
    .slice(0, 2);
  const primaryRelatedLabel = relatedFeatureLabelsVI[article.relatedFeature.href] ?? article.relatedFeature.label;
  const relatedInternalLinks = [
    {
      href: article.relatedFeature.href,
      label: primaryRelatedLabel,
      description: article.relatedFeature.href === "/vi/resources"
        ? "Khám phá thêm các cẩm nang Shrimply về quản lý thức ăn, chất lượng nước, tăng trưởng, dịch bệnh tôm, thu hoạch và tài chính trang trại."
        : `Tìm hiểu cách ${primaryRelatedLabel} kết nối với cẩm nang thực hành ao nuôi này trên nền tảng Shrimply.`,
    },
    ...relatedArticles.map(related => ({
      href: `/vi/resources/${related.slug}`,
      label: related.title,
      description: related.description,
    })),
  ];
  if (!relatedInternalLinks.some(link => link.href === "/vi/resources")) {
    relatedInternalLinks.push({
      href: "/vi/resources",
      label: "Trung tâm cẩm nang nuôi tôm Shrimply",
      description: "Khám phá thêm các cẩm nang thực hành khác của Shrimply phục vụ vận hành và quản trị trang trại tôm thẻ chân trắng.",
    });
  }
  const faqs = buildArticleFaqs(article);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: canonicalUrl(`/vi/resources/${article.slug}`),
    inLanguage: "vi-VN",
    author: {
      "@type": "Person",
      name: article.author?.name ?? "Đội ngũ Kỹ thuật Shrimply",
      jobTitle: article.author?.role ?? "Chuyên viên Dữ liệu & Vận hành Nuôi trồng Thủy sản",
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
    mainEntityOfPage: canonicalUrl(`/vi/resources/${article.slug}`),
    about: [article.section, "Nuôi tôm thẻ chân trắng", "Nuôi trồng thủy sản", "Quản lý trang trại tôm"],
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
        name: "Trang chủ",
        item: canonicalUrl("/vi"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cẩm nang",
        item: canonicalUrl("/vi/resources"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl(`/vi/resources/${article.slug}`),
      },
    ],
  };

  return (
    <main>
      <Cursor />
      <NavbarVI />
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

      <article>
        <header className="section" style={{ minHeight: "68vh", display: "flex", alignItems: "center", background: "var(--off-white)" }}>
          <div className="container" style={{ maxWidth: "1080px" }}>
            <nav aria-label="Đường dẫn điều hướng" style={{ marginBottom: "22px" }}>
              <ol
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "8px",
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "var(--ocean)",
                  fontWeight: 600,
                }}
              >
                <li>
                  <Link href="/vi" style={{ color: "var(--ocean)", textDecoration: "none" }}>
                    Trang chủ
                  </Link>
                </li>
                <li aria-hidden="true" style={{ color: "var(--fog)" }}>/</li>
                <li>
                  <Link href="/vi/resources" style={{ color: "var(--ocean)", textDecoration: "none" }}>
                    Cẩm nang
                  </Link>
                </li>
                <li aria-hidden="true" style={{ color: "var(--fog)" }}>/</li>
                <li aria-current="page" style={{ color: "var(--navy)", fontWeight: 700 }}>
                  {article.label}
                </li>
              </ol>
            </nav>

            <div className="eyebrow animate-hero" style={{ animationDelay: "0.2s", marginBottom: "20px" }}>
              {article.section}
            </div>
            <h1 className="animate-hero" style={{ animationDelay: "0.35s", fontSize: "clamp(2.4rem, 4.2vw, 4.4rem)", marginBottom: "28px" }}>
              {article.title}
            </h1>
            <p style={{ maxWidth: "760px", fontSize: "1.12rem", fontWeight: 500, color: "var(--ocean)" }}>
              {article.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "34px", alignItems: "center" }}>
              <span className="eyebrow" style={{ color: "var(--blue)" }}>{article.readTime}</span>
              <span style={{ color: "var(--fog)" }}>/</span>
              <span className="eyebrow" style={{ color: "var(--blue)" }}>Cẩm nang thực hành ao tôm</span>
              {article.updatedAt ? (
                <>
                  <span style={{ color: "var(--fog)" }}>/</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>
                    Cập nhật lần cuối: {article.updatedAt}
                  </span>
                </>
              ) : article.publishedAt ? (
                <>
                  <span style={{ color: "var(--fog)" }}>/</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--ocean)", fontWeight: 600 }}>
                    Xuất bản ngày: {article.publishedAt}
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
                  Mở công cụ tính mật độ thả giống
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
                  Mở công cụ tính lượng thức ăn tôm
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
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Điểm cốt lõi</div>
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
                            <p className="resource-table-scroll-hint">Cuộn ngang để xem toàn bộ các cột</p>
                            <div
                              className="resource-table-scroll"
                              role="region"
                              tabIndex={0}
                              aria-label={`Bảng ${section.heading}, cuộn ngang để xem toàn bộ các cột`}
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
                            <strong style={{ color: "var(--ink)" }}>Lưu ý: </strong>{renderInlineLinks(section.note)}
                          </aside>
                        ) : null}
                        {section.heading.toLowerCase().includes("công cụ tính") || section.heading.toLowerCase().includes("calculator") ? (
                          <div id="calculator" style={{ marginTop: "16px", scrollMarginTop: "100px" }}>
                            {article.slug === "vannamei-feeding-rate" ? (
                              <ShrimpFeedCalculator locale="vi" />
                            ) : (
                              <StockingDensityCalculator locale="vi" />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </section>
                  ))}
                </div>

                <section style={{ marginTop: "72px", background: "var(--off-white)", border: "1px solid var(--slate)", borderRadius: "18px", padding: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Bảng kiểm cho trang trại</div>
                  <h2 className="feature-title" style={{ fontSize: "1.7rem", marginBottom: "20px" }}>
                    Áp dụng thực tế tại ao nuôi
                  </h2>
                  <ul style={{ display: "grid", gap: "14px", paddingLeft: "20px" }}>
                    {article.checklist.map(item => (
                      <li key={item} style={{ color: "var(--ocean)", fontWeight: 500, paddingLeft: "6px" }}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section style={{ marginTop: "56px" }}>
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Câu hỏi thường gặp</div>
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
                  <div className="eyebrow" style={{ marginBottom: "18px" }}>Tài liệu tham khảo học thuật</div>
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
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Tác giả và Chuyên gia bình duyệt</div>
                  <div style={{ display: "grid", gap: "24px" }}>
                    <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
                      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "var(--sky)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "var(--navy)", fontSize: "1.15rem", flexShrink: 0 }}>
                        {(article.author?.name || "S").charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)" }}>
                            Viết bởi {article.author?.name ?? "Đội ngũ Kỹ thuật Shrimply"}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--ocean)", fontWeight: 600 }}>
                            • {article.author?.role ?? "Chuyên viên Dữ liệu & Vận hành Nuôi trồng Thủy sản"}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "var(--ocean)", lineHeight: 1.6, fontWeight: 500, margin: 0 }}>
                          {article.author?.bio ?? "Kỹ sư dữ liệu và chuyên gia thực hành nuôi tôm thẻ chân trắng, tận tâm với việc ghi chép nhật ký ao nuôi chính xác, quản lý chất lượng nước dựa trên bằng chứng khoa học và tối ưu hóa sinh khối thu hoạch."}
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
                              Bình duyệt chuyên môn bởi: {article.reviewer.name}
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
                        {article.publishedAt ? <span>Xuất bản ngày: {article.publishedAt}</span> : null}
                        {article.updatedAt ? <span>Cập nhật lần cuối: {article.updatedAt}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section style={{ marginTop: "64px", borderTop: "1px solid var(--slate)", paddingTop: "34px" }}>
                  <div className="eyebrow" style={{ marginBottom: "20px" }}>Nội dung liên quan trong Shrimply</div>
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

      <FooterVI />
    </main>
  );
}
