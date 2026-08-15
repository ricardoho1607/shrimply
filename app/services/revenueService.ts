// services/revenueService.ts
import { normalizeCategory } from '../utils/categoryNormalizer';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
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

export interface Revenue {
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
  notes: string;
  addedBy: string;
  addedByName: string;
  timestamp: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface RevenueInput {
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
  notes: string;
}

class RevenueService {
  private getRevenuesCollection(companyId: string) {
    return collection(db, 'companies', companyId, 'revenues');
  }

  /**
   * Add a new revenue
   */
  async addRevenue(
    companyId: string, 
    revenueData: RevenueInput, 
    userId: string, 
    userName: string
  ): Promise<string> {
    try {
      const revenuesRef = this.getRevenuesCollection(companyId);
      
      const newRevenue: Record<string, any> = {
        ...revenueData,
        companyId,
        addedBy: userId,
        addedByName: userName,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(revenuesRef, newRevenue);
      return docRef.id;
    } catch (error) {
      console.error('Error adding revenue:', error);
      throw new Error('Failed to add revenue');
    }
  }

  async upsertSyncedRevenue(
    companyId: string,
    documentId: string,
    revenueData: RevenueInput,
    userId: string,
    userName: string
  ): Promise<string> {
    const revenueRef = doc(db, 'companies', companyId, 'revenues', documentId);
    await setDoc(revenueRef, {
      ...revenueData,
      companyId,
      addedBy: userId,
      addedByName: userName,
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return revenueRef.id;
  }

  /**
   * Update an existing revenue
   */
  async updateRevenue(
    companyId: string, 
    revenueId: string, 
    revenueData: Partial<RevenueInput>
  ): Promise<void> {
    try {
      const revenueRef = doc(db, 'companies', companyId, 'revenues', revenueId);
      
      const updateData: Record<string, any> = {
        ...revenueData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(revenueRef, updateData);
    } catch (error) {
      console.error('Error updating revenue:', error);
      throw new Error('Failed to update revenue');
    }
  }

  /**
   * Delete a revenue
   */
  async deleteRevenue(companyId: string, revenueId: string): Promise<void> {
    try {
      const revenueRef = doc(db, 'companies', companyId, 'revenues', revenueId);
      await deleteDoc(revenueRef);
    } catch (error) {
      console.error('Error deleting revenue:', error);
      throw new Error('Failed to delete revenue');
    }
  }

  /**
   * Get all revenues for a company
   */
  async getRevenues(companyId: string): Promise<Revenue[]> {
    try {
      const revenuesRef = this.getRevenuesCollection(companyId);
      const q = query(revenuesRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Revenue, 'id'>),
      })) as Revenue[];
    } catch (error) {
      console.error('Error getting revenues:', error);
      throw new Error('Failed to load revenues');
    }
  }

  /**
   * Get revenues by date range
   */
  async getRevenuesByDateRange(
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Revenue[]> {
    try {
      const revenuesRef = this.getRevenuesCollection(companyId);
      const q = query(
        revenuesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Revenue, 'id'>),
      })) as Revenue[];
    } catch (error) {
      console.error('Error getting revenues by date range:', error);
      throw new Error('Failed to load revenues');
    }
  }

  /**
   * Get revenues by category
   */
  async getRevenuesByCategory(
    companyId: string, 
    category: string
  ): Promise<Revenue[]> {
    try {
      const revenuesRef = this.getRevenuesCollection(companyId);
      const q = query(
        revenuesRef,
        where('category', '==', category),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Revenue, 'id'>),
      })) as Revenue[];
    } catch (error) {
      console.error('Error getting revenues by category:', error);
      throw new Error('Failed to load revenues');
    }
  }

  /**
   * Calculate total revenues for a period
   */
  calculateTotal(revenues: Revenue[]): number {
    return revenues.reduce((sum, revenue) => sum + revenue.amount, 0);
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(revenues: Revenue[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    revenues.forEach(revenue => {
      const key = normalizeCategory(revenue.category);
      breakdown[key] = (breakdown[key] || 0) + revenue.amount;
    });
    
    return breakdown;
  }

  /**
   * Get top revenues
   */
  getTopRevenues(revenues: Revenue[], limit: number = 3): Revenue[] {
    return [...revenues]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }
}

export const revenueService = new RevenueService();
export default revenueService;
