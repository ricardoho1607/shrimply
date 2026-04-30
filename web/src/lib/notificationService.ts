import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { calculateDistance } from '@/utils/locationUtils';

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
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);
      
      const notificationsToCreate: any[] = [];
      
      companiesSnapshot.forEach((doc) => {
        const companyData = doc.data();
        
        // Skip the reporting company
        if (doc.id === reportData.companyId) return;
        
        // Check if company has valid location
        if (!companyData.primaryLocation || typeof companyData.primaryLocation === 'string') return;
        if (!companyData.primaryLocation.latitude || !companyData.primaryLocation.longitude) return;
        
        // Calculate distance
        const distance = calculateDistance(
          {
            latitude: reportData.location.latitude,
            longitude: reportData.location.longitude,
          },
          {
            latitude: companyData.primaryLocation.latitude,
            longitude: companyData.primaryLocation.longitude,
          }
        );
        
        // Check if within notification radius
        if (distance <= reportData.notificationRadius) {
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
          
          notificationsToCreate.push(notification);
        }
      });
      
      if (notificationsToCreate.length === 0) return 0;
      
      const notificationsRef = collection(db, 'notifications');
      const results = await Promise.all(
        notificationsToCreate.map(async (notification) => {
          return await addDoc(notificationsRef, notification);
        })
      );
      
      return results.length;
    } catch (error) {
      console.error('Error in createDiseaseAlertNotifications:', error);
      throw error;
    }
  }
  
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

  private static getPriorityByDistanceAndSeverity(distance: number, severity: string): 'high' | 'medium' | 'low' {
    if (severity === 'critical' || distance < 10) return 'high';
    if (severity === 'high' || distance < 25) return 'medium';
    return 'low';
  }

  private static getDiseaseAlertTitle(diseaseName: string, distance: number): string {
    if (distance < 10) return `⚠️ Disease Alert: ${diseaseName} Nearby`;
    if (distance < 25) return `Disease Alert: ${diseaseName} Detected`;
    return `Disease Notice: ${diseaseName} in Region`;
  }

  private static getDiseaseAlertMessage(companyName: string, location: string, distance: number): string {
    return `${companyName} reported a disease outbreak ${distance.toFixed(1)} km from your location (${location}). Review biosecurity measures.`;
  }
}

export default NotificationService;
