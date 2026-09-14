"use client";

import React from 'react';
import Link from 'next/link';

const productLinks = [
  { href: '/pricing', label: 'Pricing & Subscriptions (EN)' },
  { href: '/vi/shrimp-farm-management-software', label: 'Phần mềm quản lý trang trại tôm' },
  { href: '/vi/vannamei-shrimp-farming-app', label: 'Ứng dụng nuôi tôm thẻ chân trắng' },
];

const companyLinks = [
  { href: '/vi/resources', label: 'Cẩm nang nuôi tôm' },
  { href: '/vi/about', label: 'Về chúng tôi' },
  { href: '/vi/how-it-works', label: 'Cách hoạt động' },
  { href: '/vi/orson', label: 'Orson AI' },
  { href: '/privacy', label: 'Chính sách bảo mật' },
];

export default function FooterVI() {
  return (
    <footer className="site-footer" style={{ background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)', padding: '80px 52px 44px', color: 'var(--muted)' }}>
      <div className="container site-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '60px' }}>
        <div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '2rem', fontWeight: 600, color: 'var(--white)', marginBottom: '16px' }}>
            Shrimply
          </div>
          <p style={{ maxWidth: '280px', marginBottom: '24px', fontSize: '0.94rem', lineHeight: 1.8 }}>
            Nền tảng trí tuệ nhân tạo toàn diện cho nuôi trồng thủy sản, định hình tương lai của ngành tôm bền vững.
          </p>
          <p style={{ fontSize: '0.72rem' }}>
            © 2026 Shrimply Technologies.
          </p>
          <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>English</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/id" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Bahasa Indonesia</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/th" style={{ color: 'var(--muted)', textDecoration: 'none' }}>ภาษาไทย</Link>
            <span style={{ opacity: 0.4 }}>•</span>
            <Link href="/vi" style={{ color: 'var(--white)', fontWeight: 600, textDecoration: 'none' }}>Tiếng Việt</Link>
          </div>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--white)', marginBottom: '24px', fontWeight: 600 }}>
            Sản phẩm
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
            Công ty
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
