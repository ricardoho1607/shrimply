import { getUsageReturnCost } from '../../shared/financeIntegrity';
import { create } from 'zustand';
import { collection, doc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import NotificationService from '../services/notificationService';
import {
  createOfflineOperationId,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistOfflineCollection,
  requestOfflineMutationFlush,
  saveDurableMutation,
} from '../services/offlineWorkspace';
import {
  applyOfflineMutationToCollection,
  type OfflineInventoryAdjustment,
  type OfflineMutation,
} from '../../shared/offlineWorkspace';
import { usePondStore } from './pondStore';
import {
  DAILY_FEED_ERROR_CODES,
  DAILY_FEED_USAGE_SOURCE,
  buildDailyFeedRecordId,
  getDailyFeedUsageTotal,
  isDailyFeedUsage,
  normalizeFeedAllocations,
  sumFeedAllocations,
  type FeedAllocation,
} from '../../shared/feedInventoryUsage';
import { getFarmDateKey, resolveFarmTimeZone } from '../../shared/farmDate';
import {
  ASSUMED_POND_DEPTH_METERS,
  calculateFifoConsumption,
  calculateTreatmentDoseLiters,
  roundInventoryCost,
  roundInventoryQuantity,
} from '../../shared/treatmentMix';
import type { InventoryProductLabel } from '../../shared/productLabel';

export interface TreatmentMixComponent {
  additiveId: string;
  additiveName: string;
  quantity: number;
  unit: string;
}

export interface TreatmentMixBatchComponent extends TreatmentMixComponent {
  unitPrice: number;
  totalCost: number;
}

export interface TreatmentMixRecipe {
  yieldLiters: number;
  components: TreatmentMixComponent[];
  notes?: string;
}

export interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  price: number;
  notes?: string;
  batch?: string;
  expiry?: string;
  unit?: string;
  source?: 'stockIn' | 'treatmentMixProduction';
  treatmentMixId?: string;
  treatmentMixName?: string;
  components?: TreatmentMixBatchComponent[];
  totalCost?: number;
  createdAt: Timestamp | any;
  voided?: boolean;
  voidedAt?: string;
  voidedBy?: string;
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
  source?: string;
  feedRecordId?: string;
  treatmentMixId?: string;
  treatmentMixName?: string;
  batchId?: string;
  ppm?: number;
  pondName?: string;
  pondAreaM2?: number;
  assumedDepthM?: number;
  pondVolumeLiters?: number;
  createdAt: Timestamp | any;
}

export interface Feed {
  archived?: boolean;
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
  archived?: boolean;
  id: string;
  companyId: string;
  additiveName: string;
  category: 'Water Conditioner' | 'Probiotic' | 'Mineral' | 'Vitamin' | 'Other';
  inventoryKind?: 'additive' | 'treatmentMix';
  treatmentMixRecipe?: TreatmentMixRecipe;
  productLabel?: InventoryProductLabel | null;
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
  currentTimeZone: string;
  initializeForCompany: (companyId: string, timeZone?: string) => () => void;
  setCurrentCompanyId: (companyId: string | null, timeZone?: string) => void;
  addFeed: (feed: Partial<Feed>) => Promise<void>;
  stockInFeed: (feedId: string, quantity: number, price: number, notes?: string, opts?: { stockDate?: string; expiry?: string; unit?: string; operationId?: string }) => Promise<void>;
  useFeed: (feedId: string, quantity: number, pondId?: string | null, notes?: string, operationId?: string) => Promise<void>;
  adjustFeedUsage: (feedId: string, quantityDelta: number, pondId?: string | null, notes?: string) => Promise<void>;
  reconcileDailyFeedAllocations: (previousAllocations: FeedAllocation[], nextAllocations: FeedAllocation[], pondId: string, date: string, feedingResponse?: string | null) => Promise<void>;
  deleteDailyFeedRecord: (pondId: string, samplingId: string, date: string, updatedBy: string, candidateFeedIds?: string[]) => Promise<{ missingInventory: boolean }>;
  deleteFeed: (feedId: string) => Promise<void>;
  updateFeed: (feedId: string, patch: Partial<Feed>) => Promise<void>;
  addAdditive: (additive: Partial<Additive>) => Promise<void>;
  stockInAdditive: (additiveId: string, quantity: number, price: number, notes?: string, opts?: { stockDate?: string; expiry?: string; unit?: string; operationId?: string }) => Promise<void>;
  useAdditive: (additiveId: string, quantity: number, pondId?: string | null, notes?: string, operationId?: string) => Promise<void>;
  createTreatmentMix: (input: { name: string; yieldLiters: number; components: TreatmentMixComponent[]; notes?: string; operationId?: string }) => Promise<string>;
  makeTreatmentMixBatch: (treatmentMixId: string, operationId?: string) => Promise<void>;
  useTreatmentMix: (treatmentMixId: string, pond: { id: string; name: string; areaM2: number }, ppm: number, notes?: string, operationId?: string) => Promise<{ quantityLiters: number; totalCost: number }>;
  deleteAdditive: (additiveId: string) => Promise<void>;
  updateAdditive: (additiveId: string, patch: Partial<Additive>) => Promise<void>;
  getMetrics: () => FeedAdditiveMetrics;
  getRecentTransactions: (limit?: number, options?: { includeVoided?: boolean }) => any[];
  getLowStockItems: (threshold?: number) => any[];
  getItemsNearExpiry: (withinDays: number) => any[];
  getItemsBelowReorder: () => any[];
  getFeedUsageByPond: (pondId: string) => { [itemId: string]: number };
  checkAllLowStock: () => Promise<void>;
}

const isoDate = (d = new Date(), timeZone?: string) => getFarmDateKey(d, timeZone);

const persistInventoryCache = async (
  companyId: string,
  feeds: Feed[],
  additives: Additive[],
): Promise<void> => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  await Promise.all([
    persistOfflineCollection(userId, companyId, 'inventory-feeds', feeds),
    persistOfflineCollection(userId, companyId, 'inventory-additives', additives),
  ]);
};

