'use client';

import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
  User,
  Users,
  Waves,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import styles from '@/app/admin/admin.module.css';
import type { DetailedFarm, DetailedFarmPond } from '@/lib/admin/types';

interface AdminFarmsViewProps {
  farms: DetailedFarm[];
  loading: boolean;
  onRefresh: () => void;
  onSelectOwner?: (userId: string) => void;
}

export function AdminFarmsView({
  farms,
  loading,
  onRefresh,
  onSelectOwner,
}: AdminFarmsViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'fallow' | 'empty'>('all');
  const [selectedFarm, setSelectedFarm] = useState<DetailedFarm | null>(null);
  const [drawerTab, setDrawerTab] = useState<'ponds' | 'team' | 'overview'>('ponds');

  // Compute fleet KPI totals
  const totalFarms = farms.length;
  const totalPonds = farms.reduce((sum, f) => sum + f.pondCount, 0);
  const totalActivePonds = farms.reduce((sum, f) => sum + f.activePondCount, 0);
  const totalInactivePonds = farms.reduce((sum, f) => sum + f.inactivePondCount, 0);
  const totalActiveCycles = farms.reduce((sum, f) => sum + f.activeCycleCount, 0);
  const totalAreaM2 = farms.reduce((sum, f) => sum + f.totalAreaM2, 0);
  const totalTeamMembers = farms.reduce((sum, f) => sum + f.teamMembersCount, 0);
  const totalAiRequests = farms.reduce((sum, f) => sum + f.aiRequestCount, 0);

  // Filtered farms
  const filteredFarms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return farms.filter((farm) => {
      if (statusFilter === 'active' && farm.activeCycleCount === 0) return false;
      if (statusFilter === 'fallow' && (farm.activeCycleCount > 0 || farm.pondCount === 0)) return false;
      if (statusFilter === 'empty' && farm.pondCount > 0) return false;

      if (query) {
        const text = `${farm.companyName} ${farm.ownerName || ''} ${farm.ownerEmail} ${farm.location} ${farm.farmType} ${farm.id}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [farms, search, statusFilter]);

  if (loading && farms.length === 0) {
    return (
      <div className={styles.stateMessage}>
        <span className={styles.loadingSpinner} />
        <strong>Loading Farms Fleet…</strong>
        <span>Gathering live farm telemetry, pond cycles, and staff allocations</span>
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      {/* 1. Header & Controls */}
      <div className={styles.overviewHeader}>
        <div className={styles.overviewHeaderTitle}>
          <h2>Farms & Operations Fleet</h2>
          <p>Fleet-wide pond inventory, active production cycles, team allocations, and biological monitoring.</p>
        </div>
        <div className={styles.overviewControls}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh farm fleet data"
            aria-label="Refresh farm fleet data"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Registered Farms</span>
          </div>
          <div className={styles.kpiValue}>{totalFarms.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>{totalTeamMembers} active operators</span>
            <span>·</span>
            <span className={styles.kpiBadge}>{farms.filter((f) => f.activeCycleCount > 0).length} Active</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Physical Ponds</span>
          </div>
          <div className={styles.kpiValue}>{totalPonds.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span className={styles.kpiBadge} style={{ color: '#166534', background: '#dcfce7' }}>
              {totalActivePonds} Active
            </span>
            <span className={styles.kpiBadge}>
              {totalInactivePonds} Idle
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Active Cycles</span>
          </div>
          <div className={styles.kpiValue}>{totalActiveCycles.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>
              {totalAreaM2 > 0 ? `${(totalAreaM2 / 10_000).toFixed(1)} Ha total water area` : 'Production cycles in progress'}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>Orson AI Usage</span>
          </div>
          <div className={styles.kpiValue}>{totalAiRequests.toLocaleString()}</div>
          <div className={styles.kpiSubtext}>
            <span>Diagnostic & feed optimization inquiries</span>
          </div>
        </div>
      </div>

      {/* 3. Live Directory Section: Farms */}
      <div className={styles.farmTableSection}>
        <div className={styles.tableControlsRow}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`${styles.detailTabButton} ${statusFilter === 'all' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <Building2 size={14} />
                <span>All Farms ({farms.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${statusFilter === 'active' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                <Waves size={14} />
                <span>Active Cycles ({farms.filter((f) => f.activeCycleCount > 0).length})</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${statusFilter === 'fallow' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setStatusFilter('fallow')}
              >
                <span>Fallow / Idle ({farms.filter((f) => f.activeCycleCount === 0 && f.pondCount > 0).length})</span>
              </button>
              <button
                type="button"
                className={`${styles.detailTabButton} ${statusFilter === 'empty' ? styles.detailTabButtonActive : ''}`}
                onClick={() => setStatusFilter('empty')}
              >
                <span>0 Ponds ({farms.filter((f) => f.pondCount === 0).length})</span>
              </button>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--admin-muted)' }}>
              Registered tenant farm companies, physical ponds, live biomass, and assigned team members.
            </p>
          </div>

          <div className={styles.tableControlsRight}>
            <input
              type="text"
              className={styles.tableSearchInput}
              placeholder="Search farm name, owner, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Farms Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.overviewTable}>
            <thead>
              <tr>
                <th>Farm / Company</th>
                <th>Owner & Contact</th>
                <th>Location</th>
                <th>Ponds Breakdown</th>
                <th>Active Cycles</th>
                <th>Team</th>
                <th>AI Inquiries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFarms.map((farm) => {
                const isSelected = selectedFarm?.id === farm.id;
                return (
                  <tr
                    key={farm.id}
                    className={isSelected ? styles.tableRowSelected : ''}
                    onClick={() => {
                      setSelectedFarm(farm);
                      setDrawerTab('ponds');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div>
                        <strong>{farm.companyName}</strong>
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          <span className={styles.kpiBadge}>{farm.farmType}</span>
                          {farm.businessSize && <span className={styles.kpiBadge}>{farm.businessSize}</span>}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        {farm.ownerName ? <strong>{farm.ownerName}</strong> : <span style={{ color: 'var(--admin-muted)' }}>Owner Account</span>}
                        <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                          {farm.ownerEmail ? farm.ownerEmail : 'No email logged'}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--admin-muted)', fontSize: 12 }}>
                        <MapPin size={12} />
                        <span>{farm.location || farm.country || 'Global'}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <strong>{farm.pondCount}</strong>
                        {farm.pondCount > 0 && farm.activePondCount > 0 && (
                          <span className={styles.healthPillActive}>
                            {farm.activePondCount} active
                          </span>
                        )}
                        {farm.pondCount > 0 && farm.inactivePondCount > 0 && (
                          <span className={styles.healthPillConfigured}>
                            {farm.inactivePondCount} idle
                          </span>
                        )}
                        {farm.pondCount === 0 && (
                          <span className={styles.healthPillIncomplete}>
                            0 ponds
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {farm.activeCycleCount > 0 ? (
                        <span className={styles.healthPillActive}>
                          {farm.activeCycleCount} Running
                        </span>
                      ) : (
                        <span className={styles.kpiBadge}>Idle</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <Users size={13} color="var(--admin-muted)" />
                        <span>{farm.teamMembersCount}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <Sparkles size={13} color="var(--admin-cyan)" />
                        <span>{farm.aiRequestCount}</span>
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className={styles.triageInspectBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFarm(farm);
                          setDrawerTab('ponds');
                        }}
                      >
                        <span>Inspect</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredFarms.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--admin-muted)', fontSize: 12 }}>
                    No farms match the current filter or search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Farm Detail Slide-over Drawer */}
      {selectedFarm && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedFarm(null)}>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4 }}>
                  <span className={styles.kpiBadge}>{selectedFarm.farmType}</span>
                  <span className={styles.kpiBadge}>{selectedFarm.businessSize}</span>
                </div>
                <h2>{selectedFarm.companyName}</h2>
                <p>ID: {selectedFarm.id}</p>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setSelectedFarm(null)}
                aria-label="Close farm inspector"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className={styles.drawerTabBar}>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'ponds' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('ponds')}
              >
                <Waves size={14} />
                <span>Ponds ({selectedFarm.ponds.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'team' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('team')}
              >
                <Users size={14} />
                <span>Team ({selectedFarm.team.length})</span>
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'overview' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('overview')}
              >
                <Layers size={14} />
                <span>Overview & Stock</span>
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* TAB 1: PONDS */}
              {drawerTab === 'ponds' && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerSectionHeader}>
                    <h4>Physical Ponds & Active Batches</h4>
                    <span style={{ fontSize: 11, color: 'var(--admin-muted)' }}>
                      {selectedFarm.activePondCount} active / {selectedFarm.pondCount} total
                    </span>
                  </div>

                  {selectedFarm.ponds.length > 0 ? (
                    <div className={styles.pondCardsList}>
                      {selectedFarm.ponds.map((pond) => (
                        <div key={pond.id} className={styles.pondCard}>
                          <div className={styles.pondCardHead}>
                            <div>
                              <strong>{pond.name}</strong>
                              <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                                {pond.areaM2 > 0 ? `${pond.areaM2.toLocaleString()} m²` : 'Area not specified'}
                              </div>
                            </div>
                            <span className={pond.active ? styles.healthPillActive : styles.healthPillConfigured}>
                              {pond.active ? 'Active Cycle' : 'Fallow'}
                            </span>
                          </div>

                          <div className={styles.pondMetricsGrid}>
                            <div className={styles.pondMetricItem}>
                              <span className={styles.pondMetricLabel}>Current MBW</span>
                              <strong>{pond.mbw !== undefined ? `${pond.mbw}g` : '—'}</strong>
                            </div>
                            <div className={styles.pondMetricItem}>
                              <span className={styles.pondMetricLabel}>FCR</span>
                              <strong>{pond.fcr !== undefined ? pond.fcr.toFixed(2) : '—'}</strong>
                            </div>
                            <div className={styles.pondMetricItem}>
                              <span className={styles.pondMetricLabel}>DOC</span>
                              <strong>{pond.daysOld !== undefined ? `DOC ${pond.daysOld}` : '—'}</strong>
                            </div>
                            <div className={styles.pondMetricItem}>
                              <span className={styles.pondMetricLabel}>Last Log</span>
                              <strong style={{ fontSize: 11 }}>
                                {pond.lastSamplingDate ? new Date(pond.lastSamplingDate).toLocaleDateString() : 'None'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyDrawerNotice}>
                      No physical ponds configured for this farm yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TEAM */}
              {drawerTab === 'team' && (
                <div className={styles.drawerSection}>
                  <div className={styles.drawerSectionHeader}>
                    <h4>Assigned Team Members ({selectedFarm.team.length})</h4>
                    {selectedFarm.ownerId && onSelectOwner && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => onSelectOwner(selectedFarm.ownerId!)}
                      >
                        <span>Open Owner Profile</span>
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>

                  {selectedFarm.team.length > 0 ? (
                    <div className={styles.teamList}>
                      {selectedFarm.team.map((member) => (
                        <div key={member.id} className={styles.teamMemberItem}>
                          <div className={styles.userAvatarSmall}>
                            <User size={13} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <strong>{member.name}</strong>
                              <span className={styles.kpiBadge}>{member.role}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
                              {member.email}
                            </div>
                          </div>
                          {onSelectOwner && (
                            <button
                              type="button"
                              className={styles.triageInspectBtn}
                              onClick={() => onSelectOwner(member.id)}
                            >
                              <span>Inspect</span>
                              <ArrowRight size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyDrawerNotice}>
                      No additional staff members linked to this farm company.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: OVERVIEW & INVENTORY */}
              {drawerTab === 'overview' && (
                <div className={styles.drawerSection}>
                  <div className={styles.keyValGrid}>
                    <div className={styles.keyValPair}>
                      <span>Company ID</span>
                      <code>{selectedFarm.id}</code>
                    </div>
                    <div className={styles.keyValPair}>
                      <span>Registered On</span>
                      <strong>
                        {selectedFarm.createdAt ? new Date(selectedFarm.createdAt).toLocaleDateString() : 'Unavailable'}
                      </strong>
                    </div>
                    <div className={styles.keyValPair}>
                      <span>Location</span>
                      <strong>{selectedFarm.location}</strong>
                    </div>
                    <div className={styles.keyValPair}>
                      <span>Total Farm Area</span>
                      <strong>
                        {selectedFarm.totalAreaM2 > 0
                          ? `${(selectedFarm.totalAreaM2 / 10_000).toFixed(2)} Ha (${selectedFarm.totalAreaM2.toLocaleString()} m²)`
                          : 'Not specified'}
                      </strong>
                    </div>
                    <div className={styles.keyValPair}>
                      <span>Feed Stock Items</span>
                      <strong>{selectedFarm.feedItemCount} feeds logged</strong>
                    </div>
                    <div className={styles.keyValPair}>
                      <span>Additive Stock</span>
                      <strong>{selectedFarm.additiveItemCount} formulas logged</strong>
                    </div>
                    <div className={styles.keyValPair} style={{ gridColumn: 'span 2' }}>
                      <span>Orson AI Interactions</span>
                      <strong>{selectedFarm.aiRequestCount} biological questions asked</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
