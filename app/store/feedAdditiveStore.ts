import { create } from 'zustand';
import {
  collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot,
  arrayUnion, serverTimestamp, Timestamp, runTransaction
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import NotificationService from '../services/notificationService';
import { usePondStore } from './pondStore';

export interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  price: number;
  notes?: string;
  batch?: string;
  expiry?: string;
  unit?: string;
  createdAt: Timestamp | any;
}

export interface UsageHistory {
  id: string;
  date: string;
  quantity: number;
  unitPrice?: number;
  totalCost?: number;
  pondId?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  notes?: string;
  createdAt: Timestamp | any;
}

export interface Feed {
  id: string;
  companyId: string;
  feedName: string;
  brand?: string;
  feedType: 'Starter' | 'Grower' | 'Finisher' | 'Other';
  unit?: string;
  reorderLevel?: number;
  stockInHistory: StockHistory[];
  usageHistory: UsageHistory[];
  totalStock: number;
  totalCost: number;
  lastUpdated: Timestamp | any;
  createdAt: Timestamp | any;
}

export interface Additive {
  id: string;
  companyId: string;
  additiveName: string;
  category: 'Water Conditioner' | 'Probiotic' | 'Mineral' | 'Vitamin' | 'Other';
  unit?: string;
  reorderLevel?: number;
  stockInHistory: StockHistory[];
  usageHistory: UsageHistory[];
  totalStock: number;
  totalCost: number;
  lastUpdated: Timestamp | any;
  createdAt: Timestamp | any;
}

export interface FeedAdditiveMetrics {
  totalFeedCost: number;
  totalAdditiveCost: number;
  totalInventoryValue: number;
  totalFeedStock: number;
  totalAdditiveStock: number;
  avgFeedCostPerUnit: number;
  avgAdditiveCostPerUnit: number;
  lowStockCount: number;
  nearExpiryCount: number;
}

interface FeedAdditiveStore {
  feeds: Feed[];
  additives: Additive[];
  loading: boolean;
  currentCompanyId: string | null;
  initializeForCompany: (companyId: string) => () => void;
  setCurrentCompanyId: (companyId: string | null) => void;
  addFeed: (feed: Partial<Feed>) => Promise<void>;
  stockInFeed: (feedId: string, quantity: number, price: number, notes?: string, opts?: { batch?: string; expiry?: string; unit?: string }) => Promise<void>;
  useFeed: (feedId: string, quantity: number, pondId?: string | null, notes?: string) => Promise<void>;
  deleteFeed: (feedId: string) => Promise<void>;
  updateFeed: (feedId: string, patch: Partial<Feed>) => Promise<void>;
  addAdditive: (additive: Partial<Additive>) => Promise<void>;
  stockInAdditive: (additiveId: string, quantity: number, price: number, notes?: string, opts?: { batch?: string; expiry?: string; unit?: string }) => Promise<void>;
  useAdditive: (additiveId: string, quantity: number, pondId?: string | null, notes?: string) => Promise<void>;
  deleteAdditive: (additiveId: string) => Promise<void>;
  updateAdditive: (additiveId: string, patch: Partial<Additive>) => Promise<void>;
  getMetrics: () => FeedAdditiveMetrics;
  getRecentTransactions: (limit: number) => any[];
  getLowStockItems: (threshold?: number) => any[];
  getItemsNearExpiry: (withinDays: number) => any[];
  getItemsBelowReorder: () => any[];
  getFeedUsageByPond: (pondId: string) => { [itemId: string]: number };
  checkAllLowStock: () => Promise<void>;
}

const isoDate = (d = new Date()) => d.toISOString().split('T')[0];

