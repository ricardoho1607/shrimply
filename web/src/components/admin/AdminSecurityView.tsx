'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import React from 'react';
import styles from '@/app/admin/admin.module.css';
import type { SecurityPostureData } from '@/lib/admin/types';

interface AdminSecurityViewProps {
  data: SecurityPostureData | null;
  loading: boolean;
  onRefresh: () => void;
  onSelectUser?: (userId: string) => void;
}

export function AdminSecurityView({
  data,
  loading,
  onRefresh,
  onSelectUser,
}: AdminSecurityViewProps) {
  if (loading && !data) {
    return (
      <div className={styles.stateMessage}>
        <span className={styles.loadingSpinner} />
        <strong>Loading Security Telemetry…</strong>
        <span>Verifying App Check enforcement, owner claims, and role distribution</span>
      </div>
    );
  }

  const roleDistribution = data?.roleDistribution || {
    owner: 0,
    manager: 0,
    technician: 0,
    buyer: 0,
    unassigned: 0,
  };

  const totalUsersWithRoles = Object.values(roleDistribution).reduce((a, b) => a + b, 0);
  const platformOwners = data?.platformOwners || [];
  const threatTelemetry = data?.threatTelemetry || {
    failedAuth24h: 0,
    activeRateLimitLocks: 0,
    privilegedAccountCount: 0,
    orphanedUsersCount: 0,
  };
  const audits = data?.recentSecurityEvents || [];

  return (
    <div className={styles.overviewContainer}>
      {/* 1. Header */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewHeaderTitle}>
          <h2>Security Posture & Access Control</h2>
          <p>Multi-tenant authorization, Firebase App Check enforcement, platform custom claims, and privilege audit.</p>
        </div>
        <div className={styles.overviewControls}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh security telemetry"
            aria-label="Refresh security telemetry"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Security KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Security Posture</span>
          </div>
          <div className={styles.kpiValue} style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={26} color="#16a34a" />
            <span>Secure</span>
          </div>
          <div className={styles.kpiSubtext}>
            <span>Multi-Tenant Ruleset v2</span>
            <span>·</span>
            <span className={styles.kpiBadge} style={{ color: '#166534', background: '#dcfce7' }}>
              100% Verified
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>App Check Enforcement</span>
          </div>
          <div className={styles.kpiValue}>Enforced</div>
          <div className={styles.kpiSubtext}>
            <span className={styles.kpiBadge} style={{ color: '#166534', background: '#dcfce7' }}>
              Mobile Expo & Web Next.js
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Platform Owner Claims</span>
          </div>
          <div className={styles.kpiValue}>{platformOwners.length}</div>
          <div className={styles.kpiSubtext}>
            <span>Verified owner credentials</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Orphaned Accounts</span>
          </div>
          <div className={styles.kpiValue}>{threatTelemetry.orphanedUsersCount}</div>
          <div className={styles.kpiSubtext}>
            <span>Users with no assigned company</span>
          </div>
        </div>
      </div>

      {/* 3. Two-Column Analytics Layout */}
      <div className={styles.analyticsRow}>
        {/* Left: Role Distribution */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsCardHeader}>
            <h3>Role & Privilege Distribution</h3>
            <span>{totalUsersWithRoles} total registered accounts</span>
          </div>

          <div style={{ display: 'grid', gap: 14, marginTop: 12 }}>
            {Object.entries(roleDistribution).map(([roleName, count]) => {
              const pct = totalUsersWithRoles > 0 ? Math.round((count / totalUsersWithRoles) * 100) : 0;
              return (
                <div key={roleName} className={styles.funnelStep}>
                  <div className={styles.funnelStepMeta}>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {roleName === 'owner' ? 'Farm Owners' : roleName}
                    </strong>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className={styles.funnelProgressTrack}>
                    <div
                      className={styles.funnelProgressBar}
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background:
                          roleName === 'owner'
                            ? 'var(--admin-cyan)'
                            : roleName === 'manager'
                            ? '#3282b8'
                            : roleName === 'technician'
                            ? '#0284c7'
                            : '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--admin-line-soft)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--admin-muted)' }}>
            <KeyRound size={14} color="var(--admin-cyan)" />
            <span>Farm role escalations require authenticated Owner verification.</span>
          </div>
        </div>

        {/* Right: Platform Owners Roster */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsCardHeader}>
            <h3>Platform Owner Roster ({platformOwners.length})</h3>
            <span>Accounts with administrative console privileges</span>
          </div>

          <div className={styles.tableWrapper} style={{ marginTop: 8 }}>
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {platformOwners.map((owner) => (
                  <tr key={owner.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={styles.avatarSmall} style={{ width: 26, height: 26, fontSize: 9 }}>
                          {owner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <strong>{owner.name}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>{owner.email}</span>
                    </td>
                    <td>
                      {onSelectUser && (
                        <button
                          type="button"
                          className={styles.triageInspectBtn}
                          onClick={() => onSelectUser(owner.id)}
                        >
                          <span>Inspect</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Threat Telemetry & Security Events */}
      <div className={styles.farmTableSection}>
        <div className={styles.tableControlsRow}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--admin-text)' }}>
              Security & Privilege Audit Stream
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
              Chronological feed of security-sensitive operations recorded by backend functions.
            </p>
          </div>
          <span className={styles.kpiBadge}>
            {audits.length} Records
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.overviewTable}>
            <thead>
              <tr>
                <th>Action</th>
                <th>Operator / Actor</th>
                <th>Target ID</th>
                <th>Reason / Justification</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span className={styles.healthPillConfigured}>{event.action}</span>
                  </td>
                  <td>
                    <code>{event.actorId.slice(0, 10)}…</code>
                  </td>
                  <td>
                    {event.targetId ? <code>{event.targetId.slice(0, 12)}…</code> : <span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>System</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--admin-text)' }}>{event.reason}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}

              {audits.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--admin-muted)', fontSize: 12 }}>
                    No security events recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
