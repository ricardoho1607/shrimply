"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

export default function LanguageToggle({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname() || "/";
  const isIndonesian = pathname === "/id" || pathname.startsWith("/id/");

  // Calculate equivalent links
  const enHref = isIndonesian
    ? pathname === "/id"
      ? "/"
      : pathname.replace(/^\/id/, "")
    : pathname;

  const idHref = isIndonesian
    ? pathname
    : pathname === "/"
    ? "/id"
    : `/id${pathname}`;

  if (isMobile) {
    return (
      <div className="mobile-lang-toggle">
        <div className="mobile-lang-label">
          <Globe size={14} strokeWidth={1.8} />
          <span>Bahasa / Language</span>
        </div>
        <div className="mobile-lang-options">
          <Link
            href={enHref}
            className={`mobile-lang-btn ${!isIndonesian ? "active" : ""}`}
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
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
          }
          .mobile-lang-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .mobile-lang-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px 12px;
            font-size: 0.78rem;
            font-weight: 600;
            color: var(--ink);
            text-decoration: none;
            border-radius: 8px;
            background: transparent;
            transition: all 0.2s ease;
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
      <Link
        href={isIndonesian ? enHref : idHref}
        className="lang-toggle-pill"
        title={isIndonesian ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
        aria-label={isIndonesian ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
      >
        <Globe size={13} strokeWidth={1.8} className="globe-icon" />
        <span className={`lang-tag ${!isIndonesian ? "active" : ""}`}>EN</span>
        <span className="lang-sep">/</span>
        <span className={`lang-tag ${isIndonesian ? "active" : ""}`}>ID</span>
      </Link>

      <style jsx>{`
        .lang-toggle-wrap {
          display: inline-flex;
          align-items: center;
        }

        .lang-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(15, 76, 117, 0.18);
          background: rgba(255, 255, 255, 0.85);
          color: var(--ink);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-decoration: none;
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
          margin-right: 1px;
        }

        .lang-sep {
          color: var(--slate);
          font-weight: 400;
          font-size: 0.68rem;
        }

        .lang-tag {
          color: var(--muted);
          transition: color 0.2s ease;
        }

        .lang-tag.active {
          color: var(--navy);
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
