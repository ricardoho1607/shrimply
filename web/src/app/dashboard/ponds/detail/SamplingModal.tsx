"use client";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Loader2,
  X
} from 'lucide-react';
import React from 'react';
import { SamplingForm } from './PondDetailModel';

export function SamplingModal({ isOpen, onClose, onSubmit, form, setForm, isSubmitting, isEditing }: {
  isOpen: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void;
  form: SamplingForm; setForm: React.Dispatch<React.SetStateAction<SamplingForm>>; isSubmitting: boolean; isEditing: boolean;
}) {
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
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{isEditing ? copy.editSamplingTitle : copy.newSampling}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{copy.samplingModalDescription}</p>
          </div>
          <button
            onClick={onClose}
            className="feed-modal-close"
            aria-label={copy.cancel} disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        <form className="responsive-modal-body feed-log-form pond-detail-form-modal-form" onSubmit={onSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}><fieldset disabled={isSubmitting} style={{ display: 'contents' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.samplingDate}</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              style={{
                padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
              }}
            />
          </div>

          <div className="responsive-form-grid feed-log-grid pond-detail-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.mbwGrams}</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={form.mbw}
                onChange={e => setForm({ ...form, mbw: e.target.value })}
                style={{
                  padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.feedKg}</label>
              <input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={form.feed}
                onChange={e => setForm({ ...form, feed: e.target.value })}
                style={{
                  padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                  background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{copy.mortalityPieces}</label>
            <input
              type="number"
              placeholder="0"
              value={form.mortality}
              onChange={e => setForm({ ...form, mortality: e.target.value })}
              style={{
                padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--bg-mid)', outline: 'none', fontSize: '1rem', fontWeight: 600
              }}
            />
          </div>

          <div className="feed-log-footer pond-detail-form-actions" style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid var(--border)',
              background: 'transparent', fontWeight: 600, cursor: 'pointer'
            }} disabled={isSubmitting}>{copy.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, padding: '16px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : isEditing ? copy.updateRecord : copy.saveRecord}
            </button>
          </div>
        </fieldset></form>
      </div>
    </div>
  );
}
