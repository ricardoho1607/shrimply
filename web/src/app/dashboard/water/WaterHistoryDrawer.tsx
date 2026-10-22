"use client";
import {
  Info,
  X
} from 'lucide-react';
import { formatConditionLabel, hasSavedValue, hasWaterQualityHistory } from './WaterQualityModel';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'selectedPondForHistory'
  | 'copy'
  | 'setSelectedPondForHistory'
  | 'savePending'
  | 't'>;
export function WaterHistoryDrawer({ selectedPondForHistory, copy, setSelectedPondForHistory, savePending, t }: Props) {
  return (<>{selectedPondForHistory && (
    <div className="responsive-side-drawer-overlay water-history-overlay" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}>
      <div className="drawer-content responsive-side-drawer water-history-drawer animate-slide-left">
        <div className="responsive-modal-header" style={{ padding: '26px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, fontFamily: "var(--jakarta)", color: 'var(--text-primary)' }}>
              {selectedPondForHistory.pondName} {copy('Water Quality History')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
              {copy('Historical environmental logs and parameter readings')}
            </p>
          </div>
          <button onClick={() => setSelectedPondForHistory(null)} className="icon-btn-modern" disabled={savePending}>
            <X size={20} />
          </button>
        </div>

        <div className="responsive-modal-body water-history-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selectedPondForHistory.samplings
              .filter(hasWaterQualityHistory)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((log, i) => (
                <div key={i} className="glass-card" style={{ padding: '18px', background: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>{new Date(log.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <div style={{ fontSize: '0.6rem', padding: '4px 10px', borderRadius: '100px', background: 'var(--primary-dim)', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copy('Record Entry')}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('pH Levels')}</span>
                      <span className="wq-val-small">{log.phMorning || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.phEvening || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Dissolved Oxygen')}</span>
                      <span className="wq-val-small">{log.doMorning || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>AM</span> / {log.doEvening || 'N/A'} <span style={{ color: 'var(--text-faint)' }}>PM</span></span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Temperature')}</span>
                      <span className="wq-val-small">{hasSavedValue(log.temperatureMorning) || hasSavedValue(log.temperatureEvening) ? `${log.temperatureMorning || 'N/A'} AM / ${log.temperatureEvening || 'N/A'} PM °C` : hasSavedValue(log.temperature) ? `${log.temperature} °C` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Transparency')}</span>
                      <span className="wq-val-small">{hasSavedValue(log.transparencyMorning) || hasSavedValue(log.transparencyEvening) ? `${log.transparencyMorning || 'N/A'} AM / ${log.transparencyEvening || 'N/A'} PM CM` : hasSavedValue(log.transparency) ? `${log.transparency} CM` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Salinity')}</span>
                      <span className="wq-val-small">{hasSavedValue(log.salinity) ? `${log.salinity} PPT` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{t.dailyOperationsReports.waterAppearance}</span>
                      <span className="wq-val-small">{hasSavedValue(log.waterAppearanceMorning) || hasSavedValue(log.waterAppearanceEvening) ? `${log.waterAppearanceMorning || 'N/A'} AM / ${log.waterAppearanceEvening || 'N/A'} PM` : hasSavedValue(log.waterAppearance) ? log.waterAppearance : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{t.dailyOperationsReports.waterDepth}</span>
                      <span className="wq-val-small">{hasSavedValue(log.waterDepthCmMorning) || hasSavedValue(log.waterDepthCmEvening) ? `${log.waterDepthCmMorning || 'N/A'} AM / ${log.waterDepthCmEvening || 'N/A'} PM CM` : hasSavedValue(log.waterDepthCm) ? `${log.waterDepthCm} CM` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{t.dailyOperationsReports.alkalinity}</span>
                      <span className="wq-val-small">{hasSavedValue(log.alkalinity) ? `${log.alkalinity} PPM` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{log.ammoniaBasis ? copy('Ammonia') : copy('Ammonia (TAN)')}</span>
                      <span className="wq-val-small">{hasSavedValue(log.ammonia) ? `${log.ammonia} mg/L ${log.ammoniaBasis || ''}` : 'N/A'}</span>
                    </div>
                    {hasSavedValue(log.nitriteMgL) && <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Nitrite')}</span>
                      <span className="wq-val-small">{log.nitriteMgL} mg/L {log.nitriteBasis || ''}</span>
                    </div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Weather')}</span>
                      <span className="wq-val-small">{copy(formatConditionLabel(log.weatherEvent))}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Water Exchange')}</span>
                      <span className="wq-val-small">{hasSavedValue(log.waterExchangePercent) ? `${log.waterExchangePercent}%` : 'N/A'}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Sludge Load')}</span>
                      <span className="wq-val-small">{copy(formatConditionLabel(log.sludgeLoad))}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Surface Scum')}</span>
                      <span className="wq-val-small">{log.surfaceScum === null || log.surfaceScum === undefined ? 'N/A' : copy(log.surfaceScum ? 'Present' : 'Not observed')}</span>
                    </div>
                    <div className="wq-metric-small">
                      <span className="wq-label-small">{copy('Shrimp Behavior')}</span>
                      <span className="wq-val-small">{copy(formatConditionLabel(log.shrimpBehaviour))}</span>
                    </div>
                  </div>
                  {log.operationalNotes && <p style={{ margin: '14px 0 0', color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{log.operationalNotes}</p>}
                </div>
              ))
            }
            {!selectedPondForHistory.samplings.some(hasWaterQualityHistory) && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Info size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontWeight: 600 }}>{copy('No environmental records found for this pond.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}</>);
}
