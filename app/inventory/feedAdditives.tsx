import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { NotificationService } from '../services/notificationService';
import { useFeedAdditiveStore, type Additive, type Feed } from './../store/feedAdditiveStore';
import { isPondCycleActive, usePondStore } from './../store/pondStore';
import TreatmentMixesScreen from './treatmentMixes';

type FormData = {
  itemName: string;
  brand?: string;
  category: string;
  quantity: string;
  unitPrice: string;
  pondId: string;
  notes: string;
  unit?: string;
  batch?: string;
  expiry?: string;
  reorderLevel?: string;
};

type ModalType = 'add' | 'stockIn' | 'usage' | 'history' | 'editReorder';
type ItemType = 'feed' | 'additive';

const UNITS = ['kg', 'L', 'pack', 'sack'];
const FEED_CATEGORIES = ['Starter', 'Grower', 'Finisher', 'Other'];
const ADDITIVE_CATEGORIES = ['Water Conditioner', 'Probiotic', 'Mineral', 'Vitamin', 'Other'];

const formatDate = (date: any): string => {
  if (!date) return '';
  const d = date.seconds ? new Date(date.seconds * 1000) : date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString();
};

const formatDateTime = (date: any): string => {
  if (!date) return '';
  const d = date.seconds ? new Date(date.seconds * 1000) : date instanceof Date ? date : new Date(date);
  return d.toLocaleString();
};

