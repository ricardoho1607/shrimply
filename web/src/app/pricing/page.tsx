import type { Metadata } from 'next';
import PricingPage from '@/components/PricingPage';
import { canonicalUrl } from '@/config/seo';

export const metadata: Metadata = {
  title: 'Shrimply Pricing | Company Subscriptions in IDR',
  description: 'Free: 10 ponds. Plus: 30 ponds from Rp150,000/month. Pro: 100 ponds from Rp450,000/month. Per company, unlimited users. Prepaid via Midtrans.',
  alternates: { canonical: canonicalUrl('/pricing'), languages: { en: canonicalUrl('/pricing'), id: canonicalUrl('/id/pricing') } },
};

export default function Page() { return <PricingPage />; }
