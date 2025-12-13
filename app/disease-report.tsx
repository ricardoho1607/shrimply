// app/disease-report.tsx - Complete Fixed Version
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
  Dimensions, Platform, PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as Location from 'expo-location';
import { calculateDistance } from './utils/locationUtils';
import { db } from '../config/firebase';
import { 
  collection, addDoc, query, where, onSnapshot, orderBy,
  Timestamp, updateDoc, doc,
} from 'firebase/firestore';
import NotificationService from './services/notificationService';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface DiseaseReport {
  id: string;
  companyId: string;
  companyName: string;
  reporterName: string;
  location: { address: string; latitude: number; longitude: number };
  diseaseType: string;
  diseaseName: string;
  severity: string;
  color: string;
  affectedPonds: number;
  estimatedLoss: string;
  symptoms: string;
  actionsTaken: string;
  reportDate: string;
  status: 'active' | 'contained' | 'resolved';
  notificationRadius: number;
}

const NOTIFICATION_RADIUS = [10, 25, 50, 100];

export default function DiseaseReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);
  
  const DISEASE_TYPES = [
    { id: 'wssv', name: t?.diseaseReport?.wssv || 'WSSV', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
    { id: 'ems', name: t?.diseaseReport?.ems || 'EMS', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
    { id: 'vibrio', name: t?.diseaseReport?.vibrio || 'Vibrio', severity: 'high', icon: 'warning', color: '#f39c12' },
    { id: 'ihhnv', name: t?.diseaseReport?.ihhnv || 'IHHNV', severity: 'high', icon: 'warning', color: '#f39c12' },
    { id: 'yellowhead', name: t?.diseaseReport?.yellowhead || 'Yellowhead', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
    { id: 'taura', name: t?.diseaseReport?.taura || 'Taura', severity: 'high', icon: 'warning', color: '#f39c12' },
    { id: 'bacterial', name: t?.diseaseReport?.bacterial || 'Bacterial', severity: 'medium', icon: 'medical', color: '#f1c40f' },
    { id: 'fungal', name: t?.diseaseReport?.fungal || 'Fungal', severity: 'medium', icon: 'medical', color: '#f1c40f' },
    { id: 'parasitic', name: t?.diseaseReport?.parasitic || 'Parasitic', severity: 'medium', icon: 'bug', color: '#f1c40f' },
    { id: 'other', name: t?.diseaseReport?.otherDisease || 'Other', severity: 'medium', icon: 'help-circle', color: '#f1c40f' },
  ];
  
  // SET DEFAULT LOCATION IMMEDIATELY - Don't leave it null!
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: -6.2088,  // Jakarta default
    longitude: 106.8456,
  });
  const [reports, setReports] = useState<DiseaseReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DiseaseReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    selectedDisease: '',
    affectedPonds: '',
    estimatedLoss: '',
    symptoms: '',
    actionsTaken: '',
    notificationRadius: 50,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initialize = async () => {
      try {
        await getCurrentLocation();
        unsubscribe = loadReports();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize. Please try again.');
      }
    };
    
    initialize();
    
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, []);

  const requestAndroidLocationPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to show disease reports near you.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Android permission error:', err);
      return false;
    }
  };

  const setFallbackLocation = () => {
    console.log('🔄 Setting fallback location...');
    console.log('Company data:', company);
    
    let fallbackLat = -6.2088;  // Jakarta default
    let fallbackLng = 106.8456;
    
    // Try to use company location if available
    if (company?.primaryLocation && typeof company.primaryLocation !== 'string') {
      if (company.primaryLocation.latitude && company.primaryLocation.longitude) {
        fallbackLat = company.primaryLocation.latitude;
        fallbackLng = company.primaryLocation.longitude;
        console.log('✅ Using company location:', fallbackLat, fallbackLng);
      }
    }
    
    // ALWAYS set a location - never leave it null
    setCurrentLocation({
      latitude: fallbackLat,
      longitude: fallbackLng,
    });
    console.log('✅ Fallback location set:', fallbackLat, fallbackLng);
  };

  const getCurrentLocation = async () => {
    try {
      console.log('🗺️ Requesting location permissions...');
      
      if (!Location) {
        throw new Error('Location module not available');
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Location permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Location permission not granted:', status);
        setFallbackLocation();
        return;
      }

      if (Platform.OS === 'android') {
        const hasPermission = await requestAndroidLocationPermission();
        if (!hasPermission) {
          console.log('❌ Android location permission denied');
          setFallbackLocation();
          return;
        }
      }

      console.log('🔄 Getting current position...');
      
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Location timeout')), 10000)
      );
      
      const location = await Promise.race([locationPromise, timeoutPromise]) as any;
      
      const userLocation = { 
        latitude: location.coords.latitude, 
        longitude: location.coords.longitude 
      };
      console.log('✅ Location obtained:', userLocation);
      setCurrentLocation(userLocation);
      
      setTimeout(() => {
        if (mapReady && mapRef.current) {
          try {
            mapRef.current.animateToRegion({ 
              ...userLocation, 
              latitudeDelta: 0.5, 
              longitudeDelta: 0.5 
            }, 1000);
          } catch (err) {
            console.error('Map animation error:', err);
          }
        }
      }, 500);
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setFallbackLocation();
    }
  };

  const loadReports = (): (() => void) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'diseaseReports'),
        orderBy('reportDate', 'desc')
      );
      
      const unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          try {
            const reportsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                reportDate: data.reportDate?.toDate ? data.reportDate.toDate().toISOString() : data.reportDate,
              } as DiseaseReport;
            });
            setReports(reportsData);
            setLoading(false);
          } catch (err) {
            console.error('Error processing reports:', err);
            setReports([]);
            setLoading(false);
          }
        }, 
        (error) => {
          console.error('Error loading reports:', error);
          Alert.alert(
            t?.diseaseReport?.submitError || 'Error',
            t?.diseaseReport?.failedToLoad || 'Failed to load reports'
          );
          setLoading(false);
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error('Error setting up reports listener:', error);
      Alert.alert(
        t?.diseaseReport?.submitError || 'Error',
        error.message || t?.diseaseReport?.failedToLoad || 'Failed to load reports'
      );
      setLoading(false);
      return () => {};
    }
  };

  const handleSubmitReport = async () => {
    const { selectedDisease, symptoms, notificationRadius } = formData;
    
    if (!selectedDisease) {
      Alert.alert(
        t?.diseaseReport?.submitError || 'Error',
        t?.diseaseReport?.selectDiseaseType || 'Please select a disease type'
      );
      return;
    }
    if (!symptoms.trim()) {
      Alert.alert(
        t?.diseaseReport?.submitError || 'Error',
        t?.diseaseReport?.describeSymptomsError || 'Please describe the symptoms'
      );
      return;
    }
    if (!currentLocation) {
      Alert.alert(
        t?.diseaseReport?.submitError || 'Error',
        t?.diseaseReport?.locationError || 'Location not available'
      );
      return;
    }

    Alert.alert(
      t?.diseaseReport?.confirmReport || 'Confirm Report',
      (t?.diseaseReport?.confirmReportMessage || 'This will alert farms within {radius} km')
        .replace('{radius}', notificationRadius.toString()),
      [
        { text: t?.CreateBuyerListingScreen?.cancel || 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: submitReport,
        },
      ]
    );
  };

  const submitReport = async () => {
    try {
      setLoading(true);
      const diseaseInfo = DISEASE_TYPES.find(d => d.id === formData.selectedDisease);
      const locationAddress = company?.primaryLocation && typeof company.primaryLocation !== 'string'
        ? company.primaryLocation.address
        : t?.diseaseReport?.yourLocation || 'Your Location';
      
      const reportData = {
        companyId: company?.id || '',
        companyName: company?.companyName || 'Unknown Farm',
        reporterName: user?.name || 'Anonymous',
        reporterEmail: user?.email || '',
        location: { address: locationAddress, ...currentLocation! },
        diseaseType: formData.selectedDisease,
        diseaseName: diseaseInfo?.name || '',
        severity: diseaseInfo?.severity || 'medium',
        color: diseaseInfo?.color || '#f1c40f',
        affectedPonds: parseInt(formData.affectedPonds) || 0,
        estimatedLoss: formData.estimatedLoss,
        symptoms: formData.symptoms,
        actionsTaken: formData.actionsTaken,
        reportDate: Timestamp.now(),
        status: 'active' as const,
        notificationRadius: formData.notificationRadius,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, 'diseaseReports'), reportData);
      
      try {
        const notificationCount = await NotificationService.createDiseaseAlertNotifications(reportData, docRef.id);
        Alert.alert(
          t?.diseaseReport?.reportSubmitted || 'Report Submitted',
          notificationCount > 0 
            ? `${t?.diseaseReport?.reportSubmitted || 'Report submitted'}\n\nNotifications sent to ${notificationCount} nearby farms within ${formData.notificationRadius} km.`
            : t?.diseaseReport?.reportSubmitted || 'Report submitted'
        );
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        Alert.alert(
          t?.diseaseReport?.reportSubmitted || 'Report Submitted',
          `${t?.diseaseReport?.reportSubmitted || 'Report submitted'}\n\nWarning: Some notifications may not have been sent.`
        );
      }
      
      setShowReportModal(false);
      resetForm();
      if (mapReady && mapRef.current && currentLocation) {
        setTimeout(() => {
          try {
            mapRef.current?.animateToRegion({ 
              ...currentLocation, 
              latitudeDelta: 0.1, 
              longitudeDelta: 0.1 
            }, 1000);
          } catch (err) {
            console.error('Map animation error:', err);
          }
        }, 300);
      }
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert(
        t?.diseaseReport?.submitError || 'Error',
        error.message || t?.diseaseReport?.reportError || 'Failed to submit report'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      selectedDisease: '',
      affectedPonds: '',
      estimatedLoss: '',
      symptoms: '',
      actionsTaken: '',
      notificationRadius: 50,
    });
  };

  const handleMarkerPress = (report: DiseaseReport) => {
    try {
      setSelectedReport(report);
      setShowDetailsModal(true);
      
      if (mapReady && mapRef.current && report?.location) {
        setTimeout(() => {
          try {
            mapRef.current?.animateToRegion({
              latitude: report.location.latitude,
              longitude: report.location.longitude,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }, 1000);
          } catch (err) {
            console.error('Map animation error:', err);
          }
        }, 300);
      }
    } catch (err) {
      console.error('Error handling marker press:', err);
    }
  };

  const getDistanceFromUser = (report: DiseaseReport): number => {
    if (!currentLocation) return 0;
    return calculateDistance(currentLocation as any, {
      latitude: report.location.latitude,
      longitude: report.location.longitude,
    } as any);
  };

  const getDaysAgo = (dateString: string): number => {
    return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleUpdateStatus = async (newStatus: 'contained' | 'resolved') => {
    if (!selectedReport) return;

    Alert.alert(
      `Mark as ${newStatus === 'contained' ? 'Contained' : 'Resolved'}`,
      `Are you sure you want to mark this disease outbreak as ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              await updateDoc(doc(db, 'diseaseReports', selectedReport.id), {
                status: newStatus,
                updatedAt: Timestamp.now(),
              });
              Alert.alert('Success', `Disease outbreak marked as ${newStatus}.`);
              setShowDetailsModal(false);
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update status. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const updateFormData = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 12 }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#1B262C" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t?.diseaseReport?.title || 'Disease Reports'}</Text>
      <TouchableOpacity 
        style={styles.legendButton} 
        onPress={() => Alert.alert(
          t?.diseaseReport?.legend || 'Legend',
          t?.diseaseReport?.legendContent || 'Map legend information'
        )}
      >
        <Ionicons name="information-circle-outline" size={Platform.OS === 'android' ? 22 : 24} color="#1B262C" />
      </TouchableOpacity>
    </View>
  );

  const renderStatsBar = () => (
    <View style={styles.statsBar}>
      {['critical', 'high', 'medium'].map((severity, idx) => (
        <View key={severity} style={styles.statItem}>
          <Ionicons 
            name={idx === 0 ? "warning" : "alert-circle"} 
            size={Platform.OS === 'android' ? 18 : 20} 
            color={idx === 0 ? '#e74c3c' : idx === 1 ? '#f39c12' : '#f1c40f'} 
          />
          <Text style={styles.statNumber}>{reports.filter(r => r.severity === severity).length}</Text>
        </View>
      ))}
    </View>
  );

  const renderMap = () => {
    if (!currentLocation) {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#0F4C75" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading map...</Text>
        </View>
      );
    }

    return (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onMapReady={() => {
          console.log('✅ Map is ready');
          setMapReady(true);
          setError(null);
        }}
        onMapLoaded={() => {
          console.log('✅ Map loaded');
        }}
        loadingEnabled={true}
        loadingIndicatorColor="#0F4C75"
        loadingBackgroundColor="#F5F5F5"
        showsCompass={true}
        showsScale={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title={t?.diseaseReport?.yourLocation || 'Your Location'}
            description={company?.companyName || t?.diseaseReport?.myFarm || 'My Farm'}
          >
            <View style={styles.userMarker}>
              <Ionicons name="home" size={Platform.OS === 'android' ? 20 : 24} color="#0F4C75" />
            </View>
          </Marker>
        )}

        {reports.map((report) => {
          if (!report?.location?.latitude || !report?.location?.longitude) {
            console.warn('Invalid report location:', report);
            return null;
          }
          
          return (
            <React.Fragment key={report.id}>
              <Marker
                coordinate={{ 
                  latitude: report.location.latitude, 
                  longitude: report.location.longitude 
                }}
                onPress={() => handleMarkerPress(report)}
              >
                <View style={[styles.diseaseMarker, { backgroundColor: report.color }]}>
                  <Ionicons 
                    name={DISEASE_TYPES.find(d => d.id === report.diseaseType)?.icon as any || 'alert-circle'} 
                    size={Platform.OS === 'android' ? 18 : 20} 
                    color="#FFFFFF" 
                  />
                </View>
              </Marker>
              <Circle
                center={{ 
                  latitude: report.location.latitude, 
                  longitude: report.location.longitude 
                }}
                radius={report.notificationRadius * 1000}
                fillColor={`${report.color}20`}
                strokeColor={report.color}
                strokeWidth={2}
              />
            </React.Fragment>
          );
        })}
      </MapView>
    );
  };

  const renderDetailsModal = () => (
    <Modal visible={showDetailsModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailsModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.severityIndicator, { backgroundColor: selectedReport?.color }]} />
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedReport?.diseaseName}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={Platform.OS === 'android' ? 24 : 28} color="#1B262C" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.detailsContent} 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <DetailCard label={t?.diseaseReport?.farm || 'Farm'} value={selectedReport?.companyName} />
            <DetailCard 
              label={t?.diseaseReport?.location || 'Location'} 
              value={selectedReport?.location.address}
              extra={currentLocation && selectedReport && (
                <Text style={styles.distanceText}>
                  {(t?.diseaseReport?.distanceFromYou || '{distance} km from you')
                    .replace('{distance}', getDistanceFromUser(selectedReport).toFixed(1))}
                </Text>
              )}
            />
            <DetailCard 
              label={t?.diseaseReport?.impact || 'Impact'} 
              value={`${(t?.diseaseReport?.pondsAffected || '{count} ponds affected')
                .replace('{count}', selectedReport?.affectedPonds.toString() || '0')} • ${(t?.diseaseReport?.estimatedLossValue || 'Loss: {loss}')
                .replace('{loss}', selectedReport?.estimatedLoss || '')}`}
            />
            <DetailCard label={t?.diseaseReport?.symptoms || 'Symptoms'} value={selectedReport?.symptoms} />
            {selectedReport?.actionsTaken && (
              <DetailCard label={t?.diseaseReport?.actionsTaken || 'Actions Taken'} value={selectedReport.actionsTaken} />
            )}
            <DetailCard 
              label={t?.diseaseReport?.reported || 'Reported'} 
              value={selectedReport && getDaysAgo(selectedReport.reportDate) === 0 
                ? t?.diseaseReport?.today || 'Today'
                : (t?.diseaseReport?.daysAgo || '{days} days ago')
                  .replace('{days}', getDaysAgo(selectedReport?.reportDate || '').toString())}
            />

            {selectedReport?.companyId === company?.id && selectedReport?.status === 'active' && (
              <View style={styles.statusUpdateCard}>
                <Text style={styles.statusLabel}>Update Status</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#f39c12' }]}
                    onPress={() => handleUpdateStatus('contained')}
                  >
                    <Ionicons name="shield-checkmark" size={Platform.OS === 'android' ? 16 : 18} color="#FFFFFF" />
                    <Text style={styles.statusButtonText}>Mark as Contained</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.statusButton, { backgroundColor: '#27ae60' }]}
                    onPress={() => handleUpdateStatus('resolved')}
                  >
                    <Ionicons name="checkmark-circle" size={Platform.OS === 'android' ? 16 : 18} color="#FFFFFF" />
                    <Text style={styles.statusButtonText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selectedReport?.status !== 'active' && (
              <View style={styles.statusBadge}>
                <Ionicons 
                  name={selectedReport?.status === 'contained' ? 'shield-checkmark' : 'checkmark-circle'} 
                  size={Platform.OS === 'android' ? 18 : 20} 
                  color={selectedReport?.status === 'contained' ? '#f39c12' : '#27ae60'} 
                />
                <Text style={[styles.statusBadgeText, { 
                  color: selectedReport?.status === 'contained' ? '#f39c12' : '#27ae60' 
                }]}>
                  {selectedReport?.status === 'contained' ? 'Contained' : 'Resolved'}
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.shareButton}>
                <Ionicons name="share-social-outline" size={Platform.OS === 'android' ? 18 : 20} color="#3282B8" />
                <Text style={styles.shareButtonText}>{t?.diseaseReport?.shareAlert || 'Share Alert'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.directionsButton}>
                <Ionicons name="navigate-outline" size={Platform.OS === 'android' ? 18 : 20} color="#FFFFFF" />
                <Text style={styles.directionsButtonText}>{t?.diseaseReport?.getDirections || 'Get Directions'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderReportModal = () => (
    <Modal visible={showReportModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.reportModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t?.diseaseReport?.reportOutbreak || 'Report Outbreak'}</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Ionicons name="close" size={Platform.OS === 'android' ? 24 : 28} color="#1B262C" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.formContent} 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.formDescription}>{t?.diseaseReport?.formDescription || 'Report a disease outbreak in your farm'}</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t?.diseaseReport?.diseaseType || 'Disease Type'} *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diseaseScroll}>
                {DISEASE_TYPES.map(disease => (
                  <TouchableOpacity
                    key={disease.id}
                    style={[
                      styles.diseaseChip,
                      formData.selectedDisease === disease.id && { backgroundColor: disease.color }
                    ]}
                    onPress={() => updateFormData('selectedDisease', disease.id)}
                  >
                    <Ionicons 
                      name={disease.icon as any} 
                      size={Platform.OS === 'android' ? 16 : 18} 
                      color={formData.selectedDisease === disease.id ? '#FFFFFF' : disease.color} 
                    />
                    <Text style={[
                      styles.diseaseChipText,
                      formData.selectedDisease === disease.id && styles.diseaseChipTextActive
                    ]}>
                      {disease.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>{t?.diseaseReport?.affectedPonds || 'Affected Ponds'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t?.diseaseReport?.affectedPondsPlaceholder || 'e.g., 3'}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={formData.affectedPonds}
                  onChangeText={(val) => updateFormData('affectedPonds', val)}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>{t?.diseaseReport?.estimatedLoss || 'Estimated Loss'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t?.diseaseReport?.estimatedLossPlaceholder || 'e.g., 10-20%'}
                  placeholderTextColor="#999"
                  value={formData.estimatedLoss}
                  onChangeText={(val) => updateFormData('estimatedLoss', val)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t?.diseaseReport?.symptomsObserved || 'Symptoms Observed'} *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t?.diseaseReport?.describeSymptomsPlaceholder || 'Describe the symptoms...'}
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={formData.symptoms}
                onChangeText={(val) => updateFormData('symptoms', val)}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t?.diseaseReport?.actionsTaken || 'Actions Taken'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t?.diseaseReport?.containmentActionsPlaceholder || 'Describe containment actions...'}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={formData.actionsTaken}
                onChangeText={(val) => updateFormData('actionsTaken', val)}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t?.diseaseReport?.alertRadius || 'Alert Radius'}</Text>
              <View style={styles.radiusButtons}>
                {NOTIFICATION_RADIUS.map(radius => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusButton,
                      formData.notificationRadius === radius && styles.radiusButtonActive
                    ]}
                    onPress={() => updateFormData('notificationRadius', radius)}
                  >
                    <Text style={[
                      styles.radiusButtonText,
                      formData.notificationRadius === radius && styles.radiusButtonTextActive
                    ]}>
                      {radius} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmitReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="warning" size={Platform.OS === 'android' ? 18 : 20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{t?.diseaseReport?.submitReport || 'Submit Report'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle" size={48} color="#e74c3c" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 32 }}>
          {error}
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 24, backgroundColor: '#0F4C75', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          onPress={() => {
            setError(null);
            getCurrentLocation();
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      {renderHeader()}
      {renderMap()}
      {renderStatsBar()}

      <TouchableOpacity 
        style={styles.reportButton} 
        onPress={() => setShowReportModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={Platform.OS === 'android' ? 24 : 28} color="#FFFFFF" />
        <Text style={styles.reportButtonText}>{t?.diseaseReport?.reportDisease || 'Report Disease'}</Text>
      </TouchableOpacity>

      {renderDetailsModal()}
      {renderReportModal()}
    </View>
  );
}

const DetailCard = ({ label, value, extra }: { label: string; value?: string; extra?: React.ReactNode }) => (
  <View style={styles.detailCard}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
    {extra}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#BBE1FA',
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 12,
    borderBottomLeftRadius: Platform.OS === 'android' ? 16 : 20,
    borderBottomRightRadius: Platform.OS === 'android' ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '700',
    color: '#1B262C',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  legendButton: {
    padding: Platform.OS === 'android' ? 6 : 8,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  map: {
    flex: 1,
  },
  statsBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 100 : 120,
    left: Platform.OS === 'android' ? 12 : 16,
    right: Platform.OS === 'android' ? 12 : 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Platform.OS === 'android' ? 12 : 16,
    padding: Platform.OS === 'android' ? 10 : 12,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  statNumber: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '700',
    color: '#1B262C',
  },
  userMarker: {
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 6 : 8,
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    borderWidth: 3,
    borderColor: '#0F4C75',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  diseaseMarker: {
    width: Platform.OS === 'android' ? 36 : 40,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  reportButton: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 24,
    right: Platform.OS === 'android' ? 12 : 16,
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
    borderRadius: Platform.OS === 'android' ? 25 : 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
    maxHeight: height * 0.85,
  },
  reportModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Platform.OS === 'android' ? 10 : 12,
  },
  severityIndicator: {
    width: Platform.OS === 'android' ? 6 : 8,
    height: Platform.OS === 'android' ? 36 : 40,
    borderRadius: 4,
  },
  modalTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '700',
    color: '#1B262C',
    flex: 1,
  },
  detailsContent: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  detailCard: {
    backgroundColor: '#F8F9FA',
    padding: Platform.OS === 'android' ? 14 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 14 : 16,
  },
  detailLabel: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: Platform.OS === 'android' ? 5 : 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    color: '#1B262C',
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  distanceText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#3282B8',
    marginTop: 4,
    fontWeight: '600',
  },
  statusUpdateCard: {
    backgroundColor: '#F8F9FA',
    padding: Platform.OS === 'android' ? 14 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 14 : 16,
  },
  statusLabel: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusButtons: {
    gap: Platform.OS === 'android' ? 8 : 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 14 : 16,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  statusBadgeText: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 14 : 16,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  shareButtonText: {
    color: '#3282B8',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F4C75',
    padding: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
  },
  formContent: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20,
  },
  formDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#666',
    marginTop: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  formGroup: {
    marginTop: Platform.OS === 'android' ? 14 : 16,
  },
  formLabel: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    color: '#1B262C',
    marginBottom: Platform.OS === 'android' ? 6 : 8,
  },
  formRow: {
    flexDirection: 'row',
    marginTop: Platform.OS === 'android' ? 14 : 16,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    padding: Platform.OS === 'android' ? 10 : 12,
    fontSize: Platform.OS === 'android' ? 14 : 15,
    color: '#1B262C',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  textArea: {
    minHeight: Platform.OS === 'android' ? 90 : 100,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'android' ? 10 : 12,
  },
  diseaseScroll: {
    marginTop: Platform.OS === 'android' ? 6 : 8,
  },
  diseaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 7 : 8,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    backgroundColor: '#F8F9FA',
    marginRight: Platform.OS === 'android' ? 6 : 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    gap: Platform.OS === 'android' ? 5 : 6,
  },
  diseaseChipText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '600',
    color: '#1B262C',
  },
  diseaseChipTextActive: {
    color: '#FFFFFF',
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'android' ? 6 : 8,
    marginTop: Platform.OS === 'android' ? 6 : 8,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 9 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  radiusButtonActive: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },
  radiusButtonText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    fontWeight: '600',
    color: '#666',
  },
  radiusButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'android' ? 14 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 20 : 24,
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    gap: Platform.OS === 'android' ? 6 : 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '700',
  },
});
