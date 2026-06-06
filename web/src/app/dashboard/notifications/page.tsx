"use client";

import React, { useMemo, useState, useTransition } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  Info, 
  Clock, 
  Box, 
  Users, 
  ShoppingBag,
  Filter,
  Check,
  Loader2,
  BrainCircuit
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
import { useCompanyNotifications } from '@/hooks/useDashboardData';

/* ─── Types ─────────────────────────────────────────────────── */

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
    [key: string]: unknown;
  };
}

const isFirestoreTimestamp = (value: Notification['timestamp']): value is { toDate: () => Date } => {
  return !!value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function';
};

/* ─── Components ─────────────────────────────────────────────── */

const NotificationIcon = ({ type, priority, data }: { type: string, priority: string, data?: Notification['data'] }) => {
  const getIconColor = () => {
    if (data?.isOrson) return '#3282B8'; // Orson Navy
    if (priority === 'high') return '#ef4444';
    if (priority === 'medium') return '#f59e0b';
    return '#3b82f6';
  };

  const color = getIconColor();
  const bg = `${color}15`;

  const iconProps = { size: 20, color };

  return (
    <div style={{ 
      width: '44px', 
      height: '44px', 
      borderRadius: '12px', 
      background: bg, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexShrink: 0
    }}>
      {data?.isOrson ? (
        <BrainCircuit {...iconProps} />
      ) : (
        <>
          {type === 'disease_alert' && <AlertTriangle {...iconProps} />}
          {type === 'feed_low_stock' && <Box {...iconProps} />}
          {type === 'asset_overdue' && <Clock {...iconProps} />}
          {type === 'system' && <Info {...iconProps} />}
          {type === 'team' && <Users {...iconProps} />}
          {type === 'buyer' && <ShoppingBag {...iconProps} />}
          {!['disease_alert', 'feed_low_stock', 'asset_overdue', 'system', 'team', 'buyer'].includes(type) && <Bell {...iconProps} />}
        </>
      )}
    </div>
  );
};

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { data: notifications, loading, companyId } = useCompanyNotifications<Notification>();
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
      return notifications.filter(n => n.priority === 'high');
    }
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const orsonCount = useMemo(() => notifications.filter(n => n.data?.isOrson).length, [notifications]);
  const highPriorityCount = useMemo(() => notifications.filter(n => n.priority === 'high').length, [notifications]);
  const setNotificationFilter = (nextFilter: typeof filter) => startTransition(() => setFilter(nextFilter));
  const metricCardStyle = (id: typeof filter, accent = 'var(--primary)') => ({
    background: id === 'all' ? 'var(--gradient)' : '#FFFFFF',
    color: id === 'all' ? '#FFF' : 'var(--text-primary)',
    padding: '22px',
    border: filter === id ? `1px solid ${accent}` : id === 'all' ? 'none' : '1px solid var(--border)',
    boxShadow: filter === id ? '0 14px 34px rgba(15, 76, 117, 0.12)' : 'var(--shadow-card)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    width: '100%'
  });

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
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
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
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
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
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
    <div className="dashboard-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="dashboard-action-row">
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <button type="button" className="glass-card" onClick={() => setNotificationFilter('all')} style={metricCardStyle('all')}>
          <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase' }}>Total alerts</div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px' }}>{notifications.length}</div>
        </button>
        <button type="button" className="glass-card" onClick={() => setNotificationFilter('unread')} style={metricCardStyle('unread')}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Unread</div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>{unreadCount}</div>
        </button>
        <button type="button" className="glass-card" onClick={() => setNotificationFilter('orson')} style={metricCardStyle('orson', '#3282B8')}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>Orson AI</div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>{orsonCount}</div>
        </button>
        <button type="button" className="glass-card" onClick={() => setNotificationFilter('high')} style={metricCardStyle('high', '#ef4444')}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>High priority</div>
          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '6px', color: '#ef4444' }}>{highPriorityCount}</div>
        </button>
      </div>

      {/* Filters & Tabs */}
      <div className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '16px 22px'
      }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <button 
                onClick={() => setNotificationFilter('all')}
            style={{
              padding: '12px 4px',
              background: 'none',
              border: 'none',
              borderBottom: filter === 'all' ? '2px solid var(--primary)' : '2px solid transparent',
              color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'all' ? 700 : 600,
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
              borderBottom: filter === 'unread' ? '2px solid var(--primary)' : '2px solid transparent',
              color: filter === 'unread' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'unread' ? 700 : 600,
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
              borderBottom: filter === 'orson' ? '2px solid #3282B8' : '2px solid transparent',
              color: filter === 'orson' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'orson' ? 700 : 600,
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
              borderBottom: filter === 'high' ? '2px solid #ef4444' : '2px solid transparent',
              color: filter === 'high' ? 'var(--text-primary)' : 'var(--text-faint)',
              fontWeight: filter === 'high' ? 700 : 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            High priority
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-faint)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Filter</span>
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-faint)' }}>
            <Loader2 className="animate-spin" size={40} />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="glass-card" style={{ 
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
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>
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
          filteredNotifications.map((notification) => (
            <div 
              key={notification.id}
              className="glass-card notification-item"
              style={{ 
                padding: '20px', 
                background: notification.read ? '#FFFFFF' : 'rgba(15, 76, 117, 0.02)',
                borderLeft: notification.read ? '1px solid var(--border)' : `4px solid ${notification.data?.isOrson ? '#3282B8' : 'var(--primary)'}`,
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <NotificationIcon type={notification.type} priority={notification.priority} data={notification.data} />
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h4 style={{ 
                    fontSize: '16px', 
                    fontWeight: notification.read ? 700 : 800,
                    color: notification.read ? 'var(--text-primary)' : 'var(--primary)'
                  }}>
                    {notification.title}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: 600 }}>
                    {formatTime(notification.timestamp)}
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
                    View Details
                  </button>
                )}
              </div>

              <div className="notification-actions" style={{ display: 'flex', gap: '8px', alignSelf: 'center' }}>
                {!notification.read && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                    title="Mark as read"
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
                  title="Delete"
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
          ))
        )}
      </div>

      <style jsx>{`
        .notification-item:hover {
          transform: translateX(4px);
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
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
