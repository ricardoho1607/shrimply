import type { AlertButton, AlertOptions } from 'react-native';
import { getUserErrorMessage } from '../../shared/userError';

type AppAlert = {
  id: number;
  title: string;
  message: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};
let nextId = 0;
let queue: AppAlert[] = [];
const listeners = new Set<() => void>();
const notify = () => { for (const listener of listeners) listener(); };
export const getAppAlert = () => queue[0] ?? null;
export const getServerAppAlert = () => null;
export function subscribeAppAlerts(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Same callback API as React Native alerts; actions run only after a button is chosen. */
export const AppAlert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    queue.push({ id: ++nextId, title: getUserErrorMessage(title, 'Shrimply'),
      message: message ? getUserErrorMessage(message) : '',
      buttons: buttons?.length ? buttons.map(button => ({ ...button })) : [{ text: 'OK' }], options });
    notify();
  },
};

export function chooseAppAlert(id: number, index: number) {
  const current = queue[0];
  if (current?.id !== id || !current.buttons[index]) return;
  queue = queue.slice(1);
  notify();
  current.buttons[index].onPress?.();
}

export function dismissAppAlert(id: number) {
  const current = queue[0];
  // Android's native alerts are not dismissible by default.
  if (current?.id !== id || !current.options?.cancelable) return;
  queue = queue.slice(1);
  notify();
  current.options.onDismiss?.();
}

/** Leaving a screen must never approve one of its pending actions. */
export function cancelAppAlertActions(all = false) {
  const pending = queue.filter(alert => all || alert.buttons.some(button => button.onPress));
  queue = queue.filter(alert => !pending.includes(alert));
  notify();
  for (const alert of pending) {
    const cancel = alert.buttons.find(button => button.style === 'cancel');
    if (cancel?.onPress) cancel.onPress();
    else alert.options?.onDismiss?.();
  }
}
