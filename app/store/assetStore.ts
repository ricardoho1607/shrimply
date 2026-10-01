import { create } from 'zustand';
import { 
  collection, 
  doc, 
  query, 
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../../config/firebase';
import NotificationService from '../services/notificationService';
import { getActiveFarmCycle, usePondStore } from './pondStore';
import {
  createOfflineOperationId,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistOfflineCollection,
  requestOfflineMutationFlush,
  saveDurableMutation,
} from '../services/offlineWorkspace';

export type AssetCategory = 'Equipment' | 'Infrastructure' | 'Vehicles' | 'Tools' | 'Technology';
export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Needs Repair';
export type MaintenanceSeverity = 'Low' | 'Medium' | 'High';
export type MaintenanceType = 'Preventive' | 'Corrective' | 'Inspection' | 'Repair' | 'Upgrade';

export interface MaintenanceRecord {
  id: string;
  date: Date;
  cycleId?: string;
  cycleName?: string;
  description: string;
  technician: string;
  cost?: number;
  laborHours?: number;
  partsUsed?: string[];
  severity: MaintenanceSeverity;
  type: MaintenanceType;
  photos: string[];
  conditionBefore?: AssetCondition;
  conditionAfter?: AssetCondition;
  nextMaintenanceDue?: Date;
  notes?: string;
}

export interface TransferRecord {
  id: string;
  date: Date;
  from: string;
  to: string;
  purpose?: string;
  expectedReturn?: Date;
  returned?: Date;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface Asset {
  id: string;
  companyId: string;
  name: string;
  description: string;
  category: AssetCategory;
  purchaseDate: Date;
  purchaseCost?: number;
  condition: AssetCondition;
  currentHolder: string | null;
  photos: string[];
  transferHistory: TransferRecord[];
  maintenanceHistory: MaintenanceRecord[];
  nextMaintenanceDue?: Date;
  lastMaintenanceDate?: Date;
  totalMaintenanceCost: number;
  qrCode?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface AssetStore {
  assets: Asset[];
  currentCompanyId: string | null;
  loading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  // Basic operations
  setCurrentCompanyId: (id: string) => void;
  initializeForCompany: (companyId: string) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id' | 'companyId' | 'totalMaintenanceCost' | 'transferHistory' | 'maintenanceHistory' | 'createdAt' | 'updatedAt'>, recordId?: string) => Promise<Asset>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  getAsset: (id: string) => Asset | undefined;
  getAssetByQR: (qrCode: string) => Asset | undefined;
  
  // Transfer operations
  transferAsset: (id: string, transfer: Omit<TransferRecord, 'id' | 'date'>, recordId?: string) => Promise<void>;
  returnAsset: (id: string) => Promise<void>;
  
  // Maintenance operations
  addMaintenance: (id: string, maintenance: Omit<MaintenanceRecord, 'id' | 'date'>, recordId?: string) => Promise<void>;
  scheduleNextMaintenance: (id: string, date: Date) => Promise<void>;
  getMaintenanceDue: () => Asset[];
  getMaintenanceCost: (id: string, startDate?: Date, endDate?: Date) => number;
  
  // QR Code operations
  generateQRCode: (id: string) => Promise<string>;
  scanQRCode: (qrData: string) => Asset | null;
  
  // Photo upload operations
  uploadPhoto: (uri: string, assetId: string, type: 'asset' | 'maintenance') => Promise<string>;
  deletePhoto: (photoUrl: string) => Promise<void>;
  
  // Analytics helpers
  getTotalMaintenanceCost: (startDate?: Date, endDate?: Date) => number;
  getAssetUtilization: (id: string) => number;
  getMaintenanceFrequency: (id: string) => number;
  
  // Notification helpers
  checkOverdueAssets: () => Promise<void>;
  checkAssetOverdue: (assetId: string) => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
}

// Helper function to check overdue assets
const checkOverdueAssets = async (companyId: string, assets: Asset[]) => {
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
        
        try {
          await NotificationService.createOverdueAssetNotification(
            companyId,
            asset.name,
            asset.id,
            transfer.to,
            expectedDate,
            daysOverdue
          );
        } catch (error) {
          console.error('Error creating overdue notification:', error);
        }
      }
    }
  }
};

let assetInitializationVersion = 0;

const persistAssetCache = async (companyId: string, assets: Asset[]): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  await persistOfflineCollection(userId, companyId, 'assets', assets);
};

