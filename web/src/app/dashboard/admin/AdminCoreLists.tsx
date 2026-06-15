"use client";

import React, { useMemo, useState } from 'react';
import { Clock, Database } from 'lucide-react';
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

const formatDate = (value?: string | null) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

function EmptyInline({ message }: { message: string }) {
  return (
    <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '8px', background: 'var(--bg-mid)', fontWeight: 650 }}>
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
        return [company.companyName, company.ownerEmail, company.farmType, company.businessSize]
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

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px' }}>
        <div>
          <div style={{ fontSize: '1.14rem', color: 'var(--text-primary)', fontWeight: 760 }}>Company health</div>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Company', 'Owner', 'Status', 'Ponds', 'Team', 'Inventory', 'Created'].map((heading) => (
                  <th key={heading} style={{ padding: '12px 10px', fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 760 }}>{heading}</th>
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
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inspectCompany(company);
                      }
                    }}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', outlineColor: 'var(--primary)' }}
                  >
                    <td style={{ padding: '16px 10px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 760 }}>{company.companyName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{company.farmType || 'Farm type unavailable'} · {company.businessSize || 'Size unavailable'}</div>
                    </td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{company.ownerEmail || 'Unavailable'}</td>
                    <td style={{ padding: '16px 10px' }}>
                      <span style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', background: health.bg, color: health.tone, fontSize: '0.72rem', fontWeight: 700 }}>
                        {health.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 760 }}>{company.pondCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-primary)', fontWeight: 760 }}>{company.teamMembersCount}</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{company.feedItemCount + company.additiveItemCount} items</td>
                    <td style={{ padding: '16px 10px', color: 'var(--text-muted)', fontWeight: 700 }}>{formatDate(company.createdAt)}</td>
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
          <div style={{ fontSize: '1.14rem', color: 'var(--text-primary)', fontWeight: 760 }}>Recent users</div>
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
              <div style={{ color: 'var(--text-primary)', fontWeight: 760, marginBottom: '4px' }}>{item.name || 'Unnamed user'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 650, marginBottom: '12px', wordBreak: 'break-word' }}>{item.email}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 650 }}>
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
