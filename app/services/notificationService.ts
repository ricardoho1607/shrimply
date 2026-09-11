// services/notificationService.ts - With Enhanced Debug Logging
import { db } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { getOrsonNotificationPriority } from '../../shared/orsonNotification';

export class NotificationService {
  /**
   * Create low stock alert notification for feed/additives
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
      console.log('📦 Creating low stock notification for:', itemName);
      
      // Check if there's already an unread notification for this item in the last 24 hours
      const shouldCreate = await this.shouldCreateNotification(
        companyId,
        'feed_low_stock',
        itemId
      );
      
      if (!shouldCreate) {
        console.log('⏭️ Skipping duplicate low stock notification');
        return;
      }

      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'feed_low_stock',
        title: `⚠️ Low Stock: ${itemName}`,
        message: `${itemName} stock is low (${currentStock.toFixed(1)} ${unit}). Reorder level is ${reorderLevel} ${unit}. Consider restocking soon.`,
        timestamp: Timestamp.now(),
        read: false,
        priority: currentStock === 0 ? 'high' : currentStock < reorderLevel * 0.5 ? 'high' : 'medium',
        data: {
          itemId,
          itemName,
          itemType,
          currentStock,
          reorderLevel,
          unit,
        },
      });
      
      console.log(`✅ Created low stock notification for ${itemName}`);
    } catch (error) {
      console.error('❌ Error creating low stock notification:', error);
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

      if (!shouldCreate) {
        console.log('⏭️ Skipping duplicate Orson risk notification');
        return;
      }

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
      
      console.log(`✅ Created Orson risk notification for ${risk.pondName}`);
    } catch (error) {
      console.error('❌ Error creating Orson risk notification:', error);
    }
  }
  
  /**
   * Create overdue asset return notification
   */
  static async createOverdueAssetNotification(
    companyId: string,
    assetName: string,
    assetId: string,
    holder: string,
    expectedReturn: Date,
    daysOverdue: number
  ) {
    try {
      console.log('⏰ Creating overdue asset notification for:', assetName);
      
      // Check if there's already an unread notification for this asset in the last 24 hours
      const shouldCreate = await this.shouldCreateNotification(
        companyId,
        'asset_overdue',
        assetId
      );
      
      if (!shouldCreate) {
        console.log('⏭️ Skipping duplicate overdue asset notification');
        return;
      }

      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'asset_overdue',
        title: `⏰ Overdue Return: ${assetName}`,
        message: `${assetName} (held by ${holder}) was due back on ${expectedReturn.toLocaleDateString()} - now ${daysOverdue} day(s) overdue. Please follow up on the return.`,
        timestamp: Timestamp.now(),
        read: false,
        priority: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
        data: {
          assetId,
          assetName,
          holder,
          expectedReturn: expectedReturn.toISOString(),
          daysOverdue,
        },
      });
      
      console.log(`✅ Created overdue asset notification for ${assetName}`);
    } catch (error) {
      console.error('❌ Error creating overdue asset notification:', error);
    }
  }
  
  /**
   * Check if we should create a notification (prevents duplicates)
   */
  private static async shouldCreateNotification(
    companyId: string,
    type: 'feed_low_stock' | 'asset_overdue',
    itemId: string
  ): Promise<boolean> {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('companyId', '==', companyId),
        where('type', '==', type),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      // Check if there's a recent unread notification for this specific item
      const hasRecent = snapshot.docs.some(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        const dataItemId = type === 'feed_low_stock' ? data.data?.itemId : data.data?.assetId;
        
        return dataItemId === itemId && 
               timestamp && 
               timestamp > oneDayAgo;
      });
      
      return !hasRecent;
    } catch (error) {
      console.error('Error checking for existing notifications:', error);
      return true; // If check fails, allow notification creation
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
      const hasRecent = snapshot.docs.some(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.();
        return data.data?.pondId === pondId
          && data.data?.riskId === riskId
          && timestamp
          && timestamp > oneDayAgo;
      });
      
      return !hasRecent;
    } catch (error) {
      console.error('Error checking Orson notification duplicates:', error);
      return true;
    }
  }
  
  /**
   * Determine notification priority based on distance and severity
   */

  
  /**
   * Generate disease alert title
   */

  
  /**
   * Generate disease alert message
   */

  
  /**
   * Create a system notification
   */
  static async createSystemNotification(
    companyId: string,
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) {
    try {
      console.log('📢 Creating system notification');
      console.log('Company ID:', companyId);
      console.log('Title:', title);
      
      const notificationsRef = collection(db, 'notifications');
      const docRef = await addDoc(notificationsRef, {
        companyId,
        type: 'system',
        title,
        message,
        timestamp: Timestamp.now(),
        read: false,
        priority,
        data: {},
      });
      
      console.log('✅ System notification created:', docRef.id);
    } catch (error) {
      console.error('❌ Error creating system notification:', error);
      throw error;
    }
  }
  
  /**
   * Create a team notification
   */
  static async createTeamNotification(
    companyId: string,
    title: string,
    message: string,
    data: any = {}
  ) {
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'team',
        title,
        message,
        timestamp: Timestamp.now(),
        read: false,
        priority: 'medium',
        data,
      });
    } catch (error) {
      console.error('Error creating team notification:', error);
    }
  }
  
  /**
   * Create a buyer notification
   */
  static async createBuyerNotification(
    companyId: string,
    title: string,
    message: string,
    data: any = {}
  ) {
    try {
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        companyId,
        type: 'buyer',
        title,
        message,
        timestamp: Timestamp.now(),
        read: false,
        priority: 'medium',
        data,
      });
    } catch (error) {
      console.error('Error creating buyer notification:', error);
    }
  }
}

export default NotificationService;
