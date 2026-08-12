"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCompanyProfileCompletion, type CompanyProfileLike } from '../../../shared/onboarding';

interface ProfileCompletionCardProps {
  company?: CompanyProfileLike | null;
  href?: string;
}

export default function ProfileCompletionCard({ company, href = '/dashboard/settings' }: ProfileCompletionCardProps) {
  const { t } = useLanguage();
  const percent = getCompanyProfileCompletion(company);
  if (!company || percent >= 100) return null;

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        padding: '16px 18px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        background: '#FFFFFF',
        boxShadow: '0 12px 30px rgba(15, 76, 117, 0.06)',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{
          width: '72px', height: '72px', flex: '0 0 72px', borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: `conic-gradient(var(--secondary) ${percent * 3.6}deg, #E7F0F6 0deg)`, position: 'relative',
        }}
      >
        <span style={{ position: 'absolute', inset: '7px', borderRadius: '50%', background: '#FFFFFF' }} />
        <strong style={{ position: 'relative', color: 'var(--primary)', fontSize: '15px' }}>{percent}%</strong>
      </div>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '15px' }}>{t.onboardingProgress.profileIncomplete}</strong>
        <span style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.55 }}>
          {t.onboardingProgress.profileIncompleteDetail}
        </span>
        <span style={{ display: 'block', marginTop: '8px', color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>
          {t.onboardingProgress.completeProfile}
        </span>
      </div>
      <ArrowRight size={19} color="var(--secondary)" />
    </Link>
  );
}
