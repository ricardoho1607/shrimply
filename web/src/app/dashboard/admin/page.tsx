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
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Store,
  Trash2,
  UserRoundCheck,
  Users,
  Waves,
  X,
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
  activePondCount: number;
  inactivePondCount: number;
  activeCycleCount: number;
  feedItemCount: number;
  additiveItemCount: number;
  aiRequestCount: number;
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

type TesterRequest = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  country: string;
  androidDevice: string;
  reason: string;
  status: string;
  platform: string;
  releaseTrack: string;
  requestCount: number;
  createdAt: string | null;
  lastRequestedAt: string | null;
  emailDeliveryStatus: string;
  emailDeliveryReason: string;
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

const getAiUsageValue = (data: Record<string, unknown>) => {
  const functions = data.functions && typeof data.functions === 'object' ? data.functions as Record<string, unknown> : {};
  return Object.values(functions).reduce<number>((sum, current) => (
    typeof current === 'number' && Number.isFinite(current) ? sum + current : sum
  ), 0);
};

const sumCompanyAiUsage = async (companyId: string) => {
  try {
    const snapshot = await getDocs(collection(db, 'companies', companyId, 'aiUsage'));
    return snapshot.docs.reduce((total, item) => total + getAiUsageValue(item.data()), 0);
  } catch (error) {
    console.warn(`Admin metrics fallback skipped companies/${companyId}/aiUsage:`, error);
    return 0;
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

const isOwnerRole = (role: string) => role === 'owner' || role === 'co-owner';
const isStaffRole = (role: string) => ['technician', 'manager', 'admin', 'mechanic'].includes(role);
const isActiveCycleStatus = (status: unknown) => ['planning', 'stocking', 'active'].includes(String(status || '').toLowerCase());
const isActivePondCycle = (pond: Record<string, unknown>) => String(pond.cycleStatus || 'active').toLowerCase() !== 'ended';
const getPhysicalPondKey = (pondName: unknown) => String(pondName || '').trim().toLowerCase();

const getCompanyPondCounts = (
  pondDocs: Array<{ data?: () => Record<string, unknown> }>,
  physicalPondDocs: Array<{ data?: () => Record<string, unknown> }>,
) => {
  const pondNames = new Set<string>();
  const activePondNames = new Set<string>();
  const inactivePondNames = new Set<string>();
  let unnamedPonds = 0;
  let activeUnnamedPonds = 0;
  const countPond = (pond: Record<string, unknown>) => {
    const key = getPhysicalPondKey(pond.pondName);
    if (key) {
      pondNames.add(key);
    } else {
      unnamedPonds += 1;
    }
  };

  physicalPondDocs.forEach((pondDoc) => {
    const pond = typeof pondDoc.data === 'function' ? pondDoc.data() : {};
    countPond(pond);
    const key = getPhysicalPondKey(pond.pondName);
    const isActivePhysicalPond = pond.status === 'active' || Boolean(pond.activePondId);
    if (key && !isActivePhysicalPond) inactivePondNames.add(key);
  });
  pondDocs.forEach((pondDoc) => {
    const pond = typeof pondDoc.data === 'function' ? pondDoc.data() : {};
    countPond(pond);
    const key = getPhysicalPondKey(pond.pondName);
    if (isActivePondCycle(pond)) {
      if (key) activePondNames.add(key);
      else activeUnnamedPonds += 1;
    } else if (key) {
      inactivePondNames.add(key);
    }
  });
  activePondNames.forEach((pondName) => inactivePondNames.delete(pondName));

  const pondCount = pondNames.size + unnamedPonds;
  const activePondCount = activePondNames.size + activeUnnamedPonds;
  const inactivePondCount = Math.max(pondCount - activePondCount, inactivePondNames.size);

  return { pondCount, activePondCount, inactivePondCount };
};

const countLinkedCompanyUsers = (
  companyId: string,
  company: Record<string, unknown>,
  usersById: Map<string, Record<string, unknown>>,
) => {
  const userIds = new Set<string>();
  if (typeof company.ownerId === 'string' && company.ownerId) userIds.add(company.ownerId);
  if (Array.isArray(company.teamMembers)) {
    company.teamMembers.forEach((userId) => {
      if (typeof userId === 'string' && userId) userIds.add(userId);
    });
  }
  usersById.forEach((adminUser, userId) => {
    if (adminUser.companyId === companyId) userIds.add(userId);
  });
  return userIds.size;
};

const getAdminMetricsFromFirestore = async (periodDays: Period): Promise<AdminMetrics> => {
  const since = startOfPeriod(periodDays);
  const [usersSnapshot, companiesSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'companies')),
  ]);

  const usersById = new Map<string, Record<string, unknown>>();
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
    if (isOwnerRole(role)) owners += 1;
    if (isStaffRole(role)) staff += 1;

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
    const [pondsSnapshot, physicalPondsSnapshot, cyclesSnapshot, feedItemCount, additiveItemCount, aiRequestCount] = await Promise.all([
      getDocs(collection(db, 'companies', companyDoc.id, 'ponds')).catch(() => ({ docs: [], size: 0 })),
      getDocs(collection(db, 'companies', companyDoc.id, 'physicalPonds')).catch(() => ({ docs: [], size: 0 })),
      getDocs(collection(db, 'companies', companyDoc.id, 'cycles')).catch(() => ({ docs: [] })),
      getCollectionSize('companies', companyDoc.id, 'feeds'),
      getCollectionSize('companies', companyDoc.id, 'additives'),
      sumCompanyAiUsage(companyDoc.id),
    ]);
    const { pondCount, activePondCount, inactivePondCount } = getCompanyPondCounts(pondsSnapshot.docs, physicalPondsSnapshot.docs);
    totalPonds += pondCount;

    const activeCycleDocs = cyclesSnapshot.docs.filter((cycleDoc) => {
      const cycle = typeof cycleDoc.data === 'function' ? cycleDoc.data() : {};
      return isActiveCycleStatus(cycle.status);
    }).length;
    const activePondDocs = pondsSnapshot.docs.filter((pondDoc) => {
      const pond = typeof pondDoc.data === 'function' ? pondDoc.data() : {};
      return isActivePondCycle(pond);
    }).length;
    const activeCycleCount = Math.max(activeCycleDocs, activePondDocs);
    const teamMembersCount = countLinkedCompanyUsers(companyDoc.id, company, usersById);
    const owner = usersById.get(company.ownerId) || null;

    return {
      id: companyDoc.id,
      companyName: company.companyName || company.businessName || 'Unnamed company',
      ownerEmail: typeof owner?.email === 'string' ? owner.email : company.ownerEmail || '',
      farmType: company.farmType || company.businessType || '',
      businessSize: company.businessSize || '',
      teamMembersCount,
      pondCount,
      activePondCount,
      inactivePondCount,
      activeCycleCount,
      feedItemCount,
      additiveItemCount,
      aiRequestCount,
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

const getTesterRequestsFromFirestore = async (): Promise<TesterRequest[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'testerRequests'));
    return snapshot.docs
      .map((requestDoc) => {
        const request = requestDoc.data();
        const emailDelivery = request.emailDelivery && typeof request.emailDelivery === 'object'
          ? request.emailDelivery as Record<string, unknown>
          : {};

        return {
          id: requestDoc.id,
          name: typeof request.name === 'string' ? request.name : '',
          email: typeof request.email === 'string' ? request.email : '',
          company: typeof request.company === 'string' ? request.company : '',
          role: typeof request.role === 'string' ? request.role : '',
          country: typeof request.country === 'string' ? request.country : '',
          androidDevice: typeof request.androidDevice === 'string' ? request.androidDevice : '',
          reason: typeof request.reason === 'string' ? request.reason : '',
          status: typeof request.status === 'string' ? request.status : 'pending',
          platform: typeof request.platform === 'string' ? request.platform : 'android',
          releaseTrack: typeof request.releaseTrack === 'string' ? request.releaseTrack : 'closed_testing',
          requestCount: typeof request.requestCount === 'number' ? request.requestCount : 1,
          createdAt: toIso(request.createdAt),
          lastRequestedAt: toIso(request.lastRequestedAt || request.updatedAt || request.createdAt),
          emailDeliveryStatus: typeof emailDelivery.status === 'string' ? emailDelivery.status : 'unknown',
          emailDeliveryReason: typeof emailDelivery.reason === 'string' ? emailDelivery.reason : '',
        };
      })
      .sort((a, b) => new Date(b.lastRequestedAt || b.createdAt || 0).getTime() - new Date(a.lastRequestedAt || a.createdAt || 0).getTime());
  } catch (error) {
    console.warn('Admin tester requests unavailable:', error);
    return [];
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: LucideIcon }) {
  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
        <Icon size={21} strokeWidth={2.25} />
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 760, marginBottom: '8px' }}>{label}</div>
        <div style={{ fontSize: '1.58rem', color: 'var(--text-primary)', fontWeight: 760, lineHeight: 1.05, letterSpacing: 0, fontFamily: 'var(--sans)' }}>{value}</div>
        <div style={{ marginTop: '10px', fontSize: '0.81rem', color: 'var(--text-muted)', lineHeight: 1.5, fontWeight: 500 }}>{helper}</div>
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
      <span style={{ color: 'var(--text-muted)', fontWeight: 650 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 760, fontFamily: 'var(--sans)' }}>{formatNumber(value)}</span>
    </div>
  );
}

