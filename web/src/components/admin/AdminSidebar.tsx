'use client';

import {
  Building2,
  CreditCard,
  Headphones,
  LayoutGrid,
  ListChecks,
  LogOut,
  PanelLeft,
  ShieldCheck,
  Users,
} from 'lucide-react';
import styles from '@/app/admin/admin.module.css';

interface AdminSidebarProps {
  ownerName: string;
  ownerEmail: string;
  onSignOut: () => void;
  collapsed: boolean;
  onToggle: () => void;
  activeView?: 'overview' | 'user';
  onNavigate?: (view: 'overview' | 'user') => void;
}

export function AdminSidebar({
  ownerName,
  ownerEmail,
  onSignOut,
  collapsed,
  onToggle,
  activeView = 'overview',
  onNavigate,
}: AdminSidebarProps) {
  const items = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutGrid, active: activeView === 'overview' },
    { id: 'user' as const, label: 'User Database', icon: Users, active: activeView === 'user' },
    { id: 'farms' as const, label: 'Farms', icon: Building2, active: false },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard, active: false },
    { id: 'support' as const, label: 'Support', icon: Headphones, active: false },
    { id: 'security' as const, label: 'Security', icon: ShieldCheck, active: false },
    { id: 'audit' as const, label: 'Audit Log', icon: ListChecks, active: false },
  ];

  return (
    <aside className={styles.sidebar} aria-label="Shrimply Admin navigation">
      <div className={styles.brandRow}>
        <span className={styles.avatarSmall}>{ownerName.slice(0, 2).toUpperCase()}</span>
        <span className={styles.ownerCopy}>
          <strong>Admin</strong>
          <span>{ownerEmail || 'Authenticated owner'}</span>
        </span>
        <button type="button" className={styles.sidebarToggle} onClick={onToggle} aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'} aria-expanded={!collapsed} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
          <PanelLeft size={18} />
        </button>
      </div>
      <nav className={styles.navList}>
        <span className={styles.navSectionLabel}>Owner operations</span>
        {items.map((item) => {
          const Icon = item.icon;
          const isView = item.id === 'overview' || item.id === 'user';

          return (
            <button
              type="button"
              key={item.label}
              onClick={() => isView && onNavigate?.(item.id)}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}
              aria-current={item.active ? 'page' : undefined}
              style={{ cursor: isView ? 'pointer' : 'default' }}
              title={item.label}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <button
          type="button"
          onClick={onSignOut}
          className={styles.sidebarSignOutBtn}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
