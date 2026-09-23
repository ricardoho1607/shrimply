"use client";

import "@/app/globals.css";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { getRequiredSetupRoute } from '@/config/routes';
import { useNotificationChecker } from '@/hooks/useNotificationChecker';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import {
  Menu,
  ChevronDown,
  PanelLeft,
  CalendarDays,
} from 'lucide-react';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { DashboardIcon, type DashboardIconName } from '@/components/DashboardIcon';

/* --- Navigation Config --------------------------------------- */

type TranslationSection = Record<string, string | undefined>;
type DashboardTranslations = {
  auth: TranslationSection;
  companyDetails?: TranslationSection;
  finance: TranslationSection;
  financialReports: TranslationSection;
  dailyOperationsReports: TranslationSection;
  cycleReport: { archiveTitle?: string };
  nav: TranslationSection;
  sidebar: TranslationSection;
};
type NavChild = { label: string; href: string; icon: DashboardIconName };
type BaseNavItem = {
  label: string;
  icon: DashboardIconName;
};
type NavLinkItem = BaseNavItem & { href: string; id?: never; children?: never };
type NavGroupItem = BaseNavItem & { id: string; children: NavChild[]; href?: never };
type NavItem = NavLinkItem | NavGroupItem;
type NavigationGroups = Record<'management' | 'appServices' | 'business' | 'system', NavItem[]>;

const getString = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() ? value : fallback);
const formatDashboardDate = (date: Date) => new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(date);

const NAV_STRUCTURE = (t: DashboardTranslations, copy: (text: string) => string): NavigationGroups => ({
  management: [
    { label: getString(t.nav.home, 'Home'), icon: 'home', href: '/dashboard' },
    { label: getString(t.nav.ponds, 'Ponds'), icon: 'ponds', href: '/dashboard/ponds' },
    { label: getString(t.nav.waterQuality, 'Water Quality'), icon: 'water-quality', href: '/dashboard/water' },
    { label: getString(t.nav.feed, 'Feed'), icon: 'feed', href: '/dashboard/feed' },
    { label: getString(t.nav.harvest, 'Harvest'), icon: 'harvest', href: '/dashboard/harvest' },
  ],
  appServices: [
    { label: getString(t.nav.marketplace, 'Marketplace'), icon: 'marketplace', href: '/dashboard/marketplace' },
    { label: getString(t.nav.diseaseReport, 'Disease Report'), icon: 'disease-report', href: '/dashboard/disease' },
    { label: getString(t.sidebar.aiAssistant, 'Orson AI'), icon: 'orson-ai', href: '/dashboard/ai' },
    { label: getString(t.financialReports.harvestProjection, 'Harvest Projections'), icon: 'harvest-projections', href: '/dashboard/projections' },
    { label: getString(t.nav.notifications, 'Notifications'), icon: 'notifications', href: '/dashboard/notifications' },
  ],
  business: [
    { label: getString(t.finance.title, 'Finance'), icon: 'finance', href: '/dashboard/finance' },
    {
      label: copy('Reports'),
      icon: 'reports',
      id: 'reports',
      children: [
        { label: getString(t.financialReports.title, 'Financial Reports'), href: '/dashboard/reports/financial', icon: 'financial-reports' },
        { label: getString(t.nav.shrimpReports, 'Sampling Reports'), href: '/dashboard/reports/shrimp', icon: 'sampling-reports' },
        { label: getString(t.dailyOperationsReports.menuLabel, 'Daily Operations'), href: '/dashboard/reports/daily-operations', icon: 'daily-operations' },
        { label: getString(t.cycleReport.archiveTitle, 'Cycle Reports'), href: '/dashboard/reports/cycles', icon: 'cycle-reports' },
      ]
    },
    {
      label: copy('Inventory'),
      icon: 'inventory',
      id: 'inventory',
      children: [
        { label: getString(t.nav.inventoryFeeds, 'Feeds & Additives'), href: '/dashboard/inventory/feeds', icon: 'feeds-additives' },
        { label: copy('Treatment Mixes'), href: '/dashboard/inventory/treatment-mixes', icon: 'treatment-mixes' },
        { label: getString(t.nav.inventoryAssets, 'Assets'), href: '/dashboard/inventory/assets', icon: 'assets' },
      ]
    },
  ],
  system: [
    { label: getString(t.nav.settings, 'Settings'), icon: 'settings', href: '/dashboard/settings' },
  ]
});

