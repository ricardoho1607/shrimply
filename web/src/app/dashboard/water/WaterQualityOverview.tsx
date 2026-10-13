"use client";
import { EnterpriseGroupedPondGrid } from '@/components/EnterpriseDashboard';
import {
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2
} from 'lucide-react';
import { labMeasurementLabel } from "../../../../../functions/shared/labMeasurementContract";
import {
  getEnterprisePondStatus
} from "../../../../../shared/enterpriseBlocks";
import { Pond, getLabReportTypeLabel, hasSavedValue } from './WaterQualityModel';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'loading'
  | 'activeView'
  | 'enterpriseOwnerView'
  | 'filteredPonds'
  | 'copy'
  | 'company'
  | 'setSelectedPondForHistory'
  | 'getLatestWQ'
  | 'getSeverityStyle'
  | 'savePending'
  | 't'
  | 'canEditWater'
  | 'openWaterRecord'
  | 'groupedLabReports'
  | 'toggleLabDateGroup'
  | 'expandedLabDateKeys'
  | 'expandedLabReportId'
  | 'accessiblePonds'
  | 'setExpandedLabReportId'
  | 'canManageLabReports'
  | 'openLabReportReview'
  | 'downloadingLabReportId'
  | 'handleDownloadLabReport'
  | 'formatLabValue'
  | 'filteredLabReports'>;
