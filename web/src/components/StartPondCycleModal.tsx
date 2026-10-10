"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  type StartablePondCycleRecord,
  type StartPondCycleFormValue,
} from '@/lib/startPondCycle';
import styles from './StartPondCycleModal.module.css';
import { formatTechnicianLabel, resolveCycleTechnicianId, type CompanyTechnician } from '../../../shared/cycleTechnicianAssignment';

const createInitialValue = (today: string, defaultCycleId?: string, nextCycleName?: string): StartPondCycleFormValue => ({
  density: '',
  docStart: today,
  plValue: '',
  plSupplier: '',
  cycleStartMode: 'new',
  baselineMbw: '',
  baselineEstimatedPopulation: '',
  baselineSurvivalRate: '',
  baselineCumulativeFeed: '',
  cycleTargetMode: defaultCycleId ? 'existing' : 'new',
  targetCycleId: defaultCycleId || '',
  newCycleName: nextCycleName || '',
  assignedTechnicianId: '',
});

export default function StartPondCycleModal({
  pond,
  today,
  openCycles = [],
  activeCycleId,
  technicians = [],
  allowTechnicianAssignment = false,
  saving,
  onClose,
  onSubmit,
}: {
  pond: StartablePondCycleRecord;
  today: string;
  openCycles?: { id: string; cycleName: string }[];
  activeCycleId?: string;
  technicians?: CompanyTechnician[];
  allowTechnicianAssignment?: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (value: StartPondCycleFormValue) => Promise<void>;
}) {
  const { t } = useLanguage();
  const defaultCycleId = activeCycleId || openCycles[0]?.id;
  const nextCycleName = `Cycle ${openCycles.length + 1}`;
  const [form, setForm] = useState<StartPondCycleFormValue>(() => createInitialValue(today, defaultCycleId, nextCycleName));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const update = <K extends keyof StartPondCycleFormValue>(
    key: K,
    value: StartPondCycleFormValue[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const description = t.startPondCycle.description
    .replace('{{pondName}}', pond.pondName)
    .replace('{{area}}', String(pond.pondArea ?? pond.area ?? 0));

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="start-pond-cycle-title">
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h2 id="start-pond-cycle-title">{t.startPondCycle.title}</h2>
            <p>{description}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label={t.startPondCycle.close}
          >
            <X size={20} />
          </button>
        </header>

        <div className={styles.scrollArea}>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit({ ...form, assignedTechnicianId: allowTechnicianAssignment ? resolveCycleTechnicianId(form.assignedTechnicianId, technicians) : undefined });
            }}
          >
            {openCycles.length > 0 && (
              <div className={styles.modeRow} aria-label={t.startPondCycle.targetCycle}>
                <button
                  type="button"
                  className={`${styles.modeButton} ${form.cycleTargetMode === 'existing' ? styles.modeButtonActive : ''}`}
                  onClick={() => update('cycleTargetMode', 'existing')}
                  aria-pressed={form.cycleTargetMode === 'existing'}
                >
                  {t.startPondCycle.addToActiveCycle}
                </button>
                <button
                  type="button"
                  className={`${styles.modeButton} ${form.cycleTargetMode === 'new' ? styles.modeButtonActive : ''}`}
                  onClick={() => update('cycleTargetMode', 'new')}
                  aria-pressed={form.cycleTargetMode === 'new'}
                >
                  {t.startPondCycle.createNewCycle}
                </button>
              </div>
            )}

            {form.cycleTargetMode === 'existing' && openCycles.length > 0 ? (
              <label className={styles.field}>
                {t.startPondCycle.targetCycle}
                <select
                  value={form.targetCycleId || defaultCycleId}
                  onChange={(event) => update('targetCycleId', event.target.value)}
                >
                  {openCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.cycleName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className={styles.field}>
                {t.startPondCycle.newCycleName}
                <input
                  required
                  value={form.newCycleName}
                  placeholder={nextCycleName}
                  onChange={(event) => update('newCycleName', event.target.value)}
                />
              </label>
            )}

            {allowTechnicianAssignment && (form.cycleTargetMode === 'new' || openCycles.length === 0) && (
              <label className={styles.field}>
                {t.enterprise.assignTechnician} {t.inventory.optional}
                <select value={resolveCycleTechnicianId(form.assignedTechnicianId, technicians) || ''} onChange={(event) => update('assignedTechnicianId', event.target.value)} disabled={saving}>
                  <option value="">{t.enterprise.unassigned}</option>
                  {technicians.map((technician) => <option key={technician.uid} value={technician.uid}>{formatTechnicianLabel(technician.name, technician.email)}</option>)}
                </select>
              </label>
            )}
            <div className={styles.modeRow} aria-label={t.startPondCycle.cycleQuestion}>
              {(['new', 'midcycle'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`${styles.modeButton} ${form.cycleStartMode === mode ? styles.modeButtonActive : ''}`}
                  onClick={() => update('cycleStartMode', mode)}
                  aria-pressed={form.cycleStartMode === mode}
                >
                  {mode === 'new' ? t.startPondCycle.newCycle : t.startPondCycle.existingCycle}
                </button>
              ))}
            </div>

            <label className={styles.field}>
              {t.startPondCycle.density}
              <input required min="0.01" step="0.01" inputMode="decimal" value={form.density} onChange={(event) => update('density', event.target.value)} />
            </label>
            <label className={styles.field}>
              {t.startPondCycle.stockingDate}
              <input required type="date" max={today} value={form.docStart} onChange={(event) => update('docStart', event.target.value)} />
            </label>
            <label className={styles.field}>
              {t.startPondCycle.plStage}
              <input required min="1" step="1" inputMode="numeric" placeholder={t.startPondCycle.plStagePlaceholder} value={form.plValue} onChange={(event) => update('plValue', event.target.value)} />
            </label>
            <label className={styles.field}>
              {t.startPondCycle.supplier}
              <input required placeholder={t.startPondCycle.supplierPlaceholder} value={form.plSupplier} onChange={(event) => update('plSupplier', event.target.value)} />
            </label>
            <p className={styles.hint}>{t.startPondCycle.plStageHint}</p>

            {form.cycleStartMode === 'midcycle' ? (
              <>
                <label className={styles.field}>
                  {t.startPondCycle.currentMbw}
                  <input required min="0.01" step="0.01" inputMode="decimal" value={form.baselineMbw} onChange={(event) => update('baselineMbw', event.target.value)} />
                </label>
                <label className={styles.field}>
                  {t.startPondCycle.currentPopulation}
                  <input min="0" step="1" inputMode="numeric" value={form.baselineEstimatedPopulation} onChange={(event) => update('baselineEstimatedPopulation', event.target.value)} />
                </label>
                <label className={styles.field}>
                  {t.startPondCycle.currentSr}
                  <input min="0" max="100" step="0.1" inputMode="decimal" value={form.baselineSurvivalRate} onChange={(event) => update('baselineSurvivalRate', event.target.value)} />
                </label>
                <label className={styles.field}>
                  {t.startPondCycle.feedUsed}
                  <input min="0" step="0.01" inputMode="decimal" value={form.baselineCumulativeFeed} onChange={(event) => update('baselineCumulativeFeed', event.target.value)} />
                </label>
                <p className={styles.hint}>{t.startPondCycle.feedHint}</p>
              </>
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
                {t.startPondCycle.cancel}
              </button>
              <button type="submit" className={styles.submitButton} disabled={saving}>
                {saving ? t.startPondCycle.starting : t.startPondCycle.submit}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