const queueInventoryAdjustments = async <T extends { id: string }>(
  companyId: string,
  collectionName: 'feeds' | 'additives',
  operationPrefix: string,
  items: T[],
  buildAdjustments: (operationId: string) => OfflineInventoryAdjustment[],
  dailyFeed?: OfflineMutation['dailyFeed'],
  requestedOperationId?: string,
): Promise<T[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('No authenticated user');
  const operationId = requestedOperationId || createOfflineOperationId(operationPrefix);
  const mutation: OfflineMutation = {
    id: operationId,
    userId,
    companyId,
    createdAt: Date.now(),
    kind: 'inventory',
    ...(dailyFeed ? { dailyFeed } : {}),
    path: ['companies', companyId],
    inventory: {
      collection: collectionName,
      adjustments: buildAdjustments(operationId),
    },
  };
  await saveDurableMutation(mutation, { deferFlush: true });
  const updatedItems = applyOfflineMutationToCollection(items, mutation);
  await persistOfflineCollection(
    userId,
    companyId,
    collectionName === 'feeds' ? 'inventory-feeds' : 'inventory-additives',
    updatedItems,
  );
  requestOfflineMutationFlush(userId, companyId);
  return updatedItems;
};

type ProduceTreatmentMixInput = {
  companyId: string;
  treatmentMixId: string;
  treatmentMixName?: string;
  recipe?: TreatmentMixRecipe;
  createNew: boolean;
  operationId?: string;
  timeZone: string;
  additives: Additive[];
};

