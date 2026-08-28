import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import { NotificationService } from '@/lib/notificationService';
import {
  getNotificationCandidates,
  type AssetCandidateSource,
  type InventoryCandidateSource,
} from '../../../shared/notificationCandidates';
import { isOperationalSummaryFresh } from '../../../shared/operationalSummary';

type NotificationSources = {
  feeds: InventoryCandidateSource[];
  additives: InventoryCandidateSource[];
  assets: AssetCandidateSource[];
};

const setupLegacyNotificationChecker = (
  companyId: string,
  sourceRef: MutableRefObject<NotificationSources>,
) => {
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const check = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      const candidates = getNotificationCandidates(sourceRef.current);
      void Promise.all([
        ...candidates.lowStock.map((item) => NotificationService.createLowStockNotification(
          companyId, item.itemName, item.itemType, item.currentStock, item.reorderLevel, item.unit, item.itemId
        )),
        ...candidates.overdue.map((item) => NotificationService.createOverdueAssetNotification(
          companyId, item.assetId, item.assetName, item.holderName, item.expectedReturn
        )),
      ]);
    }, 500);
  };
  const subscribe = <K extends keyof NotificationSources>(key: K, source: ReturnType<typeof collection> | ReturnType<typeof query>) => (
    onSnapshot(source, (snapshot) => {
      sourceRef.current[key] = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Record<string, unknown>),
      })) as NotificationSources[K];
      check();
    })
  );
  const unsubscribers = [
    subscribe('feeds', collection(db, 'companies', companyId, 'feeds')),
    subscribe('additives', collection(db, 'companies', companyId, 'additives')),
    subscribe('assets', query(collection(db, 'assets'), where('companyId', '==', companyId))),
  ];
  const interval = setInterval(check, 6 * 60 * 60 * 1000);
  return () => {
    if (debounce) clearTimeout(debounce);
    clearInterval(interval);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};

export const useNotificationChecker = (companyId?: string, role?: string) => {
  const sourceRef = useRef<NotificationSources>({ feeds: [], additives: [], assets: [] });

  useEffect(() => {
    if (!companyId || role === 'buyer') return;

    let legacyCleanup: (() => void) | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let refreshRequested = false;
    const startLegacyChecker = () => {
      if (!legacyCleanup) legacyCleanup = setupLegacyNotificationChecker(companyId, sourceRef);
    };
    const stopLegacyChecker = () => {
      legacyCleanup?.();
      legacyCleanup = undefined;
    };
    const requestSummaryRefresh = () => {
      if (refreshRequested) return;
      refreshRequested = true;
      fallbackTimer = setTimeout(startLegacyChecker, 15_000);
      const ensureSummary = httpsCallable<{ companyId: string }, { refreshed: boolean }>(
        getFunctions(app),
        'ensureOperationalSummary',
      );
      void ensureSummary({ companyId }).catch(() => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
        startLegacyChecker();
      });
    };

    const unsubscribeSummary = onSnapshot(
      doc(db, 'companies', companyId, 'summaries', 'dashboard'),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.exists() && isOperationalSummaryFresh(snapshot.data())) {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          fallbackTimer = undefined;
          stopLegacyChecker();
          return;
        }
        if (!snapshot.metadata.fromCache) requestSummaryRefresh();
      },
      () => requestSummaryRefresh(),
    );

    return () => {
      unsubscribeSummary();
      if (fallbackTimer) clearTimeout(fallbackTimer);
      stopLegacyChecker();
    };
  }, [companyId, role]);
};
