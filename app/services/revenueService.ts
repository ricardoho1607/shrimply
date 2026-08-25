// services/revenueService.ts
import { normalizeCategory } from '../utils/categoryNormalizer';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import {
  createOfflineOperationId,
  isWorkspaceOnline,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistCollectionAfterMutation,
  persistOfflineCollection,
} from './offlineWorkspace';

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

  private requireUserId(): string {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('No authenticated user');
    return userId;
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
      const revenueRef = doc(this.getRevenuesCollection(companyId));
      const newRevenue: Revenue = {
        id: revenueRef.id,
        ...revenueData,
        companyId,
        addedBy: userId,
        addedByName: userName,
        timestamp: Date.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await persistCollectionAfterMutation<Revenue>({
        id: createOfflineOperationId(`revenue-create-${revenueRef.id}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', companyId, 'revenues', revenueRef.id],
        data: newRevenue as unknown as Record<string, unknown>,
        merge: false,
        createOnly: true,
        serverTimestampFields: ['createdAt', 'updatedAt'],
      }, 'finance-revenues', ['companies', companyId, 'revenues']);
      return revenueRef.id;
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
    const revenue: Revenue = {
      id: documentId,
      ...revenueData,
      companyId,
      addedBy: userId,
      addedByName: userName,
      timestamp: Date.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await persistCollectionAfterMutation<Revenue>({
      id: createOfflineOperationId(`revenue-upsert-${documentId}`),
      userId,
      companyId,
      createdAt: Date.now(),
      kind: 'set',
      path: ['companies', companyId, 'revenues', documentId],
      data: revenue as unknown as Record<string, unknown>,
      merge: true,
      serverTimestampFields: ['createdAt', 'updatedAt'],
    }, 'finance-revenues', ['companies', companyId, 'revenues']);
    return documentId;
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
      const userId = this.requireUserId();
      await persistCollectionAfterMutation<Revenue>({
        id: createOfflineOperationId(`revenue-update-${revenueId}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'set',
        path: ['companies', companyId, 'revenues', revenueId],
        data: { ...revenueData, id: revenueId, updatedAt: Timestamp.now() },
        merge: true,
        serverTimestampFields: ['updatedAt'],
      }, 'finance-revenues', ['companies', companyId, 'revenues']);
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
      const userId = this.requireUserId();
      await persistCollectionAfterMutation<Revenue>({
        id: createOfflineOperationId(`revenue-delete-${revenueId}`),
        userId,
        companyId,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['companies', companyId, 'revenues', revenueId],
      }, 'finance-revenues', ['companies', companyId, 'revenues']);
    } catch (error) {
      console.error('Error deleting revenue:', error);
      throw new Error('Failed to delete revenue');
    }
  }

  /**
   * Get all revenues for a company
   */
  async getRevenues(companyId: string): Promise<Revenue[]> {
    const userId = this.requireUserId();
    const cached = await loadOfflineCollectionWithMutations<Revenue>(
      userId,
      companyId,
      'finance-revenues',
      ['companies', companyId, 'revenues'],
    );
    if (!await isWorkspaceOnline()) return cached.sort((a, b) => b.timestamp - a.timestamp);
    try {
      const revenuesRef = this.getRevenuesCollection(companyId);
      const q = query(revenuesRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      
      const remote = querySnapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<Revenue, 'id'>),
      })) as Revenue[];
      const merged = await overlayOfflineMutations(remote, userId, companyId, ['companies', companyId, 'revenues']);
      await persistOfflineCollection(userId, companyId, 'finance-revenues', merged);
      return merged;
    } catch (error) {
      console.error('Error getting revenues:', error);
      return cached;
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
    return (await this.getRevenues(companyId))
      .filter((revenue) => revenue.date >= startDate && revenue.date <= endDate)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get revenues by category
   */
  async getRevenuesByCategory(
    companyId: string, 
    category: string
  ): Promise<Revenue[]> {
    return (await this.getRevenues(companyId)).filter((revenue) => revenue.category === category);
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