function MetricCards({ metrics, period }: { metrics: AdminMetrics; period: Period }) {
  const activePonds = metrics.companies.reduce((sum, company) => sum + company.activePondCount, 0);
  const inactivePonds = metrics.companies.reduce((sum, company) => sum + company.inactivePondCount, 0);

  return (
    <div className="admin-metric-grid">
      <MetricCard label={`New users, ${period} days`} value={formatNumber(metrics.period.newUsers)} helper={`${formatNumber(metrics.period.activeUsers)} active users in the same period`} icon={Users} />
      <MetricCard label="Total users" value={formatNumber(metrics.totals.users)} helper={`${formatNumber(metrics.totals.buyers)} buyers, ${formatNumber(metrics.totals.owners)} owners, ${formatNumber(metrics.totals.staff)} staff/admin users`} icon={ShieldCheck} />
      <MetricCard label="Companies" value={formatNumber(metrics.totals.companies)} helper={`${formatNumber(metrics.period.newCompanies)} new companies in the selected period`} icon={Building2} />
      <MetricCard label="Ponds" value={formatNumber(metrics.totals.ponds)} helper={`${formatNumber(activePonds)} active, ${formatNumber(inactivePonds)} inactive physical ponds`} icon={Waves} />
      <MetricCard label="Marketplace" value={formatNumber(metrics.totals.marketplaceListings)} helper="Active and historical marketplace listing records" icon={Store} />
      <MetricCard label="AI/API requests" value={formatNumber(metrics.period.aiRequests + metrics.period.apiRequests + metrics.period.requestLogs)} helper={`${formatNumber(metrics.period.aiRequests)} AI requests in this period`} icon={Zap} />
    </div>
  );
}

