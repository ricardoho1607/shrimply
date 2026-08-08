"use client";

import React from 'react';
import { AlertTriangle, ArrowRight, Building2, Mail, UserRoundCheck } from 'lucide-react';
import { getCompanyHealth } from './AdminPremiumSections';

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

type AdminMetricsLike = {
  companies: CompanyMetric[];
  recentUsers: AdminUser[];
};

type FollowUpItem = {
  id: string;
  type: 'company' | 'user';
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  issue: string;
  action: string;
  email?: string;
  company?: CompanyMetric;
  user?: AdminUser;
};

const severityStyle = {
  high: { bg: '#fee2e2', color: '#b91c1c', label: 'High' },
  medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
  low: { bg: 'var(--primary-dim)', color: 'var(--primary)', label: 'Low' },
};

const buildFollowUpItems = (metrics: AdminMetricsLike): FollowUpItem[] => {
  const companyItems = metrics.companies
    .filter((company) => company.pondCount === 0 || (company.pondCount > 0 && company.activeCycleCount === 0 && company.feedItemCount + company.additiveItemCount === 0))
    .map((company) => {
      const health = getCompanyHealth(company);
      const setupIncomplete = company.pondCount === 0;
      return {
        id: `company-${company.id}`,
        type: 'company' as const,
        severity: setupIncomplete ? 'high' as const : 'medium' as const,
        title: company.companyName,
        subtitle: company.ownerEmail || 'Owner unavailable',
        issue: health.reason,
        action: setupIncomplete ? 'Message owner and offer help adding the first pond.' : 'Guide the company to complete operational setup.',
        email: company.ownerEmail,
        company,
      };
    });

  const userItems = metrics.recentUsers
    .filter((user) => !user.companyId && user.role !== 'buyer')
    .map((user) => {
      const pendingRequest = user.pendingJoinRequest;
      return {
        id: `user-${user.id}`,
        type: 'user' as const,
        severity: pendingRequest ? 'low' as const : 'medium' as const,
        title: user.name || user.email || 'Unnamed user',
        subtitle: user.email || 'Email unavailable',
        issue: pendingRequest
          ? `Pending approval to join ${pendingRequest.companyName || pendingRequest.companyId} as ${pendingRequest.requestedRole || user.role || 'staff'}.`
          : `Signed up as ${user.role || 'unknown'} but has not joined or created a company.`,
        action: pendingRequest
          ? 'Ask the company owner to approve or reject the join request. The user is waiting on approval, not setup.'
          : 'Follow up and help them complete onboarding.',
        email: user.email,
        user,
      };
    });

  return [...companyItems, ...userItems].slice(0, 14);
};

export function AdminFollowUpQueue({
  metrics,
  onSelectCompany,
  onSelectUser,
  compact = false,
}: {
  metrics: AdminMetricsLike;
  onSelectCompany: (company: CompanyMetric) => void;
  onSelectUser: (user: AdminUser) => void;
  compact?: boolean;
}) {
  const items = buildFollowUpItems(metrics);
  const visibleItems = compact ? items.slice(0, 3) : items;

  if (compact) {
    return (
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.06rem', color: 'var(--text-primary)', fontWeight: 760 }}>Follow-up</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.4 }}>Highest-priority onboarding gaps.</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 999, background: 'var(--primary-dim)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 760 }}>
            {items.length}
          </span>
        </div>

        {visibleItems.length === 0 ? (
          <div style={{ padding: '22px', borderRadius: '8px', background: 'var(--bg-mid)', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 650, fontSize: '0.84rem' }}>
            No follow-up items.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {visibleItems.map((item) => {
              const style = severityStyle[item.severity];
              const Icon = item.type === 'company' ? Building2 : UserRoundCheck;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.company ? onSelectCompany(item.company) : item.user && onSelectUser(item.user)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '30px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 760, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{item.issue}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: style.color, fontSize: '0.68rem', fontWeight: 760, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {style.label}
                    <ArrowRight size={14} />
                  </span>
                </button>
              );
            })}
            {items.length > visibleItems.length && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 650, paddingTop: '2px' }}>
                {items.length - visibleItems.length} more in Follow-up tab.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 760 }}>Follow-up queue</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Prioritized people and companies to contact next.</div>
        </div>
        <AlertTriangle size={22} color="#d97706" />
      </div>

      {visibleItems.length === 0 ? (
        <div style={{ padding: '28px', borderRadius: '8px', background: 'var(--bg-mid)', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 650 }}>
          No obvious follow-up items. Current onboarding looks clean.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {visibleItems.map((item) => {
            const style = severityStyle[item.severity];
            const Icon = item.type === 'company' ? Building2 : UserRoundCheck;
            return (
              <div key={item.id} style={{ padding: '18px', borderRadius: '8px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 760, marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 650, wordBreak: 'break-word' }}>{item.subtitle}</div>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: style.bg, color: style.color, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {style.label}
                  </span>
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Issue:</strong> {item.issue}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Action:</strong> {item.action}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => item.company ? onSelectCompany(item.company) : item.user && onSelectUser(item.user)}
                    className="dashboard-action dashboard-action-primary"
                    style={{ minHeight: 38 }}
                  >
                    <ArrowRight size={16} />
                    <span>Open details</span>
                  </button>
                  {item.email && (
                    <a href={`mailto:${item.email}`} className="dashboard-action dashboard-action-secondary" style={{ minHeight: 38, textDecoration: 'none' }}>
                      <Mail size={16} />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
