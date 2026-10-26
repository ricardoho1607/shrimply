import Link from 'next/link';
import styles from './FooterTools.module.css';

export default function FooterToolsLinks({ locale = 'en' }: { locale?: 'en' | 'id' }) {
  const isId = locale === 'id';
  const base = isId ? '/id' : '';
  return <div>
    <div className={styles.heading}>{isId ? 'Alat Bantu' : 'Tools'}</div>
    <nav className={styles.toolLinks} aria-label={isId ? 'Alat bantu tambak' : 'Farming tools'}>
      <Link href={`${base}/tools`}>{isId ? 'Kalkulator tambak' : 'General farm calculator'}</Link>
      <Link href={`${base}/resources/vannamei-feeding-rate#calculator`}>{isId ? 'Kalkulator pakan harian' : 'Daily feed calculator'}</Link>
      <Link href={`${base}/resources/vannamei-stocking-density#calculator`}>{isId ? 'Kalkulator padat tebar' : 'Stocking density calculator'}</Link>
    </nav>
  </div>;
}
