'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  CreditCard,
  Headphones,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import styles from '@/app/admin/admin.module.css';

const items = [
  { label: 'Command Center', icon: LayoutGrid, href: '/dashboard/admin' },
  { label: 'Users', icon: Users, active: true },
  { label: 'Farms', icon: Building2 },
  { label: 'Subscriptions', icon: CreditCard },
  { label: 'Support', icon: Headphones },
  { label: 'Security', icon: ShieldCheck },
  { label: 'Audit Log', icon: ListChecks },
];

interface AdminSidebarProps {
  ownerName: string;
  ownerEmail: string;
  onSignOut: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ ownerName, ownerEmail, onSignOut, collapsed, onToggle }: AdminSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Shrimply Admin navigation">
      <div className={styles.brandRow}>
        <Link href="/admin" className={styles.brand} aria-label="Shrimply Admin home">
          <Image className={styles.brandLogo} src="/shrimplylogo_v2.webp" width={500} height={160} alt="Shrimply" priority />
        </Link>
        <button type="button" className={styles.sidebarToggle} onClick={onToggle} aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'} aria-expanded={!collapsed} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
          <Menu size={20} />
        </button>
      </div>
      <nav className={styles.navList}>
        {items.map(({ label, icon: Icon, active, href }) => href ? (
          <Link key={label} href={href} className={styles.navItem} style={{ cursor: 'pointer', textDecoration: 'none' }} title={label}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ) : (
          <button type="button" key={label} className={`${styles.navItem} ${active ? styles.navItemActive : ''}`} aria-current={active ? 'page' : undefined} aria-disabled={!active} title={active ? label : `${label} is outside the current User Intelligence MVP`}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className={styles.ownerCard}>
        <span className={styles.avatarSmall}>{ownerName.slice(0, 2).toUpperCase()}</span>
        <span className={styles.ownerCopy}>
          <strong>{ownerName}</strong>
          <span>{ownerEmail}</span>
        </span>
        <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export function MobilePanelButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className={styles.mobilePanelButton} onClick={onClick}>{children}</button>;
}
