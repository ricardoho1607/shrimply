"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GOOGLE_PLAY_URL } from '@/config/site';
import LanguageToggle from '@/components/LanguageToggle';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/resources', label: 'Resources' },
  { href: '/about', label: 'About' },
  { href: GOOGLE_PLAY_URL, label: 'Download App', external: true },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const focusable = Array.from(
          drawerRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        ).filter(element => !element.hasAttribute('disabled'));

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const shell = navRef.current?.parentElement;
    const backgroundElements = shell
      ? Array.from(shell.children).filter(element => element !== navRef.current)
      : [];
    const previousStates = backgroundElements.map(element => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      hadInert: element.hasAttribute('inert'),
    }));

    backgroundElements.forEach(element => {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    drawerRef.current
      ?.querySelector<HTMLElement>('button:not([disabled]), a[href]')
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousStates.forEach(({ element, ariaHidden, hadInert }) => {
        if (!hadInert) element.removeAttribute('inert');
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      menuButton?.focus();
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/resources') return pathname === '/resources' || pathname?.startsWith('/resources/');
    return pathname === href;
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      ref={navRef}
      id="navbar"
      className={scrolled ? 'scrolled' : ''}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        padding: scrolled ? '14px 52px' : '22px 52px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
        background: scrolled
          ? 'rgba(255, 255, 255, 0.92)'
          : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(244, 248, 252, 0.6) 50%, transparent 100%)',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        boxShadow: scrolled ? '0 1px 0 var(--slate)' : 'none',
      }}
    >
      <Link href="/" className="brand-link" aria-label="Shrimply home">
        <span className="brand-word">Shrimply</span>
        <img className="brand-logo" src="/shrimplylogo_v2.webp" width="500" height="160" alt="" aria-hidden="true" />
      </Link>

      <div className="desktop-links">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            style={isActive(item.href) ? { color: 'var(--sky)' } : {}}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="desktop-actions">
        <LanguageToggle />
        <Link href="/auth" prefetch={false} className="signin-link">
          Sign In
        </Link>
        <Link href="/auth/join" prefetch={false} className="btn-primary get-started-link">
          Start for free
        </Link>
      </div>

      <button
        ref={menuButtonRef}
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen(current => !current)}
      >
        {menuOpen ? 'Close' : 'Menu'}
      </button>

      <button
        className={`mobile-backdrop ${menuOpen ? 'open' : ''}`}
        type="button"
        aria-label="Close navigation menu"
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeMenu}
      />

      <aside
        ref={drawerRef}
        id="mobile-navigation"
        className={`mobile-drawer ${menuOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal={menuOpen ? true : undefined}
        aria-label="Site navigation"
        aria-hidden={!menuOpen}
      >
        <div className="drawer-header">
          <button className="drawer-close" type="button" aria-label="Close navigation menu" onClick={closeMenu}>
            Close
          </button>
        </div>

        <div className="drawer-links">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`drawer-link ${isActive(item.href) ? 'active' : ''}`}
              style={{
                minHeight: '68px',
                padding: '0 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive(item.href) ? 'var(--sky)' : 'var(--ink)',
                fontSize: '0.84rem',
                fontWeight: 600,
                letterSpacing: '0.16em',
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: isActive(item.href)
                  ? '1px solid rgba(26, 184, 232, 0.34)'
                  : '1px solid rgba(220, 232, 242, 0.95)',
                borderRadius: '14px',
                background: isActive(item.href)
                  ? 'rgba(26, 184, 232, 0.08)'
                  : 'rgba(255, 255, 255, 0.68)',
                boxShadow: '0 12px 28px rgba(13, 33, 55, 0.05)',
              }}
              onClick={closeMenu}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth"
            prefetch={false}
            className="drawer-link drawer-signin"
            onClick={closeMenu}
          >
            Sign In
          </Link>
        </div>

        <div className="drawer-actions">
          <LanguageToggle isMobile />
        </div>
      </aside>

      <style jsx>{`
        .brand-link {
          color: var(--ink);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          flex-shrink: 0;
        }

        .brand-word {
          font-family: var(--serif);
          font-size: 1.65rem;
          font-weight: 600;
          line-height: 1;
        }

        .brand-logo {
          display: none;
          width: 118px;
          height: auto;
          object-fit: contain;
          object-position: left center;
        }

        .desktop-links {
          display: flex;
          flex: 1;
          justify-content: center;
          gap: clamp(18px, 2.4vw, 32px);
          align-items: center;
          min-width: 0;
          margin: 0 24px;
        }

        :global(.nav-link) {
          white-space: nowrap;
          flex-shrink: 0;
        }

        .desktop-actions {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-shrink: 0;
        }

        :global(.signin-link) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          color: var(--blue);
          font-weight: 500;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          line-height: 1;
          white-space: nowrap;
          text-decoration: none;
        }

        :global(.get-started-link) {
          padding: 10px 20px;
          white-space: nowrap;
        }

        .mobile-menu-button,
        .drawer-close,
        .mobile-backdrop {
          display: none;
        }

        .mobile-drawer {
          display: none;
        }

        @media (max-width: 1180px) {
          nav {
            padding-left: 32px !important;
            padding-right: 32px !important;
          }

          .desktop-links {
            gap: 18px;
            margin: 0 16px;
          }

          .desktop-actions {
            gap: 12px;
          }

          :global(.get-started-link) {
            padding-inline: 16px;
          }
        }

        @media (max-width: 920px) {
          nav {
            padding:
              calc(14px + var(--safe-area-top))
              calc(20px + var(--safe-area-right))
              14px
              calc(20px + var(--safe-area-left)) !important;
            min-height: calc(74px + var(--safe-area-top));
            background: rgba(255, 255, 255, 0.94) !important;
            backdrop-filter: blur(18px) !important;
            box-shadow: 0 1px 0 var(--slate) !important;
          }

          .brand-word,
          .desktop-links,
          .desktop-actions {
            display: none;
          }

          .brand-logo {
            display: block;
          }

          .mobile-menu-button {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 1px solid var(--slate);
            color: var(--ink);
            background: rgba(255, 255, 255, 0.72);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 12px 30px rgba(13, 33, 55, 0.08);
          }

          .mobile-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9001;
            display: block;
            pointer-events: none;
            opacity: 0;
            background: rgba(7, 20, 32, 0.42);
            transition: opacity 0.28s ease;
          }

          .mobile-backdrop.open {
            pointer-events: auto;
            opacity: 1;
          }

          .mobile-drawer {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 9002;
            width: min(360px, 86vw);
            height: 100dvh;
            padding:
              calc(24px + var(--safe-area-top))
              calc(24px + var(--safe-area-right))
              calc(24px + var(--safe-area-bottom))
              24px;
            display: flex;
            flex-direction: column;
            background: rgba(244, 248, 252, 0.98);
            border-left: 1px solid var(--slate);
            box-shadow: -24px 0 70px rgba(7, 20, 32, 0.22);
            transform: translateX(105%);
            visibility: hidden;
            pointer-events: none;
            transition:
              transform 0.34s cubic-bezier(0.25, 1, 0.5, 1),
              visibility 0s linear 0.34s;
          }

          .mobile-drawer.open {
            transform: translateX(0);
            visibility: visible;
            pointer-events: auto;
            transition:
              transform 0.34s cubic-bezier(0.25, 1, 0.5, 1),
              visibility 0s;
          }

          .drawer-header {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            min-height: 52px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--slate);
          }

          .drawer-close {
            width: 44px;
            height: 44px;
            border-radius: 999px;
            border: 1px solid var(--slate);
            color: var(--ink);
            background: var(--white);
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .drawer-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 32px 0;
          }

          .drawer-link {
            min-height: 66px;
            padding: 0 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--ink);
            font-size: 0.82rem;
            font-weight: 600;
            letter-spacing: 0.18em;
            text-decoration: none;
            text-transform: uppercase;
            border: 1px solid rgba(220, 232, 242, 0.95);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.64);
            box-shadow: 0 12px 28px rgba(13, 33, 55, 0.05);
          }

          .drawer-link.active {
            color: var(--sky);
            border-color: rgba(26, 184, 232, 0.34);
            background: rgba(26, 184, 232, 0.08);
          }

          .drawer-actions {
            margin-top: auto;
            display: grid;
            gap: 14px;
          }

          .drawer-signin {
            min-height: 54px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--blue);
            font-size: 0.72rem;
            font-weight: 600;
            letter-spacing: 0.14em;
            text-decoration: none;
            text-transform: uppercase;
            border: 1px solid var(--slate);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.72);
          }

          .drawer-primary {
            width: 100%;
            text-align: center;
            padding: 15px 24px;
          }
        }
      `}</style>
    </nav>
  );
}
