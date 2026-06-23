// hooks/useDataBackup.ts - Fixed version without infinite loops
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePondStore } from '../store/pondStore';
import { useFirebaseSync } from './useFirebaseSync';

export const useDataBackup = () => {
  const { user, company } = useAuth();
  const pondStore = usePondStore();
  const firebaseSync = useFirebaseSync();

  // Connect Firebase sync to the store - FIXED: removed pondStore from dependencies
  useEffect(() => {
    if (firebaseSync.syncPond && firebaseSync.syncSampling && firebaseSync.syncHarvestRecord) {
      pondStore.setFirebaseSync({
        syncPond: firebaseSync.syncPond,
        syncPhysicalPond: firebaseSync.syncPhysicalPond,
        syncSampling: firebaseSync.syncSampling,
        syncHarvestRecord: firebaseSync.syncHarvestRecord,
        syncCycle: firebaseSync.syncCycle,
      });
    }
  }, [
    firebaseSync.syncPond,
    firebaseSync.syncPhysicalPond,
    firebaseSync.syncSampling,
    firebaseSync.syncHarvestRecord,
    firebaseSync.syncCycle,
  ]);

  // Auto-restore when user logs in (now handled by real-time listeners) - FIXED: removed store lengths from dependencies
  useEffect(() => {
    if (user?.uid && !firebaseSync.syncStatus.isSyncing) {
      // Check if local data is empty, then wait for real-time sync to populate
      if (pondStore.ponds.length === 0 && pondStore.harvestRecords.length === 0) {
        console.log('User logged in with no local data, real-time sync will populate data...');
      } else {
        console.log('User logged in with existing local data, real-time sync will keep it updated');
      }
    }
  }, [user?.uid, firebaseSync.syncStatus.isSyncing]);

  // Legacy backup methods (for migration or manual backup)
  const legacyBackup = useCallback(async () => {
    if (!user?.uid || !company?.id) {
      throw new Error('User and company must be available for backup');
    }

    try {
      // Get current state
      const { ponds, harvestRecords } = pondStore;
      
      // This could be used for manual full backup if needed
      console.log('Legacy backup triggered for company:', company.id);
      console.log('Ponds:', ponds.length, 'Harvests:', harvestRecords.length);
      
      // Real-time sync handles this automatically now
      return Promise.resolve();
    } catch (error) {
      console.error('Legacy backup failed:', error);
      throw error;
    }
  }, [user?.uid, company?.id, pondStore]);

  // Legacy restore method
  const legacyRestore = useCallback(async () => {
    if (!user?.uid || !company?.id) {
      throw new Error('User and company must be available for restore');
    }

    try {
      console.log('Legacy restore triggered for company:', company.id);
      // Real-time sync handles this automatically through listeners
      return Promise.resolve();
    } catch (error) {
      console.error('Legacy restore failed:', error);
      throw error;
    }
  }, [user?.uid, company?.id]);

  // Format last sync time for display
  const getLastSyncDisplay = useCallback(() => {
    if (!firebaseSync.syncStatus.lastSync) return 'Never';
    const now = Date.now();
    const lastSyncTime = firebaseSync.syncStatus.lastSync.getTime();
    const diffMinutes = Math.floor((now - lastSyncTime) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [firebaseSync.syncStatus.lastSync]);

  return {
    // Legacy methods (for backward compatibility)
    manualBackup: legacyBackup,
    manualRestore: legacyRestore,
    
    // Real-time sync status and controls
    syncStatus: firebaseSync.syncStatus,
    triggerSync: firebaseSync.triggerManualSync,
    hasPendingChanges: firebaseSync.hasPendingChanges,
    
    // Status information
    isLoggedIn: !!user,
    isOnline: firebaseSync.syncStatus.isOnline,
    isSyncing: firebaseSync.syncStatus.isSyncing,
    hasLocalData: pondStore.ponds.length > 0 || pondStore.harvestRecords.length > 0,
    
    // Display helpers
    lastSyncDisplay: getLastSyncDisplay(),
    lastSyncTime: firebaseSync.syncStatus.lastSync?.getTime(),
    
    // User and company info
    userEmail: user?.email,
    userId: user?.uid,
    companyId: company?.id,
    companyName: company?.companyName,

    // Legacy properties (keep for compatibility with existing code)
    isBackingUp: false,
    isRestoring: false,
    lastBackupTime: firebaseSync.syncStatus.lastSync?.getTime(),
    lastBackupDisplay: getLastSyncDisplay(),
  };
};
