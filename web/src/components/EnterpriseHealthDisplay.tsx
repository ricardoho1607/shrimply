"use client";

import React, { useEffect, useMemo } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getEnterprisePondStatus,
  sortFarmBlocks,
  type EnterprisePond,
  type EnterprisePondRisk,
  type FarmBlock,
} from '../../../shared/enterpriseBlocks';
import styles from './EnterpriseHealthDisplay.module.css';

interface EnterpriseHealthDisplayProps {
  blocks: FarmBlock[];
  ponds: EnterprisePond[];
  companyId?: string;
  companyName?: string;
  timeZone?: string;
  onExit: () => void;
}

interface WakeLockSentinelLike {
  readonly released?: boolean;
  release: () => Promise<void>;
}

const riskClass: Record<EnterprisePondRisk, string> = {
  stable: styles.stable,
  warning: styles.warning,
  'high-risk': styles.highRisk,
};

export default function EnterpriseHealthDisplay({
  blocks,
  ponds,
  companyId,
  companyName,
  timeZone,
  onExit,
}: EnterpriseHealthDisplayProps) {
  const { t } = useLanguage();
  const statusByPond = useMemo(() => new Map(ponds.map((pond) => [
    pond.id,
    getEnterprisePondStatus(pond, timeZone),
  ])), [ponds, timeZone]);
  const unassignedPonds = useMemo(() => ponds.filter((pond) => !pond.blockId), [ponds]);
  const displayBlocks = useMemo(() => [
    ...sortFarmBlocks(blocks),
    ...(unassignedPonds.length > 0
      ? [{
        id: '__unassigned__',
        companyId: companyId || '',
        name: t.enterprise.unassignedPonds,
      }]
      : []),
  ], [blocks, companyId, t.enterprise.unassignedPonds, unassignedPonds.length]);
  const riskCounts = useMemo(() => ponds.reduce((counts, pond) => {
    const risk = statusByPond.get(pond.id)?.risk || 'stable';
    counts[risk] += 1;
    return counts;
  }, { stable: 0, warning: 0, 'high-risk': 0 } as Record<EnterprisePondRisk, number>), [ponds, statusByPond]);

  useEffect(() => {
    let wakeLock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      }).wakeLock;
      if (
        !wakeLockApi
        || document.visibilityState !== 'visible'
        || (wakeLock && !wakeLock.released)
      ) return;

      try {
        const nextWakeLock = await wakeLockApi.request('screen');
        if (cancelled) {
          await nextWakeLock.release();
          return;
        }
        wakeLock = nextWakeLock;
      } catch {
        // The fullscreen display still works when the browser does not grant a wake lock.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void wakeLock?.release();
    };
  }, []);

  const getBlockPonds = (blockId: string) => (
    blockId === '__unassigned__'
      ? unassignedPonds
      : ponds.filter((pond) => pond.blockId === blockId)
  );

  const getRiskLabel = (risk: EnterprisePondRisk) => (
    risk === 'stable'
      ? t.enterprise.stable
      : risk === 'warning'
        ? t.enterprise.warning
        : t.enterprise.highRisk
  );

  return (
    <div
      className={styles.display}
      role="dialog"
      aria-modal="true"
      aria-label={t.enterprise.officeDisplay}
    >
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.brand}>Shrimply</span>
          <div>
            <h1>{companyName || t.enterprise.commandCenter}</h1>
            <p>{t.enterprise.livePondHealth}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.legend} aria-label={t.enterprise.livePondHealth}>
            {([
              ['stable', t.enterprise.stable],
              ['warning', t.enterprise.warning],
              ['high-risk', t.enterprise.highRisk],
            ] as const).map(([risk, label]) => (
              <span key={risk}>
                <i className={`${styles.legendDot} ${riskClass[risk]}`} />
                {label} <b>{riskCounts[risk]}</b>
              </span>
            ))}
          </div>
          <button type="button" className={styles.exitButton} onClick={onExit}>
            <Minimize2 size={19} />
            {t.enterprise.exitOfficeDisplay}
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {displayBlocks.length === 0 ? (
          <div className={styles.empty}>
            <Maximize2 size={30} />
            <h2>{t.enterprise.noBlocks}</h2>
            <p>{t.enterprise.noBlocksDescription}</p>
          </div>
        ) : (
          <div className={styles.blockGrid}>
            {displayBlocks.map((block) => {
              const blockPonds = getBlockPonds(block.id);

              return (
                <section key={block.id} className={styles.block}>
                  <div className={styles.blockHeader}>
                    <div>
                      <h2>{block.name}</h2>
                      <p>{t.enterprise.pondCount.replace('{{count}}', String(blockPonds.length))}</p>
                    </div>
                  </div>
                  {blockPonds.length > 0 ? (
                    <div className={styles.pondGrid} role="list">
                      {blockPonds.map((pond) => {
                        const status = statusByPond.get(pond.id);
                        const risk = status?.risk || 'stable';
                        return (
                          <div
                            key={pond.id}
                            className={`${styles.pondTile} ${riskClass[risk]}`}
                            role="listitem"
                            aria-label={`${pond.pondName}, ${getRiskLabel(risk)}, DOC ${status?.doc || 0}`}
                          >
                            <strong>{pond.pondName}</strong>
                            <small>DOC {status?.doc || 0}</small>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.noPonds}>{t.enterprise.noPondsInBlock}</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
