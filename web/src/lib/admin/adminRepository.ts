import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { clearFirestoreAdminCache, getFirestoreAccount, searchFirestoreAccounts } from './firestoreAdminAdapter';
import type {
  AccountIntelligence,
  AdminDirectoryFilters,
  AdminDirectoryResponse,
  DeleteAdminUserInput,
  DeleteAdminUserResult,
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
    } catch {
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

  async deleteUser(input: DeleteAdminUserInput) {
    const callable = httpsCallable<DeleteAdminUserInput, DeleteAdminUserResult>(functions, 'deleteAdminUser');
    return (await callable(input)).data;
  }

  invalidateCache() {
    clearFirestoreAdminCache();
  }
}

export const createAdminIntelligenceRepository = (): AdminIntelligenceRepository => new FirebaseAdminIntelligenceRepository();
