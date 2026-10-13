"use client";
import {
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import {
  calculateSamplingAdg
} from "../../../../../../shared/pondCalculations";
import { GrowthChart } from './GrowthChart';
import { isActiveCycle } from './PondDetailModel';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'copy'
  | 'metrics'
  | 'savePending'
  | 'canRecordPondData'
  | 'pond'
  | 'company'
  | 'setEditingSamplingId'
  | 'setSamplingForm'
  | 'setSamplingModalOpen'
  | 'handleDeleteSampling'
  | 'isMortalityHistoryOpen'
  | 'setMortalityHistoryOpen'
  | 'currentCycleMortalityRecords'
  | 'setEditingMortalityId'
  | 'setMortalityForm'
  | 'today'
  | 'setMortalityModalOpen'
  | 'getSamplingMbwAtDate'
  | 'handleDeleteMortality'> & { pond: NonNullable<PondDetailViewModel['pond']> };
export function PondHistoryPanels({ copy, metrics, savePending, canRecordPondData, pond, company, setEditingSamplingId, setSamplingForm, setSamplingModalOpen, handleDeleteSampling, isMortalityHistoryOpen, setMortalityHistoryOpen, currentCycleMortalityRecords, setEditingMortalityId, setMortalityForm, today, setMortalityModalOpen, getSamplingMbwAtDate, handleDeleteMortality }: Props) {
  return (<><div className="animate-fade-up animate-delay-2 pond-detail-main-column">

    {/* Growth Chart Section */}
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, marginBottom: '4px' }}>{copy.growthCurve}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{copy.growthCurveDescription}</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
          background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '0.75rem',
          fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--border)'
        }}>
          <LineChartIcon size={16} />
          {copy.liveTracking}
        </div>
      </div>
      <GrowthChart data={metrics?.chartData || []} emptyMessage={copy.insufficientSampling} />
    </div>

    {/* Sampling History Table */}
    <div className="glass-card pond-detail-sampling-history" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600 }}>{copy.samplingHistory}</h3>
        <button style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer' }} disabled={savePending}>{copy.viewAuditLog}</button>
      </div>
      <div className="pond-detail-sampling-table-wrap">
        <table className="pond-detail-sampling-table">
          <thead>
            <tr style={{ textAlign: 'left', background: 'var(--bg-mid)' }}>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.date}</th>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MBW (g)</th>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ADG</th>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.size}</th>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.feedKg}</th>
              <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.mortality}</th>
              {canRecordPondData && isActiveCycle(pond) && <th style={{ height: '44px', padding: '0 24px' }}>{copy.action}</th>}
            </tr>
          </thead>
          <tbody>
            {(pond.samplings || [])
              .filter((s) => Number(s.mbw) > 0 || Number(s.mortality) > 0 || Number(s.feed) > 0)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8)
              .map((s, i) => {
                const samplingAdg = calculateSamplingAdg(pond, s, company?.timeZone);

                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }} className="hover-row">
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>
                      {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>{s.mbw || '-'}g</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{samplingAdg === null ? '—' : samplingAdg.toFixed(2)}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.mbw > 0 ? Math.round(1000 / s.mbw) : '-'}</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>{s.feed || '-'} kg</td>
                    <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: s.mortality > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {s.mortality > 0 ? `+${s.mortality}` : '0'}
                    </td>
                    {canRecordPondData && isActiveCycle(pond) && (
                      <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button type="button" aria-label={copy.editSampling} onClick={() => {
                            setEditingSamplingId(s.id);
                            setSamplingForm({ date: s.date, mbw: String(s.mbw || ''), feed: String(s.feed || ''), mortality: String(s.mortality || 0) });
                            setSamplingModalOpen(true);
                          }} style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: 'var(--primary)' }} disabled={savePending}><Pencil size={14} /></button>
                          <button type="button" aria-label={copy.deleteSampling} onClick={() => handleDeleteSampling(s.id)} style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#ef4444' }} disabled={savePending}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>

    {/* Mortality History Table */}
    <div className="glass-card pond-detail-mortality-history" style={{ padding: '0', overflow: 'hidden', marginTop: '20px' }}>
      <div
        style={{
          padding: '18px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isMortalityHistoryOpen ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setMortalityHistoryOpen((prev) => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '18px', lineHeight: '26px', fontWeight: 600, margin: 0 }}>{copy.mortalityHistory}</h3>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'var(--bg-mid)',
            color: 'var(--primary)',
            padding: '2px 8px',
            borderRadius: '999px',
            border: '1px solid var(--border)',
          }}>
            {currentCycleMortalityRecords.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {canRecordPondData && isActiveCycle(pond) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingMortalityId(null);
                setMortalityForm({
                  date: today,
                  observationType: 'observed_recovered',
                  count: '',
                  siponShift: 'morning',
                  siphonedCount: '',
                  mortalCount: '',
                  notes: '',
                });
                setMortalityModalOpen(true);
              }}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'var(--primary-dim)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }} disabled={savePending}
            >
              <Plus size={14} />
              <span>{copy.recordMortality}</span>
            </button>
          )}
          <button
            type="button"
            aria-label={isMortalityHistoryOpen ? copy.collapseMortalityHistory : copy.expandMortalityHistory}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }} disabled={savePending}
          >
            {isMortalityHistoryOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isMortalityHistoryOpen && (
        currentCycleMortalityRecords.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 500 }}>
            {copy.noMortalityRecords}
          </div>
        ) : (
          <div className="pond-detail-sampling-table-wrap">
            <table className="pond-detail-sampling-table">
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--bg-mid)' }}>
                  <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.date}</th>
                  <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.recordType}</th>
                  <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.countPieces}</th>
                  <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.estimatedWeight}</th>
                  <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.notes}</th>
                  {canRecordPondData && isActiveCycle(pond) && (
                    <th style={{ height: '44px', padding: '0 24px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{copy.actions}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentCycleMortalityRecords.map((record, i) => {
                  const isNone = record.observationType === 'none_observed';
                  const isObserved = record.observationType === 'observed_recovered';
                  const countNum = Number(record.count) || 0;
                  const mbw = Number(record.mbwAtRecord) || getSamplingMbwAtDate(record.date);
                  const weightKg = mbw > 0 && countNum > 0 ? (countNum * mbw) / 1000 : null;

                  const badgeStyle = isNone
                    ? { bg: '#DCFCE7', color: '#166534', label: copy.noneObserved }
                    : isObserved
                      ? { bg: '#E0F2FE', color: '#0F4C75', label: copy.observedRecovered }
                      : { bg: '#FEE2E2', color: '#991B1B', label: copy.estimatedTotal };

                  return (
                    <tr key={record.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s' }} className="hover-row">
                      <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600 }}>
                        {record.date ? new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                        }}>
                          {badgeStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: countNum > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {isNone ? `0 ${copy.pieces}` : `${countNum.toLocaleString()} ${copy.pieces}`}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {weightKg !== null && !isNone ? `${weightKg.toFixed(2)} kg` : '—'}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.notes && !record.notes.toLowerCase().includes('projection testing') ? record.notes : '—'}
                      </td>
                      {canRecordPondData && isActiveCycle(pond) && (
                        <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              aria-label={copy.editMortality}
                              onClick={() => {
                                setEditingMortalityId(record.id || null);
                                setMortalityForm({
                                  date: record.date || today,
                                  observationType: record.observationType || 'estimated_total',
                                  count: record.observationType === 'none_observed' ? '0' : String(record.count || '0'),
                                  siponShift: record.siponShift || 'morning',
                                  siphonedCount: String(record.siphonedCount || ''),
                                  mortalCount: String(record.mortalCount || ''),
                                  notes: record.notes || '',
                                });
                                setMortalityModalOpen(true);
                              }}
                              style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: 'var(--primary)' }} disabled={savePending}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={copy.deleteMortality}
                              onClick={() => handleDeleteMortality(record.id || '')}
                              style={{ border: '1px solid var(--border)', background: '#FFF', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#ef4444' }} disabled={savePending}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>

  </div></>);
}
