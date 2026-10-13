"use client";
import {
  Activity,
  ArrowLeft,
  Plus,
  RotateCcw,
  Settings,
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import { getCycleStatus, isActiveCycle } from './PondDetailModel';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'copy'
  | 'pond'
  | 'metrics'
  | 'canEditPond'
  | 'canManagePond'
  | 'canManageCycles'
  | 'setStartCycleForm'
  | 'today'
  | 'setStartCycleOpen'
  | 'savePending'
  | 'canRecordPondData'
  | 'openBaselineModal'
  | 'recordMenuRef'
  | 'isRecordMenuOpen'
  | 'setRecordMenuOpen'
  | 'setEditingSamplingId'
  | 'setSamplingForm'
  | 'setSamplingModalOpen'
  | 'setMortalityForm'
  | 'setMortalityModalOpen'
  | 'canManageFeed'> & { pond: NonNullable<PondDetailViewModel['pond']> };
export function PondDetailToolbar({ copy, pond, metrics, canEditPond, canManagePond, canManageCycles, setStartCycleForm, today, setStartCycleOpen, savePending, canRecordPondData, openBaselineModal, recordMenuRef, isRecordMenuOpen, setRecordMenuOpen, setEditingSamplingId, setSamplingForm, setSamplingModalOpen, setMortalityForm, setMortalityModalOpen, canManageFeed }: Props) {
  return (<><div className="glass-card animate-fade-up pond-detail-toolbar">
    <div className="pond-detail-identity">
      <Link href="/dashboard/ponds" className="pond-detail-back" aria-label={copy.backToPonds}>
        <ArrowLeft size={17} />
      </Link>
      <div className="pond-detail-title">
        <div>
          {pond.pondName}
        </div>
        <div className="pond-detail-meta">
          <span>
            DOC {metrics?.doc ?? 0}
          </span>
          <span className={`pond-detail-status is-${getCycleStatus(pond)}`}>
            {getCycleStatus(pond) === 'ended' ? copy.ended : copy.active}
          </span>
          {pond.cycleStartMode === 'midcycle' && (
            <span className="pond-detail-baseline-badge">
              {copy.midCycleBaseline}
            </span>
          )}
        </div>
      </div>
    </div>
    {canEditPond && (
      <div className="pond-detail-actions">
        {!isActiveCycle(pond) && canManagePond && canManageCycles && (
          <button onClick={() => {
            setStartCycleForm(prev => ({ ...prev, docStart: today }));
            setStartCycleOpen(true);
          }} className="dashboard-action dashboard-action-primary" disabled={savePending}>
            <RotateCcw size={18} strokeWidth={2.5} />
            <span>{copy.startNewCycle}</span>
          </button>
        )}
        {pond.cycleStartMode === 'midcycle' && isActiveCycle(pond) && canRecordPondData && (
          <button onClick={openBaselineModal} className="pond-detail-icon-action" title={copy.editBaselineEstimates} aria-label={copy.editBaselineEstimates} disabled={savePending}>
            <Settings size={16} />
          </button>
        )}
        {canRecordPondData && <div className="pond-detail-record-menu" ref={recordMenuRef}>
          <button
            type="button"
            className="pond-detail-record-trigger"
            aria-expanded={isRecordMenuOpen}
            aria-haspopup="menu"
            disabled={savePending || (!isActiveCycle(pond))}
            onClick={() => setRecordMenuOpen((open) => !open)}
          >
            <Plus size={15} />
            <span>{copy.record}</span>
          </button>
          {isRecordMenuOpen && (
            <div className="pond-detail-record-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setRecordMenuOpen(false);
                  setEditingSamplingId(null);
                  setSamplingForm(prev => ({ ...prev, date: today }));
                  setSamplingModalOpen(true);
                }} disabled={savePending}
              >
                <Plus size={16} /><span><strong>{copy.sampling}</strong><small>{copy.samplingDescription}</small></span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setRecordMenuOpen(false);
                  setMortalityForm(prev => ({ ...prev, date: today }));
                  setMortalityModalOpen(true);
                }} disabled={savePending}
              >
                <Activity size={16} /><span><strong>{copy.mortality}</strong><small>{copy.mortalityDescription}</small></span>
              </button>
              {canManageFeed && <Link
                role="menuitem"
                href={`/dashboard/feed?action=new&pondId=${encodeURIComponent(pond.id)}`}
                onClick={() => setRecordMenuOpen(false)}
              >
                <ShoppingBag size={16} /><span><strong>{copy.feed}</strong><small>{copy.feedDescription}</small></span>
              </Link>}
            </div>
          )}
        </div>}
      </div>
    )}
  </div></>);
}
