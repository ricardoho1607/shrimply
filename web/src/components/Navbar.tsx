"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {/* Brand */}
      <Link href="/" style={{ 
        fontFamily: 'var(--serif)', 
        fontSize: '1.65rem', 
        fontWeight: '600', 
        color: 'var(--ink)',
        textDecoration: 'none'
      }}>
        Shrimply
      </Link>

      {/* Navigation Links */}
      <div style={{ display: 'flex', gap: '32px' }}>
        <Link href="/" className="nav-link" style={pathname === '/' ? { color: 'var(--sky)' } : {}}>Home</Link>
        <Link href="/how-it-works" className="nav-link" style={pathname === '/how-it-works' ? { color: 'var(--sky)' } : {}}>How It Works</Link>
        <Link href="/about" className="nav-link" style={pathname === '/about' ? { color: 'var(--sky)' } : {}}>About</Link>
        <Link href="/#download" className="nav-link">Download App</Link>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link href="/auth" style={{ 
          color: 'var(--blue)', 
          fontWeight: '500', 
          fontSize: '0.72rem', 
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          textDecoration: 'none'
        }}>
          Sign In
        </Link>
        <Link href="/auth/join" className="btn-primary" style={{ padding: '10px 24px' }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}
