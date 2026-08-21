'use client';

import { onIdTokenChanged, signOut } from 'firebase/auth';
import { ArrowLeft, Clock, LayoutGrid, Menu, RefreshCcw, Trash2, UserCheck, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { createAdminIntelligenceRepository } from '@/lib/admin/adminRepository';
import type {
  AccountIntelligence,
  AdminAuditEvent,
  AdminDirectoryFilters,
  AdminDirectoryResponse,
  AdminViewMode,
  DetailedFarm,
  FarmBusinessSize,
  PlatformHealthOverview,
  PlatformOverviewMetrics,
  SecurityPostureData,
  SupportOverviewData,
} from '@/lib/admin/types';
import { AccountDetail } from './AccountDetail';
import { AdminActions } from './AdminActions';
import { AdminAuditView } from './AdminAuditView';
import { AdminFarmsView } from './AdminFarmsView';
import { AdminOverview } from './AdminOverview';
import { AdminPlatformOverview } from './AdminPlatformOverview';
import { AdminSecurityView } from './AdminSecurityView';
import { AdminSidebar } from './AdminSidebar';
import { AdminSupportView } from './AdminSupportView';
import { AccountTimeline } from './AccountTimeline';
import { DeleteUserDialog } from './DeleteUserDialog';
import { UserDirectory } from './UserDirectory';
import { getFirestorePlatformHealth } from '@/lib/admin/firestoreAdminAdapter';
import type { FarmPermissionOverrides } from '../../../../shared/permissions';
import styles from '@/app/admin/admin.module.css';

type AccessState = 'checking' | 'allowed' | 'denied' | 'signed-out';
type DetailTabMode = 'info' | 'timeline';

export default function AdminCommandCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get('user');
  const viewParam = searchParams.get('view');

  const initialView: AdminViewMode = useMemo(() => {
    if (requestedUserId || viewParam === 'user' || viewParam === 'users' || viewParam === 'intelligence') {
      return 'user';
    }
    if (viewParam === 'farms') return 'farms';
    if (viewParam === 'support') return 'support';
    if (viewParam === 'security') return 'security';
    if (viewParam === 'audit') return 'audit';
    return 'overview';
  }, [requestedUserId, viewParam]);

  const [activeView, setActiveView] = useState<AdminViewMode>(initialView);
  const [detailTab, setDetailTab] = useState<DetailTabMode>('info');
  const [access, setAccess] = useState<AccessState>('checking');
  const [owner, setOwner] = useState({ name: 'Shrimply Owner', email: '' });
  const [now, setNow] = useState(new Date());
  const [selectedId, setSelectedId] = useState<string | null>(requestedUserId);
  const [account, setAccount] = useState<AccountIntelligence | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [farmModeUpdating, setFarmModeUpdating] = useState(false);
  const [permissionsUpdating, setPermissionsUpdating] = useState(false);

  // Overview metrics
  const [overviewMetrics, setOverviewMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<7 | 30>(7);

  // Platform health
  const [platformHealth, setPlatformHealth] = useState<PlatformHealthOverview | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthPeriod, setHealthPeriod] = useState<number>(7);
  const [pinging, setPinging] = useState(false);

  // Farms fleet data
  const [farms, setFarms] = useState<DetailedFarm[]>([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  // Support data
  const [supportData, setSupportData] = useState<SupportOverviewData | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);

  // Security data
  const [securityData, setSecurityData] = useState<SecurityPostureData | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Audit data
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AccountIntelligence | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const repository = useMemo(() => createAdminIntelligenceRepository(), []);

  const accountRequestRef = useRef(0);
  const overviewRequestRef = useRef(0);
  const healthRequestRef = useRef(0);
  const farmsRequestRef = useRef(0);
  const supportRequestRef = useRef(0);
  const securityRequestRef = useRef(0);
  const auditRequestRef = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAccess('signed-out');
        return;
      }
      const token = await firebaseUser.getIdTokenResult(true);
      const allowed = token.claims.platformOwner === true || token.claims.platformRole === 'owner';
      setOwner({
        name: firebaseUser.displayName || 'Owner Account',
        email: firebaseUser.email || 'Authenticated owner',
      });
      setAccess(allowed ? 'allowed' : 'denied');
    });
  }, []);

  // 1. Platform Health Loader
  const loadPlatformHealth = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++healthRequestRef.current;
    setHealthLoading(true);
    try {
      const data = await getFirestorePlatformHealth(healthPeriod);
      if (requestId === healthRequestRef.current) {
        setPlatformHealth(data);
      }
    } catch (err) {
      if (requestId === healthRequestRef.current) {
        console.error('Failed to load platform health:', err);
      }
    } finally {
      if (requestId === healthRequestRef.current) {
        setHealthLoading(false);
      }
    }
  }, [access, healthPeriod]);

  const handlePingServices = useCallback(async () => {
    setPinging(true);
    try {
      const data = await getFirestorePlatformHealth(healthPeriod);
      setPlatformHealth(data);
    } catch (err) {
      console.error('Ping failed:', err);
    } finally {
      setPinging(false);
    }
  }, [healthPeriod]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'overview') {
      void loadPlatformHealth();
    }
  }, [access, activeView, loadPlatformHealth]);

  // 2. User Overview Metrics Loader
  const loadOverview = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++overviewRequestRef.current;
    setOverviewLoading(true);
    try {
      const data = await repository.getOverviewMetrics(overviewPeriod);
      if (requestId === overviewRequestRef.current) {
        setOverviewMetrics(data);
      }
    } catch (err: any) {
      if (requestId === overviewRequestRef.current) {
        console.error('Failed to load overview metrics:', err);
      }
    } finally {
      if (requestId === overviewRequestRef.current) {
        setOverviewLoading(false);
      }
    }
  }, [access, overviewPeriod, repository]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'user' && !selectedId) {
      void loadOverview();
    }
  }, [access, activeView, selectedId, loadOverview]);

  // 3. Farms Fleet Loader
  const loadFarms = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++farmsRequestRef.current;
    setFarmsLoading(true);
    try {
      const data = await repository.getDetailedFarms();
      if (requestId === farmsRequestRef.current) {
        setFarms(data);
      }
    } catch (err) {
      if (requestId === farmsRequestRef.current) {
        console.error('Failed to load farms fleet:', err);
      }
    } finally {
      if (requestId === farmsRequestRef.current) {
        setFarmsLoading(false);
      }
    }
  }, [access, repository]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'farms') {
      void loadFarms();
    }
  }, [access, activeView, loadFarms]);

  // 4. Support Queues Loader
  const loadSupport = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++supportRequestRef.current;
    setSupportLoading(true);
    try {
      const data = await repository.getSupportData();
      if (requestId === supportRequestRef.current) {
        setSupportData(data);
      }
    } catch (err) {
      if (requestId === supportRequestRef.current) {
        console.error('Failed to load support data:', err);
      }
    } finally {
      if (requestId === supportRequestRef.current) {
        setSupportLoading(false);
      }
    }
  }, [access, repository]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'support') {
      void loadSupport();
    }
  }, [access, activeView, loadSupport]);

  // 5. Security Telemetry Loader
  const loadSecurity = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++securityRequestRef.current;
    setSecurityLoading(true);
    try {
      const data = await repository.getSecurityPosture();
      if (requestId === securityRequestRef.current) {
        setSecurityData(data);
      }
    } catch (err) {
      if (requestId === securityRequestRef.current) {
        console.error('Failed to load security data:', err);
      }
    } finally {
      if (requestId === securityRequestRef.current) {
        setSecurityLoading(false);
      }
    }
  }, [access, repository]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'security') {
      void loadSecurity();
    }
  }, [access, activeView, loadSecurity]);

  // 6. Audit Trail Loader
  const loadAudit = useCallback(async () => {
    if (access !== 'allowed') return;
    const requestId = ++auditRequestRef.current;
    setAuditLoading(true);
    try {
      const data = await repository.getAuditLogs();
      if (requestId === auditRequestRef.current) {
        setAuditEvents(data);
      }
    } catch (err) {
      if (requestId === auditRequestRef.current) {
        console.error('Failed to load audit logs:', err);
      }
    } finally {
      if (requestId === auditRequestRef.current) {
        setAuditLoading(false);
      }
    }
  }, [access, repository]);

  useEffect(() => {
    if (access === 'allowed' && activeView === 'audit') {
      void loadAudit();
    }
  }, [access, activeView, loadAudit]);

  const resolveRequestedUser = useCallback(() => {
    // Ensure directly requested user remains selected even when absent from directory
    if (requestedUserId) return requestedUserId;
    return null;
  }, [requestedUserId]);

  // Selected User Account Loader
  const loadAccount = useCallback(async () => {
    if (access !== 'allowed' || !selectedId) {
      setAccount(null);
      return;
    }
    const requestId = ++accountRequestRef.current;
    setAccountLoading(true);
    setAccountError(null);
    try {
      const data = await repository.getAccount(selectedId);
      if (requestId !== accountRequestRef.current) return;
      setAccount(data);
    } catch (error) {
      if (requestId !== accountRequestRef.current) return;
      setAccountError(error instanceof Error ? error.message : 'Unable to load account details.');
    } finally {
      if (requestId === accountRequestRef.current) setAccountLoading(false);
    }
  }, [access, repository, selectedId]);

  useEffect(() => {
    if (access !== 'allowed') return;
    void loadAccount();
  }, [access, loadAccount]);

  useEffect(() => {
    if (requestedUserId !== selectedId) {
      setSelectedId(requestedUserId);
      if (requestedUserId) {
        setActiveView('user');
      }
    }
  }, [requestedUserId, selectedId]);

  useEffect(() => {
    if (viewParam === 'user' || viewParam === 'users' || viewParam === 'intelligence') {
      setActiveView('user');
    } else if (viewParam === 'overview') {
      setActiveView('overview');
      if (!requestedUserId) setSelectedId(null);
    } else if (viewParam === 'farms') {
      setActiveView('farms');
      if (!requestedUserId) setSelectedId(null);
    } else if (viewParam === 'support') {
      setActiveView('support');
      if (!requestedUserId) setSelectedId(null);
    } else if (viewParam === 'security') {
      setActiveView('security');
      if (!requestedUserId) setSelectedId(null);
    } else if (viewParam === 'audit') {
      setActiveView('audit');
      if (!requestedUserId) setSelectedId(null);
    }
  }, [viewParam, requestedUserId]);

  const handleNavigate = useCallback(
    (view: AdminViewMode) => {
      setActiveView(view);
      setSelectedId(null);
      setAccount(null);
      router.replace(`/admin?view=${view}`, { scroll: false });
    },
    [router]
  );

  const handleSelectUser = useCallback(
    (userId: string) => {
      setSelectedId(userId);
      setActiveView('user');
      setDetailTab('info');
      router.replace(`/admin?view=user&user=${encodeURIComponent(userId)}`, { scroll: false });
    },
    [router]
  );

  const handleBackToDirectory = useCallback(() => {
    setSelectedId(null);
    setAccount(null);
    setActiveView('user');
    router.replace('/admin?view=user', { scroll: false });
  }, [router]);

  if (access === 'checking') {
    return (
      <div className={styles.accessPage}>
        <span className={styles.loadingSpinner} />
        <strong>Verifying owner access…</strong>
      </div>
    );
  }

  if (access === 'signed-out') {
    return (
      <div className={styles.accessPage}>
        <strong>Sign in required</strong>
        <p>Authenticate before opening the Shrimply owner console.</p>
        <button type="button" onClick={() => router.replace('/auth?next=/admin')}>
          Go to secure sign in
        </button>
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className={styles.accessPage}>
        <strong>Owner access denied</strong>
        <p>Your Firebase token does not include the dedicated Shrimply platform-owner claim.</p>
        <button type="button" onClick={() => router.replace('/dashboard')}>
          Return to dashboard
        </button>
      </div>
    );
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(now);

  const deleteSelectedUser = async (input: { userId: string; reason: string; confirmation: string }) => {
    await repository.deleteUser(input);
    repository.invalidateCache();
    setDeleteTarget(null);
    setAccount(null);
    setSelectedId(null);
    router.replace('/admin?view=user', { scroll: false });
    setNotice('User deleted. The audited account removal completed successfully.');
    await loadOverview();
  };

  const updateSelectedFarmMode = async (companyId: string, businessSize: FarmBusinessSize) => {
    if (!account) throw new Error('Select a user first.');
    setFarmModeUpdating(true);
    try {
      await repository.updateFarmBusinessSize({ userId: account.id, companyId, businessSize });
      await loadAccount();
      setNotice(`Farm mode changed to ${businessSize}.`);
    } finally {
      setFarmModeUpdating(false);
    }
  };

  const updateSelectedUserPermissions = async (permissionOverrides: FarmPermissionOverrides) => {
    if (!account) throw new Error('Select a user first.');
    setPermissionsUpdating(true);
    try {
      await repository.updateUserPermissions({ userId: account.id, permissionOverrides });
      await loadAccount();
      setNotice('User permissions updated.');
    } finally {
      setPermissionsUpdating(false);
    }
  };

  const getPageTitle = () => {
    if (activeView === 'overview') return 'Platform Overview';
    if (activeView === 'farms') return 'Farms & Operations Fleet';
    if (activeView === 'support') return 'Support & Operational Triage';
    if (activeView === 'security') return 'Security Posture & Access Control';
    if (activeView === 'audit') return 'Platform Audit Log';
    if (selectedId) return account?.name || 'User Profile';
    return 'User Database';
  };

  return (
    <div className={`${styles.adminShell} ${sidebarCollapsed ? styles.adminShellCollapsed : ''}`}>
      <AdminSidebar
        ownerName={owner.name}
        ownerEmail={owner.email}
        collapsed={sidebarCollapsed}
        activeView={activeView}
        onNavigate={handleNavigate}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onSignOut={() => void signOut(auth).then(() => router.replace('/auth'))}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.mobileNavTrigger}
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Open admin navigation"
              aria-expanded={!sidebarCollapsed}
            >
              <Menu size={18} />
            </button>

            {activeView === 'user' && selectedId ? (
              <>
                <button
                  type="button"
                  className={styles.backIconButton}
                  onClick={handleBackToDirectory}
                  title="Back to User Database"
                  aria-label="Back to User Database"
                >
                  <ArrowLeft size={17} />
                </button>
                <h1>{getPageTitle()}</h1>
              </>
            ) : (
              <h1>{getPageTitle()}</h1>
            )}
          </div>
          <div className={styles.dateTime}>
            <strong>{dateLabel}</strong>
            <span>{timeLabel}</span>
          </div>
        </header>

        {/* Dynamic View Switcher */}
        {activeView === 'overview' ? (
          <AdminPlatformOverview
            health={platformHealth}
            loading={healthLoading}
            periodDays={healthPeriod}
            onPeriodChange={(days) => setHealthPeriod(days)}
            onRefresh={loadPlatformHealth}
            onPingServices={handlePingServices}
            pinging={pinging}
          />
        ) : activeView === 'farms' ? (
          <AdminFarmsView
            farms={farms}
            loading={farmsLoading}
            onRefresh={loadFarms}
            onSelectOwner={handleSelectUser}
          />
        ) : activeView === 'support' ? (
          <AdminSupportView
            data={supportData}
            loading={supportLoading}
            onRefresh={loadSupport}
            onUpdateTesterStatus={(reqId, status) => repository.updateTesterStatus(reqId, status)}
            onResolveDiseaseReport={(repId, note) => repository.resolveDiseaseReport(repId, note)}
            onSelectUser={handleSelectUser}
          />
        ) : activeView === 'security' ? (
          <AdminSecurityView
            data={securityData}
            loading={securityLoading}
            onRefresh={loadSecurity}
            onSelectUser={handleSelectUser}
          />
        ) : activeView === 'audit' ? (
          <AdminAuditView
            events={auditEvents}
            loading={auditLoading}
            onRefresh={loadAudit}
            onSelectUser={handleSelectUser}
          />
        ) : !selectedId ? (
          <AdminOverview
            metrics={overviewMetrics}
            loading={overviewLoading}
            period={overviewPeriod}
            onPeriodChange={(days) => setOverviewPeriod(days)}
            onRefresh={loadOverview}
            onSelectUser={handleSelectUser}
          />
        ) : (
          <div className={styles.singleUserDetailWorkspace}>
            {/* Top Segmented Tab Bar */}
            <div className={styles.detailTabBar}>
              <button
                type="button"
                className={`${styles.detailTabButton} ${detailTab === 'info' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setDetailTab('info')}
              >
                <UserCheck size={15} />
                <span>Account Information</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${detailTab === 'timeline' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setDetailTab('timeline')}
              >
                <Clock size={15} />
                <span>Activity History & Timeline ({account?.timeline?.length || 0})</span>
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={() => void loadAccount()}
                  title="Refresh account data"
                  aria-label="Refresh account data"
                >
                  <RefreshCcw size={15} />
                </button>
                {account && (
                  <button
                    type="button"
                    className={styles.triageInspectBtn}
                    style={{ color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2' }}
                    onClick={() => setDeleteTarget(account)}
                    title="Delete this user account"
                  >
                    <Trash2 size={13} />
                    <span>Delete User</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className={styles.detailTabContent}>
              {detailTab === 'info' ? (
                <AccountDetail
                  key={`${account?.id || 'empty'}-${account?.farms?.[0]?.businessSize || 'none'}-${JSON.stringify(account?.permissionOverrides || {})}`}
                  account={account}
                  loading={accountLoading}
                  error={accountError}
                  updatingFarmMode={farmModeUpdating}
                  updatingPermissions={permissionsUpdating}
                  onRetry={() => void loadAccount()}
                  onUpdateFarmMode={updateSelectedFarmMode}
                  onUpdatePermissions={updateSelectedUserPermissions}
                />
              ) : (
                <AccountTimeline
                  key={account?.id || 'empty'}
                  events={account?.timeline || []}
                  onCloseMobile={() => undefined}
                />
              )}
            </div>

            <AdminActions
              account={account}
              onRefresh={() => void loadAccount()}
              onFeedback={setNotice}
              onRequestDelete={setDeleteTarget}
            />
          </div>
        )}
      </div>

      {!sidebarCollapsed && (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          onClick={() => setSidebarCollapsed(true)}
          aria-label="Close admin navigation"
        />
      )}
      {deleteTarget && (
        <DeleteUserDialog
          account={deleteTarget}
          open
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteSelectedUser}
        />
      )}
      {notice && (
        <div className={styles.toast} role="status">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
