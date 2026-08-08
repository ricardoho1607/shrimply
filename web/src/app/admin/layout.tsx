import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import AppProviders from '@/components/AppProviders';

export const metadata: Metadata = {
  title: 'User Intelligence · Shrimply Admin',
  description: 'Owner-only Shrimply account intelligence and operational support console.',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
