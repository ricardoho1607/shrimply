"use client";
import {
  X
} from 'lucide-react';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'isStartCycleOpen'
  | 'copy'
  | 'pond'
  | 'setStartCycleOpen'
  | 'savePending'
  | 'handleStartCycle'
  | 'startCycleForm'
  | 'setStartCycleForm'> & { pond: NonNullable<PondDetailViewModel['pond']> };
export function StartPondCycleDialog({ isStartCycleOpen, copy, pond, setStartCycleOpen, savePending, handleStartCycle, startCycleForm, setStartCycleForm }: Props) {
  return (<>{isStartCycleOpen && (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-card responsive-modal feed-log-modal pond-detail-form-modal">
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header">
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600 }}>{copy.startNewCycle}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.startCycleDescription.replace('{{pond}}', pond.pondName).replace('{{area}}', String(pond.pondArea))}</p>
          </div>
          <button onClick={() => setStartCycleOpen(false)} className="feed-modal-close" aria-label={copy.cancel} disabled={savePending}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleStartCycle} className="responsive-modal-body feed-log-form pond-detail-form-modal-form pond-detail-form-grid"><fieldset disabled={savePending} style={{ display: 'contents' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.density}
            <input required type="number" value={startCycleForm.density} onChange={e => setStartCycleForm(prev => ({ ...prev, density: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.stockingDate}
            <input required type="date" value={startCycleForm.docStart} onChange={e => setStartCycleForm(prev => ({ ...prev, docStart: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.plValue}
            <input required type="number" step="0.1" value={startCycleForm.plValue} onChange={e => setStartCycleForm(prev => ({ ...prev, plValue: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.plSupplier}
            <input required value={startCycleForm.plSupplier} onChange={e => setStartCycleForm(prev => ({ ...prev, plSupplier: e.target.value }))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)' }} />
          </label>
          <div className="responsive-modal-footer feed-log-footer pond-detail-form-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" onClick={() => setStartCycleOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={savePending}>{copy.cancel}</button>
            <button type="submit" className="dashboard-action dashboard-action-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={savePending}>{copy.startCycle}</button>
          </div>
        </fieldset></form>
      </div>
    </div>
  )}</>);
}
