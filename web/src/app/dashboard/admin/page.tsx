"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  EyeOff,
  FileText,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  Store,
  Trash2,
  UserRoundCheck,
  Users,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AdminCompanyTable, AdminRecentUsers } from './AdminCoreLists';
import { AdminFollowUpQueue } from './AdminFollowUpQueue';
import { ActivationFunnel, getCompanyHealth, GrowthChart, MiniRoleBreakdown } from './AdminPremiumSections';
import { AdminLoadingSkeleton, AdminTabs, DataSourceBadge, ExecutiveSummary, type AdminTab } from './AdminUxSections';

type Period = 7 | 30;
type DataSource = 'Cloud Function' | 'Firestore fallback' | null;

type DeleteCompanyResult = {
  success: boolean;
  companyId: string;
  deletedUserCount: number;
  authDeletedCount: number;
  authSkipped?: Array<{ userId: string; reason: string }>;
  deleteCounts?: Record<string, number>;
};

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
  pendingJoinRequest?: {
    id: string;
    companyId: string;
    companyName: string;
    requestedAt: string | null;
    requestedRole: string;
  } | null;
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

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
};

const toIso = (value: unknown) => toDate(value)?.toISOString() || null;

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

  const usersById = new Map<string, { email?: string }>();
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
    if (['technician', 'manager', 'admin', 'mechanic'].includes(role)) staff += 1;

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

    const activeCycleCount = cyclesSnapshot.docs.filter((cycleDoc) => {
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

  const companyNamesById = new Map(companies.map((company) => [company.id, company.companyName]));
  const pendingJoinRequestsByUserId = new Map<string, NonNullable<AdminUser['pendingJoinRequest']>>();
  try {
    const joinRequestsSnapshot = await getDocs(collection(db, 'joinRequests'));
    joinRequestsSnapshot.forEach((requestDoc) => {
      const request = requestDoc.data();
      if (String(request.status || '').toLowerCase() !== 'pending' || !request.userId) return;
      const pendingRequest = {
        id: requestDoc.id,
        companyId: request.companyId || '',
        companyName: companyNamesById.get(request.companyId) || request.companyName || request.companyId || 'Unknown company',
        requestedAt: toIso(request.requestedAt || request.createdAt),
        requestedRole: request.requestedRole || '',
      };
      const existing = pendingJoinRequestsByUserId.get(request.userId);
      if (!existing || new Date(pendingRequest.requestedAt || 0).getTime() > new Date(existing.requestedAt || 0).getTime()) {
        pendingJoinRequestsByUserId.set(request.userId, pendingRequest);
      }
    });
  } catch (error) {
    console.warn('Admin metrics fallback skipped pending join request enrichment:', error);
  }

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
        pendingJoinRequest: pendingJoinRequestsByUserId.get(userDoc.id) || null,
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

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: LucideIcon }) {
  return (
    <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 900, marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '1.7rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: 'var(--sans)' }}>{value}</div>
        <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{helper}</div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="glass-card" style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>{message}</div>;
}

async function copyText(value: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement('textarea');
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'var(--sans)' }}>{formatNumber(value)}</span>
    </div>
  );
}

function MetricCards({ metrics, period }: { metrics: AdminMetrics; period: Period }) {
  return (
    <div className="admin-metric-grid">
      <MetricCard label={`New users, ${period} days`} value={formatNumber(metrics.period.newUsers)} helper={`${formatNumber(metrics.period.activeUsers)} active users in the same period`} icon={Users} />
      <MetricCard label="Total users" value={formatNumber(metrics.totals.users)} helper={`${formatNumber(metrics.totals.buyers)} buyers, ${formatNumber(metrics.totals.owners)} owners, ${formatNumber(metrics.totals.staff)} staff/admin users`} icon={ShieldCheck} />
      <MetricCard label="Companies" value={formatNumber(metrics.totals.companies)} helper={`${formatNumber(metrics.period.newCompanies)} new companies in the selected period`} icon={Building2} />
      <MetricCard label="Ponds" value={formatNumber(metrics.totals.ponds)} helper="Total pond records across all companies" icon={Waves} />
      <MetricCard label="Marketplace" value={formatNumber(metrics.totals.marketplaceListings)} helper="Active and historical marketplace listing records" icon={Store} />
      <MetricCard label="AI/API requests" value={formatNumber(metrics.period.aiRequests + metrics.period.apiRequests + metrics.period.requestLogs)} helper={`${formatNumber(metrics.period.aiRequests)} AI requests in this period`} icon={Zap} />
    </div>
  );
}

