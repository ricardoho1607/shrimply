import { getUserErrorMessage } from './userError';

type AppDialog = { id: number; kind: 'alert' | 'confirm'; message: string };
type PendingDialog = AppDialog & { resolve?: (confirmed: boolean) => void };
let nextId = 0;
let queue: PendingDialog[] = [];
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };

export const getAppDialog = (): AppDialog | null => queue[0] || null;
export const getServerAppDialog = () => null;
export function subscribeAppDialogs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function showAppAlert(message: unknown) {
  queue.push({ id: ++nextId, kind: 'alert', message: getUserErrorMessage(message) });
  notify();
}

/** Callers must await the choice before writing or deleting anything. */
export function confirmAppAction(message: string): Promise<boolean> {
  if (queue.some(dialog => dialog.kind === 'confirm' && dialog.message === message)) return Promise.resolve(false);
  return new Promise(resolve => {
    queue.push({ id: ++nextId, kind: 'confirm', message, resolve });
    notify();
  });
}

export function resolveAppDialog(id: number, confirmed: boolean) {
  if (queue[0]?.id !== id) return;
  const current = queue.shift();
  current?.resolve?.(confirmed);
  notify();
}

/** Navigation/unmount cancels pending actions rather than accepting them. */
export function cancelAppDialogs() {
  const pending = queue;
  queue = [];
  for (const dialog of pending) dialog.resolve?.(false);
  notify();
}

export function cancelAppConfirmations() {
  const pending = queue.filter(dialog => dialog.kind === 'confirm');
  queue = queue.filter(dialog => dialog.kind === 'alert');
  for (const dialog of pending) dialog.resolve?.(false);
  notify();
}
