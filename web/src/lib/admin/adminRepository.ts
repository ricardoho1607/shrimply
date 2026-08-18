import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import {
  clearFirestoreAdminCache,
  deleteFirestoreUser,
  getFirestoreAccount,
  getFirestoreOverviewMetrics,
  searchFirestoreAccounts,
} from './firestoreAdminAdapter';
import type {
  AccountIntelligence,
  AdminDirectoryFilters,
  AdminDirectoryResponse,
  DeleteAdminUserInput,
  DeleteAdminUserResult,
  PlatformOverviewMetrics,
} from './types';

const functions = getFunctions(app);

export interface DirectoryQuery {
  search: string;
  filters: AdminDirectoryFilters;
  page: number;
  pageSize: number;
}

export interface AdminIntelligenceRepository {
  searchAccounts(query: DirectoryQuery): Promise<AdminDirectoryResponse>;
  getAccount(userId: string): Promise<AccountIntelligence>;
  getOverviewMetrics(periodDays?: 7 | 30): Promise<PlatformOverviewMetrics>;
  deleteUser(input: DeleteAdminUserInput): Promise<DeleteAdminUserResult>;
  invalidateCache(): void;
}

class FirebaseAdminIntelligenceRepository implements AdminIntelligenceRepository {
  private directoryCallableAvailable = process.env.NODE_ENV === 'production';

  async searchAccounts(queryInput: DirectoryQuery) {
    if (!this.directoryCallableAvailable) return searchFirestoreAccounts(queryInput);
    try {
      const callable = httpsCallable<DirectoryQuery, AdminDirectoryResponse>(functions, 'searchAdminAccounts');
      return (await callable(queryInput)).data;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Secure owner directory search is unavailable. Deploy the audited admin callable before using this console.', { cause: error });
      }
      this.directoryCallableAvailable = false;
      return searchFirestoreAccounts(queryInput);
    }
  }

  async getAccount(userId: string) {
    if (process.env.NODE_ENV !== 'production') return getFirestoreAccount(userId);
    try {
      const callable = httpsCallable<{ userId: string }, AccountIntelligence>(functions, 'getAdminAccountIntelligence');
      return (await callable({ userId })).data;
    } catch {
      throw new Error('Secure owner account details are unavailable until the audited admin callable is deployed.');
    }
  }

  async getOverviewMetrics(periodDays: 7 | 30 = 7) {
    try {
      const callable = httpsCallable<{ days: number }, PlatformOverviewMetrics>(functions, 'getAdminMetrics');
      const res = await callable({ days: periodDays });
      if (res?.data && res.data.totals && Array.isArray(res.data.users) && Array.isArray(res.data.triage)) return res.data;
    } catch (err) {
      console.warn('Overview callable unavailable, using direct Firestore adapter:', err);
    }
    return getFirestoreOverviewMetrics(periodDays);
  }

  async deleteUser(input: DeleteAdminUserInput): Promise<DeleteAdminUserResult> {
    try {
      const callable = httpsCallable<DeleteAdminUserInput, DeleteAdminUserResult>(functions, 'deleteAdminUser');
      const res = await callable(input);
      if (res?.data?.success) {
        clearFirestoreAdminCache();
        return res.data;
      }
    } catch (err) {
      console.warn('deleteAdminUser callable unavailable, executing direct Firestore user deletion adapter:', err);
    }
    return deleteFirestoreUser(input);
  }

  invalidateCache() {
    clearFirestoreAdminCache();
  }
}

export const createAdminIntelligenceRepository = (): AdminIntelligenceRepository => new FirebaseAdminIntelligenceRepository();
