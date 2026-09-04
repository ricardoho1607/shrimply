"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Box,
  FlaskConical,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Waves,
  LayoutDashboard,
  ArrowUpDown
} from 'lucide-react';
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useDebouncedValue, useInventoryFeeds } from '@/hooks/useDashboardData';
import { getFarmDateKey } from '../../../../../../shared/farmDate';
import { buildInventoryExpense, financeSyncDocumentId } from '../../../../../../shared/financeSync';
import styles from './InventoryFeeds.module.css';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { buildInventoryProductLabel, type InventoryProductLabel } from '../../../../../../shared/productLabel';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';

/* --- Types --------------------------------------------------- */

interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  price: number;
  notes?: string;
  expiry?: string;
  unit?: string;
  createdAt: any;
}

interface UsageHistory {
  id: string;
  date: string;
  quantity: number;
  pondId?: string;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  notes?: string;
  createdAt: any;
}

interface InventoryItem {
  id: string;
  companyId: string;
  itemName: string;
  brand?: string;
  category: string;
  feedType?: string;
  inventoryKind?: 'additive' | 'treatmentMix';
  productLabel?: InventoryProductLabel | null;
  unit?: string;
  reorderLevel?: number;
  stockInHistory: StockHistory[];
  usageHistory: UsageHistory[];
  totalStock: number;
  totalCost: number;
  lastUpdated: any;
  createdAt: any;
}

const UNITS = ['kg', 'L', 'pack', 'sack'];
const FEED_CATEGORIES = ['Starter', 'Grower', 'Finisher', 'Other'];
const ADDITIVE_CATEGORIES = ['Water Conditioner', 'Probiotic', 'Mineral', 'Vitamin', 'Other'];
const formatQuantity = (value: number) => new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0);

