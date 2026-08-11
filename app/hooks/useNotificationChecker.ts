// hooks/useNotificationChecker.ts
// This hook runs periodic checks for overdue assets and low stock items

import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAssetStore } from '../store/assetStore';
import { useFeedAdditiveStore } from '../store/feedAdditiveStore';
import { NotificationService } from '../services/notificationService';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STORE_UPDATE_DEBOUNCE_MS = 500;

export const useNotificationChecker = () => {
  const { company, isBuyer } = useAuth();
  const companyId = company?.id;
  const companyTimeZone = company?.timeZone;

  useEffect(() => {
    if (!companyId || isBuyer) return;

    let cancelled = false;
    let assetsReady = false;
    let feedsReady = false;
    let additivesReady = false;
    let checkInFlight = false;
    let checkQueued = false;
    let inventoryCleanup: (() => void) | undefined;
    let checkTimer: ReturnType<typeof setTimeout> | undefined;
    let checkInterval: ReturnType<typeof setInterval> | undefined;

    if (__DEV__) console.log('[NotificationChecker] waiting for interactions');

    const hasCurrentCompanyData = () => {
      const assetState = useAssetStore.getState();
      const inventoryState = useFeedAdditiveStore.getState();
      return assetsReady
        && feedsReady
        && additivesReady
        && assetState.currentCompanyId === companyId
        && inventoryState.currentCompanyId === companyId;
    };

    const runChecks = async () => {
      if (cancelled || !hasCurrentCompanyData()) return;
      if (checkInFlight) {
        checkQueued = true;
        return;
      }

      checkInFlight = true;
      if (__DEV__) console.log('[NotificationChecker] check started');

      try {
        do {
          checkQueued = false;
          const assetState = useAssetStore.getState();
          const inventoryState = useFeedAdditiveStore.getState();

          if (!hasCurrentCompanyData()) break;

          await runNotificationChecks(
            companyId,
            assetState.assets,
            inventoryState.feeds,
            inventoryState.additives,
            () => !cancelled && hasCurrentCompanyData(),
          );
        } while (checkQueued && !cancelled);
      } catch (error) {
        console.error('[NotificationChecker] non-critical check failed:', error);
      } finally {
        checkInFlight = false;
        if (__DEV__) console.log('[NotificationChecker] check complete');
      }
    };

    const scheduleCheck = () => {
      if (cancelled || !hasCurrentCompanyData()) return;
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = setTimeout(() => {
        checkTimer = undefined;
        void runChecks();
      }, STORE_UPDATE_DEBOUNCE_MS);
    };

    const unsubscribeAssets = useAssetStore.subscribe((state, previousState) => {
      if (state.currentCompanyId === companyId && state.assets !== previousState.assets) {
        assetsReady = true;
        scheduleCheck();
      }
    });
    const unsubscribeInventoryStore = useFeedAdditiveStore.subscribe((state, previousState) => {
      if (state.currentCompanyId !== companyId) return;
      if (state.feeds !== previousState.feeds) feedsReady = true;
      if (state.additives !== previousState.additives) additivesReady = true;
      scheduleCheck();
    });

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;

      if (__DEV__) console.log('[NotificationChecker] background setup started');

      try {
        inventoryCleanup = useFeedAdditiveStore.getState().initializeForCompany(companyId, companyTimeZone);
      } catch (error) {
        console.error('[NotificationChecker] non-critical inventory setup failed:', error);
      }

      void useAssetStore.getState().initializeForCompany(companyId).catch((error) => {
        console.error('[NotificationChecker] non-critical asset setup failed:', error);
      });

      checkInterval = setInterval(() => void runChecks(), CHECK_INTERVAL_MS);
      if (__DEV__) console.log('[NotificationChecker] periodic check scheduled');
    });

    return () => {
      cancelled = true;
      interactionTask.cancel();
      if (checkTimer) clearTimeout(checkTimer);
      if (checkInterval) clearInterval(checkInterval);
      unsubscribeAssets();
      unsubscribeInventoryStore();
      try {
        inventoryCleanup?.();
      } catch (error) {
        console.error('[NotificationChecker] inventory cleanup failed:', error);
      }
      useAssetStore.getState().cleanup();
      if (__DEV__) console.log('[NotificationChecker] cleanup');
    };
  }, [companyId, companyTimeZone, isBuyer]);
};

// Alternative: Manual check function you can call from anywhere
export const runNotificationChecks = async (
  companyId: string,
  assets: any[],
  feeds: any[],
  additives: any[],
  shouldContinue: () => boolean = () => true,
) => {
  const now = new Date();

  // Check overdue assets
  for (const asset of assets) {
    if (!shouldContinue()) return;
    if (!asset.currentHolder) continue;

    const activeTransfers = asset.transferHistory.filter((t: any) => !t.returned);

    for (const transfer of activeTransfers) {
      if (!shouldContinue()) return;
      if (!transfer.expectedReturn) continue;

      const expectedDate = transfer.expectedReturn instanceof Date
        ? transfer.expectedReturn
        : new Date(transfer.expectedReturn);

      if (expectedDate < now) {
        const daysOverdue = Math.floor(
          (now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        await NotificationService.createOverdueAssetNotification(
          companyId,
          asset.name,
          asset.id,
          transfer.to,
          expectedDate,
          daysOverdue
        );
      }
    }
  }

  // Check low stock feeds
  for (const feed of feeds) {
    if (!shouldContinue()) return;
    if (feed.reorderLevel && feed.reorderLevel > 0 && feed.totalStock <= feed.reorderLevel) {
      await NotificationService.createLowStockNotification(
        companyId,
        feed.feedName,
        'feed',
        feed.totalStock,
        feed.reorderLevel,
        feed.unit || 'kg',
        feed.id
      );
    }
  }

  // Check low stock additives
  for (const additive of additives) {
    if (!shouldContinue()) return;
    if (additive.reorderLevel && additive.reorderLevel > 0 && additive.totalStock <= additive.reorderLevel) {
      await NotificationService.createLowStockNotification(
        companyId,
        additive.additiveName,
        'additive',
        additive.totalStock,
        additive.reorderLevel,
        additive.unit || 'kg',
        additive.id
      );
    }
  }
};
