'use client';

import { ChevronLeft, ChevronRight, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect } from 'react';
import type { AdminDirectoryFilters, AdminDirectoryResponse } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

const statusOptions: AdminDirectoryFilters['status'][] = ['all', 'Healthy', 'At Risk', 'Inactive', 'Suspended'];

interface UserDirectoryProps {
  response: AdminDirectoryResponse | null;
  selectedUserId: string | null;
  search: string;
  filters: AdminDirectoryFilters;
  loading: boolean;
  error: string | null;
  filtersOpen: boolean;
  plans: string[];
  countries: string[];
  onSearch: (value: string) => void;
  onFilterChange: (filters: AdminDirectoryFilters) => void;
  onFiltersOpen: (open: boolean) => void;
  onSelect: (userId: string) => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  onCloseMobile: () => void;
}

export function UserDirectory({
  response,
  selectedUserId,
  search,
  filters,
  loading,
  error,
  filtersOpen,
  plans,
  countries,
  onSearch,
  onFilterChange,
  onFiltersOpen,
  onSelect,
  onPage,
  onRetry,
  onCloseMobile,
}: UserDirectoryProps) {
  const totalPages = Math.max(1, Math.ceil((response?.total || 0) / (response?.pageSize || 10)));
  const activeFilterCount = Object.values(filters).filter((value) => value !== 'all').length;
  const setFilter = <K extends keyof AdminDirectoryFilters>(key: K, value: AdminDirectoryFilters[K]) => onFilterChange({ ...filters, [key]: value });

  useEffect(() => {
    if (!filtersOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFiltersOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [filtersOpen, onFiltersOpen]);

  return (
    <section className={styles.directory} aria-label="User directory">
      <div className={styles.panelHeading}>
        <div><strong>Users</strong><span>{(response?.platformTotal || 0).toLocaleString()} total</span></div>
        <button type="button" className={styles.mobileClose} onClick={onCloseMobile} aria-label="Close user directory"><X size={17} /></button>
      </div>
      <div className={styles.directoryControls}>
        <label className={styles.compactSearch}>
          <span className={styles.srOnly}>Search visible users</span>
          <Search size={15} aria-hidden="true" />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search users…" />
        </label>
        <button
          type="button"
          className={`${styles.iconButton} ${activeFilterCount ? styles.iconButtonActive : ''}`}
          onClick={() => onFiltersOpen(!filtersOpen)}
          aria-label={filtersOpen ? 'Close user filters' : 'Open user filters'}
          aria-expanded={filtersOpen}
        >
          <Filter size={16} />
          {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterTitle}>
            <span><SlidersHorizontal size={14} /> Directory filters</span>
            <button type="button" onClick={() => onFiltersOpen(false)} aria-label="Close user filters"><X size={14} /></button>
          </div>
          <label>Status<select value={filters.status} onChange={(event) => setFilter('status', event.target.value as AdminDirectoryFilters['status'])}>{statusOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All statuses' : option}</option>)}</select></label>
          <label>Plan<select value={filters.plan} onChange={(event) => setFilter('plan', event.target.value)}>{plans.map((option) => <option key={option} value={option}>{option === 'all' ? 'All plans' : option}</option>)}</select></label>
          <label>Country<select value={filters.country} onChange={(event) => setFilter('country', event.target.value)}>{countries.map((option) => <option key={option} value={option}>{option === 'all' ? 'All countries' : option}</option>)}</select></label>
          <label>Activity<select value={filters.activity} onChange={(event) => setFilter('activity', event.target.value as AdminDirectoryFilters['activity'])}><option value="all">Any activity</option><option value="7d">Active in 7 days</option><option value="30d">Active in 30 days</option><option value="90d+">Inactive 90+ days</option></select></label>
          <label>Registered<select value={filters.registered} onChange={(event) => setFilter('registered', event.target.value as AdminDirectoryFilters['registered'])}><option value="all">Any date</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="year">Last year</option></select></label>
          <button type="button" onClick={() => onFilterChange({ status: 'all', plan: 'all', country: 'all', activity: 'all', registered: 'all' })}>Clear filters</button>
        </div>
      )}

      <div className={styles.userList} aria-busy={loading}>
        {loading && Array.from({ length: 7 }, (_, index) => <div className={styles.userSkeleton} key={index}><i /><span /><em /></div>)}
        {!loading && error && <div className={styles.stateMessage}><strong>Couldn’t load users</strong><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div>}
        {!loading && !error && response?.users.length === 0 && <div className={styles.stateMessage}><Search size={20} /><strong>No matching users</strong><span>Try a broader search or clear a filter.</span></div>}
        {!loading && !error && response?.users.map((user) => (
          <button
            type="button"
            key={user.id}
            className={`${styles.userRow} ${selectedUserId === user.id ? styles.userRowSelected : ''}`}
            onClick={() => onSelect(user.id)}
            aria-pressed={selectedUserId === user.id}
          >
            <span className={styles.userAvatar}>{user.initials}</span>
            <span className={styles.userIdentity}><strong>{user.name}</strong><span>{user.email || 'Email unavailable'}</span></span>
          </button>
        ))}
      </div>

      <div className={styles.pagination}>
        <span>{response?.total ? `${(response.page - 1) * response.pageSize + 1}–${Math.min(response.page * response.pageSize, response.total)} of ${response.total.toLocaleString()}` : '0 users'}</span>
        <div>
          <button type="button" onClick={() => onPage(Math.max(1, (response?.page || 1) - 1))} disabled={(response?.page || 1) <= 1} aria-label="Previous page"><ChevronLeft size={15} /></button>
          <span>{response?.page || 1} / {totalPages}</span>
          <button type="button" onClick={() => onPage(Math.min(totalPages, (response?.page || 1) + 1))} disabled={(response?.page || 1) >= totalPages} aria-label="Next page"><ChevronRight size={15} /></button>
        </div>
      </div>
    </section>
  );
}
