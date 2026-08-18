'use client';

import { AlertTriangle, CheckCircle2, Loader2, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { AdminDirectoryUser } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

interface BatchDeleteUsersDialogProps {
  users: AdminDirectoryUser[];
  open: boolean;
  onClose: () => void;
  onBatchDelete: (
    usersToDelete: Array<{ userId: string; name: string; deleteCompany: boolean; farmName?: string }>,
    reason: string,
    onProgress: (current: number, total: number, currentName: string) => void
  ) => Promise<{ successCount: number; failureCount: number; errors: string[] }>;
  onSuccess: () => void;
}

export function BatchDeleteUsersDialog({
  users,
  open,
  onClose,
  onBatchDelete,
  onSuccess,
}: BatchDeleteUsersDialogProps) {
  const [reason, setReason] = useState('Bulk administrative cleanup');
  const [confirmation, setConfirmation] = useState('');
  const [deleteCompanies, setDeleteCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const expectedConfirmation = `DELETE ${users.length} USERS`;
  const isReasonValid = reason.trim().length >= 5;
  const isConfirmationValid = confirmation.trim().toUpperCase() === expectedConfirmation || confirmation.trim().toUpperCase() === 'DELETE';
  const canSubmit = users.length > 0 && isReasonValid && isConfirmationValid && !submitting;

  useEffect(() => {
    if (!open) {
      setReason('Bulk administrative cleanup');
      setConfirmation('');
      setDeleteCompanies(false);
      setSubmitting(false);
      setProgressText(null);
      setProgressPercent(0);
      setError(null);
      return;
    }
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

  if (!open || users.length === 0) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setProgressText(`Starting deletion of ${users.length} users…`);
    setProgressPercent(0);

    try {
      const payload = users.map((u) => ({
        userId: u.id,
        name: u.name,
        deleteCompany: deleteCompanies,
        farmName: u.farmName || undefined,
      }));

      const result = await onBatchDelete(payload, reason.trim(), (curr, total, name) => {
        setProgressText(`Deleting (${curr}/${total}): ${name}…`);
        setProgressPercent(Math.round((curr / total) * 100));
      });

      if (result.failureCount > 0 && result.successCount === 0) {
        setError(`Failed to delete users: ${result.errors.join(', ')}`);
        setSubmitting(false);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Batch deletion failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.deleteDialogBackdrop} role="presentation">
      <form
        className={styles.deleteDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-delete-title"
        onSubmit={(event) => void handleSubmit(event)}
        style={{ maxWidth: 560 }}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.dialogClose}
          onClick={onClose}
          disabled={submitting}
          aria-label="Close batch delete dialog"
        >
          <X size={17} />
        </button>

        <span className={styles.deleteDialogIcon}>
          <Trash2 size={22} />
        </span>

        <h2 id="batch-delete-title" style={{ marginTop: 12 }}>
          Delete {users.length} Selected {users.length === 1 ? 'User' : 'Users'}?
        </h2>

        <p style={{ margin: '4px 0 14px', fontSize: 12, color: 'var(--admin-muted)' }}>
          This will permanently remove the selected user accounts and their associated permissions from Firebase Firestore.
        </p>

        {/* Selected Users Summary Box */}
        <div
          style={{
            maxHeight: 150,
            overflowY: 'auto',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 14,
          }}
        >
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                padding: '4px 0',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--admin-cyan)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {u.initials}
                </span>
                <span style={{ fontWeight: 650, color: 'var(--admin-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {u.name}
                </span>
                <span style={{ color: 'var(--admin-muted)', fontSize: 10 }}>
                  ({u.email || u.maskedEmail})
                </span>
              </div>
              <span style={{ color: '#64748b', fontSize: 10, flexShrink: 0 }}>
                {u.farmName || 'No farm'}
              </span>
            </div>
          ))}
        </div>

        {/* Cascade Company Deletion Checkbox */}
        <label
          className={styles.checkboxLabel}
          style={{
            padding: '10px 12px',
            background: '#fef2f2',
            borderRadius: 8,
            border: '1px solid #fecaca',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 4,
            marginBottom: 14,
          }}
        >
          <input
            type="checkbox"
            checked={deleteCompanies}
            onChange={(event) => setDeleteCompanies(event.target.checked)}
            disabled={submitting}
            style={{ marginTop: 2, accentColor: '#dc2626', width: 16, height: 16 }}
          />
          <span style={{ color: '#991b1b', fontSize: 11, lineHeight: 1.45 }}>
            <strong>Cascade delete tenant farm companies:</strong> Also permanently delete any farm companies owned by these users (including all ponds, cycles, inventory, and harvest records).
          </span>
        </label>

        {/* Reason Input */}
        <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 650, color: '#334b59', marginBottom: 12 }}>
          <span>Audit reason for batch deletion</span>
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Bulk cleanup of inactive test accounts"
            disabled={submitting}
            style={{
              height: 38,
              padding: '0 10px',
              border: '1px solid #cbdbe7',
              borderRadius: 8,
              fontSize: 12,
              background: '#f8fafc',
            }}
          />
        </label>

        {/* Confirmation Input */}
        <label style={{ display: 'grid', gap: 6, fontSize: 11, fontWeight: 650, color: '#334b59', marginBottom: 14 }}>
          <span>
            Type <strong>DELETE</strong> or <strong>{expectedConfirmation}</strong> to confirm:
          </span>
          <input
            type="text"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={expectedConfirmation}
            autoComplete="off"
            disabled={submitting}
            style={{
              height: 38,
              padding: '0 10px',
              border: '1px solid #cbdbe7',
              borderRadius: 8,
              fontSize: 12,
              background: '#f8fafc',
              fontFamily: 'monospace',
            }}
          />
        </label>

        {/* Live Progress Bar during execution */}
        {submitting && (
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#0F4C75', fontWeight: 650, marginBottom: 4 }}>
              <span>{progressText}</span>
              <span>{progressPercent}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  background: '#dc2626',
                  width: `${progressPercent}%`,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {error && <div className={styles.deleteError} role="alert" style={{ marginBottom: 14 }}>{error}</div>}

        <div className={styles.deleteDialogActions}>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? '#dc2626' : '#f1f5f9',
              borderColor: canSubmit ? '#dc2626' : '#cbdbe7',
              color: canSubmit ? '#ffffff' : '#94a3b8',
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className={styles.spin} />
                Deleting {users.length} Users…
              </>
            ) : (
              <>
                <Trash2 size={15} />
                Delete {users.length} Selected {users.length === 1 ? 'User' : 'Users'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