const produceTreatmentMixBatch = async ({
  companyId,
  treatmentMixId,
  treatmentMixName,
  recipe: requestedRecipe,
  createNew,
  timeZone,
  additives,
  operationId: requestedOperationId,
}: ProduceTreatmentMixInput) => {
  const batchId = doc(collection(db, 'companies', companyId, 'treatmentMixBatches')).id;
  const existingMix = additives.find((item) => item.id === treatmentMixId) || null;
  if (requestedOperationId && existingMix?.stockInHistory.some(entry => entry.id === `${requestedOperationId}:${treatmentMixId}`)) {
    await persistInventoryCache(companyId, useFeedAdditiveStore.getState().feeds, additives);
    const userId = auth.currentUser?.uid;
    if (userId) requestOfflineMutationFlush(userId, companyId);
    return additives;
  }
  if (createNew && existingMix) throw new Error('Treatment mix already exists');
  if (!createNew && !existingMix) throw new Error('Treatment mix not found');
  if (existingMix && existingMix.inventoryKind !== 'treatmentMix') throw new Error('Selected item is not a treatment mix');
  const name = (treatmentMixName || existingMix?.additiveName || '').trim();
  const recipe = requestedRecipe || existingMix?.treatmentMixRecipe;
  if (!name) throw new Error('Treatment mix name is required');
  if (!recipe || !Number.isFinite(recipe.yieldLiters) || recipe.yieldLiters <= 0) throw new Error('Final mix volume must be greater than zero');
  const components = recipe.components
    .map((component) => ({ ...component, quantity: Number(component.quantity) }))
    .filter((component) => Number.isFinite(component.quantity) && component.quantity > 0);
  if (components.length === 0) throw new Error('Select at least one additive');
  if (new Set(components.map((component) => component.additiveId)).size !== components.length) throw new Error('Each additive can only be included once');
  const shortages: string[] = [];
  const deductions = components.map((component) => {
    const additive = additives.find((item) => item.id === component.additiveId);
    if (!additive) throw new Error(`${component.additiveName} no longer exists`);
    if (additive.inventoryKind === 'treatmentMix') throw new Error('Treatment mixes cannot be used as recipe ingredients');
    const unit = additive.unit || 'kg';
    if (unit !== component.unit) throw new Error(`${additive.additiveName} unit changed from ${component.unit} to ${unit}`);
    const available = Number(additive.totalStock) || 0;
    if (available + 0.0005 < component.quantity) shortages.push(`${additive.additiveName}: need ${component.quantity} ${unit}, available ${available} ${unit}`);
    return { additive, component };
  });
  if (shortages.length > 0) throw new Error(`Insufficient stock:\n${shortages.join('\n')}`);
  const now = Timestamp.now();
  const date = isoDate(now.toDate(), timeZone);
  const costedComponents = deductions.map(({ additive, component }) => ({
    additive,
    component,
    cost: calculateFifoConsumption(additive.stockInHistory || [], additive.usageHistory || [], component.quantity),
  }));
  const batchCost = roundInventoryCost(costedComponents.reduce((sum, entry) => sum + entry.cost.totalCost, 0));
  const batchComponents: TreatmentMixBatchComponent[] = costedComponents.map(({ additive, component, cost }) => ({
    ...component,
    additiveName: additive.additiveName,
    unitPrice: cost.unitPrice,
    totalCost: cost.totalCost,
  }));
  const savedRecipe: TreatmentMixRecipe = {
    yieldLiters: roundInventoryQuantity(recipe.yieldLiters),
    components: deductions.map(({ additive, component }) => ({ ...component, additiveName: additive.additiveName })),
    ...(recipe.notes ? { notes: recipe.notes } : {}),
  };
  const stockQuantity = roundInventoryQuantity(recipe.yieldLiters);
  const stockPrice = roundInventoryCost(batchCost / recipe.yieldLiters);
  return queueInventoryAdjustments(
    companyId,
    'additives',
    `treatment-batch-${treatmentMixId}`,
    additives,
    (operationId) => [
      ...costedComponents.map(({ additive, component, cost }) => ({
        itemId: additive.id,
        action: 'consume' as const,
        quantity: component.quantity,
        useFifoCost: true,
        historyEntry: {
          id: `${operationId}:${additive.id}`,
          date,
          quantity: component.quantity,
          unitPrice: cost.unitPrice,
          totalCost: cost.totalCost,
          source: 'treatmentMixProduction',
          treatmentMixId,
          treatmentMixName: name,
          batchId,
          createdAt: now,
        },
      })),
      {
        itemId: treatmentMixId,
        action: 'stockIn' as const,
        quantity: stockQuantity,
        price: stockPrice,
        ...(createNew ? {
          createItem: {
            id: treatmentMixId,
            companyId,
            additiveName: name,
            category: 'Other',
            inventoryKind: 'treatmentMix',
            treatmentMixRecipe: savedRecipe,
            unit: 'L',
            reorderLevel: 0,
            stockInHistory: [],
            usageHistory: [],
            totalStock: 0,
            totalCost: 0,
            createdAt: now,
            lastUpdated: now,
          },
        } : {}),
        historyEntry: {
          id: `${operationId}:${treatmentMixId}`,
          date,
          quantity: stockQuantity,
          price: stockPrice,
          totalCost: batchCost,
          unit: 'L',
          source: 'treatmentMixProduction',
          treatmentMixId,
          treatmentMixName: name,
          components: batchComponents,
          ...(recipe.notes ? { notes: recipe.notes } : {}),
          createdAt: now,
        },
      },
    ],
    undefined,
    requestedOperationId,
  );
};

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
  currentTimeZone: resolveFarmTimeZone(),

  setCurrentCompanyId: (companyId, timeZone) => set({ currentCompanyId: companyId, currentTimeZone: resolveFarmTimeZone(timeZone) }),

  initializeForCompany: (companyId: string, timeZone?: string) => {
    set({ currentCompanyId: companyId, currentTimeZone: resolveFarmTimeZone(timeZone), loading: true });
    let feedsLoaded = false;
    let additivesLoaded = false;
    let feedsSnapshotVersion = 0;
    let additivesSnapshotVersion = 0;

    const userId = auth.currentUser?.uid;
    if (userId) {
      void Promise.all([
        loadOfflineCollectionWithMutations<Feed>(
          userId,
          companyId,
          'inventory-feeds',
          ['companies', companyId, 'feeds'],
        ),
        loadOfflineCollectionWithMutations<Additive>(
          userId,
          companyId,
          'inventory-additives',
          ['companies', companyId, 'additives'],
        ),
      ]).then(([cachedFeeds, cachedAdditives]) => {
        if (get().currentCompanyId !== companyId) return;
        set({
          ...(cachedFeeds.length > 0 && feedsSnapshotVersion === 0 ? { feeds: cachedFeeds } : {}),
          ...(cachedAdditives.length > 0 && additivesSnapshotVersion === 0 ? { additives: cachedAdditives } : {}),
          loading: false,
        });
      });
    }

    const feedsRef = query(collection(db, 'companies', companyId, 'feeds'), where('companyId', '==', companyId));
    const unsubscribeFeeds = onSnapshot(feedsRef, { includeMetadataChanges: true }, (snapshot) => {
      const remoteFeeds = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Feed[];
      if (snapshot.metadata.fromCache && remoteFeeds.length === 0) return;
      const snapshotVersion = ++feedsSnapshotVersion;
      void (async () => {
        const feeds = userId
          ? await overlayOfflineMutations(remoteFeeds, userId, companyId, ['companies', companyId, 'feeds'])
          : remoteFeeds;
        if (get().currentCompanyId !== companyId || snapshotVersion !== feedsSnapshotVersion) return;
        set({ feeds });
        if (userId) await persistOfflineCollection(userId, companyId, 'inventory-feeds', feeds);
        feedsLoaded = true;
        if (feedsLoaded && additivesLoaded) set({ loading: false });
      })().catch((error) => {
        console.error('Failed to apply pending feed changes:', error);
        if (get().currentCompanyId === companyId && snapshotVersion === feedsSnapshotVersion) set({ feeds: remoteFeeds });
      });
    }, (err) => {
      console.error('feeds snapshot error', err);
      feedsLoaded = true;
      if (feedsLoaded && additivesLoaded) set({ loading: false });
    });

    const additivesRef = query(collection(db, 'companies', companyId, 'additives'), where('companyId', '==', companyId));
    const unsubscribeAdditives = onSnapshot(additivesRef, { includeMetadataChanges: true }, (snapshot) => {
      const remoteAdditives = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Additive[];
      if (snapshot.metadata.fromCache && remoteAdditives.length === 0) return;
      const snapshotVersion = ++additivesSnapshotVersion;
      void (async () => {
        const additives = userId
          ? await overlayOfflineMutations(remoteAdditives, userId, companyId, ['companies', companyId, 'additives'])
          : remoteAdditives;
        if (get().currentCompanyId !== companyId || snapshotVersion !== additivesSnapshotVersion) return;
        set({ additives });
        if (userId) await persistOfflineCollection(userId, companyId, 'inventory-additives', additives);
        additivesLoaded = true;
        if (feedsLoaded && additivesLoaded) set({ loading: false });
      })().catch((error) => {
        console.error('Failed to apply pending additive changes:', error);
        if (get().currentCompanyId === companyId && snapshotVersion === additivesSnapshotVersion) set({ additives: remoteAdditives });
      });
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
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    if (feed.id && get().feeds.some(item => item.id === feed.id)) {
      await persistInventoryCache(currentCompanyId, get().feeds, get().additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
      return;
    }
    const hasStock = (feed.totalStock || 0) > 0;
    if (hasStock && (feed.totalCost || 0) <= 0) throw new Error('Feed price must be greater than 0');
    if ((feed.stockInHistory || []).some((stock) => !Number.isFinite(stock.price) || stock.price <= 0)) {
      throw new Error('Feed stock-in price must be greater than 0');
    }
    try {
      const ref = feed.id ? doc(db, 'companies', currentCompanyId, 'feeds', feed.id) : doc(collection(db, 'companies', currentCompanyId, 'feeds'));
      const now = Timestamp.now();
      const newFeed: Feed = {
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
      await saveDurableMutation({
        id: createOfflineOperationId(`feed-create-${ref.id}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', currentCompanyId, 'feeds', ref.id],
        data: newFeed as unknown as Record<string, unknown>,
        merge: false,
        createOnly: true,
        serverTimestampFields: ['createdAt', 'lastUpdated'],
      }, { deferFlush: true });
      const feeds = [...get().feeds.filter((item) => item.id !== ref.id), newFeed];
      set({ feeds });
      await persistInventoryCache(currentCompanyId, feeds, get().additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
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
    const feed = get().feeds.find((item) => item.id === feedId);
    if (!feed) throw new Error('Feed not found');
    const feeds = await queueInventoryAdjustments(
      currentCompanyId,
      'feeds',
      `feed-stock-${feedId}`,
      get().feeds,
      (operationId) => [{
        itemId: feedId,
        action: 'stockIn',
        quantity,
        price,
        historyEntry: {
          id: `${operationId}:${feedId}`,
          date: opts.stockDate || isoDate(new Date(), get().currentTimeZone),
          quantity,
          price,
          notes,
          expiry: opts.expiry,
          unit: opts.unit || feed.unit || 'kg',
          createdAt: Timestamp.now(),
        },
      }],
      undefined,
      opts.operationId,
    );
    set({ feeds });
  },

  useFeed: async (feedId, quantity, pondId?: string | null, notes?: string, requestedOperationId?: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0');
    const feed = get().feeds.find((item) => item.id === feedId);
    if (!feed) throw new Error('Feed not found');
    if (requestedOperationId && feed.usageHistory.some(entry => entry.id === `${requestedOperationId}:${feed.id}`)) {
      await persistInventoryCache(currentCompanyId, get().feeds, get().additives);
      requestOfflineMutationFlush(auth.currentUser!.uid, currentCompanyId);
      return;
    }
    const currentStock = Number(feed.totalStock) || 0;
    if (quantity > currentStock) throw new Error('Insufficient stock');
    const unitPrice = currentStock > 0 ? (Number(feed.totalCost) || 0) / currentStock : 0;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Feed cost is missing. Stock this feed with a price before recording usage.');
    const pond = pondId ? usePondStore.getState().ponds.find((item) => item.id === pondId) : undefined;
    const feeds = await queueInventoryAdjustments(
      currentCompanyId,
      'feeds',
      `feed-use-${feedId}`,
      get().feeds,
      (operationId) => [{
        itemId: feedId,
        action: 'consume',
        quantity,
        historyEntry: {
          id: `${operationId}:${feedId}`,
          date: isoDate(new Date(), get().currentTimeZone),
          quantity,
          unitPrice,
          totalCost: quantity * unitPrice,
          ...(pondId ? {
            pondId,
            cycleId: pond?.cycleId,
            cycleName: pond?.cycleName,
            pondCycleId: pond?.pondCycleId || pondId,
          } : {}),
          ...(notes ? { notes } : {}),
          createdAt: Timestamp.now(),
        },
      }],
      undefined,
      requestedOperationId,
    );
    set({ feeds });
    const updatedFeed = feeds.find((item) => item.id === feedId);
    if (updatedFeed && (feed.reorderLevel || 0) > 0 && updatedFeed.totalStock <= (feed.reorderLevel || 0)) {
      void NotificationService.createLowStockNotification(
        currentCompanyId,
        feed.feedName,
        'feed',
        updatedFeed.totalStock,
        feed.reorderLevel || 0,
        feed.unit || 'kg',
        feedId,
      ).catch((error) => console.error('Error creating low-stock notification:', error));
    }
  },

  adjustFeedUsage: async (feedId, quantityDelta, pondId?: string | null, notes?: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) return;

    const feed = get().feeds.find((item) => item.id === feedId);
    if (!feed) throw new Error('Feed not found');
    const currentStock = Number(feed.totalStock) || 0;
    const currentCost = Number(feed.totalCost) || 0;
    const isDeduction = quantityDelta > 0;
    const quantity = Math.abs(quantityDelta);
    if (isDeduction && quantity > currentStock) throw new Error('Insufficient stock');
    const matchingUsage = (feed.usageHistory || []).filter((usage) => (
      usage.pondId === pondId && usage.notes === notes && Number(usage.quantity) > 0
    )).slice().reverse().find((usage) => Number(usage.unitPrice) > 0 || Number(usage.totalCost) > 0);
    const historicalUnitPrice = matchingUsage
      ? Number(matchingUsage.unitPrice) || (Number(matchingUsage.totalCost) / Number(matchingUsage.quantity))
      : 0;
    const unitPrice = isDeduction ? (currentStock > 0 ? currentCost / currentStock : historicalUnitPrice) : getUsageReturnCost((feed.usageHistory || []).filter(usage => usage.pondId === pondId && usage.notes === notes), quantity).unitPrice;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Feed cost is missing. Stock this feed with a price before recording usage.');
    const pond = pondId ? usePondStore.getState().ponds.find((item) => item.id === pondId) : undefined;
    const feeds = await queueInventoryAdjustments(
      currentCompanyId,
      'feeds',
      `feed-adjust-${feedId}`,
      get().feeds,
      (operationId) => [{
        itemId: feedId,
        action: isDeduction ? 'consume' : 'restore',
        quantity,
        historyEntry: {
          id: `${operationId}:${feedId}`,
          date: isoDate(new Date(), get().currentTimeZone),
          quantity: quantityDelta,
          unitPrice,
          totalCost: quantityDelta * unitPrice,
          ...(pondId ? { pondId, cycleId: pond?.cycleId, cycleName: pond?.cycleName, pondCycleId: pond?.pondCycleId || pondId } : {}),
          ...(notes ? { notes } : {}),
          createdAt: Timestamp.now(),
        },
      }],
    );
    set({ feeds });
  },

  reconcileDailyFeedAllocations: async (previousAllocations, nextAllocations, pondId, date, feedingResponse) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error(DAILY_FEED_ERROR_CODES.companyUnavailable);

    if (nextAllocations.length === 0) {
      throw new Error(DAILY_FEED_ERROR_CODES.feedSelectionRequired);
    }

    if (nextAllocations.some((allocation) => (
      !allocation.inventoryFeedId ||
      !Number.isFinite(allocation.quantityKg) ||
      allocation.quantityKg <= 0
    ))) {
      throw new Error(DAILY_FEED_ERROR_CODES.invalidAllocation);
    }

    const previous = normalizeFeedAllocations({ feedAllocations: previousAllocations });
    const next = normalizeFeedAllocations({ feedAllocations: nextAllocations });
    const desiredByFeedId = new Map(next.map((allocation) => [allocation.inventoryFeedId, allocation.quantityKg]));

    const feedIds = Array.from(new Set([
      ...previous.map((allocation) => allocation.inventoryFeedId),
      ...next.map((allocation) => allocation.inventoryFeedId),
    ]));
    if (feedIds.length === 0) return;

    const pond = usePondStore.getState().ponds.find((item) => item.id === pondId);
    const feedRecordId = buildDailyFeedRecordId(pondId, date);

    const changes = feedIds.flatMap((feedId) => {
      const feed = get().feeds.find((item) => item.id === feedId);
      if (!feed) {
        if (desiredByFeedId.has(feedId)) throw new Error(DAILY_FEED_ERROR_CODES.inventoryNotFound);
        return [];
      }
      const currentStock = Number(feed.totalStock) || 0;
      const currentCost = Number(feed.totalCost) || 0;
      const currentDailyTotal = getDailyFeedUsageTotal(feed.usageHistory, pondId, date);
      const desiredDailyTotal = desiredByFeedId.get(feedId) || 0;
      const quantityDelta = desiredDailyTotal - currentDailyTotal;
      if (Math.abs(quantityDelta) < 0.000001) return [];
      if (quantityDelta > 0 && quantityDelta > currentStock) throw new Error(DAILY_FEED_ERROR_CODES.insufficientStock);
      const matchingUsage = (feed.usageHistory || [])
        .filter((usage) => isDailyFeedUsage(usage, pondId, date) && Number(usage.quantity) > 0)
        .slice().reverse()
        .find((usage) => Number(usage.unitPrice) > 0 || Number(usage.totalCost) > 0);
      const historicalUnitPrice = matchingUsage
        ? Number(matchingUsage.unitPrice) || (Number(matchingUsage.totalCost) / Number(matchingUsage.quantity))
        : 0;
      const unitPrice = quantityDelta > 0 && currentStock > 0
        ? currentCost / currentStock
        : getUsageReturnCost((feed.usageHistory || []).filter(usage => isDailyFeedUsage(usage, pondId, date)), Math.abs(quantityDelta)).unitPrice;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error(DAILY_FEED_ERROR_CODES.missingCost);
      return [{ feed, feedId, quantityDelta, unitPrice }];
    });
    const feeds = await queueInventoryAdjustments(
      currentCompanyId,
      'feeds',
      `daily-feed-${feedRecordId}`,
      get().feeds,
      (operationId) => changes.map(({ feedId, quantityDelta, unitPrice }) => ({
        itemId: feedId,
        action: quantityDelta > 0 ? 'consume' : 'restore',
        quantity: Math.abs(quantityDelta),
        historyEntry: {
          id: `${operationId}:${feedId}`,
          date,
          quantity: quantityDelta,
          unitPrice,
          totalCost: quantityDelta * unitPrice,
          pondId,
          cycleId: pond?.cycleId || null,
          cycleName: pond?.cycleName || null,
          pondCycleId: pond?.pondCycleId || pondId,
          notes: 'Feed screen record',
          source: DAILY_FEED_USAGE_SOURCE,
          feedRecordId,
          createdAt: Timestamp.now(),
        },
      })),
      { pondId, date, allocations: next, previousFeedIds: feedIds, feedingResponse: feedingResponse ?? null },
    );
    set({ feeds });
    const lowStockItems = changes.flatMap(({ feed, feedId, quantityDelta }) => {
      const updatedFeed = feeds.find((item) => item.id === feedId);
      const reorderLevel = Number(feed.reorderLevel) || 0;
      return quantityDelta > 0 && updatedFeed && reorderLevel > 0 && updatedFeed.totalStock <= reorderLevel
        ? [{ feedId, feedName: feed.feedName, totalStock: updatedFeed.totalStock, reorderLevel, unit: feed.unit || 'kg' }]
        : [];
    });

    await Promise.all(lowStockItems.map((item) => NotificationService.createLowStockNotification(
      currentCompanyId,
      item.feedName,
      'feed',
      item.totalStock,
      item.reorderLevel,
      item.unit,
      item.feedId,
    ).catch((error) => {
      console.error('Error creating low-stock notification after daily feed reconciliation:', error);
    })));
  },

  deleteDailyFeedRecord: async (pondId, samplingId, date, updatedBy, candidateFeedIds = []) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error(DAILY_FEED_ERROR_CODES.companyUnavailable);
    const pondData = usePondStore.getState().ponds.find((pond) => pond.id === pondId);
    if (!pondData) return { missingInventory: false };
    const samplings = Array.isArray(pondData.samplings) ? [...pondData.samplings] : [];
    const samplingIndex = samplings.findIndex((sampling) => sampling.id === samplingId && sampling.date === date && Boolean(sampling.feedData));
    if (samplingIndex < 0) return { missingInventory: false };
    const feedData = samplings[samplingIndex].feedData;
    const allocations = normalizeFeedAllocations(feedData);
    if (allocations.length === 0) throw new Error(DAILY_FEED_ERROR_CODES.feedRecordMissingInventory);
    const feedIds = Array.from(new Set([
      ...allocations.map((allocation) => allocation.inventoryFeedId),
      ...candidateFeedIds.filter(Boolean),
    ]));
    let restoredQuantity = 0;
    const restorations = feedIds.flatMap((feedId) => {
      const feed = get().feeds.find((item) => item.id === feedId);
      if (!feed) return [];
      const quantityToRestore = getDailyFeedUsageTotal(feed.usageHistory, pondId, date);
      if (!Number.isFinite(quantityToRestore) || quantityToRestore <= 0) return [];
      const unitPrice = getUsageReturnCost((feed.usageHistory || []).filter(usage => isDailyFeedUsage(usage, pondId, date)), quantityToRestore).unitPrice;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error(DAILY_FEED_ERROR_CODES.missingCost);
      restoredQuantity += quantityToRestore;
      return [{ feedId, quantityToRestore, unitPrice }];
    });
    if (restorations.length > 0) {
      const feedRecordId = buildDailyFeedRecordId(pondId, date);
      const feeds = await queueInventoryAdjustments(
        currentCompanyId,
        'feeds',
        `daily-feed-delete-${feedRecordId}`,
        get().feeds,
        (operationId) => restorations.map(({ feedId, quantityToRestore, unitPrice }) => ({
          itemId: feedId,
          action: 'restore',
          quantity: quantityToRestore,
          historyEntry: {
            id: `${operationId}:${feedId}`,
            date,
            quantity: -quantityToRestore,
            unitPrice,
            totalCost: -(quantityToRestore * unitPrice),
            pondId,
            cycleId: feedData?.cycleId || pondData.cycleId || null,
            cycleName: feedData?.cycleName || pondData.cycleName || null,
            pondCycleId: feedData?.pondCycleId || pondData.pondCycleId || pondId,
            notes: 'Deleted feed record returned to inventory',
            source: DAILY_FEED_USAGE_SOURCE,
            feedRecordId,
            createdAt: Timestamp.now(),
          },
        })),
      );
      set({ feeds });
    }
    const samplingWithoutFeedData = { ...samplings[samplingIndex] };
    delete samplingWithoutFeedData.feedData;
    samplingWithoutFeedData.feedEntryStatus = 'not_recorded';
    samplings[samplingIndex] = samplingWithoutFeedData;
    usePondStore.getState().updateSampling(pondId, samplingId, {
      ...samplingWithoutFeedData,
      feedData: undefined,
    });
    return { missingInventory: restoredQuantity + 0.000001 < sumFeedAllocations(allocations) };
  },

  deleteFeed: async (feedId) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    const item = get().feeds.find(item => item.id === feedId);
    if (item && (item.stockInHistory.length || item.usageHistory.length)) throw new Error('This item has financial history and cannot be deleted.');
    try {
      await saveDurableMutation({
        id: createOfflineOperationId(`feed-delete-${feedId}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['companies', currentCompanyId, 'feeds', feedId],
      }, { deferFlush: true });
      const feeds = get().feeds.filter((item) => item.id !== feedId);
      set({ feeds });
      await persistInventoryCache(currentCompanyId, feeds, get().additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
    } catch (e) {
      console.error('deleteFeed failed', e);
      throw e;
    }
  },

  updateFeed: async (feedId, patch) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    try {
      const existing = get().feeds.find((item) => item.id === feedId);
      if (!existing) throw new Error('Feed not found');
      const updatedFeed = { ...existing, ...patch, id: feedId, lastUpdated: Timestamp.now() };
      await saveDurableMutation({
        id: createOfflineOperationId(`feed-update-${feedId}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', currentCompanyId, 'feeds', feedId],
        data: { ...patch, id: feedId, lastUpdated: updatedFeed.lastUpdated } as unknown as Record<string, unknown>,
        merge: true,
        serverTimestampFields: ['lastUpdated'],
      }, { deferFlush: true });
      const feeds = get().feeds.map((item) => item.id === feedId ? updatedFeed : item);
      set({ feeds });
      await persistInventoryCache(currentCompanyId, feeds, get().additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
    } catch (e) {
      console.error('updateFeed failed', e);
      throw e;
    }
  },

  addAdditive: async (additive) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    if (additive.id && get().additives.some(item => item.id === additive.id)) {
      await persistInventoryCache(currentCompanyId, get().feeds, get().additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
      return;
    }
    const hasStock = (additive.totalStock || 0) > 0;
    if (hasStock && (additive.totalCost || 0) <= 0) throw new Error('Additive price must be greater than 0');
    if ((additive.stockInHistory || []).some((stock) => !Number.isFinite(stock.price) || stock.price <= 0)) {
      throw new Error('Additive stock-in price must be greater than 0');
    }
    try {
      const ref = additive.id ? doc(db, 'companies', currentCompanyId, 'additives', additive.id) : doc(collection(db, 'companies', currentCompanyId, 'additives'));
      const now = Timestamp.now();
      const newAdditive: Additive = {
        id: ref.id,
        companyId: currentCompanyId,
        additiveName: additive.additiveName || 'Unnamed Additive',
        category: (additive.category as any) || 'Other',
        inventoryKind: 'additive',
        ...(additive.productLabel ? { productLabel: additive.productLabel } : {}),
        unit: additive.unit || 'kg',
        reorderLevel: typeof additive.reorderLevel === 'number' ? additive.reorderLevel : 0,
        stockInHistory: additive.stockInHistory || [],
        usageHistory: additive.usageHistory || [],
        totalStock: additive.totalStock || 0,
        totalCost: additive.totalCost || 0,
        lastUpdated: now,
        createdAt: now,
      };
      await saveDurableMutation({
        id: createOfflineOperationId(`additive-create-${ref.id}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', currentCompanyId, 'additives', ref.id],
        data: newAdditive as unknown as Record<string, unknown>,
        merge: false,
        createOnly: true,
        serverTimestampFields: ['createdAt', 'lastUpdated'],
      }, { deferFlush: true });
      const additives = [...get().additives.filter((item) => item.id !== ref.id), newAdditive];
      set({ additives });
      await persistInventoryCache(currentCompanyId, get().feeds, additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
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
    const additive = get().additives.find((item) => item.id === additiveId);
    if (!additive) throw new Error('Additive not found');
    const additives = await queueInventoryAdjustments(
      currentCompanyId,
      'additives',
      `additive-stock-${additiveId}`,
      get().additives,
      (operationId) => [{
        itemId: additiveId,
        action: 'stockIn',
        quantity,
        price,
        historyEntry: {
          id: `${operationId}:${additiveId}`,
          date: opts.stockDate || isoDate(new Date(), get().currentTimeZone),
          quantity,
          price,
          notes,
          expiry: opts.expiry,
          unit: opts.unit || additive.unit || 'kg',
          createdAt: Timestamp.now(),
        },
      }],
      undefined,
      opts.operationId,
    );
    set({ additives });
  },

  useAdditive: async (additiveId, quantity, pondId?: string | null, notes?: string, requestedOperationId?: string) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantity must be greater than 0');
    const additive = get().additives.find((item) => item.id === additiveId);
    if (!additive) throw new Error('Additive not found');
    if (requestedOperationId && additive.usageHistory.some(entry => entry.id === `${requestedOperationId}:${additive.id}`)) {
      await persistInventoryCache(currentCompanyId, get().feeds, get().additives);
      requestOfflineMutationFlush(auth.currentUser!.uid, currentCompanyId);
      return;
    }
    const currentStock = Number(additive.totalStock) || 0;
    if (quantity > currentStock) throw new Error('Insufficient stock');
    const unitPrice = currentStock > 0 ? (Number(additive.totalCost) || 0) / currentStock : 0;
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Additive cost is missing. Stock this additive with a price before recording usage.');
    const pond = pondId ? usePondStore.getState().ponds.find((item) => item.id === pondId) : undefined;
    const additives = await queueInventoryAdjustments(
      currentCompanyId,
      'additives',
      `additive-use-${additiveId}`,
      get().additives,
      (operationId) => [{
        itemId: additiveId,
        action: 'consume',
        quantity,
        historyEntry: {
          id: `${operationId}:${additiveId}`,
          date: isoDate(new Date(), get().currentTimeZone),
          quantity,
          unitPrice,
          totalCost: quantity * unitPrice,
          ...(pondId ? { pondId, cycleId: pond?.cycleId, cycleName: pond?.cycleName, pondCycleId: pond?.pondCycleId || pondId } : {}),
          ...(notes ? { notes } : {}),
          createdAt: Timestamp.now(),
        },
      }],
      undefined,
      requestedOperationId,
    );
    set({ additives });
    const updatedAdditive = additives.find((item) => item.id === additiveId);
    if (updatedAdditive && (additive.reorderLevel || 0) > 0 && updatedAdditive.totalStock <= (additive.reorderLevel || 0)) {
      void NotificationService.createLowStockNotification(
        currentCompanyId,
        additive.additiveName,
        'additive',
        updatedAdditive.totalStock,
        additive.reorderLevel || 0,
        additive.unit || 'kg',
        additiveId,
      ).catch((error) => console.error('Error creating low-stock notification:', error));
    }
  },

  createTreatmentMix: async ({ name, yieldLiters, components, notes, operationId }) => {
    const { currentCompanyId, currentTimeZone, additives } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error('Treatment mix name is required');
    if (additives.some((item) => item.id !== operationId && item.additiveName.trim().toLowerCase() === normalizedName.toLowerCase())) {
      throw new Error('An additive or treatment mix with this name already exists');
    }
    const ref = operationId ? doc(db, 'companies', currentCompanyId, 'additives', operationId) : doc(collection(db, 'companies', currentCompanyId, 'additives'));
    const updatedAdditives = await produceTreatmentMixBatch({
      companyId: currentCompanyId,
      treatmentMixId: ref.id,
      treatmentMixName: normalizedName,
      recipe: {
        yieldLiters,
        components,
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      },
      createNew: true,
      timeZone: currentTimeZone,
      additives,
      operationId,
    });
    set({ additives: updatedAdditives });
    return ref.id;
  },

  makeTreatmentMixBatch: async (treatmentMixId, operationId) => {
    const { currentCompanyId, currentTimeZone, additives } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const updatedAdditives = await produceTreatmentMixBatch({
      companyId: currentCompanyId,
      treatmentMixId,
      createNew: false,
      timeZone: currentTimeZone,
      additives,
      operationId,
    });
    set({ additives: updatedAdditives });
  },

  useTreatmentMix: async (treatmentMixId, pond, ppm, notes, requestedOperationId) => {
    const { currentCompanyId, currentTimeZone } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const dose = calculateTreatmentDoseLiters(pond.areaM2, ppm, ASSUMED_POND_DEPTH_METERS);
    const activePond = usePondStore.getState().ponds.find((item) => item.id === pond.id);
    const mix = get().additives.find((item) => item.id === treatmentMixId);
    if (!mix) throw new Error('Treatment mix not found');
    const previous = requestedOperationId ? mix.usageHistory.find(entry => entry.id === `${requestedOperationId}:${treatmentMixId}`) : undefined;
    if (previous) {
      await persistInventoryCache(currentCompanyId, get().feeds, get().additives);
      requestOfflineMutationFlush(auth.currentUser!.uid, currentCompanyId);
      return { quantityLiters: previous.quantity, totalCost: previous.totalCost || 0 };
    }
    if (mix.inventoryKind !== 'treatmentMix') throw new Error('Selected item is not a treatment mix');
    if ((mix.totalStock || 0) + 0.0005 < dose.requiredMixLiters) {
      throw new Error(`Insufficient ${mix.additiveName}: need ${dose.requiredMixLiters} L, available ${mix.totalStock || 0} L`);
    }
    const cost = calculateFifoConsumption(mix.stockInHistory || [], mix.usageHistory || [], dose.requiredMixLiters);
    const additives = await queueInventoryAdjustments(
      currentCompanyId,
      'additives',
      `treatment-use-${treatmentMixId}`,
      get().additives,
      (operationId) => [{
        itemId: treatmentMixId,
        action: 'consume',
        quantity: dose.requiredMixLiters,
        useFifoCost: true,
        historyEntry: {
          id: `${operationId}:${treatmentMixId}`,
          date: isoDate(new Date(), currentTimeZone),
          quantity: dose.requiredMixLiters,
          unitPrice: cost.unitPrice,
          totalCost: cost.totalCost,
          source: 'treatmentMixApplication',
          treatmentMixId,
          treatmentMixName: mix.additiveName,
          pondId: pond.id,
          pondName: pond.name,
          pondAreaM2: pond.areaM2,
          ppm,
          assumedDepthM: ASSUMED_POND_DEPTH_METERS,
          pondVolumeLiters: dose.pondVolumeLiters,
          ...(activePond?.cycleId ? { cycleId: activePond.cycleId } : {}),
          ...(activePond?.cycleName ? { cycleName: activePond.cycleName } : {}),
          ...(activePond?.pondCycleId ? { pondCycleId: activePond.pondCycleId } : {}),
          ...(notes?.trim() ? { notes: notes.trim() } : {}),
          createdAt: Timestamp.now(),
        },
      }],
      undefined,
      requestedOperationId,
    );
    set({ additives });
    return { quantityLiters: dose.requiredMixLiters, totalCost: cost.totalCost };
  },

  deleteAdditive: async (additiveId) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    const item = get().additives.find(item => item.id === additiveId);
    if (item && (item.stockInHistory.length || item.usageHistory.length)) throw new Error('This item has financial history and cannot be deleted.');
    try {
      await saveDurableMutation({
        id: createOfflineOperationId(`additive-delete-${additiveId}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['companies', currentCompanyId, 'additives', additiveId],
      }, { deferFlush: true });
      const additives = get().additives.filter((item) => item.id !== additiveId);
      set({ additives });
      await persistInventoryCache(currentCompanyId, get().feeds, additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
    } catch (e) {
      console.error('deleteAdditive failed', e);
      throw e;
    }
  },

  updateAdditive: async (additiveId, patch) => {
    const { currentCompanyId } = get();
    if (!currentCompanyId) throw new Error('No company selected');
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    try {
      const existing = get().additives.find((item) => item.id === additiveId);
      if (!existing) throw new Error('Additive not found');
      const updatedAdditive = { ...existing, ...patch, id: additiveId, lastUpdated: Timestamp.now() };
      await saveDurableMutation({
        id: createOfflineOperationId(`additive-update-${additiveId}`),
        userId,
        companyId: currentCompanyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', currentCompanyId, 'additives', additiveId],
        data: { ...patch, id: additiveId, lastUpdated: updatedAdditive.lastUpdated } as unknown as Record<string, unknown>,
        merge: true,
        serverTimestampFields: ['lastUpdated'],
      }, { deferFlush: true });
      const additives = get().additives.map((item) => item.id === additiveId ? updatedAdditive : item);
      set({ additives });
      await persistInventoryCache(currentCompanyId, get().feeds, additives);
      requestOfflineMutationFlush(userId, currentCompanyId);
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
    
    for (const additive of additives.filter((item) => item.inventoryKind !== 'treatmentMix')) {
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
      const qty = (f.stockInHistory || []).filter(h => !h.voided).reduce((s, h) => s + (h.quantity || 0), 0);
      if (qty > 0) {
        feedUnitSum += qty;
        feedCostSum += (f.totalCost || 0);
      }
    });
    const avgFeedCostPerUnit = feedUnitSum > 0 ? feedCostSum / feedUnitSum : 0;

    let addUnitSum = 0;
    let addCostSum = 0;
    additives.forEach((a) => {
      const qty = (a.stockInHistory || []).filter(h => !h.voided).reduce((s, h) => s + (h.quantity || 0), 0);
      if (qty > 0) {
        addUnitSum += qty;
        addCostSum += (a.totalCost || 0);
      }
    });
    const avgAdditiveCostPerUnit = addUnitSum > 0 ? addCostSum / addUnitSum : 0;

    const totalInventoryValue =
      feeds.reduce((sum, f) => {
        const qtySum = (f.stockInHistory || []).filter(h => !h.voided).reduce((s, h) => s + (h.quantity || 0), 0);
        const avg = qtySum > 0 ? (f.totalCost || 0) / qtySum : 0;
        return sum + (f.totalStock || 0) * avg;
      }, 0) +
      additives.reduce((sum, a) => {
        const qtySum = (a.stockInHistory || []).filter(h => !h.voided).reduce((s, h) => s + (h.quantity || 0), 0);
        const avg = qtySum > 0 ? (a.totalCost || 0) / qtySum : 0;
        return sum + (a.totalStock || 0) * avg;
      }, 0);

    const lowStockCount = feeds.filter(f => typeof f.reorderLevel === 'number' && f.totalStock <= (f.reorderLevel || 0)).length
      + additives.filter(a => a.inventoryKind !== 'treatmentMix' && typeof a.reorderLevel === 'number' && a.totalStock <= (a.reorderLevel || 0)).length;

    const now = new Date();
    const nearExpiryCount = (() => {
      let cnt = 0;
      const checkExpiry = (h?: StockHistory[]) => {
        (h || []).filter(s => !s.voided).forEach(s => {
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

  getRecentTransactions: (limit = 10, options?: { includeVoided?: boolean }) => {
    const { feeds, additives } = get();
    const txs: any[] = [];
    const includeVoided = Boolean(options?.includeVoided);

    feeds.forEach((f) => {
      (f.stockInHistory || []).forEach((h) => {
        if (!h.voided || includeVoided) {
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
            voided: Boolean(h.voided),
            voidedAt: h.voidedAt,
            voidedBy: h.voidedBy,
          });
        }
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

    additives.filter((item) => item.inventoryKind !== 'treatmentMix').forEach((a) => {
      (a.stockInHistory || []).forEach((h) => {
        if (!h.voided || includeVoided) {
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
            voided: Boolean(h.voided),
            voidedAt: h.voidedAt,
            voidedBy: h.voidedBy,
          });
        }
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

    additives.filter((item) => item.inventoryKind !== 'treatmentMix').forEach((a) => {
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
      (item.stockInHistory || []).filter((h: StockHistory) => !h.voided).forEach((h: StockHistory) => {
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
    additives.filter((item) => item.inventoryKind !== 'treatmentMix').forEach((a) => check(a, 'Additive'));
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
    additives.filter((item) => item.inventoryKind !== 'treatmentMix').forEach((a) => {
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
