"use client";
import {
  CheckCircle2,
  X
} from 'lucide-react';
import { LAB_WATER_FIELDS, labMeasurementLabel, validateLabRow } from "../../../../../functions/shared/labMeasurementContract";
import { getManualLabInputUnits } from "./labRowState";
import { LabEntryMode, LabPondResult, LabReportType } from './WaterQualityModel';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'isLabModalOpen'
  | 'copy'
  | 'editingLabReportId'
  | 'setLabModalOpen'
  | 'savePending'
  | 'handleCreateManualLabReport'
  | 'setLabEntryMode'
  | 'labEntryMode'
  | 'labForm'
  | 'setLabForm'
  | 'setLabPdfFile'
  | 'labPdfFile'
  | 'labSubmitting'
  | 'activePdfActionState'
  | 'handleUploadLabPdf'
  | 'selectedLabPondIds'
  | 'accessiblePonds'
  | 'toggleLabPond'
  | 'labRows'
  | 'labGridColumns'
  | 'setLabRows'
  | 'updateLabRow'>;
export function LabReportDialog({ isLabModalOpen, copy, editingLabReportId, setLabModalOpen, savePending, handleCreateManualLabReport, setLabEntryMode, labEntryMode, labForm, setLabForm, setLabPdfFile, labPdfFile, labSubmitting, activePdfActionState, handleUploadLabPdf, selectedLabPondIds, accessiblePonds, toggleLabPond, labRows, labGridColumns, setLabRows, updateLabRow }: Props) {
  return (<>{isLabModalOpen && (
    <div className="responsive-modal-overlay water-lab-form-overlay">
      <div className="glass-card responsive-modal animate-fade-up water-lab-form-modal">
        <div className="responsive-modal-header water-lab-form-header">
          <div>
            <h2>{copy(editingLabReportId ? 'Review Lab Report' : 'Add Lab Report')}</h2>
            <p>{copy('Enter results manually or upload a lab PDF, then review before confirmation.')}</p>
          </div>
          <button onClick={() => setLabModalOpen(false)} className="water-modal-close" aria-label={copy('Close lab report form')} disabled={savePending}>
            <X size={18} />
          </button>
        </div>

        <form className="responsive-modal-body water-lab-form-body" onSubmit={handleCreateManualLabReport}><fieldset disabled={savePending} style={{ display: 'contents' }}>
          <div className="water-lab-form-fields">
            <div className="water-lab-form-field">
              <label className="form-label">{copy('Entry Mode')}</label>
              <div className="water-entry-mode-tabs">
                {([
                  ['manual', 'Manual'],
                  ['pdf_upload', 'PDF'],
                ] as [LabEntryMode, string][]).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={savePending || (Boolean(editingLabReportId))}
                    onClick={() => setLabEntryMode(mode)}
                    className={labEntryMode === mode ? 'is-active' : ''}
                    style={{ cursor: editingLabReportId ? 'default' : 'pointer' }}
                  >
                    {copy(label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="water-lab-form-field">
              <label className="form-label">{copy('Report Type')}</label>
              <select value={labForm.reportType} onChange={e => setLabForm({ ...labForm, reportType: e.target.value as LabReportType })} className="form-input">
                {labForm.reportType === 'combined' && <option value="combined">{copy('Combined Lab Report')}</option>}
                <option value="water_quality">{copy('Mineral Quality')}</option>
                <option value="plankton">Plankton</option>
              </select>
            </div>
            <div className="water-lab-form-field">
              <label className="form-label">{copy('Sample Date')}</label>
              <input type="date" required value={labForm.sampleDate} onChange={e => setLabForm({ ...labForm, sampleDate: e.target.value })} className="form-input" />
            </div>
            <div className="water-lab-form-field">
              <label className="form-label">{copy('Lab Name')}</label>
              <input value={labForm.labName} onChange={e => setLabForm({ ...labForm, labName: e.target.value })} placeholder={copy('Farm kit / lab name')} className="form-input" />
            </div>
          </div>

          {labEntryMode === 'pdf_upload' && !editingLabReportId && (
            <div className="water-pdf-upload-row">
              <div className="water-pdf-upload-copy">
                <label className="form-label">{copy('Upload Lab PDF')}</label>
                <div className="water-pdf-file-control">
                  <input
                    className="water-pdf-file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={e => setLabPdfFile(e.target.files?.[0] || null)}
                  />
                  {labPdfFile && (
                    <span className="water-pdf-file-success" role="status" aria-label={`${labPdfFile.name} ${copy('selected')}`}>
                      <CheckCircle2 size={17} />
                    </span>
                  )}
                </div>
                <p>{copy('Creates a draft for review. The report is not confirmed automatically.')}</p>
              </div>
              <button
                type="button"
                disabled={savePending || (labSubmitting || !labPdfFile || activePdfActionState.disabled)}
                onClick={handleUploadLabPdf}
                className="water-lab-primary-button water-upload-extract-button"
              >
                {labSubmitting ? copy('Extracting...') : activePdfActionState.disabled ? activePdfActionState.message : copy('Upload & Extract')}
              </button>
            </div>
          )}

          <section className="water-included-ponds">
            <div className="water-included-ponds-heading">
              <div>
                <h3>{copy('Included Ponds')}</h3>
                <p>{copy('Select every pond covered by this lab report.')}</p>
              </div>
              <span>{selectedLabPondIds.length} {copy('selected')}</span>
            </div>
            <div className="water-pond-selector-grid">
              {accessiblePonds.map(pond => {
                const selected = selectedLabPondIds.includes(pond.id);
                return (
                  <button
                    key={pond.id}
                    type="button"
                    onClick={() => toggleLabPond(pond)}
                    className={selected ? 'is-selected' : ''} disabled={savePending}
                  >
                    <span>{pond.pondName}</span>
                    {selected && <CheckCircle2 size={16} />}
                  </button>
                );
              })}
            </div>
          </section>

          {labRows.length > 0 && (
            <div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: labForm.reportType === 'plankton' ? '2200px' : labForm.reportType === 'combined' ? '2800px' : '1280px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-mid)' }}>
                      {['Pond', ...labGridColumns.map(column => column.label)].map(label => (
                        <th key={label} style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{copy(label)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {labRows.map(row => (
                      <tr key={row.pondId}>
                        <td style={{ padding: '8px', fontWeight: 600, minWidth: 90, textAlign: 'center', verticalAlign: 'middle' }}>{row.pondCode}</td>
                        {labGridColumns.map(({ label, path, inputType = 'number' }) => {
                          const field = path[0] === 'waterQuality' ? LAB_WATER_FIELDS[path[1]] : null;
                          const units = row.measurementUnits?.[path[1]];
                          const inputUnit = field
                            ? units?.unit || (labEntryMode === 'manual' ? field.unit : '')
                            : path[0] === 'transparencyCm' ? 'cm'
                              : path[1]?.endsWith('Percent') ? '%'
                                : path[1]?.endsWith('CellPerMl') ? 'cells/mL' : '';
                          const setUnits = (unit: string, basis: string) => setLabRows(previous => previous.map(item => item.pondId !== row.pondId ? item : { ...item, measurementUnits: { ...item.measurementUnits, [path[1]]: { unit, basis } } }));
                          const sectionValue = row[path[0] as keyof LabPondResult];
                          const value = path.length === 1
                            ? (sectionValue as string | undefined)
                            : (typeof sectionValue === 'object' && sectionValue ? (sectionValue as Record<string, string | undefined>)[path[1]] : undefined);
                          return (
                            <td key={path.join('.')} style={{ padding: '6px', borderTop: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle' }}>
                              <div className="water-lab-value-input" style={{ width: inputType === 'text' ? '170px' : inputUnit === 'cells/mL' ? '112px' : '86px', margin: '0 auto' }}>
                                <input
                                  type={inputType}
                                  aria-label={`${row.pondCode} ${label}${inputUnit ? ` (${inputUnit})` : ''}`}
                                  title={field ? labMeasurementLabel(path[1], row.measurementUnits) : label}
                                  min={inputType === 'number' ? 0 : undefined}
                                  max={field?.max ?? (path[1]?.endsWith('Percent') ? 100 : undefined)}
                                  step={inputType === 'number' ? 'any' : undefined}
                                  value={value || ''}
                                  onChange={e => updateLabRow(row.pondId, path, e.target.value)}
                                />
                                {inputUnit && <span aria-hidden="true">{inputUnit}</span>}
                              </div>
                              {field && labEntryMode === 'pdf_upload' && <div style={{ display: 'grid', gap: 4, marginTop: 6, width: inputType === 'text' ? '170px' : inputUnit === 'cells/mL' ? '112px' : '86px', margin: '6px auto 0' }}>
                                <select aria-label={`${row.pondCode} ${field.label} unit`} value={units?.unit || ''} onChange={e => setUnits(e.target.value, units?.basis || '')}>
                                  <option value="">Select unit</option>
                                  {[...new Set([field.unit, ...(field.unit === 'mg/L' ? ['µg/L', 'ppm'] : []), ...(units?.unit ? [units.unit] : [])])].map(unit => <option key={unit}>{unit}</option>)}
                                </select>
                                <select aria-label={`${row.pondCode} ${field.label} basis`} value={units?.basis || ''} onChange={e => setUnits(units?.unit || field.unit, e.target.value)}>
                                  <option value="">Select basis</option>
                                  {[...new Set([...field.bases, ...(units?.basis ? [units.basis] : [])])].map(basis => <option key={basis} value={basis}>{`as ${basis}`}</option>)}
                                </select>
                              </div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="water-lab-form-footer">
            <button type="button" onClick={() => setLabModalOpen(false)} className="water-lab-cancel-button" disabled={savePending}>{copy('Cancel')}</button>
            <button type="submit" disabled={savePending || (labSubmitting || selectedLabPondIds.length === 0 || labRows.some(row => validateLabRow(labEntryMode === 'manual' ? { ...row, measurementUnits: getManualLabInputUnits(row.measurementUnits) } : row).length > 0))} className="water-lab-primary-button water-confirm-lab-button">
              {copy(labSubmitting ? 'Saving...' : 'Confirm Lab Report')}
            </button>
          </div>
        </fieldset></form>
      </div>
    </div>
  )}</>);
}
