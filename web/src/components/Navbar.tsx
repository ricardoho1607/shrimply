"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' },
  { href: '/#download', label: 'Download App' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    return pathname === href;
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
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
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="desktop-actions">
        <Link href="/auth" className="signin-link">
          Sign In
        </Link>
        <Link href="/auth/join" className="btn-primary get-started-link">
          Get Started
        </Link>
      </div>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen(current => !current)}
      >
        {menuOpen ? <X size={21} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
      </button>

      <button
        className={`mobile-backdrop ${menuOpen ? 'open' : ''}`}
        type="button"
        aria-label="Close navigation menu"
        onClick={closeMenu}
      />

      <aside
        id="mobile-navigation"
        className={`mobile-drawer ${menuOpen ? 'open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="drawer-header">
          <button className="drawer-close" type="button" aria-label="Close navigation menu" onClick={closeMenu}>
            <X size={20} strokeWidth={1.8} />
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
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="drawer-actions">
          <Link
            href="/auth"
            className="drawer-signin"
            style={{
              minHeight: '54px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue)',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textDecoration: 'none',
              textTransform: 'uppercase',
              border: '1px solid var(--slate)',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.72)',
            }}
            onClick={closeMenu}
          >
            Sign In
          </Link>
          <Link
            href="/auth/join"
            className="btn-primary drawer-primary"
            style={{
              width: '100%',
              minHeight: '54px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
            onClick={closeMenu}
          >
            Get Started
          </Link>
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
          gap: 32px;
          align-items: center;
        }

        .desktop-actions {
          display: flex;
          gap: 24px;
          align-items: center;
        }

        .signin-link {
          color: var(--blue);
          font-weight: 500;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-decoration: none;
        }

        .get-started-link {
          padding: 10px 24px;
        }

        .mobile-menu-button,
        .drawer-close,
        .mobile-backdrop {
          display: none;
        }

        .mobile-drawer {
          display: none;
        }

        @media (max-width: 920px) {
          nav {
            padding: 14px 20px !important;
            min-height: 74px;
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
            height: 100vh;
            padding: 24px;
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
            width: 42px;
            height: 42px;
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
