"use client";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Loader2,
  X
} from 'lucide-react';
import {
  type MortalityObservationType
} from "../../../../../../shared/pondCalculations";
import { MortalityModalProps } from './PondDetailModel';

export function MortalityModal({ isOpen, onClose, onSubmit, form, setForm, isSubmitting, isEditing }: MortalityModalProps) {
  const { t } = useLanguage();
  const copy = t.pondDetail;

  if (!isOpen) return null;

  return (
    <div className="responsive-modal-overlay feed-log-overlay pond-detail-form-modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', padding: '24px'
    }}>
      <div className="glass-card animate-fade-up responsive-modal feed-log-modal pond-detail-form-modal" style={{ width: '100%', maxWidth: '520px', background: '#FFF', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.2)' }}>
        <div className="responsive-modal-header feed-log-header pond-detail-form-modal-header" style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? copy.editMortalityTitle : copy.dailyMortality}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.mortalityModalDescription}</p>
          </div>
          <button onClick={onClose} className="feed-modal-close" aria-label={copy.cancel} disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>

        <form className="responsive-modal-body feed-log-form pond-detail-form-modal-form" onSubmit={onSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}><fieldset disabled={isSubmitting} style={{ display: 'contents' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.recordType}
            <select value={form.observationType} onChange={(event) => setForm({ ...form, observationType: event.target.value as MortalityObservationType })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }}>
              <option value="estimated_total">{copy.estimatedTotalOption}</option>
              <option value="observed_recovered">{copy.observedRecoveredOption}</option>
              <option value="none_observed">{copy.noneObservedOption}</option>
            </select>
          </label>

          {form.observationType === 'estimated_total' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {copy.mortalityCount}
              <input required type="number" min="1" step="1" value={form.count} onChange={(event) => setForm({ ...form, count: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
            </label>
          ) : null}

          {form.observationType === 'observed_recovered' ? <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.dailyOperationsReports.siponShift}
              <select value={form.siponShift} onChange={(event) => setForm({ ...form, siponShift: event.target.value as 'morning' | 'evening' })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }}>
                <option value="morning">{t.dailyOperationsReports.morning}</option>
                <option value="evening">{t.dailyOperationsReports.evening}</option>
              </select>
            </label>
            <div className="responsive-form-grid feed-log-grid pond-detail-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.dailyOperationsReports.siphoned}
                <input required type="number" min="0" step="1" value={form.siphonedCount} onChange={(event) => setForm({ ...form, siphonedCount: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t.dailyOperationsReports.mortal}
                <input required type="number" min="0" step="1" value={form.mortalCount} onChange={(event) => setForm({ ...form, mortalCount: event.target.value })} placeholder="0" style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
              </label>
            </div>
          </> : null}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.mortalityDate}
            <input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600 }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {copy.notesOptional}
            <textarea maxLength={500} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={copy.notesPlaceholder} style={{ padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontSize: '1rem', fontWeight: 600, resize: 'vertical' }} />
          </label>

          <div className="feed-log-footer pond-detail-form-actions" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : isEditing ? copy.updateRecord : copy.saveMortality}
            </button>
          </div>
        </fieldset></form>
      </div>
    </div>
  );
}