export default function InventoryFeedsPage() {
  const { t, currentLanguage } = useLanguage();
  const copy = useDashboardCopy();
  const { formatCurrency, currencyConfig } = useCurrency();
  const { user, company } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'additive'>('dashboard');
  const { feeds, additives: allAdditives, ponds, loading, companyId } = useInventoryFeeds<InventoryItem, InventoryItem, any>();
  const additives = useMemo(() => allAdditives.filter((item) => item.inventoryKind !== 'treatmentMix'), [allAdditives]);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'stockIn' | 'usage'>('all');
  const [isInputMenuOpen, setInputMenuOpen] = useState(false);
  const [isTransactionFilterOpen, setTransactionFilterOpen] = useState(false);
  const inputMenuRef = useRef<HTMLDivElement>(null);
  const transactionFilterRef = useRef<HTMLDivElement>(null);
  const activePonds = useMemo(
    () => ponds.filter((pond: any) => pond.cycleStatus !== 'ended'),
    [ponds]
  );
  const hasPermission = useFarmPermissions();
  const canEditInventory = hasPermission('manageFeedInventory');

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

  const formatDate = useCallback((date: any) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toLocaleDateString(currentLanguage === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toLocaleDateString(currentLanguage === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {}
    return '';
  }, [currentLanguage]);

  // Modal States
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'stockIn' | 'usage' | 'history' | 'editReorder'>('add');
  const [itemType, setItemType] = useState<'feed' | 'additive'>('feed');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form State
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
      ...feeds.filter(f => f.reorderLevel !== undefined && f.totalStock <= (f.reorderLevel || 0)),
      ...additives.filter(a => a.reorderLevel !== undefined && a.totalStock <= (a.reorderLevel || 0))
    ];

    return {
      totalFeedStock,
      totalAdditiveValue,
      feedStockValue,
      totalFeedUsed,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [additives, feeds, formatDate]);

  const recentTransactions = useMemo(() => {
    const txs: any[] = [];
    [...feeds.map(f => ({ ...f, type: 'feed' })), ...additives.map(a => ({ ...a, type: 'additive' }))].forEach(item => {
      (item.stockInHistory || []).forEach((h: any) => {
        txs.push({
          id: h.id,
          type: 'Stock In',
          itemType: item.type,
          name: item.itemName,
          date: formatDate(h.date),
          quantity: h.quantity,
          unit: item.unit || 'kg',
          createdAt: h.createdAt?.toMillis?.() || (h.date?.seconds ? h.date.seconds * 1000 : new Date(h.date).getTime())
        });
      });
      (item.usageHistory || []).forEach((h: any) => {
        txs.push({
          id: h.id,
          type: 'Usage',
          itemType: item.type,
          name: item.itemName,
          date: formatDate(h.date),
          quantity: h.quantity,
          unit: item.unit || 'kg',
          createdAt: h.createdAt?.toMillis?.() || (h.date?.seconds ? h.date.seconds * 1000 : new Date(h.date).getTime())
        });
      });
    });
    return txs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  }, [feeds, additives]);

  const filteredItems = useMemo(() => {
    const items = activeTab === 'feed' ? feeds : additives;
    const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch = !normalizedSearch ||
                            item.itemName.toLowerCase().includes(normalizedSearch) ||
                            (item.brand || '').toLowerCase().includes(normalizedSearch);
      const matchesCategory = !categoryFilter || (activeTab === 'feed' ? (item as any).feedType : (item as any).category) === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [feeds, additives, activeTab, debouncedSearchTerm, categoryFilter]);

  const handleOpenModal = (type: typeof modalType, item?: InventoryItem, iType?: typeof itemType) => {
    if (!canEditInventory && type !== 'history') return;
    const effectiveItemType = iType || itemType;
    setModalType(type);
    setItemType(effectiveItemType);
    if (item) {
      setSelectedItem(item);
      const productLabel = effectiveItemType === 'additive' ? item.productLabel : undefined;
      setFormData({
        ...formData,
        itemName: item.itemName,
        category: (item as any).feedType || (item as any).category,
        unit: item.unit || 'kg',
        reorderLevel: String(item.reorderLevel || ''),
        quantity: '',
        unitPrice: '',
        notes: '',
        stockDate: getFarmDateKey(new Date(), company?.timeZone),
        expiry: '',
        pondId: '',
        manufacturer: productLabel?.manufacturer || '',
        ingredients: productLabel?.ingredients?.join('\n') || '',
        labelSourceUrl: productLabel?.sourceUrl || '',
      });
    } else {
      setSelectedItem(null);
      setFormData({
        itemName: '',
        brand: '',
        category: effectiveItemType === 'feed' ? 'Grower' : 'Water Conditioner',
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
    }
    setModalOpen(true);
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    if (!canEditInventory) return;

    try {
      const qty = Number(formData.quantity);
      const price = Number(formData.unitPrice);
      const reorder = Number(formData.reorderLevel);
      if (['add', 'stockIn', 'usage'].includes(modalType) && (!Number.isFinite(qty) || qty <= 0)) {
        alert(copy('Quantity must be greater than 0.'));
        return;
      }
      if (['add', 'stockIn'].includes(modalType) && (!Number.isFinite(price) || price <= 0)) {
        alert(copy('Unit price must be greater than 0.'));
        return;
      }

      if (modalType === 'add') {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const now = serverTimestamp();
        const itemRef = doc(collection(db, 'companies', companyId, collectionName));
        const stockId = crypto.randomUUID();
        const stockDate = formData.stockDate;
        const productLabel = itemType === 'additive' ? buildInventoryProductLabel({
          manufacturer: formData.manufacturer,
          ingredientsText: formData.ingredients,
          sourceUrl: formData.labelSourceUrl,
          recordedAt: getFarmDateKey(new Date(), company?.timeZone),
        }) : undefined;
        const itemData: any = {
          companyId,
          [itemType === 'feed' ? 'feedName' : 'additiveName']: formData.itemName,
          brand: formData.brand || '',
          [itemType === 'feed' ? 'feedType' : 'category']: formData.category,
          ...(productLabel ? { productLabel } : {}),
          unit: formData.unit,
          reorderLevel: isNaN(reorder) ? 0 : reorder,
          totalStock: qty,
          totalCost: qty * price,
          stockInHistory: [{
            id: stockId,
            date: stockDate,
            quantity: qty,
            price: price,
            notes: formData.notes,
            expiry: formData.expiry,
            createdAt: Timestamp.now()
          }],
          usageHistory: [],
          lastUpdated: now,
          createdAt: now
        };
        const expense = buildInventoryExpense({
          id: stockId,
          itemId: itemRef.id,
          type: itemType,
          itemName: formData.itemName,
          quantity: qty,
          price,
          unit: formData.unit,
          date: stockDate,
          notes: formData.notes,
        });
        await runTransaction(db, async (tx) => {
          tx.set(itemRef, itemData);
          tx.set(doc(db, 'companies', companyId, 'expenses', financeSyncDocumentId(expense.reference)), {
            ...expense,
            companyId,
            addedBy: user?.uid || '',
            addedByName: user?.name || user?.email || 'Unknown',
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      }
      else if (modalType === 'stockIn' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        const stockId = crypto.randomUUID();
        const stockDate = formData.stockDate;
        const expense = buildInventoryExpense({
          id: stockId,
          itemId: selectedItem.id,
          type: itemType,
          itemName: selectedItem.itemName,
          quantity: qty,
          price,
          unit: selectedItem.unit,
          date: stockDate,
          notes: formData.notes,
        });

        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(ref);
          if (!snapshot.exists()) throw new Error('Item not found');
          const data = snapshot.data();

          const newStock = (data.totalStock || 0) + qty;
          const newCost = (data.totalCost || 0) + (qty * price);

          tx.update(ref, {
            totalStock: newStock,
            totalCost: newCost,
            stockInHistory: arrayUnion({
              id: stockId,
              date: stockDate,
              quantity: qty,
              price: price,
              notes: formData.notes,
              expiry: formData.expiry,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          });
          tx.set(doc(db, 'companies', companyId, 'expenses', financeSyncDocumentId(expense.reference)), {
            ...expense,
            companyId,
            addedBy: user?.uid || '',
            addedByName: user?.name || user?.email || 'Unknown',
            timestamp: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      }
      else if (modalType === 'usage' && selectedItem) {
        if (qty > selectedItem.totalStock) {
          alert(copy('Insufficient stock!'));
          return;
        }
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        const selectedPond = activePonds.find((pond: any) => pond.id === formData.pondId);

        await runTransaction(db, async (tx) => {
          const snapshot = await tx.get(ref);
          if (!snapshot.exists()) throw new Error('Item not found');
          const data = snapshot.data();

          const newStock = Math.max(0, (data.totalStock || 0) - qty);
          const currentStock = data.totalStock || 0;
          const currentCost = data.totalCost || 0;
          const unitPrice = currentStock > 0 ? currentCost / currentStock : 0;
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw new Error('Item cost is missing. Stock this item with a price before recording usage.');
          }

          tx.update(ref, {
            totalStock: newStock,
            totalCost: Math.max(0, currentCost - (qty * unitPrice)),
            usageHistory: arrayUnion({
              id: Date.now().toString(),
              date: getFarmDateKey(new Date(), company?.timeZone),
              quantity: qty,
              unitPrice,
              totalCost: qty * unitPrice,
              pondId: formData.pondId || null,
              cycleId: selectedPond?.cycleId || null,
              cycleName: selectedPond?.cycleName || null,
              pondCycleId: selectedPond?.pondCycleId || selectedPond?.id || null,
              notes: formData.notes,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          });
        });
      }
      else if (modalType === 'editReorder' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);
        await updateDoc(ref, {
          reorderLevel: isNaN(reorder) ? 0 : reorder,
          ...(itemType === 'additive' ? {
            productLabel: buildInventoryProductLabel({
              manufacturer: formData.manufacturer,
              ingredientsText: formData.ingredients,
              sourceUrl: formData.labelSourceUrl,
              recordedAt: getFarmDateKey(new Date(), company?.timeZone),
            }) || null,
          } : {}),
          lastUpdated: serverTimestamp()
        });
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Inventory action failed:', err);
      alert(copy('Operation failed. Please try again.'));
    }
  };

  const handleDeleteItem = async (item: InventoryItem, type: 'feed' | 'additive') => {
    if (!companyId || !window.confirm(copy('Are you sure you want to delete {item}?', { item: item.itemName }))) return;
    if (!canEditInventory) return;
    try {
      const collectionName = type === 'feed' ? 'feeds' : 'additives';
      const itemRef = doc(db, 'companies', companyId, collectionName, item.id);
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(itemRef);
        if (!snapshot.exists()) return;
        const stockHistory = Array.isArray(snapshot.data().stockInHistory) ? snapshot.data().stockInHistory : [];
        stockHistory.forEach((stock: { id?: string }) => {
          if (!stock.id) return;
          const reference = `INVENTORY-${type}-${item.id}-${stock.id}`;
          tx.delete(doc(db, 'companies', companyId, 'expenses', financeSyncDocumentId(reference)));
        });
        tx.delete(itemRef);
      });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const dashboardMetrics = [
    { label: t.inventory.feedStock, value: `${formatQuantity(metrics.totalFeedStock)} kg` },
    { label: copy('Feed Used'), value: `${formatQuantity(metrics.totalFeedUsed)} kg` },
    { label: copy('Feed Value'), value: formatCurrency(metrics.feedStockValue) },
    { label: t.inventory.additiveValue, value: formatCurrency(metrics.totalAdditiveValue) },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="dashboard-page-relaxed authenticated-compact-page business-dashboard-page" style={{ paddingBottom: '32px' }}>
      <div className="inventory-primary-toolbar animate-fade-up">
        <div className="inventory-section-tabs">
          {[
            { id: 'dashboard', label: t.inventory.dashboard, icon: LayoutDashboard },
            { id: 'feed', label: t.inventory.feeds, icon: Box },
            { id: 'additive', label: t.inventory.additives, icon: FlaskConical }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inventory-section-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} style={{ opacity: activeTab === tab.id ? 1 : 0.6 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {canEditInventory && (
          <div className="pond-detail-record-menu inventory-input-menu" ref={inputMenuRef}>
            <button
              type="button"
              className="pond-detail-record-trigger inventory-input-trigger"
              aria-label={copy('Add inventory input')}
              aria-expanded={isInputMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setTransactionFilterOpen(false);
                setInputMenuOpen((open) => !open);
              }}
            >
              <Plus size={15} />
              <span>{copy('Input')}</span>
            </button>
            {isInputMenuOpen && (
              <div
                role="menu"
                className="pond-detail-record-popover inventory-input-popover"
                style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, bottom: 'auto', left: 'auto', width: 'min(238px, calc(100vw - 24px))' }}
              >
                <Link role="menuitem" href="/dashboard/inventory/treatment-mixes" onClick={() => setInputMenuOpen(false)}>
                  <FlaskConical size={16} />
                  <span><strong>{copy('Treatment Mixes')}</strong><small>{copy('Create or manage treatment recipes')}</small></span>
                </Link>
                <button type="button" role="menuitem" onClick={() => {
                  setInputMenuOpen(false);
                  handleOpenModal('add', undefined, 'feed');
                }}>
                  <Box size={16} />
                  <span><strong>{t.inventory.addFeed}</strong><small>{copy('Add feed stock to inventory')}</small></span>
                </button>
                <button type="button" role="menuitem" onClick={() => {
                  setInputMenuOpen(false);
                  handleOpenModal('add', undefined, 'additive');
                }}>
                  <FlaskConical size={16} />
                  <span><strong>{t.inventory.addAdditive}</strong><small>{copy('Add an inventory additive')}</small></span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {activeTab === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div className="glass-card inventory-summary-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {dashboardMetrics.map((metric) => (
                <div key={metric.label} className="inventory-summary-item">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>

            {/* Split View: Alerts and Transactions */}
            <div className="dashboard-report-grid inventory-dashboard-split" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, 1fr)' }}>

              {/* Critical Alerts Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="inventory-section-heading">{copy('Stock Status Alerts')}</h2>
                  <span className="inventory-alert-count">
                    {metrics.lowStockCount} {copy(metrics.lowStockCount === 1 ? 'Alert' : 'Alerts')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {metrics.lowStockItems.map((item, i) => (
                    <div key={item.id} className="glass-card animate-fade-up" style={{
                      padding: '24px 28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(231, 76, 60, 0.02)',
                      border: '1px solid rgba(231, 76, 60, 0.12)',
                      animationDelay: `${i * 0.05}s`,
                      boxShadow: '0 10px 28px rgba(231, 76, 60, 0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '50%', background: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c',
                          boxShadow: '0 8px 20px rgba(231, 76, 60, 0.15)', border: '1px solid #fee2e2'
                        }}>
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{item.itemName}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e74c3c', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Box size={14} />
                            {copy('Critical:')} {formatQuantity(item.totalStock)} {item.unit} {copy('remaining')}
                          </div>
                        </div>
                      </div>
                      {canEditInventory && (
                        <button
                          className="btn-primary"
                          style={{
                            padding: '12px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: '#e74c3c',
                            letterSpacing: '0',
                            textTransform: 'none',
                            boxShadow: '0 4px 15px rgba(231, 76, 60, 0.18)'
                          }}
                          onClick={() => handleOpenModal('stockIn', item, (item as any).feedType ? 'feed' : 'additive')}
                        >
                          {copy('Restock now')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Ledger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="inventory-section-heading">{copy('Recent Transactions')}</h2>
                  <div className="pond-detail-record-menu inventory-filter-menu" ref={transactionFilterRef}>
                    <button
                      type="button"
                      className="inventory-filter-trigger"
                      aria-label={copy('Filter transactions')}
                      aria-expanded={isTransactionFilterOpen}
                      aria-haspopup="menu"
                      onClick={() => {
                        setInputMenuOpen(false);
                        setTransactionFilterOpen((open) => !open);
                      }}
                    >
                      <ArrowUpDown size={17} />
                    </button>
                    {isTransactionFilterOpen && (
                      <div
                        className="pond-detail-record-popover inventory-filter-popover"
                        role="menu"
                        style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, bottom: 'auto', left: 'auto', width: 'min(210px, calc(100vw - 24px))' }}
                      >
                        {([
                          { id: 'all', label: 'All transactions', description: 'Show every stock movement' },
                          { id: 'stockIn', label: 'Stock in', description: 'Show incoming stock only' },
                          { id: 'usage', label: 'Stock out', description: 'Show inventory usage only' },
                        ] as const).map((filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            role="menuitem"
                            className={recentActivityFilter === filter.id ? 'is-active' : ''}
                            onClick={() => {
                              setRecentActivityFilter(filter.id);
                              setTransactionFilterOpen(false);
                            }}
                          >
                            <span><strong>{copy(filter.label)}</strong><small>{copy(filter.description)}</small></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {recentTransactions
                    .filter(tx => recentActivityFilter === 'all' || (recentActivityFilter === 'stockIn' ? tx.type === 'Stock In' : tx.type === 'Usage'))
                    .map((tx, i) => (
                    <div key={tx.id} className="glass-card animate-fade-up" style={{
                      padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'white',
                      animationDelay: `${i * 0.05}s`, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '12px',
                        background: 'var(--primary-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)'
                      }}>
                        {tx.type === 'Stock In' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{tx.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{copy(tx.type)}</span>
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {tx.type === 'Stock In' ? '+' : '-'}{formatQuantity(tx.quantity)}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{tx.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Advanced Search and Filtering */}
            <div className="glass-card dashboard-toolbar-card animate-fade-up" style={{ background: 'white' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  placeholder={t.inventory.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'var(--bg-mid)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px 12px 46px',
                    width: '100%',
                    fontSize: '14px',
                    outline: 'none',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', padding: '5px', background: 'var(--bg-mid)', borderRadius: '14px', border: '1px solid var(--border)', overflowX: 'auto' }}>
                <button
                  onClick={() => setCategoryFilter(null)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                    background: !categoryFilter ? 'white' : 'transparent',
                    color: !categoryFilter ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: !categoryFilter ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >{copy('All Categories')}</button>
                {(activeTab === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                      background: categoryFilter === cat ? 'white' : 'transparent',
                      color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: categoryFilter === cat ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >{copy(cat)}</button>
                ))}
              </div>
            </div>

            {/* Dynamic Inventory Grid */}
            {filteredItems.length === 0 ? (
              <div className="glass-card animate-fade-up" style={{ padding: '56px 28px', background: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '22px', border: '1px solid var(--border)' }}>
                  <Box size={34} />
                </div>
                <h2 style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
                  {activeTab === 'feed' ? t.inventory.noFeedItems : t.inventory.noAdditives}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '26px', fontWeight: 600, fontSize: '14px', maxWidth: '400px', lineHeight: 1.6 }}>
                  {activeTab === 'feed' ? t.inventory.addFeedToStart : t.inventory.addAdditivesToStart}
                </p>
                {canEditInventory && (
                  <button
                    className="btn-primary"
                    onClick={() => handleOpenModal('add', undefined, activeTab)}
                    style={{ height: '44px', padding: '0 20px', borderRadius: '10px', fontWeight: 500, fontSize: '14px', letterSpacing: 0, textTransform: 'none', boxShadow: 'var(--shadow-glow)' }}
                  >
                    <Plus size={22} />
                    {copy('Add Your First')} {copy(activeTab === 'feed' ? 'Feed' : 'Additive')}
                  </button>
                )}
              </div>
            ) : (
            <div className="responsive-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {filteredItems.map((item, idx) => {
                  const isLow = (item.reorderLevel || 0) > 0 && item.totalStock <= (item.reorderLevel || 0);
                  const averagePrice = item.totalStock > 0 ? item.totalCost / item.totalStock : 0;
                  const totalIn = item.stockInHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;
                  const totalOut = item.usageHistory?.reduce((s, h) => s + (h.quantity || 0), 0) || 0;

                  return (
                    <div key={item.id} className="glass-card animate-fade-up" style={{
                      background: 'white',
                      padding: '0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      border: isLow ? '2px solid #e74c3c' : '1px solid var(--border)',
                      boxShadow: isLow ? '0 10px 40px rgba(231, 76, 60, 0.1)' : 'var(--shadow-card)',
                      animationDelay: `${idx * 0.05}s`,
                      transform: 'translateZ(0)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      <div className={styles.inventoryCardHeader}>
                        <div className={styles.inventoryCardIdentity}>
                          <h3>{item.itemName}</h3>
                          <div className={styles.inventoryCardMeta}>
                            <span>{item.brand || copy('No Brand')}</span>
                            <span className={styles.inventoryCardCategory}>
                              {copy(item.feedType || item.category)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.inventoryCardHeaderActions}>
                          <button
                            type="button"
                            className={styles.inventoryCardHeaderAction}
                            onClick={() => handleOpenModal('history', item, activeTab)}
                          >
                            {copy('History')}
                          </button>
                          {canEditInventory && (
                            <button
                              type="button"
                              className={`${styles.inventoryCardHeaderAction} ${styles.inventoryCardDeleteAction}`}
                              onClick={() => handleDeleteItem(item, activeTab)}
                            >
                              {copy('Delete')}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={styles.inventoryMetrics}>
                        <div className={styles.inventoryMetric}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.stock}</span>
                          <div className={styles.inventoryMetricValue} style={{ color: isLow ? '#e74c3c' : 'var(--text-primary)' }}>
                            {formatQuantity(item.totalStock)}
                            <span className={styles.inventoryMetricUnit}>{item.unit}</span>
                          </div>
                          {isLow && (
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e74c3c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={12} /> {copy('Low Stock Alert')}
                            </div>
                          )}
                        </div>
                        <div className={styles.inventoryMetric}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.avgPrice}</span>
                          <span className={styles.inventoryMetricValue}>{formatCurrency(averagePrice)}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('per')} {item.unit}</span>
                        </div>
                        <div className={styles.inventoryMetric}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.value}</span>
                          <span className={styles.inventoryMetricValue}>{formatCurrency(item.totalCost || 0)}</span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{copy('Total Value')}</span>
                        </div>
                      </div>

                      <div className={styles.inventoryCardActivity}>
                        <div>
                          {t.inventory.in}: {formatQuantity(totalIn)} {item.unit}
                        </div>
                        <div>
                          {t.inventory.out}: {formatQuantity(totalOut)} {item.unit}
                        </div>
                      </div>

                      {canEditInventory && (
                        <div className={styles.inventoryCardActions}>
                          <button
                            type="button"
                            className={styles.inventoryCardPrimaryAction}
                            onClick={() => handleOpenModal('stockIn', item, activeTab)}
                          >
                            {t.inventory.stockIn}
                          </button>
                          <button
                            type="button"
                            className={styles.inventoryCardSecondaryAction}
                            onClick={() => handleOpenModal('usage', item, activeTab)}
                          >
                            {t.inventory.use}
                          </button>
                          <button
                            type="button"
                            className={styles.inventoryCardSecondaryAction}
                            onClick={() => handleOpenModal('editReorder', item, activeTab)}
                          >
                            {copy(activeTab === 'additive' ? 'Product' : 'Threshold')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- MODERNIZED MODALS --------------------------------------------- */}
      {isModalOpen && (
        <div
          className="responsive-modal-overlay inventory-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
          style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div
            className="glass-card responsive-modal animate-fade-up inventory-modal"
            role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title"
            style={{
              width: '100%', maxWidth: modalType === 'history' ? '920px' : '560px', background: '#FFFFFF', padding: '0',
              overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
              maxHeight: 'calc(100dvh - 24px)', display: 'flex', flexDirection: 'column',
              border: '1px solid var(--border)', borderRadius: '16px'
            }}
          >
            <div className="responsive-modal-header inventory-modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <div>
                <div>
                  <h2 id="inventory-modal-title" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {modalType === 'add' ? `${copy('Add New')} ${copy(itemType === 'feed' ? 'Feed' : 'Additive')}` :
                     modalType === 'stockIn' ? t.inventory.stockIn :
                     modalType === 'usage' ? t.inventory.recordUsage :
                     modalType === 'history' ? t.inventory.transactionHistory : copy(itemType === 'additive' ? 'Product Label & Threshold' : 'Threshold Settings')}
                  </h2>
                  {selectedItem && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                      {selectedItem.itemName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label={copy('Close inventory dialog')}
                style={{
                  width: '36px', height: '36px', background: 'var(--bg-mid)', border: '1px solid transparent', borderRadius: '10px',
                  padding: '0', cursor: 'pointer', color: 'var(--text-primary)', display: 'grid', placeItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="responsive-modal-body inventory-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {modalType === 'history' && selectedItem ? (
                <div className="responsive-two-column" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  {/* Stock In Ledger */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(39, 174, 96, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27ae60' }}>
                        <ArrowDownCircle size={20} />
                      </div>
                      {copy('Stock In Records')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedItem.stockInHistory.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-mid)', borderRadius: '20px', color: 'var(--text-faint)', fontWeight: 600 }}>
                          {copy('No stock intake recorded.')}
                        </div>
                      ) : (
                        [...selectedItem.stockInHistory].reverse().map((h) => (
                          <div key={h.id} className="glass-card" style={{ padding: '20px 24px', background: 'white', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={18} color="var(--primary)" />
                                <span style={{ fontWeight: 600, fontSize: '16px' }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '18px', color: '#27ae60' }}>
                                +{formatQuantity(h.quantity)} {selectedItem.unit}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                              <div>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>{t.inventory.stockDate}</span>
                                {formatDate(h.date)}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>{copy('Unit Price')}</span>
                                {formatCurrency(h.price)}
                              </div>
                            </div>
                            {h.notes && (
                              <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                {h.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Usage Ledger */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}>
                        <ArrowUpCircle size={20} />
                      </div>
                      {copy('Usage History')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedItem.usageHistory.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-mid)', borderRadius: '20px', color: 'var(--text-faint)', fontWeight: 600 }}>
                          {copy('No usage logs found.')}
                        </div>
                      ) : (
                        [...selectedItem.usageHistory].reverse().map((h) => (
                          <div key={h.id} className="glass-card" style={{ padding: '20px 24px', background: 'white', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={18} color="#e74c3c" />
                                <span style={{ fontWeight: 600, fontSize: '16px' }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '18px', color: '#e74c3c' }}>
                                -{formatQuantity(h.quantity)} {selectedItem.unit}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <Waves size={16} />
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>{copy('Applied to')}</span>
                                {h.pondId ? (ponds.find(p => p.id === h.pondId)?.pondName || copy('Unknown Pond')) : copy('General Inventory Usage')}
                              </div>
                            </div>
                            {h.notes && (
                              <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                {h.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <form id="inventoryForm" className="inventory-form" onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {modalType === 'add' && (
                    <div className="responsive-form-grid inventory-add-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Item Identification')}</label>
                        <input required value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} placeholder={copy(itemType === 'feed' ? 'e.g. Premium Growth Feed 02' : 'e.g. Pond Probiotic Blend')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none', transition: 'all 0.3s' }} />
                      </div>
                      <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Brand / Manufacturer')}</label>
                        <input value={itemType === 'feed' ? formData.brand : formData.manufacturer} onChange={e => setFormData({...formData, [itemType === 'feed' ? 'brand' : 'manufacturer']: e.target.value})} placeholder="e.g. Orson Bio" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                      </div>
                      {itemType === 'additive' && (
                        <>
                          <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Ingredients / Strains — One Per Line')}</label>
                            <textarea rows={4} value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} placeholder="Bacillus subtilis 1×10⁹ CFU/g" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '15px', outline: 'none', resize: 'vertical' }} />
                          </div>
                          <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Official Label URL')}</label>
                            <input type="url" value={formData.labelSourceUrl} onChange={e => setFormData({...formData, labelSourceUrl: e.target.value})} placeholder="https://manufacturer.com/product-label.pdf" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '15px', outline: 'none' }} />
                          </div>
                        </>
                      )}
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Classification')}</label>
                        <select required aria-label={copy('Inventory classification')} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }}>
                          {(itemType === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(c => <option key={c} value={c}>{copy(c)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Inventory Unit')}</label>
                        <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Alert Threshold')}</label>
                        <input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} placeholder={copy('Notify when below...')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                      </div>
                    </div>
                  )}

                  {modalType !== 'editReorder' && (
                    <div className="responsive-form-grid inventory-stock-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className={modalType === 'add' ? undefined : 'inventory-full-row'} style={{ gridColumn: modalType === 'add' ? 'span 1' : 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.quantity} ({formData.unit || 'units'})</label>
                        <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="0.00" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '20px', outline: 'none', color: 'var(--primary)' }} />
                      </div>

                      {modalType === 'usage' && (
                        <div className="inventory-full-row" style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Assign to Pond')}</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, pondId: ''})}
                              style={{
                                padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600,
                                background: formData.pondId === '' ? 'var(--primary)' : 'var(--bg-mid)',
                                color: formData.pondId === '' ? 'white' : 'var(--text-muted)',
                                border: '1px solid var(--border)', transition: 'all 0.3s'
                              }}
                            >{copy('General Use')}</button>
                            {activePonds.map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFormData({...formData, pondId: p.id})}
                                style={{
                                  padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600,
                                  background: formData.pondId === p.id ? 'var(--primary)' : 'var(--bg-mid)',
                                  color: formData.pondId === p.id ? 'white' : 'var(--text-muted)',
                                  border: '1px solid var(--border)', transition: 'all 0.3s',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}
                              >{p.pondName}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalType !== 'usage' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.unitPrice} ({currencyConfig.symbol})</label>
                          <input required type="number" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} placeholder={copy('Current Price')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                        </div>
                      )}

                      {(modalType === 'add' || modalType === 'stockIn') && (
                        <>
                          <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.stockDate}</label>
                            <input required type="date" max={getFarmDateKey(new Date(), company?.timeZone)} value={formData.stockDate} onChange={e => setFormData({...formData, stockDate: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{copy('Expiry Date')}</label>
                            <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none' }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {modalType === 'editReorder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Stock Reorder Threshold')}</label>
                      <input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} placeholder={copy('Alert me when stock is below...')} style={{ width: '100%', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '24px', outline: 'none', color: '#e74c3c' }} />
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>{copy('We will display a critical alert on the dashboard when stock falls below this amount.')}</p>
                      {itemType === 'additive' && (
                        <>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Manufacturer')}</label>
                          <input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} placeholder={copy('Company shown on the product label')} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600 }} />
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Ingredients / Strains — One Per Line')}</label>
                          <textarea rows={4} value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} placeholder="Bacillus subtilis 1×10⁹ CFU/g" style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, resize: 'vertical' }} />
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{copy('Official Label URL')}</label>
                          <input type="url" value={formData.labelSourceUrl} onChange={e => setFormData({...formData, labelSourceUrl: e.target.value})} placeholder="https://manufacturer.com/product-label.pdf" style={{ width: '100%', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600 }} />
                        </>
                      )}
                    </div>
                  )}

                  {modalType !== 'editReorder' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.notesOptional}</label>
                      <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={copy('Any specific details about this transaction...')} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 600, fontSize: '16px', outline: 'none', resize: 'none' }} />
                    </div>
                  )}
                </form>
              )}
            </div>

            {modalType !== 'history' && (
              <div className="responsive-modal-footer inventory-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                >{copy('Cancel')}</button>
                <button
                  form="inventoryForm"
                  type="submit"
                  className="btn-primary"
                >
                  {modalType === 'add' ? `${copy('Add')} ${copy(itemType === 'feed' ? 'Feed' : 'Additive')}` :
                   modalType === 'stockIn' ? copy('Confirm stock in') :
                   modalType === 'usage' ? copy('Record usage') : copy('Save threshold')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes modalSlide {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .inventory-primary-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .inventory-section-tabs {
          flex: 1;
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .inventory-section-tab {
          min-width: 0;
          min-height: 40px;
          padding: 0 10px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: var(--text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .inventory-section-tab:hover,
        .inventory-section-tab.active {
          border-color: var(--border);
          background: #fff;
          color: var(--primary);
        }
        .inventory-input-menu {
          flex: 0 0 auto;
          z-index: 40;
        }
        .inventory-input-trigger {
          min-height: 40px;
          padding: 0 8px;
          color: var(--primary);
        }
        .inventory-input-popover,
        .inventory-filter-popover {
          z-index: 90;
        }
        .inventory-summary-bar {
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--border);
          border-radius: 16px !important;
          background: #fff;
          overflow: hidden;
        }
        .inventory-summary-item {
          min-width: 0;
          min-height: 64px;
          padding: 7px 4px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .inventory-summary-item span {
          max-width: 100%;
          color: var(--text-muted);
          font-size: 9px;
          font-weight: 600;
          line-height: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .inventory-summary-item strong {
          max-width: 100%;
          margin-top: 3px;
          color: var(--text-primary);
          font-size: clamp(13px, 2.5vw, 18px);
          font-weight: 600;
          line-height: 22px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .inventory-section-heading {
          margin: 0;
          color: var(--text-primary);
          font-size: 17px;
          font-weight: 600;
          line-height: 22px;
        }
        .inventory-alert-count {
          padding: 5px 10px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .inventory-filter-menu {
          z-index: 35;
        }
        .inventory-filter-trigger {
          width: 38px;
          height: 38px;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          color: var(--text-muted);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .inventory-filter-trigger:hover,
        .inventory-filter-trigger[aria-expanded="true"] {
          border-color: var(--secondary);
          background: var(--bg-mid);
          color: var(--primary);
        }
        .inventory-filter-popover button.is-active {
          background: var(--primary-dim);
          color: var(--primary);
        }
        .inventory-modal-overlay {
          padding: 18px !important;
        }
        .inventory-modal {
          max-height: calc(100dvh - 36px) !important;
          border-radius: 16px !important;
        }
        .inventory-modal-header {
          min-height: 56px;
          padding: 10px 14px !important;
          background: #fff !important;
        }
        .inventory-modal-header button:hover {
          border-color: var(--border) !important;
          background: var(--primary-dim) !important;
          color: var(--primary) !important;
        }
        .inventory-modal-body {
          padding: 12px !important;
          overscroll-behavior: contain;
        }
        .inventory-form {
          gap: 12px !important;
        }
        .inventory-modal-body :global(.responsive-form-grid) {
          gap: 10px !important;
        }
        .inventory-add-details,
        .inventory-stock-details {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .inventory-full-row {
          grid-column: 1 / -1 !important;
        }
        .inventory-add-details > div:not(.inventory-full-row),
        .inventory-stock-details > div:not(.inventory-full-row) {
          grid-column: auto !important;
        }
        .inventory-modal-body :global(label) {
          margin-bottom: 4px !important;
          font-size: 11px !important;
          letter-spacing: 0 !important;
          text-transform: none !important;
        }
        .inventory-modal-body :global(input),
        .inventory-modal-body :global(select),
        .inventory-modal-body :global(textarea) {
          min-height: 40px !important;
          padding: 8px 10px !important;
          border-radius: 10px !important;
          font-size: 14px !important;
        }
        .inventory-modal-footer {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding: 8px 10px !important;
          border-top: 1px solid var(--border);
          background: #fff;
        }
        .inventory-modal-footer button {
          width: 100%;
          min-height: 38px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          justify-content: center;
          letter-spacing: 0;
          text-transform: none;
        }
        .glass-card {
          backdrop-filter: var(--glass-blur);
          border-radius: 16px;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary) !important;
          background: white !important;
          box-shadow: 0 0 0 4px var(--primary-dim) !important;
        }
        @media (max-width: 420px) {
          .inventory-primary-toolbar {
            gap: 6px;
          }
          .inventory-section-tabs {
            gap: 3px;
          }
          .inventory-section-tab {
            min-height: 38px;
            padding: 0 4px;
            gap: 4px;
            font-size: 10px;
          }
          .inventory-section-tab :global(svg) {
            width: 15px;
            height: 15px;
          }
          .inventory-input-trigger {
            min-width: 58px;
            padding: 0 5px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