export default function FeedAdditivesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { company } = useAuth();
  const store = useFeedAdditiveStore();
  const { ponds } = usePondStore();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const activePonds = useMemo(() => ponds.filter(isPondCycleActive), [ponds]);

  const [activeTab, setActiveTab] = useState<'dashboard' | ItemType | 'mix'>('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('add');
  const [itemType, setItemType] = useState<ItemType>('feed');
  const [selectedItem, setSelectedItem] = useState<Feed | Additive | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'stockIn' | 'usage'>('all');
  const [formData, setFormData] = useState<FormData>(getEmptyFormData('feed'));

  useEffect(() => {
    if (company?.id) {
      store.setCurrentCompanyId(company.id, company.timeZone);
      store.initializeForCompany(company.id, company.timeZone);
    }
  }, [company?.id, company?.timeZone]);

  function getEmptyFormData(type: ItemType): FormData {
    return { itemName: '', brand: '', category: type === 'feed' ? 'Grower' : 'Water Conditioner', quantity: '', unitPrice: '', pondId: '', notes: '', unit: 'kg', batch: '', expiry: '', reorderLevel: '' };
  }

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

  const recentTransactions = useMemo(() => store.getRecentTransactions(10).slice(0, 10), [store.feeds, store.additives]);
  const lowStockItems = useMemo(() => store.getLowStockItems(50), [store.feeds, store.additives]);

  const filterItems = useCallback((items: (Feed | Additive)[], categoryKey: 'feedType' | 'category') => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter(item => {
      const categoryMatch = !categoryFilter || (item as any)[categoryKey] === categoryFilter;
      const name = 'feedName' in item ? item.feedName : item.additiveName;
      const brand = 'brand' in item ? item.brand || '' : '';
      const searchMatch = !q || name.toLowerCase().includes(q) || brand.toLowerCase().includes(q);
      return categoryMatch && searchMatch;
    });
  }, [searchQuery, categoryFilter]);

  const filteredFeeds = useMemo(() => filterItems(store.feeds, 'feedType'), [store.feeds, searchQuery, categoryFilter]);
  const filteredAdditives = useMemo(
    () => filterItems(store.additives.filter(item => item.inventoryKind !== 'treatmentMix'), 'category'),
    [store.additives, searchQuery, categoryFilter],
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
  }, [company?.id]);

  const resetForm = useCallback(() => setFormData(getEmptyFormData(itemType)), [itemType]);

  const closeModal = useCallback(() => {
    resetForm();
    setModalVisible(false);
    setSelectedItem(null);
    setModalType('add');
  }, [resetForm]);

  const handleAction = useCallback(async (action: () => Promise<void>, successMsg: string) => {
    try {
      await action();
      await new Promise(resolve => setTimeout(resolve, 300));
      Alert.alert(t.inventory.success, successMsg);
      closeModal();
      if (modalType === 'add') setActiveTab(itemType);
    } catch (err) {
      console.error('Inventory action failed:', err);
      Alert.alert(t.inventory.error, t.inventory.unknownError);
    }
  }, [closeModal, modalType, itemType, t]);

  const handleAddItem = useCallback(() => {
    if (!formData.itemName || !formData.quantity || !formData.unitPrice) {
      return Alert.alert(t.inventory.error, t.inventory.requiredFields);
    }
    const qty = Number(formData.quantity);
    const price = Number(formData.unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      return Alert.alert(t.inventory.error, t.inventory.invalidQuantityOrPrice);
    }

    const stockInRecord: any = {
      id: Date.now().toString(),
      date: new Date(),
      quantity: qty,
      price,
      notes: formData.notes || '',
      unit: formData.unit || 'kg',
      ...(formData.batch && { batch: formData.batch }),
      ...(formData.expiry && { expiry: formData.expiry }),
    };

    const baseObj = { unit: formData.unit || 'kg', reorderLevel: Number(formData.reorderLevel || 0), stockInHistory: [stockInRecord], usageHistory: [], totalStock: qty, totalCost: qty * price, lastUpdated: new Date() };

    if (itemType === 'feed') {
      handleAction(() => store.addFeed({ feedName: formData.itemName, brand: formData.brand || '', feedType: (formData.category as any) || 'Grower', ...baseObj }), t.inventory.feedAddedSuccess);
    } else {
      handleAction(() => store.addAdditive({ additiveName: formData.itemName, category: (formData.category as any) || 'Other', ...baseObj }), t.inventory.additiveAddedSuccess);
    }
  }, [formData, itemType, store, handleAction, t]);

  const handleStockIn = useCallback(() => {
    if (!selectedItem || !formData.quantity || !formData.unitPrice) return Alert.alert(t.inventory.error, t.inventory.quantityAndPriceRequired);
    const qty = Number(formData.quantity);
    const price = Number(formData.unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) return Alert.alert(t.inventory.error, t.inventory.invalidValues);

    const method = itemType === 'feed' ? store.stockInFeed : store.stockInAdditive;
    handleAction(() => method(selectedItem.id, qty, price, formData.notes || '', { batch: formData.batch, expiry: formData.expiry, unit: formData.unit || selectedItem.unit || 'kg' }), t.inventory.stockAdded);
  }, [selectedItem, formData, itemType, store, handleAction, t]);

  const handleUsage = useCallback(async () => {
    if (!selectedItem || !formData.quantity) return Alert.alert(t.inventory.error, t.inventory.quantityRequired);
    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0 || (selectedItem.totalStock || 0) < qty) {
      return Alert.alert(t.inventory.error, `${t.inventory.insufficientStock} (${(selectedItem.totalStock || 0).toFixed(1)} ${selectedItem.unit || 'kg'})`);
    }

    const method = itemType === 'feed' ? store.useFeed : store.useAdditive;
    await handleAction(async () => {
      await method(selectedItem.id, qty, formData.pondId?.trim() || null, formData.notes?.trim() || '');
      
      const updatedItems = itemType === 'feed' ? store.feeds : store.additives;
      const updatedItem = updatedItems.find(i => i.id === selectedItem.id);
      if (updatedItem) {
        await checkAndCreateLowStockNotification(updatedItem, itemType);
      }
    }, `${t.inventory.usageRecorded} — ${qty} ${t.inventory.removed}`);
  }, [selectedItem, formData, itemType, store, handleAction, checkAndCreateLowStockNotification, t]);

  const handleDelete = useCallback((id: string, type: ItemType) => {
    Alert.alert(t.inventory.deleteItem, t.inventory.deleteConfirmation, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleAction(() => type === 'feed' ? store.deleteFeed(id) : store.deleteAdditive(id), t.inventory.itemDeleted) }
    ]);
  }, [store, handleAction, t]);

  const openModal = useCallback((type: ModalType, item?: Feed | Additive, iType?: ItemType) => {
    setModalType(type);
    if (item && iType) {
      setSelectedItem(item);
      setItemType(iType);
      setFormData(prev => ({ 
        ...prev, 
        unit: (item as any).unit || 'kg', 
        quantity: '', 
        unitPrice: '', 
        pondId: '', 
        notes: '', 
        batch: '', 
        expiry: '',
        reorderLevel: String(item.reorderLevel ?? '')
      }));
    }
    setMenuModalVisible(false);
    setModalVisible(true);
  }, []);

  const ItemCard = ({ item, type }: { item: Feed | Additive; type: ItemType }) => {
    const name = type === 'feed' ? (item as Feed).feedName : (item as Additive).additiveName;
    const totalStockInQty = item.stockInHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;
    const totalStockInCost = item.stockInHistory?.reduce((s, h) => s + ((h.quantity || 0) * (h.price || 0)), 0) || 0;
    const lastPrice = item.stockInHistory?.[item.stockInHistory.length - 1]?.price ?? 0;
    const avgPrice = totalStockInQty > 0 ? totalStockInCost / totalStockInQty : lastPrice;
    const totalOut = item.usageHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;
    const isLow = (item.reorderLevel ?? 0) > 0 && item.totalStock <= (item.reorderLevel ?? 0);

    return (
      <View style={[styles.card, isLow && { borderLeftWidth: 6, borderLeftColor: '#e74c3c' }]}>
        <TouchableOpacity onPress={() => openModal('history', item as any, type)} style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <View style={[styles.iconBox, { backgroundColor: type === 'feed' ? '#E8F4F8' : '#FFF4E6' }]}>
              <Ionicons name={type === 'feed' ? 'nutrition' : 'flask'} size={24} color={type === 'feed' ? '#315f57' : '#f39c12'} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{name}</Text>
              <Text style={styles.cardMeta}>{getCategoryLabel(type === 'feed' ? (item as Feed).feedType : (item as Additive).category)}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{getUnitLabel(item.unit || 'kg')} • {t.inventory.reorder}: {(item.reorderLevel || 0)}</Text>
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
          <View style={styles.flowItem}>
            <Ionicons name="arrow-down-circle" size={16} color="#27ae60" />
            <Text style={styles.flowText}>{t.inventory.in}: {totalStockInQty.toFixed(1)}</Text>
          </View>
          <View style={styles.flowItem}>
            <Ionicons name="arrow-up-circle" size={16} color="#e74c3c" />
            <Text style={styles.flowText}>{t.inventory.out}: {totalOut.toFixed(1)}</Text>
          </View>
          <View style={styles.flowItem}>
            <Ionicons name="pricetag" size={16} color="#315f57" />
            <Text style={styles.flowText}>{t.inventory.cost}: {formatCurrency((item.totalCost || 0))}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openModal('stockIn', item as any, type)}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.actionText}>{t.inventory.stockIn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSec]} onPress={() => openModal('usage', item as any, type)}>
            <Ionicons name="remove-circle" size={18} color="#315f57" />
            <Text style={[styles.actionText, styles.actionTextSec]}>{t.inventory.use}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8F4F8' }]} onPress={() => { 
            setSelectedItem(item as any); 
            setItemType(type);
            setModalType('editReorder'); 
            setModalVisible(true); 
          }}>
            <Ionicons name="alert-circle" size={18} color="#f39c12" />
            <Text style={[styles.actionTextSec, { color: '#f39c12', fontWeight: '700' }]}>{t.inventory.reorder}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const HistoryModal = () => {
    if (!selectedItem) return null;
    const stockHistory = [...(selectedItem.stockInHistory || [])].reverse();
    const usageHistory = [...(selectedItem.usageHistory || [])].reverse();

    const renderHistory = (history: any[], type: 'stock' | 'usage') => (
      <>
        <Text style={styles.historyTitle}>{type === 'stock' ? t.inventory.stockInHistory : t.inventory.usageHistory} ({history.length})</Text>
        {history.map((h: any) => (
          <View key={h.id || `${h.date}_${h.quantity}`} style={styles.historyItem}>
            <View style={[styles.historyIcon, { backgroundColor: type === 'stock' ? '#27ae60' : '#e74c3c' }]}>
              <Ionicons name={type === 'stock' ? 'arrow-down' : 'arrow-up'} size={16} color="#fff" />
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyQty}>{type === 'stock' ? '+' : '-'}{(h.quantity || 0).toFixed(1)} {getUnitLabel(h.unit || selectedItem.unit || 'kg')}{type === 'stock' ? ` @ Rp${(h.price || 0).toFixed(2)}${t.inventory.unitAbbrev}` : ''}</Text>
              <Text style={styles.historyDate}>{formatDateTime(h.date)}{type === 'stock' ? ` • ${t.inventory.total}: Rp${((h.quantity || 0) * (h.price || 0)).toFixed(2)}` : h.pondId ? ` • ${h.pondId}` : ''}</Text>
              {h.batch && <Text style={styles.historyNotes}>{t.inventory.batch}: {h.batch}</Text>}
              {h.expiry && <Text style={styles.historyNotes}>{t.inventory.expiry}: {h.expiry}</Text>}
              {h.notes && <Text style={styles.historyNotes}>{h.notes}</Text>}
            </View>
          </View>
        ))}
      </>
    );

    return (
      <ScrollView style={styles.historyScroll}>
        {renderHistory(stockHistory, 'stock')}
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
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
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
              <TouchableOpacity onPress={() => { setCategoryFilter(null); setSearchQuery(''); }} style={{ padding: 12 }}>
                <Ionicons name="close-circle" size={20} color="#6B7F91" />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {(activeTab === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map((cat) => (
                <TouchableOpacity key={cat} style={[styles.chip, categoryFilter === cat && styles.chipActive, { marginRight: 8 }]} onPress={() => setCategoryFilter(prev => prev === cat ? null : cat)}>
                  <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>{getCategoryLabel(cat)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
                  { icon: 'nutrition', label: t.inventory.feedStock, value: `${formatNumber(Math.round(metrics.totalFeedStock))} kg`, color: '#315f57' },
                  { icon: 'flask', label: t.inventory.additiveValue, value: formatCurrency(Math.round(metrics.totalAdditiveValue)), color: '#f39c12' },
                  { icon: 'cash', label: t.inventory.feedCost, value: formatCurrency(Math.round(metrics.totalFeedCost)), color: '#27ae60' },
                  { icon: 'wallet', label: t.inventory.feedStockValue, value: formatCurrency(Math.round(metrics.feedStockValue)), color: '#0d2137' },
                ].map((m, i) => (
                  <View key={i} style={styles.metricCard}>
                    <View style={[styles.metricIcon, { backgroundColor: m.color + '20' }]}>
                      <Ionicons name={m.icon as any} size={24} color={m.color} />
                    </View>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>{m.value}</Text>
                  </View>
                ))}
              </View>

              {lowStockItems.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                    <Text style={styles.sectionTitle}>{t.inventory.lowStockAlert} ({lowStockItems.length})</Text>
                  </View>
                  {lowStockItems.map((item) => (
                    <View key={item.id} style={styles.alertCard}>
                      <Ionicons name="warning" size={20} color="#e74c3c" />
                      <View style={styles.alertContent}>
                        <Text style={styles.alertText}>{item.name}</Text>
                        <Text style={styles.alertSub}>{item.stock.toFixed(1)} {getUnitLabel(item.unit || 'kg')} {t.inventory.remaining}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={20} color="#0d2137" />
                  <Text style={styles.sectionTitle}>{t.inventory.recentActivity}</Text>
                  <View style={styles.activityToggle}>
                    {(['all', 'stockIn', 'usage'] as const).map(filter => (
                      <TouchableOpacity key={filter} onPress={() => setRecentActivityFilter(filter)} style={[styles.toggleBtn, recentActivityFilter === filter && styles.toggleBtnActive]}>
                        <Text style={[styles.toggleText, recentActivityFilter === filter && styles.toggleTextActive]}>
                          {filter === 'all' ? t.inventory.all : filter === 'stockIn' ? t.inventory.stockInFilter : t.inventory.usageFilter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <FlatList
                  data={recentTransactions.filter(tx => recentActivityFilter === 'all' || (recentActivityFilter === 'stockIn' ? tx.type === 'Stock In' : tx.type === 'Usage'))}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item: tx }) => (
                    <View style={styles.txCard}>
                      <View style={[styles.txIcon, { backgroundColor: tx.type === 'Stock In' ? '#27ae60' : '#e74c3c' }]}>
                        <Ionicons name={tx.type === 'Stock In' ? 'arrow-down' : 'arrow-up'} size={16} color="#fff" />
                      </View>
                      <View style={styles.txContent}>
                        <Text style={styles.txName}>{tx.item}</Text>
                        <Text style={styles.txMeta}>{tx.type} • {formatDate(tx.date)}</Text>
                      </View>
                      <Text style={styles.txQty} numberOfLines={1}>{formatNumber(Math.round(tx.quantity))} kg</Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="water" size={20} color="#0d2137" />
                  <Text style={styles.sectionTitle}>{t.inventory.pondUsageSummary}</Text>
                </View>
                {Object.keys(pondUsageSummary).length === 0 ? (
                  <Text style={{ color: '#6b7280' }}>{t.inventory.noPondUsage}</Text>
                ) : (
                  Object.entries(pondUsageSummary).map(([pondId, qty]) => (
                    <View key={pondId} style={styles.txCard}>
                      <View style={[styles.txIcon, { backgroundColor: '#0d2137' }]}>
                        <Ionicons name="water" size={16} color="#fff" />
                      </View>
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
            filteredFeeds.length === 0 ? (
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
            )
          )}

          {activeTab === 'additive' && (
            filteredAdditives.length === 0 ? (
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
            )
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
                <View style={[styles.menuIcon, { backgroundColor: type === 'feed' ? '#E8F4F8' : '#FFF4E6' }]}>
                  <Ionicons name={type === 'feed' ? 'nutrition' : 'flask'} size={24} color={type === 'feed' ? '#315f57' : '#f39c12'} />
                </View>
                <Text style={styles.menuText}>{type === 'feed' ? t.inventory.addFeed : t.inventory.addAdditive}</Text>
                <Ionicons name="chevron-forward" size={20} color="#dce8f2" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setMenuModalVisible(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'add' ? `${itemType === 'feed' ? t.inventory.addFeed : t.inventory.addAdditive}` :
                  modalType === 'stockIn' ? t.inventory.stockIn :
                    modalType === 'usage' ? t.inventory.recordUsage :
                      modalType === 'history' ? t.inventory.transactionHistory : t.inventory.editReorderLevel}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close-circle" size={28} color="#dce8f2" />
              </TouchableOpacity>
            </View>

            {modalType === 'history' ? (
              <HistoryModal />
            ) : (
              <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                {modalType === 'add' && (
                  <>
                    {renderFormInput(t.inventory.itemName, itemType === 'feed' ? t.inventory.itemNamePlaceholder : t.inventory.additivePlaceholder, formData.itemName, (v) => setFormData(prev => ({ ...prev, itemName: v })), { required: true })}
                    {itemType === 'feed' && renderFormInput(t.inventory.brandOptional, t.inventory.brandPlaceholder, formData.brand || '', (v) => setFormData(prev => ({ ...prev, brand: v })))}
                    {renderChipSelector(t.inventory.category, itemType === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES, formData.category, (v) => setFormData(prev => ({ ...prev, category: v })), true)}
                    {renderChipSelector(t.inventory.unit, UNITS, formData.unit || 'kg', (v) => setFormData(prev => ({ ...prev, unit: v })))}
                    {renderFormInput(`${t.inventory.initialQuantity} (${getUnitLabel(formData.unit || 'kg')})`, t.inventory.quantityPlaceholder, formData.quantity, (v) => setFormData(prev => ({ ...prev, quantity: v })), { keyboardType: 'numeric', required: true })}
                    {renderFormInput(`${t.inventory.unitPrice} (Rp/unit)`, t.inventory.unitPricePlaceholder, formData.unitPrice, (v) => setFormData(prev => ({ ...prev, unitPrice: v })), { keyboardType: 'decimal-pad', required: true })}
                    {renderFormInput(t.inventory.batchOptional, t.inventory.batchPlaceholder, formData.batch || '', (v) => setFormData(prev => ({ ...prev, batch: v })))}
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
                        {renderFormInput(t.inventory.batchOptional, t.inventory.batchPlaceholder, formData.batch || '', (v) => setFormData(prev => ({ ...prev, batch: v })))}
                        {renderFormInput(t.inventory.expiryOptional, t.inventory.expiryPlaceholder, formData.expiry || '', (v) => setFormData(prev => ({ ...prev, expiry: v })))}
                      </>
                    )}

                    {modalType === 'usage' && renderPondUsageSelector()}

                    {modalType === 'editReorder' && (
                      <>
                        {renderFormInput(t.inventory.reorderLevel, t.inventory.reorderLevelPlaceholder, formData.reorderLevel || '', (v) => setFormData(prev => ({ ...prev, reorderLevel: v })), { keyboardType: 'numeric' })}
                        <View style={styles.buttons}>
                          <TouchableOpacity style={styles.btnCancel} onPress={closeModal}>
                            <Text style={styles.btnCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.btnSubmit} onPress={async () => {
                            const newLevel = Number(formData.reorderLevel);
                            if (isNaN(newLevel)) return Alert.alert(t.inventory.error, t.inventory.reorderMustBeNumber);
                            
                            try {
                              const fn = itemType === 'feed' ? store.updateFeed : store.updateAdditive;
                              await fn(selectedItem.id, { reorderLevel: newLevel });
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
                    <TouchableOpacity style={styles.btnCancel} onPress={closeModal}>
                      <Text style={styles.btnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSubmit} onPress={modalType === 'add' ? handleAddItem : modalType === 'stockIn' ? handleStockIn : handleUsage}>
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
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8F4F8' },
  tab: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#315f57' },
  tabText: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#dce8f2' },
  tabTextActive: { color: '#315f57' },
  searchContainer: { padding: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#FFF', borderBottomColor: '#E8F4F8', borderBottomWidth: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  searchInput: { backgroundColor: '#F4F8FC', borderColor: '#B8CBD9' },
  scroll: { padding: Platform.OS === 'android' ? 14 : 16, paddingBottom: 140 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  metricCard: { 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: 12, 
    flex: 1, 
    minWidth: '47%', 
    shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  metricIcon: { width: Platform.OS === 'android' ? 44 : 48, height: Platform.OS === 'android' ? 44 : 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  metricLabel: { fontSize: 12, color: '#0d2137', marginBottom: 4, fontWeight: '500' },
  metricValue: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: 'bold', color: '#0d2137' },
  section: { marginBottom: Platform.OS === 'android' ? 20 : 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', marginLeft: 8, flex: 1 },
  alertCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: 8, 
    borderLeftWidth: 4, 
    borderLeftColor: '#e74c3c', 
    shadowColor: '#e74c3c', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  alertContent: { marginLeft: 12, flex: 1 },
  alertText: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  alertSub: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#e74c3c' },
  txCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    borderRadius: 12, 
    marginBottom: 8, 
    shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  txIcon: { width: Platform.OS === 'android' ? 32 : 36, height: Platform.OS === 'android' ? 32 : 36, borderRadius: Platform.OS === 'android' ? 16 : 18, alignItems: 'center', justifyContent: 'center', marginRight: Platform.OS === 'android' ? 10 : 12 },
  txContent: { flex: 1 },
  txName: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#0d2137' },
  txMeta: { fontSize: 12, color: '#315f57', marginTop: 2 },
  txQty: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: 'bold', color: '#0d2137' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 70 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 19 : 20, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 14 : 16, marginBottom: 8 },
  emptySub: { color: '#315f57', fontSize: Platform.OS === 'android' ? 13 : 14 },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    marginBottom: Platform.OS === 'android' ? 14 : 16, 
    shadowColor: '#315f57', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3, 
    overflow: 'hidden' 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f4f8fc' 
  },
  cardTitle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: Platform.OS === 'android' ? 44 : 48, height: Platform.OS === 'android' ? 44 : 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Platform.OS === 'android' ? 10 : 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: Platform.OS === 'android' ? 16 : 17, fontWeight: 'bold', color: '#0d2137', marginBottom: 2 },
  cardMeta: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#315f57' },
  deleteBtn: { padding: 8, borderRadius: 8 },
  statsGrid: { 
    flexDirection: 'row', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#f4f8fc' 
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E8F4F8', marginHorizontal: 8 },
  statLabel: { fontSize: 12, color: '#0d2137', marginBottom: 4, fontWeight: '500' },
  statValue: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: 'bold', color: '#0d2137' },
  flowStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderTopColor: '#f4f8fc' 
  },
  flowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flowText: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0d2137', fontWeight: '500' },
  actions: { flexDirection: 'row', padding: Platform.OS === 'android' ? 10 : 12, gap: 8 },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#315f57', 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    borderRadius: 10, 
    gap: 6 
  },
  actionBtnSec: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#315f57' },
  actionText: { color: '#FFF', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600' },
  actionTextSec: { color: '#315f57' },
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
  menuTitle: { fontSize: Platform.OS === 'android' ? 20 : 22, fontWeight: 'bold', color: '#0d2137', textAlign: 'center', marginBottom: Platform.OS === 'android' ? 18 : 20 },
  menuOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#f4f8fc', 
    borderRadius: 12, 
    marginBottom: Platform.OS === 'android' ? 10 : 12 
  },
  menuIcon: { width: Platform.OS === 'android' ? 40 : 44, height: Platform.OS === 'android' ? 40 : 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Platform.OS === 'android' ? 10 : 12 },
  menuText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', flex: 1 },
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
});
