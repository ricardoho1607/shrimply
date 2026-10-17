import { getUserErrorMessage } from '../../shared/userError';
import { AppAlert as Alert } from '../../components/alerts/appAlert';
import { useSaveOperation } from '../../shared/useSaveOperation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import app, { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationService } from '../services/notificationService';
import AppDatePicker from '../components/forms/AppDatePicker';
import { useFeedAdditiveStore, type Additive, type Feed } from './../store/feedAdditiveStore';
import { createOfflineOperationId } from '../services/offlineWorkspace';
import { isPondCycleActive, usePondStore } from './../store/pondStore';
import TreatmentMixesScreen from './treatmentMixes';
import { getFarmDateKey } from '../../shared/farmDate';
import { inventoryUsageDateFromPicker } from '../../shared/inventoryUsageDate';
import { buildInventoryProductLabel } from '../../shared/productLabel';
import { useAgentOperations } from '../../orson/useAgentOperations';
import OrsonAgentCards from '../components/OrsonAgentCards';
import { hasFarmPermission } from '../../shared/permissions';
import type { OrsonCommand } from '../../shared/orsonAgentContract';

type FormData = {
  itemName: string;
  brand?: string;
  category: string;
  quantity: string;
  unitPrice: string;
  pondId: string;
  notes: string;
  unit?: string;
  stockDate: string;
  usageDate: string;
  expiry?: string;
  reorderLevel?: string;
  manufacturer: string;
  ingredients: string;
  labelSourceUrl: string;
};

type ModalType = 'add' | 'stockIn' | 'usage' | 'history' | 'editReorder';
type ItemType = 'feed' | 'additive';

const UNITS = ['kg', 'L', 'pack', 'sack'];
const FEED_CATEGORIES = ['Starter', 'Grower', 'Finisher', 'Other'];
const ADDITIVE_CATEGORIES = ['Water Conditioner', 'Probiotic', 'Mineral', 'Vitamin', 'Other'];

const getEmptyFormData = (type: ItemType, stockDate: string): FormData => ({
  itemName: '', brand: '', category: type === 'feed' ? 'Grower' : 'Water Conditioner', quantity: '', unitPrice: '', pondId: '', notes: '', unit: 'kg', stockDate, usageDate: stockDate, expiry: '', reorderLevel: '', manufacturer: '', ingredients: '', labelSourceUrl: '',
});

const formatDate = (date: any): string => {
  if (!date) return '';
  const d = date.seconds
    ? new Date(date.seconds * 1000)
    : date instanceof Date
      ? date
      : new Date(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date);
  return d.toLocaleDateString();
};

export default function FeedAdditivesScreen() {
  const { user, company } = useAuth();
  const identity = `${user?.uid || ''}:${company?.id || ''}`;
  return <FeedAdditivesScreenContent key={identity} />;
}

function FeedAdditivesScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const store = useFeedAdditiveStore();
  const { ponds } = usePondStore();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);

  const canEditInventory = hasFarmPermission(user, 'manageFeedInventory', company?.ownerId);
  const canUseOrson = hasFarmPermission(user, 'useOrson', company?.ownerId);

  const agentTransport = useCallback(async (name: string, data: Record<string, unknown>) => {
    const connection = await NetInfo.fetch();
    if (auth.currentUser?.uid !== user?.uid || connection.isConnected === false) {
      throw new Error('Reconnect and sign in to use farm actions.');
    }
    return (await httpsCallable(getFunctions(app), name, { timeout: 150000 })(data)).data;
  }, [user?.uid]);

  const agent = useAgentOperations(
    company?.id || '',
    user?.uid || '',
    agentTransport,
    AsyncStorage,
    false,
  );

  const [activeVoidOpId, setActiveVoidOpId] = useState<string | null>(null);
  const [preparingRecordId, setPreparingRecordId] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'dashboard' | ItemType | 'mix'>('dashboard');
  const { save, busy: savePending } = useSaveOperation();
  const [modalVisible, setModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [lowStockExpanded, setLowStockExpanded] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('add');
  const [itemType, setItemType] = useState<ItemType>('feed');
  const [selectedItem, setSelectedItem] = useState<Feed | Additive | null>(null);
  const [removingUsageId, setRemovingUsageId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'inStock' | 'outOfStock'>('inStock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'stockIn' | 'usage' | 'audit'>('all');
  const [formData, setFormData] = useState<FormData>(getEmptyFormData('feed', getFarmDateKey(new Date(), company?.timeZone)));

  useEffect(() => {
    if (company?.id) {
      store.setCurrentCompanyId(company.id, company.timeZone);
      store.initializeForCompany(company.id, company.timeZone);
    }
  }, [company?.id, company?.timeZone]);

  const getCategoryLabel = (category: string): string => {
    const map: Record<string, string> = { 'Starter': t.inventory.starter, 'Grower': t.inventory.grower, 'Finisher': t.inventory.finisher, 'Water Conditioner': t.inventory.waterConditioner, 'Probiotic': t.inventory.probiotic, 'Mineral': t.inventory.mineral, 'Vitamin': t.inventory.vitamin, 'Other': t.inventory.other };
    return map[category] || category;
  };

  const getUnitLabel = (unit: string): string => {
    const map: Record<string, string> = { 'kg': t.inventory.kg, 'L': t.inventory.liter, 'pack': t.inventory.pack, 'sack': t.inventory.sack };
    return map[unit] || unit;
  };

  const metrics = useMemo(() => {
    let totalFeedCost = 0;
    store.feeds.forEach(f => {
      (f.usageHistory || []).forEach(u => {
        const avgPrice = f.totalStock > 0 ? (f.totalCost || 0) / (f.totalStock + u.quantity) : 0;
        totalFeedCost += u.quantity * avgPrice;
      });
    });
    const totalAdditiveValue = store.additives.reduce((sum, a) => sum + (a.totalCost || 0), 0);
    const feedStockValue = store.feeds.reduce((sum, f) => sum + (f.totalCost || 0), 0);
    return { ...store.getMetrics(), totalFeedCost, totalAdditiveValue, feedStockValue };
  }, [store.feeds, store.additives]);

  const activeRecentTransactions = useMemo(() => store.getRecentTransactions(10), [store.feeds, store.additives]);
  const auditRecentTransactions = useMemo(() => {
    const txs: any[] = [];
    [...store.feeds, ...store.additives.filter((item) => item.inventoryKind !== 'treatmentMix')].forEach((item) => {
      const name = 'feedName' in item ? item.feedName : item.additiveName;
      const category = 'feedName' in item ? 'Feed' : 'Additive';
      (item.stockInHistory || []).filter((h) => h.voided).forEach((h) => {
        txs.push({
          id: h.id,
          type: 'Stock In',
          item: name,
          category,
          date: h.date,
          quantity: h.quantity,
          price: h.price,
          total: (h.quantity * h.price),
          createdAt: h.createdAt,
          voided: true,
          voidedAt: h.voidedAt,
          voidedBy: h.voidedBy,
        });
      });
    });
    return txs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || new Date(a.date).getTime();
      const timeB = b.createdAt?.toMillis?.() || new Date(b.date).getTime();
      return timeB - timeA;
    }).slice(0, 10);
  }, [store.feeds, store.additives]);

  const displayedRecentTransactions = useMemo(() => {
    if (recentActivityFilter === 'audit') return auditRecentTransactions;
    if (recentActivityFilter === 'stockIn') return activeRecentTransactions.filter(tx => tx.type === 'Stock In');
    if (recentActivityFilter === 'usage') return activeRecentTransactions.filter(tx => tx.type === 'Usage');
    return activeRecentTransactions;
  }, [recentActivityFilter, activeRecentTransactions, auditRecentTransactions]);
  const lowStockItems = useMemo(() => store.getLowStockItems(50), [store.feeds, store.additives]);

  const openTabVoidDrafts = useMemo(() => {
    return agent.operations
      .filter((op) => (op.state === 'draft' || op.state === 'partial') &&
        op.rows.some((r) => r.command.type === 'void_inventory_purchase' &&
          (activeTab === 'feed' ? r.command.itemType === 'feed' : r.command.itemType === 'additive')))
      .map((op) => op.id);
  }, [agent.operations, activeTab]);

  const filterItems = useCallback((items: (Feed | Additive)[], categoryKey: 'feedType' | 'category') => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const categoryMatch = !categoryFilter || (item as any)[categoryKey] === categoryFilter;
      const name = 'feedName' in item ? item.feedName : item.additiveName;
      const brand = 'brand' in item ? item.brand || '' : '';
      const searchMatch = !q || name.toLowerCase().includes(q) || brand.toLowerCase().includes(q);
      const stock = Number(item.totalStock ?? 0);
      const stockMatch =
        stockStatusFilter === 'all'
          ? true
          : stockStatusFilter === 'inStock'
            ? stock > 0
            : stock <= 0;
      return categoryMatch && searchMatch && stockMatch && (showArchived || !item.archived);
    });
  }, [searchQuery, categoryFilter, stockStatusFilter, showArchived]);

  const filteredFeeds = useMemo(() => filterItems(store.feeds, 'feedType'), [store.feeds, filterItems]);
  const filteredAdditives = useMemo(
    () => filterItems(store.additives.filter(item => item.inventoryKind !== 'treatmentMix'), 'category'),
    [store.additives, filterItems],
  );

  const pondUsageSummary = useMemo(() => {
    const map: Record<string, number> = {};
    [...store.feeds, ...store.additives].forEach(item => {
      item.usageHistory?.forEach((u: any) => {
        if (u.pondId) map[u.pondId] = (map[u.pondId] || 0) + (u.quantity || 0);
      });
    });
    return map;
  }, [store.feeds, store.additives]);

  const formatNumber = (num: number): string => num.toLocaleString('id-ID');

  const checkAndCreateLowStockNotification = useCallback(async (item: Feed | Additive, type: ItemType) => {
    if (!company?.id) return;
    
    const reorderLevel = item.reorderLevel ?? 0;
    const currentStock = item.totalStock ?? 0;
    
    if (reorderLevel > 0 && currentStock <= reorderLevel) {
      try {
        const itemName = type === 'feed' ? (item as Feed).feedName : (item as Additive).additiveName;
        
        await NotificationService.createLowStockNotification(
          company.id,
          itemName,
          type,
          currentStock,
          reorderLevel,
          item.unit || 'kg',
          item.id
        );
      } catch (error) {
        console.error('Error creating low stock notification:', error);
      }
    }
  }, [company]);

  const resetForm = useCallback(
    () => setFormData(getEmptyFormData(itemType, getFarmDateKey(new Date(), company?.timeZone))),
    [company?.timeZone, itemType],
  );

  const closeModal = useCallback(() => {
    if (save.busy) return;
    resetForm();
    setModalVisible(false);
    setSelectedItem(null);
    setModalType('add');
    setVoidError('');
    setActiveVoidOpId(null);
  }, [resetForm, save]);

  const handleAction = useCallback(async (action: () => Promise<void>, successMsg: string) => {
    if (!save.acquire()) return;
    try {
      await action();
      save.complete();
      save.release();
      Alert.alert(t.inventory.success, successMsg);
      closeModal();
      if (modalType === 'add') setActiveTab(itemType);
    } catch (err) {
      console.error('Inventory action failed:', err);
      Alert.alert(t.inventory.error, t.inventory.unknownError);
    }
    finally { save.release(); }
  }, [closeModal, modalType, itemType, t, save]);

  const handleAddItem = useCallback(() => {
    if (!formData.itemName || !formData.quantity || !formData.unitPrice) {
      return Alert.alert(t.inventory.error, t.inventory.requiredFields);
    }
    const qty = Number(formData.quantity);
    const price = Number(formData.unitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
      return Alert.alert(t.inventory.error, t.inventory.invalidQuantityOrPrice);
    }

    const stockInRecord: any = {
      id: save.id(`initial-stock:${itemType}`),
      date: formData.stockDate,
      quantity: qty,
      price,
      notes: formData.notes || '',
      unit: formData.unit || 'kg',
      ...(formData.expiry && { expiry: formData.expiry }),
    };

    const baseObj = { id: save.id(`item:${itemType}`), unit: formData.unit || 'kg', reorderLevel: Number(formData.reorderLevel || 0), stockInHistory: [stockInRecord], usageHistory: [], totalStock: qty, totalCost: qty * price, lastUpdated: new Date() };

    if (itemType === 'feed') {
      handleAction(() => store.addFeed({ feedName: formData.itemName, brand: formData.brand || '', feedType: (formData.category as any) || 'Grower', ...baseObj }), t.inventory.feedAddedSuccess);
    } else {
      const productLabel = buildInventoryProductLabel({
        manufacturer: formData.manufacturer,
        ingredientsText: formData.ingredients,
        sourceUrl: formData.labelSourceUrl,
        recordedAt: getFarmDateKey(new Date(), company?.timeZone),
      });
      handleAction(() => store.addAdditive({
        additiveName: formData.itemName,
        category: (formData.category as any) || 'Other',
        ...(productLabel ? { productLabel } : {}),
        ...baseObj,
      }), t.inventory.additiveAddedSuccess);
    }
  }, [formData, itemType, store, handleAction, t, company?.timeZone, save]);

  const handleStockIn = useCallback(() => {
    if (!selectedItem || !formData.quantity || !formData.unitPrice) return Alert.alert(t.inventory.error, t.inventory.quantityAndPriceRequired);
    const qty = Number(formData.quantity);
    const price = Number(formData.unitPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) return Alert.alert(t.inventory.error, t.inventory.invalidValues);

    const method = itemType === 'feed' ? store.stockInFeed : store.stockInAdditive;
    handleAction(() => method(selectedItem.id, qty, price, formData.notes || '', { stockDate: formData.stockDate, expiry: formData.expiry, unit: formData.unit || selectedItem.unit || 'kg', operationId: save.id(`stock:${selectedItem.id}`) }), t.inventory.stockAdded);
  }, [selectedItem, formData, itemType, store, handleAction, t, save]);

  const handleUsage = useCallback(async () => {
    if (!selectedItem || !formData.quantity) return Alert.alert(t.inventory.error, t.inventory.quantityRequired);
    const qty = Number(formData.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || (selectedItem.totalStock || 0) < qty) {
      return Alert.alert(t.inventory.error, `${t.inventory.insufficientStock} (${(selectedItem.totalStock || 0).toFixed(1)} ${selectedItem.unit || 'kg'})`);
    }

    const method = itemType === 'feed' ? store.useFeed : store.useAdditive;
    await handleAction(async () => {
      await method(selectedItem.id, qty, formData.pondId?.trim() || null, formData.notes?.trim() || '', save.id(`usage:${selectedItem.id}`), formData.usageDate);
      
      const updatedItems = itemType === 'feed' ? store.feeds : store.additives;
      const updatedItem = updatedItems.find(i => i.id === selectedItem.id);
      if (updatedItem) {
        void checkAndCreateLowStockNotification(updatedItem, itemType).catch(error => console.error('Low stock notification failed:', error));
      }
    }, `${t.inventory.usageRecorded} — ${qty} ${t.inventory.removed}`);
  }, [selectedItem, formData, itemType, store, handleAction, checkAndCreateLowStockNotification, t, save]);

  const handleRemoveUsage = (usage: { id: string; quantity: number; date: string }) => {
    if (!canEditInventory || itemType !== 'additive' || !selectedItem || save.busy) return;
    const additiveId = selectedItem.id;
    Alert.alert('Remove usage', `Remove ${usage.quantity} ${selectedItem.unit || 'kg'} used on ${formatDate(usage.date)}? This restores the recorded stock and cost and removes this usage expense.`, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.companyDetails.remove,
        style: 'destructive',
        onPress: async () => {
          if (auth.currentUser?.uid !== user?.uid || useFeedAdditiveStore.getState().currentCompanyId !== company?.id || !save.acquire()) return;
          setRemovingUsageId(usage.id);
          setVoidError('');
          try {
            await store.removeAdditiveUsage(additiveId, usage.id);
            save.complete();
          } catch (error) {
            setVoidError(getUserErrorMessage(error, 'Could not remove usage. Please try again.'));
          } finally {
            setRemovingUsageId(null);
            save.release();
          }
        },
      },
    ]);
  };

  const handleDelete = useCallback((id: string, type: ItemType) => {
    const item = (type === 'feed' ? store.feeds : store.additives).find(row => row.id === id);
    Alert.alert(item?.archived ? 'Restore inventory item' : 'Archive inventory item', 'Purchase and usage history will be retained. Only items without remaining stock can be archived.', [
      { text: 'Cancel', style: 'cancel' },
      { text: item?.archived ? 'Restore' : 'Archive', onPress: () => handleAction(() => type === 'feed' ? store.deleteFeed(id) : store.deleteAdditive(id), 'Inventory visibility updated') }
    ]);
  }, [store, handleAction, t]);

  const handlePrepareVoid = async (record: any) => {
    if (!canEditInventory || !canUseOrson) {
      Alert.alert(t.inventory.error, 'You do not have permission to void inventory purchases.');
      return;
    }
    if (!company?.id || !user?.uid || !selectedItem || !record.id || !record.date || agent.busy) {
      return;
    }
    setPreparingRecordId(record.id);
    setVoidError('');
    try {
      const command: OrsonCommand = {
        id: createOfflineOperationId('inventory-void'),
        type: 'void_inventory_purchase',
        date: typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          ? record.date
          : getFarmDateKey(new Date(record.date), company?.timeZone),
        itemType,
        itemId: selectedItem.id,
        recordId: record.id,
        values: {},
      };
      const op = await agent.prepare([command]);
      if (op) {
        setActiveVoidOpId(op.id);
        const rowErr = op.rows[0]?.error;
        if (rowErr) {
          setVoidError(rowErr);
        }
      } else {
        const fallback = 'Could not prepare removal draft. Check your network connection and permissions, then try again.';
        setVoidError(fallback);
      }
    } catch (err) {
      const msg = getUserErrorMessage(err, 'Could not prepare removal draft.');
      setVoidError(msg);
      Alert.alert(t.inventory.error, msg);
    } finally {
      setPreparingRecordId(null);
    }
  };

  const openModal = useCallback((type: ModalType, item?: Feed | Additive, iType?: ItemType) => {
    if (!save.reset()) return;
    setModalType(type);
    if (item && iType) {
      setSelectedItem(item);
      setItemType(iType);
      const productLabel = iType === 'additive' ? (item as Additive).productLabel : undefined;
      setFormData(prev => ({
        ...prev, 
        unit: (item as any).unit || 'kg', 
        quantity: '', 
        unitPrice: '', 
        pondId: '', 
        notes: '', 
        stockDate: getFarmDateKey(new Date(), company?.timeZone),
        usageDate: getFarmDateKey(new Date(), company?.timeZone),
        expiry: '',
        reorderLevel: String(item.reorderLevel ?? ''),
        manufacturer: productLabel?.manufacturer || '',
        ingredients: productLabel?.ingredients?.join('\n') || '',
        labelSourceUrl: productLabel?.sourceUrl || '',
      }));
    }
    setMenuModalVisible(false);
    setModalVisible(true);
  }, [company?.timeZone, save]);

  const ItemCard = ({ item, type }: { item: Feed | Additive; type: ItemType }) => {
    const name = type === 'feed' ? (item as Feed).feedName : (item as Additive).additiveName;
    const activeStockHistory = item.stockInHistory?.filter(h => !h.voided) || [];
    const totalStockInQty = activeStockHistory.reduce((s, h) => s + (h.quantity || 0), 0);
    const totalStockInCost = activeStockHistory.reduce((s, h) => s + ((h.quantity || 0) * (h.price || 0)), 0);
    const lastPrice = activeStockHistory[activeStockHistory.length - 1]?.price ?? 0;
    const avgPrice = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : lastPrice;
    const totalOut = item.usageHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;
    const isLow = (item.reorderLevel ?? 0) > 0 && item.totalStock <= (item.reorderLevel ?? 0);

    return (
      <View style={[styles.card, isLow && { borderLeftWidth: 6, borderLeftColor: '#e74c3c' }]}>
        <TouchableOpacity onPress={() => openModal('history', item as any, type)} style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{name}</Text>
              <Text style={styles.cardMeta}>{getCategoryLabel(type === 'feed' ? (item as Feed).feedType : (item as Additive).category)}</Text>
              <Text style={styles.cardSubMeta}>{getUnitLabel(item.unit || 'kg')} · {t.inventory.reorder}: {(item.reorderLevel || 0)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id, type)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t.inventory.stock}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{type === 'feed' ? formatNumber(Math.round(item.totalStock)) : item.totalStock.toFixed(1)} {getUnitLabel(item.unit || 'kg')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t.inventory.avgPrice}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{formatCurrency(Math.round(avgPrice))}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t.inventory.value}</Text>
            <Text style={styles.statValue} numberOfLines={1}>{formatCurrency(Math.round((item.totalStock || 0) * avgPrice))}</Text>
          </View>
        </View>

        <View style={styles.flowStats}>
          <Text style={styles.flowText}>{t.inventory.in}: {totalStockInQty.toFixed(1)}</Text>
          <Text style={styles.flowSeparator}>·</Text>
          <Text style={styles.flowText}>{t.inventory.out}: {totalOut.toFixed(1)}</Text>
          <Text style={styles.flowSeparator}>·</Text>
          <Text style={styles.flowText}>{t.inventory.cost}: {formatCurrency((item.totalCost || 0))}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('stockIn', item as any, type)}>
            <Text style={styles.actionText}>{t.inventory.stockIn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSec]} onPress={() => openModal('usage', item as any, type)}>
            <Text style={[styles.actionText, styles.actionTextSec]}>{t.inventory.use}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8F4F8' }]} onPress={() => { 
            openModal('editReorder', item as any, type);
          }}>
            <Text style={[styles.actionTextSec, { color: '#f39c12', fontWeight: '700' }]}>{type === 'additive' ? 'Product' : t.inventory.reorder}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistoryModal = () => {
    if (!selectedItem) return null;
    const currentItem = (itemType === 'feed' ? store.feeds : store.additives).find(i => i.id === selectedItem.id) || selectedItem;
    const activeStockHistory = (currentItem.stockInHistory || []).filter(h => !h.voided).reverse();
    const voidedStockHistory = (currentItem.stockInHistory || []).filter(h => h.voided).reverse();
    const usageHistory = [...(currentItem.usageHistory || [])].reverse();

    const relevantOperationIds = Array.from(
      new Set(
        agent.operations
          .filter((op) =>
            op.rows.some(
              (r) =>
                r.command.type === 'void_inventory_purchase' &&
                r.command.itemId === currentItem.id &&
                r.command.itemType === itemType,
            ),
          )
          .map((op) => op.id),
      ),
    );
    const modalError = agent.error || voidError;

    const renderHistory = (history: any[], type: 'stock' | 'usage') => (
      <>
        <Text style={styles.historyTitle}>{type === 'stock' ? t.inventory.stockInHistory : t.inventory.usageHistory} ({history.length})</Text>
        {history.map((h: any) => (
          <View key={h.id || `${h.date}_${h.quantity}`} style={styles.historyItem}>
            <View style={[styles.historyIcon, { backgroundColor: type === 'stock' ? '#27ae60' : '#e74c3c' }]}>
              <Ionicons name={type === 'stock' ? 'arrow-down' : 'arrow-up'} size={16} color="#fff" />
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyQty}>
                {type === 'stock' ? '+' : '-'}{(h.quantity || 0).toFixed(1)} {getUnitLabel(h.unit || currentItem.unit || 'kg')}
                {type === 'stock' ? ` @ Rp${(h.price || 0).toFixed(2)}${t.inventory.unitAbbrev}` : ''}
              </Text>
              <Text style={styles.historyDate}>{formatDate(h.date)}{type === 'stock' ? ` • ${t.inventory.total}: Rp${((h.quantity || 0) * (h.price || 0)).toFixed(2)}` : h.pondId ? ` • ${h.pondId}` : ''}</Text>
              {h.expiry && <Text style={styles.historyNotes}>{t.inventory.expiry}: {h.expiry}</Text>}
              {h.notes && <Text style={styles.historyNotes}>{h.notes}</Text>}
            </View>
            {type === 'stock' && canEditInventory && canUseOrson && h.id && h.date && (
              <TouchableOpacity
                style={styles.voidRecordBtn}
                disabled={savePending || agent.busy || preparingRecordId === h.id}
                onPress={() => void handlePrepareVoid(h)}
                accessibilityRole="button"
                accessibilityLabel={`Void purchase on ${formatDate(h.date)}`}
              >
                {preparingRecordId === h.id ? (
                  <ActivityIndicator size="small" color="#e74c3c" />
                ) : (
                  <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                )}
                <Text style={styles.voidRecordText}>Void</Text>
              </TouchableOpacity>
            )}
            {type === 'usage' && itemType === 'additive' && canEditInventory && h.id && h.quantity > 0 && h.source !== 'treatmentMixProduction' && (
              <TouchableOpacity
                style={styles.voidRecordBtn}
                disabled={savePending || agent.busy || preparingRecordId !== null}
                onPress={() => handleRemoveUsage(h)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${h.quantity} ${currentItem.unit || 'kg'} usage on ${formatDate(h.date)}`}
              >
                {removingUsageId === h.id ? <ActivityIndicator size="small" color="#e74c3c" /> : <Ionicons name="trash-outline" size={16} color="#e74c3c" />}
                <Text style={styles.voidRecordText}>{t.companyDetails.remove}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </>
    );

    const renderAuditHistory = (history: any[]) => (
      <>
        <Text style={[styles.historyTitle, { color: '#991b1b' }]}>Audit History ({history.length})</Text>
        {history.map((h: any) => (
          <View key={h.id || `${h.date}_${h.quantity}`} style={styles.historyItem}>
            <View style={[styles.historyIcon, { backgroundColor: '#95a5a6' }]}>
              <Ionicons name="close-circle" size={16} color="#fff" />
            </View>
            <View style={styles.historyContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.historyQty, { textDecorationLine: 'line-through', color: '#95a5a6' }]}>
                  +{(h.quantity || 0).toFixed(1)} {getUnitLabel(h.unit || currentItem.unit || 'kg')} @ Rp{(h.price || 0).toFixed(2)}{t.inventory.unitAbbrev}
                </Text>
                <View style={{ backgroundColor: '#fde8e8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#e74c3c', fontSize: 10, fontWeight: '700' }}>VOIDED</Text>
                </View>
              </View>
              <Text style={styles.historyDate}>{formatDate(h.date)} • {t.inventory.total}: Rp{((h.quantity || 0) * (h.price || 0)).toFixed(2)}</Text>
              <Text style={[styles.historyNotes, { color: '#e74c3c', fontWeight: '600' }]}>
                Audited effect: Stock & cost reversed ({formatDate(h.voidedAt || h.date)})
              </Text>
              {h.notes && <Text style={styles.historyNotes}>{h.notes}</Text>}
            </View>
          </View>
        ))}
      </>
    );

    return (
      <ScrollView style={styles.historyScroll}>
        {modalError ? (
          <View style={styles.voidErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#b3261e" />
            <Text style={styles.voidErrorText}>{modalError}</Text>
          </View>
        ) : null}
        {relevantOperationIds.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <OrsonAgentCards
              agent={agent}
              operationIds={relevantOperationIds}
              showStatus={false}
              onDismiss={(id) => {
                if (id === activeVoidOpId) setActiveVoidOpId(null);
                agent.dismiss(id);
              }}
            />
          </View>
        )}
        {renderHistory(activeStockHistory, 'stock')}
        {voidedStockHistory.length > 0 && (
          <>
            <View style={{ marginTop: 20 }} />
            {renderAuditHistory(voidedStockHistory)}
          </>
        )}
        <View style={{ marginTop: 20 }} />
        {renderHistory(usageHistory, 'usage')}
      </ScrollView>
    );
  };

  if (store.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t.inventory.loadingInventory}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFormInput = (label: string, placeholder: string, value: string, onChange: (v: string) => void, options?: { keyboardType?: any; multiline?: boolean; required?: boolean }) => (
    <View style={styles.input}>
      <Text style={styles.label}>{label} {options?.required && t.inventory.required}</Text>
      <TextInput 
        placeholder={placeholder} 
        value={value} 
        onChangeText={onChange} 
        style={[styles.textInput, options?.multiline && styles.textArea]} 
        placeholderTextColor="#6b8aa0" 
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  const renderChipSelector = (label: string, options: string[], value: string, onChange: (v: string) => void, required?: boolean) => (
    <View style={styles.input}>
      <Text style={styles.label}>{label} {required && t.inventory.required}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((opt) => (
          <TouchableOpacity key={opt} style={[styles.chip, value === opt && styles.chipActive]} onPress={() => onChange(opt)}>
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{label === t.inventory.unit ? getUnitLabel(opt) : getCategoryLabel(opt)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPondUsageSelector = () => (
    <View style={styles.input}>
      <Text style={styles.label}>Apply to pond / cycle</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.chip, formData.pondId === '' && styles.chipActive]}
          onPress={() => setFormData(prev => ({ ...prev, pondId: '' }))}
        >
          <Text style={[styles.chipText, formData.pondId === '' && styles.chipTextActive]}>General</Text>
        </TouchableOpacity>
        {activePonds.map((pond) => (
          <TouchableOpacity
            key={pond.id}
            style={[styles.chip, formData.pondId === pond.id && styles.chipActive]}
            onPress={() => setFormData(prev => ({ ...prev, pondId: pond.id }))}
          >
            <Text style={[styles.chipText, formData.pondId === pond.id && styles.chipTextActive]}>
              {pond.pondName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.helperText}>
        Pick a pond to attach this usage to the active cycle. Use General only for company-level usage.
      </Text>
    </View>
  );

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.inventory.title}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setMenuModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open feed additives actions"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color="#0d2137" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <View style={styles.tabs}>
          {(['dashboard', 'feed', 'additive', 'mix'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab);
                setCategoryFilter(null);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'dashboard' ? t.inventory.dashboard : tab === 'feed' ? t.inventory.feeds : tab === 'additive' ? t.inventory.additives : t.inventory.treatmentMix.tabLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(activeTab === 'feed' || activeTab === 'additive') && (
          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <TextInput
                placeholder={t.inventory.searchPlaceholder}
                placeholderTextColor="#6B7F91"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.textInput, styles.searchInput, { flex: 1 }]}
              />
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setCategoryModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Select category"
              >
                <Text style={styles.categorySelectorText} numberOfLines={1}>
                  {categoryFilter ? getCategoryLabel(categoryFilter) : t.inventory.allCategories}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#0d2137" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusControls}>
                {(['all', 'inStock', 'outOfStock'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusBtn, stockStatusFilter === status && styles.statusBtnActive]}
                    onPress={() => setStockStatusFilter(status)}
                  >
                    <Text style={[styles.statusBtnText, stockStatusFilter === status && styles.statusBtnTextActive]}>
                      {status === 'all' ? t.inventory.all : status === 'inStock' ? t.inventory.inStock : t.inventory.outOfStock}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.archiveBtn, showArchived && styles.archiveBtnActive]}
                onPress={() => setShowArchived((v) => !v)}
              >
                <Text style={[styles.archiveBtnText, showArchived && styles.archiveBtnTextActive]}>
                  {showArchived ? t.inventory.hideArchived : t.inventory.showArchived}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'mix' ? (
          <TreatmentMixesScreen embedded />
        ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeTab === 'dashboard' && (
            <>
              <View style={styles.metricsGrid}>
                {[
                  { label: t.inventory.feedStock, value: `${formatNumber(Math.round(metrics.totalFeedStock))} kg` },
                  { label: t.inventory.additiveValue, value: formatCurrency(Math.round(metrics.totalAdditiveValue)) },
                  { label: t.inventory.feedCost, value: formatCurrency(Math.round(metrics.totalFeedCost)) },
                  { label: t.inventory.feedStockValue, value: formatCurrency(Math.round(metrics.feedStockValue)) },
                ].map((m, i) => (
                  <View key={i} style={styles.metricCard}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>{m.value}</Text>
                  </View>
                ))}
              </View>

              {lowStockItems.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.inventory.lowStockAlert} ({lowStockItems.length})</Text>
                  </View>
                  {lowStockItems.slice(0, lowStockExpanded ? lowStockItems.length : 2).map((item) => (
                    <View key={item.id} style={styles.alertCard}>
                      <View style={styles.alertContent}>
                        <Text style={styles.alertText}>{item.name}</Text>
                        <Text style={styles.alertSub}>{item.stock.toFixed(1)} {getUnitLabel(item.unit || 'kg')} {t.inventory.remaining}</Text>
                      </View>
                    </View>
                  ))}
                  {lowStockItems.length > 2 && (
                    <TouchableOpacity
                      style={styles.lowStockToggle}
                      onPress={() => setLowStockExpanded((expanded) => !expanded)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.lowStockToggleText}>
                        {lowStockExpanded ? t.inventory.showLess : t.inventory.showAllLowStock}
                      </Text>
                      <Ionicons name={lowStockExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#0F4C75" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t.inventory.recentActivity}</Text>
                  <View style={styles.activityToggle}>
                    {(['all', 'stockIn', 'usage', 'audit'] as const).map(filter => (
                      <TouchableOpacity key={filter} onPress={() => setRecentActivityFilter(filter)} style={[styles.toggleBtn, recentActivityFilter === filter && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, recentActivityFilter === filter && styles.toggleTextActive]}>
                          {filter === 'all' ? t.inventory.all : filter === 'stockIn' ? t.inventory.stockInFilter : filter === 'usage' ? t.inventory.usageFilter : 'Audit'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <FlatList
                  data={displayedRecentTransactions}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item: tx }) => (
                    <View style={styles.txCard}>
                      <View style={styles.txContent}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.txName}>{tx.item}</Text>
                          {tx.voided && (
                            <View style={{ backgroundColor: '#fde8e8', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ color: '#e74c3c', fontSize: 9, fontWeight: '700' }}>VOIDED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.txMeta}>{tx.type} • {formatDate(tx.date)}{tx.voided ? ' • Voided' : ''}</Text>
                      </View>
                      <Text style={[styles.txQty, tx.voided && { textDecorationLine: 'line-through', color: '#95a5a6' }]} numberOfLines={1}>{formatNumber(Math.round(tx.quantity))} kg</Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t.inventory.pondUsageSummary}</Text>
                </View>
                {Object.keys(pondUsageSummary).length === 0 ? (
                  <Text style={{ color: '#6b7280' }}>{t.inventory.noPondUsage}</Text>
                ) : (
                  Object.entries(pondUsageSummary).map(([pondId, qty]) => (
                    <View key={pondId} style={styles.txCard}>
                      <View style={styles.txContent}>
                        <Text style={styles.txName}>{pondId}</Text>
                        <Text style={styles.txMeta}>{t.inventory.totalUsed}</Text>
                      </View>
                      <Text style={styles.txQty}>{qty.toFixed(1)} kg</Text>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {activeTab === 'feed' && (
            <>
              {openTabVoidDrafts.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <OrsonAgentCards
                    agent={agent}
                    operationIds={openTabVoidDrafts}
                    onDismiss={(id) => agent.dismiss(id)}
                  />
                </View>
              )}
              {filteredFeeds.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="nutrition-outline" size={64} color="#dce8f2" />
                  <Text style={styles.emptyTitle}>{t.inventory.noFeedItems}</Text>
                  <Text style={styles.emptySub}>{t.inventory.addFeedToStart}</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredFeeds}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => <ItemCard item={item} type="feed" />}
                />
              )}
            </>
          )}

          {activeTab === 'additive' && (
            <>
              {openTabVoidDrafts.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <OrsonAgentCards
                    agent={agent}
                    operationIds={openTabVoidDrafts}
                    onDismiss={(id) => agent.dismiss(id)}
                  />
                </View>
              )}
              {filteredAdditives.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="flask-outline" size={64} color="#dce8f2" />
                  <Text style={styles.emptyTitle}>{t.inventory.noAdditives}</Text>
                  <Text style={styles.emptySub}>{t.inventory.addAdditivesToStart}</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredAdditives}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => <ItemCard item={item} type="additive" />}
                />
              )}
            </>
          )}
        </ScrollView>
        )}
      </View>

      <Modal visible={menuModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuModalVisible(false)}>
          <View style={styles.menuModal}>
            <Text style={styles.menuTitle}>{t.inventory.addInventory}</Text>
            {(['feed', 'additive'] as const).map((type) => (
              <TouchableOpacity key={type} style={styles.menuOption} onPress={() => { setItemType(type); openModal('add'); }}>
                <Text style={styles.menuText}>{type === 'feed' ? t.inventory.addFeed : t.inventory.addAdditive}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={categoryModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.menuModal}>
            <Text style={styles.menuTitle}>{t.inventory.category}</Text>
            <TouchableOpacity
              style={[styles.categoryOption, categoryFilter === null && styles.categoryOptionActive]}
              onPress={() => {
                setCategoryFilter(null);
                setCategoryModalVisible(false);
              }}
            >
              <Text style={[styles.categoryOptionText, categoryFilter === null && styles.categoryOptionTextActive]}>
                {t.inventory.allCategories}
              </Text>
              {categoryFilter === null && <Ionicons name="checkmark" size={18} color="#315f57" />}
            </TouchableOpacity>
            {(activeTab === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryOption, categoryFilter === cat && styles.categoryOptionActive]}
                onPress={() => {
                  setCategoryFilter(cat);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[styles.categoryOptionText, categoryFilter === cat && styles.categoryOptionTextActive]}>
                  {getCategoryLabel(cat)}
                </Text>
                {categoryFilter === cat && <Ionicons name="checkmark" size={18} color="#315f57" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.menuCancelText}>{t.actions.cancel}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent} pointerEvents={savePending ? 'none' : 'auto'}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'add' ? `${itemType === 'feed' ? t.inventory.addFeed : t.inventory.addAdditive}` :
                  modalType === 'stockIn' ? t.inventory.stockIn :
                    modalType === 'usage' ? t.inventory.recordUsage :
                      modalType === 'history' ? t.inventory.transactionHistory : itemType === 'additive' ? 'Product label and reorder level' : t.inventory.editReorderLevel}
              </Text>
              <TouchableOpacity disabled={savePending} onPress={closeModal}>
                <Ionicons name="close-circle" size={28} color="#dce8f2" />
              </TouchableOpacity>
            </View>

            {modalType === 'history' ? (
              renderHistoryModal()
            ) : (
              <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                {modalType === 'add' && (
                  <>
                    {renderFormInput(t.inventory.itemName, itemType === 'feed' ? t.inventory.itemNamePlaceholder : t.inventory.additivePlaceholder, formData.itemName, (v) => setFormData(prev => ({ ...prev, itemName: v })), { required: true })}
                    {itemType === 'feed' && renderFormInput(t.inventory.brandOptional, t.inventory.brandPlaceholder, formData.brand || '', (v) => setFormData(prev => ({ ...prev, brand: v })))}
                    {itemType === 'additive' && (
                      <>
                        {renderFormInput('Manufacturer', 'Company shown on the product label', formData.manufacturer, (v) => setFormData(prev => ({ ...prev, manufacturer: v })))}
                        {renderFormInput('Ingredients / strains (one per line)', 'Example: Bacillus subtilis 1×10⁹ CFU/g', formData.ingredients, (v) => setFormData(prev => ({ ...prev, ingredients: v })), { multiline: true })}
                        {renderFormInput('Official label URL', 'https://manufacturer.com/product-label.pdf', formData.labelSourceUrl, (v) => setFormData(prev => ({ ...prev, labelSourceUrl: v })))}
                      </>
                    )}
                    {renderChipSelector(t.inventory.category, itemType === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES, formData.category, (v) => setFormData(prev => ({ ...prev, category: v })), true)}
                    {renderChipSelector(t.inventory.unit, UNITS, formData.unit || 'kg', (v) => setFormData(prev => ({ ...prev, unit: v })))}
                    {renderFormInput(`${t.inventory.initialQuantity} (${getUnitLabel(formData.unit || 'kg')})`, t.inventory.quantityPlaceholder, formData.quantity, (v) => setFormData(prev => ({ ...prev, quantity: v })), { keyboardType: 'numeric', required: true })}
                    {renderFormInput(`${t.inventory.unitPrice} (Rp/unit)`, t.inventory.unitPricePlaceholder, formData.unitPrice, (v) => setFormData(prev => ({ ...prev, unitPrice: v })), { keyboardType: 'decimal-pad', required: true })}
                    <View style={styles.input}>
                      <AppDatePicker
                        label={t.inventory.stockDate}
                        value={formData.stockDate}
                        maximumDate={new Date()}
                        onChange={(date) => setFormData(prev => ({ ...prev, stockDate: getFarmDateKey(date, company?.timeZone) }))}
                        cancelLabel={t.actions.cancel}
                        confirmLabel={t.actions.confirm}
                      />
                    </View>
                    {renderFormInput(t.inventory.expiryOptional, t.inventory.expiryPlaceholder, formData.expiry || '', (v) => setFormData(prev => ({ ...prev, expiry: v })))}
                    {renderFormInput(t.inventory.reorderLevelOptional, t.inventory.reorderLevelPlaceholder, formData.reorderLevel || '', (v) => setFormData(prev => ({ ...prev, reorderLevel: v })), { keyboardType: 'numeric' })}
                    {renderFormInput(t.inventory.notesOptional, t.inventory.notesPlaceholder, formData.notes, (v) => setFormData(prev => ({ ...prev, notes: v })), { multiline: true })}
                  </>
                )}

                {(modalType === 'stockIn' || modalType === 'usage' || modalType === 'editReorder') && selectedItem && (
                  <>
                    <View style={styles.banner}>
                      <Ionicons name={itemType === 'feed' ? 'nutrition' : 'flask'} size={20} color="#315f57" />
                      <Text style={styles.bannerText}>{itemType === 'feed' ? (selectedItem as Feed).feedName : (selectedItem as Additive).additiveName}</Text>
                    </View>

                    {modalType === 'usage' && (
                      <View style={styles.stockBanner}>
                        <Text style={styles.stockLabel}>{t.inventory.currentStock}</Text>
                        <Text style={styles.stockValue}>{(selectedItem.totalStock || 0).toFixed(1)} {getUnitLabel(selectedItem.unit || 'kg')}</Text>
                      </View>
                    )}

                    {modalType !== 'editReorder' && renderFormInput(`${t.inventory.quantity} (${getUnitLabel(selectedItem.unit || formData.unit || 'kg')})`, t.inventory.quantityPlaceholder, formData.quantity, (v) => setFormData(prev => ({ ...prev, quantity: v })), { keyboardType: 'numeric', required: true })}

                    {modalType === 'stockIn' && (
                      <>
                        {renderFormInput(`${t.inventory.unitPrice} (Rp/unit)`, t.inventory.unitPricePlaceholder, formData.unitPrice, (v) => setFormData(prev => ({ ...prev, unitPrice: v })), { keyboardType: 'decimal-pad', required: true })}
                        <View style={styles.input}>
                          <AppDatePicker
                            label={t.inventory.stockDate}
                            value={formData.stockDate}
                            maximumDate={new Date()}
                            onChange={(date) => setFormData(prev => ({ ...prev, stockDate: getFarmDateKey(date, company?.timeZone) }))}
                            cancelLabel={t.actions.cancel}
                            confirmLabel={t.actions.confirm}
                          />
                        </View>
                        {renderFormInput(t.inventory.expiryOptional, t.inventory.expiryPlaceholder, formData.expiry || '', (v) => setFormData(prev => ({ ...prev, expiry: v })))}
                      </>
                    )}

                    {modalType === 'usage' && (
                      <View style={styles.input}>
                        <AppDatePicker
                          label="Usage date"
                          value={formData.usageDate}
                          maximumDate={new Date(`${getFarmDateKey(new Date(), company?.timeZone)}T23:59:59`)}
                          onChange={date => setFormData(previous => ({ ...previous, usageDate: inventoryUsageDateFromPicker(date) }))}
                          disabled={savePending}
                          cancelLabel={t.actions.cancel}
                          confirmLabel={t.actions.confirm}
                        />
                      </View>
                    )}
                    {modalType === 'usage' && renderPondUsageSelector()}

                    {modalType === 'editReorder' && (
                      <>
                        {renderFormInput(t.inventory.reorderLevel, t.inventory.reorderLevelPlaceholder, formData.reorderLevel || '', (v) => setFormData(prev => ({ ...prev, reorderLevel: v })), { keyboardType: 'numeric' })}
                        {itemType === 'additive' && (
                          <>
                            {renderFormInput('Manufacturer', 'Company shown on the product label', formData.manufacturer, (v) => setFormData(prev => ({ ...prev, manufacturer: v })))}
                            {renderFormInput('Ingredients / strains (one per line)', 'Example: Bacillus subtilis 1×10⁹ CFU/g', formData.ingredients, (v) => setFormData(prev => ({ ...prev, ingredients: v })), { multiline: true })}
                            {renderFormInput('Official label URL', 'https://manufacturer.com/product-label.pdf', formData.labelSourceUrl, (v) => setFormData(prev => ({ ...prev, labelSourceUrl: v })))}
                          </>
                        )}
                        <View style={styles.buttons}>
                          <TouchableOpacity style={styles.btnCancel} disabled={savePending} onPress={closeModal}>
                            <Text style={styles.btnCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnSubmit} onPress={async () => {
                            const newLevel = Number(formData.reorderLevel);
                            if (isNaN(newLevel)) return Alert.alert(t.inventory.error, t.inventory.reorderMustBeNumber);
                            
                            try {
                              const fn = itemType === 'feed' ? store.updateFeed : store.updateAdditive;
                              const productLabel = itemType === 'additive' ? buildInventoryProductLabel({
                                manufacturer: formData.manufacturer,
                                ingredientsText: formData.ingredients,
                                sourceUrl: formData.labelSourceUrl,
                                recordedAt: getFarmDateKey(new Date(), company?.timeZone),
                              }) : undefined;
                              await fn(selectedItem.id, {
                                reorderLevel: newLevel,
                                ...(itemType === 'additive' ? { productLabel: productLabel || null } : {}),
                              });
                              Alert.alert(t.inventory.success, t.inventory.reorderLevelSaved);
                              closeModal();
                            } catch (e) {
                              console.error('Update reorder error:', e);
                              Alert.alert(t.inventory.error, t.inventory.unknownError);
                            }
                          }}>
                            <Text style={styles.btnSubmitText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}

                    {modalType !== 'editReorder' && renderFormInput(t.inventory.notesOptional, t.inventory.notesPlaceholder, formData.notes, (v) => setFormData(prev => ({ ...prev, notes: v })), { multiline: true })}
                  </>
                )}

                {modalType !== 'editReorder' && (
                  <View style={styles.buttons}>
                    <TouchableOpacity style={styles.btnCancel} disabled={savePending} onPress={closeModal}>
                      <Text style={styles.btnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmit} disabled={savePending} onPress={modalType === 'add' ? handleAddItem : modalType === 'stockIn' ? handleStockIn : handleUsage}>
                      <Text style={styles.btnSubmitText}>
                        {modalType === 'add' ? (itemType === 'feed' ? t.inventory.addFeed : t.inventory.addAdditive) : 
                         modalType === 'stockIn' ? t.inventory.stockIn : 
                         t.inventory.recordUsage}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#0d2137', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingTop: Platform.OS === 'android' ? 8 : 10, paddingBottom: Platform.OS === 'android' ? 8 : 10, backgroundColor: '#dce8f2' },
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 19 : 20, fontWeight: 'bold', color: '#0d2137' },
  addButton: { padding: 8, marginRight: -4 },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8F0F5' },
  tab: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0F4C75' },
  tabText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#60798A' },
  tabTextActive: { color: '#0F4C75' },
  searchContainer: { padding: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#FFF', borderBottomColor: '#E8F4F8', borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput: { backgroundColor: '#F4F8FC', borderColor: '#B8CBD9' },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8FC',
    borderWidth: 1,
    borderColor: '#B8CBD9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    gap: 6,
    maxWidth: 150,
  },
  categorySelectorText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#0d2137',
    fontWeight: '500',
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusControls: {
    flexDirection: 'row',
    backgroundColor: '#F4F8FC',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBtnActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statusBtnText: {
    fontSize: 12,
    color: '#6B7F91',
    fontWeight: '500',
  },
  statusBtnTextActive: {
    color: '#0d2137',
    fontWeight: '600',
  },
  archiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F8FC',
  },
  archiveBtnActive: {
    backgroundColor: '#E8F4F8',
  },
  archiveBtnText: {
    fontSize: 12,
    color: '#6B7F91',
    fontWeight: '500',
  },
  archiveBtnTextActive: {
    color: '#315f57',
    fontWeight: '600',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f4f8fc',
    marginBottom: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#E8F4F8',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#0d2137',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#315f57',
    fontWeight: '700',
  },
  scroll: { padding: Platform.OS === 'android' ? 14 : 16, paddingBottom: 140 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  metricCard: { 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    flex: 1, 
    minWidth: '47%', 
    borderWidth: 1,
    borderColor: '#E8F4F8',
  },
  metricLabel: { fontSize: 12, color: '#6B7F91', marginBottom: 4, fontWeight: '500' },
  metricValue: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: 'bold', color: '#0d2137' },
  section: { marginBottom: Platform.OS === 'android' ? 20 : 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', flex: 1 },
  alertCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: 8, 
    borderWidth: 1,
    borderColor: '#E8F4F8',
  },
  alertContent: { flex: 1 },
  alertText: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  alertSub: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#6B7F91', marginTop: 2 },
  lowStockToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  lowStockToggleText: { color: '#0F4C75', fontSize: 13, fontWeight: '600' },
  txCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: 8, 
    borderWidth: 1,
    borderColor: '#E8F4F8',
  },
  txContent: { flex: 1, marginRight: 12 },
  txName: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  txMeta: { fontSize: 12, color: '#6B7F91', marginTop: 2 },
  txQty: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: 'bold', color: '#0d2137' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 70 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 19 : 20, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 14 : 16, marginBottom: 8 },
  emptySub: { color: '#315f57', fontSize: Platform.OS === 'android' ? 13 : 14 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E7F0',
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    overflow: 'hidden',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF3F7',
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: Platform.OS === 'android' ? 16 : 17, fontWeight: '700', color: '#102F46', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#0F4C75', fontWeight: '600' },
  cardSubMeta: { fontSize: 11, color: '#718797', marginTop: 3 },
  deleteBtn: { padding: 8, borderRadius: 8 },
  statsGrid: { 
    flexDirection: 'row', 
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    backgroundColor: '#FFFFFF',
  },
  stat: { flex: 1, alignItems: 'flex-start', minWidth: 0 },
  statDivider: { width: 1, backgroundColor: '#E8F0F5', marginHorizontal: 8 },
  statLabel: { fontSize: 10, color: '#718797', marginBottom: 4, fontWeight: '600' },
  statValue: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '700', color: '#102F46' },
  flowStats: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#F6F9FB',
  },
  flowText: { flexShrink: 1, fontSize: 10, color: '#60798A', fontWeight: '500', textAlign: 'center' },
  flowSeparator: { color: '#A4B5C1', fontSize: 12, marginHorizontal: 6 },
  actions: { flexDirection: 'row', padding: Platform.OS === 'android' ? 10 : 12, gap: 8 },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#0F4C75',
    paddingVertical: Platform.OS === 'android' ? 9 : 10,
    borderRadius: 9,
    gap: 6 
  },
  actionBtnSec: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E7F0' },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  actionTextSec: { color: '#0F4C75' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(27, 38, 44, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menuModal: { 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 20 : 24, 
    borderRadius: 20, 
    width: '90%', 
    maxWidth: 400, 
    shadowColor: '#dce8f2', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8 
  },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#60798A', marginBottom: 12 },
  menuOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F0F5',
    borderRadius: 10,
    marginBottom: 8,
  },
  menuText: { color: '#0d2137', fontSize: 15, fontWeight: '600', flex: 1 },
  menuCancel: { padding: Platform.OS === 'android' ? 14 : 16, alignItems: 'center', marginTop: 8 },
  menuCancelText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(27, 38, 44, 0.7)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '90%', 
    shadowColor: '#dce8f2', 
    shadowOffset: { width: 0, height: -4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 12, 
    elevation: 8 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 18 : 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f4f8fc' 
  },
  modalTitle: { fontSize: Platform.OS === 'android' ? 20 : 22, fontWeight: 'bold', color: '#0d2137' },
  form: { padding: Platform.OS === 'android' ? 18 : 20 },
  banner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F4F8', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: Platform.OS === 'android' ? 18 : 20 
  },
  bannerText: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#0d2137', marginLeft: 12 },
  stockBanner: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#f4f8fc', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: Platform.OS === 'android' ? 18 : 20 
  },
  stockLabel: { fontSize: Platform.OS === 'android' ? 14 : 15, color: '#0d2137', fontWeight: '500' },
  stockValue: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137' },
  input: { marginBottom: Platform.OS === 'android' ? 16 : 18 },
  label: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginBottom: 8 },
  helperText: { color: '#6b8aa0', fontSize: 12, fontWeight: '500', marginTop: 8, lineHeight: 17 },
  textInput: { 
    borderWidth: 1, 
    borderColor: '#E8F4F8', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    backgroundColor: '#FFF', 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 14 : 15 
  },
  textArea: { minHeight: Platform.OS === 'android' ? 80 : 90, textAlignVertical: 'top', paddingTop: Platform.OS === 'android' ? 12 : 14 },
  chip: { 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 18, 
    paddingVertical: Platform.OS === 'android' ? 8 : 10, 
    marginRight: 8, 
    backgroundColor: '#f4f8fc', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#E8F4F8' 
  },
  chipActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  chipText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: Platform.OS === 'android' ? 20 : 24, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  btnCancel: { 
    flex: 1, 
    backgroundColor: '#f4f8fc', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E8F4F8' 
  },
  btnCancelText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  btnSubmit: { 
    flex: 1, 
    backgroundColor: '#315f57', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  btnSubmitText: { color: '#FFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  activityToggle: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  toggleBtn: { 
    paddingHorizontal: Platform.OS === 'android' ? 8 : 10, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    borderRadius: 16, 
    backgroundColor: '#f4f8fc', 
    borderWidth: 1, 
    borderColor: '#E8F4F8' 
  },
  toggleBtnActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#0d2137' },
  toggleTextActive: { color: '#FFF' },
  historyScroll: { padding: Platform.OS === 'android' ? 18 : 20 },
  historyTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  historyItem: { 
    flexDirection: 'row', 
    backgroundColor: '#f4f8fc', 
    padding: Platform.OS === 'android' ? 10 : 12, 
    borderRadius: 12, 
    marginBottom: 8 
  },
  historyIcon: { width: Platform.OS === 'android' ? 32 : 36, height: Platform.OS === 'android' ? 32 : 36, borderRadius: Platform.OS === 'android' ? 16 : 18, alignItems: 'center', justifyContent: 'center', marginRight: Platform.OS === 'android' ? 10 : 12 },
  historyContent: { flex: 1 },
  historyQty: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137', marginBottom: 2 },
  historyDate: { fontSize: 12, color: '#315f57' },
  historyNotes: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0d2137', marginTop: 4, fontStyle: 'italic' },
  voidRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f2c7c7',
    backgroundColor: '#fff',
    marginLeft: 8,
  },
  voidRecordText: {
    color: '#b42318',
    fontSize: 12,
    fontWeight: '600',
  },
  voidErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  voidErrorText: {
    color: '#b3261e',
    fontSize: 13,
    flex: 1,
  },
});
