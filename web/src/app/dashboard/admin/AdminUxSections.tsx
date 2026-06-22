"use client";

import React from 'react';
import { Activity, BarChart3, Building2, Database, Filter, Search, Sparkles, UserRoundCheck, Users, type LucideIcon } from 'lucide-react';

type AdminTab = 'overview' | 'companies' | 'users' | 'usage' | 'followUp';

type AdminMetricsSummary = {
  generatedAt: string;
  periodDays: 7 | 30;
  totals: {
    users: number;
    companies: number;
    ponds: number;
    marketplaceListings: number;
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
  companies: Array<{
    id: string;
    pondCount: number;
    activePondCount: number;
    inactivePondCount: number;
    activeCycleCount: number;
    feedItemCount: number;
    additiveItemCount: number;
    aiRequestCount: number;
  }>;
};

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

export const ADMIN_TABS: Array<{ id: AdminTab; label: string; helper: string }> = [
  { id: 'overview', label: 'Overview', helper: 'Growth and activation' },
  { id: 'companies', label: 'Companies', helper: 'Search and status' },
  { id: 'users', label: 'Users', helper: 'Recent signups' },
  { id: 'usage', label: 'Usage', helper: 'AI and API activity' },
  { id: 'followUp', label: 'Follow-up', helper: 'Action queue' },
];

export function AdminTabs({ activeTab, onChange }: { activeTab: AdminTab; onChange: (tab: AdminTab) => void }) {
  return (
    <div className="glass-card admin-tabs-card" style={{ padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '6px' }}>
      {ADMIN_TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              borderRadius: '6px',
              padding: '12px 14px',
              border: active ? '1px solid var(--primary)' : '1px solid transparent',
              background: active ? 'var(--primary-dim)' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 760, fontSize: '0.9rem', color: active ? 'var(--primary)' : 'var(--text-primary)' }}>{tab.label}</div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>{tab.helper}</div>
          </button>
        );
      })}
    </div>
  );
}

export function ExecutiveSummary({ metrics }: { metrics: AdminMetricsSummary }) {
  const stuckCompanies = metrics.companies.filter((company) => company.pondCount === 0 || (company.pondCount > 0 && company.activeCycleCount === 0 && company.feedItemCount + company.additiveItemCount === 0)).length;
  const activeCompanies = metrics.companies.filter((company) => company.activeCycleCount > 0).length;
  const periodRequests = metrics.period.aiRequests + metrics.period.apiRequests + metrics.period.requestLogs;

  return (
    <div className="glass-card admin-founder-summary" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(260px, 1.3fr) repeat(4, minmax(132px, 0.75fr))', gap: '14px', alignItems: 'stretch' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '999px', background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 760, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          <Sparkles size={14} /> Founder summary
        </div>
        <div style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 760, lineHeight: 1.5, letterSpacing: 0 }}>
          Last {metrics.periodDays} days: {formatNumber(metrics.period.newUsers)} new users, {formatNumber(activeCompanies)} active companies, {formatNumber(stuckCompanies)} companies needing help, and {formatNumber(periodRequests)} tracked requests.
        </div>
      </div>
      <SummaryMini label="New users" value={metrics.period.newUsers} icon={Users} />
      <SummaryMini label="Active companies" value={activeCompanies} icon={Building2} />
      <SummaryMini label="Needs help" value={stuckCompanies} icon={UserRoundCheck} />
      <SummaryMini label="Requests" value={periodRequests} icon={Activity} />
    </div>
  );
}

function SummaryMini({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="admin-summary-mini" style={{ padding: '15px', borderRadius: '8px', background: 'var(--bg-mid)', border: '1px solid var(--border)', minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 760, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <Icon size={16} color="var(--primary)" />
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: '1.32rem', fontWeight: 760, fontFamily: 'var(--sans)', letterSpacing: 0 }}>{formatNumber(value)}</div>
    </div>
  );
}

export function DataSourceBadge({ source, updatedAt }: { source: 'Cloud Function' | 'Firestore fallback' | null; updatedAt?: string | null }) {
  if (!source) return null;

  const isFallback = source === 'Firestore fallback';
  const updated = updatedAt ? new Date(updatedAt) : null;
  const updatedLabel = updated && !Number.isNaN(updated.getTime())
    ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(updated)
    : 'Unavailable';

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '999px', background: isFallback ? '#fef3c7' : 'var(--primary-dim)', color: isFallback ? '#92400e' : 'var(--primary)', fontSize: '0.76rem', fontWeight: 700 }}>
      <Database size={15} /> Data source: {source}
      <span style={{ opacity: 0.75 }}>· Updated {updatedLabel}</span>
    </div>
  );
}

export function AdminLoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)', gap: '24px' }}>
        <SkeletonBlock height={300} />
        <SkeletonBlock height={300} />
      </div>
      <SkeletonBlock height={360} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '22px' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-mid)', marginBottom: 22 }} />
      <div style={{ width: '45%', height: 12, borderRadius: 999, background: 'var(--bg-mid)', marginBottom: 12 }} />
      <div style={{ width: '65%', height: 26, borderRadius: 999, background: 'var(--bg-mid)', marginBottom: 14 }} />
      <div style={{ width: '85%', height: 12, borderRadius: 999, background: 'var(--bg-mid)' }} />
    </div>
  );
}

function SkeletonBlock({ height }: { height: number }) {
  return <div className="glass-card" style={{ minHeight: height, background: 'linear-gradient(135deg, rgba(255,255,255,0.82), rgba(248,250,252,0.92))' }} />;
}

export function CompanyTableControls({
  search,
  status,
  sort,
  onSearchChange,
  onStatusChange,
  onSortChange,
}: {
  search: string;
  status: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  return (
    <div className="admin-company-controls" style={{ display: 'grid', gap: '12px', marginBottom: '18px' }}>
      <label style={{ position: 'relative' }}>
        <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search company or owner email"
          style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid var(--border)', padding: '0 14px 0 42px', outline: 'none', color: 'var(--text-primary)', fontWeight: 650 }}
        />
      </label>
      <label style={{ position: 'relative' }}>
        <Filter size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <select value={status} onChange={(event) => onStatusChange(event.target.value)} style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid var(--border)', padding: '0 14px 0 42px', outline: 'none', color: 'var(--text-primary)', fontWeight: 700, background: '#fff' }}>
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Configured">Configured</option>
          <option value="Needs activation">Needs activation</option>
          <option value="Setup incomplete">Setup incomplete</option>
        </select>
      </label>
      <label style={{ position: 'relative' }}>
        <BarChart3 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <select value={sort} onChange={(event) => onSortChange(event.target.value)} style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid var(--border)', padding: '0 14px 0 42px', outline: 'none', color: 'var(--text-primary)', fontWeight: 700, background: '#fff' }}>
          <option value="ponds-desc">Most ponds</option>
          <option value="created-desc">Newest</option>
          <option value="name-asc">Company A-Z</option>
          <option value="team-desc">Largest team</option>
          <option value="inventory-desc">Most inventory</option>
        </select>
      </label>
    </div>
  );
}

export type { AdminTab };
