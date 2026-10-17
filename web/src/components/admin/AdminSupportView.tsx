'use client';

import { ArrowRight, Check, CheckCircle2, Copy, Mail, RefreshCcw, ShieldAlert, Smartphone, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import styles from '@/app/admin/admin.module.css';
import type { SupportDiseaseReport, SupportOverviewData } from '@/lib/admin/types';

interface AdminSupportViewProps {
  data: SupportOverviewData | null;
  loading: boolean;
  onRefresh: () => void;
  onUpdateTesterStatus: (requestId: string, status: string) => Promise<boolean>;
  onResolveDiseaseReport: (reportId: string, resolutionNote?: string) => Promise<boolean>;
  onSelectUser?: (userId: string) => void;
}

export function AdminSupportView({
  data,
  loading,
  onRefresh,
  onUpdateTesterStatus,
  onResolveDiseaseReport,
  onSelectUser,
}: AdminSupportViewProps) {
  const [activeTab, setActiveTab] = useState<'joins' | 'testers' | 'disease'>('joins');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [selectedDiseaseCase, setSelectedDiseaseCase] = useState<SupportDiseaseReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const joinRequests = data?.joinRequests || [];
  const testerRequests = data?.testerRequests || [];
  const diseaseReports = data?.diseaseReports || [];

  // Filter Join Requests
  const filteredJoins = useMemo(() => {
    const query = search.trim().toLowerCase();
    return joinRequests.filter((req) => {
      if (statusFilter !== 'all' && req.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (query) {
        const text = `${req.userName} ${req.userEmail} ${req.companyName} ${req.requestedRole} ${req.id}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [joinRequests, search, statusFilter]);

  // Filter Tester Requests
  const filteredTesters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return testerRequests.filter((req) => {
      if (statusFilter !== 'all' && req.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (query) {
        const text = `${req.name} ${req.email} ${req.company} ${req.country} ${req.androidDevice} ${req.reason}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [testerRequests, search, statusFilter]);

  // Filter Disease Reports
  const filteredDisease = useMemo(() => {
    const query = search.trim().toLowerCase();
    return diseaseReports.filter((rep) => {
      if (statusFilter !== 'all' && rep.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (query) {
        const text = `${rep.companyName} ${rep.pondName || ''} ${rep.symptoms.join(' ')} ${rep.diagnosis || ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [diseaseReports, search, statusFilter]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedNotification(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyAllTesterEmails = () => {
    const emails = testerRequests
      .map((t) => t.email.trim())
      .filter((e) => e && e !== 'Unavailable');
    const uniqueEmails = Array.from(new Set(emails)).join(', ');
    handleCopy(uniqueEmails, `${uniqueEmails.split(',').length} Tester Emails`);
  };

  const handleTesterStatusChange = async (requestId: string, newStatus: string) => {
    setActionLoadingId(requestId);
    try {
      await onUpdateTesterStatus(requestId, newStatus);
      await onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolveDisease = async (reportId: string) => {
    setActionLoadingId(reportId);
    try {
      await onResolveDiseaseReport(reportId, resolutionNote || undefined);
      setSelectedDiseaseCase(null);
      setResolutionNote('');
      await onRefresh();
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className={styles.stateMessage}>
        <span className={styles.loadingSpinner} />
        <strong>Loading Support Queue…</strong>
        <span>Collecting pending join requests, beta testers, and diagnostic alerts</span>
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      {/* 1. Header */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewHeaderTitle}>
          <h2>Support & Operational Triage</h2>
          <p>Triage technician join requests, closed-testing beta applications, and farm disease diagnostic alerts.</p>
        </div>
        <div className={styles.overviewControls}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh support queues"
            aria-label="Refresh support queues"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Pending Join Requests</span>
          </div>
          <div className={styles.kpiValue}>{data?.totals.pendingJoins ?? 0}</div>
          <div className={styles.kpiSubtext}>
            <span>Technicians waiting for farm approval</span>
            <span>·</span>
            <span className={styles.kpiBadge}>{joinRequests.length} Total</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Beta Testers</span>
          </div>
          <div className={styles.kpiValue}>{data?.totals.pendingTesters ?? 0}</div>
          <div className={styles.kpiSubtext}>
            <span>Closed-testing applicants</span>
            <span>·</span>
            <span className={styles.kpiBadge}>{testerRequests.filter((t) => t.status === 'approved' || t.status === 'invited').length} Approved</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Disease Diagnostics</span>
          </div>
          <div className={styles.kpiValue}>{data?.totals.openDisease ?? 0}</div>
          <div className={styles.kpiSubtext}>
            <span>Cases awaiting resolution</span>
            <span>·</span>
            <span className={styles.kpiBadge} style={{ background: '#fee2e2', color: '#b91c1c' }}>
              {diseaseReports.filter((r) => r.severity === 'high').length} High priority
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Total Triaged</span>
          </div>
          <div className={styles.kpiValue}>{data?.totals.totalResolved ?? 0}</div>
          <div className={styles.kpiSubtext}>
            <span>Resolved cases & approved testers</span>
          </div>
        </div>
      </div>

      {/* 3. Main Support Section */}
      <div className={styles.farmTableSection}>
        {/* Table Controls Row with Tabs */}
        <div className={styles.tableControlsRow}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`${styles.detailTabButton} ${activeTab === 'joins' ? styles.detailTabButtonActive : ''}`}
                onClick={() => {
                  setActiveTab('joins');
                  setStatusFilter('all');
                }}
              >
                <Users size={14} />
                <span>Join Requests ({joinRequests.length})</span>
                {data?.totals.pendingJoins ? (
                  <span className={styles.countPill}>{data.totals.pendingJoins}</span>
                ) : null}
              </button>

              <button
                type="button"
                className={`${styles.detailTabButton} ${activeTab === 'testers' ? styles.detailTabButtonActive : ''}`}
                onClick={() => {
                  setActiveTab('testers');
                  setStatusFilter('all');
                }}
              >
                <Smartphone size={14} />
                <span>Beta Testers ({testerRequests.length})</span>
                {data?.totals.pendingTesters ? (
                  <span className={styles.countPill}>{data.totals.pendingTesters}</span>
                ) : null}
              </button>

              <button
                type="button"
                className={`${styles.detailTabButton} ${activeTab === 'disease' ? styles.detailTabButtonActive : ''}`}
                onClick={() => {
                  setActiveTab('disease');
                  setStatusFilter('all');
                }}
              >
                <ShieldAlert size={14} />
                <span>Disease Alerts ({diseaseReports.length})</span>
                {data?.totals.openDisease ? (
                  <span className={styles.countPill} style={{ background: '#fee2e2', color: '#b91c1c' }}>
                    {data.totals.openDisease}
                  </span>
                ) : null}
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
              {activeTab === 'joins'
                ? 'Technicians and managers requesting access to existing tenant farm companies.'
                : activeTab === 'testers'
                ? 'External aquaculture testers for Google Play closed testing track.'
                : 'Farmer-reported shrimp disease alerts and Orson AI diagnostic consultations.'}
            </p>
          </div>

          <div className={styles.tableControlsRight}>
            <input
              type="text"
              className={styles.tableSearchInput}
              placeholder={
                activeTab === 'joins'
                  ? 'Search applicant, email, farm...'
                  : activeTab === 'testers'
                  ? 'Search tester, country, device...'
                  : 'Search farm, symptoms, diagnosis...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.tableSearchInput}
              style={{ minWidth: 130, cursor: 'pointer' }}
              title="Filter by status"
            >
              <option value="all">All Statuses</option>
              {activeTab === 'disease' ? (
                <>
                  <option value="open">Open Cases</option>
                  <option value="resolved">Resolved</option>
                </>
              ) : activeTab === 'testers' ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="invited">Invited</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="rejected">Rejected</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
            </select>

            {activeTab === 'testers' && testerRequests.length > 0 && (
              <button
                type="button"
                className={styles.triageInspectBtn}
                onClick={handleCopyAllTesterEmails}
                title="Copy all tester emails for Google Play Console"
              >
                <Copy size={13} />
                <span>Copy Emails</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Table Content */}
        <div className={styles.tableWrapper}>
          {/* TAB 1: JOIN REQUESTS */}
          {activeTab === 'joins' && (
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Target Farm Company</th>
                  <th>Requested Role</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJoins.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div>
                        <strong>{req.userName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {req.userEmail}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{req.companyName}</strong>
                      <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                        ID: {req.companyId}
                      </div>
                    </td>
                    <td>
                      <span className={styles.kpiBadge}>{req.requestedRole}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>
                        {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          req.status === 'approved'
                            ? styles.healthPillActive
                            : req.status === 'rejected'
                            ? styles.healthPillIncomplete
                            : styles.healthPillConfigured
                        }
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {req.userId && onSelectUser && (
                          <button
                            type="button"
                            className={styles.triageInspectBtn}
                            onClick={() => onSelectUser(req.userId)}
                          >
                            <span>Inspect</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                        <a
                          href={`mailto:${req.userEmail}?subject=Shrimply Farm Join Request - ${encodeURIComponent(req.companyName)}`}
                          className={styles.triageInspectBtn}
                          style={{ textDecoration: 'none' }}
                        >
                          <Mail size={12} />
                          <span>Email</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredJoins.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-muted)', fontSize: 12 }}>
                      No join requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: TESTER REQUESTS */}
          {activeTab === 'testers' && (
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th>Tester</th>
                  <th>Country & Device</th>
                  <th>Role & Motivation</th>
                  <th>Email Delivery</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTesters.map((tester) => (
                  <tr key={tester.id}>
                    <td>
                      <div>
                        <strong>{tester.name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {tester.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{tester.country}</strong>
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {tester.androidDevice}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className={styles.kpiBadge}>{tester.role}</span>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--admin-muted)', maxWidth: 280 }} title={tester.reason}>
                          {tester.reason.length > 60 ? `${tester.reason.slice(0, 60)}…` : tester.reason}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className={tester.emailDeliveryStatus === 'delivered' ? styles.healthPillActive : styles.healthPillConfigured}>
                        {tester.emailDeliveryStatus}
                      </span>
                    </td>
                    <td>
                      <select
                        className={styles.tableSearchInput}
                        style={{ padding: '3px 8px', fontSize: 11, minWidth: 100, cursor: 'pointer' }}
                        value={tester.status}
                        disabled={actionLoadingId === tester.id}
                        onChange={(e) => void handleTesterStatusChange(tester.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="invited">Invited</option>
                        <option value="waitlisted">Waitlisted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.triageInspectBtn}
                        onClick={() => handleCopy(tester.email, 'Tester Email')}
                      >
                        <Copy size={11} />
                        <span>Copy</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTesters.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-muted)', fontSize: 12 }}>
                      No beta tester applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: DISEASE DIAGNOSTICS */}
          {activeTab === 'disease' && (
            <table className={styles.overviewTable}>
              <thead>
                <tr>
                  <th>Farm & Pond</th>
                  <th>Symptoms</th>
                  <th>Severity</th>
                  <th>Diagnosis / Recommendation</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisease.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div>
                        <strong>{report.companyName}</strong>
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {report.pondName || 'General Farm Alert'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                        {report.symptoms.map((s, idx) => (
                          <span key={idx} className={styles.kpiBadge}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          report.severity === 'high'
                            ? styles.triageBadgeHigh
                            : styles.triageBadgeMedium
                        }
                      >
                        {report.severity.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: 300, fontSize: 12, color: 'var(--admin-text)' }}>
                        {report.diagnosis ? (
                          <p style={{ margin: 0 }}>
                            {report.diagnosis.length > 80 ? `${report.diagnosis.slice(0, 80)}…` : report.diagnosis}
                          </p>
                        ) : (
                          <span style={{ color: 'var(--admin-muted)', fontSize: 11 }}>Pending assessment</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={report.status === 'resolved' ? styles.healthPillActive : styles.healthPillConfigured}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.triageInspectBtn}
                        onClick={() => setSelectedDiseaseCase(report)}
                      >
                        <span>Review</span>
                        <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredDisease.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-muted)', fontSize: 12 }}>
                      No disease diagnostic cases recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Disease Detail / Resolution Modal */}
      {selectedDiseaseCase && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedDiseaseCase(null)}>
          <div
            className={styles.drawerContent}
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div>
                <span className={selectedDiseaseCase.severity === 'high' ? styles.triageBadgeHigh : styles.triageBadgeMedium}>
                  {selectedDiseaseCase.severity.toUpperCase()} PRIORITY
                </span>
                <h2 style={{ marginTop: 6 }}>{selectedDiseaseCase.companyName}</h2>
                <p>{selectedDiseaseCase.pondName || 'Pond Diagnostic Report'}</p>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setSelectedDiseaseCase(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerSection}>
                <h4>Reported Biological Symptoms</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {selectedDiseaseCase.symptoms.map((s, idx) => (
                    <span key={idx} className={styles.kpiBadge} style={{ fontSize: 12, padding: '4px 8px' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selectedDiseaseCase.diagnosis && (
                <div className={styles.drawerSection}>
                  <h4>Orson AI Clinical Assessment</h4>
                  <div className={styles.triageIssue} style={{ marginTop: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                    <p style={{ margin: 0, fontSize: 13 }}>{selectedDiseaseCase.diagnosis}</p>
                  </div>
                </div>
              )}

              <div className={styles.drawerSection}>
                <h4>Resolution Note / Action Taken</h4>
                <textarea
                  className={styles.adminTextarea}
                  rows={3}
                  placeholder="Enter notes on farmer follow-up or treatment guidance..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setSelectedDiseaseCase(null)}
                >
                  Cancel
                </button>
                {selectedDiseaseCase.status !== 'resolved' && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={actionLoadingId === selectedDiseaseCase.id}
                    onClick={() => void handleResolveDisease(selectedDiseaseCase.id)}
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Case Resolved</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy notification toast */}
      {copiedNotification && (
        <div className={styles.toast} role="status">
          <Check size={14} color="#166534" />
          <span>{copiedNotification}</span>
        </div>
      )}
    </div>
  );
}
