"use client";

import { isSourceLinkedFinance, appendSettlement, monetaryValue } from '../../../../../shared/financeIntegrity';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Loader2,
  AlertCircle,
  X,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Plus,
  FileText,
} from 'lucide-react';
import { 
  collection, 
  doc, 
  addDoc, 
  runTransaction,
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCompanyCycles,
  useCompanyPonds,
  useDebouncedValue,
  useFinanceRecords,
} from '@/hooks/useDashboardData';
import { useFarmDateKey } from '@/hooks/useFarmDateKey';
import {
  allocateExpenseAcrossCyclePonds,
  getOpenFinanceCycles,
} from '../../../../../shared/financeCycleAllocation';
import { useFarmPermissions } from '@/hooks/useFarmPermissions';
import { getOperatingMarginDisplay } from '../../../../../shared/financeMetrics';
import styles from './finance.module.css';

/* --- Types --------------------------------------------------- */
interface Transaction {
  id: string;
  date: string;
  category: string;
  item: string;
  amount: number;
  settlements?: { id: string; date: string; amount: number }[];
  paymentType: string;
  reference: string;
  notes: string;
  addedByName: string;
  timestamp: number;
  type: 'expense' | 'income';
  cycleId?: string;
  cycleName?: string;
}

interface FinanceCycle { id: string; cycleName: string; status?: string; blockName?: string; blockNames?: string[] }
interface FinancePond { id: string; pondName: string; cycleId?: string; pondCycleId?: string }

const conciseFinanceDescription = (value: string) => value
  .replace(/\s*\(Batch:[^)]+\)/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