// Helper to check low stock and create notification
const checkLowStock = async (
  item: Feed | Additive,
  type: 'feed' | 'additive',
  companyId: string
) => {
  console.log('📊 checkLowStock called:', {
    itemName: type === 'feed' ? (item as Feed).feedName : (item as Additive).additiveName,
    currentStock: item.totalStock,
    reorderLevel: item.reorderLevel,
    hasReorderLevel: !!item.reorderLevel && item.reorderLevel > 0,
    isLow: item.totalStock <= (item.reorderLevel || 0)
  });

  // Only check if reorder level is set
  if (!item.reorderLevel || item.reorderLevel <= 0) {
    console.log('⏭️  Skipping: No reorder level set');
    return;
  }
  
  // Only notify if stock is at or below reorder level
  if (item.totalStock > item.reorderLevel) {
    console.log('✅ Stock is above reorder level, no notification needed');
    return;
  }
  
  const itemName = type === 'feed' 
    ? (item as Feed).feedName 
    : (item as Additive).additiveName;
  
  console.log('🔔 Creating low stock notification for:', itemName);
  
  try {
    await NotificationService.createLowStockNotification(
      companyId,
      itemName,
      type,
      item.totalStock,
      item.reorderLevel,
      item.unit || 'kg',
      item.id
    );
    console.log('✅ Notification created successfully');
  } catch (error) {
    console.error('❌ Error creating low stock notification:', error);
  }
};

