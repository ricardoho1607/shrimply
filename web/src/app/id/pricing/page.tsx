import type { Metadata } from 'next';
import PricingPage from '@/components/PricingPage';
import { canonicalUrl } from '@/config/seo';

export const metadata: Metadata = {
  title: 'Harga Shrimply | Langganan Software Tambak per Perusahaan',
  description: 'Free: 10 kolam. Plus: 30 kolam mulai Rp150.000/bulan. Pro: 100 kolam mulai Rp450.000/bulan. Tanpa batas pengguna. Prabayar melalui Midtrans.',
  alternates: { canonical: canonicalUrl('/id/pricing'), languages: { en: canonicalUrl('/pricing'), id: canonicalUrl('/id/pricing') } },
};

export default function Page() { return <PricingPage locale="id" />; }
