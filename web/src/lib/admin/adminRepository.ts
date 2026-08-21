import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import {
  clearFirestoreAdminCache,
  deleteFirestoreUser,
  getFirestoreAccount,
  getFirestoreAuditLogs,
  getFirestoreDetailedFarms,
  getFirestoreFarmBusinessSize,
  getFirestoreUserPermissionState,
  getFirestoreOverviewMetrics,
  getFirestoreSecurityPosture,
  getFirestoreSupportData,
  resolveFirestoreDiseaseReport,
  searchFirestoreAccounts,
  updateFirestoreTesterStatus,
  updateFirestoreFarmBusinessSize,
  updateFirestoreUserPermissions,
} from './firestoreAdminAdapter';
import type {
  AccountIntelligence,
  AdminAuditEvent,
  AdminDirectoryFilters,
  AdminDirectoryResponse,
  AuditLogFilters,
  DeleteAdminUserInput,
  DeleteAdminUserResult,
  DetailedFarm,
  FarmBusinessSize,
  PlatformOverviewMetrics,
  SecurityPostureData,
  SupportOverviewData,
} from './types';
import type { FarmPermissionOverrides } from '../../../../shared/permissions';

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
  updateFarmBusinessSize(input: { userId: string; companyId: string; businessSize: FarmBusinessSize }): Promise<FarmBusinessSize>;
  updateUserPermissions(input: { userId: string; permissionOverrides: FarmPermissionOverrides }): Promise<void>;
  getOverviewMetrics(periodDays?: 7 | 30): Promise<PlatformOverviewMetrics>;
  deleteUser(input: DeleteAdminUserInput): Promise<DeleteAdminUserResult>;
  getDetailedFarms(): Promise<DetailedFarm[]>;
  getSupportData(): Promise<SupportOverviewData>;
  updateTesterStatus(requestId: string, status: string): Promise<boolean>;
  resolveDiseaseReport(reportId: string, resolutionNote?: string): Promise<boolean>;
  getSecurityPosture(): Promise<SecurityPostureData>;
  getAuditLogs(filters?: AuditLogFilters): Promise<AdminAuditEvent[]>;
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
      const account = (await callable({ userId })).data;
      account.farms = await Promise.all(account.farms.map(async (farm) => ({
        ...farm,
        businessSize: await getFirestoreFarmBusinessSize(farm.id),
      })));
      const permissionState = await getFirestoreUserPermissionState(userId);
      account.role = permissionState.role;
      account.permissionOverrides = permissionState.permissionOverrides;
      account.effectivePermissions = permissionState.effectivePermissions;
      account.isCompanyOwner = permissionState.isCompanyOwner;
      return account;
    } catch {
      throw new Error('Secure owner account details are unavailable until the audited admin callable is deployed.');
    }
  }

  async updateFarmBusinessSize(input: { userId: string; companyId: string; businessSize: FarmBusinessSize }) {
    return updateFirestoreFarmBusinessSize(input);
  }

  async updateUserPermissions(input: { userId: string; permissionOverrides: FarmPermissionOverrides }) {
    return updateFirestoreUserPermissions(input);
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

  async getDetailedFarms(): Promise<DetailedFarm[]> {
    return getFirestoreDetailedFarms();
  }

  async getSupportData(): Promise<SupportOverviewData> {
    return getFirestoreSupportData();
  }

  async updateTesterStatus(requestId: string, status: string): Promise<boolean> {
    return updateFirestoreTesterStatus(requestId, status);
  }

  async resolveDiseaseReport(reportId: string, resolutionNote?: string): Promise<boolean> {
    return resolveFirestoreDiseaseReport(reportId, resolutionNote);
  }

  async getSecurityPosture(): Promise<SecurityPostureData> {
    return getFirestoreSecurityPosture();
  }

  async getAuditLogs(filters?: AuditLogFilters): Promise<AdminAuditEvent[]> {
    return getFirestoreAuditLogs(filters);
  }

  invalidateCache() {
    clearFirestoreAdminCache();
  }
}

export const createAdminIntelligenceRepository = (): AdminIntelligenceRepository => new FirebaseAdminIntelligenceRepository();
