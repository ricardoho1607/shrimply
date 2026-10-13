"use client";
import PlanktonOverwatchCard from '@/components/PlanktonOverwatchCard';
import {
  Activity,
  Database,
  FlaskConical,
  Info,
  Layers,
  Scale,
  ShoppingBag,
  Target,
  Users,
  Wind
} from 'lucide-react';
import { getLabStatusStyle, getPlSupplier } from './PondDetailModel';
import type { PondDetailViewModel } from './usePondDetail';
type Props = Pick<PondDetailViewModel,
  'pond'
  | 'copy'
  | 'labStatusCards'
  | 'metrics'
  | 'handleDeletePond'
  | 'savePending'
  | 'canManagePond'
  | 'isDeletingPond'> & { pond: NonNullable<PondDetailViewModel['pond']> };
export function PondDetailsSidebar({ pond, copy, labStatusCards, metrics, handleDeletePond, savePending, canManagePond, isDeletingPond }: Props) {
  return (<><div className="animate-fade-up animate-delay-3 pond-detail-side-column">
    <PlanktonOverwatchCard snapshot={pond.latestPlanktonOverwatch} />

    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <FlaskConical size={18} />
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{copy.latestLabStatus}</h4>
        </div>
      </div>
      {labStatusCards.length === 0 ? (
        <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.45 }}>
          {copy.noLabWarning}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {labStatusCards.map((item) => {
            const statusStyle = getLabStatusStyle(item.status?.status, copy);
            const Icon = item.Icon;
            return (
              <div key={item.key} style={{ padding: '14px', borderRadius: '14px', background: 'var(--bg-mid)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Icon size={16} color="var(--primary)" />
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>{item.title}</span>
                  </div>
                  <span style={{ borderRadius: 999, padding: '5px 9px', background: statusStyle.bg, color: statusStyle.color, fontSize: '0.66rem', fontWeight: 600, flexShrink: 0 }}>
                    {statusStyle.label}
                  </span>
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.86rem', fontWeight: 600, lineHeight: 1.45 }}>
                  {item.status?.mainIssue || copy.noLabWarning}
                </p>
                {item.status?.sampleDate && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontWeight: 600, marginTop: '6px' }}>
                    {copy.lastLab}: {new Date(item.status.sampleDate).toLocaleDateString()}
                  </p>
                )}
                {item.status?.keyRisks && item.status.keyRisks.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {item.status.keyRisks.slice(0, 2).map((risk, index) => (
                      <span key={`${item.key}-${risk}-${index}`} style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600 }}>• {risk}</span>
                    ))}
                  </div>
                )}
                {item.status?.recommendations?.[0] && (
                  <div style={{ marginTop: '12px', padding: '10px', borderRadius: '10px', background: '#ffffff', border: '1px solid var(--border)' }}>
                    <div style={{ color: 'var(--text-faint)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>{copy.recommendedAction}</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.45 }}>{item.status.recommendations[0]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    <div className="glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <Info size={18} />
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{copy.detailedMetrics}</h4>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Biological Specs */}
        <div>
          <h5 style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{copy.biologicalAndFeed}</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: copy.currentPopulation, value: `${metrics?.population.toLocaleString()} ${copy.pieces}`, icon: Users },
              { label: copy.todaysMortality, value: `${metrics?.todayMortality.toLocaleString()} ${copy.pieces}`, icon: Activity },
              { label: copy.totalMortality, value: `${metrics?.totalMortality.toLocaleString()} ${copy.pieces}`, icon: Activity },
              { label: copy.totalMortalityWeight, value: `${metrics?.totalMortalityWeight.toFixed(2)} kg`, icon: Wind },
              { label: copy.totalFeedUsed, value: `${metrics?.totalFeed.toFixed(1)} kg`, icon: ShoppingBag },
              { label: copy.fcrEstimated, value: metrics?.fcr.toFixed(2), icon: Target },
              { label: copy.currentSize, value: `${metrics?.size} ${copy.pieces}/kg`, icon: Scale },
            ].map((spec, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pond Specifications */}
        <div>
          <h5 style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-faint)', letterSpacing: '0.08em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{copy.pondSpecifications}</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: copy.totalArea, value: `${pond.pondArea} m²`, icon: Layers },
              { label: copy.targetDensity, value: `${pond.density} PL/m²`, icon: Database },
              { label: copy.plSupplier, value: getPlSupplier(pond), icon: Target },
              { label: copy.initialWeight, value: `${pond.initialWeight} g`, icon: Wind },
            ].map((spec, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <spec.icon size={14} style={{ opacity: 0.5 }} /> {spec.label}
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>

    <div className="pond-detail-delete-action">
      <p>{copy.deleteDescription}</p>
      <button
        type="button"
        onClick={handleDeletePond}
        disabled={savePending || (!canManagePond || isDeletingPond)}
      >
        {isDeletingPond ? copy.deleting : copy.deletePond}
      </button>
    </div>
  </div></>);
}
