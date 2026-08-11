export type FirebaseSyncUnsubscribe = () => void;

export interface FirebaseSyncListenerOwner {
  getActiveCompanyId: () => string | null;
  start: (
    companyId: string,
    attachListeners: () => FirebaseSyncUnsubscribe[],
  ) => boolean;
  stop: (expectedCompanyId?: string) => boolean;
}

export const createFirebaseSyncListenerOwner = (): FirebaseSyncListenerOwner => {
  let activeCompanyId: string | null = null;
  let unsubscribeCallbacks: FirebaseSyncUnsubscribe[] = [];

  const stop = (expectedCompanyId?: string) => {
    if (expectedCompanyId && activeCompanyId !== expectedCompanyId) return false;
    if (!activeCompanyId && unsubscribeCallbacks.length === 0) return false;

    const callbacks = unsubscribeCallbacks;
    activeCompanyId = null;
    unsubscribeCallbacks = [];

    callbacks.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from Firebase sync:', error);
      }
    });

    return true;
  };

  return {
    getActiveCompanyId: () => activeCompanyId,
    start: (companyId, attachListeners) => {
      if (activeCompanyId === companyId) return false;

      stop();
      const callbacks = attachListeners();
      activeCompanyId = companyId;
      unsubscribeCallbacks = callbacks;
      return true;
    },
    stop,
  };
};
