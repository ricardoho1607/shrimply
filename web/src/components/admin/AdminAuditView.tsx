'use client';

import {
  ArrowRight,
  Calendar,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Filter,
  ListChecks,
  RefreshCcw,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import styles from '@/app/admin/admin.module.css';
import type { AdminAuditEvent, AuditLogFilters } from '@/lib/admin/types';

interface AdminAuditViewProps {
  events: AdminAuditEvent[];
  loading: boolean;
  onRefresh: () => void;
  onSelectUser?: (userId: string) => void;
}

export function AdminAuditView({
  events,
  loading,
  onRefresh,
  onSelectUser,
}: AdminAuditViewProps) {
  const [category, setCategory] = useState<AuditLogFilters['category']>('all');
  const [dateRange, setDateRange] = useState<AuditLogFilters['dateRange']>('all');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AdminAuditEvent | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const totalEvents = events.length;
  const accountEvents = events.filter((e) => e.action.toLowerCase().includes('account') || e.action.toLowerCase().includes('user')).length;
  const securityEvents = events.filter((e) => e.action.toLowerCase().includes('security') || e.action.toLowerCase().includes('claim') || e.action.toLowerCase().includes('role')).length;
  const supportEvents = events.filter((e) => e.action.toLowerCase().includes('support') || e.action.toLowerCase().includes('tester') || e.action.toLowerCase().includes('disease')).length;

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    const DAY_MS = 86_400_000;

    return events.filter((evt) => {
      // Category filter
      if (category !== 'all') {
        if (!evt.action.toLowerCase().includes(category.toLowerCase())) return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const evtTime = new Date(evt.timestamp).getTime();
        const diffMs = now - evtTime;
        if (dateRange === 'today' && diffMs > DAY_MS) return false;
        if (dateRange === '7d' && diffMs > 7 * DAY_MS) return false;
        if (dateRange === '30d' && diffMs > 30 * DAY_MS) return false;
        if (dateRange === '90d' && diffMs > 90 * DAY_MS) return false;
      }

      // Search query
      if (query) {
        const metadataStr = evt.metadata ? JSON.stringify(evt.metadata).toLowerCase() : '';
        const text = `${evt.id} ${evt.action} ${evt.actorId} ${evt.targetId || ''} ${evt.reason} ${metadataStr}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [events, category, dateRange, search]);

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Action', 'Actor ID', 'Target ID', 'Reason', 'Metadata'];
    const rows = filteredEvents.map((evt) => [
      evt.id,
      evt.timestamp,
      evt.action,
      evt.actorId,
      evt.targetId || '',
      `"${(evt.reason || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(evt.metadata || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shrimply_admin_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shrimply_admin_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPayload = async (evt: AdminAuditEvent) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(evt, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className={styles.stateMessage}>
        <span className={styles.loadingSpinner} />
        <strong>Loading Audit Log…</strong>
        <span>Gathering immutable operator records, claim events, and system operations</span>
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      {/* 1. Header */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewHeaderTitle}>
          <h2>Platform Audit Log</h2>
          <p>Immutable, chronologically recorded administrative operations, security audits, and data governance trails.</p>
        </div>
        <div className={styles.overviewControls}>
          <button
            type="button"
            className={styles.triageInspectBtn}
            onClick={handleExportCsv}
            title="Export filtered records as CSV"
          >
            <FileSpreadsheet size={13} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className={styles.triageInspectBtn}
            onClick={handleExportJson}
            title="Export filtered records as JSON"
          >
            <FileJson size={13} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh audit records"
            aria-label="Refresh audit records"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Total Logged Operations</span>
          </div>
          <div className={styles.kpiValue}>{totalEvents.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>Immutable system audit records</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Account Operations</span>
          </div>
          <div className={styles.kpiValue}>{accountEvents.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>Profile updates, removals & directory access</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Security & Role Events</span>
          </div>
          <div className={styles.kpiValue}>{securityEvents.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span className={styles.kpiBadge} style={{ color: '#166534', background: '#dcfce7' }}>
              Audited
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Support & Triage Events</span>
          </div>
          <div className={styles.kpiValue}>{supportEvents.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>Tester updates & disease closures</span>
          </div>
        </div>
      </div>

      {/* 3. Main Audit Section */}
      <div className={styles.farmTableSection}>
        <div className={styles.tableControlsRow}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`${styles.detailTabButton} ${category === 'all' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setCategory('all')}
              >
                <ListChecks size={14} />
                <span>All Operations ({events.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${category === 'account' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setCategory('account')}
              >
                <User size={14} />
                <span>Account Operations</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${category === 'security' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setCategory('security')}
              >
                <Shield size={14} />
                <span>Security</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${category === 'support' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setCategory('support')}
              >
                <span>Support & Triage</span>
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
              Operator activity logged with actor identification, timestamp, justification, and execution metadata.
            </p>
          </div>

          <div className={styles.tableControlsRight}>
            <input
              type="text"
              className={styles.tableSearchInput}
              placeholder="Search action, reason, target ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as AuditLogFilters['dateRange'])}
              className={styles.tableSearchInput}
              style={{ minWidth: 120, cursor: 'pointer' }}
              title="Filter by timeframe"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* 4. Audit Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.overviewTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Operator / Actor</th>
                <th>Target Entity</th>
                <th>Reason / Justification</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((evt) => {
                const isDestructive = evt.action.toLowerCase().includes('delete') || evt.action.toLowerCase().includes('purge');
                const isSecurity = evt.action.toLowerCase().includes('security') || evt.action.toLowerCase().includes('claim');

                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    style={{ cursor: 'pointer' }}
                    className={selectedEvent?.id === evt.id ? styles.tableRowSelected : ''}
                  >
                    <td>
                      <div>
                        <strong>{new Date(evt.timestamp).toLocaleDateString()}</strong>
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          isDestructive
                            ? styles.triageBadgeHigh
                            : isSecurity
                            ? styles.triageBadgeMedium
                            : styles.healthPillConfigured
                        }
                      >
                        {evt.action}
                      </span>
                    </td>

                    <td>
                      <code>{evt.actorId.slice(0, 10)}…</code>
                    </td>

                    <td>
                      {evt.targetId ? (
                        <code>{evt.targetId.slice(0, 12)}…</code>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>System</span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: 12, color: 'var(--admin-text)' }}>{evt.reason}</span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.triageInspectBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                      >
                        <Code size={11} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-muted)', fontSize: 12 }}>
                    No audit records match the current search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Event JSON Inspector Drawer */}
      {selectedEvent && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedEvent(null)}>
          <div className={styles.drawerContent} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.kpiBadge}>{selectedEvent.action}</span>
                <h2 style={{ marginTop: 6 }}>Audit Event Payload</h2>
                <p>{new Date(selectedEvent.timestamp).toLocaleString()}</p>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setSelectedEvent(null)}
                aria-label="Close inspector"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.keyValGrid}>
                <div className={styles.keyValPair}>
                  <span>Event ID</span>
                  <code>{selectedEvent.id}</code>
                </div>
                <div className={styles.keyValPair}>
                  <span>Action Type</span>
                  <strong>{selectedEvent.action}</strong>
                </div>
                <div className={styles.keyValPair}>
                  <span>Actor UID</span>
                  <code>{selectedEvent.actorId}</code>
                </div>
                <div className={styles.keyValPair}>
                  <span>Target Entity</span>
                  <code>{selectedEvent.targetId || 'System'}</code>
                </div>
                <div className={styles.keyValPair} style={{ gridColumn: 'span 2' }}>
                  <span>Operator Justification</span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--admin-text)' }}>{selectedEvent.reason}</p>
                </div>
              </div>

              <div className={styles.drawerSection} style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4>Execution Metadata Payload (JSON)</h4>
                  <button
                    type="button"
                    className={styles.triageInspectBtn}
                    onClick={() => void handleCopyPayload(selectedEvent)}
                  >
                    {copiedPayload ? <Check size={12} color="#166534" /> : <Copy size={12} />}
                    <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>

                <pre className={styles.jsonViewer}>
                  {JSON.stringify(
                    {
                      id: selectedEvent.id,
                      action: selectedEvent.action,
                      actorId: selectedEvent.actorId,
                      targetId: selectedEvent.targetId,
                      timestamp: selectedEvent.timestamp,
                      reason: selectedEvent.reason,
                      metadata: selectedEvent.metadata || {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
