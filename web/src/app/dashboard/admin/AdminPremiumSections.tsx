"use client";

import React from 'react';
import { AlertTriangle, BarChart3, Target, TrendingUp } from 'lucide-react';

type CompanyMetric = {
  id: string;
  companyName: string;
  ownerEmail: string;
  pondCount: number;
  activeCycleCount: number;
  feedItemCount: number;
  additiveItemCount: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
};

type AdminMetricsLike = {
  totals: {
    users: number;
    buyers: number;
    owners: number;
    staff: number;
    companies: number;
    aiRequests: number;
    apiRequests: number;
  };
  period: {
    newCompanies: number;
  };
  dailyNewUsers: Array<{ date: string; count: number }>;
  companies: CompanyMetric[];
  recentUsers: AdminUser[];
};

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function getCompanyHealth(company: CompanyMetric) {
  if (company.pondCount === 0) {
    return {
      label: 'Setup incomplete',
      tone: '#ef4444',
      bg: '#fee2e2',
      reason: 'No ponds added yet',
    };
  }

  if (company.activeCycleCount > 0) {
    return {
      label: 'Active',
      tone: '#16a34a',
      bg: '#dcfce7',
      reason: 'Active cycle detected',
    };
  }

  if (company.feedItemCount + company.additiveItemCount > 0) {
    return {
      label: 'Configured',
      tone: '#0f4c75',
      bg: 'var(--primary-dim)',
      reason: 'Inventory configured',
    };
  }

  return {
    label: 'Needs activation',
    tone: '#d97706',
    bg: '#fef3c7',
    reason: 'Ponds exist, but operational setup looks thin',
  };
}

export function GrowthChart({ metrics }: { metrics: AdminMetricsLike }) {
  const daily = metrics.dailyNewUsers || [];
  const max = Math.max(...daily.map((item) => item.count), 1);

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '1.18rem', color: 'var(--text-primary)', fontWeight: 900 }}>Growth trend</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>New users by day across the selected period.</div>
        </div>
        <TrendingUp size={22} color="var(--primary)" />
      </div>

      <div style={{ display: 'flex', alignItems: 'end', gap: '10px', minHeight: '220px', paddingTop: '12px' }}>
        {daily.map((item) => {
          const height = Math.max(8, (item.count / max) * 180);
          return (
            <div key={item.date} style={{ flex: 1, minWidth: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 900 }}>{item.count}</div>
              <div
                title={`${item.date}: ${item.count} new users`}
                style={{
                  width: '100%',
                  maxWidth: '32px',
                  height,
                  borderRadius: '999px 999px 6px 6px',
                  background: 'var(--gradient)',
                  boxShadow: '0 12px 30px rgba(50, 130, 184, 0.18)',
                }}
              />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 800, transform: daily.length > 14 ? 'rotate(-45deg)' : 'none', minHeight: daily.length > 14 ? '34px' : 'auto' }}>
                {item.date.slice(5)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActivationFunnel({ metrics }: { metrics: AdminMetricsLike }) {
  const companiesWithPonds = metrics.companies.filter((company) => company.pondCount > 0).length;
  const configuredCompanies = metrics.companies.filter((company) => company.pondCount > 0 && (company.activeCycleCount > 0 || company.feedItemCount + company.additiveItemCount > 0)).length;
  const roleSelected = metrics.totals.buyers + metrics.totals.owners + metrics.totals.staff;
  const usedOrsonOrApi = metrics.totals.aiRequests + metrics.totals.apiRequests > 0
    ? Math.max(1, Math.min(configuredCompanies || companiesWithPonds, metrics.totals.companies))
    : 0;

  const funnel = [
    { label: 'Signed up', value: metrics.totals.users },
    { label: 'Selected role', value: roleSelected },
    { label: 'Created company', value: metrics.totals.companies },
    { label: 'Added pond', value: companiesWithPonds },
    { label: 'Configured ops', value: configuredCompanies },
    { label: 'Used AI/API', value: usedOrsonOrApi },
  ];
  const base = Math.max(funnel[0].value, 1);

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '1.18rem', color: 'var(--text-primary)', fontWeight: 900 }}>Activation funnel</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Where users and companies are getting stuck.</div>
        </div>
        <Target size={22} color="var(--primary)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {funnel.map((item) => {
          const width = Math.max(5, (item.value / base) * 100);
          return (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', gap: '12px' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: '0.86rem' }}>{item.label}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.82rem' }}>
                  {formatNumber(item.value)} · {Math.round((item.value / base) * 100)}%
                </span>
              </div>
              <div style={{ height: '12px', borderRadius: '999px', background: 'var(--bg-mid)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${width}%`, borderRadius: '999px', background: 'var(--gradient)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FollowUpList({ metrics }: { metrics: AdminMetricsLike }) {
  const companyItems = metrics.companies
    .filter((company) => company.pondCount === 0 || (company.pondCount > 0 && company.activeCycleCount === 0 && company.feedItemCount + company.additiveItemCount === 0))
    .slice(0, 8)
    .map((company) => ({
      id: `company-${company.id}`,
      title: company.companyName,
      type: 'Company',
      description: getCompanyHealth(company).reason,
    }));

  const userItems = metrics.recentUsers
    .filter((user) => !user.companyId && user.role !== 'buyer')
    .slice(0, 6)
    .map((user) => ({
      id: `user-${user.id}`,
      title: user.name || user.email || 'Unnamed user',
      type: 'User',
      description: 'Signed up but has not joined or created a company.',
    }));

  const items = [...companyItems, ...userItems];

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '1.12rem', color: 'var(--text-primary)', fontWeight: 900 }}>Needs follow-up</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Companies and users worth contacting first.</div>
        </div>
        <AlertTriangle size={22} color="#d97706" />
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '28px', borderRadius: '18px', background: 'var(--bg-mid)', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>
          No obvious follow-up items.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => (
            <div key={item.id} style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'start' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 900, marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>{item.description}</div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase', color: item.type === 'Company' ? '#d97706' : '#0f4c75' }}>
                  {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MiniRoleBreakdown({ metrics }: { metrics: AdminMetricsLike }) {
  const roles = [
    { label: 'Owners', value: metrics.totals.owners },
    { label: 'Buyers', value: metrics.totals.buyers },
    { label: 'Staff/Admin', value: metrics.totals.staff },
  ];
  const max = Math.max(...roles.map((role) => role.value), 1);

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div style={{ fontSize: '1.12rem', color: 'var(--text-primary)', fontWeight: 900 }}>Role mix</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>User composition by role.</div>
        </div>
        <BarChart3 size={22} color="var(--primary)" />
      </div>

      <div style={{ display: 'grid', gap: '14px' }}>
        {roles.map((role) => (
          <div key={role.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{role.label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{formatNumber(role.value)}</span>
            </div>
            <div style={{ height: '10px', background: 'var(--bg-mid)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(5, (role.value / max) * 100)}%`, background: 'var(--gradient)', borderRadius: '999px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
