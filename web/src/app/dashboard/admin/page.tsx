"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Download,
  EyeOff,
  FileText,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Store,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AdminCompanyTable, AdminRecentUsers } from './AdminCoreLists';
import { CompanyDetailDrawer, UserDetailDrawer } from './AdminDetailDrawers';
import { AdminFollowUpQueue } from './AdminFollowUpQueue';
import { ActivationFunnel, getCompanyHealth, GrowthChart, MiniRoleBreakdown } from './AdminPremiumSections';
import { AdminLoadingSkeleton, AdminTabs, DataSourceBadge, ExecutiveSummary, type AdminTab } from './AdminUxSections';

type Period = 7 | 30;
type DataSource = 'Cloud Function' | 'Firestore fallback' | null;

type CompanyMetric = {
  id: string;
  companyName: string;
  ownerEmail: string;
  farmType: string;
  businessSize: string;
  teamMembersCount: number;
  pondCount: number;
  activeCycleCount: number;
  feedItemCount: number;
  additiveItemCount: number;
  createdAt: string | null;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
  joinedAt: string | null;
  lastActive: string | null;
};

type AdminMetrics = {
  generatedAt: string;
  periodDays: Period;
  totals: {
    users: number;
    companies: number;
    ponds: number;
    buyers: number;
    owners: number;
    staff: number;
    marketplaceListings: number;
    diseaseReports: number;
    joinRequests: number;
    notifications: number;
    aiRequests: number;
    apiRequests: number;
    requestLogs: number;
  };
  period: {
    newUsers: number;
    activeUsers: number;
    newCompanies: number;
    aiRequests: number;
    apiRequests: number;
    requestLogs: number;
  };
  dailyNewUsers: Array<{ date: string; count: number }>;
  roleBreakdown: Record<string, number>;
  recentUsers: AdminUser[];
  companies: CompanyMetric[];
};

const ADMIN_EMAILS = ['ricardofransiskusho@gmail.com'];

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
};

const toIso = (value: any) => toDate(value)?.toISOString() || null;

const startOfPeriod = (days: Period) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
};

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const countDocsSince = async (collectionName: string, since: Date) => {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    let period = 0;
    snapshot.forEach((item) => {
      const data = item.data();
      const createdAt = toDate(data.createdAt || data.timestamp || data.generatedAt || data.requestedAt || data.date);
      if (createdAt && createdAt >= since) period += 1;
    });
    return { total: snapshot.size, period };
  } catch (error) {
    console.warn(`Admin metrics fallback skipped ${collectionName}:`, error);
    return { total: 0, period: 0 };
  }
};

const sumAiUsageFromFirestore = async (since: Date) => {
  try {
    const snapshot = await getDocs(collectionGroup(db, 'aiUsage'));
    let total = 0;
    let period = 0;

    snapshot.forEach((item) => {
      const data = item.data();
      const functions = data.functions && typeof data.functions === 'object' ? data.functions as Record<string, unknown> : {};
      const value = Object.values(functions).reduce<number>((sum, current) => (
        typeof current === 'number' && Number.isFinite(current) ? sum + current : sum
      ), 0);
      total += value;

      const usageDate = toDate(data.updatedAt || data.createdAt || data.date) || new Date(`${data.dateKey || item.id}T00:00:00.000Z`);
      if (!Number.isNaN(usageDate.getTime()) && usageDate >= since) period += value;
    });

    return { total, period };
  } catch (error) {
    console.warn('Admin metrics fallback skipped aiUsage:', error);
    return { total: 0, period: 0 };
  }
};

const getCollectionSize = async (...segments: string[]) => {
  try {
    const snapshot = await getDocs(collection(db, segments.join('/')));
    return snapshot.size;
  } catch (error) {
    console.warn(`Admin metrics fallback skipped ${segments.join('/')}:`, error);
    return 0;
  }
};

