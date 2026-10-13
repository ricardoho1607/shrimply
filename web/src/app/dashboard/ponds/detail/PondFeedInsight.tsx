"use client";
import {
  LineChart as LineChartIcon
} from 'lucide-react';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'metrics'
  | 'copy'>;
export function PondFeedInsight({ metrics, copy }: Props) {
  return (<>{metrics?.feedBiomassInsight?.latest && (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      border: '1px solid #FDE68A',
      background: '#FFFBEB',
      borderRadius: '12px',
      padding: '14px 16px',
      color: '#78350F',
    }}>
      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E', flex: '0 0 auto' }}>
        <LineChartIcon size={18} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{copy.feedReview}</div>
        <div style={{ color: '#92400E', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.45 }}>
          {copy.feedDifference.replace('{{count}}', String(metrics.feedBiomassInsight.requiredRecords))}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{copy.records} {metrics.feedBiomassInsight.latest.recordBiomassKg.toFixed(1)} kg</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{copy.feedEstimate} {metrics.feedBiomassInsight.latest.feedBasedBiomassKg.toFixed(1)} kg</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#FEF3C7', borderRadius: '999px', padding: '4px 8px' }}>{metrics.feedBiomassInsight.latest.differencePercent.toFixed(0)}% {copy.difference}</span>
        </div>
      </div>
    </div>
  )}</>);
}
