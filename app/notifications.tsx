import { AppAlert as Alert } from '../components/alerts/appAlert';
import { dedupeOrsonNotifications, getOrsonAlertCaption } from '../shared/orsonNotification';
// app/notifications.tsx - Updated with Clear All Button
// app/notifications.tsx - Updated with Clear All Button
import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  getDocs,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  createOfflineOperationId,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistOfflineCollection,
  requestOfflineMutationFlush,
  saveDurableMutation,
} from './services/offlineWorkspace';

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

const NOTIFICATION_PAGE_SIZE = 50;

export default function NotificationsScreen() {
  const router = useRouter();
  const { company, user } = useAuth();
  const { t } = useLanguage();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(Boolean(company?.id && user?.uid));
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const olderNotificationsRef = useRef<Notification[]>([]);

  const notificationScope = `${user?.uid ?? ''}:${company?.id ?? ''}`;
  const [previousNotificationScope, setPreviousNotificationScope] = useState(notificationScope);
  if (previousNotificationScope !== notificationScope) {
    setPreviousNotificationScope(notificationScope);
    setNotifications([]);
    setLoading(Boolean(company?.id && user?.uid));
    setHasMore(false);
    setLoadingMore(false);
    setRefreshing(false);
  }

  function getIconForType(type: string, data?: any) {
    if (data?.isOrson) return 'brain'; // Support for Orson AI icon
    switch (type) {
      case 'disease_alert': return 'warning';
      case 'feed_low_stock': return 'nutrition';
      case 'asset_overdue': return 'time';
      case 'team': return 'people';
      case 'buyer': return 'cart';
      default: return 'notifications';
    }
  }

  function getColorForType(type: string, priority?: string, data?: any) {
    if (data?.isOrson) return '#315f57'; // Orson's signature Navy
    if (type === 'disease_alert' || type === 'feed_low_stock' || type === 'asset_overdue') {
      return priority === 'high' ? '#e74c3c' : '#f39c12';
    }
    if (type === 'team') return '#315f57';
    if (type === 'buyer') return '#27AE60';
    return '#0d2137';
  }

  useEffect(() => {
    if (!company?.id || !user?.uid) {
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('companyId', '==', company.id),
      orderBy('timestamp', 'desc'),
      limit(NOTIFICATION_PAGE_SIZE),
    );

    let active = true;
    let snapshotVersion = 0;
    cursorRef.current = null;
    olderNotificationsRef.current = [];
    void loadOfflineCollectionWithMutations<Notification>(
      user.uid,
      company.id,
      'notifications',
      ['notifications'],
    ).then((cached) => {
      if (active && cached.length > 0 && snapshotVersion === 0) {
        setNotifications(cached);
        setLoading(false);
      }
    });

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
      if (snapshot.metadata.fromCache && notificationsData.length === 0) return;
      if (olderNotificationsRef.current.length === 0) {
        cursorRef.current = snapshot.docs.at(-1) || null;
        setHasMore(snapshot.size === NOTIFICATION_PAGE_SIZE);
      }
      const combinedNotifications = [
        ...notificationsData,
        ...olderNotificationsRef.current.filter((item) => !notificationsData.some((firstPageItem) => firstPageItem.id === item.id)),
      ];
      const version = ++snapshotVersion;
      void overlayOfflineMutations(combinedNotifications, user.uid, company.id, ['notifications']).then(async (next) => {
        if (!active || version !== snapshotVersion) return;
        setNotifications(next);
        setLoading(false);
        setRefreshing(false);
        await persistOfflineCollection(user.uid, company.id, 'notifications', next);
      }).catch((cacheError) => {
        console.error('Error applying pending notifications:', cacheError);
        if (active && version === snapshotVersion) {
          setNotifications(notificationsData);
          setLoading(false);
        }
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [company?.id, user?.uid]);

  const loadMore = useCallback(async () => {
    if (!company?.id || !user?.uid || !cursorRef.current || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const pageQuery = query(
        collection(db, 'notifications'),
        where('companyId', '==', company.id),
        orderBy('timestamp', 'desc'),
        startAfter(cursorRef.current),
        limit(NOTIFICATION_PAGE_SIZE),
      );
      const snapshot = await getDocs(pageQuery);
      const page = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          type: data.type || 'system',
          title: data.title || '',
          message: data.message || '',
          timestamp: data.timestamp,
          read: data.read || false,
          priority: data.priority || 'medium',
          data: data.data || {},
          icon: getIconForType(data.type, data),
          color: getColorForType(data.type, data.priority, data),
        } as Notification;
      });
      const nextPage = await overlayOfflineMutations(page, user.uid, company.id, ['notifications']);
      const existingIds = new Set(notifications.map((item) => item.id));
      const uniquePage = nextPage.filter((item) => !existingIds.has(item.id));
      olderNotificationsRef.current = [...olderNotificationsRef.current, ...uniquePage];
      const next = [...notifications, ...uniquePage];
      setNotifications(next);
      cursorRef.current = snapshot.docs.at(-1) || cursorRef.current;
      setHasMore(snapshot.size === NOTIFICATION_PAGE_SIZE);
      await persistOfflineCollection(user.uid, company.id, 'notifications', next);
    } catch (error) {
      console.error('Error loading older notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [company?.id, hasMore, loadingMore, notifications, user?.uid]);

  ;

  ;

  const markAllAsRead = async () => {
    if (!company?.id || !user?.uid) return;
    try {
      let unreadNotifications = notifications.filter((notification) => !notification.read).map(({ id }) => ({ id }));
      try {
        const unreadSnapshot = await getDocs(query(
          collection(db, 'notifications'),
          where('companyId', '==', company.id),
          where('read', '==', false),
        ));
        unreadNotifications = unreadSnapshot.docs.map((document) => ({ id: document.id }));
      } catch (lookupError) {
        console.log('Using loaded notifications while offline:', lookupError);
      }
      await Promise.all(unreadNotifications.map((notification) => saveDurableMutation({
        id: createOfflineOperationId(`notification-read-${notification.id}`),
        userId: user.uid,
        companyId: company.id,
        createdAt: Date.now(),
        kind: 'set',
        path: ['notifications', notification.id],
        data: { read: true },
        merge: true,
      }, { deferFlush: true })));
      const next = notifications.map((notification) => ({ ...notification, read: true }));
      olderNotificationsRef.current = olderNotificationsRef.current.map((notification) => ({ ...notification, read: true }));
      setNotifications(next);
      await persistOfflineCollection(user.uid, company.id, 'notifications', next);
      requestOfflineMutationFlush(user.uid, company.id);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const markNotificationAsRead = useCallback(async (notification: Notification) => {
    if (notification.read) return;
    if (!company?.id || !user?.uid) return;
    try {
      await saveDurableMutation({
        id: createOfflineOperationId(`notification-read-${notification.id}`),
        userId: user.uid,
        companyId: company.id,
        createdAt: Date.now(),
        kind: 'set',
        path: ['notifications', notification.id],
        data: { read: true },
        merge: true,
      }, { deferFlush: true });
      const next = notifications.map((item) => item.id === notification.id ? { ...item, read: true } : item);
      olderNotificationsRef.current = olderNotificationsRef.current.map((item) => item.id === notification.id ? { ...item, read: true } : item);
      setNotifications(next);
      await persistOfflineCollection(user.uid, company.id, 'notifications', next);
      requestOfflineMutationFlush(user.uid, company.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [company, user, notifications]);

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
    if (!company?.id || !user?.uid) return;
    try {
      setLoading(true);
      let notificationIds = notifications.map(({ id }) => id);
      try {
        const snapshot = await getDocs(query(
          collection(db, 'notifications'),
          where('companyId', '==', company.id),
        ));
        notificationIds = snapshot.docs.map((notification) => notification.id);
      } catch (lookupError) {
        console.log('Clearing loaded notifications while offline:', lookupError);
      }
      await Promise.all(notificationIds.map((notificationId) => saveDurableMutation({
        id: createOfflineOperationId(`notification-delete-${notificationId}`),
        userId: user.uid,
        companyId: company.id,
        createdAt: Date.now(),
        kind: 'delete',
        path: ['notifications', notificationId],
      }, { deferFlush: true })));
      setNotifications([]);
      olderNotificationsRef.current = [];
      setHasMore(false);
      await persistOfflineCollection(user.uid, company.id, 'notifications', []);
      requestOfflineMutationFlush(user.uid, company.id);
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

  const visibleNotifications = useMemo(() => dedupeOrsonNotifications(notifications), [notifications]);
  const filteredNotifications = filter === 'all'
    ? visibleNotifications
    : visibleNotifications.filter(n => !n.read);

  const unreadCount = visibleNotifications.filter(n => !n.read).length;

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

          <Text style={styles.headerTitle} numberOfLines={1}>
            {t.notifications?.title || 'Notifications'}
          </Text>

          <View style={styles.headerRightActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={markAllAsRead}
                accessibilityRole="button"
                accessibilityLabel={t.notifications?.markAllRead || 'Mark all as read'}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="checkmark-done-outline" size={22} color="#0F4C75" />
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={confirmClearAll}
                accessibilityRole="button"
                accessibilityLabel="Clear all notifications"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={22} color="#e74c3c" />
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
              <Text style={styles.timestamp}>{getOrsonAlertCaption(notification, formatTimestamp(notification.timestamp)) || formatTimestamp(notification.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} />}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator size="small" color="#0d2137" style={{ marginVertical: 20 }} />
        ) : null}
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
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d2137',
    marginLeft: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionButton: { padding: 8 },
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
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
  },
  unreadCard: { borderColor: '#BBE1FA' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 15, fontWeight: '600', color: '#0d2137', marginBottom: 2 },
  notificationMessage: { fontSize: 13, color: '#7F8C8D', lineHeight: 18 },
  timestamp: { fontSize: 11, color: '#95A5A6', marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, color: '#7F8C8D', marginTop: 12 },
});