// Helper function to convert Firestore data to Asset
const firestoreToAsset = (id: string, data: any): Asset => {
  const convertDate = (field: any) => {
    if (!field) return undefined;
    if (field instanceof Timestamp) return field.toDate();
    if (field.toDate) return field.toDate();
    return new Date(field);
  };

  return {
    id,
    companyId: data.companyId,
    name: data.name,
    description: data.description,
    category: data.category,
    purchaseDate: convertDate(data.purchaseDate),
    purchaseCost: data.purchaseCost,
    condition: data.condition,
    currentHolder: data.currentHolder,
    photos: data.photos || [],
    transferHistory: (data.transferHistory || []).map((t: any) => ({
      ...t,
      date: convertDate(t.date),
      expectedReturn: convertDate(t.expectedReturn),
      returned: convertDate(t.returned),
    })),
    maintenanceHistory: (data.maintenanceHistory || []).map((m: any) => ({
      ...m,
      date: convertDate(m.date),
      nextMaintenanceDue: convertDate(m.nextMaintenanceDue),
    })),
    nextMaintenanceDue: convertDate(data.nextMaintenanceDue),
    lastMaintenanceDate: convertDate(data.lastMaintenanceDate),
    totalMaintenanceCost: data.totalMaintenanceCost || 0,
    qrCode: data.qrCode,
    serialNumber: data.serialNumber,
    manufacturer: data.manufacturer,
    model: data.model,
    location: data.location,
    createdAt: convertDate(data.createdAt),
    updatedAt: convertDate(data.updatedAt),
  };
};

