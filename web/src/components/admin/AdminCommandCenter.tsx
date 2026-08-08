'use client';

import { onIdTokenChanged, signOut } from 'firebase/auth';
import { Clock3, LockKeyhole, Search, ShieldCheck, Users, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { createAdminIntelligenceRepository } from '@/lib/admin/adminRepository';
import { shouldSyncAdminSelection } from '@/lib/admin/adminCore';
import type { AccountIntelligence, AdminDirectoryFilters, AdminDirectoryResponse } from '@/lib/admin/types';
import { AccountDetail } from './AccountDetail';
import { AdminSidebar, MobilePanelButton } from './AdminSidebar';
import { AccountTimeline } from './AccountTimeline';
import { DeleteUserDialog } from './DeleteUserDialog';
import { UserDirectory } from './UserDirectory';
import styles from '@/app/admin/admin.module.css';

const DEFAULT_FILTERS: AdminDirectoryFilters = { status: 'all', plan: 'all', country: 'all', activity: 'all', registered: 'all' };
type AccessState = 'checking' | 'allowed' | 'denied' | 'signed-out';

export default function AdminCommandCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get('user');
  const [access, setAccess] = useState<AccessState>('checking');
  const [owner, setOwner] = useState({ name: 'Shrimply Owner', email: '' });
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [directory, setDirectory] = useState<AdminDirectoryResponse | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(requestedUserId);
  const [account, setAccount] = useState<AccountIntelligence | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [directoryDrawer, setDirectoryDrawer] = useState(false);
  const [timelineDrawer, setTimelineDrawer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountIntelligence | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const repository = useMemo(() => createAdminIntelligenceRepository(), []);
  const searchRequestRef = useRef(0);
  const accountRequestRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 180);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    return onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setAccess('signed-out'); return; }
      const token = await firebaseUser.getIdTokenResult(true);
      const allowed = token.claims.platformOwner === true || token.claims.platformRole === 'owner';
      setOwner({ name: firebaseUser.displayName || 'Owner Account', email: firebaseUser.email || 'Authenticated owner' });
      setAccess(allowed ? 'allowed' : 'denied');
    });
  }, []);

  const loadDirectory = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++searchRequestRef.current;
    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      const response = await repository.searchAccounts({ search: debouncedQuery, filters, page, pageSize: 10 });
      if (requestId !== searchRequestRef.current) return;
      setDirectory(response);
      setSelectedId((currentId) => {
        if (currentId && response.users.some((user) => user.id === currentId)) return currentId;
        return requestedUserId && response.users.some((user) => user.id === requestedUserId) ? requestedUserId : response.users[0]?.id || null;
      });
    } catch (loadError) {
      if (requestId === searchRequestRef.current) setDirectoryError(loadError instanceof Error ? loadError.message : 'The admin directory could not be loaded.');
    } finally {
      if (requestId === searchRequestRef.current) setDirectoryLoading(false);
    }
  }, [access, debouncedQuery, filters, page, repository, requestedUserId]);

  const loadAccount = useCallback(async () => {
    if (access !== 'allowed' || !selectedId) { setAccount(null); return; }
    const requestId = ++accountRequestRef.current;
    setAccountLoading(true);
    setAccountError(null);
    try {
      const response = await repository.getAccount(selectedId);
      if (requestId === accountRequestRef.current) setAccount(response);
    } catch (loadError) {
      if (requestId === accountRequestRef.current) setAccountError(loadError instanceof Error ? loadError.message : 'Account intelligence could not be loaded.');
    } finally {
      if (requestId === accountRequestRef.current) setAccountLoading(false);
    }
  }, [access, repository, selectedId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadDirectory(); });
    return () => { active = false; };
  }, [loadDirectory]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadAccount(); });
    return () => { active = false; };
  }, [loadAccount]);
  useEffect(() => {
    const requestedId = searchParams.get('user');
    if (!selectedId || !shouldSyncAdminSelection(requestedId, selectedId)) return;
    const current = new URLSearchParams(searchParams.toString());
    current.set('user', selectedId);
    router.replace(`/admin?${current.toString()}`, { scroll: false });
  }, [router, searchParams, selectedId]);
  if (access === 'checking') return <div className={styles.accessPage}><span className={styles.loadingSpinner} /><strong>Verifying owner access…</strong></div>;
  if (access === 'signed-out') return <div className={styles.accessPage}><LockKeyhole size={30} /><strong>Sign in required</strong><p>Authenticate before opening the Shrimply owner console.</p><button type="button" onClick={() => router.replace('/auth?next=/admin')}>Go to secure sign in</button></div>;
  if (access === 'denied') return <div className={styles.accessPage}><ShieldCheck size={32} /><strong>Owner access denied</strong><p>Your Firebase token does not include the dedicated Shrimply platform-owner claim.</p><button type="button" onClick={() => router.replace('/dashboard')}>Return to dashboard</button></div>;

  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const timeLabel = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(now);

  const deleteSelectedUser = async (input: { userId: string; reason: string; confirmation: string }) => {
    await repository.deleteUser(input);
    repository.invalidateCache();
    setDeleteTarget(null);
    setAccount(null);
    setSelectedId(null);
    const current = new URLSearchParams(searchParams.toString());
    current.delete('user');
    router.replace(current.size ? `/admin?${current.toString()}` : '/admin', { scroll: false });
    setNotice('User deleted. The audited account removal completed successfully.');
    await loadDirectory();
  };

  return (
    <div className={`${styles.adminShell} ${sidebarCollapsed ? styles.adminShellCollapsed : ''}`}>
      <AdminSidebar ownerName={owner.name} ownerEmail={owner.email} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} onSignOut={() => void signOut(auth).then(() => router.replace('/auth'))} />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <label className={styles.universalSearch}>
            <Search size={18} aria-hidden="true" /><span className={styles.srOnly}>Search users, farms, email, phone or ID</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, farms, email, phone or ID" autoComplete="off" />
            <kbd>⌘ K</kbd>
          </label>
          <div className={styles.dateTime}><strong>{dateLabel}</strong><span>{timeLabel}</span></div>
          <div className={styles.mobilePanelControls}><MobilePanelButton onClick={() => setDirectoryDrawer(true)}><Users size={15} /> Users</MobilePanelButton><MobilePanelButton onClick={() => setTimelineDrawer(true)}><Clock3 size={15} /> Timeline</MobilePanelButton></div>
        </header>

        <div className={styles.mainGrid}>
          <div className={`${styles.directorySlot} ${directoryDrawer ? styles.drawerVisible : ''}`}>
            <UserDirectory response={directory} selectedUserId={selectedId} search={query} filters={filters} loading={directoryLoading} error={directoryError} filtersOpen={filtersOpen} plans={directory?.filterOptions?.plans || ['all']} countries={directory?.filterOptions?.countries || ['all']} onSearch={setQuery} onFilterChange={(value) => { setFilters(value); setPage(1); }} onFiltersOpen={setFiltersOpen} onSelect={(id) => { setSelectedId(id); setDirectoryDrawer(false); }} onPage={setPage} onRetry={() => void loadDirectory()} onCloseMobile={() => setDirectoryDrawer(false)} />
          </div>
          <AccountDetail account={account} loading={accountLoading} error={accountError} onRetry={() => void loadAccount()} onRequestDelete={setDeleteTarget} />
          <div className={`${styles.timelineSlot} ${timelineDrawer ? styles.drawerVisible : ''}`}><AccountTimeline key={account?.id || 'empty'} events={account?.timeline || []} onCloseMobile={() => setTimelineDrawer(false)} /></div>
        </div>
      </div>
      {(directoryDrawer || timelineDrawer) && <button type="button" className={styles.drawerBackdrop} onClick={() => { setDirectoryDrawer(false); setTimelineDrawer(false); }} aria-label="Close open panel" />}
      {deleteTarget && <DeleteUserDialog account={deleteTarget} open onClose={() => setDeleteTarget(null)} onConfirm={deleteSelectedUser} />}
      {notice && <div className={styles.toast} role="status">{notice}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={14} /></button></div>}
    </div>
  );
}
