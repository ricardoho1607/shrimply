import type { useAuth } from '@/context/AuthContext';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  type PendingFarmChange
} from '../../../shared/offlineWorkspace';
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync?: Date;
  pendingChanges: number;
  error?: string;
}

export type PendingChange = PendingFarmChange;
export type SyncIdentity = Pick<ReturnType<typeof useAuth>, 'user' | 'company'> & {
  activeCompanyId: string | undefined;
  activeUserId: string | undefined;
};
export type SyncRuntime = SyncIdentity & {
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  isOnlineRef: RefObject<boolean>;
  syncPendingChangesRef: RefObject<() => void>;
};
export type CommitContext = {
  activeCompanyId: string;
  user: NonNullable<SyncIdentity['user']>;
  company: SyncIdentity['company'];
};
export type CommitResult = { processedIds: string[]; committedLegacyPonds: Record<string, Record<string, any>> };
