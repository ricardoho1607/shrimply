import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NotificationService } from '@/lib/notificationService';
import {
  getNotificationCandidates,
  type AssetCandidateSource,
  type InventoryCandidateSource,
} from '../../../shared/notificationCandidates';

type NotificationSources = {
  feeds: InventoryCandidateSource[];
  additives: InventoryCandidateSource[];
  assets: AssetCandidateSource[];
};

export const useNotificationChecker = (companyId?: string, role?: string) => {
  const sourceRef = useRef<NotificationSources>({ feeds: [], additives: [], assets: [] });

  useEffect(() => {
    if (!companyId || role === 'buyer') return;
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
  }, [companyId, role]);
};