const getAdminMetricsFromFirestore = async (periodDays: Period): Promise<AdminMetrics> => {
  const since = startOfPeriod(periodDays);
  const [usersSnapshot, companiesSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'companies')),
  ]);

  const usersById = new Map<string, any>();
  const dailyNewUsers = new Map<string, number>();
  const roleBreakdown: Record<string, number> = {};
  let newUsers = 0;
  let activeUsers = 0;
  let buyers = 0;
  let owners = 0;
  let staff = 0;

  for (let offset = 0; offset < periodDays; offset += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + offset);
    dailyNewUsers.set(dayKey(date), 0);
  }

  usersSnapshot.forEach((userDoc) => {
    const user = userDoc.data();
    usersById.set(userDoc.id, user);
    const role = user.role || 'unknown';
    roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    if (role === 'buyer') buyers += 1;
    if (role === 'owner') owners += 1;
    if (['technician', 'manager', 'admin'].includes(role)) staff += 1;

    const joinedAt = toDate(user.joinedDate || user.createdAt);
    if (joinedAt && joinedAt >= since) {
      newUsers += 1;
      const key = dayKey(joinedAt);
      if (dailyNewUsers.has(key)) dailyNewUsers.set(key, (dailyNewUsers.get(key) || 0) + 1);
    }

    const lastActive = toDate(user.lastActive || user.updatedAt || user.joinedDate || user.createdAt);
    if (lastActive && lastActive >= since) activeUsers += 1;
  });

  let totalPonds = 0;
  const companies = await Promise.all(companiesSnapshot.docs.map(async (companyDoc) => {
    const company = companyDoc.data();
    const [pondCount, cyclesSnapshot, feedItemCount, additiveItemCount] = await Promise.all([
      getCollectionSize('companies', companyDoc.id, 'ponds'),
      getDocs(collection(db, 'companies', companyDoc.id, 'cycles')).catch(() => ({ docs: [] })),
      getCollectionSize('companies', companyDoc.id, 'feeds'),
      getCollectionSize('companies', companyDoc.id, 'additives'),
    ]);
    totalPonds += pondCount;

    const activeCycleCount = cyclesSnapshot.docs.filter((cycleDoc: any) => {
      const cycle = typeof cycleDoc.data === 'function' ? cycleDoc.data() : {};
      return String(cycle.status || '').toLowerCase() === 'active';
    }).length;
    const teamMembers = Array.isArray(company.teamMembers) ? company.teamMembers : [];
    const owner = usersById.get(company.ownerId) || null;

    return {
      id: companyDoc.id,
      companyName: company.companyName || company.businessName || 'Unnamed company',
      ownerEmail: owner?.email || company.ownerEmail || '',
      farmType: company.farmType || company.businessType || '',
      businessSize: company.businessSize || '',
      teamMembersCount: teamMembers.length,
      pondCount,
      activeCycleCount,
      feedItemCount,
      additiveItemCount,
      createdAt: toIso(company.createdAt),
    };
  }));

  companies.sort((a, b) => b.pondCount - a.pondCount || a.companyName.localeCompare(b.companyName));

  const [marketplace, diseaseReports, joinRequests, notifications, aiUsage, apiRequests, requestLogs] = await Promise.all([
    countDocsSince('marketplace_listings', since),
    countDocsSince('diseaseReports', since),
    countDocsSince('joinRequests', since),
    countDocsSince('notifications', since),
    sumAiUsageFromFirestore(since),
    countDocsSince('apiRequests', since),
    countDocsSince('requestLogs', since),
  ]);

  const newCompanies = companiesSnapshot.docs.filter((companyDoc) => {
    const createdAt = toDate(companyDoc.data().createdAt);
    return createdAt && createdAt >= since;
  }).length;

  const recentUsers = usersSnapshot.docs
    .map((userDoc) => {
      const user = userDoc.data();
      return {
        id: userDoc.id,
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        companyId: user.companyId || null,
        joinedAt: toIso(user.joinedDate || user.createdAt),
        lastActive: toIso(user.lastActive || user.updatedAt),
      };
    })
    .sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime())
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totals: {
      users: usersSnapshot.size,
      companies: companiesSnapshot.size,
      ponds: totalPonds,
      buyers,
      owners,
      staff,
      marketplaceListings: marketplace.total,
      diseaseReports: diseaseReports.total,
      joinRequests: joinRequests.total,
      notifications: notifications.total,
      aiRequests: aiUsage.total,
      apiRequests: apiRequests.total,
      requestLogs: requestLogs.total,
    },
    period: {
      newUsers,
      activeUsers,
      newCompanies,
      aiRequests: aiUsage.period,
      apiRequests: apiRequests.period,
      requestLogs: requestLogs.period,
    },
    dailyNewUsers: Array.from(dailyNewUsers.entries()).map(([date, count]) => ({ date, count })),
    roleBreakdown,
    recentUsers,
    companies,
  };
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: any }) {
  return (
    <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 900, marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '1.7rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: 'var(--jakarta)' }}>{value}</div>
        <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{helper}</div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="glass-card" style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>{message}</div>;
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'var(--jakarta)' }}>{formatNumber(value)}</span>
    </div>
  );
}

