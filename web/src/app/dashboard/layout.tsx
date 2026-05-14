"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUnreadNotificationsCount } from '@/hooks/useDashboardData';
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
  Search,
  ChevronRight,
  Droplets,
  Store,
  Map,
  Wallet,
  FileText,
  Box,
  HelpCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react';

/* ─── Navigation Config ─────────────────────────────────────── */

const NAV_STRUCTURE = (t: any) => ({
  management: [
    { label: t.nav.home || 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { label: t.nav.ponds || 'Ponds', icon: Waves, href: '/dashboard/ponds' },
    { label: t.nav.waterQuality || 'Water Quality', icon: Droplets, href: '/dashboard/water' },
    { label: t.nav.feed || 'Feed', icon: History, href: '/dashboard/feed' },
    { label: t.nav.harvest || 'Harvest', icon: Wallet, href: '/dashboard/harvest' },
  ],
  appServices: [
    { label: t.nav.marketplace || 'Marketplace', icon: Store, href: '/dashboard/marketplace' },
    { label: t.nav.diseaseReport || 'Disease Report', icon: Map, href: '/dashboard/disease' },
    { label: t.sidebar.aiAssistant || 'Orson AI', icon: BrainCircuit, href: '/dashboard/ai' },
    { label: t.nav.notifications || 'Notifications', icon: Bell, href: '/dashboard/notifications' },
  ],
  business: [
    { label: t.finance.title || 'Finance', icon: Wallet, href: '/dashboard/finance' },
    {
      label: 'Reports',
      icon: FileText,
      id: 'reports',
      children: [
        { label: t.financialReports.title || 'Financial Reports', href: '/dashboard/reports/financial' },
        { label: t.nav.shrimpReports || 'Shrimp Reports', href: '/dashboard/reports/shrimp' },
        { label: t.financialReports.harvestProjection || 'Harvest Projections', href: '/dashboard/projections' },
      ]
    },
    {
      label: 'Inventory',
      icon: Box,
      id: 'inventory',
      children: [
        { label: t.nav.inventoryFeeds || 'Feeds & Additives', href: '/dashboard/inventory/feeds' },
        { label: t.nav.inventoryAssets || 'Assets', href: '/dashboard/inventory/assets' },
      ]
    },
  ],
  system: [
    { label: t.nav.settings || 'Settings', icon: Settings, href: '/dashboard/settings' },
  ]
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { user, company, needsRoleSelection, needsSetup, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['reports', 'inventory']);
  const isAdminRoute = pathname?.startsWith('/dashboard/admin') ?? false;
  const unreadCount = useUnreadNotificationsCount({ enabled: !isAdminRoute });
  const navigation = NAV_STRUCTURE(t);

  const sectionLabels: Record<string, string> = {
    management: 'Management',
    appServices: 'App Services',
    business: 'Business',
    system: 'System',
  };

  const currentNavMeta = (() => {
    for (const [groupKey, items] of Object.entries(navigation)) {
      for (const item of items as any[]) {
        if (item.href && pathname === item.href) {
          return {
            section: sectionLabels[groupKey] || groupKey,
            title: item.label,
          };
        }
        if (item.children) {
          const matchingChild = item.children.find((child: any) => pathname === child.href);
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
      router.push('/setup/choice');
      return;
    }
  }, [isAuthenticated, needsRoleSelection, needsSetup, loading, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-dark)', position: 'relative' }}>
      <style jsx global>{`
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
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)', zIndex: 40, cursor: 'pointer'
          }}
        />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`} style={{
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
            style={{ background: 'var(--bg-mid)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
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
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>
              {company?.companyName || 'Company profile'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>
              {company?.farmType || 'Open company details'}
            </div>
          </div>
          <ChevronRight size={16} color="#94a3b8" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {Object.entries(navigation).map(([groupKey, items]) => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 12px 10px', fontFamily: 'var(--jakarta)' }}>
                {sectionLabels[groupKey] || groupKey.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {items.map((item: any) => {
                if (item.children) {
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
                          fontWeight: 600,
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
                          <item.icon size={20} color="#94a3b8" strokeWidth={2} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                      </button>

                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '32px', marginTop: '4px', gap: '4px' }}>
                          {item.children.map((child: any) => {
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
                                  fontWeight: isChildActive ? 700 : 500,
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
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? '#1e293b' : '#64748b',
                      background: isActive ? '#f1f5f9' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <item.icon size={20} color={isActive ? '#1e293b' : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
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
              fontSize: '0.95rem', fontWeight: 700, borderRadius: 'var(--radius-md)'
            }}
          >
            <LogOut size={20} strokeWidth={2.5} />
            <span>{(t.auth as any).signOut || 'Logout'}</span>
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <header style={{
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-trigger"
              style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--primary)' }}
            >
              <Menu size={24} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '4px 8px', background: 'var(--primary-dim)', borderRadius: '999px', lineHeight: 1 }}>
                  {currentNavMeta.section}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.34rem', lineHeight: 1.08, color: 'var(--text-primary)', fontWeight: 900, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentNavMeta.title}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: '#FFF', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              width: '300px',
              boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)'
            }} className="mobile-trigger-hide">
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search anything..."
                style={{ background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative', boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white',
                    fontSize: '0.65rem', fontWeight: 900, minWidth: '18px', height: '18px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)' }}>
                <HelpCircle size={20} />
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '8px 10px 8px 16px', borderRadius: '16px', background: '#FFF', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)' }}>
              <div style={{ textAlign: 'right' }} className="mobile-trigger-hide">
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user?.name || 'Captain'}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{(company as any)?.role || (user as any)?.role || 'Farmer'}</div>
              </div>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                fontWeight: 900, fontSize: '16px', border: '2px solid white', boxShadow: 'var(--shadow-card)'
              }}>
                {(user?.name?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main style={{
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
