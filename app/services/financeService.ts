import { isSourceLinkedFinance, sumMoney, monetaryValue, appendSettlement } from '../../shared/financeIntegrity';
// services/financeService.ts
import { normalizeCategory } from '../utils/categoryNormalizer';
import { 
  onSnapshot,
  getDoc,
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import type { PondCostAllocation } from '../../shared/financeCycleAllocation';
import type { ExpenseAllocationMethod } from '../../shared/financeExpenseAllocation';
import {
  createOfflineOperationId,
  isWorkspaceOnline,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistCollectionAfterMutation,
  persistOfflineCollection,
} from './offlineWorkspace';

export interface Expense {
  id: string;
  voided?: boolean;
  settlements?: { id: string; date: string; amount: number }[];
  companyId: string;
  date: string;
  category: string;
  item: string;
  amount: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  pondId?: string;
  allocationMethod?: ExpenseAllocationMethod | null;
  allocationBasisTotal?: number | null;
  allocationRate?: number | null;
  allocationCurrencyCode?: string | null;
  allocationDecimalPlaces?: number | null;
  pondAllocations?: PondCostAllocation[];
  paymentType: string;
  reference: string;
  linkedInventory?: string;
  notes: string;
  addedBy: string;
  addedByName: string;
  timestamp: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ExpenseInput {
  date: string;
  category: string;
  item: string;
  amount: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  pondId?: string;
  allocationMethod?: ExpenseAllocationMethod | null;
  allocationBasisTotal?: number | null;
  allocationRate?: number | null;
  allocationCurrencyCode?: string | null;
  allocationDecimalPlaces?: number | null;
  pondAllocations?: PondCostAllocation[];
  paymentType: string;
  reference: string;
  linkedInventory?: string;
  notes: string;
}

class FinanceService {
  private getExpensesCollection(companyId: string) {
    return collection(db, 'companies', companyId, 'expenses');
  }

  private requireUserId(): string {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    return userId;
  }

  /**
   * Add a new expense
   */
  async addExpense(
    companyId: string, 
    expenseData: ExpenseInput, 
    userId: string, 
    userName: string,
    recordId?: string
  ): Promise<string> {
    try {
      const expenseRef = recordId ? doc(this.getExpensesCollection(companyId), recordId) : doc(this.getExpensesCollection(companyId));
      const newExpense: Expense = {
        id: expenseRef.id,
        ...expenseData,
        companyId,
        addedBy: userId,
        addedByName: userName,
        timestamp: Date.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await persistCollectionAfterMutation<Expense>({
        id: createOfflineOperationId(`expense-create-${expenseRef.id}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', companyId, 'expenses', expenseRef.id],
        data: newExpense as unknown as Record<string, unknown>,
        merge: false,
        createOnly: true,
        serverTimestampFields: ['createdAt', 'updatedAt'],
      }, 'finance-expenses', ['companies', companyId, 'expenses']);
      return expenseRef.id;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw new Error('Failed to add expense');
    }
  }

  async upsertSyncedExpense(
    companyId: string,
    documentId: string,
    expenseData: ExpenseInput,
    userId: string,
    userName: string
  ): Promise<string> {
    const expense: Expense = {
      id: documentId,
      ...expenseData,
      companyId,
      addedBy: userId,
      addedByName: userName,
      timestamp: Date.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await persistCollectionAfterMutation<Expense>({
      id: createOfflineOperationId(`expense-upsert-${documentId}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'set',
      path: ['companies', companyId, 'expenses', documentId],
      data: expense as unknown as Record<string, unknown>,
      merge: true,
      serverTimestampFields: ['createdAt', 'updatedAt'],
    }, 'finance-expenses', ['companies', companyId, 'expenses']);
    return documentId;
  }

  /**
   * Update an existing expense
   */
  async updateExpense(
    companyId: string, 
    expenseId: string, 
    expenseData: Partial<ExpenseInput>
  ): Promise<void> {
    try {
      const userId = this.requireUserId();
      await persistCollectionAfterMutation<Expense>({
        id: createOfflineOperationId(`expense-update-${expenseId}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', companyId, 'expenses', expenseId],
        data: { ...expenseData, id: expenseId, updatedAt: Timestamp.now() },
        merge: true,
        serverTimestampFields: ['updatedAt'],
      }, 'finance-expenses', ['companies', companyId, 'expenses']);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw new Error('Failed to update expense');
    }
  }

  /**
   * Delete an expense
   */
  async deleteExpense(companyId: string, expenseId: string): Promise<void> {
    if (expenseId.startsWith('sync_')) throw new Error('Linked finance entries must be corrected at their source.');
    const existing = await getDoc(doc(this.getExpensesCollection(companyId), expenseId));
    if (existing.exists() && isSourceLinkedFinance(existing.data())) throw new Error('Linked finance entries must be corrected at their source.');
    try {
      const userId = this.requireUserId();
      await persistCollectionAfterMutation<Expense>({
        id: createOfflineOperationId(`expense-delete-${expenseId}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['companies', companyId, 'expenses', expenseId],
      }, 'finance-expenses', ['companies', companyId, 'expenses']);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error('Failed to delete expense');
    }
  }

  /**
   * Get all expenses for a company
   */
  async recordPayment(companyId: string, record: Expense, payment: { id: string; date: string; amount: number }) {
    const settlements = appendSettlement(record, payment);
    await persistCollectionAfterMutation<Expense>({
      id: payment.id, userId: this.requireUserId(), companyId, createdAt: Date.now(), kind: 'set',
      path: ['companies', companyId, 'expenses', record.id], data: { settlements }, merge: true, settlement: payment,
    }, 'finance-expenses', ['companies', companyId, 'expenses']);
  }

  subscribe(companyId: string, onData: (records: Expense[]) => void, onError: (error: Error) => void, includeVoided = false) {
    return onSnapshot(this.getExpensesCollection(companyId), snapshot => {
      const records = snapshot.docs.map(row => ({ ...row.data(), id: row.id, amount: monetaryValue(row.data().amount) ?? Number.NaN } as Expense)).filter(row => includeVoided || !row.voided);
      onData(records.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)));
    }, onError);
  }

  async getExpenses(companyId: string, includeVoided = false): Promise<Expense[]> {
    const userId = this.requireUserId();
    const cached = await loadOfflineCollectionWithMutations<Expense>(
      userId,
      companyId,
      'finance-expenses',
      ['companies', companyId, 'expenses'],
    );
    if (!await isWorkspaceOnline()) return cached.filter(row => includeVoided || !row.voided).map(row => ({ ...row, amount: monetaryValue(row.amount) ?? Number.NaN })).sort((a, b) => b.timestamp - a.timestamp);
    try {
      const expensesRef = this.getExpensesCollection(companyId);
      const q = query(expensesRef);
      
      const querySnapshot = await getDocs(q);
      
      const remote = querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Expense, 'id'>),
      })) as Expense[];
      const merged = await overlayOfflineMutations(remote, userId, companyId, ['companies', companyId, 'expenses']);
      await persistOfflineCollection(userId, companyId, 'finance-expenses', merged);
      return merged.filter(row => includeVoided || !row.voided).map(row => ({ ...row, amount: monetaryValue(row.amount) ?? Number.NaN }));
    } catch (error) {
      console.error('Error getting expenses:', error);
      return cached.filter(row => includeVoided || !row.voided).map(row => ({ ...row, amount: monetaryValue(row.amount) ?? Number.NaN }));
    }
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Expense[]> {
    return (await this.getExpenses(companyId))
      .filter((expense) => expense.date >= startDate && expense.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    companyId: string, 
    category: string
  ): Promise<Expense[]> {
    return (await this.getExpenses(companyId)).filter((expense) => expense.category === category);
  }

  /**
   * Calculate total expenses for a period
   */
  calculateTotal(expenses: Expense[]): number {
    return sumMoney(expenses);
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(expenses: Expense[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const key = normalizeCategory(expense.category);
      breakdown[key] = (breakdown[key] || 0) + expense.amount;
    });
    
    return breakdown;
  }

  /**
   * Get top expenses
   */
  getTopExpenses(expenses: Expense[], limit: number = 3): Expense[] {
    return [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }
}

export const financeService = new FinanceService();
export default financeService;