function MetricCards({ metrics, period }: { metrics: AdminMetrics; period: Period }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
      <MetricCard label={`New users, ${period} days`} value={formatNumber(metrics.period.newUsers)} helper={`${formatNumber(metrics.period.activeUsers)} active users in the same period`} icon={Users} />
      <MetricCard label="Total users" value={formatNumber(metrics.totals.users)} helper={`${formatNumber(metrics.totals.buyers)} buyers, ${formatNumber(metrics.totals.owners)} owners, ${formatNumber(metrics.totals.staff)} staff/admin users`} icon={ShieldCheck} />
      <MetricCard label="Companies" value={formatNumber(metrics.totals.companies)} helper={`${formatNumber(metrics.period.newCompanies)} new companies in the selected period`} icon={Building2} />
      <MetricCard label="Ponds" value={formatNumber(metrics.totals.ponds)} helper="Total pond records across all companies" icon={Waves} />
      <MetricCard label="Marketplace" value={formatNumber(metrics.totals.marketplaceListings)} helper="Active and historical marketplace listing records" icon={Store} />
      <MetricCard label="AI/API requests" value={formatNumber(metrics.period.aiRequests + metrics.period.apiRequests + metrics.period.requestLogs)} helper={`${formatNumber(metrics.period.aiRequests)} AI requests in this period`} icon={Zap} />
    </div>
  );
}

function UsagePanel({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '1.12rem', color: 'var(--text-primary)', fontWeight: 900 }}>Request counters</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>AI usage and optional API log collections</div>
        </div>
        <FileText size={22} color="var(--primary)" />
      </div>
      <div style={{ display: 'grid', gap: '12px' }}>
        <MetricLine label="AI requests" value={metrics.period.aiRequests} />
        <MetricLine label="API requests" value={metrics.period.apiRequests} />
        <MetricLine label="Request logs" value={metrics.period.requestLogs} />
        <MetricLine label="Disease reports" value={metrics.totals.diseaseReports} />
        <MetricLine label="Join requests" value={metrics.totals.joinRequests} />
        <MetricLine label="Notifications" value={metrics.totals.notifications} />
      </div>
    </div>
  );
}

