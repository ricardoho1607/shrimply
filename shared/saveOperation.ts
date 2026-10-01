/** One in-flight submit and stable IDs for retries of the current draft. */
export const createSaveOperation = (onBusyChange: (busy: boolean) => void = () => {}) => {
  let busy = false;
  const ids = new Map<string, string>();
  return {
    get busy() { return busy; },
    acquire(): boolean {
      if (busy) return false;
      busy = true;
      onBusyChange(true);
      return true;
    },
    release(): void { busy = false; onBusyChange(false); },
    id(key: string, create = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`): string {
      if (!ids.has(key)) ids.set(key, create());
      return ids.get(key)!;
    },
    complete(): void { ids.clear(); },
    reset(): boolean {
      if (busy) return false;
      ids.clear();
      return true;
    },
  };
};
