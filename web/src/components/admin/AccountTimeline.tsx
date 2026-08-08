'use client';

import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CreditCard,
  Droplets,
  FileText,
  Headphones,
  ListChecks,
  LogIn,
  RefreshCcw,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AdminEventType, AdminTimelineEvent } from '@/lib/admin/types';
import styles from '@/app/admin/admin.module.css';

const icons = {
  login: LogIn,
  sampling: CalendarCheck,
  water_quality: Droplets,
  report: FileText,
  farm: Building2,
  team: Users,
  subscription: RefreshCcw,
  payment: CreditCard,
  support: Headphones,
  security: ShieldAlert,
  admin: ListChecks,
};

const filterOptions: Array<{ value: 'all' | AdminEventType; label: string }> = [
  { value: 'all', label: 'All events' },
  { value: 'login', label: 'Logins' },
  { value: 'sampling', label: 'Sampling' },
  { value: 'water_quality', label: 'Water quality' },
  { value: 'report', label: 'Reports' },
  { value: 'farm', label: 'Farms & ponds' },
  { value: 'team', label: 'Team changes' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'payment', label: 'Payments' },
  { value: 'support', label: 'Support' },
  { value: 'security', label: 'Security' },
  { value: 'admin', label: 'Owner actions' },
];

const dayLabel = (timestamp: string) => {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

export function AccountTimeline({ events, onCloseMobile }: { events: AdminTimelineEvent[]; onCloseMobile: () => void }) {
  const [filter, setFilter] = useState<'all' | AdminEventType>('all');
  const [visible, setVisible] = useState(7);
  const filtered = useMemo(() => events.filter((event) => filter === 'all' || event.type === filter), [events, filter]);
  const grouped = useMemo(() => {
    const result: Array<{ label: string; events: AdminTimelineEvent[] }> = [];
    filtered.slice(0, visible).forEach((event) => {
      const label = dayLabel(event.timestamp);
      const group = result.find((candidate) => candidate.label === label);
      if (group) group.events.push(event); else result.push({ label, events: [event] });
    });
    return result;
  }, [filtered, visible]);

  return (
    <aside className={styles.timeline} aria-label="Account timeline">
      <div className={styles.timelineHeader}>
        <strong>Account Timeline</strong>
        <label><span className={styles.srOnly}>Filter timeline event type</span><select value={filter} onChange={(event) => { setFilter(event.target.value as 'all' | AdminEventType); setVisible(7); }}>{filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="button" className={styles.mobileClose} onClick={onCloseMobile} aria-label="Close account timeline"><X size={17} /></button>
      </div>
      <div className={styles.timelineList}>
        {grouped.length === 0 && <div className={styles.stateMessage}><AlertTriangle size={19} /><strong>No matching events</strong><span>Choose another event type.</span></div>}
        {grouped.map((group) => (
          <div className={styles.timelineGroup} key={group.label}>
            <div className={styles.timelineDay}>{group.label}</div>
            {group.events.map((event) => {
              const Icon = icons[event.type];
              return (
                <article className={styles.timelineEvent} key={event.id}>
                  <time>{new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(event.timestamp))}</time>
                  <span className={`${styles.eventIcon} ${styles[`event${event.tone}`]}`}><Icon size={13} /></span>
                  <div><strong>{event.title}</strong><p>{event.detail}</p>{event.metadata && <em>{event.metadata}</em>}</div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
      {visible < filtered.length && <button type="button" className={styles.loadMore} onClick={() => setVisible((count) => count + 6)}>Load more events</button>}
    </aside>
  );
}