// Helper function to convert Asset to Firestore data
const assetToFirestore = (asset: Partial<Asset>) => {
  const data: any = { ...asset };
  
  // Convert Date objects to Timestamps
  if (data.purchaseDate instanceof Date) data.purchaseDate = Timestamp.fromDate(data.purchaseDate);
  if (data.nextMaintenanceDue instanceof Date) data.nextMaintenanceDue = Timestamp.fromDate(data.nextMaintenanceDue);
  if (data.lastMaintenanceDate instanceof Date) data.lastMaintenanceDate = Timestamp.fromDate(data.lastMaintenanceDate);
  if (data.createdAt instanceof Date) data.createdAt = Timestamp.fromDate(data.createdAt);
  if (data.updatedAt instanceof Date) data.updatedAt = Timestamp.fromDate(data.updatedAt);
  
  // Convert dates in nested arrays and remove undefined values
  if (data.transferHistory) {
    data.transferHistory = data.transferHistory.map((t: any) => {
      const transfer: any = {
        ...t,
        date: t.date instanceof Date ? Timestamp.fromDate(t.date) : t.date,
      };
      
      // Only add optional fields if they exist
      if (t.expectedReturn instanceof Date) {
        transfer.expectedReturn = Timestamp.fromDate(t.expectedReturn);
      } else if (t.expectedReturn !== undefined) {
        transfer.expectedReturn = t.expectedReturn;
      }
      
      if (t.returned instanceof Date) {
        transfer.returned = Timestamp.fromDate(t.returned);
      } else if (t.returned !== undefined) {
        transfer.returned = t.returned;
      }
      
      // Remove undefined values from transfer object
      Object.keys(transfer).forEach(key => {
        if (transfer[key] === undefined) delete transfer[key];
      });
      
      return transfer;
    });
  }
  
  if (data.maintenanceHistory) {
    data.maintenanceHistory = data.maintenanceHistory.map((m: any) => {
      const maintenance: any = {
        ...m,
        date: m.date instanceof Date ? Timestamp.fromDate(m.date) : m.date,
      };
      
      // Only add optional fields if they exist
      if (m.nextMaintenanceDue instanceof Date) {
        maintenance.nextMaintenanceDue = Timestamp.fromDate(m.nextMaintenanceDue);
      } else if (m.nextMaintenanceDue !== undefined) {
        maintenance.nextMaintenanceDue = m.nextMaintenanceDue;
      }
      
      // Remove undefined values from maintenance object
      Object.keys(maintenance).forEach(key => {
        if (maintenance[key] === undefined) delete maintenance[key];
      });
      
      return maintenance;
    });
  }
  
  // Remove undefined values from top level
  Object.keys(data).forEach(key => {
    if (data[key] === undefined) delete data[key];
  });
  
  return data;
};

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  currentCompanyId: null,
  loading: false,
  error: null,
  unsubscribe: null,

  setCurrentCompanyId: (id) => set({ currentCompanyId: id }),

  initializeForCompany: async (companyId) => {
    const initializationVersion = ++assetInitializationVersion;
    set({ loading: true, error: null });
    
    const userId = auth.currentUser?.uid;
    if (userId) {
      const cachedAssets = await loadOfflineCollectionWithMutations<Record<string, unknown> & { id: string }>(
        userId,
        companyId,
        'assets',
        ['assets'],
      );
      if (initializationVersion !== assetInitializationVersion) return;
      if (cachedAssets.length > 0) {
        set({
          assets: cachedAssets.map((asset) => firestoreToAsset(asset.id, asset)),
          currentCompanyId: companyId,
          loading: false,
        });
      }
    }

    if (initializationVersion !== assetInitializationVersion) return;
    
    // Unsubscribe from previous listener if exists
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
    }
    
    try {
      const assetsRef = collection(db, 'assets');
      const q = query(assetsRef, where('companyId', '==', companyId));
      
      // Set up real-time listener
      const unsubscribeFn = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (querySnapshot) => {
          const remoteAssets: Asset[] = [];
          querySnapshot.forEach((doc) => {
            remoteAssets.push(firestoreToAsset(doc.id, doc.data()));
          });
          if (querySnapshot.metadata.fromCache && remoteAssets.length === 0 && get().assets.length > 0) return;
          void (async () => {
            const assets = userId
              ? (await overlayOfflineMutations(
                remoteAssets.map((asset) => ({ ...asset }) as Asset & { id: string }),
                userId,
                companyId,
                ['assets'],
              )).map((asset) => firestoreToAsset(asset.id, asset as unknown as Record<string, unknown>))
              : remoteAssets;
            if (initializationVersion !== assetInitializationVersion) return;
            set({ assets, currentCompanyId: companyId, loading: false });
            if (userId) await persistAssetCache(companyId, assets);
            console.log(`📦 Loaded ${assets.length} assets in real-time`);
          })().catch((error) => {
            console.error('Failed to apply pending asset changes:', error);
          });
        },
        (error) => {
          console.error('❌ Error in real-time listener:', error);
          set({ error: 'Failed to sync assets', loading: false });
        }
      );
      
      set({ unsubscribe: unsubscribeFn });
    } catch (error) {
      console.error('❌ Error initializing assets:', error);
      set({ error: 'Failed to load assets', loading: false });
      throw error;
    }
  },

  uploadPhoto: async (uri: string, assetId: string, type: 'asset' | 'maintenance') => {
    try {
      // Fetch the image
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create unique filename
      const timestamp = Date.now();
      const companyId = get().currentCompanyId;
      if (!companyId) throw new Error('No company selected');
      const filename = `companies/${companyId}/assets/${assetId}/${type}/${timestamp}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob, { contentType: blob.type?.startsWith('image/') ? blob.type : 'image/jpeg', customMetadata: { companyId, assetId } });
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('📸 Photo uploaded:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      throw error;
    }
  },

  deletePhoto: async (photoUrl: string) => {
    try {
      const photoRef = ref(storage, photoUrl);
      await deleteObject(photoRef);
      console.log('🗑️ Photo deleted:', photoUrl);
    } catch (error) {
      console.error('⚠️ Error deleting photo:', error);
      // Don't throw - photo might already be deleted
    }
  },

  addAsset: async (assetData, recordId) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    const existing = recordId ? get().assets.find(asset => asset.id === recordId) : undefined;
    if (existing) {
      await persistAssetCache(currentCompanyId, get().assets);
      requestOfflineMutationFlush(userId, currentCompanyId);
      return existing;
    }

    try {
      const assetRef = recordId ? doc(db, 'assets', recordId) : doc(collection(db, 'assets'));
      const qrCode = await get().generateQRCode(assetRef.id);
      const newAsset: Asset = {
        ...assetData,
        id: assetRef.id,
        companyId: currentCompanyId,
        transferHistory: [],
        maintenanceHistory: [],
        totalMaintenanceCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        qrCode,
      };
      const durableMutation = await saveDurableMutation({
        id: createOfflineOperationId(`asset-create-${assetRef.id}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['assets', assetRef.id],
        data: assetToFirestore(newAsset),
        merge: false,
        createOnly: true,
        uploadLocalFiles: true,
      }, { deferFlush: true });
      const finalAsset = firestoreToAsset(assetRef.id, durableMutation.data);
      const assets = [...get().assets.filter((asset) => asset.id !== finalAsset.id), finalAsset];
      set({ assets });
      await persistAssetCache(currentCompanyId, assets);
      requestOfflineMutationFlush(userId, currentCompanyId);
      
      console.log('✅ Asset added:', finalAsset.name);
      return finalAsset;
    } catch (error) {
      console.error('❌ Error adding asset:', error);
      throw error;
    }
  },

  updateAsset: async (id, updates) => {
    try {
      const currentCompanyId = get().currentCompanyId;
      const userId = auth.currentUser?.uid;
      if (!currentCompanyId || !userId) throw new Error('No active farm account');
      const existing = get().getAsset(id);
      if (!existing) throw new Error('Asset not found');
      const updatedAsset: Asset = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date(),
      };
      const updateData = assetToFirestore({ ...updates, updatedAt: updatedAsset.updatedAt });
      const durableMutation = await saveDurableMutation({
        id: createOfflineOperationId(`asset-update-${id}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['assets', id],
        data: updateData,
        merge: true,
        uploadLocalFiles: true,
      }, { deferFlush: true });
      const durableAsset = firestoreToAsset(id, {
        ...assetToFirestore(updatedAsset),
        ...durableMutation.data,
      });
      const assets = get().assets.map((asset) => asset.id === id ? durableAsset : asset);
      set({ assets });
      await persistAssetCache(currentCompanyId, assets);
      requestOfflineMutationFlush(userId, currentCompanyId);
      console.log('✅ Asset updated:', id);
    } catch (error) {
      console.error('❌ Error updating asset:', error);
      throw error;
    }
  },

  deleteAsset: async (id) => {
    try {
      const currentCompanyId = get().currentCompanyId;
      const userId = auth.currentUser?.uid;
      if (!currentCompanyId || !userId) throw new Error('No active farm account');
      const asset = get().getAsset(id);
      await saveDurableMutation({
        id: createOfflineOperationId(`asset-delete-${id}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['assets', id],
      }, { deferFlush: true });
      const assets = get().assets.filter((item) => item.id !== id);
      set({ assets });
      await persistAssetCache(currentCompanyId, assets);
      requestOfflineMutationFlush(userId, currentCompanyId);
      if (asset) {
        const photoUrls = [
          ...asset.photos,
          ...asset.maintenanceHistory.flatMap((maintenance) => maintenance.photos),
        ].filter((url) => url.startsWith('http'));
        void Promise.all(photoUrls.map((photoUrl) => get().deletePhoto(photoUrl)));
      }
      console.log('✅ Asset deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting asset:', error);
      throw error;
    }
  },

  getAsset: (id) => {
    return get().assets.find((a) => a.id === id);
  },

  getAssetByQR: (qrCode) => {
    return get().assets.find((a) => a.qrCode === qrCode);
  },

  transferAsset: async (id, transfer, recordId) => {
    const asset = get().getAsset(id);
    if (!asset) throw new Error('Asset not found');

    const newTransfer: TransferRecord = {
      ...transfer,
      id: recordId || `transfer_${Date.now()}`,
      date: new Date(),
    };

    await get().updateAsset(id, {
      currentHolder: transfer.to,
      transferHistory: asset.transferHistory.some(item => item.id === newTransfer.id) ? asset.transferHistory : [...asset.transferHistory, newTransfer],
    });
    
    // After transfer, check if there's an expected return date to monitor
    if (transfer.expectedReturn) {
      console.log('📅 Asset transferred with expected return date - will monitor for overdue');
    }
  },

  returnAsset: async (id) => {
    const asset = get().getAsset(id);
    if (!asset) throw new Error('Asset not found');

    const updatedHistory = asset.transferHistory.map((t, idx) =>
      idx === asset.transferHistory.length - 1 ? { ...t, returned: new Date() } : t
    );

    await get().updateAsset(id, {
      currentHolder: null,
      transferHistory: updatedHistory,
    });
  },

  addMaintenance: async (id, maintenance, recordId) => {
    const asset = get().getAsset(id);
    if (!asset) throw new Error('Asset not found');

    const skipCycleLink = Boolean((maintenance as any).skipCycleLink);
    const { skipCycleLink: _skipCycleLink, ...maintenanceData } = maintenance as any;
    const newMaintenance: MaintenanceRecord = {
      ...maintenanceData,
      cycleId: maintenance.cycleId || (skipCycleLink ? undefined : getActiveFarmCycle(usePondStore.getState().cycles)?.id),
      cycleName: maintenance.cycleName || (skipCycleLink ? undefined : getActiveFarmCycle(usePondStore.getState().cycles)?.cycleName),
      photos: maintenance.photos || [],
      id: recordId || `maint_${Date.now()}`,
      date: new Date(),
    };

    const alreadyApplied = asset.maintenanceHistory.some(item => item.id === newMaintenance.id);
    const totalCost = asset.totalMaintenanceCost + (alreadyApplied ? 0 : maintenance.cost || 0);

    const updates: Partial<Asset> = {
      maintenanceHistory: alreadyApplied ? asset.maintenanceHistory : [...asset.maintenanceHistory, newMaintenance],
      totalMaintenanceCost: totalCost,
      lastMaintenanceDate: new Date(),
    };

    if (maintenance.conditionAfter) {
      updates.condition = maintenance.conditionAfter;
    }

    if (maintenance.nextMaintenanceDue) {
      updates.nextMaintenanceDue = maintenance.nextMaintenanceDue;
    }

    await get().updateAsset(id, updates);
  },

  scheduleNextMaintenance: async (id, date) => {
    await get().updateAsset(id, { nextMaintenanceDue: date });
  },

  getMaintenanceDue: () => {
    const now = new Date();
    return get().assets.filter(
      (a) =>
        a.condition === 'Needs Repair' ||
        (a.nextMaintenanceDue && a.nextMaintenanceDue <= now)
    );
  },

  getMaintenanceCost: (id, startDate, endDate) => {
    const asset = get().getAsset(id);
    if (!asset) return 0;

    return asset.maintenanceHistory
      .filter((m) => {
        if (!m.cost) return false;
        if (startDate && m.date < startDate) return false;
        if (endDate && m.date > endDate) return false;
        return true;
      })
      .reduce((sum, m) => sum + (m.cost || 0), 0);
  },

  generateQRCode: async (id) => {
    const qrData = `ASSET:${id}`;
    return qrData;
  },

  scanQRCode: (qrData) => {
    if (qrData.startsWith('ASSET:')) {
      const assetId = qrData.replace('ASSET:', '');
      return get().getAsset(assetId) || null;
    }
    
    return get().getAssetByQR(qrData) || null;
  },

  getTotalMaintenanceCost: (startDate, endDate) => {
    return get().assets.reduce((total, asset) => {
      return total + get().getMaintenanceCost(asset.id, startDate, endDate);
    }, 0);
  },

  getAssetUtilization: (id) => {
    const asset = get().getAsset(id);
    if (!asset) return 0;

    const totalDays = Math.floor(
      (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (totalDays === 0) return 0;

    const checkedOutDays = asset.transferHistory.reduce((days, transfer) => {
      const start = transfer.date.getTime();
      const end = transfer.returned
        ? transfer.returned.getTime()
        : Date.now();
      return days + Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }, 0);

    return Math.round((checkedOutDays / totalDays) * 100);
  },

  getMaintenanceFrequency: (id) => {
    const asset = get().getAsset(id);
    if (!asset || asset.maintenanceHistory.length === 0) return 0;

    const daysSinceCreation = Math.floor(
      (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation === 0) return 0;

    return Math.round(
      (asset.maintenanceHistory.length / daysSinceCreation) * 30
    );
  },

  checkOverdueAssets: async () => {
    const { currentCompanyId, assets } = get();
    if (!currentCompanyId) return;
    
    console.log('🔍 Checking for overdue assets...');
    await checkOverdueAssets(currentCompanyId, assets);
    console.log('✅ Overdue asset check complete');
  },

  checkAssetOverdue: async (assetId: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) return;
    
    const asset = get().getAsset(assetId);
    if (!asset) return;
    
    await checkOverdueAssets(currentCompanyId, [asset]);
  },

  cleanup: () => {
    assetInitializationVersion += 1;
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
      console.log('🔌 Real-time listener cleaned up');
    }
  },
}));
