"use client";
import {
  X
} from 'lucide-react';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'isEndCycleOpen'
  | 'copy'
  | 'pond'
  | 'setEndCycleOpen'
  | 'savePending'
  | 'endCycleForm'
  | 'setEndCycleForm'
  | 'handleEndCycle'> & { pond: NonNullable<PondDetailViewModel['pond']> };
export function EndPondCycleDialog({ isEndCycleOpen, copy, pond, setEndCycleOpen, savePending, endCycleForm, setEndCycleForm, handleEndCycle }: Props) {
  return (<>{isEndCycleOpen && (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.endCycle}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.historyRemains.replace('{{pond}}', pond.pondName)}</p>
          </div>
          <button onClick={() => setEndCycleOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
            <X size={20} />
          </button>
        </div>
        <div className="responsive-modal-body feed-log-form pond-detail-form-modal-form">
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.endDate}
            <input type="date" value={endCycleForm.cycleEndedAt} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndedAt: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.reason}
            <select value={endCycleForm.cycleEndReason} onChange={e => setEndCycleForm(prev => ({ ...prev, cycleEndReason: e.target.value as typeof endCycleForm.cycleEndReason }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }}>
              <option value="harvested">{copy.harvested}</option>
              <option value="disease">{copy.disease}</option>
              <option value="reset">{copy.reset}</option>
              <option value="other">{copy.other}</option>
            </select>
          </label>
          <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions">
            <button type="button" onClick={() => setEndCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
            <button type="button" onClick={handleEndCycle} className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.endCycle}</button>
          </div>
        </div>
      </div>
    </div>
  )}</>);
}