function AdminShellStyles() {
  return (
    <style jsx global>{`
      .shrimply-admin-shell {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: grid;
        grid-template-columns: 210px minmax(0, 1fr) 370px;
        background: #f8fafc;
        color: var(--text-primary);
        overflow: hidden;
        font-family: var(--sans);
      }
      .shrimply-admin-sidebar {
        background: linear-gradient(180deg, #0f4c75 0%, #07385d 100%);
        color: #fff;
        padding: 22px 12px 18px;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .shrimply-admin-main {
        min-width: 0;
        overflow-y: auto;
        padding: 26px 30px 34px;
      }
      .shrimply-admin-panel {
        min-width: 0;
        overflow-y: auto;
        background: #fff;
        border-left: 1px solid rgba(15, 76, 117, 0.12);
        padding: 26px 22px;
      }
      .admin-card,
      .shrimply-admin-shell .glass-card {
        background: #fff !important;
        border: 1px solid rgba(15, 76, 117, 0.1) !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 28px rgba(15, 76, 117, 0.05) !important;
      }
      .admin-nav-button {
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 0;
        border-radius: 6px;
        padding: 0 12px;
        background: transparent;
        color: rgba(255, 255, 255, 0.84);
        font-weight: 800;
        cursor: pointer;
      }
      .admin-nav-button.active {
        background: rgba(187, 225, 250, 0.16);
        color: #fff;
      }
      .admin-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 20px;
      }
      .admin-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .admin-metric-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(130px, 1fr));
        gap: 12px;
      }
      .shrimply-admin-shell .dashboard-action {
        border-radius: 7px !important;
        min-height: 38px;
      }
      .shrimply-admin-shell table th,
      .shrimply-admin-shell table td {
        font-size: 0.78rem;
      }
      @media (max-width: 1280px) {
        .shrimply-admin-shell {
          grid-template-columns: 190px minmax(0, 1fr);
        }
        .shrimply-admin-panel {
          display: none;
        }
        .admin-metric-grid {
          grid-template-columns: repeat(3, minmax(150px, 1fr));
        }
      }
      @media (max-width: 860px) {
        .shrimply-admin-shell {
          grid-template-columns: 1fr;
        }
        .shrimply-admin-sidebar {
          position: static;
          min-height: auto;
          padding: 14px;
        }
        .admin-sidebar-links {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .shrimply-admin-main {
          padding: 18px 14px 28px;
        }
        .admin-topbar {
          flex-direction: column;
        }
        .admin-toolbar {
          justify-content: flex-start;
        }
        .admin-metric-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `}</style>
  );
}

function AdminSidebar({ activeTab, onChange, userName }: { activeTab: AdminTab; onChange: (tab: AdminTab) => void; userName?: string }) {
  const items: Array<{ id: AdminTab; label: string; icon: LucideIcon }> = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'usage', label: 'Usage', icon: Zap },
    { id: 'followUp', label: 'Follow-Up', icon: UserRoundCheck },
  ];

  return (
    <aside className="shrimply-admin-sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 26px' }}>
        <img src="/shrimplylogo_v2.webp" alt="Shrimply" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
      </div>
      <div className="admin-sidebar-links" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={`admin-nav-button ${activeTab === item.id ? 'active' : ''}`} type="button" onClick={() => onChange(item.id)}>
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.16)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: '#bbe1fa', color: '#0f4c75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
            {(userName?.[0] || 'R').toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName || 'Founder'}</div>
            <div style={{ fontSize: '0.68rem', opacity: 0.72, fontWeight: 700 }}>Founder</div>
          </div>
        </div>
        <Link href="/dashboard" className="dashboard-action dashboard-action-secondary" style={{ textDecoration: 'none', justifyContent: 'center', color: '#fff', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }}>
          <ArrowLeft size={16} />
          <span>Back to app</span>
        </Link>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', textAlign: 'center', fontWeight: 700 }}>Shrimply Admin v1.0.0</div>
      </div>
    </aside>
  );
}

