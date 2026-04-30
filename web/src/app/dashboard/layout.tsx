"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
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
  TrendingUp,
  Droplets,
  Store,
  Map,
  ShieldAlert,
  Wallet,
  FileText,
  BarChart3,
  Box,
  Construction,
  HelpCircle,
  ChevronDown,
  Target,
  Users,
  Building2,
  Loader2,
  Activity,
  Utensils,
  Zap
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
    { label: t.nav.help || 'Help & Support', icon: HelpCircle, href: '/dashboard/help' },
  ]
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { user, company, needsRoleSelection, needsSetup, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['reports', 'inventory']);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (user?.uid) {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.size);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

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

  // Close sidebar on route change (mobile)
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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)', position: 'relative' }}>
      <style jsx global>{`
        @media (min-width: 1024px) {
          .sidebar {
            position: sticky !important;
            transform: none !important;
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
      
      {/* ── MOBILE OVERLAY ─────────────────────────────────── */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)', zIndex: 40, cursor: 'pointer'
          }}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`} style={{ 
        width: '280px', 
        padding: '24px 16px', 
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
        borderRight: '1px solid var(--border)',
        boxShadow: '20px 0 80px rgba(15, 76, 117, 0.04)'
      }}>


        <div style={{ padding: '0 8px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
           <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <img 
               src="/shrimplylogo_v2.png" 
               alt="Shrimply" 
               style={{ height: '34px', width: 'auto', objectFit: 'contain' }} 
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

        {/* Company Profile Card (Matching Image) */}
        <div 
          onClick={() => router.push('/dashboard/settings/company')}
          style={{
            margin: '0 4px 32px',
            padding: '16px',
            borderRadius: '20px',
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
              {company?.companyName || 'PT. Kuma'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>
              Vannamei
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {Object.entries(NAV_STRUCTURE(t)).map(([groupKey, items]) => (
            <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0 12px 12px' }}>
                {groupKey.replace(/([A-Z])/g, ' $1').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* ── TOP NAVBAR ──────────────────────────────────── */}
        <header style={{ 
          height: '80px', 
          background: '#FFF', 
          borderBottom: '1px solid var(--border)',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          {/* Breadcrumbs / Page Title Placeholder */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
             <button 
               onClick={() => setSidebarOpen(true)}
               className="mobile-trigger"
               style={{ background: 'var(--bg-mid)', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer', color: 'var(--primary)' }}
             >
               <Menu size={24} />
             </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {pathname === '/dashboard' ? 'DASHBOARD' : 
                   pathname === '/dashboard/ponds' ? 'POND MANAGEMENT' :
                   pathname === '/dashboard/ponds/detail' ? 'POND DETAILS' :
                   (pathname.split('/').pop()?.replace(/-/g, ' ') || 'Overview').toUpperCase()}
                </span>
              </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              background: 'var(--bg-mid)', border: '1px solid var(--border)', 
              borderRadius: '12px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              width: '300px'
            }} className="mobile-trigger-hide">
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                style={{ background: 'transparent', border: 'none', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', position: 'relative' }}>
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
              <button style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-mid)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <HelpCircle size={20} />
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
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
          padding: '40px', 
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          position: 'relative'
        }}>
          {children}
        </main>
      </div>


    </div>
  );
}