function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage() as { t: DashboardTranslations };
  const copy = useDashboardCopy();
  const { user, company, needsRoleSelection, needsSetup, isAuthenticated, emailVerified, loading, companyLoading } = useAuth();
  useNotificationChecker(company?.id, user?.role);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileNavigation, setMobileNavigation] = useState(false);
  const [todayLabel, setTodayLabel] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const isOverlayNavigation = isSidebarOpen && isMobileNavigation;
  const navigation = NAV_STRUCTURE(t, copy);
  const hasPermission = useFarmPermissions();
  const canViewFarm = hasPermission('viewFarm');
  const canViewFinance = hasPermission('viewFinance');
  const canViewReports = hasPermission('viewReports');
  const canViewAssets = hasPermission('viewAssets');
  const canUseOrson = hasPermission('useOrson');
  const isNavLink = (item: NavItem): item is NavLinkItem => 'href' in item;
  const isNavGroup = (item: NavItem): item is NavGroupItem => Array.isArray((item as { children?: NavChild[] }).children);
  const visibleNavigation: NavigationGroups = {
    management: navigation.management.filter((item) => isNavLink(item) && (item.href === '/dashboard' || canViewFarm)),
    appServices: navigation.appServices.filter((item) => {
      if (!isNavLink(item)) return true;
      if (item.href === '/dashboard/ai') return canUseOrson;
      if (item.href === '/dashboard/projections') return canUseOrson && canViewFinance;
      return true;
    }),
    business: navigation.business.flatMap<NavItem>((item) => {
      if (isNavLink(item)) return item.href === '/dashboard/finance' && !canViewFinance ? [] : [item];
      if (item.id === 'reports') {
        if (!canViewReports) return [];
        return [{ ...item, children: item.children.filter((child) => (
          !['/dashboard/reports/financial', '/dashboard/reports/cycles'].includes(child.href) || canViewFinance
        )) }];
      }
      if (item.id === 'inventory') {
        const children = item.children.filter((child) => child.href === '/dashboard/inventory/assets' ? canViewAssets : canViewFarm);
        return children.length > 0 ? [{ ...item, children }] : [];
      }
      return [item];
    }),
    system: navigation.system,
  };

  const sectionLabels: Record<string, string> = {
    management: copy('Management'),
    appServices: copy('App Services'),
    business: copy('Business'),
    system: copy('System'),
  };

  const routeExpandedGroup = pathname.startsWith('/dashboard/reports/')
    ? 'reports'
    : pathname.startsWith('/dashboard/inventory/')
      ? 'inventory'
      : null;

  const currentNavMeta = (() => {
    if (pathname === '/dashboard/company') {
      return {
        section: copy('Management'),
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
      section: copy('Management'),
      title: copy('Dashboard'),
    };
  })();

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const toggleSidebar = () => setSidebarOpen(open => !open);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTodayLabel(formatDashboardDate(new Date()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!emailVerified) {
      router.push('/auth/verify');
      return;
    }
    if (companyLoading || pathname?.startsWith('/dashboard/admin')) return;
    if (needsRoleSelection) {
      router.push('/roleselection');
      return;
    }
    if (needsSetup) {
      router.push(getRequiredSetupRoute(user?.role));
      return;
    }
  }, [companyLoading, emailVerified, isAuthenticated, needsRoleSelection, needsSetup, loading, pathname, router, user?.role]);

  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');
    const syncNavigationMode = () => {
      setMobileNavigation(mobileMediaQuery.matches);
      if (mediaQuery.matches) setSidebarOpen(false);
    };
    syncNavigationMode();
    mediaQuery.addEventListener('change', syncNavigationMode);
    mobileMediaQuery.addEventListener('change', syncNavigationMode);
    return () => {
      mediaQuery.removeEventListener('change', syncNavigationMode);
      mobileMediaQuery.removeEventListener('change', syncNavigationMode);
    };
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

      if (!isOverlayNavigation || event.key !== 'Tab') return;
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

    if (isOverlayNavigation) document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    sidebarRef.current
      ?.querySelector<HTMLElement>('[data-sidebar-toggle]')
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (isOverlayNavigation) sidebarTrigger?.focus();
    };
  }, [isOverlayNavigation, isSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (pathname?.startsWith('/dashboard/admin')) {
    return <>{children}</>;
  }

  return (
      <div className={`dashboard-saas ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`} style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg-dark)', position: 'relative' }}>
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
        .dashboard-saas button[type="submit"].btn-primary {
          border-color: #0f4c75;
          background: #0f4c75;
          box-shadow: none;
        }
        .dashboard-saas button[type="submit"].btn-primary:not(:disabled):hover {
          border-color: #0c3f62;
          background: #0c3f62;
        }
        .dashboard-saas .business-dashboard-page :where(.btn-primary, .dashboard-action-primary):not([style*="background"]) {
          border-color: #0f4c75 !important;
          background: #0f4c75 !important;
          box-shadow: none !important;
        }
        .dashboard-saas .business-dashboard-page :where(.btn-primary, .dashboard-action-primary):not([style*="background"]):not(:disabled):hover {
          border-color: #0c3f62 !important;
          background: #0c3f62 !important;
        }
        .dashboard-saas .business-dashboard-page :where(.btn-primary, .dashboard-action-primary):disabled {
          border-color: #cbd5e1 !important;
          background: #e2e8f0 !important;
          color: #64748b !important;
          box-shadow: none !important;
        }
        .dashboard-saas :where(button, [role="button"]):not(:disabled):not(.sidebar-backdrop):not(.admin-inspector-backdrop) {
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, outline-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }
        .dashboard-saas :where(button, [role="button"]):not(:disabled):not(.sidebar-backdrop):not(.admin-inspector-backdrop):hover {
          outline: 2px solid color-mix(in srgb, currentColor 24%, transparent);
          outline-offset: 1px;
        }
        .dashboard-saas .btn-secondary:not(:disabled):hover,
        .dashboard-saas .dashboard-action-secondary:not(:disabled):hover {
          border-color: var(--secondary) !important;
          background: var(--bg-mid) !important;
          color: var(--primary) !important;
        }
        .dashboard-saas .business-dashboard-page .dashboard-inline-toolbar {
          gap: 10px;
          padding: 10px;
          border-radius: 16px;
        }
        .dashboard-saas .responsive-modal-header > button,
        .dashboard-saas button[aria-label^="Close"]:not(.admin-inspector-backdrop):not(.sidebar-backdrop) {
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          min-height: 40px !important;
          max-width: 40px !important;
          max-height: 40px !important;
          flex: 0 0 40px !important;
          display: grid !important;
          place-items: center !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 8px !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          transition: background-color 160ms ease, color 160ms ease !important;
        }
        .dashboard-saas .responsive-modal-header > button:hover,
        .dashboard-saas button[aria-label^="Close"]:not(.admin-inspector-backdrop):not(.sidebar-backdrop):hover {
          background: var(--bg-mid) !important;
          color: #0f4c75 !important;
        }
        .dashboard-saas .responsive-modal-header > button:focus-visible,
        .dashboard-saas button[aria-label^="Close"]:not(.admin-inspector-backdrop):not(.sidebar-backdrop):focus-visible {
          outline: 2px solid #3282b8 !important;
          outline-offset: 2px;
        }
        .dashboard-saas #dashboard-navigation .sidebar-toggle {
          color: #94a3b8 !important;
        }
        .dashboard-saas #dashboard-navigation .sidebar-toggle:hover {
          color: #64748b !important;
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
          .dashboard-saas.sidebar-collapsed .mobile-trigger {
            display: inline-flex !important;
          }
          #dashboard-navigation.sidebar {
            flex: 0 0 64px;
            width: 64px !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          #dashboard-navigation.sidebar.mobile-open {
            flex: 0 0 264px;
            width: 264px !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
          }
        }
        @media (min-width: 768px) {
          .dashboard-saas.sidebar-collapsed .dashboard-app-header {
            padding-left: 24px !important;
          }
          .dashboard-saas.sidebar-collapsed .dashboard-header-left {
            gap: 8px !important;
          }
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-company-row,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-link,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-group-content {
            justify-content: center !important;
          }
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-company-copy,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-company-search,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-section-label,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-item-label,
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-group-chevron {
            display: none !important;
          }
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-link {
            gap: 0 !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-children {
            padding-left: 0 !important;
          }
          #dashboard-navigation.sidebar:not(.mobile-open) .sidebar-toggle {
            display: none !important;
          }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          #dashboard-navigation.sidebar {
            position: relative !important;
            flex: 0 0 64px;
            width: 64px !important;
            min-width: 0;
            height: 100dvh !important;
            left: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
            padding-left: 8px !important;
            padding-right: 8px !important;
            border-right-width: 1px !important;
            box-shadow: none !important;
            overflow: hidden;
            transition: flex-basis 240ms ease, width 240ms ease, padding 240ms ease !important;
          }
          #dashboard-navigation.sidebar.mobile-open {
            flex: 0 0 240px;
            width: 240px !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            border-right-width: 1px !important;
          }
        }
        .sidebar-link {
          transition: background-color 0.16s ease, color 0.16s ease !important;
        }
        .sidebar-link:hover {
          background: transparent !important;
          color: var(--primary) !important;
          transform: none !important;
        }
        .sidebar-link.active {
          background: transparent !important;
          color: var(--primary) !important;
          box-shadow: inset 2px 0 0 var(--primary);
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
          .dashboard-app-header {
            padding: 12px 16px !important;
          }
          .dashboard-header-left {
            gap: 12px !important;
          }
          .dashboard-main-scroll {
            padding: var(--space-6) var(--space-8) var(--space-10) !important;
          }
          .inventory-dashboard-split {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-saas .business-dashboard-page .dashboard-inline-toolbar {
            align-items: stretch;
          }
          .dashboard-saas .business-dashboard-page .dashboard-segmented-tabs {
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
          }
          .dashboard-saas .business-dashboard-page .dashboard-action-row {
            display: flex;
            width: 100%;
          }
          .dashboard-saas .business-dashboard-page .dashboard-action-row > * {
            flex: 1;
            min-width: 0;
            justify-content: center;
          }
          .dashboard-saas .dashboard-main-scroll.authenticated-shell-main {
            padding:
              12px
              calc(12px + var(--safe-area-right))
              calc(28px + var(--safe-area-bottom))
              calc(12px + var(--safe-area-left)) !important;
          }
        }
      `}</style>

      {isOverlayNavigation && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={copy('Close navigation')}
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
        role={isOverlayNavigation ? 'dialog' : 'navigation'}
        aria-modal={isOverlayNavigation ? true : undefined}
        aria-label={copy('Dashboard navigation')}
        aria-hidden={isMobileNavigation && !isSidebarOpen ? true : undefined}
        inert={isMobileNavigation && !isSidebarOpen ? true : undefined}
        className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}
        style={{
        width: '264px',
        padding: '0 12px 16px',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', padding: '10px 2px 0 0' }}>
          <div className="sidebar-company-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link
              href="/dashboard/company"
              className={`sidebar-link ${pathname === '/dashboard/company' ? 'active' : ''}`}
              aria-current={pathname === '/dashboard/company' ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: 1,
                minWidth: 0,
                minHeight: '36px',
                padding: '6px 8px',
                borderRadius: 0,
                color: pathname === '/dashboard/company' ? '#1e293b' : '#64748b',
                background: 'transparent',
                boxShadow: pathname === '/dashboard/company' ? 'inset 2px 0 0 var(--primary)' : 'none',
                textDecoration: 'none',
              }}
            >
              <span style={{ color: pathname === '/dashboard/company' ? '#1e293b' : '#94a3b8', display: 'inline-flex' }}>
                <DashboardIcon name="company-details" />
              </span>
              <div className="sidebar-company-copy" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', color: 'inherit', fontSize: '0.8rem', fontWeight: pathname === '/dashboard/company' ? 600 : 500, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company?.companyName || copy('Company Details')}
                </div>
                <div style={{ overflow: 'hidden', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500, lineHeight: 1.2, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company?.farmType || copy('Company Details')}
                </div>
              </div>
            </Link>
            <button
              type="button"
              data-sidebar-toggle
              className="sidebar-toggle"
              aria-label={copy(isSidebarOpen ? 'Close dashboard navigation' : 'Expand dashboard navigation')}
              aria-controls="dashboard-navigation"
              aria-expanded={isSidebarOpen}
              onClick={toggleSidebar}
              style={{ border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <PanelLeft size={18} aria-hidden="true" />
            </button>
          </div>

          {Object.entries(visibleNavigation).map(([groupKey, items]) => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="sidebar-section-label" style={{ fontSize: '0.62rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px 4px', fontFamily: 'var(--jakarta)' }}>
                {sectionLabels[groupKey] || groupKey.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {items.map((item) => {
                if (isNavGroup(item)) {
                  const isExpanded = expandedGroups.includes(item.id) || routeExpandedGroup === item.id;
                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                      <button
                        className="sidebar-link"
                        aria-label={item.label}
                        title={item.label}
                        onClick={() => toggleGroup(item.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: '36px',
                          padding: '6px 10px',
                          background: 'transparent',
                          border: 'none',
                          fontSize: '0.8rem',
                          borderRadius: 0,
                          fontWeight: 500,
                          color: '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          width: '100%',
                          textAlign: 'left'
                        }}
                      >
                        <div className="sidebar-group-content" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: '#94a3b8', display: 'inline-flex' }}>
                            <DashboardIcon name={item.icon} />
                          </span>
                          <span className="sidebar-item-label">{item.label}</span>
                        </div>
                        <ChevronDown className="sidebar-group-chevron" size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                      </button>

                      {isExpanded && (
                        <div className="sidebar-children" style={{ display: 'flex', flexDirection: 'column', paddingLeft: '28px', gap: 0 }}>
                          {item.children.map((child) => {
                            const isChildActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="sidebar-link"
                                aria-label={child.label}
                                title={child.label}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  minHeight: '30px',
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  textDecoration: 'none',
                                  borderRadius: 0,
                                  fontWeight: isChildActive ? 600 : 500,
                                  color: isChildActive ? '#1e293b' : '#64748b',
                                  background: 'transparent',
                                  boxShadow: isChildActive ? 'inset 2px 0 0 var(--primary)' : 'none',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ color: isChildActive ? '#1e293b' : '#94a3b8', display: 'inline-flex', flex: '0 0 auto' }}>
                                  <DashboardIcon name={child.icon} />
                                </span>
                                <span className="sidebar-item-label">{child.label}</span>
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
                    aria-label={item.label}
                    title={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minHeight: '36px',
                      padding: '6px 10px',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                      borderRadius: 0,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1e293b' : '#64748b',
                      background: 'transparent',
                      boxShadow: isActive ? 'inset 2px 0 0 var(--primary)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ color: isActive ? '#1e293b' : '#94a3b8', display: 'inline-flex' }}>
                      <DashboardIcon name={item.icon} />
                    </span>
                    <span className="sidebar-item-label">{item.label}</span>
                  </Link>
                );
              })}
              {groupKey === 'system' && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="sidebar-link"
                  aria-label={getString(t.auth.signOut, 'Logout')}
                  title={getString(t.auth.signOut, 'Logout')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    minHeight: '36px',
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: 0,
                    background: 'transparent',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  <DashboardIcon name="logout" />
                  <span className="sidebar-item-label">{getString(t.auth.signOut, 'Logout')}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div
        className="dashboard-content-shell"
        aria-hidden={isOverlayNavigation || undefined}
        inert={isOverlayNavigation ? true : undefined}
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
              onClick={toggleSidebar}
              className="mobile-trigger"
              aria-label={copy('Open dashboard navigation')}
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

            <Link href="/dashboard/settings" className="dashboard-profile-button" aria-label={copy('Open account settings')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '10px', background: 'transparent', color: 'inherit', textDecoration: 'none' }}>
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

        <main className="dashboard-main-scroll authenticated-shell-main" style={{
          flex: 1,
          padding: '16px 16px 32px',
          maxWidth: '1232px',
          width: '100%',
          margin: '0 auto',
          position: 'relative',
          overflowY: 'auto'
        }}>
          {loading ? <DashboardStartupState /> : children}
        </main>
      </div>
    </div>
  );
}

function DashboardStartupState() {
  const copy = useDashboardCopy();
  return (
    <div className="dashboard-startup-state" aria-busy="true" aria-label={copy('Loading dashboard')}>
      <div className="dashboard-startup-summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="dashboard-startup-placeholder" key={index} />
        ))}
      </div>
      <div className="dashboard-startup-placeholder dashboard-startup-panel" />
      <div className="dashboard-startup-placeholder dashboard-startup-panel dashboard-startup-panel-tall" />

      <style jsx>{`
        .dashboard-startup-state {
          display: grid;
          gap: 16px;
          padding: 24px;
        }
        .dashboard-startup-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .dashboard-startup-placeholder {
          min-height: 92px;
          border: 1px solid rgba(15, 76, 117, 0.08);
          border-radius: 16px;
          background: linear-gradient(110deg, #f5f8fa 8%, #ffffff 18%, #f5f8fa 33%);
          background-size: 200% 100%;
          animation: dashboard-startup-pulse 1.4s linear infinite;
        }
        .dashboard-startup-panel {
          min-height: 118px;
        }
        .dashboard-startup-panel-tall {
          min-height: 240px;
        }
        @keyframes dashboard-startup-pulse {
          to { background-position-x: -200%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-startup-placeholder {
            animation: none;
          }
        }
        @media (max-width: 700px) {
          .dashboard-startup-state {
            padding: 16px 12px;
          }
          .dashboard-startup-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
