"use client";
import {
  FileText,
  Plus,
  X
} from 'lucide-react';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'isLabActionModalOpen'
  | 'copy'
  | 'setLabActionModalOpen'
  | 'savePending'
  | 'mineralPdfActionState'
  | 'openLabPdfUpload'
  | 'planktonPdfActionState'
  | 'openNewLabReport'>;
export function LabReportActionsDialog({ isLabActionModalOpen, copy, setLabActionModalOpen, savePending, mineralPdfActionState, openLabPdfUpload, planktonPdfActionState, openNewLabReport }: Props) {
  return (<>{isLabActionModalOpen && (
    <div className="responsive-modal-overlay water-lab-action-overlay">
      <div className="glass-card responsive-modal animate-fade-up water-lab-action-modal">
        <div className="responsive-modal-header water-lab-action-header">
          <div>
            <h2>{copy('Add Lab Report')}</h2>
            <p>{copy('Upload a PDF or enter results manually.')}</p>
          </div>
          <button onClick={() => setLabActionModalOpen(false)} className="water-modal-close" aria-label={copy('Close lab report options')} disabled={savePending}>
            <X size={18} />
          </button>
        </div>
        <div className="responsive-modal-body water-lab-action-body">
          <section>
            <div className="water-lab-action-label">{copy('Upload PDF')}</div>
            <div className="water-lab-action-grid">
              <button
                type="button"
                disabled={savePending || (mineralPdfActionState.disabled)}
                onClick={() => {
                  setLabActionModalOpen(false);
                  openLabPdfUpload('water_quality');
                }}
                className="water-lab-action-option"
                style={{ opacity: mineralPdfActionState.disabled ? 0.48 : 1, cursor: mineralPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
              >
                <FileText size={16} />
                <span>
                  <span>{copy('Mineral PDF')}</span>
                  <small>{mineralPdfActionState.message}</small>
                </span>
              </button>
              <button
                type="button"
                disabled={savePending || (planktonPdfActionState.disabled)}
                onClick={() => {
                  setLabActionModalOpen(false);
                  openLabPdfUpload('plankton');
                }}
                className="water-lab-action-option"
                style={{ opacity: planktonPdfActionState.disabled ? 0.48 : 1, cursor: planktonPdfActionState.disabled ? 'not-allowed' : 'pointer' }}
              >
                <FileText size={16} />
                <span>
                  <span>{copy('Plankton PDF')}</span>
                  <small>{planktonPdfActionState.message}</small>
                </span>
              </button>
            </div>
          </section>
          <section>
            <div className="water-lab-action-label">{copy('Manual Entry')}</div>
            <div className="water-lab-action-grid">
              <button
                type="button"
                onClick={() => {
                  setLabActionModalOpen(false);
                  openNewLabReport('water_quality');
                }}
                className="water-lab-action-option" disabled={savePending}
              >
                <Plus size={16} />
                <span>{copy('Manual Mineral')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLabActionModalOpen(false);
                  openNewLabReport('plankton');
                }}
                className="water-lab-action-option" disabled={savePending}
              >
                <Plus size={16} />
                <span>{copy('Manual Plankton')}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )}</>);
}
