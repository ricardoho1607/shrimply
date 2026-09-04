"use client";

import { getOrsonAlertCaption } from '../../../../../shared/orsonNotification';
import React, { useMemo, useState, useTransition } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  Filter,
  Check,
  Loader2,
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardCopy } from '@/hooks/useDashboardCopy';
import { useCompanyNotifications } from '@/hooks/useDashboardData';
import { getEffectiveNotificationPriority } from '../../../../../shared/orsonNotification';
import styles from './NotificationsPage.module.css';

/* --- Types --------------------------------------------------- */

interface Notification {
  id: string;
  type: 'disease_alert' | 'feed_low_stock' | 'asset_overdue' | 'system' | 'team' | 'buyer' | 'orson_risk' | 'orson_daily_brief' | 'inventory_forecast' | 'orson_biosecurity';
  title: string;
  message: string;
  timestamp: Date | { toDate?: () => Date } | string | number | null;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  data?: {
    isOrson?: boolean;
    riskId?: unknown;
    severity?: unknown;
    [key: string]: unknown;
  };
  orsonRiskReport?: {
    findings?: Array<{ id?: unknown; severity?: unknown }>;
  };
}

const isFirestoreTimestamp = (value: Notification['timestamp']): value is { toDate: () => Date } => {
  return !!value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function';
};

