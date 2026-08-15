"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCompanyProfileCompletion, type CompanyProfileLike } from '../../../../shared/onboarding';
import styles from './DashboardOnboardingCard.module.css';

interface DashboardOnboardingCardProps {
  company?: CompanyProfileLike | null;
}

export default function DashboardOnboardingCard({ company }: DashboardOnboardingCardProps) {
  const { t } = useLanguage();
  const percent = getCompanyProfileCompletion(company);

  if (!company || percent >= 100) return null;

  return (
    <section className={styles.card} aria-labelledby="dashboard-onboarding-title">
      <div className={styles.copy}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{t.onboardingProgress.company}</span>
          <span className={styles.percent}>{percent}%</span>
        </div>
        <strong className={styles.title} id="dashboard-onboarding-title">
          {t.onboardingProgress.profileIncomplete}
        </strong>
        <p className={styles.detail}>{t.onboardingProgress.profileIncompleteDetail}</p>
      </div>

      <Link className={styles.action} href="/dashboard/settings">
        {t.onboardingProgress.completeProfile}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={t.onboardingProgress.profileIncomplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className={styles.progressValue} style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}
