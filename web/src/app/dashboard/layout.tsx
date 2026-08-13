"use client";

import React, { useState, useEffect, useRef } from 'react';
import AppProviders from '@/components/AppProviders';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRequiredSetupRoute } from '@/config/routes';
import {
  LayoutDashboard,
  Waves,
  BrainCircuit,
  History,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Droplets,
  Store,
  Map,
  Wallet,
  FileText,
  Box,
  ChevronDown,
  Loader2,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

/* --- Navigation Config --------------------------------------- */

type TranslationSection = Record<string, string | undefined>;
type DashboardTranslations = {
  auth: TranslationSection;
  companyDetails?: TranslationSection;
  finance: TranslationSection;
  financialReports: TranslationSection;
  cycleReport: { archiveTitle?: string };
  nav: TranslationSection;
  sidebar: TranslationSection;
};
type NavChild = { label: string; href: string };
type BaseNavItem = {
  label: string;
  icon: LucideIcon;
};
type NavLinkItem = BaseNavItem & { href: string; id?: never; children?: never };
type NavGroupItem = BaseNavItem & { id: string; children: NavChild[]; href?: never };
type NavItem = NavLinkItem | NavGroupItem;
type NavigationGroups = Record<'management' | 'appServices' | 'business' | 'system', NavItem[]>;

const getString = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() ? value : fallback);

const NAV_STRUCTURE = (t: DashboardTranslations): NavigationGroups => ({
  management: [
    { label: getString(t.nav.home, 'Home'), icon: LayoutDashboard, href: '/dashboard' },
    { label: getString(t.nav.ponds, 'Ponds'), icon: Waves, href: '/dashboard/ponds' },
    { label: getString(t.nav.waterQuality, 'Water Quality'), icon: Droplets, href: '/dashboard/water' },
    { label: getString(t.nav.feed, 'Feed'), icon: History, href: '/dashboard/feed' },
    { label: getString(t.nav.harvest, 'Harvest'), icon: Wallet, href: '/dashboard/harvest' },
  ],
  appServices: [
    { label: getString(t.nav.marketplace, 'Marketplace'), icon: Store, href: '/dashboard/marketplace' },
    { label: getString(t.nav.diseaseReport, 'Disease Report'), icon: Map, href: '/dashboard/disease' },
    { label: getString(t.sidebar.aiAssistant, 'Orson AI'), icon: BrainCircuit, href: '/dashboard/ai' },
    { label: getString(t.nav.notifications, 'Notifications'), icon: Bell, href: '/dashboard/notifications' },
  ],
  business: [
    { label: getString(t.finance.title, 'Finance'), icon: Wallet, href: '/dashboard/finance' },
    {
      label: 'Reports',
      icon: FileText,
      id: 'reports',
      children: [
        { label: getString(t.financialReports.title, 'Financial Reports'), href: '/dashboard/reports/financial' },
        { label: getString(t.nav.shrimpReports, 'Sampling Reports'), href: '/dashboard/reports/shrimp' },
        { label: getString(t.cycleReport.archiveTitle, 'Cycle Reports'), href: '/dashboard/reports/cycles' },
        { label: getString(t.financialReports.harvestProjection, 'Harvest Projections'), href: '/dashboard/projections' },
      ]
    },
    {
      label: 'Inventory',
      icon: Box,
      id: 'inventory',
      children: [
        { label: getString(t.nav.inventoryFeeds, 'Feeds & Additives'), href: '/dashboard/inventory/feeds' },
        { label: 'Treatment Mixes', href: '/dashboard/inventory/treatment-mixes' },
        { label: getString(t.nav.inventoryAssets, 'Assets'), href: '/dashboard/inventory/assets' },
      ]
    },
  ],
  system: [
    { label: getString(t.nav.settings, 'Settings'), icon: Settings, href: '/dashboard/settings' },
  ]
});

