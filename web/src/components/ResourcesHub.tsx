"use client";

import "@/app/globals.css";
import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ResourceArticle } from "@/data/resourceLibrary";

type ResourcesHubProps = {
  articles: ResourceArticle[];
  locale?: "en" | "id" | "th" | "vi";
};

const searchableText = (article: ResourceArticle) => [
  article.title,
  article.description,
  article.section,
  article.label,
  article.image?.alt ?? "",
  ...(article.tags ?? []),
  ...article.takeaways,
  ...article.checklist,
  ...article.sections.flatMap(section => [section.heading, ...section.body]),
].join(" ").toLowerCase();

export default function ResourcesHub({ articles, locale = "en" }: ResourcesHubProps) {
  const isId = locale === "id";
  const isTh = locale === "th";
  const isVi = locale === "vi";
  const allCategory = isId ? "Semua" : isTh ? "ทั้งหมด" : isVi ? "Tất cả" : "All";
  const baseHref = isId ? "/id/resources" : isTh ? "/th/resources" : isVi ? "/vi/resources" : "/resources";

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategory);

  const handleSearchInput = (event: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>) => {
    setQuery(event.currentTarget.value);
  };

  const sortedArticles = useMemo(
    () => [...articles].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [articles]
  );

  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(sortedArticles.map(article => article.section)))],
    [allCategory, sortedArticles]
  );

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedArticles.filter(article => {
      const matchesCategory = category === allCategory || article.section === category;
      const matchesQuery = !normalizedQuery || searchableText(article).includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [sortedArticles, category, query]);

  return (
    <section id="library" className="section" style={{ background: "var(--white)", paddingTop: "96px" }}>
      <div className="container">
        <div style={{ marginBottom: "28px", display: "grid", gap: "18px" }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: "16px" }}>
              {isId ? "Koleksi Panduan" : isTh ? "คลังคู่มือการเพาะเลี้ยง" : isVi ? "Thư viện cẩm nang" : "Article Library"}
            </div>
            <h2 className="section-title" style={{ maxWidth: "760px", marginBottom: "18px" }}>
              {isId ? "Cari panduan budidaya udang." : isTh ? "ค้นหาคู่มือการเลี้ยงกุ้ง" : isVi ? "Tìm kiếm cẩm nang nuôi tôm." : "Search shrimp farming guides."}
            </h2>
            <p style={{ maxWidth: "700px", fontWeight: 500 }}>
              {isId
                ? "Coba kata kunci seperti Vibrio, AHPND, FCR, amonia, MBW, anco, mortalitas, panen, atau arus kas."
                : isTh
                ? "ลองค้นหาคำสำคัญ เช่น Vibrio, AHPND, FCR, แอมโมเนีย, MBW, การเช็คยอ, อัตราการตาย, การจับกุ้ง หรือ กระแสเงินสด"
                : isVi
                ? "Thử các từ khóa như Vibrio, AHPND, FCR, amoniac, MBW, sàng ăn, tỷ lệ chết, thu hoạch, hoặc dòng tiền."
                : "Try keywords like Vibrio, AHPND, FCR, ammonia, MBW, feed tray, mortality, harvest, or cash flow."}
            </p>
          </div>
          <input
            id="resource-search"
            type="search"
            value={query}
            onChange={handleSearchInput}
            onInput={handleSearchInput}
            placeholder={
              isId
                ? "Cari Vibrio, AHPND, FCR, amonia, MBW, anco..."
                : isTh
                ? "ค้นหา Vibrio, AHPND, FCR, แอมโมเนีย, MBW, เช็คยอ..."
                : isVi
                ? "Tìm kiếm Vibrio, AHPND, FCR, amoniac, MBW, sàng ăn..."
                : "Search Vibrio, AHPND, FCR, ammonia, MBW..."
            }
            style={{
              width: "100%",
              border: "1px solid var(--slate)",
              borderRadius: "999px",
              padding: "18px 24px",
              background: "var(--white)",
              color: "var(--ink)",
              font: "inherit",
              fontSize: "1rem",
              boxShadow: "0 12px 32px rgba(13, 33, 55, 0.04)",
            }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "24px" }}>
          {categories.map(item => {
            const isActive = item === category;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                style={{
                  border: `1px solid ${isActive ? "var(--sky)" : "var(--slate)"}`,
                  borderRadius: "999px",
                  padding: "11px 16px",
                  color: isActive ? "var(--white)" : "var(--blue)",
                  background: isActive ? "linear-gradient(135deg, var(--blue) 0%, var(--sky) 100%)" : "var(--white)",
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" style={{ marginBottom: "26px", color: "var(--ocean)", fontWeight: 700 }}>
          {isId
            ? `Menampilkan ${filteredArticles.length} dari ${sortedArticles.length} panduan${query.trim() ? ` untuk "${query.trim()}"` : ""}${category !== allCategory ? ` dalam ${category}` : ""}.`
            : isTh
            ? `แสดง ${filteredArticles.length} จากทั้งหมด ${sortedArticles.length} คู่มือ${query.trim() ? ` สำหรับ "${query.trim()}"` : ""}${category !== allCategory ? ` ในหมวดหมู่ ${category}` : ""}.`
            : isVi
            ? `Hiển thị ${filteredArticles.length} trên ${sortedArticles.length} cẩm nang${query.trim() ? ` cho "${query.trim()}"` : ""}${category !== allCategory ? ` trong ${category}` : ""}.`
            : `Showing ${filteredArticles.length} of ${sortedArticles.length} guides${query.trim() ? ` for "${query.trim()}"` : ""}${category !== allCategory ? ` in ${category}` : ""}.`}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "18px" }} className="resource-card-grid">
          {filteredArticles.map(article => (
            <Link
              href={`${baseHref}/${article.slug}`}
              key={article.slug}
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "320px",
                background: "var(--white)",
                border: "1px solid var(--slate)",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 14px 38px rgba(13, 33, 55, 0.04)",
                overflow: "hidden",
              }}
            >
              {article.image ? (
                <Image
                  src={article.image.src}
                  alt={article.image.alt}
                  width={article.image.width}
                  height={article.image.height}
                  loading="lazy"
                  style={{
                    width: "calc(100% + 56px)",
                    aspectRatio: "16 / 9",
                    height: "auto",
                    objectFit: "cover",
                    margin: "-28px -28px 24px",
                    borderBottom: "1px solid var(--slate)",
                  }}
                />
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "22px" }}>
                <span className="eyebrow">{article.section}</span>
                <span className="eyebrow" style={{ color: "var(--blue)", whiteSpace: "nowrap" }}>{article.readTime}</span>
              </div>
              <h3 className="feature-title" style={{ fontSize: "1.32rem", marginBottom: "16px" }}>{article.title}</h3>
              <p style={{ fontWeight: 500, marginBottom: "22px" }}>{article.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "auto" }}>
                {(article.tags ?? []).slice(0, 3).map(tag => (
                  <span key={tag} style={{ fontSize: "0.74rem", color: "var(--blue)", border: "1px solid var(--slate)", borderRadius: "999px", padding: "4px 9px" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 ? (
          <div style={{ marginTop: "28px", background: "var(--white)", border: "1px solid var(--slate)", borderRadius: "16px", padding: "28px" }}>
            <h3 className="feature-title" style={{ marginBottom: "10px" }}>
              {isId ? "Belum ada panduan yang cocok." : isTh ? "ยังไม่พบคู่มือที่ตรงกับคำค้นหา" : isVi ? "Chưa có cẩm nang phù hợp." : "No matching guides yet."}
            </h3>
            <p style={{ fontWeight: 500 }}>
              {isId
                ? "Coba kata kunci atau kategori lain. Topik panduan tambak baru akan terus ditambahkan."
                : isTh
                ? "ลองค้นหาด้วยคำสำคัญหรือหมวดหมู่อื่น เนื้อหาคู่มือใหม่ๆ จะได้รับการอัปเดตอย่างต่อเนื่อง"
                : isVi
                ? "Thử tìm kiếm với từ khóa hoặc chuyên mục khác. Các chủ đề cẩm nang mới sẽ liên tục được cập nhật."
                : "Try another keyword or category. New farm topics can be added as the library grows."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
