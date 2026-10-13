"use client";
import {
  X
} from 'lucide-react';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'isBaselineModalOpen'
  | 'copy'
  | 'setBaselineModalOpen'
  | 'savePending'
  | 'handleUpdateBaseline'
  | 'baselineForm'
  | 'setBaselineForm'>;
export function PondBaselineDialog({ isBaselineModalOpen, copy, setBaselineModalOpen, savePending, handleUpdateBaseline, baselineForm, setBaselineForm }: Props) {
  return (<>{isBaselineModalOpen && (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.editBaseline}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.baselineDescription}</p>
          </div>
          <button onClick={() => setBaselineModalOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleUpdateBaseline} className="responsive-modal-body feed-log-form pond-detail-form-modal-form pond-detail-form-grid"><fieldset disabled={savePending} style={{ display: 'contents' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.baselineDate}
            <input required type="date" value={baselineForm.baselineDate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineDate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.currentMbw}
            <input required type="number" step="0.01" value={baselineForm.baselineMbw} onChange={e => setBaselineForm(prev => ({ ...prev, baselineMbw: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.currentPopulation}
            <input type="number" value={baselineForm.baselineEstimatedPopulation} onChange={e => setBaselineForm(prev => ({ ...prev, baselineEstimatedPopulation: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.currentSr}
            <input type="number" step="0.1" value={baselineForm.baselineSurvivalRate} onChange={e => setBaselineForm(prev => ({ ...prev, baselineSurvivalRate: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.feedUsedSoFar}
            <input type="number" step="0.01" value={baselineForm.baselineCumulativeFeed} onChange={e => setBaselineForm(prev => ({ ...prev, baselineCumulativeFeed: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" onClick={() => setBaselineModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
            <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.saveBaseline}</button>
          </div>
        </fieldset></form>
      </div>
    </div>
  )}</>);
}
