"use client";
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useDebouncedValue, useInventoryFeeds } from '@/hooks/useDashboardData';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { app, auth } from '@/lib/firebase';
import { storedDate } from '@/lib/storedDate';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentOperations } from "../../../../../../orson/useAgentOperations";
import { getFarmDateKey } from "../../../../../../shared/farmDate";
import { mergeOrsonOperation } from "../../../../../../shared/orsonAgentContract";
import { useSaveOperation } from "../../../../../../shared/useSaveOperation";
import { AcceptedVoid, formatQuantity, InventoryItem, isVoidRetryable, isVoidSaved, matchesVoidOperation } from './InventoryFeedsModel';


export function useInventoryFeedsState() {
  const { t, currentLanguage } = useLanguage();

  const copy = useDashboardCopy();

  const { formatCurrency, currencyConfig } = useCurrency();

  const { user, company } = useAuth();

  const userUid = user?.uid ?? '';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'additive'>('dashboard');

  const { save, busy: savePending } = useSaveOperation();

  const { feeds, additives: allAdditives, ponds, loading, companyId } = useInventoryFeeds<InventoryItem, InventoryItem, { id: string; pondName: string; cycleStatus?: string; cycleId?: string; cycleName?: string; pondCycleId?: string }>();

  const additives = useMemo(() => allAdditives.filter((item) => item.inventoryKind !== 'treatmentMix'), [allAdditives]);

  const [showArchived, setShowArchived] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [stockFilter, setStockFilter] = useState<'in' | 'out' | 'all'>('in');

  const debouncedSearchTerm = useDebouncedValue(searchTerm);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'stockIn' | 'usage' | 'audit'>('all');

  const [showAllStockAlerts, setShowAllStockAlerts] = useState(false);

  const [isInputMenuOpen, setInputMenuOpen] = useState(false);

  const [isTransactionFilterOpen, setTransactionFilterOpen] = useState(false);

  const inputMenuRef = useRef<HTMLDivElement>(null);

  const transactionFilterRef = useRef<HTMLDivElement>(null);

  const activePonds = useMemo(
    () => ponds.filter((pond) => pond.cycleStatus !== 'ended'),
    [ponds]
  );

  const hasPermission = useFarmPermissions();

  const canEditInventory = hasPermission('manageFeedInventory');

  const canUseOrson = hasPermission('useOrson');

  const agentTransport = useCallback(async (name: string, data: Record<string, unknown>) => {
    if (!userUid || auth.currentUser?.uid !== userUid || !navigator.onLine) {
      throw new Error('Reconnect and sign in to use farm actions.');
    }
    return (await httpsCallable(getFunctions(app), name, { timeout: 150000 })(data)).data;
  }, [userUid]);

  const agent = useAgentOperations(
    companyId || '',
    userUid,
    agentTransport,
    typeof window === 'undefined' ? undefined : window.localStorage,
  );

  useEffect(() => {
    if (!isInputMenuOpen && !isTransactionFilterOpen) return;

    const closeMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!inputMenuRef.current?.contains(target)) setInputMenuOpen(false);
      if (!transactionFilterRef.current?.contains(target)) setTransactionFilterOpen(false);
    };
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInputMenuOpen(false);
        setTransactionFilterOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeMenusOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeMenusOnEscape);
    };
  }, [isInputMenuOpen, isTransactionFilterOpen]);

  const formatDate = useCallback((value: unknown) => {
    if (typeof value === 'string') return value;
    return storedDate(value)?.toLocaleDateString(currentLanguage === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
  }, [currentLanguage]);

  const [isModalOpen, setModalOpen] = useState(false);

  const [modalType, setModalType] = useState<'add' | 'stockIn' | 'usage' | 'history' | 'editReorder'>('add');

  const [itemType, setItemType] = useState<'feed' | 'additive'>('feed');

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [removingUsageId, setRemovingUsageId] = useState<string | null>(null);

  const [usageRemovalError, setUsageRemovalError] = useState('');

  const [acceptedVoid, setAcceptedVoid] = useState<AcceptedVoid | null>(null);

  const acceptedVoidRef = useRef<AcceptedVoid | null>(null);

  const voidActionLock = useRef(false);

  const voidStatusPanelRef = useRef<HTMLElement | null>(null);

  const [preparingVoidRecordId, setPreparingVoidRecordId] = useState<string | null>(null);

  const [checkingVoidStatus, setCheckingVoidStatus] = useState(false);

  const [voidPreparationError, setVoidPreparationError] = useState('');

  const [voidStatusUncertain, setVoidStatusUncertain] = useState(false);

  const acceptedInScope = acceptedVoid !== null && acceptedVoid.companyId === companyId && acceptedVoid.uid === userUid;

  const acceptedVoidItemName = acceptedInScope
    ? (acceptedVoid.command.itemType === 'feed' ? feeds : additives).find(item => item.id === acceptedVoid.command.itemId)?.itemName
    : undefined;

  const storedVoidOperation = acceptedInScope
    ? agent.operations.find(operation => operation.id === acceptedVoid.operation.id)
    : undefined;

  const pendingVoidOperation = acceptedInScope
    ? (matchesVoidOperation(storedVoidOperation, acceptedVoid.command, acceptedVoid.operation.id)
      ? mergeOrsonOperation(acceptedVoid.operation, storedVoidOperation) : acceptedVoid.operation)
    : null;

  const hasOpenVoidOperation = !!pendingVoidOperation &&
    (voidStatusUncertain || (!isVoidSaved(pendingVoidOperation) && pendingVoidOperation.state !== 'discarded'));

  const canRetryVoid = acceptedInScope && acceptedVoid.retryVerified && !voidStatusUncertain &&
    !!pendingVoidOperation && matchesVoidOperation(pendingVoidOperation, acceptedVoid.command, acceptedVoid.operation.id) &&
    isVoidRetryable(pendingVoidOperation);

  const voidActionBusy = preparingVoidRecordId !== null || checkingVoidStatus;

  const historyItem = useMemo(() => {
    if (!selectedItem) return null;
    const currentItems = itemType === 'feed' ? feeds : additives;
    return currentItems.find((item) => item.id === selectedItem.id) || selectedItem;
  }, [selectedItem, itemType, feeds, additives]);

  useEffect(() => {
    if (isModalOpen && modalType === 'history') {
      voidStatusPanelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [isModalOpen, modalType, preparingVoidRecordId, checkingVoidStatus,
    acceptedVoid, pendingVoidOperation, voidPreparationError, agent.error]);

  const [formData, setFormData] = useState({
    itemName: '',
    brand: '',
    category: 'Grower',
    quantity: '',
    unitPrice: '',
    pondId: '',
    notes: '',
    unit: 'kg',
    stockDate: getFarmDateKey(new Date(), company?.timeZone),
    expiry: '',
    reorderLevel: '',
    manufacturer: '',
    ingredients: '',
    labelSourceUrl: '',
  });

  const metrics = useMemo(() => {
    const totalFeedStock = feeds.reduce((s, f) => s + (f.totalStock || 0), 0);
    const totalAdditiveValue = additives.reduce((s, a) => s + (a.totalCost || 0), 0);
    const feedStockValue = feeds.reduce((s, f) => s + (f.totalCost || 0), 0);
    const totalFeedUsed = feeds.reduce((sum, feed) => (
      sum + (feed.usageHistory || []).reduce((usageSum, usage) => usageSum + (Number(usage.quantity) || 0), 0)
    ), 0);

    // Low stock count
    const lowStockItems = [
      ...feeds.filter(f => f.totalStock > 0 && f.reorderLevel !== undefined && f.totalStock <= f.reorderLevel),
      ...additives.filter(a => a.totalStock > 0 && a.reorderLevel !== undefined && a.totalStock <= a.reorderLevel)
    ];

    return {
      totalFeedStock,
      totalAdditiveValue,
      feedStockValue,
      totalFeedUsed,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [additives, feeds]);

  const { activeRecentTransactions, voidedRecentTransactions } = useMemo(() => {
    const activeTxs: { id: string; type: string; itemType: string; name: string; date: string; quantity: number; unit: string; createdAt: number; voided?: boolean }[] = [];
    const voidedTxs: { id: string; type: string; itemType: string; name: string; date: string; quantity: number; unit: string; createdAt: number; voided?: boolean }[] = [];
    [...feeds.map(f => ({ ...f, type: 'feed' })), ...additives.map(a => ({ ...a, type: 'additive' }))].forEach(item => {
      (item.stockInHistory || []).forEach((h) => {
        const tx = {
          id: h.id,
          type: 'Stock In',
          itemType: item.type,
          name: item.itemName,
          date: formatDate(h.date),
          quantity: h.quantity,
          unit: item.unit || 'kg',
          createdAt: storedDate(h.createdAt)?.getTime() ?? storedDate(h.date)?.getTime() ?? 0,
          voided: Boolean(h.voided),
        };
        if (h.voided) {
          voidedTxs.push(tx);
        } else {
          activeTxs.push(tx);
        }
      });
      (item.usageHistory || []).forEach((h) => {
        activeTxs.push({
          id: h.id,
          type: 'Usage',
          itemType: item.type,
          name: item.itemName,
          date: formatDate(h.date),
          quantity: h.quantity,
          unit: item.unit || 'kg',
          createdAt: storedDate(h.createdAt)?.getTime() ?? storedDate(h.date)?.getTime() ?? 0,
        });
      });
    });
    return {
      activeRecentTransactions: activeTxs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10),
      voidedRecentTransactions: voidedTxs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10),
    };
  }, [feeds, additives, formatDate]);

  const displayedTransactions = useMemo(() => {
    if (recentActivityFilter === 'audit') {
      return voidedRecentTransactions;
    }
    if (recentActivityFilter === 'stockIn') {
      return activeRecentTransactions.filter(tx => tx.type === 'Stock In');
    }
    if (recentActivityFilter === 'usage') {
      return activeRecentTransactions.filter(tx => tx.type === 'Usage');
    }
    return activeRecentTransactions;
  }, [recentActivityFilter, activeRecentTransactions, voidedRecentTransactions]);

  const filteredItems = useMemo(() => {
    const items = activeTab === 'feed' ? feeds : additives;
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !normalizedSearch ||
        item.itemName.toLowerCase().includes(normalizedSearch) ||
        (item.brand || '').toLowerCase().includes(normalizedSearch);
      const matchesCategory = !categoryFilter || (activeTab === 'feed' ? item.feedType : item.category) === categoryFilter;
      const matchesStock = stockFilter === 'all' || (stockFilter === 'in' ? item.totalStock > 0 : item.totalStock === 0);
      return matchesSearch && matchesCategory && (item.archived ? showArchived : matchesStock);
    });
  }, [feeds, additives, activeTab, debouncedSearchTerm, categoryFilter, stockFilter, showArchived]);

  const normalizeItemText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

  const existingItems = itemType === 'feed' ? feeds : additives;

  const itemSuggestions = modalType === 'add' ? existingItems.filter(item => {
    const name = normalizeItemText(formData.itemName);
    const brand = normalizeItemText(itemType === 'feed' ? formData.brand : formData.manufacturer);
    return Boolean(name || brand) && (!name || normalizeItemText(item.itemName).includes(name)) &&
      (!brand || normalizeItemText(`${item.brand || ''} ${item.productLabel?.manufacturer || ''}`).includes(brand));
  }).slice(0, 6) : [];

  const dashboardMetrics = [
    { label: t.inventory.feedStock, value: `${formatQuantity(metrics.totalFeedStock)} kg` },
    { label: copy('Feed Used'), value: `${formatQuantity(metrics.totalFeedUsed)} kg` },
    { label: copy('Feed Value'), value: formatCurrency(metrics.feedStockValue) },
    { label: t.inventory.additiveValue, value: formatCurrency(metrics.totalAdditiveValue) },
  ];
  return {
    t,
    copy,
    formatCurrency,
    currencyConfig,
    user,
    company,
    userUid,
    activeTab,
    setActiveTab,
    save,
    savePending,
    feeds,
    ponds,
    loading,
    companyId,
    additives,
    showArchived,
    setShowArchived,
    searchTerm,
    setSearchTerm,
    stockFilter,
    setStockFilter,
    categoryFilter,
    setCategoryFilter,
    recentActivityFilter,
    setRecentActivityFilter,
    showAllStockAlerts,
    setShowAllStockAlerts,
    isInputMenuOpen,
    setInputMenuOpen,
    isTransactionFilterOpen,
    setTransactionFilterOpen,
    inputMenuRef,
    transactionFilterRef,
    activePonds,
    canEditInventory,
    canUseOrson,
    agent,
    formatDate,
    isModalOpen,
    setModalOpen,
    modalType,
    setModalType,
    itemType,
    setItemType,
    selectedItem,
    setSelectedItem,
    removingUsageId,
    setRemovingUsageId,
    usageRemovalError,
    setUsageRemovalError,
    acceptedVoid,
    setAcceptedVoid,
    acceptedVoidRef,
    voidActionLock,
    voidStatusPanelRef,
    preparingVoidRecordId,
    setPreparingVoidRecordId,
    checkingVoidStatus,
    setCheckingVoidStatus,
    voidPreparationError,
    setVoidPreparationError,
    voidStatusUncertain,
    setVoidStatusUncertain,
    acceptedInScope,
    acceptedVoidItemName,
    pendingVoidOperation,
    hasOpenVoidOperation,
    canRetryVoid,
    voidActionBusy,
    historyItem,
    formData,
    setFormData,
    metrics,
    displayedTransactions,
    filteredItems,
    normalizeItemText,
    existingItems,
    itemSuggestions,
    dashboardMetrics,
  };
}
