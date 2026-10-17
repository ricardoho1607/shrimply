'use client';

import { Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { validateDeleteUserAction } from '@/lib/admin/adminCore';
import type { AccountIntelligence, DeleteAdminUserInput } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

interface DeleteUserDialogProps {
  account: AccountIntelligence | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (input: DeleteAdminUserInput) => Promise<void>;
}

export function DeleteUserDialog({ account, open, onClose, onConfirm }: DeleteUserDialogProps) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleteCompany, setDeleteCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const expectedConfirmation = account?.id || '';
  const validation = useMemo(() => validateDeleteUserAction(reason, confirmation, expectedConfirmation), [confirmation, expectedConfirmation, reason]);
  const canSubmit = Boolean(account) && validation.allowed && !submitting;

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => closeButtonRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open, submitting]);

  if (!open || !account) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        userId: account.id,
        reason: reason.trim(),
        confirmation: confirmation.trim(),
        deleteCompany,
        companyId: account.farms[0]?.id,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The user could not be deleted.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.deleteDialogBackdrop} role="presentation">
      <form className={styles.deleteDialog} role="dialog" aria-modal="true" aria-labelledby="delete-user-title" onSubmit={(event) => void submit(event)}>
        <button ref={closeButtonRef} type="button" className={styles.dialogClose} onClick={onClose} disabled={submitting} aria-label="Close delete user dialog"><X size={17} /></button>
        <span className={styles.deleteDialogIcon}><Trash2 size={20} /></span>
        <h2 id="delete-user-title">Delete {account.name}?</h2>
        <p>This permanently removes the user account from Firebase.</p>
        
        {account.farms.length > 0 && (
          <label className={styles.checkboxLabel} style={{ marginTop: 10, marginBottom: 12, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={deleteCompany}
              onChange={(event) => setDeleteCompany(event.target.checked)}
              disabled={submitting}
              style={{ marginTop: 2, accentColor: '#dc2626' }}
            />
            <span style={{ color: '#991b1b', fontSize: 12, lineHeight: 1.4 }}>
              Also permanently delete associated company (<strong>{account.farms[0].name}</strong>) and all its ponds/farm records.
            </span>
          </label>
        )}

        <label>Reason for deletion<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter a specific reason (at least 10 characters)" disabled={submitting} /></label>
        <label>Type <strong>{expectedConfirmation}</strong> to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={submitting} /></label>
        {error && <div className={styles.deleteError} role="alert">{error}</div>}
        <div className={styles.deleteDialogActions}>
          <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" disabled={!canSubmit}>{submitting ? <><Loader2 size={15} className={styles.spin} />Deleting…</> : <><Trash2 size={15} />Permanently delete user</>}</button>
        </div>
      </form>
    </div>
  );
}