export default function NotificationsPage() {
  const copy = useDashboardCopy();
  const { t } = useLanguage();
  const {
    data: notifications,
    loading,
    companyId,
    hasMore,
    loadingMore,
    loadMore,
    updateLocalItem,
    removeLocalItem,
    clearLocalItems,
  } = useCompanyNotifications<Notification>();
  const [filter, setFilter] = useState<'all' | 'unread' | 'orson' | 'high'>('all');
  const [, startTransition] = useTransition();

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    if (filter === 'orson') {
      return notifications.filter(n => n.data?.isOrson);
    }
    if (filter === 'high') {
      return notifications.filter(n => getEffectiveNotificationPriority(n) === 'high');
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const orsonCount = useMemo(() => notifications.filter(n => n.data?.isOrson).length, [notifications]);
  const highPriorityCount = useMemo(
    () => notifications.filter(n => getEffectiveNotificationPriority(n) === 'high').length,
    [notifications],
  );
  const setNotificationFilter = (nextFilter: typeof filter) => startTransition(() => setFilter(nextFilter));

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      updateLocalItem(id, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!companyId) return;
    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('companyId', '==', companyId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(unreadQuery);
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = writeBatch(db);
        snapshot.docs.slice(index, index + 400).forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
      notifications.forEach((notification) => updateLocalItem(notification.id, { read: true }));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!companyId || !window.confirm(t.notifications.clearAllMessage || 'Are you sure you want to clear all notifications?')) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      for (let index = 0; index < snapshot.docs.length; index += 400) {
        const batch = writeBatch(db);
        snapshot.docs.slice(index, index + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      clearLocalItems();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      removeLocalItem(id);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTime = (timestamp: Notification['timestamp']) => {
    if (!timestamp) return '';
    const date = isFirestoreTimestamp(timestamp)
      ? timestamp.toDate()
      : timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number'
        ? new Date(timestamp)
        : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t.notifications.justNow || 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.notifications.minutesAgo || 'm ago'}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.notifications.hoursAgo || 'h ago'}`;
    return `${Math.floor(diffInSeconds / 86400)}${t.notifications.daysAgo || 'd ago'}`;
  };

  return (
    <div className={`dashboard-page authenticated-compact-page ${styles.page}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className={`dashboard-action-row ${styles.bulkActions}`}>
          <button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="btn-secondary" 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              opacity: unreadCount === 0 ? 0.5 : 1,
              cursor: unreadCount === 0 ? 'default' : 'pointer'
            }}
          >
            <CheckCircle2 size={18} />
            {t.notifications.markAllRead || 'Mark all read'}
          </button>
          <button 
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
            className="btn-secondary" 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#ef4444',
              opacity: notifications.length === 0 ? 0.5 : 1,
              cursor: notifications.length === 0 ? 'default' : 'pointer'
            }}
          >
            <Trash2 size={18} />
            {t.notifications.clearAllTitle || 'Clear all'}
          </button>
      </div>

      <div className={`glass-card dashboard-summary-panel ${styles.metricGrid}`}>
        <button type="button" className={`dashboard-summary-item ${styles.metricCard}`} data-active={filter === 'all'} aria-pressed={filter === 'all'} onClick={() => setNotificationFilter('all')}>
          <div className="dashboard-summary-content">
            <div className="dashboard-summary-label">{copy('Total alerts')}</div>
            <div className="dashboard-summary-value">{notifications.length}</div>
          </div>
        </button>
        <button type="button" className={`dashboard-summary-item ${styles.metricCard}`} data-active={filter === 'unread'} aria-pressed={filter === 'unread'} onClick={() => setNotificationFilter('unread')}>
          <div className="dashboard-summary-content">
            <div className="dashboard-summary-label">{copy('Unread')}</div>
            <div className="dashboard-summary-value">{unreadCount}</div>
          </div>
        </button>
        <button type="button" className={`dashboard-summary-item ${styles.metricCard}`} data-active={filter === 'orson'} aria-pressed={filter === 'orson'} onClick={() => setNotificationFilter('orson')}>
          <div className="dashboard-summary-content">
            <div className="dashboard-summary-label">Orson AI</div>
            <div className="dashboard-summary-value">{orsonCount}</div>
          </div>
        </button>
        <button type="button" className={`dashboard-summary-item ${styles.metricCard}`} data-active={filter === 'high'} aria-pressed={filter === 'high'} onClick={() => setNotificationFilter('high')}>
          <div className="dashboard-summary-content">
            <div className="dashboard-summary-label">{copy('High priority')}</div>
            <div className={`dashboard-summary-value ${styles.highPriorityValue}`}>{highPriorityCount}</div>
          </div>
        </button>
      </div>

      {/* Filters & Tabs */}
      <div className={`glass-card ${styles.filters}`} style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '16px 22px'
      }}>
        <div className={styles.filterTabs} style={{ display: 'flex', gap: '24px' }}>
          <button 
                onClick={() => setNotificationFilter('all')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'all' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t.notifications.all || 'All'}
          </button>
          <button 
                onClick={() => setNotificationFilter('unread')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              color: filter === 'unread' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'unread' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {t.notifications.unread || 'Unread'}
            {unreadCount > 0 && (
              <span style={{ 
                background: 'var(--primary)', 
                color: '#FFF', 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setNotificationFilter('orson')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              color: filter === 'orson' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'orson' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Orson AI
          </button>
          <button
            onClick={() => setNotificationFilter('high')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              color: filter === 'high' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'high' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {copy('High priority')}
          </button>
        </div>
        <div className={styles.filterLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-faint)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={16} />
          <span>{copy('Filter')}</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className={styles.notificationList} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-faint)' }}>
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={`glass-card ${styles.emptyState}`} style={{
            textAlign: 'center', 
            padding: '80px 40px', 
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--bg-mid)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-faint)',
              marginBottom: '8px'
            }}>
              <Bell size={40} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>
              {filter === 'unread'
                ? (t.notifications.noUnread || 'No unread notifications')
                : filter === 'orson'
                  ? 'No Orson AI notifications'
                  : filter === 'high'
                    ? 'No high priority notifications'
                    : (t.notifications.noNotifications || 'No notifications yet')}
            </h3>
            <p style={{ maxWidth: '300px', margin: '0 auto' }}>
              {t.notifications.emptyMessage || "You'll be notified about disease outbreaks and important updates here."}
            </p>
          </div>
        ) : (
          <>
          {filteredNotifications.map((notification) => (
            <div 
              key={notification.id}
              className={`glass-card notification-item ${styles.notificationItem}`}
              style={{ 
                padding: '20px', 
                background: notification.read ? '#FFFFFF' : 'rgba(15, 76, 117, 0.02)',
                border: notification.read ? '1px solid var(--border)' : '2px solid #BBE1FA',
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className={styles.notificationContent} style={{ flex: 1 }}>
                <div className={styles.notificationHeading} style={{ display: 'flex', alignItems: 'baseline', marginBottom: '4px' }}>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: notification.read ? 400 : 600,
                    color: notification.read ? 'var(--text-primary)' : 'var(--primary)'
                  }}>
                    {notification.title}
                  </h4>
                  <span className={styles.notificationTime} style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600 }}>
                    {getOrsonAlertCaption(notification, formatTime(notification.timestamp)) || formatTime(notification.timestamp)}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '14px', 
                  lineHeight: 1.5,
                  color: notification.read ? 'var(--text-muted)' : 'var(--text-primary)',
                  marginBottom: '12px'
                }}>
                  {notification.message}
                </p>
                
                {!!notification.data?.reportId && (
                  <button 
                    className="btn-secondary" 
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '12px', 
                      borderRadius: '8px',
                      background: 'var(--bg-mid)',
                      border: 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigation would go here
                    }}
                  >
                    {copy('View Details')}
                  </button>
                )}
              </div>

              <div className={`notification-actions ${styles.notificationActions}`} style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
                {!notification.read && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                    title={copy('Mark as read')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary)', 
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Check size={18} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                  title={copy('Delete')}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#ef4444', 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              style={{ alignSelf: 'center', marginTop: '8px', minWidth: '160px' }}
            >
              {loadingMore ? 'Loading…' : 'Load older notifications'}
            </button>
          )}
          </>
        )}
      </div>

      <style jsx>{`
        .notification-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 76, 117, 0.05);
          background: #FFF !important;
        }
        .notification-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .notification-item:hover .notification-actions {
          opacity: 1;
        }
        .notification-item:focus-within .notification-actions {
          opacity: 1;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
