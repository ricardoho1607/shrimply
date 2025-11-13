// hooks/useFirebaseSync.ts - Fixed version with proper account switching
import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
  getDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePondStore } from './../store/pondStore';
import { Pond, HarvestRecord, Sampling } from './../store/pondStore';
import NetInfo from '@react-native-community/netinfo';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingChanges: number;
  error?: string;
}

interface PendingChange {
  id: string;
  type: 'pond' | 'sampling' | 'harvest';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  pondId?: string;
  samplingId?: string;
}

export const useFirebaseSync = () => {
  const { user, company } = useAuth();
  const pondStore = usePondStore();
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    pendingChanges: 0
  });
  
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [unsubscribeCallbacks, setUnsubscribeCallbacks] = useState<(() => void)[]>([]);
  
  // Track current company to detect account switches
  const currentCompanyRef = useRef<string | null>(null);
  const listenersSetUp = useRef(false);
  const initialLoadComplete = useRef(false);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected === true;
      setSyncStatus(prev => ({ ...prev, isOnline }));
      
      if (isOnline && pendingChanges.length > 0) {
        setTimeout(() => syncPendingChanges(), 1000);
      }
    });

    return unsubscribe;
  }, [pendingChanges.length]);

  // Clean up listeners when company changes (account switch)
  useEffect(() => {
    const companyId = company?.id;
    
    // If company changed, cleanup previous listeners
    if (currentCompanyRef.current && currentCompanyRef.current !== companyId) {
      console.log(`Account switched from ${currentCompanyRef.current} to ${companyId}, cleaning up...`);
      
      // Cleanup listeners
      unsubscribeCallbacks.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      setUnsubscribeCallbacks([]);
      listenersSetUp.current = false;
      initialLoadComplete.current = false;
      
      // Clear local data for account switch
      usePondStore.setState({ ponds: [], harvestRecords: [] });
    }
    
    currentCompanyRef.current = companyId || null;
  }, [company?.id]);

  // Setup real-time listeners when company is available
  useEffect(() => {
    if (!company?.id || !user || listenersSetUp.current) return;

    console.log(`Setting up real-time sync for company: ${company.id}`);
    setupRealtimeListeners();
    listenersSetUp.current = true;

    return () => {
      console.log('Cleaning up Firebase listeners');
      unsubscribeCallbacks.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
      setUnsubscribeCallbacks([]);
      listenersSetUp.current = false;
      initialLoadComplete.current = false;
    };
  }, [company?.id, user?.uid]);

  const setupRealtimeListeners = useCallback(() => {
    if (!company?.id) return;

    try {
      const newUnsubscribeCallbacks: (() => void)[] = [];

      // Listen to ponds collection
      const pondsQuery = query(
        collection(db, 'companies', company.id, 'ponds'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribePonds = onSnapshot(pondsQuery, 
        (snapshot) => {
          try {
            const serverPonds: Pond[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              serverPonds.push({
                id: doc.id,
                pondName: data.pondName || '',
                pondArea: data.pondArea || 0,
                density: data.density || 0,
                initialPopulation: data.initialPopulation || 0,
                docStart: data.docStart || '',
                supplier: data.supplier || '',
                initialWeight: data.initialWeight || 0,
                samplings: data.samplings || [],
                totalHarvestedBiomass: data.totalHarvestedBiomass || 0,
                totalHarvestedPopulation: data.totalHarvestedPopulation || 0,
                totalHarvestedFeed: data.totalHarvestedFeed || 0,
              });
            });

            // Only update if this is the initial load or if we have actual changes
            const currentPonds = usePondStore.getState().ponds;
            const hasChanges = !initialLoadComplete.current || 
              JSON.stringify(currentPonds) !== JSON.stringify(serverPonds);

            if (hasChanges) {
              console.log(`Updating local store with ${serverPonds.length} ponds from server`);
              usePondStore.setState({ ponds: serverPonds });
              initialLoadComplete.current = true;
            }
            
            setSyncStatus(prev => ({ ...prev, lastSync: new Date(), error: undefined }));
          } catch (error) {
            console.error('Error processing ponds snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing pond data' }));
          }
        },
        (error) => {
          console.error('Error listening to ponds:', error);
          setSyncStatus(prev => ({ ...prev, error: error.message }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribePonds);

      // Listen to harvest records collection
      const harvestQuery = query(
        collection(db, 'companies', company.id, 'harvestRecords'),
        orderBy('date', 'asc')
      );

      const unsubscribeHarvest = onSnapshot(harvestQuery,
        (snapshot) => {
          try {
            const serverHarvestRecords: HarvestRecord[] = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
              serverHarvestRecords.push({
                id: doc.id,
                date: data.date || '',
                ponds: data.ponds || []
              });
            });

            usePondStore.setState({ harvestRecords: serverHarvestRecords });
            console.log(`Received ${serverHarvestRecords.length} harvest records from server`);
          } catch (error) {
            console.error('Error processing harvest records snapshot:', error);
            setSyncStatus(prev => ({ ...prev, error: 'Error processing harvest data' }));
          }
        },
        (error) => {
          console.error('Error listening to harvest records:', error);
          setSyncStatus(prev => ({ ...prev, error: error.message }));
        }
      );
      newUnsubscribeCallbacks.push(unsubscribeHarvest);

      setUnsubscribeCallbacks(newUnsubscribeCallbacks);
    } catch (error) {
      console.error('Error setting up Firebase listeners:', error);
      setSyncStatus(prev => ({ ...prev, error: 'Failed to connect to Firebase' }));
    }
  }, [company?.id]);

  // Add pending change to queue
  const addPendingChange = useCallback((change: Omit<PendingChange, 'timestamp'>) => {
    const pendingChange: PendingChange = {
      ...change,
      timestamp: Date.now()
    };
    
    setPendingChanges(prev => [...prev, pendingChange]);
    setSyncStatus(prev => ({ ...prev, pendingChanges: prev.pendingChanges + 1 }));
    
    if (syncStatus.isOnline) {
      setTimeout(() => syncPendingChanges(), 500);
    }
  }, [syncStatus.isOnline]);

  // Sync pending changes to Firebase
  const syncPendingChanges = useCallback(async () => {
    if (!company?.id || !user || pendingChanges.length === 0 || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: undefined }));

    try {
      const batch = writeBatch(db);
      const processedChanges: string[] = [];

      for (const change of pendingChanges) {
        try {
          if (change.type === 'pond') {
            const pondRef = doc(db, 'companies', company.id, 'ponds', change.data.id);
            
            if (change.action === 'create' || change.action === 'update') {
              const pondData = {
                ...change.data,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(change.action === 'create' && { 
                  createdAt: serverTimestamp(),
                  createdBy: user.uid 
                })
              };
              batch.set(pondRef, pondData, { merge: change.action === 'update' });
            } else if (change.action === 'delete') {
              batch.delete(pondRef);
            }
          } 
          else if (change.type === 'harvest') {
            const harvestRef = change.data.id ? 
              doc(db, 'companies', company.id, 'harvestRecords', change.data.id) :
              doc(collection(db, 'companies', company.id, 'harvestRecords'));
            
            if (change.action === 'create') {
              const harvestData = {
                ...change.data,
                id: harvestRef.id,
                createdAt: serverTimestamp(),
                createdBy: user.uid
              };
              batch.set(harvestRef, harvestData);
            } else if (change.action === 'delete') {
              batch.delete(harvestRef);
            }
          }
          else if (change.type === 'sampling' && change.pondId) {
            const pondRef = doc(db, 'companies', company.id, 'ponds', change.pondId);
            const pondDoc = await getDoc(pondRef);
            
            if (pondDoc.exists()) {
              const pondData = pondDoc.data();
              let samplings = [...(pondData.samplings || [])];
              
              if (change.action === 'create') {
                samplings.push(change.data);
              } else if (change.action === 'update' && change.samplingId) {
                const index = samplings.findIndex(s => s.id === change.samplingId);
                if (index >= 0) {
                  samplings[index] = { ...samplings[index], ...change.data };
                }
              } else if (change.action === 'delete' && change.samplingId) {
                samplings = samplings.filter(s => s.id !== change.samplingId);
              }
              
              batch.update(pondRef, {
                samplings,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid
              });
            }
          }
          
          processedChanges.push(change.id);
        } catch (error) {
          console.error(`Error processing change ${change.id}:`, error);
        }
      }

      if (processedChanges.length > 0) {
        await batch.commit();
        console.log(`Synced ${processedChanges.length} changes to server`);
      }
      
      setPendingChanges(prev => prev.filter(c => !processedChanges.includes(c.id)));
      setSyncStatus(prev => ({ 
        ...prev, 
        pendingChanges: prev.pendingChanges - processedChanges.length,
        lastSync: new Date()
      }));
      
    } catch (error) {
      console.error('Error syncing changes:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }));
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [company?.id, user, pendingChanges, syncStatus.isSyncing]);

  // Sync methods
  const syncPond = useCallback((action: 'create' | 'update' | 'delete', pond: Pond) => {
    addPendingChange({
      id: `pond-${pond.id}-${Date.now()}`,
      type: 'pond',
      action,
      data: pond
    });
  }, [addPendingChange]);

  const syncSampling = useCallback((action: 'create' | 'update' | 'delete', pondId: string, sampling: Sampling, samplingId?: string) => {
    addPendingChange({
      id: `sampling-${sampling.id}-${Date.now()}`,
      type: 'sampling',
      action,
      data: sampling,
      pondId,
      samplingId: samplingId || sampling.id
    });
  }, [addPendingChange]);

  const syncHarvestRecord = useCallback((action: 'create' | 'delete', harvestRecord: HarvestRecord) => {
    addPendingChange({
      id: `harvest-${harvestRecord.id}-${Date.now()}`,
      type: 'harvest',
      action,
      data: harvestRecord
    });
  }, [addPendingChange]);

  const triggerManualSync = useCallback(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, pendingChanges.length, syncPendingChanges]);

  return {
    syncStatus,
    syncPond,
    syncSampling,
    syncHarvestRecord,
    triggerManualSync,
    hasPendingChanges: pendingChanges.length > 0
  };
};