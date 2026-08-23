"use client";

import React from 'react';
import Link from 'next/link';

const productLinks = [
  { href: '/th/shrimp-farm-management-software', label: 'ซอฟต์แวร์ฟาร์มกุ้ง' },
  { href: '/th/vannamei-shrimp-farming-app', label: 'แอปเลี้ยงกุ้งแวนนาไม' },
];

const companyLinks = [
  { href: '/th/about', label: 'เกี่ยวกับเรา' },
  { href: '/th/how-it-works', label: 'วิธีใช้งาน' },
  { href: '/th/orson', label: 'Orson AI' },
];

export default function FooterTH() {
  return (
    <footer className="site-footer" style={{ background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)', padding: '80px 52px 44px', color: 'var(--muted)' }}>
      <div className="container site-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '60px' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 600, color: 'var(--white)', marginBottom: '16px' }}>
            Shrimply
          </div>
          <p style={{ maxWidth: '280px', marginBottom: '24px', fontSize: '0.94rem', lineHeight: 1.8 }}>
            แพลตฟอร์มปัญญาประดิษฐ์สำหรับการเพาะเลี้ยงสัตว์น้ำครบวงจร ขับเคลื่อนอนาคตของการเลี้ยงกุ้งอย่างยั่งยืน
          </p>
          <p style={{ fontSize: '0.72rem' }}>
            © 2026 Shrimply Technologies.
          </p>
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>English</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/id" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Bahasa Indonesia</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/th" style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>ภาษาไทย</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/vi" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Tiếng Việt</Link>
          </div>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: '24px', fontWeight: 600 }}>
            ผลิตภัณฑ์
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {productLinks.map(link => (
              <Link href={link.href} style={{ fontSize: '0.94rem' }} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: '24px', fontWeight: 600 }}>
            บริษัท
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {companyLinks.map(link => (
              <Link href={link.href} style={{ fontSize: '0.94rem' }} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
