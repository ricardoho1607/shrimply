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
import type { AdminViewMode } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

interface AdminSidebarProps {
  ownerName: string;
  ownerEmail: string;
  onSignOut: () => void;
  collapsed: boolean;
  onToggle: () => void;
  activeView?: AdminViewMode;
  onNavigate?: (view: AdminViewMode) => void;
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
  const items: Array<{
    id: AdminViewMode;
    label: string;
    icon: typeof LayoutGrid;
    active: boolean;
    enabled: boolean;
    badge?: string;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, active: activeView === 'overview', enabled: true },
    { id: 'user', label: 'User Database', icon: Users, active: activeView === 'user', enabled: true },
    { id: 'farms', label: 'Farms', icon: Building2, active: activeView === 'farms', enabled: true },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, active: activeView === 'subscriptions', enabled: false, badge: 'Soon' },
    { id: 'support', label: 'Support', icon: Headphones, active: activeView === 'support', enabled: true },
    { id: 'security', label: 'Security', icon: ShieldCheck, active: activeView === 'security', enabled: true },
    { id: 'audit', label: 'Audit Log', icon: ListChecks, active: activeView === 'audit', enabled: true },
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

          return (
            <button
              type="button"
              key={item.label}
              onClick={() => item.enabled && onNavigate?.(item.id)}
              className={`${styles.navItem} ${item.active ? styles.navItemActive : ''} ${!item.enabled ? styles.navItemDisabled : ''}`}
              aria-current={item.active ? 'page' : undefined}
              style={{ cursor: item.enabled ? 'pointer' : 'not-allowed', opacity: item.enabled ? 1 : 0.6 }}
              title={item.badge ? `${item.label} (${item.badge})` : item.label}
              disabled={!item.enabled}
            >
              <Icon size={17} aria-hidden="true" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span className={styles.sidebarSoonBadge}>
                  {item.badge}
                </span>
              )}
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