export default function HiddenAdminPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>(7);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyMetric | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const isAllowed = useMemo(() => ADMIN_EMAILS.includes(String(user?.email || '').toLowerCase()), [user?.email]);

  const loadMetrics = async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(app);
      const getAdminMetrics = httpsCallable<{ days: Period }, AdminMetrics>(functions, 'getAdminMetrics');
      const response = await getAdminMetrics({ days: period });
      setMetrics(response.data);
      setDataSource('Cloud Function');
    } catch (err: any) {
      console.warn('Admin callable unavailable, using founder Firestore fallback:', err);
      try {
        const fallbackMetrics = await getAdminMetricsFromFirestore(period);
        setMetrics(fallbackMetrics);
        setDataSource('Firestore fallback');
      } catch (fallbackError: any) {
        console.error('Failed to load admin metrics:', fallbackError);
        setError(fallbackError?.message || 'Failed to load admin metrics. Check Cloud Function IAM and founder Firestore permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCompaniesCsv = () => {
    if (!metrics) return;
    const rows = [
      ['Company', 'Owner', 'Status', 'Ponds', 'Team', 'Inventory items', 'Active cycles', 'Created'],
      ...metrics.companies.map((company) => [
        company.companyName,
        company.ownerEmail || 'Unavailable',
        getCompanyHealth(company).label,
        String(company.pondCount),
        String(company.teamMembersCount),
        String(company.feedItemCount + company.additiveItemCount),
        String(company.activeCycleCount),
        formatDate(company.createdAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shrimply-admin-companies-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadMetrics();
  }, [period, isAllowed]);

  if (!isAllowed) {
    return (
      <div className="dashboard-page-relaxed">
        <div className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-hero-eyebrow">Restricted</span>
            <h1 className="dashboard-hero-title">Admin access denied</h1>
            <p className="dashboard-hero-subtitle">This page is hidden and restricted to the Shrimply founder account.</p>
          </div>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EyeOff size={34} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-relaxed">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-hero-eyebrow">Founder only</span>
          <div className="dashboard-hero-title-row">
            <h1 className="dashboard-hero-title">Shrimply Admin</h1>
            <span className="dashboard-hero-date">{metrics ? `Updated ${formatDate(metrics.generatedAt)}` : 'Private route'}</span>
          </div>
          <p className="dashboard-hero-subtitle">Growth, activation, company health, user activity, and AI/API request tracking. Not linked from the dashboard sidebar.</p>
          <DataSourceBadge source={dataSource} updatedAt={metrics?.generatedAt} />
        </div>
        <div className="dashboard-hero-actions">
          <div className="dashboard-action-row">
            {[7, 30].map((days) => (
              <button key={days} onClick={() => setPeriod(days as Period)} className={`dashboard-action ${period === days ? 'dashboard-action-primary' : 'dashboard-action-secondary'}`} type="button">
                <CalendarDays size={18} />
                <span>{days} days</span>
              </button>
            ))}
            <button onClick={loadMetrics} className="dashboard-action dashboard-action-secondary" type="button" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
              <span>Refresh</span>
            </button>
            <button onClick={exportCompaniesCsv} className="dashboard-action dashboard-action-secondary" type="button" disabled={!metrics}>
              <Download size={18} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'flex-start', borderColor: '#ef444433', background: '#fff7f7' }}>
          <AlertTriangle size={22} color="#ef4444" />
          <div>
            <div style={{ color: '#991b1b', fontWeight: 900, marginBottom: '4px' }}>Admin metrics unavailable</div>
            <div style={{ color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</div>
          </div>
        </div>
      )}

      {loading && !metrics ? (
        <AdminLoadingSkeleton />
      ) : metrics ? (
        <>
          <ExecutiveSummary metrics={metrics} />
          <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

          {activeTab === 'overview' && (
            <>
              <MetricCards metrics={metrics} period={period} />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)', gap: '24px', alignItems: 'start' }}>
                <GrowthChart metrics={metrics} />
                <ActivationFunnel metrics={metrics} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)', gap: '24px', alignItems: 'start' }}>
                <AdminFollowUpQueue metrics={metrics} onSelectCompany={setSelectedCompany} onSelectUser={setSelectedUser} />
                <MiniRoleBreakdown metrics={metrics} />
              </div>
            </>
          )}

          {activeTab === 'companies' && <AdminCompanyTable companies={metrics.companies} onSelectCompany={setSelectedCompany} />}

          {activeTab === 'users' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)', gap: '24px', alignItems: 'start' }}>
              <AdminRecentUsers users={metrics.recentUsers} onSelectUser={setSelectedUser} />
              <MiniRoleBreakdown metrics={metrics} />
            </div>
          )}

          {activeTab === 'usage' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
              <UsagePanel metrics={metrics} />
              <GrowthChart metrics={metrics} />
            </div>
          )}

          {activeTab === 'followUp' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 480px) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
              <AdminFollowUpQueue metrics={metrics} onSelectCompany={setSelectedCompany} onSelectUser={setSelectedUser} />
              <AdminCompanyTable companies={metrics.companies} onSelectCompany={setSelectedCompany} />
            </div>
          )}
        </>
      ) : (
        <EmptyState message="No admin metrics loaded yet." />
      )}

      {selectedCompany && <CompanyDetailDrawer company={selectedCompany} onClose={() => setSelectedCompany(null)} />}
      {selectedUser && <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
