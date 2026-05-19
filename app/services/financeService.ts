// services/financeService.ts
import { normalizeCategory } from '../utils/categoryNormalizer';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  DocumentData 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface Expense {
  id: string;
  companyId: string;
  date: string;
  category: string;
  item: string;
  amount: number;
  cycleId?: string;
  cycleName?: string;
  pondCycleId?: string;
  pondId?: string;
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
  paymentType: string;
  reference: string;
  linkedInventory?: string;
  notes: string;
}

class FinanceService {
  private getExpensesCollection(companyId: string) {
    return collection(db, 'companies', companyId, 'expenses');
  }

  /**
   * Add a new expense
   */
  async addExpense(
    companyId: string, 
    expenseData: ExpenseInput, 
    userId: string, 
    userName: string
  ): Promise<string> {
    try {
      const expensesRef = this.getExpensesCollection(companyId);
      
      const newExpense: Record<string, any> = {
        ...expenseData,
        companyId,
        addedBy: userId,
        addedByName: userName,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(expensesRef, newExpense);
      return docRef.id;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw new Error('Failed to add expense');
    }
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
      const expenseRef = doc(db, 'companies', companyId, 'expenses', expenseId);
      
      const updateData: Record<string, any> = {
        ...expenseData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(expenseRef, updateData);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw new Error('Failed to update expense');
    }
  }

  /**
   * Delete an expense
   */
  async deleteExpense(companyId: string, expenseId: string): Promise<void> {
    try {
      const expenseRef = doc(db, 'companies', companyId, 'expenses', expenseId);
      await deleteDoc(expenseRef);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw new Error('Failed to delete expense');
    }
  }

  /**
   * Get all expenses for a company
   */
  async getExpenses(companyId: string): Promise<Expense[]> {
    try {
      const expensesRef = this.getExpensesCollection(companyId);
      const q = query(expensesRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Expense, 'id'>),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw new Error('Failed to load expenses');
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
    try {
      const expensesRef = this.getExpensesCollection(companyId);
      const q = query(
        expensesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Expense, 'id'>),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses by date range:', error);
      throw new Error('Failed to load expenses');
    }
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    companyId: string, 
    category: string
  ): Promise<Expense[]> {
    try {
      const expensesRef = this.getExpensesCollection(companyId);
      const q = query(
        expensesRef,
        where('category', '==', category),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Expense, 'id'>),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting expenses by category:', error);
      throw new Error('Failed to load expenses');
    }
  }

  /**
   * Calculate total expenses for a period
   */
  calculateTotal(expenses: Expense[]): number {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
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