export const useFeedAdditiveStore = create<FeedAdditiveStore>((set, get) => ({
  feeds: [],
  additives: [],
  loading: false,
  currentCompanyId: null,

  setCurrentCompanyId: (companyId) => set({ currentCompanyId: companyId }),

  initializeForCompany: (companyId: string) => {
    set({ currentCompanyId: companyId, loading: true });
    let feedsLoaded = false;
    let additivesLoaded = false;

    const feedsRef = query(collection(db, 'companies', companyId, 'feeds'), where('companyId', '==', companyId));
    const unsubscribeFeeds = onSnapshot(feedsRef, (snapshot) => {
      const feeds = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Feed[];
      set({ feeds });
      feedsLoaded = true;
      if (feedsLoaded && additivesLoaded) set({ loading: false });
    }, (err) => {
      console.error('feeds snapshot error', err);
      feedsLoaded = true;
      if (feedsLoaded && additivesLoaded) set({ loading: false });
    });

    const additivesRef = query(collection(db, 'companies', companyId, 'additives'), where('companyId', '==', companyId));
    const unsubscribeAdditives = onSnapshot(additivesRef, (snapshot) => {
      const additives = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Additive[];
      set({ additives });
      additivesLoaded = true;
      if (feedsLoaded && additivesLoaded) set({ loading: false });
    }, (err) => {
      console.error('additives snapshot error', err);
      additivesLoaded = true;
      if (feedsLoaded && additivesLoaded) set({ loading: false });
    });

    return () => {
      try { unsubscribeFeeds(); } catch (e) { /* ignore */ }
      try { unsubscribeAdditives(); } catch (e) { /* ignore */ }
    };
  },

  addFeed: async (feed) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const hasStock = (feed.totalStock || 0) > 0;
    if (hasStock && (feed.totalCost || 0) <= 0) throw new Error('Feed price must be greater than 0');
    if ((feed.stockInHistory || []).some((stock) => !Number.isFinite(stock.price) || stock.price <= 0)) {
      throw new Error('Feed stock-in price must be greater than 0');
    }
    try {
      const ref = doc(collection(db, 'companies', currentCompanyId, 'feeds'));
      const now = serverTimestamp() as any;
      const newFeed: Partial<Feed> = {
        id: ref.id,
        companyId: currentCompanyId,
        feedName: feed.feedName || 'Unnamed Feed',
        brand: feed.brand || '',
        feedType: (feed.feedType as any) || 'Grower',
        unit: feed.unit || 'kg',
        reorderLevel: typeof feed.reorderLevel === 'number' ? feed.reorderLevel : 0,
        stockInHistory: feed.stockInHistory || [],
        usageHistory: feed.usageHistory || [],
        totalStock: feed.totalStock || 0,
        totalCost: feed.totalCost || 0,
        lastUpdated: now,
        createdAt: now,
      };
      await setDoc(ref, newFeed);
    } catch (e) {
      console.error('Error addFeed', e);
      throw e;
    }
  },

  stockInFeed: async (feedId, quantity, price, notes = '', opts = {}) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Feed price must be greater than 0');
    const feedRef = doc(db, 'companies', currentCompanyId, 'feeds', feedId);

    try {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(feedRef);
        if (!snapshot.exists()) throw new Error('Feed not found');
        const feed = snapshot.data() as any as Feed;

        const stock: StockHistory = {
          id: Date.now().toString(),
          date: isoDate(),
          quantity,
          price,
          notes,
          batch: opts.batch,
          expiry: opts.expiry,
          unit: opts.unit || feed.unit || 'kg',
          createdAt: Timestamp.now(),
        };

        const newTotalStock = (feed.totalStock || 0) + quantity;
        const newTotalCost = (feed.totalCost || 0) + (quantity * price);

        tx.update(feedRef, {
          stockInHistory: arrayUnion(stock),
          totalStock: newTotalStock,
          totalCost: newTotalCost,
          lastUpdated: serverTimestamp(),
        });
      });
    } catch (e) {
      console.error('stockInFeed transaction failed', e);
      throw e;
    }
  },

  useFeed: async (feedId, quantity, pondId?: string | null, notes?: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const feedRef = doc(db, 'companies', currentCompanyId, 'feeds', feedId);

    try {
      let newStock = 0;
      let reorderLevel = 0;
      let feedName = '';
      let unit = 'kg';

      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(feedRef);
        if (!snapshot.exists()) throw new Error('Feed not found');
        const feed = snapshot.data() as any as Feed;

        const currentStock = feed.totalStock || 0;
        if (quantity > currentStock) throw new Error('Insufficient stock');
        const unitPrice = currentStock > 0 ? (feed.totalCost || 0) / currentStock : 0;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Feed cost is missing. Stock this feed with a price before recording usage.');

        const usage: Partial<UsageHistory> = {
          id: Date.now().toString(),
          date: isoDate(),
          quantity,
          unitPrice,
          totalCost: quantity * unitPrice,
          createdAt: new Date(),
        };

        if (pondId) {
          const pond = usePondStore.getState().ponds.find((item) => item.id === pondId);
          usage.pondId = pondId;
          usage.cycleId = pond?.cycleId;
          usage.cycleName = pond?.cycleName;
          usage.pondCycleId = pond?.pondCycleId || pondId;
        }
        if (notes) usage.notes = notes;

        newStock = Math.max(0, currentStock - quantity);
        reorderLevel = feed.reorderLevel || 0;
        feedName = feed.feedName;
        unit = feed.unit || 'kg';

        tx.update(feedRef, {
          usageHistory: arrayUnion(usage),
          totalStock: newStock,
          totalCost: Math.max(0, (feed.totalCost || 0) - (quantity * unitPrice)),
          lastUpdated: serverTimestamp(),
        });
      });

      // Check if stock is low and create notification
      if (currentCompanyId && reorderLevel > 0 && newStock <= reorderLevel) {
        console.log('🔍 Low stock detected:', {
          itemName: feedName,
          newStock,
          reorderLevel,
        });
        
        try {
          await NotificationService.createLowStockNotification(
            currentCompanyId,
            feedName,
            'feed',
            newStock,
            reorderLevel,
            unit,
            feedId
          );
          console.log('✅ Notification created successfully');
        } catch (error) {
          console.error('❌ Error creating notification:', error);
        }
      }
    } catch (e) {
      console.error('useFeed transaction failed', e);
      throw e;
    }
  },

  deleteFeed: async (feedId) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    try {
      await deleteDoc(doc(db, 'companies', currentCompanyId, 'feeds', feedId));
    } catch (e) {
      console.error('deleteFeed failed', e);
      throw e;
    }
  },

  updateFeed: async (feedId, patch) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    try {
      const ref = doc(db, 'companies', currentCompanyId, 'feeds', feedId);
      const patchWithTs = { ...patch, lastUpdated: serverTimestamp() };
      await updateDoc(ref, patchWithTs as any);
    } catch (e) {
      console.error('updateFeed failed', e);
      throw e;
    }
  },

  addAdditive: async (additive) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const hasStock = (additive.totalStock || 0) > 0;
    if (hasStock && (additive.totalCost || 0) <= 0) throw new Error('Additive price must be greater than 0');
    if ((additive.stockInHistory || []).some((stock) => !Number.isFinite(stock.price) || stock.price <= 0)) {
      throw new Error('Additive stock-in price must be greater than 0');
    }
    try {
      const ref = doc(collection(db, 'companies', currentCompanyId, 'additives'));
      const now = serverTimestamp() as any;
      const newAdditive: Partial<Additive> = {
        id: ref.id,
        companyId: currentCompanyId,
        additiveName: additive.additiveName || 'Unnamed Additive',
        category: (additive.category as any) || 'Other',
        unit: additive.unit || 'kg',
        reorderLevel: typeof additive.reorderLevel === 'number' ? additive.reorderLevel : 0,
        stockInHistory: additive.stockInHistory || [],
        usageHistory: additive.usageHistory || [],
        totalStock: additive.totalStock || 0,
        totalCost: additive.totalCost || 0,
        lastUpdated: now,
        createdAt: now,
      };
      await setDoc(ref, newAdditive);
    } catch (e) {
      console.error('addAdditive failed', e);
      throw e;
    }
  },

  stockInAdditive: async (additiveId, quantity, price, notes = '', opts = {}) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (!Number.isFinite(price) || price <= 0) throw new Error('Additive price must be greater than 0');
    const additiveRef = doc(db, 'companies', currentCompanyId, 'additives', additiveId);

    try {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(additiveRef);
        if (!snapshot.exists()) throw new Error('Additive not found');
        const additive = snapshot.data() as any as Additive;

        const stock: StockHistory = {
          id: Date.now().toString(),
          date: isoDate(),
          quantity,
          price,
          notes,
          batch: opts.batch,
          expiry: opts.expiry,
          unit: opts.unit || additive.unit || 'kg',
          createdAt: Timestamp.now(),
        };

        const newTotalStock = (additive.totalStock || 0) + quantity;
        const newTotalCost = (additive.totalCost || 0) + (quantity * price);

        tx.update(additiveRef, {
          stockInHistory: arrayUnion(stock),
          totalStock: newTotalStock,
          totalCost: newTotalCost,
          lastUpdated: serverTimestamp(),
        });
      });
    } catch (e) {
      console.error('stockInAdditive transaction failed', e);
      throw e;
    }
  },

  useAdditive: async (additiveId, quantity, pondId?: string | null, notes?: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const additiveRef = doc(db, 'companies', currentCompanyId, 'additives', additiveId);

    try {
      let newStock = 0;
      let reorderLevel = 0;
      let additiveName = '';
      let unit = 'kg';

      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(additiveRef);
        if (!snapshot.exists()) throw new Error('Additive not found');
        const additive = snapshot.data() as any as Additive;

        const currentStock = additive.totalStock || 0;
        if (quantity > currentStock) throw new Error('Insufficient stock');
        const unitPrice = currentStock > 0 ? (additive.totalCost || 0) / currentStock : 0;
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Additive cost is missing. Stock this additive with a price before recording usage.');

        const usage: Partial<UsageHistory> = {
          id: Date.now().toString(),
          date: isoDate(),
          quantity,
          unitPrice,
          totalCost: quantity * unitPrice,
          createdAt: new Date(),
        };

        if (pondId) {
          const pond = usePondStore.getState().ponds.find((item) => item.id === pondId);
          usage.pondId = pondId;
          usage.cycleId = pond?.cycleId;
          usage.cycleName = pond?.cycleName;
          usage.pondCycleId = pond?.pondCycleId || pondId;
        }
        if (notes) usage.notes = notes;

        newStock = Math.max(0, currentStock - quantity);
        reorderLevel = additive.reorderLevel || 0;
        additiveName = additive.additiveName;
        unit = additive.unit || 'kg';

        tx.update(additiveRef, {
          usageHistory: arrayUnion(usage),
          totalStock: newStock,
          totalCost: Math.max(0, (additive.totalCost || 0) - (quantity * unitPrice)),
          lastUpdated: serverTimestamp(),
        });
      });

      // Check if stock is low and create notification
      if (currentCompanyId && reorderLevel > 0 && newStock <= reorderLevel) {
        console.log('🔍 Low stock detected:', {
          itemName: additiveName,
          newStock,
          reorderLevel,
        });
        
        try {
          await NotificationService.createLowStockNotification(
            currentCompanyId,
            additiveName,
            'additive',
            newStock,
            reorderLevel,
            unit,
            additiveId
          );
          console.log('✅ Notification created successfully');
        } catch (error) {
          console.error('❌ Error creating notification:', error);
        }
      }
    } catch (e) {
      console.error('useAdditive transaction failed', e);
      throw e;
    }
  },

  deleteAdditive: async (additiveId) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    try {
      await deleteDoc(doc(db, 'companies', currentCompanyId, 'additives', additiveId));
    } catch (e) {
      console.error('deleteAdditive failed', e);
      throw e;
    }
  },

  updateAdditive: async (additiveId, patch) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    try {
      const ref = doc(db, 'companies', currentCompanyId, 'additives', additiveId);
      const patchWithTs = { ...patch, lastUpdated: serverTimestamp() };
      await updateDoc(ref, patchWithTs as any);
    } catch (e) {
      console.error('updateAdditive failed', e);
      throw e;
    }
  },

  checkAllLowStock: async () => {
    const { currentCompanyId, feeds, additives } = get();
    if (!currentCompanyId) return;
    
    console.log('🔍 Checking all items for low stock...');
    
    for (const feed of feeds) {
      await checkLowStock(feed, 'feed', currentCompanyId);
    }
    
    for (const additive of additives) {
      await checkLowStock(additive, 'additive', currentCompanyId);
    }
    
    console.log('✅ Low stock check complete');
  },

  getMetrics: () => {
    const { feeds, additives } = get();
    const totalFeedCost = feeds.reduce((s, f) => s + (f.totalCost || 0), 0);
    const totalAdditiveCost = additives.reduce((s, a) => s + (a.totalCost || 0), 0);
    const totalFeedStock = feeds.reduce((s, f) => s + (f.totalStock || 0), 0);
    const totalAdditiveStock = additives.reduce((s, a) => s + (a.totalStock || 0), 0);

    let feedUnitSum = 0;
    let feedCostSum = 0;
    feeds.forEach((f) => {
      const qty = (f.stockInHistory || []).reduce((s, h) => s + (h.quantity || 0), 0);
      if (qty > 0) {
        feedUnitSum += qty;
        feedCostSum += (f.totalCost || 0);
      }
    });
    const avgFeedCostPerUnit = feedUnitSum > 0 ? feedCostSum / feedUnitSum : 0;

    let addUnitSum = 0;
    let addCostSum = 0;
    additives.forEach((a) => {
      const qty = (a.stockInHistory || []).reduce((s, h) => s + (h.quantity || 0), 0);
      if (qty > 0) {
        addUnitSum += qty;
        addCostSum += (a.totalCost || 0);
      }
    });
    const avgAdditiveCostPerUnit = addUnitSum > 0 ? addCostSum / addUnitSum : 0;

    const totalInventoryValue =
      feeds.reduce((sum, f) => {
        const qtySum = (f.stockInHistory || []).reduce((s, h) => s + (h.quantity || 0), 0);
        const avg = qtySum > 0 ? (f.totalCost || 0) / qtySum : 0;
        return sum + (f.totalStock || 0) * avg;
      }, 0) +
      additives.reduce((sum, a) => {
        const qtySum = (a.stockInHistory || []).reduce((s, h) => s + (h.quantity || 0), 0);
        const avg = qtySum > 0 ? (a.totalCost || 0) / qtySum : 0;
        return sum + (a.totalStock || 0) * avg;
      }, 0);

    const lowStockCount = feeds.filter(f => typeof f.reorderLevel === 'number' && f.totalStock <= (f.reorderLevel || 0)).length
      + additives.filter(a => typeof a.reorderLevel === 'number' && a.totalStock <= (a.reorderLevel || 0)).length;

    const now = new Date();
    const nearExpiryCount = (() => {
      let cnt = 0;
      const checkExpiry = (h?: StockHistory[]) => {
        (h || []).forEach(s => {
          if (!s.expiry) return;
          const e = new Date(s.expiry);
          const diffDays = Math.ceil((+e - +now) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30 && diffDays >= 0) cnt++;
        });
      };
      feeds.forEach(f => checkExpiry(f.stockInHistory));
      additives.forEach(a => checkExpiry(a.stockInHistory));
      return cnt;
    })();

    return {
      totalFeedCost,
      totalAdditiveCost,
      totalInventoryValue,
      totalFeedStock,
      totalAdditiveStock,
      avgFeedCostPerUnit,
      avgAdditiveCostPerUnit,
      lowStockCount,
      nearExpiryCount,
    } as FeedAdditiveMetrics;
  },

  getRecentTransactions: (limit) => {
    const { feeds, additives } = get();
    const txs: any[] = [];

    feeds.forEach((f) => {
      (f.stockInHistory || []).forEach((h) => {
        txs.push({
          id: h.id,
          type: 'Stock In',
          item: f.feedName,
          category: 'Feed',
          date: h.date,
          quantity: h.quantity,
          price: h.price,
          total: (h.quantity * h.price),
          createdAt: h.createdAt,
        });
      });
      (f.usageHistory || []).forEach((h) => {
        txs.push({
          id: h.id,
          type: 'Usage',
          item: f.feedName,
          category: 'Feed',
          date: h.date,
          quantity: h.quantity,
          pondId: h.pondId,
          createdAt: h.createdAt,
        });
      });
    });

    additives.forEach((a) => {
      (a.stockInHistory || []).forEach((h) => {
        txs.push({
          id: h.id,
          type: 'Stock In',
          item: a.additiveName,
          category: 'Additive',
          date: h.date,
          quantity: h.quantity,
          price: h.price,
          total: (h.quantity * h.price),
          createdAt: h.createdAt,
        });
      });
      (a.usageHistory || []).forEach((h) => {
        txs.push({
          id: h.id,
          type: 'Usage',
          item: a.additiveName,
          category: 'Additive',
          date: h.date,
          quantity: h.quantity,
          pondId: h.pondId,
          createdAt: h.createdAt,
        });
      });
    });

    return txs
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || new Date(a.date).getTime();
        const timeB = b.createdAt?.toMillis?.() || new Date(b.date).getTime();
        return timeB - timeA;
      })
      .slice(0, limit);
  },

  getLowStockItems: (threshold = 50) => {
    const { feeds, additives } = get();
    const low: any[] = [];

    feeds.forEach((f) => {
      if (typeof f.reorderLevel === 'number' ? f.totalStock <= f.reorderLevel : f.totalStock <= threshold) {
        low.push({ id: f.id, type: 'Feed', name: f.feedName, stock: f.totalStock, unit: f.unit || 'kg' });
      }
    });

    additives.forEach((a) => {
      if (typeof a.reorderLevel === 'number' ? a.totalStock <= a.reorderLevel : a.totalStock <= threshold) {
        low.push({ id: a.id, type: 'Additive', name: a.additiveName, stock: a.totalStock, unit: a.unit || 'kg' });
      }
    });

    return low;
  },

  getItemsNearExpiry: (withinDays) => {
    const { feeds, additives } = get();
    const now = new Date();
    const items: any[] = [];

    const check = (item: any, typeLabel: string) => {
      (item.stockInHistory || []).forEach((h: StockHistory) => {
        if (!h.expiry) return;
        const e = new Date(h.expiry);
        const diffDays = Math.ceil((+e - +now) / (1000 * 60 * 60 * 24));
        if (diffDays <= withinDays && diffDays >= 0) {
          items.push({
            id: item.id,
            type: typeLabel,
            name: typeLabel === 'Feed' ? item.feedName : item.additiveName,
            batch: h.batch,
            expiry: h.expiry,
            daysLeft: diffDays,
            qty: h.quantity,
          });
        }
      });
    };

    feeds.forEach((f) => check(f, 'Feed'));
    additives.forEach((a) => check(a, 'Additive'));
    return items;
  },

  getItemsBelowReorder: () => {
    const { feeds, additives } = get();
    const below: any[] = [];
    feeds.forEach((f) => {
      if (typeof f.reorderLevel === 'number' && f.totalStock <= f.reorderLevel) {
        below.push({ id: f.id, type: 'Feed', name: f.feedName, stock: f.totalStock, reorderLevel: f.reorderLevel });
      }
    });
    additives.forEach((a) => {
      if (typeof a.reorderLevel === 'number' && a.totalStock <= a.reorderLevel) {
        below.push({ id: a.id, type: 'Additive', name: a.additiveName, stock: a.totalStock, reorderLevel: a.reorderLevel });
      }
    });
    return below;
  },

  getFeedUsageByPond: (pondId) => {
    const { feeds, additives } = get();
    const map: Record<string, number> = {};
    feeds.forEach((f) => {
      (f.usageHistory || []).forEach((u) => {
        if (u.pondId === pondId) {
          map[f.id] = (map[f.id] || 0) + (u.quantity || 0);
        }
      });
    });
    additives.forEach((a) => {
      (a.usageHistory || []).forEach((u) => {
        if (u.pondId === pondId) {
          map[a.id] = (map[a.id] || 0) + (u.quantity || 0);
        }
      });
    });
    return map;
  },
}));
