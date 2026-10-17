'use client';
import { getUserErrorMessage } from '@/lib/userError';


import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowUpDown, Building2, CalendarDays, Check, Loader2, RefreshCcw, Trash2, Users } from 'lucide-react';
import type { AdminDirectoryUser, PlatformOverviewMetrics } from '@/lib/admin/types';
import { createAdminIntelligenceRepository } from '@/lib/admin/adminRepository';
import { BatchDeleteUsersDialog } from './BatchDeleteUsersDialog';
import styles from '@/app/admin/admin.module.css';

interface AdminOverviewProps {
  metrics: PlatformOverviewMetrics | null;
  loading: boolean;
  period: 7 | 30;
  onPeriodChange: (days: 7 | 30) => void;
  onRefresh: () => void;
  onSelectUser: (userId: string) => void;
}

const formatNumber = (value?: number | null) => (value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

type DirectoryViewTab = 'users' | 'farms';
type CompanySortField = 'ponds' | 'ai' | 'cycles' | 'inventory' | 'name' | 'createdAt';
type UserSortField = 'name' | 'lastActive' | 'joined' | 'farm' | 'status';
type SortDirection = 'desc' | 'asc';

const COMPANY_SORT_OPTIONS: Array<{ key: CompanySortField; label: string }> = [
  { key: 'ponds', label: 'Total Ponds' },
  { key: 'ai', label: 'AI Usage' },
  { key: 'cycles', label: 'Active Cycles' },
  { key: 'inventory', label: 'Inventory Items' },
  { key: 'name', label: 'Farm Name' },
  { key: 'createdAt', label: 'Date Created' },
];

const COMPANY_SORT_LABELS: Record<CompanySortField, string> = {
  ponds: 'Ponds',
  ai: 'AI Usage',
  cycles: 'Cycles',
  inventory: 'Inventory',
  name: 'Name',
  createdAt: 'Date',
};

const USER_SORT_OPTIONS: Array<{ key: UserSortField; label: string }> = [
  { key: 'lastActive', label: 'Last Active' },
  { key: 'name', label: 'User Name' },
  { key: 'joined', label: 'Joined Date' },
  { key: 'farm', label: 'Linked Farm' },
  { key: 'status', label: 'Health Status' },
];

const USER_SORT_LABELS: Record<UserSortField, string> = {
  lastActive: 'Last Active',
  name: 'Name',
  joined: 'Joined',
  farm: 'Farm',
  status: 'Status',
};

export function AdminOverview({
  metrics,
  loading,
  period,
  onPeriodChange,
  onRefresh,
  onSelectUser,
}: AdminOverviewProps) {
  const [directoryTab, setDirectoryTab] = useState<DirectoryViewTab>('users');

  // User list states
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userSortBy, setUserSortBy] = useState<UserSortField>('lastActive');
  const [userSortDirection, setUserSortDirection] = useState<SortDirection>('desc');
  const [userSortPopoverOpen, setUserSortPopoverOpen] = useState(false);
  const userSortPopoverRef = useRef<HTMLDivElement>(null);

  // Multi-user batch deletion states
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const repository = useMemo(() => createAdminIntelligenceRepository(), []);

  // Farm list states
  const [farmSearch, setFarmSearch] = useState('');
  const [farmStatusFilter, setFarmStatusFilter] = useState('all');
  const [farmSortBy, setFarmSortBy] = useState<CompanySortField>('ponds');
  const [farmSortDirection, setFarmSortDirection] = useState<SortDirection>('desc');
  const [farmSortPopoverOpen, setFarmSortPopoverOpen] = useState(false);
  const farmSortPopoverRef = useRef<HTMLDivElement>(null);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (filteredList: AdminDirectoryUser[]) => {
    if (selectedUserIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredList.map((u) => u.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds(new Set());
  };

  const handleBatchDelete = async (
    usersToDelete: Array<{ userId: string; name: string; deleteCompany: boolean; farmName?: string }>,
    reason: string,
    onProgress: (current: number, total: number, name: string) => void
  ) => {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < usersToDelete.length; i++) {
      const item = usersToDelete[i];
      onProgress(i + 1, usersToDelete.length, item.name);
      try {
        await repository.deleteUser({
          userId: item.userId,
          reason,
          confirmation: item.userId,
          deleteCompany: item.deleteCompany,
        });
        successCount++;
      } catch (err) {
        failureCount++;
        errors.push(`${item.name}: ${getUserErrorMessage(err, 'Failed')}`);
      }
    }

    repository.invalidateCache();
    return { successCount, failureCount, errors };
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userSortPopoverRef.current && !userSortPopoverRef.current.contains(e.target as Node)) {
        setUserSortPopoverOpen(false);
      }
      if (farmSortPopoverRef.current && !farmSortPopoverRef.current.contains(e.target as Node)) {
        setFarmSortPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleUserSort = (field: UserSortField) => {
    if (userSortBy === field) {
      setUserSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setUserSortBy(field);
      setUserSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const handleToggleFarmSort = (field: CompanySortField) => {
    if (farmSortBy === field) {
      setFarmSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setFarmSortBy(field);
      setFarmSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!metrics?.users) return [];
    const query = userSearch.trim().toLowerCase();
    const filtered = metrics.users.filter((user) => {
      const matchesSearch = !query || [
        user.name,
        user.email,
        user.maskedEmail,
        user.farmName,
        user.plan,
      ].some((val) => (val || '').toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (userStatusFilter === 'all') return true;
      return user.status === userStatusFilter;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (userSortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (userSortBy === 'lastActive') {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        comparison = aTime - bTime;
      } else if (userSortBy === 'joined') {
        const aTime = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const bTime = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        comparison = aTime - bTime;
      } else if (userSortBy === 'farm') {
        comparison = (a.farmName || '').localeCompare(b.farmName || '');
      } else if (userSortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return userSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [userSearch, userStatusFilter, userSortBy, userSortDirection, metrics]);

  const filteredCompanies = useMemo(() => {
    if (!metrics?.companies) return [];
    const query = farmSearch.trim().toLowerCase();
    const filtered = metrics.companies.filter((company) => {
      const matchesSearch = !query || [
        company.companyName,
        company.ownerEmail,
        company.farmType,
      ].some((val) => (val || '').toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (farmStatusFilter === 'all') return true;
      if (farmStatusFilter === 'active') return company.activeCycleCount > 0;
      if (farmStatusFilter === 'configured') return company.pondCount > 0 && company.activeCycleCount === 0;
      if (farmStatusFilter === 'incomplete') return company.pondCount === 0;
      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (farmSortBy === 'ponds') {
        comparison = (a.pondCount || 0) - (b.pondCount || 0);
      } else if (farmSortBy === 'ai') {
        comparison = (a.aiRequestCount || 0) - (b.aiRequestCount || 0);
      } else if (farmSortBy === 'cycles') {
        comparison = (a.activeCycleCount || 0) - (b.activeCycleCount || 0);
      } else if (farmSortBy === 'inventory') {
        const aInv = (a.feedItemCount || 0) + (a.additiveItemCount || 0);
        const bInv = (b.feedItemCount || 0) + (b.additiveItemCount || 0);
        comparison = aInv - bInv;
      } else if (farmSortBy === 'name') {
        comparison = (a.companyName || '').localeCompare(b.companyName || '');
      } else if (farmSortBy === 'createdAt') {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = aTime - bTime;
      }
      return farmSortDirection === 'desc' ? -comparison : comparison;
    });
  }, [farmSearch, farmStatusFilter, farmSortBy, farmSortDirection, metrics]);

  const selectedUsersList = useMemo(() => {
    if (!metrics?.users) return [];
    return metrics.users.filter((u) => selectedUserIds.has(u.id));
  }, [selectedUserIds, metrics]);

  if (loading && !metrics) {
    return (
      <div className={styles.stateMessage}>
        <Loader2 className={styles.spin} size={28} />
        <strong>Loading Platform Overview…</strong>
        <span>Aggregating real-time farm operations and user activity</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={styles.stateMessage}>
        <AlertTriangle size={28} color="var(--admin-amber)" />
        <strong>Overview Data Unavailable</strong>
        <span>Could not load platform metrics from Firestore.</span>
        <button type="button" onClick={onRefresh}>Try again</button>
      </div>
    );
  }

  const daily = metrics.dailyNewUsers || [];
  const maxDaily = Math.max(...daily.map((d) => d.count), 1);

  // 7-step aquaculture activation funnel
  const companiesList = metrics.companies || [];
  const companiesWithPonds = companiesList.filter((c) => (c.pondCount || 0) > 0).length;
  const companiesWithCycles = companiesList.filter((c) => (c.activeCycleCount || 0) > 0).length;
  const companiesWithInventory = companiesList.filter((c) => ((c.feedItemCount || 0) + (c.additiveItemCount || 0)) > 0).length;
  const companiesWithAi = companiesList.filter((c) => (c.aiRequestCount || 0) > 0).length;

  const totalUsers = metrics.totals?.users ?? metrics.users?.length ?? 0;
  const totalOwners = metrics.totals?.owners ?? metrics.users?.filter((u) => u.plan === 'Owner' || u.plan === 'Farm Owner').length ?? 0;
  const totalStaff = metrics.totals?.staff ?? 0;
  const totalBuyers = metrics.totals?.buyers ?? 0;
  const totalCompanies = metrics.totals?.companies ?? metrics.companies?.length ?? 0;
  const totalPonds = metrics.totals?.ponds ?? metrics.companies?.reduce((sum, c) => sum + (c.pondCount || 0), 0) ?? 0;
  const activePonds = metrics.totals?.activePonds ?? metrics.companies?.reduce((sum, c) => sum + (c.activePondCount || 0), 0) ?? 0;
  const inactivePonds = metrics.totals?.inactivePonds ?? metrics.companies?.reduce((sum, c) => sum + (c.inactivePondCount || 0), 0) ?? Math.max(0, totalPonds - activePonds);
  const activeCycles = metrics.totals?.activeCycles ?? metrics.companies?.reduce((sum, c) => sum + (c.activeCycleCount || 0), 0) ?? 0;
  const marketplaceListings = metrics.totals?.marketplaceListings ?? 0;
  const totalAiRequests = metrics.totals?.aiRequests ?? metrics.companies?.reduce((sum, c) => sum + (c.aiRequestCount || 0), 0) ?? 0;
  const periodNewUsers = metrics.period?.newUsers ?? 0;
  const periodAiRequests = metrics.period?.aiRequests ?? totalAiRequests;

  const baseUsers = Math.max(totalUsers, 1);

  const funnelSteps = [
    { label: '1. Registered Users', count: totalUsers, pct: 100 },
    { label: '2. Role Selected', count: (totalOwners + totalStaff + totalBuyers), pct: Math.round(((totalOwners + totalStaff + totalBuyers) / baseUsers) * 100) },
    { label: '3. Farm / Company Created', count: totalCompanies, pct: Math.round((totalCompanies / baseUsers) * 100) },
    { label: '4. Physical Ponds Configured', count: companiesWithPonds, pct: Math.round((companiesWithPonds / baseUsers) * 100) },
    { label: '5. Production Cycle Stocked', count: companiesWithCycles, pct: Math.round((companiesWithCycles / baseUsers) * 100) },
    { label: '6. Feed Inventory Configured', count: companiesWithInventory, pct: Math.round((companiesWithInventory / baseUsers) * 100) },
    { label: '7. Orson AI Adopted', count: companiesWithAi, pct: Math.round((companiesWithAi / baseUsers) * 100) },
  ];

  return (
    <div className={styles.overviewContainer}>
      {/* Top Header & Range Controls */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewHeaderTitle}>
          <h2>User Database & Growth</h2>
          <p>Real-time platform user directory, 7-step activation funnel, and farm triage.</p>
        </div>
        <div className={styles.overviewControls}>
          <button
            type="button"
            className={`${styles.periodButton} ${period === 7 ? styles.periodButtonActive : ''}`}
            onClick={() => onPeriodChange(7)}
          >
            <CalendarDays size={14} />
            7 Days
          </button>
          <button
            type="button"
            className={`${styles.periodButton} ${period === 30 ? styles.periodButtonActive : ''}`}
            onClick={() => onPeriodChange(30)}
          >
            <CalendarDays size={14} />
            30 Days
          </button>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh overview data"
            aria-label="Refresh overview data"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Users & Role Mix */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Users & Role Mix</span>
          </div>
          <div className={styles.kpiValue}>{formatNumber(totalUsers)}</div>
          <div className={styles.kpiSubtext}>
            <span>{formatNumber(periodNewUsers)} new in {period}d</span>
            <span>·</span>
            <span className={styles.kpiBadge}>{totalOwners} Owners</span>
            <span className={styles.kpiBadge}>{totalStaff} Staff</span>
            <span className={styles.kpiBadge}>{totalBuyers} Buyers</span>
          </div>
        </div>

        {/* Card 2: Farms & Production */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Farms & Production</span>
          </div>
          <div className={styles.kpiValue}>{formatNumber(totalCompanies)}</div>
          <div className={styles.kpiSubtext}>
            <span>{formatNumber(totalPonds)} total ponds</span>
            <span>·</span>
            <span className={styles.kpiBadge} style={{ color: '#166534', background: '#dcfce7' }}>
              {activePonds} Active
            </span>
            <span className={styles.kpiBadge}>
              {inactivePonds} Idle
            </span>
          </div>
        </div>

        {/* Card 3: Active Production Cycles */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Active Cycles</span>
          </div>
          <div className={styles.kpiValue}>{formatNumber(activeCycles)}</div>
          <div className={styles.kpiSubtext}>
            <span>Stocked ponds currently running cycles</span>
            <span>·</span>
            <span className={styles.kpiBadge} style={{ color: '#0369a1', background: '#e0f2fe' }}>
              {marketplaceListings} Market listings
            </span>
          </div>
        </div>

        {/* Card 4: Orson AI Consultations */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Orson AI Usage</span>
          </div>
          <div className={styles.kpiValue}>{formatNumber(totalAiRequests)}</div>
          <div className={styles.kpiSubtext}>
            <span>{formatNumber(periodAiRequests)} requests in last {period}d</span>
            <span>·</span>
            <span className={styles.kpiBadge}>
              {companiesWithAi} Farms active
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Row: Growth Velocity & Activation Funnel */}
      <div className={styles.analyticsRow}>
        {/* Left: User Growth Bars */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsCardHeader}>
            <h3>User Registration Velocity</h3>
            <span>Last {period} days ({metrics.period.newUsers} new registrations)</span>
          </div>

          <div className={styles.growthBarsWrap}>
            {daily.map((d) => {
              const heightPct = Math.max(Math.round((d.count / maxDaily) * 100), 6);
              const [y, m, dayNum] = d.date.split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, Number(dayNum));
              const label = dateObj.toLocaleDateString(undefined, { weekday: 'narrow', month: 'numeric', day: 'numeric' });

              return (
                <div key={d.date} className={styles.growthBarCol} title={`${d.count} new users on ${d.date}`}>
                  <span className={styles.growthBarVal}>{d.count > 0 ? d.count : ''}</span>
                  <div
                    className={styles.growthBarPill}
                    style={{ height: `${heightPct}%`, minHeight: 4 }}
                  />
                  <span className={styles.growthBarLabel}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Activation Funnel */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsCardHeader}>
            <h3>Aquaculture Conversion Funnel</h3>
            <span>Activation rate across 7 steps</span>
          </div>

          <div className={styles.funnelList}>
            {funnelSteps.map((step) => (
              <div key={step.label} className={styles.funnelStep}>
                <div className={styles.funnelStepMeta}>
                  <strong>{step.label}</strong>
                  <span>{step.count} ({step.pct}%)</span>
                </div>
                <div className={styles.funnelProgressTrack}>
                  <div
                    className={styles.funnelProgressBar}
                    style={{ width: `${Math.max(step.pct, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Farm Triage Action Board */}
      <div className={styles.triageSection}>
        <div className={styles.analyticsCardHeader}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text)' }}>
              Operational Health & Triage Priorities
            </h3>
            <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
              Farms requiring attention based on production activity and cycle health
            </span>
          </div>
          <span className={styles.kpiBadge} style={{ background: '#fee2e2', color: '#b91c1c' }}>
            {(metrics.triage || []).length} Needs Review
          </span>
        </div>

        {(!metrics.triage || metrics.triage.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-muted)', fontSize: 12 }}>
            No operational warnings or degraded farms detected.
          </div>
        ) : (
          <div className={styles.triageGrid}>
            {(metrics.triage || []).map((item) => {
              const isHigh = item.severity === 'high';
              const urgencyLabel = isHigh ? 'High' : item.severity === 'medium' ? 'Medium' : 'Low';

              return (
                <div key={item.id} className={styles.triageCard}>
                  <div className={styles.triageTopRow}>
                    <div className={styles.triageTitle}>
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </div>
                    <span className={isHigh ? styles.triageBadgeHigh : styles.triageBadgeMedium}>
                      {urgencyLabel}
                    </span>
                  </div>

                  <div className={styles.triageIssue}>
                    <strong>Issue:</strong> {item.issue}
                    <br />
                    <em>Recommended Action: {item.action}</em>
                  </div>

                  {item.userId && (
                    <button
                      type="button"
                      className={styles.triageInspectBtn}
                      onClick={() => onSelectUser(item.userId!)}
                    >
                      <span>Inspect Account</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Directory Section: Users & Farms */}
      <div className={styles.farmTableSection}>
        <div className={styles.tableControlsRow}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className={`${styles.detailTabButton} ${directoryTab === 'users' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setDirectoryTab('users')}
              >
                <Users size={15} />
                <span>Users ({filteredUsers.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${directoryTab === 'farms' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setDirectoryTab('farms')}
              >
                <Building2 size={15} />
                <span>Farms ({filteredCompanies.length})</span>
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
              {directoryTab === 'users'
                ? 'Check the box next to user names to perform multiple deletions or open individual profiles.'
                : 'Registered tenant farm companies, pond infrastructure, and active production cycles.'}
            </p>
          </div>

          {directoryTab === 'users' ? (
            <div className={styles.tableControlsRight}>
              <input
                type="text"
                className={styles.tableSearchInput}
                placeholder="Search user, email, farm..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className={styles.tableSearchInput}
                style={{ minWidth: 130, cursor: 'pointer' }}
                title="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="Healthy">Healthy</option>
                <option value="At Risk">At Risk</option>
                <option value="Inactive">Inactive</option>
              </select>

              <div className={styles.sortPopoverWrapper} ref={userSortPopoverRef}>
                <button
                  type="button"
                  className={styles.sortPopoverTrigger}
                  onClick={() => setUserSortPopoverOpen((prev) => !prev)}
                  title="Sort user directory"
                >
                  <ArrowUpDown size={14} />
                  <span>
                    Sort: {USER_SORT_LABELS[userSortBy]} ({userSortDirection === 'desc' ? (userSortBy === 'name' ? 'Z→A' : 'Newest/High') : (userSortBy === 'name' ? 'A→Z' : 'Oldest/Low')})
                  </span>
                </button>

                {userSortPopoverOpen && (
                  <div className={styles.sortPopoverMenu} role="menu">
                    <div className={styles.sortPopoverSectionLabel}>Sort By</div>
                    {USER_SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`${styles.sortPopoverItem} ${userSortBy === opt.key ? styles.sortPopoverItemActive : ''}`}
                        onClick={() => {
                          setUserSortBy(opt.key);
                        }}
                      >
                        <span>{opt.label}</span>
                        {userSortBy === opt.key && <Check size={13} />}
                      </button>
                    ))}

                    <div className={styles.sortPopoverDivider} />

                    <div className={styles.sortPopoverSectionLabel}>Direction</div>
                    <button
                      type="button"
                      className={`${styles.sortPopoverItem} ${userSortDirection === 'desc' ? styles.sortPopoverItemActive : ''}`}
                      onClick={() => setUserSortDirection('desc')}
                    >
                      <span>{userSortBy === 'name' ? 'Z → A' : 'Newest / High First'}</span>
                      {userSortDirection === 'desc' && <Check size={13} />}
                    </button>
                    <button
                      type="button"
                      className={`${styles.sortPopoverItem} ${userSortDirection === 'asc' ? styles.sortPopoverItemActive : ''}`}
                      onClick={() => setUserSortDirection('asc')}
                    >
                      <span>{userSortBy === 'name' ? 'A → Z' : 'Oldest / Low First'}</span>
                      {userSortDirection === 'asc' && <Check size={13} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.tableControlsRight}>
              <input
                type="text"
                className={styles.tableSearchInput}
                placeholder="Search farm name or owner..."
                value={farmSearch}
                onChange={(e) => setFarmSearch(e.target.value)}
              />
              <select
                value={farmStatusFilter}
                onChange={(e) => setFarmStatusFilter(e.target.value)}
                className={styles.tableSearchInput}
                style={{ minWidth: 130, cursor: 'pointer' }}
                title="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Cycle</option>
                <option value="configured">Configured Ponds</option>
                <option value="incomplete">Setup Incomplete</option>
              </select>

              <div className={styles.sortPopoverWrapper} ref={farmSortPopoverRef}>
                <button
                  type="button"
                  className={styles.sortPopoverTrigger}
                  onClick={() => setFarmSortPopoverOpen((prev) => !prev)}
                  title="Sort farm directory"
                >
                  <ArrowUpDown size={14} />
                  <span>
                    Sort: {COMPANY_SORT_LABELS[farmSortBy]} ({farmSortDirection === 'desc'
                      ? (farmSortBy === 'name' ? 'Z→A' : farmSortBy === 'createdAt' ? 'Newest' : 'High→Low')
                      : (farmSortBy === 'name' ? 'A→Z' : farmSortBy === 'createdAt' ? 'Oldest' : 'Low→High')})
                  </span>
                </button>

                {farmSortPopoverOpen && (
                  <div className={styles.sortPopoverMenu} role="menu">
                    <div className={styles.sortPopoverSectionLabel}>Sort By</div>
                    {COMPANY_SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`${styles.sortPopoverItem} ${farmSortBy === opt.key ? styles.sortPopoverItemActive : ''}`}
                        onClick={() => {
                          setFarmSortBy(opt.key);
                        }}
                      >
                        <span>{opt.label}</span>
                        {farmSortBy === opt.key && <Check size={13} />}
                      </button>
                    ))}

                    <div className={styles.sortPopoverDivider} />

                    <div className={styles.sortPopoverSectionLabel}>Direction</div>
                    <button
                      type="button"
                      className={`${styles.sortPopoverItem} ${farmSortDirection === 'desc' ? styles.sortPopoverItemActive : ''}`}
                      onClick={() => setFarmSortDirection('desc')}
                    >
                      <span>{farmSortBy === 'name' ? 'Z → A' : farmSortBy === 'createdAt' ? 'Newest First' : 'High to Low (Descending)'}</span>
                      {farmSortDirection === 'desc' && <Check size={13} />}
                    </button>
                    <button
                      type="button"
                      className={`${styles.sortPopoverItem} ${farmSortDirection === 'asc' ? styles.sortPopoverItemActive : ''}`}
                      onClick={() => setFarmSortDirection('asc')}
                    >
                      <span>{farmSortBy === 'name' ? 'A → Z' : farmSortBy === 'createdAt' ? 'Oldest First' : 'Low to High (Ascending)'}</span>
                      {farmSortDirection === 'asc' && <Check size={13} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bulk Action Bar for Selected Users */}
        {directoryTab === 'users' && selectedUserIds.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: '#fff1f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 22,
                  height: 22,
                  padding: '0 6px',
                  borderRadius: 11,
                  background: '#e11d48',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {selectedUserIds.size}
              </span>
              <strong style={{ fontSize: 12, color: '#9f1239' }}>
                {selectedUserIds.size} {selectedUserIds.size === 1 ? 'user' : 'users'} selected for bulk actions
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(filteredUsers)}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbdbe7',
                  background: '#ffffff',
                  color: 'var(--admin-text)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {selectedUserIds.size === filteredUsers.length ? 'Deselect All' : `Select All (${filteredUsers.length})`}
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                style={{
                  height: 32,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #cbdbe7',
                  background: '#ffffff',
                  color: 'var(--admin-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setBatchDeleteOpen(true)}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 6,
                  border: '1px solid #e11d48',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={13} />
                Delete Selected ({selectedUserIds.size})
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableWrapper}>
          {directoryTab === 'users' ? (
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th style={{ width: 38, textAlign: 'center', padding: '10px 8px' }}>
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                      onChange={() => handleToggleSelectAll(filteredUsers)}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--admin-cyan)' }}
                      title="Select all"
                      aria-label="Select all"
                    />
                  </th>
                  <th onClick={() => handleToggleUserSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by user name">
                    User {userSortBy === 'name' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleToggleUserSort('farm')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by linked farm">
                    Linked Farm {userSortBy === 'farm' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Plan & Region</th>
                  <th onClick={() => handleToggleUserSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by health status">
                    Status {userSortBy === 'status' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => handleToggleUserSort('joined')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by join date">
                    Joined {userSortBy === 'joined' ? (userSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleToggleUserSort('lastActive')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by last active">
                    Last Active {userSortBy === 'lastActive' ? (userSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-muted)' }}>
                      No users match the current search filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isHealthy = user.status === 'Healthy';
                    const isAtRisk = user.status === 'At Risk';
                    const isChecked = selectedUserIds.has(user.id);

                    return (
                      <tr
                        key={user.id}
                        onClick={() => onSelectUser(user.id)}
                        style={{ cursor: 'pointer', background: isChecked ? '#fff1f2' : undefined }}
                        title={`Click to open ${user.name} in User Database`}
                      >
                        <td style={{ width: 38, textAlign: 'center', padding: '10px 8px' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleUser(user.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#e11d48' }}
                            title={`Select ${user.name}`}
                            aria-label={`Select ${user.name}`}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span className={styles.avatarSmall}>{user.initials}</span>
                            <div>
                              <strong>{user.name}</strong>
                              <div style={{ fontSize: 11, color: 'var(--admin-muted)' }}>{user.email || user.maskedEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{user.farmName || 'No farm linked'}</strong>
                        </td>
                        <td>
                          <span>{user.plan}</span>
                          <div style={{ fontSize: 10, color: 'var(--admin-muted)' }}>{user.country}</div>
                        </td>
                        <td>
                          {isHealthy && <span className={styles.healthPillActive}>Healthy</span>}
                          {isAtRisk && <span className={styles.healthPillIncomplete} style={{ background: '#fef3c7', color: '#92400e' }}>At Risk</span>}
                          {!isHealthy && !isAtRisk && <span className={styles.healthPillIncomplete}>Inactive</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                            {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                            {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Never'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className={styles.triageInspectBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectUser(user.id);
                            }}
                            title="Open user in User Database"
                          >
                            <span>Open Database</span>
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th onClick={() => handleToggleFarmSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by name">
                    Farm / Company {farmSortBy === 'name' ? (farmSortDirection === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Owner Contact</th>
                  <th onClick={() => handleToggleFarmSort('ponds')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by total ponds">
                    Ponds (Active / Idle) {farmSortBy === 'ponds' ? (farmSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleToggleFarmSort('cycles')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by active cycles">
                    Active Cycles {farmSortBy === 'cycles' ? (farmSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleToggleFarmSort('inventory')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by inventory items">
                    Inventory {farmSortBy === 'inventory' ? (farmSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleToggleFarmSort('ai')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by AI usage">
                    Orson AI {farmSortBy === 'ai' ? (farmSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th onClick={() => handleToggleFarmSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }} title="Sort by creation date">
                    Created {farmSortBy === 'createdAt' ? (farmSortDirection === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-muted)' }}>
                      No farms match the current search filters.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((company) => {
                    const activePonds = company.activePondCount || 0;
                    const idlePonds = company.inactivePondCount ?? Math.max(0, (company.pondCount || 0) - activePonds);
                    const totalInventory = (company.feedItemCount || 0) + (company.additiveItemCount || 0);

                    return (
                      <tr key={company.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div className={styles.kpiIconWrap} style={{ width: 28, height: 28 }}>
                              <Building2 size={15} />
                            </div>
                            <div>
                              <strong>{company.companyName}</strong>
                              <div style={{ fontSize: 10, color: 'var(--admin-muted)' }}>
                                {company.farmType || 'Shrimp Aquaculture'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span>{company.ownerEmail || 'Unassigned'}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong>{company.pondCount}</strong>
                            <span style={{ fontSize: 10, color: 'var(--admin-muted)' }}>
                              ({activePonds} active · {idlePonds} idle)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={company.activeCycleCount > 0 ? styles.healthPillActive : styles.healthPillIncomplete}
                          >
                            {company.activeCycleCount} Active
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                            {totalInventory} ({company.feedItemCount} Feeds · {company.additiveItemCount} Additives)
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 650, color: company.aiRequestCount > 0 ? '#0F4C75' : 'var(--admin-muted)' }}>
                            {company.aiRequestCount} Invocations
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                            {company.createdAt ? new Date(company.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {company.ownerId ? (
                            <button
                              type="button"
                              className={styles.triageInspectBtn}
                              onClick={() => onSelectUser(company.ownerId!)}
                              title="Inspect owner account in User Database"
                            >
                              <span>Inspect Owner</span>
                              <ArrowRight size={13} />
                            </button>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--admin-muted)' }}>No Owner ID</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      <BatchDeleteUsersDialog
        open={batchDeleteOpen}
        users={selectedUsersList}
        onClose={() => setBatchDeleteOpen(false)}
        onBatchDelete={handleBatchDelete}
        onSuccess={() => {
          setSelectedUserIds(new Set());
          onRefresh();
        }}
      />
    </div>
  );
}
