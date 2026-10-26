import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FarmingTools from '@/components/FarmingTools';
import styles from '@/components/FarmingTools.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Free General Shrimp Farm Calculator | Shrimply' },
  description: 'One free farm calculator for vannamei shrimp size, standing biomass, apparent feed conversion ratio, and estimated harvest revenue, with practical farming guides.',
  alternates: { canonical: '/tools', languages: { en: '/tools', id: '/id/tools' } },
};

export default function ToolsPage() {
  return <main className={styles.page}><Navbar /><FarmingTools locale="en" /><Footer /></main>;
}
