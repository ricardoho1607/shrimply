'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { cancelAppConfirmations, cancelAppDialogs, getAppDialog, getServerAppDialog, resolveAppDialog, subscribeAppDialogs } from '@/lib/appDialogs';
import ConfirmationModal from './ConfirmationModal';

export default function AppDialogHost() {
  const dialog = useSyncExternalStore(subscribeAppDialogs, getAppDialog, getServerAppDialog);
  const pathname = usePathname();
  const { t } = useLanguage();
  const copy = useDashboardCopy();
  useEffect(() => () => cancelAppConfirmations(), [pathname]);
  useEffect(() => () => cancelAppDialogs(), []);
  if (!dialog) return null;
  const confirming = dialog.kind === 'confirm';
  return <ConfirmationModal
    key={dialog.id}
    isOpen
    title={confirming ? t.actions.confirm : ''}
    message={copy(dialog.message)}
    confirmText={confirming ? t.actions.confirm : 'OK'}
    cancelText={t.actions.cancel}
    hideCancel={!confirming}
    isDanger={confirming}
    onConfirm={() => resolveAppDialog(dialog.id, true)}
    onCancel={() => resolveAppDialog(dialog.id, false)}
  />;
}
