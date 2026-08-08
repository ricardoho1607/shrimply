'use client';

import {
  Building2,
  CreditCard,
  Database,
  Info,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { calculateAccountHealth } from '@/lib/admin/adminCore';
import type { AccountIntelligence } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export function AccountDetail({ account, loading, error, onRetry, onRequestDelete }: { account: AccountIntelligence | null; loading: boolean; error: string | null; onRetry: () => void; onRequestDelete: (account: AccountIntelligence) => void }) {
  if (loading) return <section className={styles.account}><div className={styles.accountSkeleton}><i /><span /><span /><span /><span /></div></section>;
  if (error) return <section className={styles.account}><div className={styles.stateMessage}><strong>Couldn’t load account intelligence</strong><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div></section>;
  if (!account) return <section className={styles.account}><div className={styles.stateMessage}><strong>Select a user</strong><span>Choose an account to view its operational history.</span></div></section>;
  const health = calculateAccountHealth(account.healthInputs);

  return (
    <section className={styles.account} aria-label="Selected account intelligence">
      <header className={styles.accountHeader}>
        <span className={styles.accountAvatar}>{account.initials}</span>
        <div className={styles.accountTitle}>
          <div><h2>{account.name}</h2></div>
          <p><span>ID: {account.id}</span><span><Mail size={14} />{account.email || 'Email unavailable'}</span><span><Phone size={14} />{account.phone || 'Mobile unavailable'}</span></p>
        </div>
        <button type="button" className={styles.deleteUserButton} onClick={() => onRequestDelete(account)} aria-label={`Delete ${account.name}`} title="Delete user account"><Trash2 size={16} />Delete user</button>
      </header>

      <div className={styles.accountFacts}>
        <div><span>Plan</span><strong>{account.plan}</strong></div>
        <div><span>Region</span><strong>{account.region}, {account.country}</strong></div>
        <div><span>Joined</span><strong>{formatDate(account.joinedAt)}</strong></div>
        <div><span>Last active</span><strong>{formatDate(account.lastActiveAt, true)}</strong></div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><Building2 size={16} />Linked Farms & Ponds</h3><span>{account.farms.length} linked</span></div>
        {account.farms.length === 0 ? <p className={styles.inlineEmpty}>No linked farm was found.</p> : account.farms.map((farm) => (
          <div className={styles.farmRow} key={farm.id}>
            <div><strong>{farm.name}</strong><span><MapPin size={11} />{farm.location}</span></div>
            <span>{farm.pondCount} ponds</span><span>{farm.totalAreaHa === null ? 'Area unavailable' : `${farm.totalAreaHa.toFixed(1)} ha`}</span>
          </div>
        ))}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><ShieldCheck size={16} />Account Health</h3><span>Transparent weighted score</span></div>
        <div className={styles.healthGrid}>
          <div className={styles.healthRing} style={{ '--health-score': `${health.score * 3.6}deg` } as React.CSSProperties}><div><strong>{health.score}</strong><span>/100</span></div></div>
          <div className={styles.healthSignals}>
            {health.signals.map((signal) => <div key={signal.key} title={signal.explanation}><span>{signal.label}</span><i><b style={{ width: `${signal.score || 0}%` }} /></i><strong>{signal.score === null ? 'Unavailable' : signal.score >= 80 ? 'Good' : signal.score >= 55 ? 'Fair' : 'Risk'}</strong></div>)}
          </div>
        </div>
        <p className={styles.healthSummary}><Info size={13} />{health.summary} Each signal is normalized to 100 and multiplied by the weight shown in its explanation.</p>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><Sparkles size={16} />Feature Adoption</h3><span>Recent Shrimply usage</span></div>
        <div className={styles.adoptionGrid}>
          {account.adoption.map((feature) => (
            <div className={styles.adoptionItem} key={feature.key}>
              <span>{feature.label}</span><i><b style={{ width: `${feature.percentage}%` }} /></i><strong>{feature.percentage}%</strong>
              <small>{feature.eventCount === null ? 'Data unavailable' : `${feature.eventCount} ${feature.eventCount === 1 ? 'event' : 'events'}`}</small>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><CreditCard size={16} />Subscription</h3></div>
        <div className={styles.subscriptionGrid}>
          <div><span>Plan</span><strong>{account.subscription.plan}</strong></div><div><span>Status</span><strong>{account.subscription.status}</strong></div><div><span>Billing</span><strong>{account.subscription.billingInterval || 'Unavailable'}</strong></div><div><span>Renews</span><strong>{formatDate(account.subscription.renewalAt)}</strong></div><div><span>Payment method</span><strong>{account.subscription.paymentMethod}</strong></div>
        </div>
      </div>

      {account.missingBackendSignals.length > 0 && (
        <details className={styles.backendGaps}>
          <summary><Database size={14} />Backend coverage notes ({account.missingBackendSignals.length})</summary>
          <ul>{account.missingBackendSignals.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
