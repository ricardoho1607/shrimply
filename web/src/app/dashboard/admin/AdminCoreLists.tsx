"use client";

import React, { useMemo, useState } from 'react';
import { Clock, Copy, Database } from 'lucide-react';
import { CompanyTableControls } from './AdminUxSections';
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
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function EmptyInline({ message }: { message: string }) {
  return (
    <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '8px', background: 'var(--bg-mid)', fontWeight: 600 }}>
      {message}
    </div>
  );
}

export function AdminCompanyTable({ companies, onSelectCompany }: { companies: CompanyMetric[]; onSelectCompany: (company: CompanyMetric) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('ponds-desc');

  const visibleCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return companies
      .filter((company) => {
        const health = getCompanyHealth(company);
        if (statusFilter !== 'all' && health.label !== statusFilter) return false;
        if (!normalizedSearch) return true;
        return [company.id, company.companyName, company.ownerEmail, company.farmType, company.businessSize]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (sort === 'created-desc') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sort === 'name-asc') return a.companyName.localeCompare(b.companyName);
        if (sort === 'team-desc') return b.teamMembersCount - a.teamMembersCount;
        if (sort === 'inventory-desc') return (b.feedItemCount + b.additiveItemCount) - (a.feedItemCount + a.additiveItemCount);
        return b.pondCount - a.pondCount;
      });
  }, [companies, search, sort, statusFilter]);

  const inspectCompany = (company: CompanyMetric) => {
    onSelectCompany(company);
  };

  const copyCompanyId = async (event: React.MouseEvent<HTMLButtonElement>, companyId: string) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(companyId);
    } catch {
      const input = document.createElement('textarea');
      input.value = companyId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '1.14rem', color: 'var(--text-primary)', fontWeight: 600 }}>Company health</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Search, filter, sort, and inspect companies. Click a row for details.</div>
        </div>
        <Database size={22} color="var(--primary)" />
      </div>

      <CompanyTableControls
        search={search}
        status={statusFilter}
        sort={sort}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSortChange={setSort}
      />

      {visibleCompanies.length === 0 ? (
        <EmptyInline message="No companies match the current filters." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1120px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Company', 'Company ID', 'Owner', 'Status', 'Ponds', 'Active', 'Inactive', 'Team', 'Inventory', 'Created'].map((heading) => (
                  <th key={heading} style={{ padding: '12px 10px', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((company) => {
                const health = getCompanyHealth(company);
                return (
                  <tr
                    key={company.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => inspectCompany(company)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inspectCompany(company);
                      }
                    }}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', outlineColor: 'var(--primary)' }}
                  >
                    <td style={{ padding: '16px 10px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{company.companyName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{company.farmType || 'Farm type unavailable'} · {company.businessSize || 'Size unavailable'}</div>
                    </td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '0.76rem', fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{company.id}</span>
                        <button type="button" aria-label={`Copy company ID ${company.id}`} title="Copy company ID" onClick={(event) => void copyCompanyId(event, company.id)} style={{ border: 0, background: 'transparent', color: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}><Copy size={14} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{company.ownerEmail || 'Unavailable'}</td>
                    <td style={{ padding: '16px 10px' }}>
                      <span style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: health.bg, color: health.tone, fontSize: '0.72rem', fontWeight: 600 }}>
                        {health.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>{company.pondCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>{company.activePondCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>{company.inactivePondCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>{company.teamMembersCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{company.feedItemCount + company.additiveItemCount} items</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>{formatDate(company.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminRecentUsers({ users, onSelectUser }: { users: AdminUser[]; onSelectUser: (user: AdminUser) => void }) {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '1.14rem', color: 'var(--text-primary)', fontWeight: 600 }}>Recent users</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Latest signups and activity data from Firestore users. Click a user for details.</div>
        </div>
        <Clock size={22} color="var(--primary)" />
      </div>

      {users.length === 0 ? (
        <EmptyInline message="No user records found." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {users.map((item) => (
            <button key={item.id} onClick={() => onSelectUser(item)} style={{ textAlign: 'left', padding: '18px', borderRadius: '8px', background: 'var(--bg-mid)', border: '1px solid var(--border)', cursor: 'pointer' }} type="button">
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>{item.name || 'Unnamed user'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '12px', wordBreak: 'break-word' }}>{item.email}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span>{item.role || 'No role'}</span>
                <span>{formatDate(item.joinedAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
