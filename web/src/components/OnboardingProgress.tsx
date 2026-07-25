"use client";

import React from 'react';

interface OnboardingProgressProps {
  percent: number;
  title: string;
  detail: string;
}

export default function OnboardingProgress({ percent, title, detail }: OnboardingProgressProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <section
      aria-label={title}
      style={{
        width: 'min(680px, 100%)',
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '16px 18px',
        boxShadow: '0 12px 30px rgba(15, 76, 117, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safePercent}
          style={{
            width: '68px',
            height: '68px',
            flex: '0 0 68px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: `conic-gradient(var(--secondary) ${safePercent * 3.6}deg, #E7F0F6 0deg)`,
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: '#FFFFFF' }} />
          <strong style={{ position: 'relative', color: 'var(--primary)', fontSize: '14px' }}>{safePercent}%</strong>
        </div>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '14px' }}>{title}</strong>
          <span style={{ display: 'block', marginTop: '3px', color: 'var(--text-muted)', fontSize: '12px' }}>{detail}</span>
        </div>
      </div>
    </section>
  );
}