function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage() as { t: DashboardTranslations };
  const { user, company, needsRoleSelection, needsSetup, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopNavigation, setDesktopNavigation] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['reports', 'inventory']);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const navigation = NAV_STRUCTURE(t);
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
  const isMechanic = user?.role === 'mechanic';
  const isNavLink = (item: NavItem): item is NavLinkItem => 'href' in item;
  const isNavGroup = (item: NavItem): item is NavGroupItem => Array.isArray((item as { children?: NavChild[] }).children);
  const visibleNavigation = isMechanic ? {
    management: navigation.management.filter((item): item is NavLinkItem => isNavLink(item) && ['/dashboard', '/dashboard/ponds'].includes(item.href)),
    appServices: navigation.appServices.filter((item): item is NavLinkItem => isNavLink(item) && ['/dashboard/ai', '/dashboard/notifications'].includes(item.href)),
    business: [
      {
        label: 'Inventory',
        icon: Box,
        id: 'inventory',
        children: [
          { label: getString(t.nav.inventoryAssets, 'Assets'), href: '/dashboard/inventory/assets' },
        ],
      },
    ],
    system: navigation.system,
  } : navigation;

  const sectionLabels: Record<string, string> = {
    management: 'Management',
    appServices: 'App Services',
    business: 'Business',
    system: 'System',
  };

  const currentNavMeta = (() => {
    if (pathname === '/dashboard/company') {
      return {
        section: 'Management',
        title: getString(t.companyDetails?.title, 'Company Details'),
      };
    }

    for (const [groupKey, items] of Object.entries(visibleNavigation)) {
      for (const item of items) {
        if (
          isNavLink(item)
          && (
            pathname === item.href
            || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
          )
        ) {
          return {
            section: sectionLabels[groupKey] || groupKey,
            title: item.label,
          };
        }
        if (isNavGroup(item)) {
          const matchingChild = item.children.find((child) =>
            pathname === child.href || pathname.startsWith(`${child.href}/`)
          );
          if (matchingChild) {
            return {
              section: sectionLabels[groupKey] || groupKey,
              title: matchingChild.label,
            };
          }
        }
      }
    }

    return {
      section: 'Management',
      title: 'Dashboard',
    };
  })();

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (needsRoleSelection) {
      router.push('/roleselection');
      return;
    }
    if (needsSetup) {
      router.push(getRequiredSetupRoute(user?.role));
      return;
    }
  }, [isAuthenticated, needsRoleSelection, needsSetup, loading, router, user?.role]);

  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncNavigationMode = () => setDesktopNavigation(mediaQuery.matches);
    syncNavigationMode();
    mediaQuery.addEventListener('change', syncNavigationMode);
    return () => mediaQuery.removeEventListener('change', syncNavigationMode);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const sidebarTrigger = sidebarTriggerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    sidebarRef.current
      ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      sidebarTrigger?.focus();
    };
  }, [isSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary)" />
    </div>
  );

  if (pathname?.startsWith('/dashboard/admin')) {
    return <>{children}</>;
  }

  return (
    <div className="dashboard-saas" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-dark)', position: 'relative' }}>
      <style jsx global>{`
        .dashboard-saas,
        .dashboard-saas :where(h1, h2, h3, h4, h5, h6, p, span, a, button, input, select, textarea, label, div) {
          font-family: var(--jakarta) !important;
        }
        .dashboard-saas {
          font-feature-settings: "cv02", "cv03", "cv04", "cv11";
          -webkit-font-smoothing: antialiased;
          font-size: var(--text-body);
          font-weight: var(--weight-regular);
          line-height: var(--leading-body);
        }
        .dashboard-saas .glass-card {
          border-radius: var(--radius-card);
        }
        .dashboard-saas .responsive-modal {
          max-height: calc(100dvh - 48px);
          border-radius: var(--radius-modal);
        }
        .dashboard-saas :where(input:not([type="checkbox"]):not([type="radio"]), select) {
          min-height: var(--control-md);
          border-radius: var(--radius-control) !important;
          font-size: var(--text-body);
          font-weight: var(--weight-regular);
        }
        .dashboard-saas textarea {
          border-radius: var(--radius-control) !important;
          font-size: var(--text-body);
          font-weight: var(--weight-regular);
        }
        @media (min-width: 1024px) {
          .sidebar {
            position: sticky !important;
            transform: none !important;
            top: 0 !important;
            height: 100vh !important;
          }
          .mobile-trigger {
            display: none !important;
          }
        }
        .sidebar-link {
          transition: background-color 0.16s ease, color 0.16s ease !important;
        }
        .sidebar-link:hover {
          background: var(--bg-mid) !important;
          color: var(--text-primary) !important;
          transform: none !important;
        }
        .sidebar-link.active {
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
        }
        .dashboard-profile-button {
          transition: background-color 0.16s ease !important;
        }
        .dashboard-profile-button:hover {
          background: var(--bg-mid) !important;
        }
        .mobile-trigger {
          background: transparent !important;
          transition: background-color 0.16s ease, color 0.16s ease !important;
        }
        .mobile-trigger:hover,
        .mobile-trigger:focus-visible {
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
        }
        @media (max-width: 1023px) {
          .mobile-trigger-hide {
            display: none !important;
          }
          .dashboard-main-scroll {
            padding: var(--space-6) var(--space-8) var(--space-10) !important;
          }
          .inventory-dashboard-split {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-main-scroll {
            padding: var(--space-5) var(--space-4) var(--space-8) !important;
          }
        }
      `}</style>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)', zIndex: 40, cursor: 'pointer', width: '100%', height: '100%'
          }}
        />
      )}

      <aside
        ref={sidebarRef}
        id="dashboard-navigation"
        role={isSidebarOpen ? 'dialog' : 'navigation'}
        aria-modal={isSidebarOpen ? true : undefined}
        aria-label="Dashboard navigation"
        aria-hidden={!(isDesktopNavigation || isSidebarOpen)}
        inert={!(isDesktopNavigation || isSidebarOpen) ? true : undefined}
        className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}
        style={{
        width: '280px',
        padding: '0 16px 24px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#FFF',
        borderRight: '1px solid var(--shell-border-strong)',
        boxShadow: '20px 0 80px rgba(15, 76, 117, 0.04)'
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', padding: '12px 4px 0 0' }}>
          <Link
            href="/dashboard/company"
            className={`sidebar-link ${pathname === '/dashboard/company' ? 'active' : ''}`}
            aria-current={pathname === '/dashboard/company' ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              minHeight: '40px',
              padding: '8px 12px',
              borderRadius: '10px',
              color: pathname === '/dashboard/company' ? '#1e293b' : '#64748b',
              background: pathname === '/dashboard/company' ? '#f1f5f9' : 'transparent',
              textDecoration: 'none',
            }}
          >
            <Waves size={18} color={pathname === '/dashboard/company' ? '#1e293b' : '#94a3b8'} strokeWidth={pathname === '/dashboard/company' ? 2.5 : 2} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ overflow: 'hidden', color: 'inherit', fontSize: '0.8rem', fontWeight: pathname === '/dashboard/company' ? 600 : 500, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company?.companyName || 'Company profile'}
              </div>
              <div style={{ overflow: 'hidden', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {company?.farmType || 'Open company details'}
              </div>
            </div>
            <Search size={14} color="#94a3b8" aria-hidden="true" />
          </Link>

          {Object.entries(visibleNavigation).map(([groupKey, items]) => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 10px 6px', fontFamily: 'var(--jakarta)' }}>
                {sectionLabels[groupKey] || groupKey.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {items.map((item) => {
                const ItemIcon = item.icon;
                if (isNavGroup(item)) {
                  const isExpanded = expandedGroups.includes(item.id);
                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        className="sidebar-link"
                        onClick={() => toggleGroup(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '40px',
                          padding: '8px 12px',
                          background: 'transparent',
                          border: 'none',
                          fontSize: '0.8rem',
                          borderRadius: '10px',
                          fontWeight: 500,
                          color: '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          width: '100%',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <ItemIcon size={18} color="#94a3b8" strokeWidth={2} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                      </button>

                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '28px', marginTop: '2px', gap: '2px' }}>
                          {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="sidebar-link"
                                style={{
                                  minHeight: '34px',
                                  padding: '7px 12px',
                                  fontSize: '0.76rem',
                                  textDecoration: 'none',
                                  borderRadius: '8px',
                                  fontWeight: isChildActive ? 600 : 500,
                                  color: isChildActive ? '#1e293b' : '#64748b',
                                  background: isChildActive ? '#f1f5f9' : 'transparent',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="sidebar-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '40px',
                      padding: '8px 12px',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      borderRadius: '10px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1e293b' : '#64748b',
                      background: isActive ? '#f1f5f9' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ItemIcon size={18} color={isActive ? '#1e293b' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {groupKey === 'system' && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="sidebar-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    minHeight: '40px',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={18} strokeWidth={2} />
                  <span>{getString(t.auth.signOut, 'Logout')}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div
        className="dashboard-content-shell"
        aria-hidden={isSidebarOpen || undefined}
        inert={isSidebarOpen ? true : undefined}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100dvh', overflow: 'hidden' }}
      >
        <header className="dashboard-app-header" style={{
          height: '80px',
          background: 'var(--bg-dark)',
          borderBottom: 'none',
          backdropFilter: 'none',
          padding: '12px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          gap: '24px',
        }}>
          <div className="dashboard-header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
            <button
              ref={sidebarTriggerRef}
              onClick={() => setSidebarOpen(true)}
              className="mobile-trigger"
              aria-label="Open dashboard navigation"
              aria-expanded={isSidebarOpen}
              aria-controls="dashboard-navigation"
              style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--primary)' }}
            >
              <Menu size={24} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div className="dashboard-header-title" style={{ fontSize: '1.34rem', lineHeight: 1.08, color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentNavMeta.title}
                </div>
              </div>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {currentNavMeta.section}
              </span>
            </div>
          </div>

          <div className="dashboard-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="dashboard-header-date mobile-trigger-hide" title={todayLabel} style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '0 8px' }}>
              <CalendarDays size={17} />
              <span>{todayLabel}</span>
            </div>

            <Link href="/dashboard/settings" className="dashboard-profile-button" aria-label="Open account settings" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '10px', background: 'transparent', color: 'inherit', textDecoration: 'none' }}>
              <div style={{ textAlign: 'right' }} className="mobile-trigger-hide">
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name || 'Captain'}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 500, color: '#94a3b8', lineHeight: 1.2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getString((company as Record<string, unknown> | null | undefined)?.role || (user as Record<string, unknown> | null | undefined)?.role, 'Farmer')}</div>
              </div>
              <div className="dashboard-profile-avatar" style={{
                width: '38px', height: '38px', borderRadius: '10px', background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                fontWeight: 600, fontSize: '14px'
              }}>
                {(user?.name?.[0] || 'U').toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        <main className="dashboard-main-scroll" style={{
          flex: 1,
          padding: '24px 40px 40px',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          overflowY: 'auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <DashboardLayoutShell>{children}</DashboardLayoutShell>
    </AppProviders>
  );
}
