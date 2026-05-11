import { create } from 'zustand';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import NotificationService from '../services/notificationService';
import { getActiveFarmCycle, usePondStore } from './pondStore';

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
  addAsset: (asset: Omit<Asset, 'id' | 'companyId' | 'totalMaintenanceCost' | 'transferHistory' | 'maintenanceHistory' | 'createdAt' | 'updatedAt'>) => Promise<Asset>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  getAsset: (id: string) => Asset | undefined;
  getAssetByQR: (qrCode: string) => Asset | undefined;
  
  // Transfer operations
  transferAsset: (id: string, transfer: Omit<TransferRecord, 'id' | 'date'>) => Promise<void>;
  returnAsset: (id: string) => Promise<void>;
  
  // Maintenance operations
  addMaintenance: (id: string, maintenance: Omit<MaintenanceRecord, 'id' | 'date'>) => Promise<void>;
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

// Enable offline persistence (call once on app start)
let persistenceEnabled = false;
const enableOfflinePersistence = async () => {
  if (!persistenceEnabled) {
    try {
      await enableIndexedDbPersistence(db);
      persistenceEnabled = true;
      console.log('✅ Offline persistence enabled - data will sync when back online');
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Browser does not support persistence');
      }
    }
  }
};

export const useAssetStore = create<AssetStore>((set, get) => ({
  assets: [],
  currentCompanyId: null,
  loading: false,
  error: null,
  unsubscribe: null,

  setCurrentCompanyId: (id) => set({ currentCompanyId: id }),

  initializeForCompany: async (companyId) => {
    set({ loading: true, error: null });
    
    // Enable offline persistence
    await enableOfflinePersistence();
    
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
        (querySnapshot) => {
          const assets: Asset[] = [];
          querySnapshot.forEach((doc) => {
            assets.push(firestoreToAsset(doc.id, doc.data()));
          });
          
          set({ assets, currentCompanyId: companyId, loading: false });
          console.log(`📦 Loaded ${assets.length} assets in real-time`);
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
      const filename = `${type}/${assetId}/${timestamp}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      
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

  addAsset: async (assetData) => {
    const { currentCompanyId, uploadPhoto } = get();
    if (!currentCompanyId) throw new Error('No company selected');

    try {
      // Upload photos to Firebase Storage
      const uploadedPhotoUrls: string[] = [];
      if (assetData.photos && assetData.photos.length > 0) {
        console.log(`📤 Uploading ${assetData.photos.length} photos...`);
        for (const photoUri of assetData.photos) {
          if (photoUri.startsWith('file://') || photoUri.startsWith('content://')) {
            const url = await uploadPhoto(photoUri, 'temp', 'asset');
            uploadedPhotoUrls.push(url);
          } else {
            uploadedPhotoUrls.push(photoUri);
          }
        }
      }

      const newAsset: Omit<Asset, 'id'> = {
        ...assetData,
        photos: uploadedPhotoUrls,
        companyId: currentCompanyId,
        transferHistory: [],
        maintenanceHistory: [],
        totalMaintenanceCost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        qrCode: '', // Will be updated after we get the ID
      };

      const assetsRef = collection(db, 'assets');
      const docRef = await addDoc(assetsRef, assetToFirestore(newAsset));
      
      // Update with actual ID and regenerate QR code
      const qrCode = await get().generateQRCode(docRef.id);
      await updateDoc(docRef, { qrCode });
      
      const finalAsset: Asset = {
        ...newAsset,
        id: docRef.id,
        qrCode,
      };
      
      console.log('✅ Asset added:', finalAsset.name);
      return finalAsset;
    } catch (error) {
      console.error('❌ Error adding asset:', error);
      throw error;
    }
  },

  updateAsset: async (id, updates) => {
    try {
      const assetRef = doc(db, 'assets', id);
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };
      
      await updateDoc(assetRef, assetToFirestore(updateData));
      console.log('✅ Asset updated:', id);
    } catch (error) {
      console.error('❌ Error updating asset:', error);
      throw error;
    }
  },

  deleteAsset: async (id) => {
    try {
      const asset = get().getAsset(id);
      if (asset) {
        // Delete all photos from storage
        console.log('🗑️ Deleting asset photos...');
        for (const photoUrl of asset.photos) {
          await get().deletePhoto(photoUrl);
        }
        
        // Delete maintenance photos
        for (const maintenance of asset.maintenanceHistory) {
          for (const photoUrl of maintenance.photos) {
            await get().deletePhoto(photoUrl);
          }
        }
      }
      
      const assetRef = doc(db, 'assets', id);
      await deleteDoc(assetRef);
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

  transferAsset: async (id, transfer) => {
    const asset = get().getAsset(id);
    if (!asset) throw new Error('Asset not found');

    const newTransfer: TransferRecord = {
      ...transfer,
      id: `transfer_${Date.now()}`,
      date: new Date(),
    };

    await get().updateAsset(id, {
      currentHolder: transfer.to,
      transferHistory: [...asset.transferHistory, newTransfer],
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

  addMaintenance: async (id, maintenance) => {
    const asset = get().getAsset(id);
    if (!asset) throw new Error('Asset not found');

    // Upload maintenance photos
    const uploadedPhotoUrls: string[] = [];
    if (maintenance.photos && maintenance.photos.length > 0) {
      console.log(`📤 Uploading ${maintenance.photos.length} maintenance photos...`);
      for (const photoUri of maintenance.photos) {
        if (photoUri.startsWith('file://') || photoUri.startsWith('content://')) {
          const url = await get().uploadPhoto(photoUri, id, 'maintenance');
          uploadedPhotoUrls.push(url);
        } else {
          uploadedPhotoUrls.push(photoUri);
        }
      }
    }

    const newMaintenance: MaintenanceRecord = {
      ...maintenance,
      cycleId: maintenance.cycleId || getActiveFarmCycle(usePondStore.getState().cycles)?.id,
      cycleName: maintenance.cycleName || getActiveFarmCycle(usePondStore.getState().cycles)?.cycleName,
      photos: uploadedPhotoUrls,
      id: `maint_${Date.now()}`,
      date: new Date(),
    };

    const totalCost = asset.totalMaintenanceCost + (maintenance.cost || 0);

    const updates: Partial<Asset> = {
      maintenanceHistory: [...asset.maintenanceHistory, newMaintenance],
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
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
      console.log('🔌 Real-time listener cleaned up');
    }
  },
}));
