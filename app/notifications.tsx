// app/notifications.tsx - Updated with Clear All Button
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ActivityIndicator, FlatList, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  writeBatch,
} from 'firebase/firestore';

interface Notification {
  id: string;
  type: 'disease_alert' | 'system' | 'team' | 'buyer' | 'feed_low_stock' | 'asset_overdue' | 'orson_risk' | 'orson_daily_brief' | 'inventory_forecast' | 'orson_biosecurity';
  title: string;
  message: string;
  timestamp: any;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  data?: any;
  icon: string;
  color: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { company } = useAuth();
  const { t } = useLanguage();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('companyId', '==', company.id),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
          icon: getIconForType(data.type, data),
          color: getColorForType(data.type, data.priority, data),
        });
      });
      setNotifications(notificationsData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [company?.id]);

  const getIconForType = (type: string, data?: any) => {
    if (data?.isOrson) return 'brain'; // Support for Orson AI icon
    switch (type) {
      case 'disease_alert': return 'warning';
      case 'feed_low_stock': return 'nutrition';
      case 'asset_overdue': return 'time';
      case 'team': return 'people';
      case 'buyer': return 'cart';
      default: return 'notifications';
    }
  };

  const getColorForType = (type: string, priority?: string, data?: any) => {
    if (data?.isOrson) return '#315f57'; // Orson's signature Navy
    if (type === 'disease_alert' || type === 'feed_low_stock' || type === 'asset_overdue') {
      return priority === 'high' ? '#e74c3c' : '#f39c12';
    }
    if (type === 'team') return '#315f57';
    if (type === 'buyer') return '#27AE60';
    return '#0d2137';
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const batch = writeBatch(db);
      unreadNotifications.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markNotificationAsRead = async (notification: Notification) => {
    if (notification.read) return;
    try {
      await updateDoc(doc(db, 'notifications', notification.id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // NEW: CLEAR ALL FUNCTION
  const confirmClearAll = () => {
    if (notifications.length === 0) return;
    
    Alert.alert(
      t.notifications?.clearAllTitle || "Clear All",
      t.notifications?.clearAllMessage || "Are you sure you want to delete all notifications?",
      [
        { text: t.common?.cancel || "Cancel", style: "cancel" },
        { 
          text: t.common?.delete || "Delete", 
          style: "destructive", 
          onPress: deleteAllNotifications 
        }
      ]
    );
  };

  const deleteAllNotifications = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
    } catch {
      Alert.alert("Error", "Could not delete notifications");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer} pointerEvents="none">
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t.notifications?.title || 'Notifications'}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            {notifications.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={confirmClearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all notifications"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={22} color="#e74c3c" />
              </TouchableOpacity>
            )}
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                <Text style={styles.markAllText}>{t.notifications?.markAllRead || 'Read'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

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

      <FlatList
        style={styles.scrollView}
        data={loading ? [] : filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item: notification }) => (
          <TouchableOpacity
            style={[styles.notificationCard, !notification.read && styles.unreadCard]}
            onPress={() => markNotificationAsRead(notification)}
          >
             <View style={[styles.iconContainer, { backgroundColor: `${notification.color}20` }]}>
              <Ionicons name={notification.icon as any} size={22} color={notification.color} />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(notification.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
        ListHeaderComponent={loading ? (
           <ActivityIndicator size="large" color="#0d2137" style={{ marginTop: 50 }} />
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#dce8f2" />
            <Text style={styles.emptyTitle}>{t.notifications?.noNotifications || 'Clear skies!'}</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#dce8f2',
  },
  backButton: { padding: 8, marginLeft: -4, zIndex: 1 },
  headerTitleContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 96,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d2137',
    textAlign: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    zIndex: 1,
  },
  clearButton: {
    padding: 6,
  },
  markAllButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d2137',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#dce8f2',
    gap: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
  },
  filterTabActive: { backgroundColor: '#FFFFFF' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
  filterTextActive: { color: '#0d2137' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#0d2137' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: '#0d2137', marginBottom: 2 },
  notificationMessage: { fontSize: 13, color: '#7F8C8D', lineHeight: 18 },
  timestamp: { fontSize: 11, color: '#95A5A6', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, color: '#7F8C8D', marginTop: 12 },
});
