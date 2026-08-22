interface CollectionSnapshotState {
  fromCache: boolean;
  incomingCount: number;
  currentCount: number;
}

interface NetworkState {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}

export const shouldApplyRemoteCollectionSnapshot = ({
  fromCache,
  incomingCount,
  currentCount,
}: CollectionSnapshotState): boolean => !(
  fromCache
  && incomingCount === 0
  && currentCount > 0
);

export const isUsableNetworkState = ({
  isConnected,
  isInternetReachable,
}: NetworkState): boolean => isConnected === true && isInternetReachable !== false;

export const getOfflineRetryDelay = (attempt: number): number => {
  const safeAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  return Math.min(1000 * (2 ** safeAttempt), 30000);
};
