"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";

export default function LanguageToggle({ isMobile = false }: { isMobile?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
  const languages = [
    { code: "EN", name: "English", href: enHref, active: isEnglish, ariaLabel: "Switch to English" },
    { code: "ID", name: "Bahasa Indonesia", href: idHref, active: isIndonesian, ariaLabel: "Ganti ke Bahasa Indonesia" },
    { code: "TH", name: "ภาษาไทย", href: thHref, active: isThai, ariaLabel: "เปลี่ยนเป็นภาษาไทย" },
    { code: "VI", name: "Tiếng Việt", href: viHref, active: isVietnamese, ariaLabel: "Chuyển sang Tiếng Việt" },
  ];
  const currentLanguage = languages.find((language) => language.active) || languages[0];

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
    <div className="lang-toggle-wrap" ref={menuRef}>
      <button
        type="button"
        className="lang-toggle-button"
        aria-label={`Choose language. Current language: ${currentLanguage.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Globe size={13} strokeWidth={1.8} className="globe-icon" />
        <span>{currentLanguage.code}</span>
        <ChevronDown size={13} strokeWidth={2} className={`chevron-icon ${menuOpen ? "open" : ""}`} />
      </button>

      {menuOpen && (
        <div className="language-menu" role="menu" aria-label="Choose language">
          {languages.map((language) => (
            <Link
              key={language.code}
              href={language.href}
              className={`language-option ${language.active ? "active" : ""}`}
              role="menuitem"
              aria-label={language.ariaLabel}
              aria-current={language.active ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              <span className="language-code">{language.code}</span>
              <span className="language-name">{language.name}</span>
              {language.active && <Check size={14} strokeWidth={2.2} />}
            </Link>
          ))}
        </div>
      )}

      <style jsx>{`
        .lang-toggle-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .lang-toggle-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 62px;
          min-height: 36px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(15, 76, 117, 0.18);
          background: rgba(255, 255, 255, 0.85);
          color: var(--ink);
          font-family: inherit;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.25s ease;
          backdrop-filter: blur(8px);
          user-select: none;
        }

        .lang-toggle-button:hover,
        .lang-toggle-button:focus-visible {
          border-color: var(--sky);
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 4px 14px rgba(26, 184, 232, 0.15);
          outline: none;
        }

        .lang-toggle-button :global(.globe-icon) {
          color: var(--sky);
          flex-shrink: 0;
        }

        .lang-toggle-button :global(.chevron-icon) {
          color: var(--muted);
          transition: transform 0.2s ease;
        }

        .lang-toggle-button :global(.chevron-icon.open) {
          transform: rotate(180deg);
        }

        .language-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 20;
          width: 196px;
          padding: 6px;
          border: 1px solid rgba(15, 76, 117, 0.14);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 18px 42px rgba(13, 33, 55, 0.16);
          backdrop-filter: blur(16px);
        }

        :global(.language-option) {
          display: grid;
          grid-template-columns: 28px 1fr 16px;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 7px 9px;
          border-radius: 9px;
          color: var(--ink) !important;
          text-decoration: none !important;
          transition: background 0.18s ease, color 0.18s ease;
        }

        :global(.language-option:hover),
        :global(.language-option:focus-visible) {
          background: rgba(26, 184, 232, 0.09);
          color: var(--blue) !important;
          outline: none;
        }

        :global(.language-option.active) {
          background: rgba(15, 76, 117, 0.08);
          color: var(--navy) !important;
        }

        .language-code {
          color: var(--sky);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.06em;
        }

        .language-name {
          font-size: 0.76rem;
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
