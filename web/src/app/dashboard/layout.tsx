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
  X,
  Bell,
  ChevronRight,
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
      ?.querySelector<HTMLElement>('[aria-label="Close dashboard navigation"]')
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
          text-rendering: geometricPrecision;
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
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .sidebar-link:hover {
          transform: translateX(4px);
          background: var(--bg-mid) !important;
        }
        .sidebar-link.active {
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
        }
        @media (max-width: 1023px) {
          .mobile-trigger-hide {
            display: none !important;
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

        <div style={{ height: '80px', margin: '0 -16px 20px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--shell-border)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/shrimplylogo_v2.webp"
              width="500"
              height="160"
              alt="Shrimply"
              style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="mobile-trigger"
            aria-label="Close dashboard navigation"
            style={{ background: 'var(--bg-mid)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '10px', borderRadius: '10px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          onClick={() => router.push('/dashboard/company')}
          style={{
            margin: '0 4px 32px',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(241, 245, 249, 0.5)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <Waves size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 650, color: '#1e293b', marginBottom: '2px' }}>
              {company?.companyName || 'Company profile'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>
              {company?.farmType || 'Open company details'}
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {Object.entries(visibleNavigation).map(([groupKey, items]) => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 650, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 12px 10px', fontFamily: 'var(--jakarta)' }}>
                {sectionLabels[groupKey] || groupKey.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {items.map((item) => {
                const ItemIcon = item.icon;
                if (isNavGroup(item)) {
                  const isExpanded = expandedGroups.includes(item.id);
                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        onClick={() => toggleGroup(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          fontSize: '0.9rem',
                          borderRadius: '14px',
                          fontWeight: 550,
                          color: '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          width: '100%',
                          textAlign: 'left'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ItemIcon size={20} color="#94a3b8" strokeWidth={2} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                      </button>

                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '32px', marginTop: '4px', gap: '4px' }}>
                          {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '0.85rem',
                                  textDecoration: 'none',
                                  borderRadius: '10px',
                                  fontWeight: isChildActive ? 650 : 500,
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      borderRadius: '14px',
                      fontWeight: isActive ? 650 : 550,
                      color: isActive ? '#1e293b' : '#64748b',
                      background: isActive ? '#f1f5f9' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ItemIcon size={20} color={isActive ? '#1e293b' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px 16px', opacity: 0.6 }} />
          <button
            onClick={handleSignOut}
            className="sidebar-link"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 22px',
              color: '#ef4444', background: 'transparent', border: 'none', width: '100%',
              fontSize: '0.95rem', fontWeight: 650, borderRadius: 'var(--radius-md)'
            }}
          >
            <LogOut size={20} strokeWidth={2.5} />
            <span>{getString(t.auth.signOut, 'Logout')}</span>
          </button>
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
          background: 'rgba(255,255,255,0.82)',
          borderBottom: '1px solid var(--shell-border)',
          backdropFilter: 'blur(18px)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '4px 8px', background: 'var(--primary-dim)', borderRadius: '999px', lineHeight: 1 }}>
                  {currentNavMeta.section}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="dashboard-header-title" style={{ fontSize: '1.34rem', lineHeight: 1.08, color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentNavMeta.title}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="dashboard-header-date mobile-trigger-hide" title={todayLabel}>
              <CalendarDays size={17} />
              <span>{todayLabel}</span>
            </div>

            <div className="dashboard-header-divider" style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

            <div className="dashboard-profile-button" style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '8px 10px 8px 16px', borderRadius: '16px', background: '#FFF', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)' }}>
              <div style={{ textAlign: 'right' }} className="mobile-trigger-hide">
                <div style={{ fontSize: '0.85rem', fontWeight: 650, color: 'var(--text-primary)' }}>{user?.name || 'Captain'}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>{getString((company as Record<string, unknown> | null | undefined)?.role || (user as Record<string, unknown> | null | undefined)?.role, 'Farmer')}</div>
              </div>
              <div className="dashboard-profile-avatar" style={{
                width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                fontWeight: 700, fontSize: '16px', border: '2px solid white', boxShadow: 'var(--shadow-card)'
              }}>
                {(user?.name?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-main-scroll" style={{
          flex: 1,
          padding: '16px 40px 40px',
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
