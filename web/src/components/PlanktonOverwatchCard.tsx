"use client";

import { AlertCircle, CheckCircle2, CircleHelp, Eye, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlanktonOverwatchSnapshot, PlanktonOverwatchState } from '../../../shared/planktonOverwatch';
import { localizePlanktonOverwatchSnapshot } from '../../../shared/planktonOverwatchI18n';

interface Props {
  snapshot?: PlanktonOverwatchSnapshot | null;
  compact?: boolean;
}

const STATE_CLASS: Record<PlanktonOverwatchState, string> = {
  insufficient: 'is-insufficient',
  stable: 'is-stable',
  watch: 'is-watch',
  high: 'is-high',
  critical: 'is-critical',
};

const STATE_ICON = {
  insufficient: CircleHelp,
  stable: CheckCircle2,
  watch: Eye,
  high: TriangleAlert,
  critical: AlertCircle,
};

export default function PlanktonOverwatchCard({ snapshot, compact = false }: Props) {
  const { t } = useLanguage();
  if (!snapshot) return null;

  const labels: Record<PlanktonOverwatchState, string> = {
    insufficient: t.waterQuality.overwatchInsufficient,
    stable: t.waterQuality.overwatchStable,
    watch: t.waterQuality.overwatchWatch,
    high: t.waterQuality.overwatchHigh,
    critical: t.waterQuality.overwatchCritical,
  };
  const Icon = STATE_ICON[snapshot.state] || CircleHelp;
  const localized = localizePlanktonOverwatchSnapshot(snapshot, t.waterQuality);
  const evidence = localized.evidence.slice(0, compact ? 1 : 2);
  const missing = localized.missing.slice(0, 3);

  return (
    <section className={`plankton-overwatch-card ${STATE_CLASS[snapshot.state] || STATE_CLASS.insufficient}${compact ? ' is-compact' : ''}`}>
      <div className="plankton-overwatch-header">
        <div className="plankton-overwatch-title">
          <Icon size={18} />
          <strong>{t.waterQuality.overwatchTitle}</strong>
        </div>
        <span className="plankton-overwatch-badge">{labels[snapshot.state]}</span>
      </div>

      <p className="plankton-overwatch-message">{localized.message}</p>

      {!compact && evidence.length > 0 && (
        <div className="plankton-overwatch-section">
          <span>{t.waterQuality.overwatchEvidence}</span>
          {evidence.map((item) => <p key={item.id}>{item.text}</p>)}
        </div>
      )}

      {!compact && snapshot.state === 'insufficient' && missing.length > 0 && (
        <div className="plankton-overwatch-section">
          <span>{t.waterQuality.overwatchMissingData}</span>
          <p>{missing.join(', ')}</p>
        </div>
      )}

      {localized.nextAction && (
        <div className="plankton-overwatch-action">
          <span>{t.waterQuality.overwatchNextAction}</span>
          <p>{localized.nextAction}</p>
        </div>
      )}
    </section>
  );
}
