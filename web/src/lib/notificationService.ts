import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getOrsonNotificationPriority } from '../../../shared/orsonNotification';

export class NotificationService {
  /**
   * Create low stock alert notification
   */
  static async createLowStockNotification(
    companyId: string,
    itemName: string,
    itemType: 'feed' | 'additive',
    currentStock: number,
    reorderLevel: number,
    unit: string,
    itemId: string
  ) {
    try {
      if (!await this.shouldCreateOperationalNotification(companyId, 'feed_low_stock', itemId, 'itemId')) return;
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'feed_low_stock',
        title: `⚠️ Low Stock: ${itemName}`,
        message: `${itemName} stock is low (${currentStock.toFixed(1)} ${unit}). Reorder level is ${reorderLevel} ${unit}.`,
        timestamp: Timestamp.now(),
        read: false,
        priority: currentStock === 0 ? 'high' : currentStock < reorderLevel * 0.5 ? 'high' : 'medium',
        data: { itemId, itemName, itemType, currentStock, reorderLevel, unit },
      });
    } catch (error) {
      console.error('Error creating low stock notification:', error);
    }
  }

  static async createOverdueAssetNotification(
    companyId: string,
    assetId: string,
    assetName: string,
    holderName: string,
    expectedReturn: Date
  ) {
    try {
      if (!await this.shouldCreateOperationalNotification(companyId, 'asset_overdue', assetId, 'assetId')) return;
      await addDoc(collection(db, 'notifications'), {
        companyId,
        type: 'asset_overdue',
        title: `Overdue asset: ${assetName}`,
        message: `${assetName} was due back from ${holderName} on ${expectedReturn.toLocaleDateString()}.`,
        timestamp: Timestamp.now(),
        read: false,
        priority: 'high',
        data: { assetId, assetName, holderName, expectedReturn: expectedReturn.toISOString() },
      });
    } catch (error) {
      console.error('Error creating overdue asset notification:', error);
    }
  }

  private static async shouldCreateOperationalNotification(
    companyId: string,
    type: 'feed_low_stock' | 'asset_overdue',
    entityId: string,
    entityField: 'itemId' | 'assetId'
  ) {
    try {
      const snapshot = await getDocs(query(
        collection(db, 'notifications'),
        where('companyId', '==', companyId),
        where('type', '==', type),
        where('read', '==', false)
      ));
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return !snapshot.docs.some((notification) => {
        const data = notification.data();
        return data.data?.[entityField] === entityId
          && (data.timestamp?.toDate?.()?.getTime?.() || 0) > oneDayAgo;
      });
    } catch (error) {
      console.error('Error checking operational notification duplicate:', error);
      return true;
    }
  }

  /**
   * Create system notification
   */
  static async createSystemNotification(
    companyId: string,
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) {
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'system',
        title,
        message,
        timestamp: Timestamp.now(),
        read: false,
        priority,
        data: {},
      });
    } catch (error) {
      console.error('Error creating system notification:', error);
    }
  }

  static async createOrsonRiskNotification(
    companyId: string,
    risk: {
      pondId: string | null;
      pondName: string;
      riskId: string;
      severity: 'info' | 'watch' | 'warning' | 'critical';
      title: string;
      message: string;
      confidence: number;
    }
  ) {
    try {
      if (risk.severity !== 'warning' && risk.severity !== 'critical') return;

      const shouldCreate = await this.shouldCreateOrsonNotification(
        companyId,
        risk.pondId,
        risk.riskId
      );

      if (!shouldCreate) return;

      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'orson_risk',
        title: `Orson: ${risk.pondName} ${risk.title}`,
        message: risk.message,
        timestamp: Timestamp.now(),
        read: false,
        priority: getOrsonNotificationPriority(risk.severity, risk.riskId),
        isOrson: true,
        icon: 'brain-circuit',
        data: {
          isOrson: true,
          pondId: risk.pondId,
          pondName: risk.pondName,
          riskId: risk.riskId,
          severity: risk.severity,
          confidence: risk.confidence,
        },
      });
    } catch (error) {
      console.error('Error creating Orson risk notification:', error);
    }
  }

  private static async shouldCreateOrsonNotification(
    companyId: string,
    pondId: string | null,
    riskId: string
  ): Promise<boolean> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('companyId', '==', companyId),
        where('type', '==', 'orson_risk'),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const hasRecent = snapshot.docs.some((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.();
        return data.data?.pondId === pondId
          && data.data?.riskId === riskId
          && timestamp
          && timestamp > oneDayAgo;
      });

      return !hasRecent;
    } catch (error) {
      console.error('Error checking Orson notification duplicate:', error);
      return true;
    }
  }






}

export default NotificationService;
