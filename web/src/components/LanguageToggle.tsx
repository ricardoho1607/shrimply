"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

export default function LanguageToggle({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname() || "/";
  const isVietnamese = pathname === "/vi" || pathname.startsWith("/vi/");
  const isThai = !isVietnamese && (pathname === "/th" || pathname.startsWith("/th/"));
  const isIndonesian = !isVietnamese && !isThai && (pathname === "/id" || pathname.startsWith("/id/"));
  const isEnglish = !isVietnamese && !isThai && !isIndonesian;

  // Extract clean base path without locale prefix
  const basePath = isVietnamese
    ? pathname === "/vi"
      ? "/"
      : pathname.replace(/^\/vi/, "")
    : isThai
    ? pathname === "/th"
      ? "/"
      : pathname.replace(/^\/th/, "")
    : isIndonesian
    ? pathname === "/id"
      ? "/"
      : pathname.replace(/^\/id/, "")
    : pathname;

  const enHref = basePath === "/" ? "/" : basePath;
  const idHref = basePath === "/" ? "/id" : `/id${basePath}`;
  const thHref = basePath === "/" ? "/th" : `/th${basePath}`;
  const viHref = basePath === "/" ? "/vi" : `/vi${basePath}`;

  if (isMobile) {
    return (
      <div className="mobile-lang-toggle">
        <div className="mobile-lang-label">
          <Globe size={14} strokeWidth={1.8} />
          <span>Ngôn ngữ / ภาษา / Bahasa / Language</span>
        </div>
        <div className="mobile-lang-options">
          <Link
            href={enHref}
            className={`mobile-lang-btn ${isEnglish ? "active" : ""}`}
            aria-label="Switch to English"
          >
            English
          </Link>
          <Link
            href={idHref}
            className={`mobile-lang-btn ${isIndonesian ? "active" : ""}`}
            aria-label="Ganti ke Bahasa Indonesia"
          >
            Indonesia
          </Link>
          <Link
            href={thHref}
            className={`mobile-lang-btn ${isThai ? "active" : ""}`}
            aria-label="เปลี่ยนเป็นภาษาไทย"
          >
            ภาษาไทย
          </Link>
          <Link
            href={viHref}
            className={`mobile-lang-btn ${isVietnamese ? "active" : ""}`}
            aria-label="Chuyển sang Tiếng Việt"
          >
            Tiếng Việt
          </Link>
        </div>
        <style jsx>{`
          .mobile-lang-toggle {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 16px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid var(--slate);
            border-radius: 14px;
          }
          .mobile-lang-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.68rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
          }
          .mobile-lang-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
          .mobile-lang-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 6px;
            font-size: 0.74rem;
            font-weight: 600;
            color: var(--ink);
            text-decoration: none;
            border-radius: 8px;
            background: transparent;
            transition: all 0.2s ease;
            text-align: center;
          }
          .mobile-lang-btn.active {
            background: var(--navy);
            color: var(--white);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="lang-toggle-wrap">
      <div className="lang-toggle-pill">
        <Globe size={13} strokeWidth={1.8} className="globe-icon" />
        <Link
          href={enHref}
          className={`lang-tag ${isEnglish ? "active" : ""}`}
          title="Switch to English"
          aria-label="Switch to English"
        >
          EN
        </Link>
        <span className="lang-sep">/</span>
        <Link
          href={idHref}
          className={`lang-tag ${isIndonesian ? "active" : ""}`}
          title="Ganti ke Bahasa Indonesia"
          aria-label="Ganti ke Bahasa Indonesia"
        >
          ID
        </Link>
        <span className="lang-sep">/</span>
        <Link
          href={thHref}
          className={`lang-tag ${isThai ? "active" : ""}`}
          title="เปลี่ยนเป็นภาษาไทย"
          aria-label="เปลี่ยนเป็นภาษาไทย"
        >
          TH
        </Link>
        <span className="lang-sep">/</span>
        <Link
          href={viHref}
          className={`lang-tag ${isVietnamese ? "active" : ""}`}
          title="Chuyển sang Tiếng Việt"
          aria-label="Chuyển sang Tiếng Việt"
        >
          VI
        </Link>
      </div>

      <style jsx>{`
        .lang-toggle-wrap {
          display: inline-flex;
          align-items: center;
        }

        .lang-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(15, 76, 117, 0.18);
          background: rgba(255, 255, 255, 0.85);
          color: var(--ink);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: all 0.25s ease;
          backdrop-filter: blur(8px);
          user-select: none;
        }

        .lang-toggle-pill:hover {
          border-color: var(--sky);
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 4px 14px rgba(26, 184, 232, 0.15);
        }

        .lang-toggle-pill :global(.globe-icon) {
          color: var(--sky);
          margin-right: 2px;
          flex-shrink: 0;
        }

        .lang-sep {
          color: var(--slate);
          font-weight: 400;
          font-size: 0.65rem;
        }

        :global(.lang-tag) {
          color: var(--muted) !important;
          text-decoration: none !important;
          transition: color 0.2s ease;
          padding: 0 1px;
        }

        :global(.lang-tag:hover) {
          color: var(--sky) !important;
        }

        :global(.lang-tag.active) {
          color: var(--navy) !important;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
