"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  MoreVertical,
  Check,
  ChevronRight,
  Loader2,
  BrainCircuit
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useLanguage } from '@/contexts/LanguageContext';

/* ─── Types ─────────────────────────────────────────────────── */

interface Notification {
  id: string;
  type: 'disease_alert' | 'feed_low_stock' | 'asset_overdue' | 'system' | 'team' | 'buyer';
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  data?: {
    isOrson?: boolean;
    [key: string]: any;
  };
}

/* ─── Components ─────────────────────────────────────────────── */

const NotificationIcon = ({ type, priority, data }: { type: string, priority: string, data?: any }) => {
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        onSnapshot(doc(db, 'users', user.uid), (uDoc) => {
          if (uDoc.exists()) {
            const cid = uDoc.data().companyId;
            setCompanyId(cid);
            
            if (cid) {
              const q = query(
                collection(db, 'notifications'),
                where('companyId', '==', cid),
                orderBy('timestamp', 'desc')
              );
              
              const unsubNotifs = onSnapshot(q, (snapshot) => {
                const notifData = snapshot.docs.map(doc => ({ 
                  id: doc.id, 
                  ...doc.data() 
                } as Notification));
                setNotifications(notifData);
                setLoading(false);
              }, (error) => {
                console.error("Error fetching notifications:", error);
                setLoading(false);
              });
              
              return () => unsubNotifs();
            } else {
              setLoading(false);
            }
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

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

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t.notifications.justNow || 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.notifications.minutesAgo || 'm ago'}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.notifications.hoursAgo || 'h ago'}`;
    return `${Math.floor(diffInSeconds / 86400)}${t.notifications.daysAgo || 'd ago'}`;
  };

  if (!mounted) return null;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', letterSpacing: '-0.03em' }}>
            {t.notifications.title || 'Notifications'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {notifications.filter(n => !n.read).length} {t.notifications.unread?.toLowerCase() || 'unread'} alerts requiring your attention.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={markAllAsRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="btn-secondary" 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              opacity: notifications.filter(n => !n.read).length === 0 ? 0.5 : 1,
              cursor: notifications.filter(n => !n.read).length === 0 ? 'default' : 'pointer'
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
      </div>

      {/* Filters & Tabs */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '2px'
      }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <button 
            onClick={() => setFilter('all')}
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
            onClick={() => setFilter('unread')}
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
            {notifications.filter(n => !n.read).length > 0 && (
              <span style={{ 
                background: 'var(--primary)', 
                color: '#FFF', 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
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
              {filter === 'unread' ? (t.notifications.noUnread || 'No unread notifications') : (t.notifications.noNotifications || 'No notifications yet')}
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
                
                {notification.data?.reportId && (
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
