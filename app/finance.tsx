// app/finance.tsx - Optimized with consistent Android styles
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import {
  FlatList, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator,
  Modal, Dimensions, Switch, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import financeService, { Expense, ExpenseInput } from './services/financeService';
import revenueService, { Revenue, RevenueInput } from './services/revenueService';
import { usePondStore } from './store/pondStore';
import { useFeedAdditiveStore } from './store/feedAdditiveStore';
import { getFarmDateKey, getFarmPeriodDateKeys, isDateKeyInRange } from '../shared/farmDate';
import AppDatePicker from './components/forms/AppDatePicker';
import CycleSelector from './components/forms/CycleSelector';
import {
  allocateExpenseAcrossCyclePonds,
  getOpenFinanceCycles,
} from '../shared/financeCycleAllocation';

const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Mobile Payment'];
const PERIOD_OPTIONS = ['Today', 'This Week', 'This Month', 'All Time'] as const;

const COLORS: Record<string, string> = {
  General: '#607D8B',
  Feed: '#0d2137', 'Pond Additives': '#315f57', Labor: '#dbe7df',
  Repairs: '#0d2137', Utilities: '#5DADE2', Miscellaneous: '#85C1E9',
  'Shrimp Sales': '#27AE60', Consultation: '#2ECC71',
  'Equipment Rental': '#52BE80', 'Other Income': '#7DCEA0',
};

const { width: screenWidth } = Dimensions.get('window');

type ExpensePieDatum = {
  name: string;
  population: number;
  color: string;
};

const pointOnCircle = (centerX: number, centerY: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
};

const createPieSlicePath = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = pointOnCircle(centerX, centerY, radius, endAngle);
  const end = pointOnCircle(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
};

const ExpensePieChart = ({ data, width, height }: { data: ExpensePieDatum[]; width: number; height: number }) => {
  const total = data.reduce((sum, item) => sum + item.population, 0);
  const radius = height / 2.5;
  const centerX = width / 4 + 15;
  const centerY = height / 2;
  let startAngle = 0;

  return (
    <Svg
      width={width}
      height={height}
      accessible
      accessibilityLabel="Expense distribution chart"
      accessibilityRole="image"
    >
      {data.map((item) => {
        const sweepAngle = total > 0 ? (item.population / total) * 360 : 0;
        const endAngle = startAngle + sweepAngle;
        const slicePath = createPieSlicePath(centerX, centerY, radius, startAngle, endAngle);
        startAngle = endAngle;
        return sweepAngle >= 359.999
          ? <Circle key={item.name} cx={centerX} cy={centerY} r={radius} fill={item.color} />
          : <Path key={item.name} d={slicePath} fill={item.color} />;
      })}
    </Svg>
  );
};

type FormData = {
  date: string; category: string; item: string; amount: string; paymentType: string;
  reference: string; linkedInventory: string; notes: string; cycleId: string;
};

export default function FinancePage() {
  const router = useRouter();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const { harvestRecords, cycles, ponds } = usePondStore();
  const activeCycles = useMemo(() => getOpenFinanceCycles(cycles), [cycles]);
  const feedAdditiveStore = useFeedAdditiveStore();

  const CATEGORIES = [
    t.financeCycle.general,
    t.inventory?.feeds || 'Feed',
    t.inventory?.additives || 'Pond Additives',
    t.finance?.labor || 'Labor',
    t.finance?.repairs || 'Repairs',
    t.finance?.utilities || 'Utilities',
    t.finance?.miscellaneous || 'Miscellaneous'
  ];

  const REVENUE_CATEGORIES = [
    t.finance?.shrimpSales || 'Shrimp Sales',
    t.finance?.consultation || 'Consultation',
    t.finance?.equipmentRental || 'Equipment Rental',
    t.finance?.otherIncome || 'Other Income'
  ];

  const TRANSLATED_PAYMENT_TYPES = [
    t.finance?.cash || 'Cash',
    t.finance?.bankTransfer || 'Bank Transfer',
    t.finance?.mobilePayment || 'Mobile Payment'
  ];

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'expense' | 'revenue'>('expense');
  const [selectedPeriod, setSelectedPeriod] = useState<typeof PERIOD_OPTIONS[number]>('Today');
  const [cycleScope, setCycleScope] = useState('all');
  const [filterCategory, setFilterCategory] = useState(t.finance?.all || 'All');
  const [submitting, setSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'revenues'>('overview');
  const [harvestSyncEnabled, setHarvestSyncEnabled] = useState(true);
  const [inventorySyncEnabled, setInventorySyncEnabled] = useState(true);
  const [syncedHarvestIds, setSyncedHarvestIds] = useState<Set<string>>(new Set());
  const [syncedInventoryIds, setSyncedInventoryIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<FormData>({
    date: getFarmDateKey(new Date(), company?.timeZone),
    category: CATEGORIES[0], 
    item: '', 
    amount: '',
    paymentType: TRANSLATED_PAYMENT_TYPES[0], 
    reference: '', 
    linkedInventory: '', 
    notes: '',
    cycleId: activeCycles[0]?.id || '',
  });

  const selectedFormCycle = cycles.find((cycle) => cycle.id === formData.cycleId);
  const formCycleOptions = selectedFormCycle && !activeCycles.some((cycle) => cycle.id === selectedFormCycle.id)
    ? [...activeCycles, selectedFormCycle]
    : activeCycles;
  const selectedFormCyclePonds = selectedFormCycle
    ? ponds.filter((pond) => pond.cycleId === selectedFormCycle.id)
    : [];

  const hasFinanceAccess = ['owner', 'co-owner', 'manager', 'admin'].includes(user?.role || '');

  const getTranslatedPeriod = (period: typeof PERIOD_OPTIONS[number]) => {
    switch (period) {
      case 'Today': return t.finance?.today || 'Today';
      case 'This Week': return t.finance?.thisWeek || 'This Week';
      case 'This Month': return t.finance?.thisMonth || 'This Month';
      case 'All Time': return t.finance?.allTime || 'All Time';
      default: return period;
    }
  };

  useEffect(() => {
    if (!hasFinanceAccess) {
      Alert.alert(t.finance?.accessDenied || 'Access Denied', t.finance?.noPermission || 'You do not have permission to view finance data.');
      router.back();
      return;
    }
    if (!company?.id) {
      Alert.alert('Error', 'No company found. Please set up your company first.');
      router.back();
      return;
    }
    loadData();
    feedAdditiveStore.setCurrentCompanyId(company.id, company.timeZone);
    feedAdditiveStore.initializeForCompany(company.id, company.timeZone);
  }, [company?.id, company?.timeZone]);

  useEffect(() => {
    if (!company?.id || !user?.uid || loading) return;
    const handleSyncToggle = async () => {
      if (harvestSyncEnabled) {
        const unsyncedHarvests = harvestRecords.filter(harvest => !syncedHarvestIds.has(harvest.id));
        if (unsyncedHarvests.length > 0) await syncHarvestToRevenue();
      } else {
        await removeSyncedRevenues();
      }
    };
    handleSyncToggle();
  }, [harvestSyncEnabled, harvestRecords.length]);

  useEffect(() => {
    if (!company?.id || !user?.uid || loading) return;
    const handleInventorySyncToggle = async () => {
      if (inventorySyncEnabled) {
        const allStockIns = [
          ...feedAdditiveStore.feeds.flatMap(feed => 
            (feed.stockInHistory || []).map(stock => ({ 
              ...stock, itemName: feed.feedName, category: t.inventory?.feeds || 'Feed',
              itemId: feed.id, type: 'feed' as const 
            }))
          ),
          ...feedAdditiveStore.additives.filter(additive => additive.inventoryKind !== 'treatmentMix').flatMap(additive =>
            (additive.stockInHistory || []).map(stock => ({ 
              ...stock, itemName: additive.additiveName, category: t.inventory?.additives || 'Pond Additives',
              itemId: additive.id, type: 'additive' as const 
            }))
          )
        ];
        const unsyncedStockIns = allStockIns.filter(stock => !syncedInventoryIds.has(`${stock.type}-${stock.itemId}-${stock.id}`));
        if (unsyncedStockIns.length > 0) await syncInventoryToExpense(unsyncedStockIns);
      } else {
        await removeSyncedExpenses();
      }
    };
    handleInventorySyncToggle();
  }, [inventorySyncEnabled, feedAdditiveStore.feeds.length, feedAdditiveStore.additives.length]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const [fetchedExpenses, fetchedRevenues] = await Promise.all([
        financeService.getExpenses(company.id),
        revenueService.getRevenues(company.id),
      ]);
      setExpenses(fetchedExpenses);
      setRevenues(fetchedRevenues);

      const harvestRefs = new Set(
        fetchedRevenues.filter(r => r.reference?.startsWith('HARVEST-')).map(r => r.reference!.replace('HARVEST-', ''))
      );
      setSyncedHarvestIds(harvestRefs);

      const inventoryRefs = new Set(
        fetchedExpenses.filter(e => e.reference?.startsWith('INVENTORY-')).map(e => e.reference!.replace('INVENTORY-', ''))
      );
      setSyncedInventoryIds(inventoryRefs);
    } catch (error: any) {
      console.error('Failed to load finance data:', error);
      Alert.alert('Error', 'Failed to load finance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncInventoryToExpense = async (stockIns: any[]) => {
    if (!company?.id || !user?.uid) return;

    for (const stock of stockIns) {
      const totalCost = (stock.quantity || 0) * (stock.price || 0);
      
      if (totalCost > 0) {
        const expenseData: ExpenseInput = {
          date: stock.date instanceof Date ? getFarmDateKey(stock.date, company?.timeZone) :
                typeof stock.date === 'string' ? stock.date.split('T')[0] : 
                getFarmDateKey(new Date(), company?.timeZone),
          category: stock.category,
          item: `${stock.itemName} - ${stock.quantity} ${stock.unit || 'kg'}${stock.batch ? ` (${t.finance?.batch || 'Batch'}: ${stock.batch})` : ''}`,
          amount: totalCost,
          paymentType: 'Cash',
          reference: `INVENTORY-${stock.type}-${stock.itemId}-${stock.id}`,
          notes: `${t.finance?.autoSynced || 'Auto-synced from'} inventory${stock.notes ? `: ${stock.notes}` : ''}`,
          linkedInventory: stock.itemName,
        };

        try {
          await financeService.addExpense(company.id, expenseData, user.uid, user.name || user.email?.split('@')[0] || 'Unknown');
          setSyncedInventoryIds(prev => new Set([...prev, `${stock.type}-${stock.itemId}-${stock.id}`]));
        } catch (error: any) {
          console.error('Failed to sync inventory:', error);
        }
      } else {
        setSyncedInventoryIds(prev => new Set([...prev, `${stock.type}-${stock.itemId}-${stock.id}`]));
      }
    }
    await loadData();
  };

  const removeSyncedExpenses = async () => {
    if (!company?.id) return;
    try {
      const syncedExpenses = expenses.filter(e => e.reference?.startsWith('INVENTORY-'));
      for (const expense of syncedExpenses) {
        try {
          await financeService.deleteExpense(company.id, expense.id);
        } catch (error: any) {
          console.error('Failed to delete synced expense:', error);
        }
      }
      setSyncedInventoryIds(new Set());
      await loadData();
    } catch (error: any) {
      console.error('Error removing synced expenses:', error);
      Alert.alert('Error', 'Failed to remove some synced expenses');
    }
  };

  const syncHarvestToRevenue = async () => {
    if (!company?.id || !user?.uid) return;

    const unsyncedHarvests = harvestRecords.filter(harvest => !syncedHarvestIds.has(harvest.id));
    if (unsyncedHarvests.length === 0) return;

    for (const harvest of unsyncedHarvests) {
      let totalBiomass = 0;
      let totalPrice = 0;

      harvest.ponds.forEach(pond => {
        const biomass = parseFloat(pond.biomass) || 0;
        const pricePerKg = parseFloat(pond.price) || 0;
        const subBiomass = parseFloat(pond.subBiomass) || 0;
        const subPricePerKg = parseFloat(pond.subPrice) || 0;

        totalBiomass += biomass + subBiomass;
        totalPrice += (biomass * pricePerKg) + (subBiomass * subPricePerKg);
      });

      if (totalPrice > 0) {
        const revenueData: RevenueInput = {
          date: harvest.date,
          category: REVENUE_CATEGORIES[0],
          item: `${t.harvest?.title || 'Harvest'} (${new Date(harvest.date).toLocaleDateString()}) - ${totalBiomass.toFixed(1)} kg`,
          amount: totalPrice,
          cycleId: harvest.cycleId,
          cycleName: harvest.cycleName,
          paymentType: 'Cash',
          reference: `HARVEST-${harvest.id}`,
          notes: `${t.finance?.autoSynced || 'Auto-synced from'} harvest`,
        };

        try {
          await revenueService.addRevenue(company.id, revenueData, user.uid, user.name || user.email?.split('@')[0] || 'Unknown');
          setSyncedHarvestIds(prev => new Set([...prev, harvest.id]));
        } catch (error: any) {
          console.error('Failed to sync harvest:', error);
        }
      } else {
        setSyncedHarvestIds(prev => new Set([...prev, harvest.id]));
      }
    }
    await loadData();
  };

  const removeSyncedRevenues = async () => {
    if (!company?.id) return;
    try {
      const syncedRevenues = revenues.filter(r => r.reference?.startsWith('HARVEST-'));
      for (const revenue of syncedRevenues) {
        try {
          await revenueService.deleteRevenue(company.id, revenue.id);
        } catch (error: any) {
          console.error('Failed to delete synced revenue:', error);
        }
      }
      setSyncedHarvestIds(new Set());
      await loadData();
    } catch (error: any) {
      console.error('Error removing synced revenues:', error);
      Alert.alert('Error', 'Failed to remove some synced revenues');
    }
  };

  const handleSubmit = async () => {
    if (!formData.item.trim() || !formData.amount) {
      Alert.alert(t.finance?.validationError || 'Validation Error', t.finance?.fillAllFields || 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t.finance?.validationError || 'Validation Error', t.finance?.validAmount || 'Please enter a valid amount');
      return;
    }

    if (!company?.id || !user?.uid) {
      Alert.alert('Error', 'User or company information missing');
      return;
    }

    const selectedCycle = cycles.find((cycle) => cycle.id === formData.cycleId);
    if (!selectedCycle) {
      Alert.alert(t.financeCycle.selectCycleTitle, t.financeCycle.selectCycleMessage);
      return;
    }

    setSubmitting(true);
    try {
      const baseData = {
        date: formData.date, category: formData.category, item: formData.item, amount,
        paymentType: formData.paymentType, reference: formData.reference, notes: formData.notes,
        cycleId: selectedCycle?.id || '',
        cycleName: selectedCycle?.cycleName || '',
      };

      if (formType === 'expense') {
        const pondAllocations = allocateExpenseAcrossCyclePonds(amount, selectedCycle?.id, ponds);
        const expenseData: ExpenseInput = {
          ...baseData,
          linkedInventory: formData.linkedInventory,
          allocationMethod: selectedCycle ? 'equal_per_pond' : null,
          pondAllocations,
        };
        if (editingExpense) {
          await financeService.updateExpense(company.id, editingExpense.id, expenseData);
          Alert.alert('Success', `${t.finance?.expenses || 'Expense'} updated successfully`);
        } else {
          await financeService.addExpense(company.id, expenseData, user.uid, user.name || user.email?.split('@')[0] || 'Unknown');
          Alert.alert('Success', `${t.finance?.expenses || 'Expense'} added successfully`);
        }
      } else {
        if (editingRevenue) {
          await revenueService.updateRevenue(company.id, editingRevenue.id, baseData);
          Alert.alert('Success', `${t.finance?.revenue || 'Revenue'} updated successfully`);
        } else {
          await revenueService.addRevenue(company.id, baseData, user.uid, user.name || user.email?.split('@')[0] || 'Unknown');
          Alert.alert('Success', `${t.finance?.revenue || 'Revenue'} added successfully`);
        }
      }

      await loadData();
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error('Failed to save finance data:', error);
      Alert.alert('Error', 'Failed to save data. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (type: 'expense' | 'revenue', item: Expense | Revenue) => {
    if (type === 'revenue' && item.reference?.startsWith('HARVEST-')) {
      Alert.alert(t.finance?.cannotEdit || 'Cannot Edit', t.finance?.cannotEditHarvest || 'This revenue was auto-synced from a harvest record and cannot be edited directly.');
      return;
    }
    if (type === 'expense' && item.reference?.startsWith('INVENTORY-')) {
      Alert.alert(t.finance?.cannotEdit || 'Cannot Edit', t.finance?.cannotEditInventory || 'This expense was auto-synced from an inventory stock-in and cannot be edited directly.');
      return;
    }

    const isExpense = type === 'expense';
    setFormData({
      date: item.date, category: item.category, item: item.item, amount: item.amount.toString(),
      paymentType: item.paymentType, reference: item.reference,
      linkedInventory: isExpense ? (item as Expense).linkedInventory || '' : '', notes: item.notes,
      cycleId: item.cycleId || '',
    });
    if (isExpense) setEditingExpense(item as Expense);
    else setEditingRevenue(item as Revenue);
    setFormType(type);
    setShowForm(true);
  };

  const handleDelete = async (type: 'expense' | 'revenue', item: Expense | Revenue) => {
    if (type === 'revenue' && item.reference?.startsWith('HARVEST-')) {
      Alert.alert(t.finance?.cannotDelete || 'Cannot Delete', t.finance?.cannotDeleteHarvest || 'This revenue was auto-synced from a harvest record. To remove it, delete the corresponding harvest record or disable harvest sync.');
      return;
    }
    if (type === 'expense' && item.reference?.startsWith('INVENTORY-')) {
      Alert.alert(t.finance?.cannotDelete || 'Cannot Delete', t.finance?.cannotDeleteInventory || 'This expense was auto-synced from inventory. To remove it, delete the stock-in record from inventory or disable inventory sync.');
      return;
    }

    Alert.alert(
      `Delete ${type === 'expense' ? t.finance?.expenses || 'Expense' : t.finance?.revenue || 'Revenue'}`,
      `${t.finance?.deleteConfirm || 'Are you sure you want to delete this'} ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!company?.id) return;
            try {
              if (type === 'expense') await financeService.deleteExpense(company.id, item.id);
              else await revenueService.deleteRevenue(company.id, item.id);
              Alert.alert('Success', `${type === 'expense' ? t.finance?.expenses || 'Expense' : t.finance?.revenue || 'Revenue'} ${t.finance?.deleteSuccess || 'deleted successfully'}`);
              await loadData();
            } catch (error: any) {
              console.error(`Failed to delete ${type}:`, error);
              Alert.alert('Error', `Failed to delete ${type}. Please try again.`);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      date: getFarmDateKey(new Date(), company?.timeZone),
      category: formType === 'expense' ? CATEGORIES[0] : REVENUE_CATEGORIES[0],
      item: '', amount: '', paymentType: TRANSLATED_PAYMENT_TYPES[0], reference: '', linkedInventory: '', notes: '',
      cycleId: cycleScope === 'all' ? (activeCycles[0]?.id || '') : cycleScope,
    });
    setEditingExpense(null);
    setEditingRevenue(null);
  };

  const getCycleScopedData = <T extends { cycleId?: string }>(data: T[]) => {
    if (cycleScope === 'all') return data;
    return data.filter((item) => item.cycleId === cycleScope);
  };

  const getFilteredData = <T extends { date: string; category?: string; cycleId?: string }>(data: T[], useCategory = true) => {
    const period = selectedPeriod === 'Today'
      ? 'today'
      : selectedPeriod === 'This Week'
        ? 'week'
        : selectedPeriod === 'This Month'
          ? 'month'
          : 'all';
    const { startDateKey, endDateKey } = getFarmPeriodDateKeys(period, new Date(), company?.timeZone);
    
    let filtered = getCycleScopedData(data).filter(item => {
      if (selectedPeriod === 'All Time') return true;
      return isDateKeyInRange(item.date, startDateKey, endDateKey, company?.timeZone);
    });

    if (useCategory && filterCategory !== (t.finance?.all || 'All')) {
      filtered = filtered.filter(item => item.category === filterCategory);
    }
    return filtered;
  };

  const getFilteredExpenses = () => getFilteredData(expenses);
  const getFilteredRevenues = () => getFilteredData(revenues, false);

  const calculateTotals = (data: Expense[] | Revenue[], service: typeof financeService | typeof revenueService) => {
    const total = service.calculateTotal(data);
    const byCategory = service.getCategoryBreakdown(data);
    const top = service === financeService 
      ? (service as typeof financeService).getTopExpenses(data as Expense[], 3)
      : (service as typeof revenueService).getTopRevenues(data as Revenue[], 3);
    return { total, byCategory, top };
  };

  const expenseTotals = calculateTotals(getFilteredExpenses(), financeService);
  const revenueTotals = calculateTotals(getFilteredRevenues(), revenueService);
  const profit = revenueTotals.total - expenseTotals.total;

  const profitLossData = useMemo(() => {
    const scopedExpenses = getCycleScopedData(expenses);
    const scopedRevenues = getCycleScopedData(revenues);
    if (scopedExpenses.length === 0 && scopedRevenues.length === 0) return null;

    const allDates = [...scopedExpenses.map(e => e.date), ...scopedRevenues.map(r => r.date)];
    if (allDates.length === 0) return null;

    const earliestDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const now = new Date();
    const months: { month: string; revenue: number; expense: number; profit: number }[] = [];
    let currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);

    while (currentDate <= now) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthRevenue = scopedRevenues.filter(r => r.date.startsWith(monthKey)).reduce((sum, r) => sum + r.amount, 0);
      const monthExpense = scopedExpenses.filter(e => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.amount, 0);

      months.push({ month: monthLabel, revenue: monthRevenue, expense: monthExpense, profit: monthRevenue - monthExpense });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
  }, [expenses, revenues, cycleScope]);

  const createPieChartData = (byCategory: Record<string, number>) =>
    Object.entries(byCategory).map(([name, population]) => ({
      name, population, color: COLORS[name] || '#dbe7df',
    }));

  const expensePieChartData = createPieChartData(expenseTotals.byCategory);

  const renderLedgerItem = (item: Expense | Revenue, type: 'expense' | 'revenue') => {
    const isHarvestSynced = type === 'revenue' && item.reference?.startsWith('HARVEST-');
    const isInventorySynced = type === 'expense' && item.reference?.startsWith('INVENTORY-');
    const isSynced = isHarvestSynced || isInventorySynced;
    
    return (
      <View key={item.id} style={styles.ledgerItem}>
        <View style={styles.ledgerHeader}>
          <View style={styles.ledgerLeft}>
            <View style={[styles.categoryPill, type === 'revenue' ? styles.revenuePill : styles.expensePill]}>
              <Text style={styles.categoryPillText}>{item.category}</Text>
            </View>
            {isSynced && (
              <View style={styles.syncBadge}>
                <Ionicons name="sync" size={10} color={isHarvestSynced ? "#27AE60" : "#3498DB"} />
                <Text style={[styles.syncBadgeText, isInventorySynced && { color: '#3498DB' }]}>Auto</Text>
              </View>
            )}
            <Text style={styles.ledgerItemName}>{item.item}</Text>
          </View>
          <Text style={[styles.ledgerAmount, type === 'revenue' ? styles.revenueColor : styles.expenseColor]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View style={styles.ledgerMeta}>
          <Text style={styles.ledgerMetaText}>
            <Ionicons name="calendar-outline" size={12} color="#95A5A6" /> {new Date(item.date).toLocaleDateString('id-ID')}
          </Text>
          <Text style={styles.ledgerMetaText}>
            <Ionicons name="card-outline" size={12} color="#95A5A6" /> {item.paymentType}
          </Text>
          <Text style={styles.ledgerMetaText}>
            <Ionicons name="repeat-outline" size={12} color="#95A5A6" /> {item.cycleName || t.financeCycle.general}
          </Text>
        </View>
        {item.reference && !isSynced && <Text style={styles.ledgerReference}>Ref: {item.reference}</Text>}
        {item.notes && <Text style={styles.ledgerNotes}>{item.notes}</Text>}
        <View style={styles.ledgerFooter}>
          <Text style={styles.ledgerAddedBy}>{item.addedByName}</Text>
          <View style={styles.ledgerActions}>
            <TouchableOpacity onPress={() => handleEdit(type, item)} 
              style={[styles.iconButton, isSynced && styles.iconButtonDisabled]} disabled={isSynced}>
              <Ionicons name="create-outline" size={18} color={isSynced ? "#BDC3C7" : "#3498DB"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(type, item)} 
              style={[styles.iconButton, isSynced && styles.iconButtonDisabled]} disabled={isSynced}>
              <Ionicons name="trash-outline" size={18} color={isSynced ? "#BDC3C7" : "#E74C3C"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>{t.finance?.loadingFinance || 'Loading finance data...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.finance?.title || 'Finance'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => {
                resetForm();
                setFormType('revenue');
                setFormData(prev => ({ ...prev, category: REVENUE_CATEGORIES[0] }));
                setShowForm(true);
              }} style={styles.addButtonIcon}>
              <Ionicons name="arrow-down-circle" size={28} color="#27AE60" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
                resetForm();
                setFormType('expense');
                setFormData(prev => ({ ...prev, category: CATEGORIES[0] }));
                setShowForm(true);
              }} style={styles.addButtonIcon}>
              <Ionicons name="arrow-up-circle" size={28} color="#E74C3C" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.periodContainer, styles.datePeriodContainer]}>
          {PERIOD_OPTIONS.map(period => (
            <TouchableOpacity key={period}
              style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
              onPress={() => setSelectedPeriod(period)}>
              <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
                {getTranslatedPeriod(period)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cycleFilterContainer}>
          <CycleSelector
            value={cycleScope}
            options={activeCycles}
            onChange={setCycleScope}
            includeAllHistory
            placeholder={t.financeCycle.selectCycle}
            allHistoryLabel={t.financeCycle.allHistory}
            sheetEyebrow={t.financeCycle.cycle}
            sheetTitle={t.financeCycle.selectCycle}
          />
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>{t.finance?.revenue || 'Revenue'}</Text>
            <Text style={[styles.summaryRowAmount, styles.revenueColor]}>{formatCurrency(revenueTotals.total)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>{t.finance?.expenses || 'Expenses'}</Text>
            <Text style={[styles.summaryRowAmount, styles.expenseColor]}>{formatCurrency(expenseTotals.total)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>{t.finance?.profitLoss || 'Profit & Loss'}</Text>
            <Text style={[styles.summaryRowAmount, profit >= 0 ? styles.revenueColor : styles.expenseColor]}>
              {formatCurrency(Math.abs(profit))}
            </Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: t.finance?.overview || 'Overview', icon: 'pie-chart-outline' },
            { key: 'expenses', label: t.finance?.expenses || 'Expenses', icon: 'receipt-outline' },
            { key: 'revenues', label: t.finance?.revenue || 'Revenue', icon: 'cash-outline' },
          ].map(({ key, label, icon }) => (
            <TouchableOpacity key={key}
              style={[styles.tab, activeTab === key && styles.tabActive]}
              onPress={() => setActiveTab(key as any)}>
              <Ionicons name={icon as any} size={20} color={activeTab === key ? '#3498DB' : '#95A5A6'} />
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' && (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t.finance?.monthlyPerformance || 'Monthly Performance'}</Text>
              {profitLossData && profitLossData.length > 0 ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthlyCardsScroll}>
                    <View style={styles.monthlyCardsContainer}>
                      {profitLossData.map((data) => {
                        const isProfit = data.profit >= 0;
                        
                        return (
                          <View key={data.month} style={styles.monthCard}>
                            <View style={styles.monthCardHeader}>
                              <Text style={styles.monthCardMonth}>{data.month}</Text>
                            </View>
                            
                            <View style={styles.monthCardBody}>
                              <View style={styles.amountRow}>
                                <View style={styles.amountLabel}>
                                  <View style={[styles.amountDot, { backgroundColor: '#27AE60' }]} />
                                  <Text style={styles.amountLabelText}>{t.finance?.revenue || 'Revenue'}</Text>
                                </View>
                                <Text style={styles.amountValue}>{formatCurrency(data.revenue)}</Text>
                              </View>
                              
                              <View style={styles.amountRow}>
                                <View style={styles.amountLabel}>
                                  <View style={[styles.amountDot, { backgroundColor: '#E74C3C' }]} />
                                  <Text style={styles.amountLabelText}>{t.finance?.expenses || 'Expenses'}</Text>
                                </View>
                                <Text style={styles.amountValue}>{formatCurrency(data.expense)}</Text>
                              </View>
                              
                              <View style={styles.dividerLine} />
                              
                              <View style={styles.profitRow}>
                                <Text style={styles.profitLabel}>{isProfit ? t.finance?.netProfit || 'Net Profit' : t.finance?.netLoss || 'Net Loss'}</Text>
                                <Text style={[styles.profitValue, isProfit ? styles.profitPositive : styles.profitNegative]}>
                                  {formatCurrency(Math.abs(data.profit))}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.monthCardFooter}>
                              <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { 
                                  width: data.revenue > 0 ? `${Math.min((data.expense / data.revenue) * 100, 100)}%` : '0%',
                                  backgroundColor: data.expense > data.revenue ? '#E74C3C' : '#F39C12'
                                }]} />
                              </View>
                              <Text style={styles.progressText}>
                                {data.revenue > 0 ? `${((data.expense / data.revenue) * 100).toFixed(0)}% ${t.finance?.ofRevenueSpent || 'of revenue spent'}` : t.finance?.noRevenue || 'No revenue'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                  
                  <View style={styles.performanceSummary}>
                    <View style={styles.summaryMetric}>
                      <Ionicons name="trending-up-outline" size={20} color="#27AE60" />
                      <Text style={styles.summaryMetricLabel}>{t.finance?.bestMonth || 'Best Month'}</Text>
                      <Text style={styles.summaryMetricValue}>
                        {profitLossData.reduce((best, current) => current.profit > best.profit ? current : best).month}
                      </Text>
                    </View>
                    <View style={styles.summaryDividerVertical} />
                    <View style={styles.summaryMetric}>
                      <Ionicons name="bar-chart-outline" size={20} color="#3498DB" />
                      <Text style={styles.summaryMetricLabel}>{t.finance?.avgProfit || 'Avg Profit'}</Text>
                      <Text style={styles.summaryMetricValue}>
                        {formatCurrency(profitLossData.reduce((sum, d) => sum + d.profit, 0) / profitLossData.length)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons name="trending-up-outline" size={48} color="#BDC3C7" />
                  <Text style={styles.emptyChartText}>{t.finance?.noDataMonthly || 'No data for monthly performance'}</Text>
                </View>
              )}
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{t.finance?.expenseDistribution || 'Expense Distribution'}</Text>
              {expensePieChartData.length > 0 ? (
                <>
                  <ExpensePieChart data={expensePieChartData} width={screenWidth - 64} height={200} />
                  <View style={styles.legend}>
                    {Object.entries(expenseTotals.byCategory).map(([category, amount]) => (
                      <View key={category} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: COLORS[category] }]} />
                        <Text style={styles.legendLabel}>{category}</Text>
                        <Text style={styles.legendValue}>{((amount / expenseTotals.total) * 100).toFixed(0)}%</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons name="pie-chart-outline" size={48} color="#BDC3C7" />
                  <Text style={styles.emptyChartText}>{t.finance?.noExpenseData || 'No expense data'}</Text>
                </View>
              )}
            </View>

            {expenseTotals.top.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t.finance?.top3Expenses || 'Top 3 Expenses'}</Text>
                {expenseTotals.top.map((expense, index) => (
                  <View key={expense.id} style={styles.topItem}>
                    <View style={styles.topRank}>
                      <Text style={styles.topRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topName}>{expense.item}</Text>
                      <Text style={styles.topCategory}>{expense.category}</Text>
                    </View>
                    <Text style={styles.topAmount}>{formatCurrency(expense.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {Object.keys(expenseTotals.byCategory).length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t.finance?.expenseBreakdown || 'Expense Breakdown'}</Text>
                {CATEGORIES.filter(cat => expenseTotals.byCategory[cat] > 0).map(category => (
                  <View key={category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCategory}>{category}</Text>
                    <View style={styles.breakdownRight}>
                      <View style={styles.breakdownBar}>
                        <View style={[styles.breakdownFill, { 
                          width: `${(expenseTotals.byCategory[category] / expenseTotals.total) * 100}%`, 
                          backgroundColor: COLORS[category] 
                        }]} />
                      </View>
                      <Text style={styles.breakdownAmount}>{formatCurrency(expenseTotals.byCategory[category])}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'expenses' && (
          <View style={styles.ledgerSection}>
            <View style={styles.syncToggleContainer}>
              <View style={styles.syncToggleLeft}>
                <Ionicons name="sync" size={20} color="#3498DB" />
                <View style={styles.syncToggleTextContainer}>
                  <Text style={styles.syncToggleLabel}>{t.finance?.autoSyncInventory || 'Auto-sync Inventory'}</Text>
                  <Text style={styles.syncToggleSubtext}>{t.finance?.autoSyncInventorySubtext || 'Automatically add stock-in expenses from inventory'}</Text>
                </View>
              </View>
              <Switch value={inventorySyncEnabled} onValueChange={setInventorySyncEnabled}
                trackColor={{ false: '#ECF0F1', true: '#3498DB' }} thumbColor={inventorySyncEnabled ? '#FFFFFF' : '#BDC3C7'} />
            </View>

            <View style={styles.ledgerHeader}>
              <Text style={styles.ledgerTitle}>{t.finance?.expenseLedger || 'Expense Ledger'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {[t.finance?.all || 'All', ...CATEGORIES].map(cat => (
                  <TouchableOpacity key={cat}
                    style={[styles.filterPill, filterCategory === cat && styles.filterPillActive]}
                    onPress={() => setFilterCategory(cat)}>
                    <Text style={[styles.filterPillText, filterCategory === cat && styles.filterPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {getFilteredExpenses().length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateText}>{t.finance?.noExpenses || 'No expenses found'}</Text>
                <Text style={styles.emptyStateSubtext}>{t.finance?.addFirstExpense || 'Add your first expense to get started'}</Text>
              </View>
            ) : (
              <FlatList
                data={getFilteredExpenses()}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => renderLedgerItem(item, 'expense')}
              />
            )}
          </View>
        )}

        {activeTab === 'revenues' && (
          <View style={styles.ledgerSection}>
            <View style={styles.syncToggleContainer}>
              <View style={styles.syncToggleLeft}>
                <Ionicons name="sync" size={20} color="#27AE60" />
                <View style={styles.syncToggleTextContainer}>
                  <Text style={styles.syncToggleLabel}>{t.finance?.autoSyncHarvest || 'Auto-sync Harvest'}</Text>
                  <Text style={styles.syncToggleSubtext}>{t.finance?.autoSyncHarvestSubtext || 'Automatically add harvest sales to revenue'}</Text>
                </View>
              </View>
              <Switch value={harvestSyncEnabled} onValueChange={setHarvestSyncEnabled}
                trackColor={{ false: '#ECF0F1', true: '#27AE60' }} thumbColor={harvestSyncEnabled ? '#FFFFFF' : '#BDC3C7'} />
            </View>

            <Text style={styles.ledgerTitle}>{t.finance?.revenueLedger || 'Revenue Ledger'}</Text>
            {getFilteredRevenues().length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={64} color="#BDC3C7" />
                <Text style={styles.emptyStateText}>{t.finance?.noRevenues || 'No revenues found'}</Text>
                <Text style={styles.emptyStateSubtext}>{t.finance?.addFirstRevenue || 'Add your first revenue to get started'}</Text>
              </View>
            ) : (
              <FlatList
                data={getFilteredRevenues()}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => renderLedgerItem(item, 'revenue')}
              />
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => { resetForm(); setShowForm(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formType === 'expense'
                  ? (editingExpense ? t.finance?.editExpense || 'Edit Expense' : t.finance?.addExpense || 'Add Expense')
                  : (editingRevenue ? t.finance?.editRevenue || 'Edit Revenue' : t.finance?.addRevenue || 'Add Revenue')}
              </Text>
              <TouchableOpacity onPress={() => { resetForm(); setShowForm(false); }}>
                <Ionicons name="close" size={28} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <AppDatePicker
                  label={`Date ${t.finance?.required || '*'}`}
                  value={formData.date}
                  maximumDate={new Date()}
                  onChange={(date) => setFormData((current) => ({
                    ...current,
                    date: getFarmDateKey(date, company?.timeZone),
                  }))}
                  cancelLabel={t.actions.cancel}
                  confirmLabel={t.actions.confirm}
                />
              </View>

              <View style={styles.formGroup}>
                <CycleSelector
                  label={t.financeCycle.allocateToCycle}
                  value={formData.cycleId}
                  options={formCycleOptions}
                  onChange={(cycleId) => setFormData((current) => ({ ...current, cycleId }))}
                  placeholder={t.financeCycle.selectCycle}
                  sheetEyebrow={t.financeCycle.cycle}
                  sheetTitle={t.financeCycle.selectCycle}
                />
                {formType === 'expense' && selectedFormCycle ? (
                  <Text style={styles.allocationHint}>
                    {t.financeCycle.splitAcrossPonds
                      .replace('{{count}}', String(selectedFormCyclePonds.length))
                      .replace('{{cycleName}}', selectedFormCycle.cycleName)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t.financeCycle.category} {t.finance?.required || '*'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {(formType === 'expense' ? CATEGORIES : REVENUE_CATEGORIES).map(cat => (
                    <TouchableOpacity key={cat}
                      style={[styles.categoryOption, formData.category === cat && styles.categoryOptionActive]}
                      onPress={() => setFormData(prev => ({ ...prev, category: cat }))}>
                      <Text style={[styles.categoryOptionText, formData.category === cat && styles.categoryOptionTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t.finance?.itemDescription || 'Item/Description'} {t.finance?.required || '*'}</Text>
                <TextInput style={styles.formInput} value={formData.item}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, item: text }))}
                  placeholder={t.finance?.enterDescription || 'Enter description'} placeholderTextColor="#6b8aa0" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t.finance?.amountRp || 'Amount (Rp)'} {t.finance?.required || '*'}</Text>
                <TextInput style={styles.formInput} value={formData.amount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
                  placeholder="0" placeholderTextColor="#6b8aa0" keyboardType="numeric" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t.finance?.paymentType || 'Payment Type'} {t.finance?.required || '*'}</Text>
                <View style={styles.paymentOptions}>
                  {TRANSLATED_PAYMENT_TYPES.map(type => (
                    <TouchableOpacity key={type}
                      style={[styles.paymentOption, formData.paymentType === type && styles.paymentOptionActive]}
                      onPress={() => setFormData(prev => ({ ...prev, paymentType: type }))}>
                      <Text style={[styles.paymentOptionText, formData.paymentType === type && styles.paymentOptionTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t.finance?.referenceInvoice || 'Reference/Invoice #'}</Text>
                <TextInput style={styles.formInput} value={formData.reference}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, reference: text }))}
                  placeholder={t.finance?.optional || 'Optional'} placeholderTextColor="#6b8aa0" />
              </View>

              {formType === 'expense' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t.finance?.linkedInventory || 'Linked Inventory'}</Text>
                  <TextInput style={styles.formInput} value={formData.linkedInventory}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, linkedInventory: text }))}
                    placeholder={t.finance?.optional || 'Optional'} placeholderTextColor="#6b8aa0" />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput style={[styles.formInput, styles.formTextArea]} value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  placeholder={t.finance?.additionalNotes || 'Additional notes (optional)'} placeholderTextColor="#6b8aa0"
                  multiline numberOfLines={4} />
              </View>

              <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      {formType === 'expense'
                        ? (editingExpense ? t.finance?.updateExpense || 'Update Expense' : t.finance?.addExpense || 'Add Expense')
                        : (editingRevenue ? t.finance?.updateRevenue || 'Update Revenue' : t.finance?.addRevenue || 'Add Revenue')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  safeArea: { backgroundColor: '#dce8f2' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  loadingText: { marginTop: Platform.OS === 'android' ? 14 : 16, fontSize: Platform.OS === 'android' ? 14 : 15, color: '#7F8C8D', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'android' ? 18 : 20, paddingTop: Platform.OS === 'android' ? 14 : 16, paddingBottom: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#dce8f2', borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },
  headerButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 20 : 22, fontWeight: '700', color: '#2C3E50', flex: 1, textAlign: 'center', marginHorizontal: Platform.OS === 'android' ? 14 : 16 },
  headerActions: { flexDirection: 'row', gap: Platform.OS === 'android' ? 10 : 12 },
  addButtonIcon: { padding: 4 },
  syncToggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 14 : 16, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  syncToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 10 : 12, flex: 1 },
  syncToggleTextContainer: { flex: 1 },
  syncToggleLabel: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#2C3E50', marginBottom: 2 },
  syncToggleSubtext: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#7F8C8D' },
  content: { flex: 1 },
  periodContainer: { flexDirection: 'row', marginHorizontal: Platform.OS === 'android' ? 18 : 20, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: 4, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  datePeriodContainer: { marginTop: Platform.OS === 'android' ? 12 : 14, marginBottom: 6 },
  periodTab: { flex: 1, paddingVertical: Platform.OS === 'android' ? 9 : 10, alignItems: 'center', justifyContent: 'center', borderRadius: Platform.OS === 'android' ? 7 : 8 },
  periodTabActive: { backgroundColor: '#3498DB' },
  periodTabText: { fontSize: Platform.OS === 'android' ? 13 : 14, lineHeight: Platform.OS === 'android' ? 17 : 19, fontWeight: '600', color: '#7F8C8D', textAlign: 'center' },
  periodTabTextActive: { color: '#FFFFFF' },
  cycleFilterContainer: { marginHorizontal: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 12 : 14 },
  summaryContainer: { marginHorizontal: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 18 : 20, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 18 : 20, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 10 : 12 },
  summaryRowLabel: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRowAmount: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: '#ECF0F1' },
  tabContainer: { flexDirection: 'row', marginHorizontal: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 18 : 20, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: 4, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 7 : 8, gap: Platform.OS === 'android' ? 5 : 6 },
  tabActive: { backgroundColor: '#EBF5FB' },
  tabText: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#95A5A6' },
  tabTextActive: { color: '#3498DB' },
  chartCard: { marginHorizontal: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 14 : 16, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 18 : 20, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  chartTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  monthlyCardsScroll: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  monthlyCardsContainer: { flexDirection: 'row', gap: Platform.OS === 'android' ? 10 : 12, paddingRight: Platform.OS === 'android' ? 18 : 20 },
  monthCard: { width: Platform.OS === 'android' ? 260 : 280, backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#ECF0F1' },
  monthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  monthCardMonth: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: '700', color: '#2C3E50' },
  monthCardBody: { gap: Platform.OS === 'android' ? 10 : 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 7 : 8 },
  amountDot: { width: Platform.OS === 'android' ? 7 : 8, height: Platform.OS === 'android' ? 7 : 8, borderRadius: 4 },
  amountLabelText: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#7F8C8D', fontWeight: '500' },
  amountValue: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#2C3E50' },
  dividerLine: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 7 : 8 },
  profitLabel: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700', color: '#2C3E50' },
  profitValue: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: '700' },
  profitPositive: { color: '#27AE60' },
  profitNegative: { color: '#E74C3C' },
  monthCardFooter: { marginTop: Platform.OS === 'android' ? 14 : 16, gap: Platform.OS === 'android' ? 7 : 8 },
  progressBar: { height: Platform.OS === 'android' ? 5 : 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: Platform.OS === 'android' ? 10 : 11, color: '#95A5A6', fontWeight: '500' },
  performanceSummary: { flexDirection: 'row', backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, marginTop: 4 },
  summaryMetric: { flex: 1, alignItems: 'center', gap: Platform.OS === 'android' ? 7 : 8 },
  summaryMetricLabel: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#7F8C8D', fontWeight: '500' },
  summaryMetricValue: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700', color: '#2C3E50', textAlign: 'center' },
  summaryDividerVertical: { width: 1, backgroundColor: '#E0E0E0', marginHorizontal: Platform.OS === 'android' ? 14 : 16 },
  emptyChart: { alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 35 : 40 },
  emptyChartText: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#BDC3C7', marginTop: Platform.OS === 'android' ? 10 : 12, fontWeight: '500' },
  legend: { marginTop: Platform.OS === 'android' ? 14 : 16, gap: Platform.OS === 'android' ? 7 : 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 9 : 10 },
  legendDot: { width: Platform.OS === 'android' ? 10 : 12, height: Platform.OS === 'android' ? 10 : 12, borderRadius: 6 },
  legendLabel: { flex: 1, fontSize: Platform.OS === 'android' ? 12 : 13, color: '#34495E', fontWeight: '500' },
  legendValue: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#7F8C8D', fontWeight: '600' },
  sectionCard: { marginHorizontal: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 14 : 16, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 18 : 20, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  topItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 9 : 10 },
  topRank: { width: Platform.OS === 'android' ? 30 : 32, height: Platform.OS === 'android' ? 30 : 32, borderRadius: 16, backgroundColor: '#3498DB', justifyContent: 'center', alignItems: 'center', marginRight: Platform.OS === 'android' ? 10 : 12 },
  topRankText: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700', color: '#FFFFFF' },
  topInfo: { flex: 1 },
  topName: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#2C3E50', marginBottom: 2 },
  topCategory: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#7F8C8D' },
  topAmount: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700', color: '#3498DB' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  breakdownCategory: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#34495E', width: Platform.OS === 'android' ? 95 : 100 },
  breakdownRight: { flex: 1, gap: 4 },
  breakdownBar: { height: Platform.OS === 'android' ? 5 : 6, backgroundColor: '#ECF0F1', borderRadius: 3, overflow: 'hidden' },
  breakdownFill: { height: '100%', borderRadius: 3 },
  breakdownAmount: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#7F8C8D', fontWeight: '600', textAlign: 'right' },
  ledgerSection: { paddingHorizontal: Platform.OS === 'android' ? 18 : 20, paddingBottom: Platform.OS === 'android' ? 28 : 32 },
  ledgerHeader: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  ledgerTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700', color: '#2C3E50', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  filterScroll: { marginTop: Platform.OS === 'android' ? 7 : 8 },
  filterPill: { paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 18 : 20, marginRight: Platform.OS === 'android' ? 7 : 8, borderWidth: 1, borderColor: '#ECF0F1' },
  filterPillActive: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  filterPillText: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#7F8C8D' },
  filterPillTextActive: { color: '#FFFFFF' },
  ledgerItem: { backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 10 : 12, shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  ledgerLeft: { flex: 1, marginRight: Platform.OS === 'android' ? 10 : 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Platform.OS === 'android' ? 5 : 6 },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: Platform.OS === 'android' ? 9 : 10, paddingVertical: 4, borderRadius: Platform.OS === 'android' ? 5 : 6 },
  expensePill: { backgroundColor: '#FADBD8' },
  revenuePill: { backgroundColor: '#D5F4E6' },
  categoryPillText: { fontSize: Platform.OS === 'android' ? 9 : 10, fontWeight: '700', color: '#2C3E50', textTransform: 'uppercase', letterSpacing: 0.5 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D5F4E6', paddingHorizontal: Platform.OS === 'android' ? 7 : 8, paddingVertical: 3, borderRadius: Platform.OS === 'android' ? 5 : 6, borderWidth: 1, borderColor: '#27AE60' },
  syncBadgeText: { fontSize: Platform.OS === 'android' ? 8 : 9, fontWeight: '700', color: '#27AE60', textTransform: 'uppercase' },
  ledgerItemName: { fontSize: Platform.OS === 'android' ? 14 : 15, fontWeight: '600', color: '#2C3E50', width: '100%', marginTop: 4 },
  ledgerAmount: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: '700' },
  expenseColor: { color: '#E74C3C' },
  revenueColor: { color: '#27AE60' },
  ledgerMeta: { flexDirection: 'row', gap: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 7 : 8, marginTop: Platform.OS === 'android' ? 7 : 8 },
  ledgerMetaText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#95A5A6', fontWeight: '500' },
  ledgerReference: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#7F8C8D', fontStyle: 'italic', marginBottom: 4 },
  ledgerNotes: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#34495E', lineHeight: Platform.OS === 'android' ? 16 : 18, marginBottom: Platform.OS === 'android' ? 7 : 8 },
  ledgerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 7 : 8, paddingTop: Platform.OS === 'android' ? 10 : 12, borderTopWidth: 1, borderTopColor: '#ECF0F1' },
  ledgerAddedBy: { fontSize: Platform.OS === 'android' ? 10 : 11, color: '#95A5A6', fontWeight: '500' },
  ledgerActions: { flexDirection: 'row', gap: Platform.OS === 'android' ? 10 : 12 },
  iconButton: { padding: Platform.OS === 'android' ? 5 : 6 },
  iconButtonDisabled: { opacity: 0.3 },
  emptyState: { alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 50 : 60 },
  emptyStateText: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#7F8C8D', marginTop: Platform.OS === 'android' ? 14 : 16 },
  emptyStateSubtext: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#BDC3C7', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(44, 62, 80, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24, borderTopRightRadius: Platform.OS === 'android' ? 20 : 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Platform.OS === 'android' ? 18 : 20, paddingVertical: Platform.OS === 'android' ? 15 : 16, borderBottomWidth: 1, borderBottomColor: '#ECF0F1' },
  modalTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: '700', color: '#2C3E50' },
  formContent: { paddingHorizontal: Platform.OS === 'android' ? 18 : 20, paddingTop: Platform.OS === 'android' ? 15 : 16 },
  formGroup: { marginBottom: Platform.OS === 'android' ? 13 : 14 },
  formLabel: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#34495E', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: '#F8FAFB', borderWidth: 1, borderColor: '#ECF0F1', borderRadius: Platform.OS === 'android' ? 9 : 10, paddingHorizontal: Platform.OS === 'android' ? 12 : 13, paddingVertical: Platform.OS === 'android' ? 10 : 11, fontSize: Platform.OS === 'android' ? 14 : 15, color: '#2C3E50' },
  formTextArea: { height: Platform.OS === 'android' ? 90 : 100, textAlignVertical: 'top' },
  categoryScroll: { marginTop: 0 },
  categoryOption: { paddingHorizontal: Platform.OS === 'android' ? 13 : 14, paddingVertical: Platform.OS === 'android' ? 8 : 9, backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 9 : 10, marginRight: Platform.OS === 'android' ? 7 : 8, borderWidth: 1, borderColor: '#ECF0F1' },
  categoryOptionActive: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  categoryOptionText: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#7F8C8D' },
  categoryOptionTextActive: { color: '#FFFFFF' },
  allocationHint: { marginTop: 7, color: '#60798A', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  paymentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentOption: { flex: 1, flexBasis: 0, minWidth: 0, minHeight: Platform.OS === 'android' ? 44 : 48, paddingHorizontal: 4, paddingVertical: Platform.OS === 'android' ? 8 : 9, backgroundColor: '#F8FAFB', borderRadius: Platform.OS === 'android' ? 9 : 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECF0F1' },
  paymentOptionActive: { backgroundColor: '#3498DB', borderColor: '#3498DB' },
  paymentOptionText: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#7F8C8D', textAlign: 'center' },
  paymentOptionTextActive: { color: '#FFFFFF' },
  submitButton: { flexDirection: 'row', backgroundColor: '#3498DB', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: Platform.OS === 'android' ? 10 : 12, alignItems: 'center', justifyContent: 'center', marginTop: Platform.OS === 'android' ? 7 : 8, marginBottom: Platform.OS === 'android' ? 28 : 32, gap: Platform.OS === 'android' ? 7 : 8, shadowColor: '#3498DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '700' },
});
