"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  Database,
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
import { app } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

type Period = 7 | 30;

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
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string | null;
    joinedAt: string | null;
    lastActive: string | null;
  }>;
  companies: CompanyMetric[];
};

const ADMIN_EMAILS = ['ricardofransiskusho@gmail.com'];

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: any }) {
  return (
    <div className="glass-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
        }}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 900, marginBottom: '8px' }}>
          {label}
        </div>
        <div style={{ fontSize: '1.7rem', color: 'var(--text-primary)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', fontFamily: 'var(--jakarta)' }}>
          {value}
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {helper}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card" style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>
      {message}
    </div>
  );
}

export default function HiddenAdminPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>(7);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAllowed = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return ADMIN_EMAILS.includes(email);
  }, [user?.email]);

  const loadMetrics = async () => {
    if (!isAllowed) return;
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions(app);
      const getAdminMetrics = httpsCallable<{ days: Period }, AdminMetrics>(functions, 'getAdminMetrics');
      const response = await getAdminMetrics({ days: period });
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Failed to load admin metrics:', err);
      setError(err?.message || 'Failed to load admin metrics. Check that the admin Cloud Function has been deployed.');
    } finally {
      setLoading(false);
    }
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
            <p className="dashboard-hero-subtitle">
              This page is hidden and restricted to the Shrimply founder account.
            </p>
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
            <span className="dashboard-hero-date">
              {metrics ? `Updated ${formatDate(metrics.generatedAt)}` : 'Private route'}
            </span>
          </div>
          <p className="dashboard-hero-subtitle">
            Hidden admin view for growth, companies, user activity, and AI/API request usage. This page is not linked from the dashboard sidebar.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <div className="dashboard-action-row">
            {[7, 30].map((days) => (
              <button
                key={days}
                onClick={() => setPeriod(days as Period)}
                className={`dashboard-action ${period === days ? 'dashboard-action-primary' : 'dashboard-action-secondary'}`}
                type="button"
              >
                <CalendarDays size={18} />
                <span>{days} days</span>
              </button>
            ))}
            <button onClick={loadMetrics} className="dashboard-action dashboard-action-secondary" type="button" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
              <span>Refresh</span>
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
        <div style={{ minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="animate-spin" size={46} color="var(--primary)" />
        </div>
      ) : metrics ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            <MetricCard label={`New users, ${period} days`} value={formatNumber(metrics.period.newUsers)} helper={`${formatNumber(metrics.period.activeUsers)} active users in the same period`} icon={Users} />
            <MetricCard label="Total users" value={formatNumber(metrics.totals.users)} helper={`${formatNumber(metrics.totals.buyers)} buyers, ${formatNumber(metrics.totals.owners)} owners, ${formatNumber(metrics.totals.staff)} staff/admin users`} icon={ShieldCheck} />
            <MetricCard label="Companies" value={formatNumber(metrics.totals.companies)} helper={`${formatNumber(metrics.period.newCompanies)} new companies in the selected period`} icon={Building2} />
            <MetricCard label="Ponds" value={formatNumber(metrics.totals.ponds)} helper="Total pond records across all companies" icon={Waves} />
            <MetricCard label="Marketplace" value={formatNumber(metrics.totals.marketplaceListings)} helper="Active and historical marketplace listing records" icon={Store} />
            <MetricCard label="AI/API requests" value={formatNumber(metrics.period.aiRequests + metrics.period.apiRequests + metrics.period.requestLogs)} helper={`${formatNumber(metrics.period.aiRequests)} AI requests in this period`} icon={Zap} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)', gap: '24px', alignItems: 'start' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 900 }}>Companies</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Company names, owners, ponds, team size, and inventory footprint.</div>
                </div>
                <Database size={22} color="var(--primary)" />
              </div>

              {metrics.companies.length === 0 ? (
                <EmptyState message="No company records found." />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        {['Company', 'Owner', 'Ponds', 'Team', 'Inventory', 'Created'].map((heading) => (
                          <th key={heading} style={{ padding: '12px 10px', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 900 }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.companies.map((company) => (
                        <tr key={company.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '16px 10px' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 900 }}>{company.companyName}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{company.farmType || 'Farm type unavailable'} · {company.businessSize || 'Size unavailable'}</div>
                          </td>
                          <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{company.ownerEmail || 'Unavailable'}</td>
                          <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 900 }}>{company.pondCount}</td>
                          <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 900 }}>{company.teamMembersCount}</td>
                          <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{company.feedItemCount + company.additiveItemCount} items</td>
                          <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{formatDate(company.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '1.12rem', color: 'var(--text-primary)', fontWeight: 900 }}>Daily new users</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Selected {period} day period</div>
                  </div>
                  <BarChart3 size={22} color="var(--primary)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {metrics.dailyNewUsers.map((item) => {
                    const max = Math.max(...metrics.dailyNewUsers.map((d) => d.count), 1);
                    const width = Math.max(6, (item.count / max) * 100);
                    return (
                      <div key={item.date} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 32px', gap: '10px', alignItems: 'center' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 800 }}>{item.date.slice(5)}</div>
                        <div style={{ height: '10px', background: 'var(--bg-mid)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${width}%`, height: '100%', background: 'var(--gradient)', borderRadius: '999px' }} />
                        </div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 900, textAlign: 'right' }}>{item.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 900 }}>Recent users</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Latest signups and activity data from Firestore users.</div>
              </div>
              <Clock size={22} color="var(--primary)" />
            </div>
            {metrics.recentUsers.length === 0 ? (
              <EmptyState message="No user records found." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {metrics.recentUsers.map((item) => (
                  <div key={item.id} style={{ padding: '18px', borderRadius: '16px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 900, marginBottom: '4px' }}>{item.name || 'Unnamed user'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px', wordBreak: 'break-word' }}>{item.email}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 800 }}>
                      <span>{item.role || 'No role'}</span>
                      <span>{formatDate(item.joinedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message="No admin metrics loaded yet." />
      )}
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 900, fontFamily: 'var(--jakarta)' }}>{formatNumber(value)}</span>
    </div>
  );
}
