"use client";

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)', padding: '80px 52px 44px', color: 'var(--muted)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '60px' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 600, color: 'var(--white)', marginBottom: '16px' }}>
            Shrimply
          </div>
          <p style={{ maxWidth: '280px', marginBottom: '24px', fontSize: '0.94rem', lineHeight: 1.8 }}>
            The all-in-one aquaculture intelligence platform powering the future of sustainable farming.
          </p>
          <p style={{ fontSize: '0.72rem' }}>
            © 2026 Shrimply Technologies.
          </p>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--white)', marginBottom: '24px' }}>
            Product
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/#platform" style={{ fontSize: '0.94rem' }}>Features</Link>
            <Link href="/how-it-works" style={{ fontSize: '0.94rem' }}>How It Works</Link>
            <Link href="/auth" style={{ fontSize: '0.94rem' }}>App</Link>
          </div>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--white)', marginBottom: '24px' }}>
            Company
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/about" style={{ fontSize: '0.94rem' }}>About</Link>
            <Link href="/auth" style={{ fontSize: '0.94rem' }}>Contact</Link>
            <Link href="/#" style={{ fontSize: '0.94rem' }}>Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
