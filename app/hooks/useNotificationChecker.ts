// hooks/useNotificationChecker.ts
// This hook runs periodic checks for overdue assets and low stock items

import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAssetStore } from '../store/assetStore';
import { useFeedAdditiveStore } from '../store/feedAdditiveStore';
import { NotificationService } from '../services/notificationService';

export const useNotificationChecker = () => {
  const { company, isBuyer } = useAuth();
  const assets = useAssetStore((state) => state.assets);
  const initializeAssets = useAssetStore((state) => state.initializeForCompany);
  const cleanupAssets = useAssetStore((state) => state.cleanup);
  const feeds = useFeedAdditiveStore((state) => state.feeds);
  const additives = useFeedAdditiveStore((state) => state.additives);
  const initializeInventory = useFeedAdditiveStore((state) => state.initializeForCompany);

  useEffect(() => {
    if (!company?.id || isBuyer) return;

    const unsubscribeInventory = initializeInventory(company.id);
    void initializeAssets(company.id);

    return () => {
      try { unsubscribeInventory?.(); } catch (error) { console.error('Error cleaning up inventory notification listener:', error); }
      cleanupAssets();
    };
  }, [company?.id, isBuyer, initializeAssets, initializeInventory, cleanupAssets]);

  useEffect(() => {
    if (!company?.id || isBuyer) return;

    // Function to check overdue assets
    const checkOverdueAssets = async () => {
      const now = new Date();
      
      for (const asset of assets) {
        // Skip if no current holder
        if (!asset.currentHolder) continue;
        
        // Check transfer history for overdue returns
        const activeTransfers = asset.transferHistory.filter(t => !t.returned);
        
        for (const transfer of activeTransfers) {
          if (!transfer.expectedReturn) continue;
          
          const expectedDate = transfer.expectedReturn instanceof Date 
            ? transfer.expectedReturn 
            : new Date(transfer.expectedReturn);
          
          // Check if overdue
          if (expectedDate < now) {
            const daysOverdue = Math.floor(
              (now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            await NotificationService.createOverdueAssetNotification(
              company.id,
              asset.name,
              asset.id,
              transfer.to,
              expectedDate,
              daysOverdue
            );
          }
        }
      }
    };

    // Function to check low stock items
    const checkLowStockItems = async () => {
      // Check feeds
      for (const feed of feeds) {
        if (feed.reorderLevel && feed.reorderLevel > 0 && feed.totalStock <= feed.reorderLevel) {
          await NotificationService.createLowStockNotification(
            company.id,
            feed.feedName,
            'feed',
            feed.totalStock,
            feed.reorderLevel,
            feed.unit || 'kg',
            feed.id
          );
        }
      }

      // Check additives
      for (const additive of additives) {
        if (additive.reorderLevel && additive.reorderLevel > 0 && additive.totalStock <= additive.reorderLevel) {
          await NotificationService.createLowStockNotification(
            company.id,
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

    // Run checks immediately on mount
    const runChecks = async () => {
      try {
        await checkOverdueAssets();
        await checkLowStockItems();
      } catch (error) {
        console.error('Error running notification checks:', error);
      }
    };

    runChecks();

    // Set up interval to run checks every 6 hours
    const interval = setInterval(runChecks, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [company?.id, isBuyer, assets, feeds, additives]);
};

// Alternative: Manual check function you can call from anywhere
export const runNotificationChecks = async (
  companyId: string,
  assets: any[],
  feeds: any[],
  additives: any[]
) => {
  const now = new Date();
  
  // Check overdue assets
  for (const asset of assets) {
    if (!asset.currentHolder) continue;
    
    const activeTransfers = asset.transferHistory.filter((t: any) => !t.returned);
    
    for (const transfer of activeTransfers) {
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
