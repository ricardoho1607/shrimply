'use client';

import {
  CreditCard,
  Database,
  Headphones,
  Info,
  Mail,
  MapPin,
  Phone,
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

export function AccountDetail({ account, loading, error, onRetry }: { account: AccountIntelligence | null; loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) return <section className={styles.account}><div className={styles.accountSkeleton}><i /><span /><span /><span /><span /></div></section>;
  if (error) return <section className={styles.account}><div className={styles.stateMessage}><strong>Couldn’t load account intelligence</strong><span>{error}</span><button type="button" onClick={onRetry}>Retry</button></div></section>;
  if (!account) return <section className={styles.account}><div className={styles.stateMessage}><strong>Select a user</strong><span>Choose an account to view its operational history.</span></div></section>;
  
  const health = calculateAccountHealth(account.healthInputs);
  const accountStatus = account.status || 'Inactive';
  const statusClassName = styles[`status${accountStatus.replaceAll(' ', '')}`] || styles.statusInactive;
  const farms = account.farms || [];
  const adoption = account.adoption || [];
  const subscription = account.subscription || { plan: account.plan || 'Unavailable', status: 'Unavailable', billingInterval: null, renewalAt: null, paymentMethod: 'Unavailable' };
  const support = account.support || { availability: 'unavailable', tickets: [], note: 'No support tickets were found.' };
  const missingBackendSignals = account.missingBackendSignals || [];

  return (
    <section className={styles.account} aria-label="Selected account intelligence">
      <header className={styles.accountHeader}>
        <span className={styles.accountAvatar}>{account.initials || 'U'}</span>
        <div className={styles.accountTitle}>
          <div><h2>{account.name || 'Unnamed user'}</h2><span className={`${styles.status} ${statusClassName}`}><i />{accountStatus}</span></div>
          <p><span>ID: {account.id}</span><span><Mail size={14} />{account.email || 'Unavailable'}</span><span><Phone size={14} />{account.maskedPhone || 'Unavailable'}</span></p>
        </div>
      </header>

      <div className={styles.accountFacts}>
        <div><span>Plan</span><strong>{account.plan || 'Unavailable'}</strong></div>
        <div><span>Region</span><strong>{account.region || 'Unknown'}, {account.country || 'Unknown'}</strong></div>
        <div><span>Joined</span><strong>{formatDate(account.joinedAt)}</strong></div>
        <div><span>Last active</span><strong>{formatDate(account.lastActiveAt, true)}</strong></div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Linked Farms & Ponds</h3><span>{farms.length} linked</span></div>
        {farms.length === 0 ? <p className={styles.inlineEmpty}>No linked farm was found.</p> : farms.map((farm) => (
          <div className={styles.farmRow} key={farm.id}>
            <div><strong>{farm.name}</strong><span><MapPin size={11} />{farm.location}</span></div>
            <span>{farm.pondCount} ponds</span><span>{farm.totalAreaHa === null ? 'Area unavailable' : `${farm.totalAreaHa.toFixed(1)} ha`}</span>
          </div>
        ))}
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Account Health</h3><span>Transparent weighted score</span></div>
        <div className={styles.healthGrid}>
          <div className={styles.healthRing} style={{ '--health-score': `${health.score * 3.6}deg` } as React.CSSProperties}><div><strong>{health.score}</strong><span>/100</span></div></div>
          <div className={styles.healthSignals}>
            {(health.signals || []).map((signal) => <div key={signal.key} title={signal.explanation}><span>{signal.label}</span><i><b style={{ width: `${signal.score || 0}%` }} /></i><strong>{signal.score === null ? 'Unavailable' : signal.score >= 80 ? 'Good' : signal.score >= 55 ? 'Fair' : 'Risk'}</strong></div>)}
          </div>
        </div>
        <p className={styles.healthSummary}><Info size={13} />{health.summary} Each signal is normalized to 100 and multiplied by the weight shown in its explanation.</p>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3>Feature Adoption</h3><span>Recent Shrimply usage</span></div>
        <div className={styles.adoptionGrid}>
          {adoption.map((feature) => (
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
          <div><span>Plan</span><strong>{subscription.plan}</strong></div><div><span>Status</span><strong>{subscription.status}</strong></div><div><span>Billing</span><strong>{subscription.billingInterval || 'Unavailable'}</strong></div><div><span>Renews</span><strong>{formatDate(subscription.renewalAt)}</strong></div><div><span>Payment method</span><strong>{subscription.paymentMethod}</strong></div>
        </div>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}><h3><Headphones size={16} />Support History</h3><span>{support.availability === 'live' ? `${(support.tickets || []).length} tickets` : 'Not connected'}</span></div>
        {(support.tickets || []).length > 0 ? (
          <div className={styles.ticketTable}>
            {(support.tickets || []).map((ticket) => <div key={ticket.id}><strong>{ticket.id}</strong><span>{ticket.subject}</span><em>{ticket.status}</em><span>{formatDate(ticket.updatedAt)}</span></div>)}
          </div>
        ) : <p className={styles.inlineEmpty}>{support.note || 'No support tickets were found.'}</p>}
      </div>

      {missingBackendSignals.length > 0 && (
        <details className={styles.backendGaps}>
          <summary><Database size={14} />Backend coverage notes ({missingBackendSignals.length})</summary>
          <ul>{missingBackendSignals.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
