"use client";
import Link from "next/link";
import { sopMeasurementLabel } from "../../../../../shared/sop/editor";
import { useLanguage } from "@/contexts/LanguageContext";
import { ADAPTIVE_SOPS_ENABLED } from "@/lib/sopFeature";
import { SopDateTimeInput } from "@/components/SopDateTimeInput";
import { SOP_FIELDS } from "../../../../../shared/sop/registry";
import { sopText } from "../../../../../shared/sop/uiCopy";
import { SopObservationTimes } from "@/components/SopObservationTimes";
import {
  X
} from 'lucide-react';

import type { WaterQualityViewModel } from './useWaterQuality';
type Props = Pick<WaterQualityViewModel,
  'sopTask' | 'sopTaskError'
  | 'isModalOpen'
  | 'sopTimes'
  | 'setSopTimes'
  | 'copy'
  | 'setModalOpen'
  | 'savePending'
  | 'handleAddWQ'
  | 'formData'
  | 'selectWaterRecord'
  | 'accessiblePonds'
  | 'setFormData'
  | 't'
  | 'waterSubmitting'>;
export function WaterReadingDialog({ sopTask, sopTaskError, sopTimes, setSopTimes, isModalOpen, copy, setModalOpen, savePending, handleAddWQ, formData, selectWaterRecord, accessiblePonds, setFormData, t, waterSubmitting }: Props) {
  const { currentLanguage } = useLanguage();
  const ui = (text: string) => sopText(text, currentLanguage);
  const requestedField = SOP_FIELDS.find(field => field.key === `water.${sopTask?.field}`);
  const numericTask = !!sopTask && !['weatherEvent', 'sludgeLoad', 'surfaceScum', 'shrimpBehaviour'].includes(sopTask.field);
  return (<>{isModalOpen && (
    <div className="responsive-modal-overlay water-log-overlay">
      <div className="glass-card responsive-modal animate-fade-up water-log-modal">
        <div className="responsive-modal-header water-log-header">
          <div>
            <h2>{copy('Log Parameters')}</h2>
            <p>{ui('Enter the readings you measured.')}</p>
          </div>
          <button onClick={() => setModalOpen(false)} className="water-modal-close" aria-label={copy('Close parameter log')} disabled={savePending}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAddWQ} className="water-log-form"><fieldset disabled={savePending} style={{ display: 'contents' }}>
          <div className="responsive-modal-body water-log-form-grid">
            {sopTask && <div style={{gridColumn: '1 / -1'}}>
              <strong>{sopTask.pondName} · {sopTask.title}</strong>
              <p>{ui('Reading needed')}: {sopMeasurementLabel(`water.${sopTask.field}`, currentLanguage)} · {sopTask.date}</p>
              <p>{ui('Reading window')}: {new Date(sopTask.windowStart).toLocaleString(currentLanguage, {timeZone: sopTask.timeZone})} – {new Date(sopTask.dueAt).toLocaleString(currentLanguage, {timeZone: sopTask.timeZone})} · {sopTask.timeZone}</p>
              <Link href={`/dashboard/todo?taskId=${encodeURIComponent(sopTask.taskId)}`}>{ui('Back to task')}</Link>
            </div>}
            {sopTaskError && <p role="alert" style={{gridColumn:'1 / -1'}}>{copy(sopTaskError)}</p>}
            {sopTask && <div style={{gridColumn:'1 / -1', display:'grid', gap:12}}>
              {numericTask && <label className="form-label">{sopMeasurementLabel(`water.${sopTask.field}`, currentLanguage)} {requestedField?.unit}
                <input type="number" step="any" required className="form-input" value={String(formData[sopTask.field as keyof typeof formData] ?? '')}
                  onChange={e => setFormData({...formData, [sopTask.field]: e.target.value})} />
              </label>}
              {['ammonia', 'nitriteMgL'].includes(sopTask.field) && <label className="form-label">{ui('Check the test-kit label')}
                <select className="form-input" value={sopTask.field === 'ammonia' ? formData.ammoniaBasis : formData.nitriteBasis}
                  onChange={e => setFormData({...formData, [sopTask.field === 'ammonia' ? 'ammoniaBasis' : 'nitriteBasis']: e.target.value})}>
                  <option value="">{ui('Check the test-kit label')}</option>
                  {(sopTask.field === 'ammonia' ? ['TAN-N','NH3-N','NH3'] : ['NO2-N','NO2']).map(unit => <option key={unit}>{unit}</option>)}
                </select>
              </label>}
              <SopDateTimeInput label={ui('When was this reading taken?')} language={currentLanguage} timeZone={sopTask.timeZone}
                value={sopTimes[sopTask.field] || ''} onChange={value => setSopTimes({...sopTimes, [sopTask.field]: value})} />
            </div>}
            <details open={!numericTask} style={{gridColumn:'1 / -1'}}>
              <summary hidden={!sopTask}>{ui('Other readings (optional)')}</summary>
              <div className="water-log-form-grid">
            {ADAPTIVE_SOPS_ENABLED && <SopObservationTimes key={`${formData.pondId}:${formData.date}`} values={formData} times={sopTimes} onChange={setSopTimes} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
              <label className="form-label">{copy('Target Pond')}</label>
              <select
                required
                aria-label={copy('Target Pond')}
                disabled={!!sopTask}
                value={formData.pondId}
                onChange={e => selectWaterRecord(e.target.value, formData.date)}
                className="form-input"
              >
                <option value="">{copy('Select a pond asset...')}</option>
                {accessiblePonds.map(p => <option key={p.id} value={p.id}>{p.pondName}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Date')}</label>
              <input type="date" required aria-label={copy('Date')} disabled={!!sopTask} value={formData.date} onChange={e => selectWaterRecord(formData.pondId, e.target.value)} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Salinity (PPT)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.salinity} onChange={e => setFormData({ ...formData, salinity: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Temperature (Morning) (°C)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.temperatureMorning} onChange={e => setFormData({ ...formData, temperatureMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Temperature (Evening) (°C)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.temperatureEvening} onChange={e => setFormData({ ...formData, temperatureEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('pH (Morning)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.phMorning} onChange={e => setFormData({ ...formData, phMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('pH (Evening)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.phEvening} onChange={e => setFormData({ ...formData, phEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('DO (Morning) mg/L')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.doMorning} onChange={e => setFormData({ ...formData, doMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('DO (Evening) mg/L')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.doEvening} onChange={e => setFormData({ ...formData, doEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Transparency (Morning) (CM)')}</label>
              <input type="number" placeholder="N/A" value={formData.transparencyMorning} onChange={e => setFormData({ ...formData, transparencyMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Transparency (Evening) (CM)')}</label>
              <input type="number" placeholder="N/A" value={formData.transparencyEvening} onChange={e => setFormData({ ...formData, transparencyEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Water Appearance (Morning)')}</label>
              <input type="text" maxLength={40} placeholder="N/A" value={formData.waterAppearanceMorning} onChange={e => setFormData({ ...formData, waterAppearanceMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Water Appearance (Evening)')}</label>
              <input type="text" maxLength={40} placeholder="N/A" value={formData.waterAppearanceEvening} onChange={e => setFormData({ ...formData, waterAppearanceEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Water Depth (Morning) (CM)')}</label>
              <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.waterDepthCmMorning} onChange={e => setFormData({ ...formData, waterDepthCmMorning: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Water Depth (Evening) (CM)')}</label>
              <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.waterDepthCmEvening} onChange={e => setFormData({ ...formData, waterDepthCmEvening: e.target.value })} className="form-input" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
              <label className="form-label">{t.dailyOperationsReports.alkalinity} (PPM)</label>
              <input type="number" min="0" step="0.1" placeholder="N/A" value={formData.alkalinity} onChange={e => setFormData({ ...formData, alkalinity: e.target.value })} className="form-input" />
            </div>

            <div className="water-optional-heading">
              <strong>{copy('Optional Pond Conditions')}</strong>
              <span>{copy('Add only what was directly observed today.')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{ADAPTIVE_SOPS_ENABLED ? copy('Ammonia (mg/L)') : copy('Ammonia (TAN) (mg/L)')}</label>
              <input type="number" min="0" step="0.01" placeholder="N/A" value={formData.ammonia} onChange={e => setFormData({ ...formData, ammonia: e.target.value })} className="form-input" />
            </div>

            {ADAPTIVE_SOPS_ENABLED && <>
              <label className="form-label">{ui('Ammonia test-kit unit')}
                <select className="form-input" value={formData.ammoniaBasis} onChange={e => setFormData({...formData, ammoniaBasis: e.target.value})}>
                  <option value="">{ui('Check the test-kit label')}</option>
                  <option value="TAN-N">TAN-N</option><option value="NH3-N">NH3-N</option><option value="NH3">NH3</option>
                </select>
              </label>
              <label className="form-label">{ui('Nitrite (mg/L)')}
                <input type="number" min="0" step="any" className="form-input" value={formData.nitriteMgL} onChange={e => setFormData({...formData, nitriteMgL: e.target.value})} />
              </label>
              <label className="form-label">{ui('Nitrite test-kit unit')}
                <select className="form-input" value={formData.nitriteBasis} onChange={e => setFormData({...formData, nitriteBasis: e.target.value})}>
                  <option value="">{ui('Check the test-kit label')}</option>
                  <option value="NO2-N">NO2-N</option><option value="NO2">NO2</option>
                </select>
              </label>
            </>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label className="form-label">{copy('Water Exchange (%)')}</label>
              <input type="number" step="0.1" placeholder="N/A" value={formData.waterExchangePercent} onChange={e => setFormData({ ...formData, waterExchangePercent: e.target.value })} className="form-input" />
            </div>

            <div className="water-condition-group">
              <label className="form-label">{copy('Weather Event')}</label>
              <div className="water-condition-options">
                {([['rain', 'Rain'], ['heavy_rain', 'Heavy Rain'], ['sudden_cloud', 'Sudden Cloud']] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`water-condition-option ${formData.weatherEvent === value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, weatherEvent: prev.weatherEvent === value ? null : value }))} disabled={savePending}
                  >{copy(label)}</button>
                ))}
              </div>
            </div>

            <div className="water-condition-group">
              <label className="form-label">{copy('Sludge Load')}</label>
              <div className="water-condition-options">
                {([['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`water-condition-option ${formData.sludgeLoad === value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, sludgeLoad: prev.sludgeLoad === value ? null : value }))} disabled={savePending}
                  >{copy(label)}</button>
                ))}
              </div>
            </div>

            <div className="water-condition-group">
              <label className="form-label">{copy('Surface Scum')}</label>
              <div className="water-condition-options">
                {([[true, 'Observed'], [false, 'Not observed']] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={String(value)}
                    className={`water-condition-option ${formData.surfaceScum === value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, surfaceScum: prev.surfaceScum === value ? null : value }))} disabled={savePending}
                  >{copy(label)}</button>
                ))}
              </div>
            </div>

            <div className="water-condition-group">
              <label className="form-label">{copy('Shrimp Behaviour')}</label>
              <div className="water-condition-options">
                {([['normal', 'Normal'], ['abnormal', 'Abnormal']] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={`water-condition-option ${formData.shrimpBehaviour === value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, shrimpBehaviour: prev.shrimpBehaviour === value ? null : value }))} disabled={savePending}
                  >{copy(label)}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', gridColumn: 'span 2' }}>
              <label className="form-label">{copy('Operational Notes')}</label>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder={copy('Aeration, rain impact, water exchange, treatments, or other observed work')}
                value={formData.operationalNotes}
                onChange={e => setFormData({ ...formData, operationalNotes: e.target.value })}
                className="form-input"
              />
            </div>
              </div>
            </details>
          </div>

          <div className="responsive-modal-footer water-log-footer">
            <button type="button" onClick={() => setModalOpen(false)} style={{
              flex: 1, borderRadius: '10px', border: '1px solid var(--border)',
              background: 'transparent', fontWeight: 600, cursor: 'pointer'
            }} disabled={savePending}>{copy('Cancel')}</button>
            <button type="submit" disabled={savePending || (!formData.pondId || waterSubmitting)} className="water-save-log-button">{copy('Save Log Entry')}</button>
          </div>
        </fieldset></form>
      </div>
    </div>
  )}</>);
}
