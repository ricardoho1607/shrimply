"use client";

import React from 'react';
import Link from 'next/link';

const productLinks = [
  { href: '/shrimp-farm-management-software', label: 'Farm Software' },
  { href: '/vannamei-shrimp-farming-app', label: 'Vannamei App' },
  { href: '/features/feed-inventory', label: 'Feed Inventory' },
  { href: '/features/water-quality-monitoring', label: 'Water Quality' },
  { href: '/features/growth-sampling', label: 'Growth Sampling' },
  { href: '/features/shrimp-harvest-tracking', label: 'Harvest Tracking' },
  { href: '/features/shrimp-farm-finance', label: 'Farm Finance' },
  { href: '/features/disease-alerts', label: 'Disease Alerts' },
];

const companyLinks = [
  { href: '/resources', label: 'Education Hub' },
  { href: '/about', label: 'About' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/orson', label: 'Orson AI' },
];

export default function Footer() {
  return (
    <footer className="site-footer" style={{ background: 'linear-gradient(160deg, var(--navy) 0%, var(--deep) 100%)', padding: '80px 52px 44px', color: 'var(--muted)' }}>
      <div className="container site-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '60px' }}>
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
            {productLinks.map(link => (
              <Link href={link.href} style={{ fontSize: '0.94rem' }} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--white)', marginBottom: '24px' }}>
            Company
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