function AdminShellStyles() {
  return (
    <style jsx global>{`
      .shrimply-admin-shell {
        --admin-gap: 22px;
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: grid;
        grid-template-columns: 210px minmax(0, 1fr) 370px;
        background: #f8fafc;
        color: var(--text-primary);
        overflow: hidden;
        font-family: var(--sans), "Plus Jakarta Sans", Inter, system-ui, sans-serif;
        letter-spacing: 0;
      }
      .shrimply-admin-shell.admin-shell-no-inspector {
        grid-template-columns: 210px minmax(0, 1fr);
      }
      .admin-inspector-backdrop {
        display: none;
      }
      .shrimply-admin-sidebar {
        background: #f8fafc;
        color: #fff;
        padding: 12px;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
      }
      .admin-sidebar-container {
        width: 100%;
        height: calc(100vh - 24px);
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        border-radius: 8px;
        background: linear-gradient(180deg, #0f4c75 0%, #07385d 100%);
        padding: 18px 10px 14px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 18px 38px rgba(7, 56, 93, 0.16);
      }
      .admin-sidebar-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 4px 24px;
        min-width: 0;
      }
      .admin-sidebar-links {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .shrimply-admin-main {
        min-width: 0;
        overflow-y: auto;
        padding: 28px 32px 36px;
      }
      .admin-main-container {
        width: 100%;
        max-width: 1320px;
        min-width: 0;
        margin: 0 auto;
        padding: 22px;
        border: 1px solid rgba(15, 76, 117, 0.1);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.62);
        box-shadow: 0 18px 42px rgba(15, 76, 117, 0.045);
        display: grid;
        gap: var(--admin-gap);
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
        font-weight: 700;
        cursor: pointer;
      }
      .admin-nav-button.active {
        background: rgba(187, 225, 250, 0.16);
        color: #fff;
      }
      .admin-sidebar-footer {
        display: grid;
        gap: 10px;
        margin-top: 18px;
        min-width: 0;
        max-width: 100%;
      }
      .admin-sidebar-profile {
        min-width: 0;
        max-width: 100%;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        padding: 10px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.16);
        overflow: hidden;
      }
      .admin-sidebar-avatar {
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: #bbe1fa;
        color: #0f4c75;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 760;
        flex-shrink: 0;
      }
      .admin-sidebar-profile-copy {
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      .admin-sidebar-name {
        min-width: 0;
        max-width: 100%;
        color: #fff;
        font-size: 0.76rem;
        font-weight: 760;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.25;
      }
      .admin-sidebar-role {
        margin-top: 3px;
        font-size: 0.68rem;
        opacity: 0.72;
        font-weight: 600;
        line-height: 1.2;
      }
      .admin-sidebar-back {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
      }
      .admin-sidebar-version {
        min-width: 0;
        max-width: 100%;
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.66rem;
        text-align: center;
        font-weight: 650;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .admin-inspector-close {
        width: 34px;
        height: 34px;
        border: 1px solid rgba(15, 76, 117, 0.12);
        border-radius: 8px;
        background: #fff;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
      }
      .admin-inspector-close:hover {
        color: var(--primary);
        border-color: rgba(15, 76, 117, 0.24);
        background: var(--primary-dim);
      }
      .admin-topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 0;
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
        gap: 16px;
      }
      .admin-content-stack {
        display: grid;
        gap: var(--admin-gap);
      }
      .admin-grid-gap {
        gap: var(--admin-gap) !important;
      }
      .admin-company-controls {
        grid-template-columns: minmax(220px, 1fr) 180px 190px;
      }
      .admin-founder-summary {
        margin-bottom: 0;
      }
      .shrimply-admin-shell h1,
      .shrimply-admin-shell h2,
      .shrimply-admin-shell h3 {
        letter-spacing: 0;
      }
      .shrimply-admin-shell .dashboard-action {
        border-radius: 7px !important;
        min-height: 38px;
        font-weight: 700 !important;
      }
      .shrimply-admin-shell table th,
      .shrimply-admin-shell table td {
        font-size: 0.78rem;
      }
      @media (max-width: 1280px) {
        .shrimply-admin-shell {
          grid-template-columns: 190px minmax(0, 1fr);
        }
        .shrimply-admin-shell.admin-shell-no-inspector {
          grid-template-columns: 190px minmax(0, 1fr);
        }
        .admin-inspector-backdrop {
          display: block;
          position: fixed;
          inset: 0;
          z-index: 1250;
          background: rgba(15, 23, 42, 0.28);
        }
        .shrimply-admin-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 1260;
          width: min(420px, calc(100vw - 24px));
          box-shadow: -24px 0 58px rgba(15, 23, 42, 0.18);
        }
        .admin-metric-grid {
          grid-template-columns: repeat(3, minmax(150px, 1fr));
        }
        .admin-founder-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .admin-founder-summary > div:first-child {
          grid-column: 1 / -1;
        }
        .admin-company-controls {
          grid-template-columns: minmax(220px, 1fr) minmax(160px, 0.45fr);
        }
        .admin-company-controls label:first-child {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 860px) {
        .shrimply-admin-shell {
          --admin-gap: 18px;
          grid-template-columns: 1fr;
        }
        .shrimply-admin-shell.admin-shell-no-inspector {
          grid-template-columns: 1fr;
        }
        .shrimply-admin-sidebar {
          position: static;
          min-height: auto;
          padding: 10px;
        }
        .admin-sidebar-container {
          height: auto;
          min-height: auto;
          padding: 14px;
        }
        .admin-sidebar-links {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          flex: none;
        }
        .shrimply-admin-main {
          padding: 18px 14px 28px;
        }
        .admin-main-container {
          padding: 14px;
          border-radius: 8px;
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
        .admin-founder-summary {
          grid-template-columns: 1fr !important;
        }
        .admin-founder-summary > div:first-child {
          grid-column: auto;
        }
        .admin-company-controls {
          grid-template-columns: 1fr;
        }
        .admin-company-controls label:first-child {
          grid-column: auto;
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
    { id: 'testers', label: 'Testers', icon: Smartphone },
  ];

  return (
    <aside className="shrimply-admin-sidebar">
      <div className="admin-sidebar-container">
        <div className="admin-sidebar-logo">
          <img src="/shrimplylogo_v2.webp" alt="Shrimply" style={{ height: 36, width: 'auto', maxWidth: '100%', filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="admin-sidebar-links">
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
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-profile">
            <div className="admin-sidebar-avatar">
              {(userName?.[0] || 'R').toUpperCase()}
            </div>
            <div className="admin-sidebar-profile-copy">
              <div className="admin-sidebar-name" title={userName || 'Founder'}>{userName || 'Founder'}</div>
              <div className="admin-sidebar-role">Founder</div>
            </div>
          </div>
          <Link href="/dashboard" className="dashboard-action dashboard-action-secondary admin-sidebar-back" style={{ textDecoration: 'none', justifyContent: 'center', color: '#fff', borderColor: 'rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={16} />
            <span>Back to app</span>
          </Link>
          <div className="admin-sidebar-version">Shrimply Admin v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}

function AdminInspectorPanel({
  company,
  user,
  deletingCompanyId,
  onHardDeleteCompany,
  onClose,
}: {
  company: CompanyMetric | null;
  user: AdminUser | null;
  deletingCompanyId: string | null;
  onHardDeleteCompany: (company: CompanyMetric) => void;
  onClose: () => void;
}) {
  if (user) {
    const pendingRequest = user.pendingJoinRequest;
    return (
      <aside className="shrimply-admin-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.16rem', fontWeight: 760, margin: 0, lineHeight: 1.2 }}>{user.name || 'Unnamed user'}</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 650, marginTop: 8, wordBreak: 'break-word' }}>{user.email || 'Email unavailable'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ padding: '5px 9px', borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 700 }}>{user.role || 'No role'}</span>
            <button className="admin-inspector-close" type="button" onClick={onClose} aria-label="Close details">
              <X size={16} />
            </button>
          </div>
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
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--text-primary)', fontWeight: 760, marginBottom: 8 }}>
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
          <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 760, margin: '0 0 10px' }}>User details</h3>
          {[
            ['Email', user.email || 'Unavailable'],
            ['Role', user.role || 'No role'],
            ['Company ID', user.companyId || 'No company'],
            ['Join request', pendingRequest ? `Pending: ${pendingRequest.companyName || pendingRequest.companyId}` : 'None'],
            ['Joined', formatDate(user.joinedAt)],
            ['Last active', formatDate(user.lastActive)],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 650 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 650 }}>Select a company to inspect details.</div>
          <button className="admin-inspector-close" type="button" onClick={onClose} aria-label="Close details">
            <X size={16} />
          </button>
        </div>
      </aside>
    );
  }

  const health = getCompanyHealth(company);
  const recommendedAction = company.pondCount === 0
    ? 'Invite the owner to complete setup by adding their first pond.'
    : company.activeCycleCount === 0
      ? 'Help the company start an active cycle and complete operational setup.'
      : 'Review activity and ask for product feedback or conversion readiness.';

  return (
    <aside className="shrimply-admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.16rem', fontWeight: 760, margin: 0, lineHeight: 1.2 }}>{company.companyName}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 650, marginTop: 8 }}>
            Company ID: {company.id.slice(0, 12)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ padding: '5px 9px', borderRadius: 999, background: health.bg, color: health.tone, fontSize: '0.68rem', fontWeight: 700 }}>{health.label}</span>
          <button className="admin-inspector-close" type="button" onClick={onClose} aria-label="Close details">
            <X size={16} />
          </button>
        </div>
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

      <section style={{ padding: 14, borderRadius: 8, background: '#fff7f7', border: '1px solid #fecaca', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#b91c1c', fontWeight: 760, fontSize: '0.84rem', marginBottom: 8 }}>
          <Trash2 size={16} />
          Delete company and linked users
        </div>
        <p style={{ margin: '0 0 12px', color: '#7f1d1d', lineHeight: 1.45, fontSize: '0.8rem', fontWeight: 700 }}>
          This permanently wipes the company, nested company data, linked user records, and matching Auth users.
        </p>
        <button
          className="dashboard-action"
          type="button"
          disabled={deletingCompanyId === company.id}
          onClick={() => onHardDeleteCompany(company)}
          style={{
            width: '100%',
            background: '#dc2626',
            border: '1px solid #b91c1c',
            color: '#fff',
            fontWeight: 760,
          }}
        >
          {deletingCompanyId === company.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
          <span>{deletingCompanyId === company.id ? 'Deleting company...' : 'Delete permanently'}</span>
        </button>
      </section>

      <section className="admin-card" style={{ padding: 16, marginBottom: 22, background: '#f8fbff' }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--text-primary)', fontWeight: 760, marginBottom: 8 }}>
          <CheckCircle2 size={17} color="var(--primary)" />
          Recommended next action
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.84rem', fontWeight: 700 }}>{recommendedAction}</p>
        {company.ownerEmail && (
          <a href={`mailto:${company.ownerEmail}`} className="dashboard-action dashboard-action-primary" style={{ marginTop: 14, textDecoration: 'none', display: 'inline-flex' }}>
            <Mail size={14} />
            <span>Email owner</span>
          </a>
        )}
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 22 }}>
        <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 760, margin: '0 0 10px' }}>Company details</h3>
        {[
          ['Owner', company.ownerEmail || 'Unavailable'],
          ['Industry', company.farmType || 'Unavailable'],
          ['Size', company.businessSize || 'Unavailable'],
          ['Member since', formatDate(company.createdAt)],
          ['Active cycles', company.activeCycleCount],
          ['Status', health.label],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 650 }}>
            <span>{label}</span>
            <span style={{ color: label === 'Status' ? health.tone : 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </section>

      <section style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginBottom: 22 }}>
        <h3 style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 760, margin: '0 0 14px' }}>Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            ['Ponds', company.pondCount],
            ['Active', company.activePondCount],
            ['Inactive', company.inactivePondCount],
            ['Team', company.teamMembersCount],
            ['Feed items', company.feedItemCount],
            ['Additives', company.additiveItemCount],
            ['AI requests', company.aiRequestCount],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <ChevronRight size={14} />
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 760, fontSize: '1rem' }}>{value}</div>
              <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.68rem' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

    </aside>
  );
}

function TesterRequestsPanel({ requests }: { requests: TesterRequest[] }) {
  const pendingCount = requests.filter(request => request.status === 'pending').length;
  const sentEmailCount = requests.filter(request => request.emailDeliveryStatus === 'sent').length;

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 760, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            <Smartphone size={15} />
            Android closed testing
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.18rem', fontWeight: 760 }}>Tester access requests</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontWeight: 650, fontSize: '0.86rem' }}>
            {formatNumber(requests.length)} total requests, {formatNumber(pendingCount)} pending, {formatNumber(sentEmailCount)} email notifications sent.
          </p>
        </div>
        <Link href="/download" className="dashboard-action dashboard-action-secondary" style={{ textDecoration: 'none' }}>
          <Smartphone size={16} />
          <span>View public page</span>
        </Link>
      </div>

      {requests.length === 0 ? (
        <EmptyState message="No Android tester requests yet." />
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {requests.map((request) => (
            <article key={request.id} className="admin-card" style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '18px', alignItems: 'start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 800 }}>{request.name || 'Unnamed requester'}</h3>
                  <span style={{ borderRadius: 999, padding: '4px 8px', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 800 }}>
                    {request.platform || 'android'}
                  </span>
                  <span style={{ borderRadius: 999, padding: '4px 8px', background: request.emailDeliveryStatus === 'sent' ? '#dcfce7' : '#fef3c7', color: request.emailDeliveryStatus === 'sent' ? '#166534' : '#92400e', fontSize: '0.68rem', fontWeight: 800 }}>
                    Email {request.emailDeliveryStatus}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.82rem', wordBreak: 'break-word', marginBottom: '10px' }}>
                  {request.email || 'Email unavailable'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: request.reason ? '12px' : 0 }}>
                  <TesterMini label="Company" value={request.company || 'Not provided'} />
                  <TesterMini label="Role" value={request.role || 'Not provided'} />
                  <TesterMini label="Country" value={request.country || 'Not provided'} />
                  <TesterMini label="Device" value={request.androidDevice || 'Not provided'} />
                </div>
                {request.reason ? (
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 650, fontSize: '0.86rem', lineHeight: 1.5 }}>
                    {request.reason}
                  </p>
                ) : null}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px', color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 700 }}>
                  <span>Requested {formatDate(request.lastRequestedAt || request.createdAt)}</span>
                  <span>Count: {request.requestCount}</span>
                  <span>Status: {request.status}</span>
                  {request.emailDeliveryReason ? <span>Email note: {request.emailDeliveryReason}</span> : null}
                </div>
              </div>
              <div style={{ display: 'grid', gap: '8px', minWidth: '132px' }}>
                {request.email ? (
                  <a href={`mailto:${request.email}?subject=Shrimply Android closed test access`} className="dashboard-action dashboard-action-primary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                    <Mail size={14} />
                    <span>Email</span>
                  </a>
                ) : null}
                <button className="dashboard-action dashboard-action-secondary" type="button" onClick={() => copyText(request.email)}>
                  <Copy size={14} />
                  <span>Copy</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TesterMini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</div>
    </div>
  );
}

function UsagePanel({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '1.08rem', color: 'var(--text-primary)', fontWeight: 760 }}>Request counters</div>
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
  const [testerRequests, setTesterRequests] = useState<TesterRequest[]>([]);
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
  const clearSelection = () => {
    setSelectedCompany(null);
    setSelectedUser(null);
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
      setTesterRequests(await getTesterRequestsFromFirestore());
    } catch (err: unknown) {
      console.warn('Admin callable unavailable, using founder Firestore fallback:', err);
      try {
        const [fallbackMetrics, requests] = await Promise.all([
          getAdminMetricsFromFirestore(period),
          getTesterRequestsFromFirestore(),
        ]);
        setMetrics(fallbackMetrics);
        setTesterRequests(requests);
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
      ['Company', 'Owner', 'Status', 'Ponds', 'Active ponds', 'Inactive ponds', 'Team', 'Inventory items', 'Active cycles', 'AI requests', 'Created'],
      ...metrics.companies.map((company) => [
        company.companyName,
        company.ownerEmail || 'Unavailable',
        getCompanyHealth(company).label,
        String(company.pondCount),
        String(company.activePondCount),
        String(company.inactivePondCount),
        String(company.teamMembersCount),
        String(company.feedItemCount + company.additiveItemCount),
        String(company.activeCycleCount),
        String(company.aiRequestCount),
        formatDate(company.createdAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shrimply-admin-companies-${new Date().toISOString().slice(0, 10)}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hardDeleteCompany = useCallback(async (company: CompanyMetric) => {
    if (!isAllowed || deletingCompanyId) return;
    const typedName = window.prompt(`Type "${company.companyName}" to permanently delete this company, linked company records, linked user Firestore docs, and matching Auth users.`);
    if (typedName !== company.companyName) return;

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
    queueMicrotask(() => {
      void loadMetrics();
    });
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
    <div className={`shrimply-admin-shell ${selectedCompany || selectedUser ? '' : 'admin-shell-no-inspector'}`}>
      <AdminShellStyles />
      <AdminSidebar activeTab={activeTab} onChange={setActiveTab} userName={user?.name || user?.email || undefined} />

      <main className="shrimply-admin-main">
        <div className="admin-main-container">
          <div className="admin-topbar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.48rem', lineHeight: 1.14, fontWeight: 760, letterSpacing: 0 }}>Shrimply Admin</h1>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999, padding: '5px 9px', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.68rem', fontWeight: 700 }}>
                  <ShieldCheck size={12} />
                  Founder only
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 650 }}>
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
          <div className="admin-card" style={{ padding: '16px', display: 'flex', gap: '14px', alignItems: 'flex-start', borderColor: '#ef444433', background: '#fff7f7' }}>
            <AlertTriangle size={22} color="#ef4444" />
            <div>
              <div style={{ color: '#991b1b', fontWeight: 760, marginBottom: '4px' }}>Admin metrics unavailable</div>
              <div style={{ color: '#7f1d1d', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</div>
            </div>
          </div>
          )}

          {loading && !metrics ? (
            <AdminLoadingSkeleton />
          ) : metrics ? (
            <div className="admin-content-stack">
              <ExecutiveSummary metrics={metrics} />
              <AdminTabs activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === 'overview' && (
                <>
                  <MetricCards metrics={metrics} period={period} />
                  <div className="admin-grid-gap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.9fr) minmax(260px, 0.8fr)', gap: 22, alignItems: 'start' }}>
                    <GrowthChart metrics={metrics} />
                    <ActivationFunnel metrics={metrics} />
                    <AdminFollowUpQueue metrics={metrics} onSelectCompany={selectCompany} onSelectUser={selectUser} compact />
                  </div>
                  <div className="admin-grid-gap" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.35fr) minmax(0, 0.65fr)', gap: 22, alignItems: 'start' }}>
                    <MiniRoleBreakdown metrics={metrics} />
                    <AdminCompanyTable companies={metrics.companies.slice(0, 6)} onSelectCompany={selectCompany} />
                  </div>
                </>
              )}

              {activeTab === 'companies' && <AdminCompanyTable companies={metrics.companies} onSelectCompany={selectCompany} />}

              {activeTab === 'users' && (
                <div className="admin-grid-gap" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 22, alignItems: 'start' }}>
                  <AdminRecentUsers users={metrics.recentUsers} onSelectUser={selectUser} />
                  <MiniRoleBreakdown metrics={metrics} />
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="admin-grid-gap" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22, alignItems: 'start' }}>
                  <UsagePanel metrics={metrics} />
                  <GrowthChart metrics={metrics} />
                </div>
              )}

              {activeTab === 'followUp' && (
                <div className="admin-grid-gap" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 420px) minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
                  <AdminFollowUpQueue metrics={metrics} onSelectCompany={selectCompany} onSelectUser={selectUser} />
                  <AdminCompanyTable companies={metrics.companies} onSelectCompany={selectCompany} />
                </div>
              )}

              {activeTab === 'testers' && <TesterRequestsPanel requests={testerRequests} />}
            </div>
          ) : (
            <EmptyState message="No admin metrics loaded yet." />
          )}
        </div>
      </main>

      {(selectedCompany || selectedUser) && (
        <>
          <button className="admin-inspector-backdrop" type="button" aria-label="Close details" onClick={clearSelection} />
          <AdminInspectorPanel
            company={selectedCompany}
            user={selectedUser}
            deletingCompanyId={deletingCompanyId}
            onHardDeleteCompany={hardDeleteCompany}
            onClose={clearSelection}
          />
        </>
      )}
    </div>
  );
}
