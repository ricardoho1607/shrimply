'use client';

import {
  Check,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  LockKeyhole,
  RefreshCcw,
  Shield,
  Trash2,
  UserRoundCog,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { validateSensitiveAction } from '@/lib/admin/adminCore';
import type { AccountIntelligence } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

interface AdminActionsProps {
  account: AccountIntelligence | null;
  onRefresh: () => void;
  onFeedback: (message: string) => void;
  onRequestDelete: (account: AccountIntelligence) => void;
}

export function AdminActions({ account, onRefresh, onFeedback, onRequestDelete }: AdminActionsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [duration, setDuration] = useState('30');
  const validation = useMemo(() => validateSensitiveAction(reason, confirmed), [confirmed, reason]);

  const exportSnapshot = () => {
    if (!account) return;
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      account: { id: account.id, name: account.name, email: account.maskedEmail, phone: account.maskedPhone, status: account.status },
      farms: account.farms,
      featureAdoption: account.adoption,
      timeline: account.timeline,
      note: 'Contact fields remain masked. This is a read-only operational snapshot.',
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `shrimply-account-${account.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onFeedback('Masked account snapshot exported.');
  };

  return (
    <>

      {drawerOpen && (
        <div className={styles.modalBackdrop} onMouseDown={() => setDrawerOpen(false)}>
          <aside className={styles.actionDrawer} onMouseDown={(event) => event.stopPropagation()} aria-label="Review account actions">
            <div className={styles.drawerHeader}><div><span>OWNER ACTIONS</span><h2>{account?.name}</h2></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close account actions"><X size={19} /></button></div>
            <p className={styles.drawerIntro}><LockKeyhole size={15} />Sensitive actions require server validation, explicit confirmation, and an immutable audit event.</p>
            <div className={styles.actionList}>
              <button type="button" onClick={() => { onRefresh(); onFeedback('Account intelligence refreshed.'); }}><span><RefreshCcw size={17} /><span><strong>Refresh account intelligence</strong><small>Read the latest permitted Firebase records</small></span></span><ChevronRight size={16} /></button>
              <button type="button" onClick={exportSnapshot}><span><Download size={17} /><span><strong>Export masked activity snapshot</strong><small>No raw contact or authentication data</small></span></span><ChevronRight size={16} /></button>
              <button type="button" onClick={() => setSupportOpen(true)}><span><Eye size={17} /><span><strong>Reveal contact data</strong><small>Disabled · audited reveal backend required</small></span></span><LockKeyhole size={15} /></button>
              <button type="button" onClick={() => setSupportOpen(true)}><span><UserRoundCog size={17} /><span><strong>Start support session</strong><small>Disabled · scoped, expiring permission required</small></span></span><LockKeyhole size={15} /></button>
              <button type="button" className={styles.dangerAction} onClick={() => { if (account) { setDrawerOpen(false); onRequestDelete(account); } }}><span><Trash2 size={17} /><span><strong>Delete user account</strong><small>Server-validated confirmation and immutable audit record required</small></span></span><ChevronRight size={16} /></button>
            </div>
          </aside>
        </div>
      )}

      {supportOpen && (
        <div className={styles.modalBackdrop} onMouseDown={() => setSupportOpen(false)}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="support-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className={styles.dialogClose} onClick={() => setSupportOpen(false)} aria-label="Close"><X size={18} /></button>
            <span className={styles.dialogIcon}><Shield size={21} /></span>
            <h2 id="support-title">Audited support session</h2>
            <p>This frontend is ready for a reason, expiry, confirmation, and audit trail, but the backend cannot yet issue a scoped support grant. No session will be started.</p>
            <label>Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the user-reported issue and why access is necessary" /></label>
            <label>Maximum duration<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></label>
            <label className={styles.checkboxLabel}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span><Check size={13} />I understand the actor, target, reason, duration, and timestamps must be audited.</span></label>
            {reason && validation.reasonError && <span className={styles.validationError}>{validation.reasonError}</span>}
            <div className={styles.backendRequired}><Clock3 size={15} /><span>Required backend: callable function, custom support-session claims, revocation, expiry enforcement, and append-only audit events.</span></div>
            <button type="button" className={styles.disabledSubmit} disabled>Backend required to start session</button>
          </section>
        </div>
      )}

    </>
  );
}
