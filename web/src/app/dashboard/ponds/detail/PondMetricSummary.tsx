"use client";
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'copy'
  | 'metrics'>;
export function PondMetricSummary({ copy, metrics }: Props) {
  return (<><div className="glass-card animate-fade-up animate-delay-1 dashboard-summary-panel pond-detail-summary">
    {[
      { label: copy.ageDoc, value: `${metrics?.doc ?? 0}`, unit: copy.days },
      { label: copy.estimatedBiomass, value: metrics?.biomass.toLocaleString(undefined, { maximumFractionDigits: 1 }) || '0', unit: 'kg' },
      { label: copy.averageDailyGrowth, value: metrics?.adg.toFixed(2) || '0.00', unit: `g/${copy.days}` },
      { label: copy.survivalRate, value: `${metrics?.sr.toFixed(1) || '0.0'}%`, unit: '' },
    ].map(({ label, value, unit }) => (
      <div className="dashboard-summary-item pond-detail-summary-item" key={label}>
        <div className="dashboard-summary-content">
          <span className="dashboard-summary-label">{label}</span>
          <div className="dashboard-summary-value">{value}{unit && <small>{unit}</small>}</div>
        </div>
      </div>
    ))}
  </div></>);
}