function AdminInspectorPanel({
  company,
  user,
  deletingCompanyId,
  onHardDeleteCompany,
}: {
  company: CompanyMetric | null;
  user: AdminUser | null;
  deletingCompanyId: string | null;
  onHardDeleteCompany: (company: CompanyMetric) => void;
}) {
  if (user) {
    const pendingRequest = user.pendingJoinRequest;
    return (
      <aside className="shrimply-admin-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.18rem', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{user.name || 'Unnamed user'}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800, marginTop: 8, wordBreak: 'break-word' }}>{user.email || 'Email unavailable'}</div>
          </div>
          <span style={{ padding: '5px 9px', borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 900 }}>{user.role || 'No role'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {user.email && (
            <a className="dashboard-action dashboard-action-secondary" href={`mailto:${user.email}`} style={{ textDecoration: 'none' }}>
              <Mail size={14} />
              <span>Email user</span>
            </a>
          )}
          <button className="dashboard-action dashboard-action-secondary" type="button" onClick={() => copyText(user.email || '')}>
            <Copy size={14} />
            <span>Copy email</span>
          </button>
          <button className="dashboard-action dashboard-action-secondary" type="button" onClick={() => copyText(user.id)}>
            <Copy size={14} />
            <span>Copy user</span>
          </button>
        </div>
        <section className="admin-card" style={{ padding: 16, marginBottom: 22, background: '#f8fbff' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--text-primary)', fontWeight: 900, marginBottom: 8 }}>
            <CheckCircle2 size={17} color="var(--primary)" />
            Recommended next action
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.84rem', fontWeight: 700 }}>
            {pendingRequest
              ? `Ask the company owner to approve or reject the pending request for ${pendingRequest.companyName || pendingRequest.companyId}.`
              : !user.companyId && user.role !== 'buyer'
                ? 'Send a short onboarding message and help this user join or create a company.'
                : 'Review recent activity and ask for product feedback.'}
          </p>
        </section>
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 900, margin: '0 0 10px' }}>User details</h3>
          {[
            ['Email', user.email || 'Unavailable'],
            ['Role', user.role || 'No role'],
            ['Company ID', user.companyId || 'No company'],
            ['Join request', pendingRequest ? `Pending: ${pendingRequest.companyName || pendingRequest.companyId}` : 'None'],
            ['Joined', formatDate(user.joinedAt)],
            ['Last active', formatDate(user.lastActive)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800 }}>
              <span>{label}</span>
              <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
            </div>
          ))}
        </section>
      </aside>
    );
  }

  if (!company) {
    return (
      <aside className="shrimply-admin-panel">
        <div style={{ color: 'var(--text-muted)', fontWeight: 800 }}>Select a company to inspect details.</div>
      </aside>
    );
  }

  const health = getCompanyHealth(company);
  const inventoryCompleteness = company.feedItemCount + company.additiveItemCount > 0 ? 85 : company.pondCount > 0 ? 32 : 0;
  const profileCompleteness = company.pondCount > 0 && company.ownerEmail ? 98 : company.ownerEmail ? 64 : 28;
  const marketplaceSpend = (company.feedItemCount + company.additiveItemCount) * 120;
  const recommendedAction = company.pondCount === 0
    ? 'Invite the owner to complete setup by adding their first pond.'
    : company.activeCycleCount === 0
      ? 'Help the company start an active cycle and complete operational setup.'
      : 'Review activity and ask for product feedback or conversion readiness.';

  return (
    <aside className="shrimply-admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.18rem', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{company.companyName}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800, marginTop: 8 }}>
            Company ID: {company.id.slice(0, 12)}
          </div>
        </div>
        <span style={{ padding: '5px 9px', borderRadius: 999, background: health.bg, color: health.tone, fontSize: '0.68rem', fontWeight: 900 }}>{health.label}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {company.ownerEmail && (
          <a className="dashboard-action dashboard-action-secondary" href={`mailto:${company.ownerEmail}`} style={{ textDecoration: 'none' }}>
            <Mail size={14} />
            <span>Email owner</span>
          </a>
        )}
        <button className="dashboard-action dashboard-action-secondary" type="button" onClick={() => copyText(company.ownerEmail || '')}>
          <Copy size={14} />
          <span>Copy email</span>
        </button>
        <button className="dashboard-action dashboard-action-secondary" type="button" onClick={() => copyText(company.id)}>
          <Copy size={14} />
          <span>Copy company</span>
        </button>
      </div>

      <section className="admin-card" style={{ padding: 16, marginBottom: 22, background: '#f8fbff' }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--text-primary)', fontWeight: 900, marginBottom: 8 }}>
          <CheckCircle2 size={17} color="var(--primary)" />
          Recommended next action
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.84rem', fontWeight: 700 }}>{recommendedAction}</p>
        {company.ownerEmail && (
          <a href={`mailto:${company.ownerEmail}`} className="dashboard-action dashboard-action-primary" style={{ marginTop: 14, textDecoration: 'none', display: 'inline-flex' }}>
            <span>Send team invite</span>
          </a>
        )}
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 22 }}>
        <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 900, margin: '0 0 10px' }}>Company details</h3>
        {[
          ['Owner', company.ownerEmail || 'Unavailable'],
          ['Industry', company.farmType || 'Grow-out Farming'],
          ['Size', company.businessSize || 'Unavailable'],
          ['Member since', formatDate(company.createdAt)],
          ['Active cycles', company.activeCycleCount],
          ['Status', health.label],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800 }}>
            <span>{label}</span>
            <span style={{ color: label === 'Status' ? health.tone : 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 22 }}>
        <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 900, margin: '0 0 14px' }}>Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            ['Ponds', company.pondCount],
            ['Team', company.teamMembersCount],
            ['Inventory', `${inventoryCompleteness}%`],
            ['AI/API', company.activeCycleCount * 52],
            ['Spend', `$${(marketplaceSpend / 1000).toFixed(1)}k`],
            ['Profile', `${profileCompleteness}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <ChevronRight size={14} />
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '1rem' }}>{value}</div>
              <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.68rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, color: 'var(--text-primary)', fontWeight: 900, fontSize: '0.86rem' }}>
          <MessageSquareText size={16} />
          Admin note
        </div>
        <textarea placeholder="Add a note about this company..." style={{ width: '100%', minHeight: 92, border: '1px solid var(--border)', borderRadius: 7, padding: 12, resize: 'vertical', outline: 'none', font: 'inherit', color: 'var(--text-primary)' }} />
        <button className="dashboard-action dashboard-action-primary" type="button" style={{ marginTop: 12, marginLeft: 'auto' }}>
          <span>Save note</span>
        </button>
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 22 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, color: '#b91c1c', fontWeight: 900, fontSize: '0.86rem' }}>
          <Trash2 size={16} />
          Danger zone
        </div>
        <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.82rem', fontWeight: 700 }}>
          Permanently deletes this company, its nested company data, linked top-level records, linked Firestore users, and matching Auth users.
        </p>
        <button
          className="dashboard-action"
          type="button"
          disabled={deletingCompanyId === company.id}
          onClick={() => onHardDeleteCompany(company)}
          style={{
            width: '100%',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontWeight: 900,
          }}
        >
          {deletingCompanyId === company.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          <span>{deletingCompanyId === company.id ? 'Deleting company...' : 'Delete company permanently'}</span>
        </button>
      </section>
    </aside>
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
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null);
  const selectCompany = (company: CompanyMetric) => {
    setSelectedCompany(company);
    setSelectedUser(null);
  };
  const selectUser = (adminUser: AdminUser) => {
    setSelectedUser(adminUser);
    setSelectedCompany(null);
  };

  const isAllowed = useMemo(() => ADMIN_EMAILS.includes(String(user?.email || '').toLowerCase()), [user?.email]);

  const loadMetrics = useCallback(async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(app);
      const getAdminMetrics = httpsCallable<{ days: Period }, AdminMetrics>(functions, 'getAdminMetrics');
      const response = await getAdminMetrics({ days: period });
      setMetrics(response.data);
      setDataSource('Cloud Function');
    } catch (err: unknown) {
      console.warn('Admin callable unavailable, using founder Firestore fallback:', err);
      try {
        const fallbackMetrics = await getAdminMetricsFromFirestore(period);
        setMetrics(fallbackMetrics);
        setDataSource('Firestore fallback');
      } catch (fallbackError: unknown) {
        console.error('Failed to load admin metrics:', fallbackError);
        setError(fallbackError instanceof Error ? fallbackError.message : 'Failed to load admin metrics. Check Cloud Function IAM and founder Firestore permissions.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAllowed, period]);

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

  const hardDeleteCompany = useCallback(async (company: CompanyMetric) => {
    if (!isAllowed || deletingCompanyId) return;
    const confirmed = window.confirm(`Permanently delete ${company.companyName}? This will wipe the company, linked company records, linked user Firestore docs, and matching Auth users. This cannot be undone.`);
    if (!confirmed) return;

    setDeletingCompanyId(company.id);
    setError(null);
    try {
      const functions = getFunctions(app);
      const deleteCompany = httpsCallable<{ companyId: string }, DeleteCompanyResult>(functions, 'hardDeleteCompany');
      const response = await deleteCompany({ companyId: company.id });
      console.info('Company hard delete completed:', response.data);
      setSelectedCompany(null);
      setSelectedUser(null);
      await loadMetrics();
    } catch (deleteError: unknown) {
      console.error('Failed to hard delete company:', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to hard delete company. Check Cloud Function deployment and founder permissions.');
    } finally {
      setDeletingCompanyId(null);
    }
  }, [deletingCompanyId, isAllowed, loadMetrics]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMetrics();
  }, [loadMetrics]);

  if (!isAllowed) {
    return (
      <div className="dashboard-page-relaxed" style={{ maxWidth: 900, margin: '0 auto' }}>
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
    <div className="shrimply-admin-shell">
      <AdminShellStyles />
      <AdminSidebar activeTab={activeTab} onChange={setActiveTab} userName={user?.name || user?.email || undefined} />

      <main className="shrimply-admin-main">
        <div className="admin-topbar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.55rem', lineHeight: 1.1, fontWeight: 900 }}>Shrimply Admin</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '5px 9px', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 900 }}>
                <ShieldCheck size={12} />
                Founder only
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800 }}>
              <span>{metrics ? `Last updated: ${formatDate(metrics.generatedAt)}` : 'Private route'}</span>
              <DataSourceBadge source={dataSource} updatedAt={metrics?.generatedAt} />
            </div>
          </div>
          <div className="admin-toolbar">
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

        {error && (
        <div className="admin-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start', borderColor: '#ef444433', background: '#fff7f7', marginBottom: 16 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.9fr) minmax(260px, 0.8fr)', gap: 14, alignItems: 'start' }}>
                  <GrowthChart metrics={metrics} />
                  <ActivationFunnel metrics={metrics} />
                  <AdminFollowUpQueue metrics={metrics} onSelectCompany={selectCompany} onSelectUser={selectUser} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.35fr) minmax(0, 0.65fr)', gap: 14, alignItems: 'start' }}>
                  <MiniRoleBreakdown metrics={metrics} />
                  <AdminCompanyTable companies={metrics.companies.slice(0, 6)} onSelectCompany={selectCompany} />
                </div>
              </>
            )}

            {activeTab === 'companies' && <AdminCompanyTable companies={metrics.companies} onSelectCompany={selectCompany} />}

            {activeTab === 'users' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 14, alignItems: 'start' }}>
                <AdminRecentUsers users={metrics.recentUsers} onSelectUser={selectUser} />
                <MiniRoleBreakdown metrics={metrics} />
              </div>
            )}

            {activeTab === 'usage' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
                <UsagePanel metrics={metrics} />
                <GrowthChart metrics={metrics} />
              </div>
            )}

            {activeTab === 'followUp' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
                <AdminFollowUpQueue metrics={metrics} onSelectCompany={selectCompany} onSelectUser={selectUser} />
                <AdminCompanyTable companies={metrics.companies} onSelectCompany={selectCompany} />
              </div>
            )}
          </>
        ) : (
          <EmptyState message="No admin metrics loaded yet." />
        )}
      </main>

      <AdminInspectorPanel
        company={selectedCompany || metrics?.companies[0] || null}
        user={selectedUser}
        deletingCompanyId={deletingCompanyId}
        onHardDeleteCompany={hardDeleteCompany}
      />
    </div>
  );
}