export default function FinancePage() {
  const copy = useDashboardCopy();
  const { t } = useLanguage();
  const generalCategoryLabel = t.financeCycle.general;
  const { formatCurrency: displayCurrency, currencyConfig } = useCurrency();
  const formatCurrency = (value: number) => Number.isFinite(value) ? displayCurrency(value) : 'N/A';
  const { user, company } = useAuth();
  const hasPermission = useFarmPermissions();
  const canViewFinance = hasPermission('viewFinance');
  const canManageFinance = hasPermission('manageFinance');
  const today = useFarmDateKey(company?.timeZone);

  const EXPENSE_CATEGORIES = [t.financeCycle.general, t.finance.labor, t.finance.repairs, t.finance.utilities, t.finance.miscellaneous, t.financeCycle.feed, t.financeCycle.chemicals, t.financeCycle.probiotics, 'Equipment', 'Property', 'Infrastructure', 'Interest', 'Taxes', 'Loan Payment', 'Owner Withdrawal', 'Dividend'];
  const INCOME_CATEGORIES = [t.finance.shrimpSales, t.finance.consultation, t.finance.equipmentRental, t.finance.otherIncome, 'Loan Received', 'Capital Contribution', 'Asset Sale'];
  const PAYMENT_TYPES = [t.finance.cash, t.finance.bankTransfer, t.finance.mobilePayment];

  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'income'>('overview');
  const { expenses, revenues: income, loading } = useFinanceRecords<Transaction, Transaction>();
  const { data: cycles, loading: cyclesLoading } = useCompanyCycles<FinanceCycle>();
  const { data: ponds, loading: pondsLoading } = useCompanyPonds<FinancePond>();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const [cycleScope, setCycleScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInputMenuOpen, setInputMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputMenuRef = useRef<HTMLDivElement>(null);
  
  // Form State
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState({
    date: today,
    category: EXPENSE_CATEGORIES[0],
    item: '',
    amount: '',
    paymentType: PAYMENT_TYPES[0],
    reference: '',
    notes: '',
    cycleId: activeCycles[0]?.id || '',
  });

  useEffect(() => {
    if (!isInputMenuOpen) return;

    const closeInputMenu = (event: PointerEvent) => {
      if (!inputMenuRef.current?.contains(event.target as Node)) setInputMenuOpen(false);
    };
    const closeInputMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInputMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeInputMenu);
    document.addEventListener('keydown', closeInputMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeInputMenu);
      document.removeEventListener('keydown', closeInputMenuOnEscape);
    };
  }, [isInputMenuOpen]);

  const openTransactionForm = (type: 'expense' | 'income') => {
    setInputMenuOpen(false);
    setFormType(type);
    setFormData((previous) => ({
      ...previous,
      date: today,
      category: type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
      cycleId: cycleScope === 'all' ? (activeCycles[0]?.id || '') : cycleScope,
    }));
    setIsModalOpen(true);
  };

  const scopedExpenses = useMemo(() => cycleScope === 'all'
    ? expenses
    : expenses.filter((expense) => expense.cycleId === cycleScope), [cycleScope, expenses]);
  const scopedIncome = useMemo(() => cycleScope === 'all'
    ? income
    : income.filter((record) => record.cycleId === cycleScope), [cycleScope, income]);

  const stats = useMemo(() => {
    const totalExpense = scopedExpenses.reduce((sum, e) => sum + (monetaryValue(e.amount) ?? Number.NaN), 0);
    const totalIncome = scopedIncome.reduce((sum, i) => sum + (monetaryValue(i.amount) ?? Number.NaN), 0);
    const profit = totalIncome - totalExpense;
    
    return { totalExpense, totalIncome, profit, count: scopedExpenses.length + scopedIncome.length };
  }, [scopedExpenses, scopedIncome]);
  const operatingMarginDisplay = getOperatingMarginDisplay(stats.totalIncome, stats.profit);

  const monthlyPerformance = useMemo(() => {
    const totalsByMonth = new Map<string, { income: number; expenses: number }>();
    const addRecord = (record: Transaction, field: 'income' | 'expenses') => {
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = totalsByMonth.get(key) || { income: 0, expenses: 0 };
      const amount = monetaryValue(record.amount);
      if (amount !== null) current[field] += amount;
      totalsByMonth.set(key, current);
    };

    scopedIncome.forEach((record) => addRecord(record, 'income'));
    scopedExpenses.forEach((record) => addRecord(record, 'expenses'));

    return [...totalsByMonth.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([key, totals]) => ({
        key,
        label: new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' }),
        ...totals,
      }));
  }, [scopedExpenses, scopedIncome]);

  const monthlyScale = Math.max(
    1,
    ...monthlyPerformance.flatMap((month) => [month.income, month.expenses]),
  );

  const recentTransactions = useMemo(() => [
    ...scopedExpenses.map((record) => ({ ...record, type: 'expense' as const })),
    ...scopedIncome.map((record) => ({ ...record, type: 'income' as const })),
  ]
    .sort((left, right) => {
      const leftTime = left.timestamp || new Date(left.date).getTime();
      const rightTime = right.timestamp || new Date(right.date).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 5), [scopedExpenses, scopedIncome]);

  const filteredTransactions = useMemo(() => {
    const target = activeTab === 'expenses' ? scopedExpenses : scopedIncome;
    const normalizedSearch = debouncedSearchQuery.trim().toLowerCase();
    if (!normalizedSearch) return target;
    return target.filter(t => 
      t.item.toLowerCase().includes(normalizedSearch) || 
      t.category.toLowerCase().includes(normalizedSearch)
    );
  }, [scopedExpenses, scopedIncome, activeTab, debouncedSearchQuery]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !company) return;
    setIsSubmitting(true);

    const collectionName = formType === 'expense' ? 'expenses' : 'revenues';
    const selectedCycle = activeCycles.find((cycle) => cycle.id === formData.cycleId);
    const amount = Number(formData.amount);
    if (!selectedCycle) {
      alert(t.financeCycle.selectCycleMessage);
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, 'companies', company.id, collectionName), {
        ...formData,
        amount,
        cycleId: selectedCycle?.id || '',
        cycleName: selectedCycle?.cycleName || '',
        ...(formType === 'expense' ? {
          allocationMethod: selectedCycle ? 'equal_per_pond' : null,
          pondAllocations: allocateExpenseAcrossCyclePonds(amount, selectedCycle?.id, ponds),
        } : {}),
        addedBy: user.uid,
        addedByName: user.name || 'Unknown',
        timestamp: new Date(formData.date).getTime(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(t.financeCycle.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: today,
      category: formType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
      item: '', amount: '', paymentType: PAYMENT_TYPES[0], reference: '', notes: '',
      cycleId: cycleScope === 'all' ? (activeCycles[0]?.id || '') : cycleScope,
    });
  };

  const recordPayment = async (record: Transaction, type: 'expense' | 'income') => {
    if (!company?.id || !canManageFinance) return;
    const outstanding = (monetaryValue(record.amount) ?? 0) - (record.settlements || []).reduce((sum, payment) => sum + payment.amount, 0);
    const raw = window.prompt(`Amount ${type === 'income' ? 'received' : 'paid'} (${currencyConfig.symbol}), outstanding ${outstanding}`, String(outstanding));
    if (raw === null) return;
    const date = window.prompt('Payment date (YYYY-MM-DD)', today);
    if (!date) return;
    const payment = { id: crypto.randomUUID(), date, amount: Number(raw) };
    try {
      const ref = doc(db, 'companies', company.id, type === 'expense' ? 'expenses' : 'revenues', record.id);
      await runTransaction(db, async tx => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) throw new Error('Finance entry not found');
        tx.update(ref, { settlements: appendSettlement(snapshot.data(), payment), updatedAt: serverTimestamp() });
      });
    } catch (error) { alert(error instanceof Error ? error.message : 'Payment could not be recorded'); }
  };

  const handleDelete = async (id: string, type: 'expense' | 'income') => {
    if (!company?.id || !canManageFinance) return;
    const record = (type === 'expense' ? expenses : income).find(record => record.id === id);
    if (!record || isSourceLinkedFinance(record)) { alert('Correct or void linked entries from their source record.'); return; }
    if (!window.confirm(t.messages.deleteConfirm)) return;
    const collectionName = type === 'expense' ? 'expenses' : 'revenues';
    try {
      await deleteDoc(doc(db, 'companies', company.id, collectionName, id));
    } catch (err) {
      console.error(err);
    }
  };


  if (!canViewFinance) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 600 }}>{t.finance.accessDenied}</h2>
        <p style={{ color: 'var(--text-muted)' }}>{t.finance.noPermission}</p>
      </div>
    );
  }

  if (loading || cyclesLoading || pondsLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>;

  return (
    <div className={`dashboard-page authenticated-compact-page business-dashboard-page ${styles.financePage}`}>
      <div className={styles.workspaceNav} role="navigation" aria-label={t.finance.title}>
        {([
          { id: 'overview', label: t.finance.overview, icon: BarChart3 },
          { id: 'income', label: t.finance.revenues, icon: ArrowUpRight },
          { id: 'expenses', label: t.finance.expenses, icon: ArrowDownRight },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeTab === item.id ? styles.workspaceNavActive : undefined}
            aria-pressed={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <Link href="/dashboard/reports/financial">
          <FileText size={18} aria-hidden="true" />
          <span>{t.nav.reports}</span>
        </Link>
      </div>
      <div className="finance-input-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', background: 'var(--bg-mid)', border: '1px solid var(--border)', borderRadius: '14px' }}>
        <div className="finance-cycle-control" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 1 440px', minWidth: 0 }}>
          <label htmlFor="finance-cycle-filter" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t.financeCycle.cycle}</label>
          <select
            id="finance-cycle-filter"
            value={cycleScope}
            onChange={(event) => setCycleScope(event.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-primary)', fontWeight: 600, outline: 'none' }}
          >
            {activeCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.cycleName}{cycle.blockNames?.length ? ` — ${cycle.blockNames.join(', ')}` : cycle.blockName ? ` — ${cycle.blockName}` : ''}</option>)}
            <option value="all">{t.financeCycle.allHistory}</option>
          </select>
        </div>

        {canManageFinance && <div className="pond-detail-record-menu finance-input-menu" ref={inputMenuRef} style={{ position: 'relative', flex: '0 0 auto', zIndex: 30 }}>
          <button
            type="button"
            className="pond-detail-record-trigger finance-input-trigger"
            aria-label={copy('Add finance input')}
            aria-expanded={isInputMenuOpen}
            aria-haspopup="menu"
            onClick={() => setInputMenuOpen((open) => !open)}
          >
            <Plus size={15} />
            <span>{copy('Input')}</span>
          </button>
          {isInputMenuOpen && (
            <div
              className="pond-detail-record-popover finance-input-popover"
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                bottom: 'auto',
                left: 'auto',
                width: 'min(238px, calc(100vw - 24px))',
                zIndex: 80,
              }}
            >
              <button type="button" role="menuitem" onClick={() => openTransactionForm('income')}>
                <ArrowUpRight size={16} />
                <span><strong>{t.finance.addRevenue}</strong><small>{copy('Record incoming funds')}</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => openTransactionForm('expense')}>
                <ArrowDownRight size={16} />
                <span><strong>{t.finance.addExpense}</strong><small>{copy('Record operating costs')}</small></span>
              </button>
            </div>
          )}
        </div>}
      </div>

      <p className={styles.balanceNote}>Recorded balance compares income with purchases and expenses. Use the P&amp;L report for profit and Cash Flow for confirmed payments. New entries require a separate payment confirmation.</p>
      {[...expenses, ...income].some(row => monetaryValue(row.amount) === null) && <p className={styles.dataWarning} role="alert">Some finance amounts are missing or invalid. Totals are unavailable until these entries are corrected.</p>}
      {/* Summary Cards */}
      <div className={`responsive-card-grid ${styles.summaryGrid}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className={`glass-card animate-fade-up ${styles.summaryCard} ${styles.incomeCard}`} style={{ padding: '20px', minHeight: '144px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', color: '#065F46', border: '1px solid #A7F3D0' }}>
          <div className={styles.summaryLabel}>{t.finance.revenues}</div>
          <div className={styles.summaryValue}>{formatCurrency(stats.totalIncome)}</div>
        </div>

        <div className={`glass-card animate-fade-up ${styles.summaryCard} ${styles.expenseCard}`} style={{ padding: '20px', minHeight: '144px', background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', color: '#991B1B', border: '1px solid #FECACA', animationDelay: '0.1s' }}>
          <div className={styles.summaryLabel}>{t.finance.expenses}</div>
          <div className={styles.summaryValue}>{formatCurrency(stats.totalExpense)}</div>
        </div>

        <div className={`glass-card animate-fade-up ${styles.summaryCard} ${stats.profit >= 0 ? styles.incomeCard : styles.expenseCard}`} style={{
          padding: '20px',
          minHeight: '144px',
          background: stats.profit >= 0 ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)', 
          color: stats.profit >= 0 ? '#166534' : '#9F1239', 
          border: stats.profit >= 0 ? '1px solid #BBF7D0' : '1px solid #FECDD3',
          animationDelay: '0.2s'
        }}>
          <div className={styles.summaryLabel}>{copy('Recorded balance')}</div>
          <div className={styles.summaryValue}>{formatCurrency(stats.profit)}</div>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
        <div className={`responsive-two-column ${styles.overviewGrid}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Monthly P&L Table */}
          <div className={`glass-card ${styles.monthlyPanel}`} style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={20} color="var(--primary)" /> {t.finance.monthlyPerformance}
            </h3>
            {monthlyPerformance.length ? (
              <div className={styles.monthlyChart} role="img" aria-label={t.finance.monthlyPerformance}>
                {monthlyPerformance.map((month) => (
                  <div className={styles.monthGroup} key={month.key}>
                    <div className={styles.barArea}>
                      <span className={styles.incomeBar} style={{ height: `${Math.max(3, month.income / monthlyScale * 100)}%` }} title={`${t.finance.revenues}: ${formatCurrency(month.income)}`} />
                      <span className={styles.expenseBar} style={{ height: `${Math.max(3, month.expenses / monthlyScale * 100)}%` }} title={`${t.finance.expenses}: ${formatCurrency(month.expenses)}`} />
                    </div>
                    <small>{month.label}</small>
                  </div>
                ))}
              </div>
            ) : null}
            <div className={styles.monthlyDetails} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px 20px', borderRadius: '16px', background: 'var(--bg-mid)', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.finance.revenues}</span>
                <span style={{ fontWeight: 600, color: '#27AE60' }}>{formatCurrency(stats.totalIncome)}</span>
              </div>
              <div style={{ padding: '16px 20px', borderRadius: '16px', background: 'var(--bg-mid)', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t.finance.expenses}</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatCurrency(stats.totalExpense)}</span>
              </div>
              <div style={{ marginTop: '12px', padding: '24px', borderRadius: '20px', background: 'var(--primary-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{copy('Operating Margin')}</div>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--primary)' }}>
                    {operatingMarginDisplay}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{copy('Recorded balance')}</div>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: stats.profit >= 0 ? '#27AE60' : '#ef4444' }}>{formatCurrency(stats.profit)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions / Tips */}
          <div className={styles.sideStack} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className={`glass-card ${styles.healthPanel}`} style={{ padding: '32px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>{copy('Financial Health')}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{copy('Income Records')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{income.length}</span>
                </div>
                <div style={{ fontSize: '14px', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{copy('Expense Records')}</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>{expenses.length}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, fontWeight: 600 }}>
                  {copy('You have logged')} <b>{expenses.length + income.length}</b> {copy('transactions this period. Your cash flow is')} <b style={{color: stats.profit >= 0 ? '#27AE60' : '#ef4444'}}>{stats.profit >= 0 ? copy('positive') : copy('negative')}</b>.
                </div>
              </div>
            </div>
          </div>

        </div>
        <section className={`glass-card ${styles.recentPanel}`}>
          <h3>{copy('Recent Transactions')}</h3>
          {recentTransactions.length ? (
            <div className={styles.recentList}>
              {recentTransactions.map((transaction) => (
                <div className={styles.recentRow} key={`${transaction.type}-${transaction.id}`}>
                  <time>{new Date(transaction.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  <span>{transaction.category}</span>
                  <strong title={transaction.item}>{conciseFinanceDescription(transaction.item)}</strong>
                  <em className={transaction.type === 'income' ? styles.incomeValue : styles.expenseValue}>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</em>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyState}>{t.finance.noDataMonthly}</p>}
        </section>
        </>
      ) : (
        <div className={`glass-card ${styles.ledgerPanel}`} style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Table Search */}
          <div className={styles.searchRow} style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input 
                placeholder={`${t.actions.search} ${activeTab === 'expenses' ? t.finance.expenses : t.finance.revenues}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '12px 16px 12px 40px', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', outline: 'none', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableScroll} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: 'var(--bg-mid)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.forms.date}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.financeCycle.category}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.finance.itemDescription}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.financeCycle.amount.replace('{{currency}}', currencyConfig.symbol)}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.finance.paymentType}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.financeCycle.cycle}</th>
                  <th style={{ padding: '16px 32px', fontSize: '11px', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>{new Date(t.date).getFullYear()}</div>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <span style={{ padding: '6px 12px', borderRadius: '8px', background: t.type === 'income' ? 'rgba(39, 174, 96, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: t.type === 'income' ? '#27AE60' : '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                        {t.category}
                      </span>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div title={t.item} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{conciseFinanceDescription(t.item)}</div>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: t.type === 'income' ? '#27AE60' : '#ef4444' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.paymentType}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 600 }}>Confirmed: {formatCurrency((t.settlements || []).reduce((sum, payment) => sum + payment.amount, 0))}</div>
                    </td>
                    <td style={{ padding: '20px 32px', fontSize: '13px', fontWeight: 600 }}>{t.cycleName || generalCategoryLabel}</td>
                    <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                      {canManageFinance && <button type="button" onClick={() => recordPayment(t, t.type)} style={{ color: '#0F4C75', padding: 8 }}>Record payment</button>}
                      {canManageFinance && !isSourceLinkedFinance(t) && (
                      <button 
                        onClick={() => handleDelete(t.id, t.type)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer', transition: 'opacity 0.2s' }}
                        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.5')}
                      >
                        <Trash2 size={18} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileLedgerList}>
            {filteredTransactions.map((transaction) => (
              <article className={styles.mobileLedgerRow} key={`mobile-${transaction.id}`}>
                <div className={styles.mobileLedgerMeta}>
                  <span>{transaction.category}</span>
                  <time>{new Date(transaction.date).toLocaleDateString()}</time>
                </div>
                <div className={styles.mobileLedgerMain}>
                  <div>
                    <h3 title={transaction.item}>{conciseFinanceDescription(transaction.item)}</h3>
                    <p>{transaction.paymentType} · {transaction.cycleName || generalCategoryLabel}</p>
                  </div>
                  <strong className={transaction.type === 'income' ? styles.incomeValue : styles.expenseValue}>{transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}</strong>
                </div>
                {canManageFinance ? <div className={styles.mobileLedgerActions}><button type="button" onClick={() => recordPayment(transaction, transaction.type)}>Record payment</button>{!isSourceLinkedFinance(transaction) ? <button type="button" aria-label={t.actions.delete} onClick={() => handleDelete(transaction.id, transaction.type)}><Trash2 size={17} /></button> : null}</div> : null}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Log Modal */}
      {isModalOpen && (
        <div className="responsive-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', padding: '24px' }}>
          <div className="glass-card responsive-modal animate-fade-up" style={{ width: '100%', maxWidth: '600px', background: 'white', overflow: 'hidden', boxShadow: '0 20px 50px rgba(15, 76, 117, 0.2)' }}>
            <div className="responsive-modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-mid)' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{t.financeCycle.logTransaction.replace('{{type}}', formType === 'income' ? t.finance.revenue : t.finance.expenses)}</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form className="responsive-modal-body" onSubmit={handlePost} style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '16px', rowGap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.forms.date}</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} onKeyDown={e => e.preventDefault()} onPaste={e => e.preventDefault()} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.financeCycle.category}</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {(formType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.financeCycle.allocateToCycle}</label>
                  <select required value={formData.cycleId} onChange={e => setFormData({...formData, cycleId: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                    <option value="" disabled>{t.financeCycle.selectCycle}</option>
                    {activeCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.cycleName}</option>)}
                  </select>
                  {formType === 'expense' && formData.cycleId ? <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {t.financeCycle.splitAcrossPonds
                      .replace('{{count}}', String(ponds.filter((pond) => pond.cycleId === formData.cycleId).length))
                      .replace('{{cycleName}}', activeCycles.find((cycle) => cycle.id === formData.cycleId)?.cycleName || t.financeCycle.cycle)}
                  </span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.finance.itemDescription}</label>
                  <input required value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} placeholder={t.finance.enterDescription} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.financeCycle.amount.replace('{{currency}}', currencyConfig.symbol)}</label>
                  <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>{t.finance.paymentType}</label>
                  <select value={formData.paymentType} onChange={e => setFormData({...formData, paymentType: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-mid)', outline: 'none', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {PAYMENT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="responsive-modal-footer" style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: '1 1 0', minWidth: 0, padding: '12px 16px', borderRadius: '12px', fontWeight: 600 }}>{t.actions.cancel}</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: '1 1 0', minWidth: 0, padding: '12px 16px', borderRadius: '12px', background: 'var(--primary)', border: 'none', fontWeight: 600 }}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : `${t.actions.save} ${formType === 'income' ? t.finance.revenue : t.finance.expenses}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