export function WaterQualityOverview({ loading, activeView, enterpriseOwnerView, filteredPonds, copy, company, setSelectedPondForHistory, getLatestWQ, getSeverityStyle, savePending, t, canEditWater, openWaterRecord, groupedLabReports, toggleLabDateGroup, expandedLabDateKeys, expandedLabReportId, accessiblePonds, setExpandedLabReportId, canManageLabReports, openLabReportReview, downloadingLabReportId, handleDownloadLabReport, formatLabValue, filteredLabReports }: Props) {
  return (<>{loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
  ) : activeView === 'daily' ? (
    enterpriseOwnerView ? (
      <EnterpriseGroupedPondGrid
        ponds={filteredPonds}
        emptyMessage={copy('No water quality data')}
        getTone={(pond) => getEnterprisePondStatus(pond, company?.timeZone).risk}
        onSelect={(pond) => setSelectedPondForHistory(pond as Pond)}
      />
    ) : (
      <div className="water-pond-grid">
        {filteredPonds.map((pond, idx) => {
          const latest = getLatestWQ(pond);
          const labStyle = getSeverityStyle(pond.latestLabStatus?.status);
          return (
            <article key={pond.id} className={`glass-card ponds-overview-card water-pond-card animate-fade-up animate-delay-${(idx % 4) + 1}`}>
              <div className="ponds-card-header water-pond-header">
                <div className="water-pond-identity">
                  <div>
                    <h3>{pond.pondName}</h3>
                    <p>
                      {copy('Daily Log')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPondForHistory(pond)}
                  className="water-text-action"
                  aria-label={copy('View {pond} water quality history', { pond: pond.pondName })}
                  title={copy('View history')} disabled={savePending}
                >
                  {copy('View history')}
                </button>
              </div>

              {pond.latestLabStatus && (
                <div className="water-lab-status">
                  <div>
                    <div>
                      <span>{copy('Latest lab')}</span>
                      <strong>{pond.latestLabStatus.mainIssue || copy('Lab report reviewed')}</strong>
                    </div>
                    <span className="water-lab-status-pill" style={{ background: labStyle.bg, color: labStyle.color }}>
                      {labStyle.label}
                    </span>
                  </div>
                </div>
              )}

              <div className="ponds-card-metrics water-metric-grid">
                <div className="wq-metric">
                  <span className="wq-label">{copy('pH Level')}</span>
                  <strong className="wq-value">{latest ? `${latest.phMorning || 'N/A'} / ${latest.phEvening || 'N/A'}` : 'N/A'}</strong>
                </div>
                <div className="wq-metric">
                  <span className="wq-label">DO (mg/L)</span>
                  <strong className="wq-value">{latest ? `${latest.doMorning || 'N/A'} / ${latest.doEvening || 'N/A'}` : 'N/A'}</strong>
                </div>
                <div className="wq-metric">
                  <span className="wq-label">{copy('Temperature')}</span>
                  <strong className="wq-value">{latest ? (
                    hasSavedValue(latest.temperatureMorning) || hasSavedValue(latest.temperatureEvening)
                      ? `${latest.temperatureMorning || 'N/A'} / ${latest.temperatureEvening || 'N/A'} °C`
                      : hasSavedValue(latest.temperature) ? `${latest.temperature} °C` : 'N/A'
                  ) : 'N/A'}</strong>
                </div>
                <div className="wq-metric">
                  <span className="wq-label">{copy('Transparency')}</span>
                  <strong className="wq-value">{latest ? (
                    hasSavedValue(latest.transparencyMorning) || hasSavedValue(latest.transparencyEvening)
                      ? `${latest.transparencyMorning || 'N/A'} / ${latest.transparencyEvening || 'N/A'} CM`
                      : hasSavedValue(latest.transparency) ? `${latest.transparency} CM` : 'N/A'
                  ) : 'N/A'}</strong>
                </div>
                <div className="wq-metric">
                  <span className="wq-label">{copy('Salinity')}</span>
                  <strong className="wq-value">{latest && hasSavedValue(latest.salinity) ? `${latest.salinity} PPT` : 'N/A'}</strong>
                </div>
                <div className="wq-metric">
                  <span className="wq-label">{t.dailyOperationsReports.waterDepth}</span>
                  <strong className="wq-value">{latest ? (
                    hasSavedValue(latest.waterDepthCmMorning) || hasSavedValue(latest.waterDepthCmEvening)
                      ? `${latest.waterDepthCmMorning || 'N/A'} / ${latest.waterDepthCmEvening || 'N/A'} CM`
                      : hasSavedValue(latest.waterDepthCm) ? `${latest.waterDepthCm} CM` : 'N/A'
                  ) : 'N/A'}</strong>
                </div>
              </div>

              <div className="ponds-card-footer water-pond-actions">
                <span>{latest ? `${copy('UPDATED')} ${new Date(latest.date).toLocaleDateString()}` : copy('NO DATA LOGGED')}</span>
                {canEditWater && (
                  <button
                    type="button"
                    onClick={() => openWaterRecord(pond.id)}
                    className="water-quick-log" disabled={savePending}
                  >
                    {copy('Log')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    )
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {groupedLabReports.map((group, groupIndex) => (
        <section key={group.key} className={`animate-fade-up animate-delay-${(groupIndex % 4) + 1}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={() => toggleLabDateGroup(group.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(15, 76, 117, 0.05)',
              textAlign: 'left',
            }} disabled={savePending}
          >
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0' }}>{group.label}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, marginTop: '2px' }}>
                {group.reports.length} {copy(group.reports.length === 1 ? 'confirmed report' : 'confirmed reports')}
              </p>
            </div>
            <ChevronDown
              size={18}
              color="var(--primary)"
              style={{
                flexShrink: 0,
                transition: 'transform 0.2s ease',
                transform: expandedLabDateKeys.includes(group.key) ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {expandedLabDateKeys.includes(group.key) && group.reports.map((report) => {
            const style = getSeverityStyle(report.summary?.overallStatus);
            const pondCount = report.pondResults?.length || 0;
            const isExpanded = expandedLabReportId === report.id;
            return (
              <div key={report.id} className="glass-card" style={{ padding: '18px' }}>
                <div className="responsive-four-column" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr) auto', gap: '16px', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ClipboardList size={19} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {report.labName || copy('Lab Report')}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {report.sampleDate ? new Date(report.sampleDate).toLocaleDateString() : copy('No sample date')} · {pondCount} {copy(pondCount === 1 ? 'pond' : 'ponds')}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {(report.pondResults || []).slice(0, 8).map((row, rowIndex) => {
                        const relatedPond = accessiblePonds.find((pond) =>
                          pond.id === row.pondId ||
                          pond.pondName.toLowerCase() === (row.pondCode || '').toLowerCase()
                        );
                        const rowStyle = getSeverityStyle(relatedPond?.latestLabStatus?.status || report.summary?.overallStatus);
                        return (
                          <span
                            key={`${row.pondId || row.pondCode || rowIndex}-status`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 9px',
                              borderRadius: '999px',
                              background: rowStyle.bg,
                              color: rowStyle.color,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {row.pondCode || `${copy('Pond')} ${rowIndex + 1}`} · {rowStyle.label}
                          </span>
                        );
                      })}
                      {(report.pondResults || []).length > 8 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, padding: '5px 0' }}>
                          +{(report.pondResults || []).length - 8} {copy('more')}
                        </span>
                      )}
                      {(report.pondResults || []).length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>{copy('No pond rows')}</span>
                      )}
                    </div>
                    {report.insights?.ownerSummary && (
                      <div style={{ marginTop: '10px', color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.5 }}>
                        {report.insights.ownerSummary}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Report Type')}</div>
                    <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--text-primary)' }}>{getLabReportTypeLabel(report.reportType, copy)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Processing')}</div>
                    <div style={{ marginTop: 6, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{copy(report.processing?.status || report.status || 'pending')}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ borderRadius: 999, padding: '7px 12px', background: style.bg, color: style.color, fontSize: '0.74rem', fontWeight: 600 }}>
                      {style.label}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {(report.summary?.warningCount || 0) + (report.summary?.criticalCount || 0)} {copy('alert row(s)')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedLabReportId(isExpanded ? null : report.id)}
                      className="btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.76rem' }} disabled={savePending}
                    >
                      {copy(isExpanded ? 'Hide Details' : 'Details')}
                    </button>
                    {canManageLabReports && report.status !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => openLabReportReview(report)}
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: '0.76rem' }} disabled={savePending}
                      >
                        {copy('Review & Confirm')}
                      </button>
                    )}
                    {(report.entryMode || 'manual') === 'manual' && report.reportType === 'plankton' && (
                      <button type="button" className="btn-secondary"
                        disabled={savePending || (downloadingLabReportId !== null)}
                        onClick={() => handleDownloadLabReport(report)}
                        style={{ padding: '8px 12px', fontSize: '0.76rem' }}>
                        {copy(downloadingLabReportId === report.id ? 'Generating PDF...' : 'Download PDF')}
                      </button>
                    )}
                    {report.sourcePdfUrl && (
                      <a
                        href={report.sourcePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: 'var(--primary)',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 9px',
                          borderRadius: '9px',
                          background: 'var(--primary-dim)',
                        }}
                      >
                        <ExternalLink size={13} />
                        {copy('View PDF')}
                      </a>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    {(report.pondResults || []).map((row, rowIndex) => {
                      const water = row.waterQuality || {};
                      const micro = row.microbiology || {};
                      const plankton = row.plankton || {};
                      return (
                        <div key={`${row.pondId || row.pondCode || rowIndex}-${rowIndex}`} style={{ border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--bg-mid)', padding: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row.pondCode || `${copy('Pond')} ${rowIndex + 1}`}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600 }}>{getLabReportTypeLabel(report.reportType, copy)}</div>
                            </div>
                            {report.sourcePdfUrl && (
                              <a href={report.sourcePdfUrl} target="_blank" rel="noreferrer" style={{ borderRadius: '10px', padding: '7px 10px', background: 'var(--primary)', color: '#fff', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <ExternalLink size={12} />
                                PDF
                              </a>
                            )}
                          </div>
                          {report.reportType !== 'plankton' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {[
                                [labMeasurementLabel('tan', row.measurementUnits), formatLabValue(water.tan)],
                                [labMeasurementLabel('nh3', row.measurementUnits), formatLabValue(water.nh3)],
                                [labMeasurementLabel('tom', row.measurementUnits), formatLabValue(water.tom)],
                                [labMeasurementLabel('nh4', row.measurementUnits), formatLabValue(water.nh4)],
                                [labMeasurementLabel('no2', row.measurementUnits), formatLabValue(water.no2)],
                                [labMeasurementLabel('phosphate', row.measurementUnits), formatLabValue(water.phosphate)],
                                [labMeasurementLabel('alkalinityTotal', row.measurementUnits), formatLabValue(water.alkalinityTotal)],
                                [labMeasurementLabel('hardnessCa', row.measurementUnits), formatLabValue(water.hardnessCa)],
                                [labMeasurementLabel('hardnessMg', row.measurementUnits), formatLabValue(water.hardnessMg)],
                                [labMeasurementLabel('hardnessTotal', row.measurementUnits), formatLabValue(water.hardnessTotal)],
                                ['Vibrio', formatLabValue(micro.vibrioTotal)],
                              ].map(([label, value]) => (
                                <div key={label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                                  <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                                  <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, marginTop: '4px' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {(report.reportType === 'plankton' || report.reportType === 'combined') && (
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid var(--border)', padding: '10px' }}>
                              <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>Plankton</div>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, marginTop: '4px' }}>{formatLabValue(plankton.totalCellPerMl)} cells/ml</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, marginTop: '6px', lineHeight: 1.45 }}>
                                {copy('Green')} {formatLabValue(plankton.chlorophytaPercent, '%')} · {copy('Blue-green')} {formatLabValue(plankton.cyanophytaPercent, '%')} · {copy('Golden')} {formatLabValue(plankton.chrysophytaPercent, '%')}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {filteredLabReports.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '70px 24px' }}>
          <FileText size={44} color="var(--text-faint)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{copy('No lab reports yet')}</h3>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{copy('Add a manual report or upload a lab PDF for assisted extraction and review.')}</p>
        </div>
      )}
    </div>
  )}</>);
}
