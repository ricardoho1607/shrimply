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
import { calculateDistance } from '../../app/utils/locationUtils';

interface DiseaseReportData {
  companyId: string;
  companyName: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  diseaseType: string;
  diseaseName: string;
  severity: string;
  notificationRadius: number;
  reportDate: any;
}

export class NotificationService {
  /**
   * Create disease alert notifications for all companies within radius
   */
  static async createDiseaseAlertNotifications(reportData: DiseaseReportData, reportId: string) {
    try {
      console.log('🚨 === CREATING DISEASE ALERT NOTIFICATIONS ===');
      console.log('Report ID:', reportId);
      console.log('Report Location:', reportData.location);
      console.log('Notification Radius:', reportData.notificationRadius, 'km');
      console.log('Reporting Company ID:', reportData.companyId);
      
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);
      
      console.log('📊 Total companies in database:', companiesSnapshot.size);
      
      const notificationsToCreate: any[] = [];
      let companiesProcessed = 0;
      let companiesWithLocation = 0;
      let companiesWithinRadius = 0;
      let companiesSkipped = 0;
      
      companiesSnapshot.forEach((doc) => {
        companiesProcessed++;
        const companyData = doc.data();
        
        console.log(`\n--- Processing Company ${companiesProcessed}/${companiesSnapshot.size} ---`);
        console.log('Company ID:', doc.id);
        console.log('Company Name:', companyData.companyName);
        
        // Skip the reporting company
        if (doc.id === reportData.companyId) {
          console.log('⏭️ Skipping: This is the reporting company');
          companiesSkipped++;
          return;
        }
        
        // Check if company has valid location
        if (!companyData.primaryLocation) {
          console.log('❌ Skipping: No primaryLocation field');
          return;
        }
        
        if (typeof companyData.primaryLocation === 'string') {
          console.log('❌ Skipping: primaryLocation is a string');
          return;
        }
        
        if (!companyData.primaryLocation.latitude || !companyData.primaryLocation.longitude) {
          console.log('❌ Skipping: Missing latitude or longitude');
          console.log('Location data:', companyData.primaryLocation);
          return;
        }
        
        companiesWithLocation++;
        console.log('✅ Company has valid location:', {
          lat: companyData.primaryLocation.latitude,
          lng: companyData.primaryLocation.longitude,
          address: companyData.primaryLocation.address,
        });
        
        // Calculate distance
        const distance = calculateDistance(
          {
            latitude: reportData.location.latitude,
            longitude: reportData.location.longitude,
          } as any,
          {
            latitude: companyData.primaryLocation.latitude,
            longitude: companyData.primaryLocation.longitude,
          } as any
        );
        
        console.log('📏 Distance calculated:', distance.toFixed(2), 'km');
        console.log('Notification radius:', reportData.notificationRadius, 'km');
        
        // Check if within notification radius
        if (distance <= reportData.notificationRadius) {
          companiesWithinRadius++;
          console.log('✅ Within radius! Creating notification...');
          
          const priority = this.getPriorityByDistanceAndSeverity(distance, reportData.severity);
          
          const notification = {
            companyId: doc.id,
            type: 'disease_alert',
            title: this.getDiseaseAlertTitle(reportData.diseaseName, distance),
            message: this.getDiseaseAlertMessage(reportData.companyName, reportData.location.address, distance),
            timestamp: Timestamp.now(),
            read: false,
            priority,
            data: {
              reportId,
              diseaseType: reportData.diseaseType,
              distance: parseFloat(distance.toFixed(1)),
              severity: reportData.severity,
              location: reportData.location.address,
              reporterCompany: reportData.companyName,
            },
          };
          
          console.log('📝 Notification prepared:', {
            companyId: notification.companyId,
            type: notification.type,
            title: notification.title,
            priority: notification.priority,
          });
          
          notificationsToCreate.push(notification);
        } else {
          console.log('⏭️ Outside radius: Distance', distance.toFixed(2), 'km >', reportData.notificationRadius, 'km');
        }
      });
      
      console.log('\n📊 === PROCESSING SUMMARY ===');
      console.log('Total companies processed:', companiesProcessed);
      console.log('Companies skipped (reporting company):', companiesSkipped);
      console.log('Companies with valid location:', companiesWithLocation);
      console.log('Companies within radius:', companiesWithinRadius);
      console.log('Notifications to create:', notificationsToCreate.length);
      
      if (notificationsToCreate.length === 0) {
        console.log('⚠️ No notifications to create');
        return 0;
      }
      
      console.log('\n💾 === SAVING NOTIFICATIONS TO FIRESTORE ===');
      const notificationsRef = collection(db, 'notifications');
      
      const results = await Promise.all(
        notificationsToCreate.map(async (notification, index) => {
          try {
            const docRef = await addDoc(notificationsRef, notification);
            console.log(`✅ Notification ${index + 1}/${notificationsToCreate.length} saved:`, docRef.id);
            return docRef;
          } catch (error) {
            console.error(`❌ Failed to save notification ${index + 1}:`, error);
            throw error;
          }
        })
      );
      
      console.log(`\n✅ === SUCCESS: Created ${results.length} disease alert notifications ===\n`);
      return results.length;
      
    } catch (error: any) {
      console.error('❌ === ERROR IN createDiseaseAlertNotifications ===');
      console.error('Error:', error);
      console.error('Error stack:', error?.stack);
      throw error;
    }
  }
  
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
  
  /**
   * Determine notification priority based on distance and severity
   */
  private static getPriorityByDistanceAndSeverity(distance: number, severity: string): 'high' | 'medium' | 'low' {
    if (severity === 'critical' || distance < 10) {
      return 'high';
    }
    
    if (severity === 'high' || distance < 25) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Generate disease alert title
   */
  private static getDiseaseAlertTitle(diseaseName: string, distance: number): string {
    if (distance < 10) {
      return `⚠️ Disease Alert: ${diseaseName} Nearby`;
    } else if (distance < 25) {
      return `Disease Alert: ${diseaseName} Detected`;
    } else {
      return `Disease Notice: ${diseaseName} in Region`;
    }
  }
  
  /**
   * Generate disease alert message
   */
  private static getDiseaseAlertMessage(companyName: string, location: string, distance: number): string {
    return `${companyName} reported a disease outbreak ${distance.toFixed(1)} km from your location (${location}). Review biosecurity measures and monitor your ponds closely.`;
  }
  
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