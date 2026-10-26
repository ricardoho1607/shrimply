import type { Metadata } from 'next';
import NavbarID from '@/components/NavbarID';
import FooterID from '@/components/FooterID';
import FarmingTools from '@/components/FarmingTools';
import styles from '@/components/FarmingTools.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Kalkulator Tambak Udang Vaname Gratis | Shrimply' },
  description: 'Hitung size udang, biomassa kolam, FCR, dan estimasi pendapatan panen. Kalkulator gratis dengan panduan praktis budidaya vaname.',
  alternates: { canonical: '/id/tools', languages: { en: '/tools', id: '/id/tools' } },
};

export default function ToolsPageID() {
  return <main className={styles.page}><NavbarID /><FarmingTools locale="id" /><FooterID /></main>;
}
