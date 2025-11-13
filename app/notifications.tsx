// app/notifications.tsx - Android Optimized
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ScrollView, ActivityIndicator, RefreshControl, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  updateDoc,
  doc,
} from 'firebase/firestore';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface Notification {
  id: string;
  type: 'disease_alert' | 'system' | 'team' | 'buyer' | 'feed_low_stock' | 'asset_overdue';
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  data?: {
    reportId?: string;
    diseaseType?: string;
    distance?: number;
    severity?: string;
    location?: string;
    itemId?: string;
    itemName?: string;
    itemType?: 'feed' | 'additive';
    currentStock?: number;
    reorderLevel?: number;
    unit?: string;
    assetId?: string;
    assetName?: string;
    holder?: string;
    expectedReturn?: string;
    daysOverdue?: number;
  };
  icon: string;
  color: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    console.log('\n🔔 === NOTIFICATIONS SCREEN MOUNTED ===');
    console.log('👤 User ID:', user?.id);
    console.log('🏢 Company ID:', company?.id);
    
    if (!company?.id) {
      console.error('❌ No company ID available!');
      setLoading(false);
      return;
    }

    console.log('📡 Setting up Firestore listener...');

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('companyId', '==', company.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        console.log('\n📬 Snapshot received:', snapshot.size, 'documents');
        
        const notificationsData: Notification[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          notificationsData.push({
            id: doc.id,
            type: data.type || 'system',
            title: data.title || '',
            message: data.message || '',
            timestamp: data.timestamp,
            read: data.read || false,
            priority: data.priority || 'medium',
            data: data.data || {},
            icon: getIconForType(data.type),
            color: getColorForType(data.type, data.priority),
          });
        });
        
        console.log('✅ Processed', notificationsData.length, 'notifications');
        
        setNotifications(notificationsData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('❌ Error:', error.message);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      console.log('🧹 Cleaning up listener');
      unsubscribe();
    };
  }, [company?.id]);

  const getIconForType = (type: string): string => {
    switch (type) {
      case 'disease_alert': return 'warning';
      case 'feed_low_stock': return 'nutrition';
      case 'asset_overdue': return 'time';
      case 'team': return 'people';
      case 'buyer': return 'cart';
      default: return 'notifications';
    }
  };

  const getColorForType = (type: string, priority?: string): string => {
    if (type === 'disease_alert') {
      if (priority === 'high') return '#e74c3c';
      if (priority === 'medium') return '#f39c12';
      return '#f1c40f';
    }
    if (type === 'feed_low_stock') {
      if (priority === 'high') return '#e74c3c';
      return '#f39c12';
    }
    if (type === 'asset_overdue') {
      if (priority === 'high') return '#e74c3c';
      if (priority === 'medium') return '#f39c12';
      return '#3498db';
    }
    if (type === 'team') return '#3282B8';
    if (type === 'buyer') return '#27AE60';
    return '#0F4C75';
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.notifications?.justNow || 'Just now';
    if (diffMins < 60) return `${diffMins}${t.notifications?.minutesAgo || 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${t.notifications?.hoursAgo || 'h ago'}`;
    if (diffDays < 7) return `${diffDays}${t.notifications?.daysAgo || 'd ago'}`;
    
    return date.toLocaleDateString();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('📖 Marking as read:', notificationId);
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('❌ Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📖 Marking all as read...');
      const unreadNotifications = notifications.filter(n => !n.read);
      
      await Promise.all(
        unreadNotifications.map(n => 
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        )
      );
      
      console.log('✅ All marked as read');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('👆 Notification pressed:', notification.type);
    markAsRead(notification.id);
    
    if (notification.type === 'disease_alert' && notification.data?.reportId) {
      router.push('/disease-report');
    } else if (notification.type === 'feed_low_stock') {
      router.push('/inventory/feedAdditives');
    } else if (notification.type === 'asset_overdue') {
      router.push('/inventory/assetInventory');
    }
  };

  const onRefresh = () => {
    console.log('🔄 Refresh');
    setRefreshing(true);
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.read && styles.unreadCard
      ]}
      onPress={() => handleNotificationPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${notification.color}20` }]}>
        <Ionicons name={notification.icon as any} size={Platform.OS === 'android' ? 20 : 24} color={notification.color} />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.title}
          </Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        
        {/* Feed Low Stock specific info */}
        {notification.type === 'feed_low_stock' && notification.data?.currentStock !== undefined && (
          <View style={styles.detailBadge}>
            <Ionicons name="analytics" size={Platform.OS === 'android' ? 10 : 12} color="#e74c3c" />
            <Text style={styles.detailText}>
              {notification.data.currentStock.toFixed(1)} / {notification.data.reorderLevel} {notification.data.unit}
            </Text>
          </View>
        )}
        
        {/* Asset Overdue specific info */}
        {notification.type === 'asset_overdue' && notification.data?.daysOverdue && (
          <View style={styles.detailBadge}>
            <Ionicons name="alert-circle" size={Platform.OS === 'android' ? 10 : 12} color="#e74c3c" />
            <Text style={styles.detailText}>
              {notification.data.daysOverdue} day(s) overdue • {notification.data.holder}
            </Text>
          </View>
        )}
        
        {/* Disease Alert distance */}
        {notification.data?.distance && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={Platform.OS === 'android' ? 10 : 12} color="#0F4C75" />
            <Text style={styles.distanceText}>
              {notification.data.distance.toFixed(1)} km {t.notifications?.fromYou || 'from you'}
            </Text>
          </View>
        )}
        
        <Text style={styles.timestamp}>
          {formatTimestamp(notification.timestamp)}
        </Text>
      </View>

      {notification.priority === 'high' && (
        <View style={styles.priorityBadge}>
          <Ionicons name="alert-circle" size={Platform.OS === 'android' ? 14 : 16} color="#e74c3c" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#1B262C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.notifications?.title || 'Notifications'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F4C75" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#1B262C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.notifications?.title || 'Notifications'}</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>{t.notifications?.markAllRead || 'Mark all'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            {t.notifications?.all || 'All'} ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            {t.notifications?.unread || 'Unread'} ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0F4C75']} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={Platform.OS === 'android' ? 56 : 64} color="#BBE1FA" />
            <Text style={styles.emptyTitle}>
              {filter === 'all' 
                ? t.notifications?.noNotifications || 'No notifications yet'
                : t.notifications?.noUnread || 'No unread notifications'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t.notifications?.emptyMessage || "You'll be notified about important updates"}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: '#BBE1FA',
  },
  backButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '700',
    color: '#1B262C',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: Platform.OS === 'android' ? 36 : 40,
  },
  markAllButton: {
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
  },
  markAllText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    fontWeight: '600',
    color: '#0F4C75',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: '#BBE1FA',
    gap: Platform.OS === 'android' ? 10 : 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderRadius: Platform.OS === 'android' ? 6 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  filterTextActive: {
    color: '#0F4C75',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 10 : 12,
  },
  loadingText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    color: '#7F8C8D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'android' ? 14 : 16,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: Platform.OS === 'android' ? 3 : 4,
    borderLeftColor: '#0F4C75',
  },
  iconContainer: {
    width: Platform.OS === 'android' ? 42 : 48,
    height: Platform.OS === 'android' ? 42 : 48,
    borderRadius: Platform.OS === 'android' ? 21 : 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Platform.OS === 'android' ? 10 : 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '600',
    color: '#1B262C',
    flex: 1,
  },
  unreadDot: {
    width: Platform.OS === 'android' ? 7 : 8,
    height: Platform.OS === 'android' ? 7 : 8,
    borderRadius: 4,
    backgroundColor: '#0F4C75',
    marginLeft: Platform.OS === 'android' ? 6 : 8,
  },
  notificationMessage: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    color: '#7F8C8D',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  detailText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#0F4C75',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#95A5A6',
  },
  priorityBadge: {
    marginLeft: Platform.OS === 'android' ? 6 : 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'android' ? 50 : 60,
  },
  emptyTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    color: '#1B262C',
    marginTop: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  emptySubtitle: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});