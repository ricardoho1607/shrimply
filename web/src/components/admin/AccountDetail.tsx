'use client';
import { getUserErrorMessage } from '@/lib/userError';

import { confirmAppAction } from '@/lib/appDialogs';


import {
  CreditCard,
  Copy,
  Database,
  Headphones,
  Info,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { useState } from 'react';
import { calculateAccountHealth } from '@/lib/admin/adminCore';
import type { AccountIntelligence, FarmBusinessSize } from '@/lib/admin/types';
import {
  FARM_PERMISSION_DEFINITIONS,
  FARM_STAFF_ROLES,
  createPermissionOverrides,
  getDefaultPermissions,
  isFarmStaffRole,
  type FarmPermissionKey,
  type FarmPermissionOverrides,
  type FarmPermissionSet,
  type FarmStaffRole,
} from '../../../../shared/permissions';
import styles from '@/app/admin/admin.module.css';

const FARM_MODE_OPTIONS: Array<{ value: FarmBusinessSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'enterprise', label: 'Enterprise' },
];

const FARM_ROLE_LABELS: Record<FarmStaffRole, string> = {
  'co-owner': 'Co-owner',
  manager: 'Manager',
  technician: 'Technician',
  admin: 'Admin',
  mechanic: 'Mechanic',
};

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export function AccountDetail({
  account,
  loading,
  error,
  updatingFarmMode,
  updatingPermissions,
  updatingRole,
  passwordResetPending,
  passwordResetResult,
  onRetry,
  onUpdateFarmMode,
  onUpdatePermissions,
  onUpdateRole,
  onSendPasswordReset,
}: {
  account: AccountIntelligence | null;
  loading: boolean;
  error: string | null;
  updatingFarmMode: boolean;
  updatingPermissions: boolean;
  updatingRole: boolean;
  passwordResetPending: boolean;
  passwordResetResult: { message: string; success: boolean } | null;
  onRetry: () => void;
  onUpdateFarmMode: (companyId: string, businessSize: FarmBusinessSize) => Promise<void>;
  onUpdatePermissions: (permissionOverrides: FarmPermissionOverrides) => Promise<void>;
  onUpdateRole: (role: FarmStaffRole) => Promise<void>;
  onSendPasswordReset: (accountId: string, email: string) => Promise<void>;
}) {
  const linkedFarm = account?.farms?.[0];
  const [farmMode, setFarmMode] = useState<FarmBusinessSize>(linkedFarm?.businessSize || 'medium');
  const [farmModeError, setFarmModeError] = useState<string | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<FarmPermissionSet>(
    account?.effectivePermissions || getDefaultPermissions(account?.role),
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<FarmStaffRole>(isFarmStaffRole(account?.role) ? account.role : 'technician');
  const [roleError, setRoleError] = useState<string | null>(null);

  const saveFarmMode = async () => {
    if (!linkedFarm || farmMode === linkedFarm.businessSize) return;
    const confirmed = (await confirmAppAction(`Change ${linkedFarm.name} from ${linkedFarm.businessSize} to ${farmMode}?`));
    if (!confirmed) return;
    setFarmModeError(null);
    try {
      await onUpdateFarmMode(linkedFarm.id, farmMode);
    } catch (updateError) {
      setFarmModeError(getUserErrorMessage(updateError, 'Farm mode could not be changed.'));
    }
  };

  const permissionOverrides = account
    ? createPermissionOverrides(account.role, permissionDraft, account.isCompanyOwner)
    : {};
  const permissionsChanged = account
    ? JSON.stringify(permissionOverrides) !== JSON.stringify(account.permissionOverrides)
    : false;

  const togglePermission = (permission: FarmPermissionKey) => {
    setPermissionDraft((current) => ({ ...current, [permission]: !current[permission] }));
  };

  const savePermissions = async () => {
    if (!account || account.isCompanyOwner || !permissionsChanged) return;
    if (!(await confirmAppAction(`Save permission changes for ${account.name}?`))) return;
    setPermissionError(null);
    try {
      await onUpdatePermissions(permissionOverrides);
    } catch (updateError) {
      setPermissionError(getUserErrorMessage(updateError, 'Permissions could not be changed.'));
    }
  };

  const saveRole = async () => {
    if (!account || account.isCompanyOwner || !linkedFarm || roleDraft === account.role) return;
    if (!(await confirmAppAction(`Change ${account.name}'s role from ${account.role} to ${FARM_ROLE_LABELS[roleDraft]}? Existing custom permissions will be preserved.`))) return;
    setRoleError(null);
    try {
      await onUpdateRole(roleDraft);
    } catch (updateError) {
      setRoleError(getUserErrorMessage(updateError, 'Role could not be changed.'));
    }
  };

  const sendPasswordReset = async () => {
    const email = account?.email.trim();
    if (!account || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || passwordResetPending) return;
    if (!(await confirmAppAction(`Send a password reset email to ${email}?`))) return;
    await onSendPasswordReset(account.id, email);
  };

  const copyFarmId = async (farmId: string) => {
    try {
      await navigator.clipboard.writeText(farmId);
    } catch {
      const input = document.createElement('textarea');
      input.value = farmId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  if (loading) return <section className={styles.account}><div className={styles.accountSkeleton}><i /><span /><span /><span /><span /></div></section>;
  if (error) return <section className={styles.account}><div className={styles.stateMessage}><strong>Couldn’t load account intelligence</strong><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div></section>;
  if (!account) return <section className={styles.account}><div className={styles.stateMessage}><strong>Select a user</strong><span>Choose an account to view its operational history.</span></div></section>;
  
  const health = calculateAccountHealth(account.healthInputs);
  const accountStatus = account.status || 'Inactive';
  const statusClassName = styles[`status${accountStatus.replaceAll(' ', '')}`] || styles.statusInactive;
  const farms = account.farms || [];
  const adoption = account.adoption || [];
  const subscription = account.subscription || { plan: account.plan || 'Unavailable', status: 'Unavailable', billingInterval: null, renewalAt: null, paymentMethod: 'Unavailable' };
  const support = account.support || { availability: 'unavailable', tickets: [], note: 'No support tickets were found.' };
  const missingBackendSignals = account.missingBackendSignals || [];

  return (
    <section className={styles.account} aria-label="Selected account intelligence">
      <header className={styles.accountHeader}>
        <span className={styles.accountAvatar}>{account.initials || 'U'}</span>
        <div className={styles.accountTitle}>
          <div><h2>{account.name || 'Unnamed user'}</h2><span className={`${styles.status} ${statusClassName}`}><i />{accountStatus}</span></div>
          <p><span>ID: {account.id}</span><span><Mail size={14} />{account.email || 'Unavailable'}</span><span><Phone size={14} />{account.maskedPhone || 'Unavailable'}</span></p>
        </div>
      </header>

      <div className={styles.accountFacts}>
        <div><span>Role</span><strong>{account.role}</strong></div>
        <div><span>Plan</span><strong>{account.plan || 'Unavailable'}</strong></div>
        <div><span>Region</span><strong>{account.region || 'Unknown'}, {account.country || 'Unknown'}</strong></div>
        <div><span>Joined</span><strong>{formatDate(account.joinedAt)}</strong></div>
        <div><span>Last active</span><strong>{formatDate(account.lastActiveAt, true)}</strong></div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Sign-in support</h3></div>
        <p className={styles.permissionIntro}>Send a password reset link to this user’s email address.</p>
        <div className={styles.permissionActions}>
          <button type="button" className={styles.permissionSaveButton} disabled={!account.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim()) || passwordResetPending} onClick={() => void sendPasswordReset()}>
            {passwordResetPending ? 'Sending…' : 'Send password reset email'}
          </button>
        </div>
        {passwordResetResult ? <span className={passwordResetResult.success ? styles.permissionIntro : styles.farmModeError} role={passwordResetResult.success ? 'status' : 'alert'}>{passwordResetResult.message}</span> : null}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Permissions</h3><span>{account.isCompanyOwner ? 'Owner · locked' : `${Object.keys(account.permissionOverrides).length} custom`}</span></div>
        {!account.isCompanyOwner && linkedFarm ? (
          <div className={styles.farmModeControl}>
            <label htmlFor="admin-user-role"><span>User role</span><select id="admin-user-role" value={roleDraft} disabled={updatingRole || updatingPermissions} onChange={(event) => setRoleDraft(event.target.value as FarmStaffRole)}>{FARM_STAFF_ROLES.map((role) => <option key={role} value={role}>{FARM_ROLE_LABELS[role]}</option>)}</select></label>
            <button type="button" disabled={updatingRole || updatingPermissions || roleDraft === account.role} onClick={() => void saveRole()}>{updatingRole ? 'Saving…' : 'Save role'}</button>
            {roleError ? <span className={styles.farmModeError}>{roleError}</span> : null}
          </div>
        ) : null}
        <p className={styles.permissionIntro}>{account.isCompanyOwner ? 'The company owner always keeps full access to prevent lockout.' : `Checked boxes include the ${account.role} defaults and any custom changes.`}</p>
        {linkedFarm?.businessSize === 'enterprise' ? <p className={styles.permissionIntro}>Enterprise technicians remain limited to their assigned blocks. Other staff can use each granted permission across the farm without receiving block-management access.</p> : null}
        <div className={styles.permissionGrid}>
          {FARM_PERMISSION_DEFINITIONS.map((permission) => (
            <label className={styles.permissionOption} key={permission.key}>
              <input type="checkbox" checked={permissionDraft[permission.key]} disabled={account.isCompanyOwner || updatingPermissions || updatingRole} onChange={() => togglePermission(permission.key)} />
              <span><strong>{permission.label}</strong><small>{permission.description}</small></span>
            </label>
          ))}
        </div>
        {!account.isCompanyOwner ? (
          <div className={styles.permissionActions}>
            <button type="button" className={styles.permissionResetButton} disabled={updatingPermissions || updatingRole} onClick={() => setPermissionDraft(getDefaultPermissions(account.role))}>Use role defaults</button>
            <button type="button" className={styles.permissionSaveButton} disabled={updatingPermissions || updatingRole || !permissionsChanged} onClick={() => void savePermissions()}>{updatingPermissions ? 'Saving…' : 'Save permissions'}</button>
          </div>
        ) : null}
        {permissionError ? <span className={styles.farmModeError}>{permissionError}</span> : null}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Linked Farms & Ponds</h3><span>{farms.length} linked</span></div>
        {farms.length === 0 ? <p className={styles.inlineEmpty}>No linked farm was found.</p> : farms.map((farm) => (
          <div className={styles.farmRow} key={farm.id}>
            <div><strong>{farm.name}</strong><span><MapPin size={11} />{farm.location}</span><span>ID: <code style={{ overflowWrap: 'anywhere' }}>{farm.id}</code><button type="button" aria-label={`Copy company ID ${farm.id}`} title="Copy company ID" onClick={() => void copyFarmId(farm.id)} style={{ marginLeft: 5, padding: 0, border: 0, color: 'inherit', background: 'transparent', cursor: 'pointer', verticalAlign: 'middle' }}><Copy size={12} /></button></span></div>
            <span>{farm.pondCount} ponds</span><span>{farm.totalAreaHa === null ? 'Area unavailable' : `${farm.totalAreaHa.toFixed(1)} ha`}</span>
          </div>
        ))}
        {linkedFarm ? (
          <div className={styles.farmModeControl}>
            <label htmlFor="admin-farm-mode"><span>Farm mode</span><select id="admin-farm-mode" value={farmMode} disabled={updatingFarmMode} onChange={(event) => setFarmMode(event.target.value as FarmBusinessSize)}>{FARM_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <button type="button" disabled={updatingFarmMode || farmMode === linkedFarm.businessSize} onClick={() => void saveFarmMode()}>{updatingFarmMode ? 'Saving…' : 'Save mode'}</button>
            {farmModeError ? <span className={styles.farmModeError}>{farmModeError}</span> : null}
          </div>
        ) : null}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Account Health</h3><span>Transparent weighted score</span></div>
        <div className={styles.healthGrid}>
          <div className={styles.healthRing} style={{ '--health-score': `${health.score * 3.6}deg` } as React.CSSProperties}><div><strong>{health.score}</strong><span>/100</span></div></div>
          <div className={styles.healthSignals}>
            {(health.signals || []).map((signal) => <div key={signal.key} title={signal.explanation}><span>{signal.label}</span><i><b style={{ width: `${signal.score || 0}%` }} /></i><strong>{signal.score === null ? 'Unavailable' : signal.score >= 80 ? 'Good' : signal.score >= 55 ? 'Fair' : 'Risk'}</strong></div>)}
          </div>
        </div>
        <p className={styles.healthSummary}><Info size={13} />{health.summary} Each signal is normalized to 100 and multiplied by the weight shown in its explanation.</p>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Feature Adoption</h3><span>Recent Shrimply usage</span></div>
        <div className={styles.adoptionGrid}>
          {adoption.map((feature) => (
            <div className={styles.adoptionItem} key={feature.key}>
              <span>{feature.label}</span><i><b style={{ width: `${feature.percentage}%` }} /></i><strong>{feature.percentage}%</strong>
              <small>{feature.eventCount === null ? 'Data unavailable' : `${feature.eventCount} ${feature.eventCount === 1 ? 'event' : 'events'}`}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><CreditCard size={16} />Subscription</h3></div>
        <div className={styles.subscriptionGrid}>
          <div><span>Plan</span><strong>{subscription.plan}</strong></div><div><span>Status</span><strong>{subscription.status}</strong></div><div><span>Billing</span><strong>{subscription.billingInterval || 'Unavailable'}</strong></div><div><span>Renews</span><strong>{formatDate(subscription.renewalAt)}</strong></div><div><span>Payment method</span><strong>{subscription.paymentMethod}</strong></div>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><Headphones size={16} />Support History</h3><span>{support.availability === 'live' ? `${(support.tickets || []).length} tickets` : 'Not connected'}</span></div>
        {(support.tickets || []).length > 0 ? (
          <div className={styles.ticketTable}>
            {(support.tickets || []).map((ticket) => <div key={ticket.id}><strong>{ticket.id}</strong><span>{ticket.subject}</span><em>{ticket.status}</em><span>{formatDate(ticket.updatedAt)}</span></div>)}
          </div>
        ) : <p className={styles.inlineEmpty}>{support.note || 'No support tickets were found.'}</p>}
      </div>

      {missingBackendSignals.length > 0 && (
        <details className={styles.backendGaps}>
          <summary><Database size={14} />Backend coverage notes ({missingBackendSignals.length})</summary>
          <ul>{missingBackendSignals.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
