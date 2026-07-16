"use client";

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Box,
  FlaskConical,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  AlertCircle,
  MoreHorizontal,
  History,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wallet,
  Calendar,
  Waves,
  LayoutDashboard,
  ShoppingBag
} from 'lucide-react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
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

/* --- Types --------------------------------------------------- */

interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  price: number;
  notes?: string;
  batch?: string;
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
const canEditOperations = (role?: string) => role === 'owner' || role === 'co-owner' || role === 'technician';

export default function InventoryFeedsPage() {
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { user, company } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'additive'>('dashboard');
  const { feeds, additives, ponds, loading, companyId } = useInventoryFeeds<InventoryItem, InventoryItem, any>();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'stockIn' | 'usage'>('all');
  const activePonds = useMemo(
    () => ponds.filter((pond: any) => pond.cycleStatus !== 'ended'),
    [ponds]
  );
  const canEditInventory = canEditOperations(user?.role);

  const formatDate = (date: any) => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date && typeof date === 'object' && 'seconds' in date) {
      return new Date(date.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {}
    return '';
  };

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
    batch: '',
    expiry: '',
    reorderLevel: ''
  });

  const metrics = useMemo(() => {
    const totalFeedStock = feeds.reduce((s, f) => s + (f.totalStock || 0), 0);
    const totalAdditiveValue = additives.reduce((s, a) => s + (a.totalCost || 0), 0);
    const feedStockValue = feeds.reduce((s, f) => s + (f.totalCost || 0), 0);

    // Calculate total feed cost (money spent on feed consumed)
    // Synchronized with mobile logic from app/inventory/feedAdditives.tsx
    let totalFeedCost = 0;
    feeds.forEach(f => {
      (f.usageHistory || []).forEach(u => {
        const avgPrice = f.totalStock > 0 ? (f.totalCost || 0) / (f.totalStock + u.quantity) : 0;
        totalFeedCost += u.quantity * avgPrice;
      });
    });

    // Low stock count
    const lowStockItems = [
      ...feeds.filter(f => f.reorderLevel !== undefined && f.totalStock <= (f.reorderLevel || 0)),
      ...additives.filter(a => a.reorderLevel !== undefined && a.totalStock <= (a.reorderLevel || 0))
    ];

    return {
      totalFeedStock,
      totalAdditiveValue,
      feedStockValue,
      totalFeedCost,
      lowStockCount: lowStockItems.length,
      lowStockItems
    };
  }, [feeds, additives, ponds]);

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
    setModalType(type);
    if (item) {
      setSelectedItem(item);
      setItemType(iType || 'feed');
      setFormData({
        ...formData,
        itemName: item.itemName,
        category: (item as any).feedType || (item as any).category,
        unit: item.unit || 'kg',
        reorderLevel: String(item.reorderLevel || ''),
        quantity: '',
        unitPrice: '',
        notes: '',
        batch: '',
        expiry: '',
        pondId: ''
      });
    } else {
      setSelectedItem(null);
      setFormData({
        itemName: '',
        brand: '',
        category: itemType === 'feed' ? 'Grower' : 'Water Conditioner',
        quantity: '',
        unitPrice: '',
        pondId: '',
        notes: '',
        unit: 'kg',
        batch: '',
        expiry: '',
        reorderLevel: ''
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
        alert('Quantity must be greater than 0.');
        return;
      }
      if (['add', 'stockIn'].includes(modalType) && (!Number.isFinite(price) || price <= 0)) {
        alert('Unit price must be greater than 0.');
        return;
      }

      if (modalType === 'add') {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const now = serverTimestamp();
        const itemData: any = {
          companyId,
          [itemType === 'feed' ? 'feedName' : 'additiveName']: formData.itemName,
          brand: formData.brand || '',
          [itemType === 'feed' ? 'feedType' : 'category']: formData.category,
          unit: formData.unit,
          reorderLevel: isNaN(reorder) ? 0 : reorder,
          totalStock: qty,
          totalCost: qty * price,
          stockInHistory: [{
            id: Date.now().toString(),
            date: getFarmDateKey(new Date(), company?.timeZone),
            quantity: qty,
            price: price,
            notes: formData.notes,
            batch: formData.batch,
            expiry: formData.expiry,
            createdAt: Timestamp.now()
          }],
          usageHistory: [],
          lastUpdated: now,
          createdAt: now
        };
        await addDoc(collection(db, 'companies', companyId, collectionName), itemData);
      }
      else if (modalType === 'stockIn' && selectedItem) {
        const collectionName = itemType === 'feed' ? 'feeds' : 'additives';
        const ref = doc(db, 'companies', companyId, collectionName, selectedItem.id);

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
              id: Date.now().toString(),
              date: getFarmDateKey(new Date(), company?.timeZone),
              quantity: qty,
              price: price,
              notes: formData.notes,
              batch: formData.batch,
              expiry: formData.expiry,
              createdAt: Timestamp.now()
            }),
            lastUpdated: serverTimestamp()
          });
        });
      }
      else if (modalType === 'usage' && selectedItem) {
        if (qty > selectedItem.totalStock) {
          alert('Insufficient stock!');
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
          lastUpdated: serverTimestamp()
        });
      }

      setModalOpen(false);
    } catch (err) {
      console.error('Inventory action failed:', err);
      alert('Operation failed. Please try again.');
    }
  };

  const handleDeleteItem = async (item: InventoryItem, type: 'feed' | 'additive') => {
    if (!companyId || !window.confirm(`Are you sure you want to delete ${item.itemName}?`)) return;
    if (!canEditInventory) return;
    try {
      const collectionName = type === 'feed' ? 'feeds' : 'additives';
      await deleteDoc(doc(db, 'companies', companyId, collectionName, item.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="dashboard-page-relaxed" style={{ paddingBottom: '32px' }}>
      <div className="dashboard-inline-toolbar animate-fade-up">
        <div className="dashboard-segmented-tabs" style={{ minHeight: '44px', alignItems: 'center' }}>
          {[
            { id: 'dashboard', label: t.inventory.dashboard, icon: LayoutDashboard },
            { id: 'feed', label: t.inventory.feeds, icon: Box },
            { id: 'additive', label: t.inventory.additives, icon: FlaskConical }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`dashboard-segmented-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} style={{ opacity: activeTab === tab.id ? 1 : 0.6 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {canEditInventory && (
          <div className="dashboard-action-row">
            <button
              className="dashboard-action dashboard-action-secondary"
              onClick={() => { setItemType('feed'); handleOpenModal('add'); }}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: 850,
                letterSpacing: '0',
                textTransform: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <Plus size={18} />
              {t.inventory.addFeed}
            </button>
            <button
              className="dashboard-action dashboard-action-primary"
              onClick={() => { setItemType('additive'); handleOpenModal('add'); }}
              style={{
                boxShadow: 'var(--shadow-glow)',
                minHeight: '44px',
                fontSize: '13px',
                fontWeight: 850,
                letterSpacing: '0',
                textTransform: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <FlaskConical size={18} />
              {t.inventory.addAdditive}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1 }}>
        {activeTab === 'dashboard' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* High-Impact Metrics Grid */}
            <div className="dashboard-kpi-grid">
              <div className="glass-card animate-fade-up" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <Box size={72} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                    <Box size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.feedStock}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>
                    {metrics.totalFeedStock.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>kg</span>
                </div>
              </div>

              <div className="glass-card animate-fade-up" style={{ padding: '20px', position: 'relative', overflow: 'hidden', animationDelay: '0.1s' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <FlaskConical size={72} color="#f39c12" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(243, 156, 18, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f39c12', border: '1px solid rgba(243, 156, 18, 0.2)' }}>
                    <FlaskConical size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.additiveValue}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>
                  {formatCurrency(metrics.totalAdditiveValue)}
                </div>
              </div>

              <div className="glass-card animate-fade-up" style={{ padding: '20px', position: 'relative', overflow: 'hidden', animationDelay: '0.2s' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <Wallet size={72} color="#27ae60" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(39, 174, 96, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27ae60', border: '1px solid rgba(39, 174, 96, 0.2)' }}>
                    <Wallet size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.feedStockValue}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>
                  {formatCurrency(metrics.feedStockValue)}
                </div>
              </div>

              <div className="glass-card animate-fade-up" style={{ padding: '20px', position: 'relative', overflow: 'hidden', animationDelay: '0.3s' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <ShoppingBag size={72} color="#e74c3c" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                    <ShoppingBag size={20} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.feedCost}</span>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>
                  {formatCurrency(metrics.totalFeedCost)}
                </div>
              </div>
            </div>

            {/* Split View: Alerts and Transactions */}
            <div className="dashboard-report-grid">

              {/* Critical Alerts Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}>
                      <AlertCircle size={19} />
                    </div>
                    Stock Status Alerts
                  </h2>
                  <span style={{
                    padding: '6px 14px',
                    background: metrics.lowStockCount > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
                    color: metrics.lowStockCount > 0 ? '#e74c3c' : '#27ae60',
                    borderRadius: '30px',
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase'
                  }}>
                    {metrics.lowStockCount} {metrics.lowStockCount === 1 ? 'Alert' : 'Alerts'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {metrics.lowStockItems.length === 0 ? (
                    <div className="glass-card" style={{ padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(39, 174, 96, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27ae60' }}>
                        <Waves size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Optimal Stock Levels</h3>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>All inventory items are currently above reorder thresholds.</p>
                      </div>
                    </div>
                  ) : metrics.lowStockItems.map((item, i) => (
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
                          <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--text-primary)' }}>{item.itemName}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e74c3c', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Box size={14} />
                            Critical: {item.totalStock.toLocaleString()} {item.unit} remaining
                          </div>
                        </div>
                      </div>
                      {canEditInventory && (
                        <button
                          className="btn-primary"
                          style={{
                            padding: '12px 20px',
                            fontSize: '13px',
                            fontWeight: 900,
                            background: '#e74c3c',
                            letterSpacing: '0',
                            textTransform: 'none',
                            boxShadow: '0 4px 15px rgba(231, 76, 60, 0.18)'
                          }}
                          onClick={() => handleOpenModal('stockIn', item, (item as any).feedType ? 'feed' : 'additive')}
                        >
                          Restock now
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Ledger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <History size={19} />
                    </div>
                    Recent Transactions
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-mid)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                    {(['all', 'stockIn', 'usage'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setRecentActivityFilter(f)}
                        style={{
                          padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 800,
                          background: recentActivityFilter === f ? 'white' : 'transparent',
                          color: recentActivityFilter === f ? 'var(--primary)' : 'var(--text-faint)',
                          border: 'none', cursor: 'pointer', boxShadow: recentActivityFilter === f ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        {f === 'all' ? 'All' : f === 'stockIn' ? 'In' : 'Out'}
                      </button>
                    ))}
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
                        background: tx.type === 'Stock In' ? 'rgba(39, 174, 96, 0.08)' : 'rgba(231, 76, 60, 0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: tx.type === 'Stock In' ? '#27ae60' : '#e74c3c',
                        border: '1px solid currentColor',
                        opacity: 0.9
                      }}>
                        {tx.type === 'Stock In' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '15px', color: 'var(--text-primary)' }}>{tx.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: tx.type === 'Stock In' ? '#27ae60' : '#e74c3c' }}>{tx.type}</span>
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: '18px', color: tx.type === 'Stock In' ? '#27ae60' : '#e74c3c', letterSpacing: '0' }}>
                          {tx.type === 'Stock In' ? '+' : '-'}{tx.quantity.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{tx.unit}</div>
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
                    fontWeight: 700,
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
                    padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800,
                    background: !categoryFilter ? 'white' : 'transparent',
                    color: !categoryFilter ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: !categoryFilter ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >All Categories</button>
                {(activeTab === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800,
                      background: categoryFilter === cat ? 'white' : 'transparent',
                      color: categoryFilter === cat ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: categoryFilter === cat ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                      border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >{cat}</button>
                ))}
              </div>
            </div>

            {/* Dynamic Inventory Grid */}
            {filteredItems.length === 0 ? (
              <div className="glass-card animate-fade-up" style={{ padding: '56px 28px', background: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '22px', border: '1px solid var(--border)' }}>
                  <Box size={34} />
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '0' }}>
                  {activeTab === 'feed' ? t.inventory.noFeedItems : t.inventory.noAdditives}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '26px', fontWeight: 600, fontSize: '14px', maxWidth: '400px', lineHeight: 1.6 }}>
                  {activeTab === 'feed' ? t.inventory.addFeedToStart : t.inventory.addAdditivesToStart}
                </p>
                {canEditInventory && (
                  <button
                    className="btn-primary"
                    onClick={() => handleOpenModal('add')}
                    style={{ padding: '18px 40px', borderRadius: '20px', fontWeight: 900, fontSize: '16px', boxShadow: 'var(--shadow-glow)' }}
                  >
                    <Plus size={22} />
                    Add Your First {activeTab === 'feed' ? 'Feed' : 'Additive'}
                  </button>
                )}
              </div>
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {filteredItems.map((item, idx) => {
                  const isLow = (item.reorderLevel || 0) > 0 && item.totalStock <= (item.reorderLevel || 0);
                  const lastPrice = item.stockInHistory?.[item.stockInHistory.length - 1]?.price || 0;
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
                      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: isLow ? 'rgba(231, 76, 60, 0.03)' : 'linear-gradient(to bottom, var(--bg-mid), white)' }}>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isLow ? '#e74c3c' : (activeTab === 'feed' ? 'var(--primary)' : '#f39c12'),
                            border: '1px solid var(--border)',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
                          }}>
                            {activeTab === 'feed' ? <Box size={24} /> : <FlaskConical size={24} />}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0' }}>{item.itemName}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>{item.brand || 'No Brand'}</span>
                              <span style={{ opacity: 0.2, fontWeight: 900 }}>•</span>
                              <span style={{
                                padding: '2px 10px', background: 'var(--primary-dim)', color: 'var(--primary)',
                                borderRadius: '20px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase'
                              }}>
                                {(item as any).feedType || (item as any).category}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="btn-secondary"
                            style={{ width: '42px', height: '42px', padding: '0', borderRadius: '14px', background: 'white' }}
                            onClick={() => handleOpenModal('history', item, activeTab)}
                            title="Transaction History"
                          >
                            <History size={20} />
                          </button>
                          {canEditInventory && (
                            <button
                              onClick={() => handleDeleteItem(item, activeTab)}
                              style={{ width: '42px', height: '42px', padding: '0', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.stock}</span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '26px', fontWeight: 900, color: isLow ? '#e74c3c' : 'var(--text-primary)', letterSpacing: '0' }}>
                              {item.totalStock.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>{item.unit}</span>
                          </div>
                          {isLow && (
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#e74c3c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={12} /> Low Stock Alert
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.avgPrice}</span>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>{formatCurrency(lastPrice)}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>per {item.unit}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.inventory.value}</span>
                          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>{formatCurrency(item.totalStock * lastPrice)}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Total Value</span>
                        </div>
                      </div>

                      <div style={{ padding: '14px 20px', display: 'flex', gap: '18px', background: 'var(--bg-mid)', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#27ae60', fontWeight: 800, fontSize: '13px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(39, 174, 96, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowDownCircle size={14} />
                          </div>
                          {t.inventory.in}: {totalIn.toLocaleString()} {item.unit}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e74c3c', fontWeight: 800, fontSize: '13px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpCircle size={14} />
                          </div>
                          {t.inventory.out}: {totalOut.toLocaleString()} {item.unit}
                        </div>
                      </div>

                      {canEditInventory && (
                        <div style={{ padding: '18px 20px', display: 'flex', gap: '12px', background: 'white', borderTop: '1px solid var(--border)' }}>
                          <button
                            className="btn-primary"
                            style={{ flex: 1.6, borderRadius: '12px', padding: '12px', fontWeight: 900, fontSize: '13px', boxShadow: '0 4px 15px var(--primary-dim)' }}
                            onClick={() => handleOpenModal('stockIn', item, activeTab)}
                          >
                            <Plus size={18} /> {t.inventory.stockIn}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ flex: 1, borderRadius: '12px', padding: '12px', fontWeight: 900, fontSize: '13px', color: 'var(--primary)', borderColor: 'var(--primary)', background: 'white' }}
                            onClick={() => handleOpenModal('usage', item, activeTab)}
                          >
                            <ArrowUpCircle size={18} /> {t.inventory.use}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ width: '46px', height: '46px', padding: '0', borderRadius: '12px', background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleOpenModal('editReorder', item, activeTab)}
                            title="Threshold Settings"
                          >
                            <AlertCircle size={22} style={{ color: isLow ? '#e74c3c' : 'var(--text-faint)' }} />
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div className="glass-card animate-fade-up" style={{
            width: '100%', maxWidth: modalType === 'history' ? '1000px' : '680px', background: '#FFFFFF', padding: '0',
            overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.2)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)', borderRadius: '32px'
          }}>
            <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, var(--bg-mid), white)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '20px', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
                  border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
                }}>
                  {modalType === 'add' ? <Plus size={32} /> :
                   modalType === 'stockIn' ? <ArrowDownCircle size={32} /> :
                   modalType === 'usage' ? <ArrowUpCircle size={32} /> :
                   modalType === 'history' ? <History size={32} /> : <AlertCircle size={32} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '26px', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {modalType === 'add' ? `Add New ${itemType === 'feed' ? 'Feed' : 'Additive'}` :
                     modalType === 'stockIn' ? t.inventory.stockIn :
                     modalType === 'usage' ? t.inventory.recordUsage :
                     modalType === 'history' ? t.inventory.transactionHistory : 'Threshold Settings'}
                  </h2>
                  {selectedItem && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Box size={16} /> {selectedItem.itemName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'white', border: '1px solid var(--border)', borderRadius: '16px',
                  padding: '12px', cursor: 'pointer', color: 'var(--text-muted)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.3s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg)'}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              {modalType === 'history' && selectedItem ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  {/* Stock In Ledger */}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(39, 174, 96, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27ae60' }}>
                        <ArrowDownCircle size={20} />
                      </div>
                      Stock In Records
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedItem.stockInHistory.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-mid)', borderRadius: '20px', color: 'var(--text-faint)', fontWeight: 700 }}>
                          No stock intake recorded.
                        </div>
                      ) : (
                        [...selectedItem.stockInHistory].reverse().map((h) => (
                          <div key={h.id} className="glass-card" style={{ padding: '20px 24px', background: 'white', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={18} color="var(--primary)" />
                                <span style={{ fontWeight: 900, fontSize: '16px' }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 950, fontSize: '18px', color: '#27ae60' }}>
                                +{h.quantity.toLocaleString()} {selectedItem.unit}
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}>
                              <div>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>Batch</span>
                                {h.batch || 'N/A'}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>Unit Price</span>
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
                    <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}>
                        <ArrowUpCircle size={20} />
                      </div>
                      Usage History
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedItem.usageHistory.length === 0 ? (
                        <div style={{ padding: '48px', textAlign: 'center', background: 'var(--bg-mid)', borderRadius: '20px', color: 'var(--text-faint)', fontWeight: 700 }}>
                          No usage logs found.
                        </div>
                      ) : (
                        [...selectedItem.usageHistory].reverse().map((h) => (
                          <div key={h.id} className="glass-card" style={{ padding: '20px 24px', background: 'white', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Calendar size={18} color="#e74c3c" />
                                <span style={{ fontWeight: 900, fontSize: '16px' }}>{formatDate(h.date)}</span>
                              </div>
                              <div style={{ fontWeight: 950, fontSize: '18px', color: '#e74c3c' }}>
                                -{h.quantity.toLocaleString()} {selectedItem.unit}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-mid)', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <Waves size={16} />
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-faint)', textTransform: 'uppercase', fontSize: '11px', display: 'block' }}>Applied to</span>
                                {h.pondId ? (ponds.find(p => p.id === h.pondId)?.pondName || 'Unknown Pond') : 'General Inventory Usage'}
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
                <form id="inventoryForm" onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {modalType === 'add' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Item Identification</label>
                        <input required value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} placeholder="Full Item Name (e.g., Premium Growth Feed 02)" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none', transition: 'all 0.3s' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Brand / Manufacturer</label>
                        <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="e.g. Orson Bio" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Classification</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none', appearance: 'none' }}>
                          {(itemType === 'feed' ? FEED_CATEGORIES : ADDITIVE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Inventory Unit</label>
                        <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Alert Threshold</label>
                        <input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} placeholder="Notify when below..." style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                      </div>
                    </div>
                  )}

                  {modalType !== 'editReorder' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div style={{ gridColumn: modalType === 'add' ? 'span 1' : 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.quantity} ({formData.unit || 'units'})</label>
                        <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} placeholder="0.00" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 900, fontSize: '20px', outline: 'none', color: 'var(--primary)' }} />
                      </div>

                      {modalType === 'usage' && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Assign to Pond</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, pondId: ''})}
                              style={{
                                padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 800,
                                background: formData.pondId === '' ? 'var(--primary)' : 'var(--bg-mid)',
                                color: formData.pondId === '' ? 'white' : 'var(--text-muted)',
                                border: '1px solid var(--border)', transition: 'all 0.3s'
                              }}
                            >General Use</button>
                            {activePonds.map((p: any) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setFormData({...formData, pondId: p.id})}
                                style={{
                                  padding: '14px', borderRadius: '14px', fontSize: '13px', fontWeight: 800,
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
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.unitPrice} (Rp)</label>
                          <input required type="number" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value})} placeholder="Current Price" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                        </div>
                      )}

                      {(modalType === 'add' || modalType === 'stockIn') && (
                        <>
                          <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Batch Number</label>
                            <input value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} placeholder="Lot/Batch #" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Expiry Date</label>
                            <input type="date" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none' }} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {modalType === 'editReorder' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stock Reorder Threshold</label>
                      <input type="number" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} placeholder="Alert me when stock is below..." style={{ width: '100%', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 900, fontSize: '24px', outline: 'none', color: '#e74c3c' }} />
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>We will display a critical alert on the dashboard when stock falls below this amount.</p>
                    </div>
                  )}

                  {modalType !== 'editReorder' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>{t.inventory.notesOptional}</label>
                      <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any specific details about this transaction..." style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-mid)', fontWeight: 700, fontSize: '16px', outline: 'none', resize: 'none' }} />
                    </div>
                  )}
                </form>
              )}
            </div>

            {modalType !== 'history' && (
              <div style={{ padding: '32px 40px', borderTop: '1px solid var(--border)', display: 'flex', gap: '20px', background: 'var(--bg-mid)' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1, padding: '18px', borderRadius: '18px', border: '1px solid var(--border)',
                    background: 'white', color: 'var(--text-muted)', fontWeight: 800, fontSize: '15px',
                    cursor: 'pointer', transition: 'all 0.3s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                >Cancel</button>
                <button
                  form="inventoryForm"
                  type="submit"
                  className="btn-primary"
                  style={{
                    flex: 1.5, padding: '18px', borderRadius: '18px', fontWeight: 900, fontSize: '15px',
                    boxShadow: '0 8px 25px var(--primary-dim)'
                  }}
                >
                  {modalType === 'add' ? 'INITIALIZE ITEM' :
                   modalType === 'stockIn' ? 'CONFIRM STOCK IN' :
                   modalType === 'usage' ? 'RECORD DISBURSEMENT' : 'UPDATE THRESHOLD'}
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
        .glass-card {
          backdrop-filter: var(--glass-blur);
          border-radius: 24px;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--primary) !important;
          background: white !important;
          box-shadow: 0 0 0 4px var(--primary-dim) !important;
        }
      `}</style>
    </div>
  );
}
