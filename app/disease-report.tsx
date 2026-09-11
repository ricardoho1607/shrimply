// app/disease-report.tsx - Complete Fixed Version
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, ActivityIndicator, FlatList, Modal, ScrollView,
  Dimensions, Platform, PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from '../components/MapWrapper';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import * as Location from 'expo-location';
import { calculateDistance } from './utils/locationUtils';
import { db } from '@/config/firebase';
import { 
  collection, query, onSnapshot, orderBy, where,
  Timestamp, doc,
} from 'firebase/firestore';
import { hasFarmPermission } from '../shared/permissions';
import {
  createOfflineOperationId,
  loadOfflineCollectionWithMutations,
  overlayOfflineMutations,
  persistOfflineCollection,
  requestOfflineMutationFlush,
  saveDurableMutation,
} from './services/offlineWorkspace';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface DiseaseReport {
  isPublic?: boolean;
  id: string;
  companyId: string;
  companyName: string;
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

const DISEASE_TYPES_CONFIG = [
  { id: 'wssv', translationKey: 'wssv', defaultName: 'WSSV', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
  { id: 'ems', translationKey: 'ems', defaultName: 'EMS', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
  { id: 'vibrio', translationKey: 'vibrio', defaultName: 'Vibrio', severity: 'high', icon: 'warning', color: '#f39c12' },
  { id: 'ihhnv', translationKey: 'ihhnv', defaultName: 'IHHNV', severity: 'high', icon: 'warning', color: '#f39c12' },
  { id: 'yellowhead', translationKey: 'yellowhead', defaultName: 'Yellowhead', severity: 'critical', icon: 'alert-circle', color: '#e74c3c' },
  { id: 'taura', translationKey: 'taura', defaultName: 'Taura', severity: 'high', icon: 'warning', color: '#f39c12' },
  { id: 'bacterial', translationKey: 'bacterial', defaultName: 'Bacterial', severity: 'medium', icon: 'medical', color: '#f1c40f' },
  { id: 'fungal', translationKey: 'fungal', defaultName: 'Fungal', severity: 'medium', icon: 'medical', color: '#f1c40f' },
  { id: 'parasitic', translationKey: 'parasitic', defaultName: 'Parasitic', severity: 'medium', icon: 'bug', color: '#f1c40f' },
  { id: 'other', translationKey: 'otherDisease', defaultName: 'Other', severity: 'medium', icon: 'help-circle', color: '#f1c40f' },
];

export default function DiseaseReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company } = useAuth();
  const canSubmitDiseaseReports = hasFarmPermission(user, 'submitDiseaseReports', company?.ownerId);
  const canResolveDiseaseReports = hasFarmPermission(user, 'resolveDiseaseReports', company?.ownerId);
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const labels = React.useMemo(() => ({
    title: t?.diseaseReport?.title || 'Disease Reports',
    legend: t?.diseaseReport?.legend || 'Legend',
    legendContent: t?.diseaseReport?.legendContent || 'Map legend information',
    yourLocation: t?.diseaseReport?.yourLocation || 'Your Location',
    myFarm: t?.diseaseReport?.myFarm || 'My Farm',
    submitError: t?.diseaseReport?.submitError || 'Error',
    failedToLoad: t?.diseaseReport?.failedToLoad || 'Failed to load reports',
    selectDiseaseType: t?.diseaseReport?.selectDiseaseType || 'Please select a disease type',
    describeSymptomsError: t?.diseaseReport?.describeSymptomsError || 'Please describe the symptoms',
    locationError: t?.diseaseReport?.locationError || 'Location not available',
    confirmReport: t?.diseaseReport?.confirmReport || 'Confirm Report',
    confirmReportMessage: t?.diseaseReport?.confirmReportMessage || 'This will alert farms within {radius} km',
    cancel: t?.CreateBuyerListingScreen?.cancel || 'Cancel',
    reportSubmitted: t?.diseaseReport?.reportSubmitted || 'Report Submitted',
    reportError: t?.diseaseReport?.reportError || 'Failed to submit report',
    reportDisease: t?.diseaseReport?.reportDisease || 'Report Disease',
    farm: t?.diseaseReport?.farm || 'Farm',
    location: t?.diseaseReport?.location || 'Location',
    distanceFromYou: t?.diseaseReport?.distanceFromYou || '{distance} km from you',
    impact: t?.diseaseReport?.impact || 'Impact',
    pondsAffected: t?.diseaseReport?.pondsAffected || '{count} ponds affected',
    estimatedLossValue: t?.diseaseReport?.estimatedLossValue || 'Loss: {loss}',
    symptoms: t?.diseaseReport?.symptoms || 'Symptoms',
    actionsTaken: t?.diseaseReport?.actionsTaken || 'Actions Taken',
    reported: t?.diseaseReport?.reported || 'Reported',
    today: t?.diseaseReport?.today || 'Today',
    daysAgo: t?.diseaseReport?.daysAgo || '{days} days ago',
    shareAlert: t?.diseaseReport?.shareAlert || 'Share Alert',
    getDirections: t?.diseaseReport?.getDirections || 'Get Directions',
    reportOutbreak: t?.diseaseReport?.reportOutbreak || 'Report Outbreak',
    formDescription: t?.diseaseReport?.formDescription || 'Report a disease outbreak in your farm',
    diseaseType: t?.diseaseReport?.diseaseType || 'Disease Type',
    affectedPonds: t?.diseaseReport?.affectedPonds || 'Affected Ponds',
    affectedPondsPlaceholder: t?.diseaseReport?.affectedPondsPlaceholder || 'e.g., 3',
    estimatedLoss: t?.diseaseReport?.estimatedLoss || 'Estimated Loss',
    estimatedLossPlaceholder: t?.diseaseReport?.estimatedLossPlaceholder || 'e.g., 10-20%',
    symptomsObserved: t?.diseaseReport?.symptomsObserved || 'Symptoms Observed',
    describeSymptomsPlaceholder: t?.diseaseReport?.describeSymptomsPlaceholder || 'Describe the symptoms...',
    containmentActionsPlaceholder: t?.diseaseReport?.containmentActionsPlaceholder || 'Describe containment actions...',
    alertRadius: t?.diseaseReport?.alertRadius || 'Alert Radius',
    submitReport: t?.diseaseReport?.submitReport || 'Submit Report',
    permissionDenied: t?.diseaseReport?.permissionDenied || 'Permission Denied',
    locationPermissionRequired: t?.diseaseReport?.locationPermissionRequired || 'Location permission is required to use this feature',
  }), [t]);

  const DISEASE_TYPES = React.useMemo(() => 
    DISEASE_TYPES_CONFIG.map(d => ({
      ...d,
      name: (t?.diseaseReport as any)?.[d.translationKey] || d.defaultName
    })), [t]);

  
  // SET DEFAULT LOCATION IMMEDIATELY - Don't leave it null!
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: -6.2088,  // Jakarta default
    longitude: 106.8456,
  });
  const [storedReports, setReports] = useState<DiseaseReport[]>([]);
  const reports = user ? storedReports.filter(report => report.isPublic || (report.companyId === company?.id && hasFarmPermission(user, 'viewFarm', company?.ownerId))) : [];
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<'critical' | 'high' | 'medium' | null>(null);



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

    
    let fallbackLat = -6.2088;  // Jakarta default
    let fallbackLng = 106.8456;
    
    // Try to use company location if available
    if (company?.primaryLocation && typeof company.primaryLocation !== 'string') {
      if (company.primaryLocation.latitude && company.primaryLocation.longitude) {
        fallbackLat = company.primaryLocation.latitude;
        fallbackLng = company.primaryLocation.longitude;

      }
    }
    
    // ALWAYS set a location - never leave it null
    setCurrentLocation({
      latitude: fallbackLat,
      longitude: fallbackLng,
    });

  };

  const getCurrentLocation = async () => {
    try {
      console.log('🗺️ Requesting location permissions...');
      
      const { status } = await Promise.resolve().then(() => Location.requestForegroundPermissionsAsync());
      console.log('📍 Location permission status:', status);
      
      if (status !== 'granted') {
        console.log('❌ Location permission not granted:', status);
        Alert.alert(labels.permissionDenied, labels.locationPermissionRequired);
        setFallbackLocation();
        return;
      }

      if (Platform.OS === 'android') {
        const hasPermission = await requestAndroidLocationPermission();
        if (!hasPermission) {
          console.log('❌ Android location permission denied');
          Alert.alert(labels.permissionDenied, labels.locationPermissionRequired);
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
    let active = true;
    let version = 0;
    let own: DiseaseReport[] = [];
    let regional: DiseaseReport[] = [];
    const publish = async () => {
      const currentVersion = ++version;
      const ownIds = new Set(own.map(report => report.id));
      const combined = [...own, ...regional.filter(report => !ownIds.has(report.id))];
      const next = user?.uid && company?.id
        ? await overlayOfflineMutations(combined, user.uid, company.id, ['diseaseReports']) : combined;
      if (!active || version !== currentVersion) return;
      setReports(next);
      setLoading(false);
      if (user?.uid && company?.id) await persistOfflineCollection(user.uid, company.id, 'disease-reports-v2', next);
    };
    const convert = (snapshot: import('firebase/firestore').QuerySnapshot) => snapshot.docs.map(item => {
      const data = item.data();
      return { ...data, id: item.id, reportDate: data.reportDate?.toDate?.().toISOString() ?? data.reportDate } as DiseaseReport;
    });
    const failed = (error: Error) => { if (active) { console.error('Could not load disease alerts', error); setLoading(false); } };
    const refresh = () => { void publish().catch(failed); };
    const unsubscribePublic = onSnapshot(query(collection(db, 'publicDiseaseAlerts'), orderBy('reportDate', 'desc')), snapshot => {
      regional = convert(snapshot); refresh();
    }, failed);
    const unsubscribeOwn = company?.id && hasFarmPermission(user, 'viewFarm', company.ownerId)
      ? onSnapshot(query(collection(db, 'diseaseReports'), where('companyId', '==', company.id)), snapshot => {
        own = convert(snapshot); refresh();
      }, failed) : () => {};
    if (user?.uid && company?.id) {
      void loadOfflineCollectionWithMutations<DiseaseReport>(user.uid, company.id, 'disease-reports-v2', ['diseaseReports'])
        .then(cached => { if (active && version === 0) { setReports(cached); setLoading(false); } }).catch(failed);
    }
    return () => { active = false; unsubscribePublic(); unsubscribeOwn(); };
  };

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void getCurrentLocation(); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => loadReports(), [user?.uid, company?.id, company?.ownerId, user?.role, user?.permissionOverrides]);

  const handleSubmitReport = async () => {
    if (!canSubmitDiseaseReports) return;
    const { selectedDisease, symptoms, notificationRadius } = formData;
    
    if (!selectedDisease) {
      Alert.alert(
        labels.submitError,
        labels.selectDiseaseType
      );
      return;
    }
    if (!symptoms.trim()) {
      Alert.alert(
        labels.submitError,
        labels.describeSymptomsError
      );
      return;
    }
    if (!currentLocation) {
      Alert.alert(
      labels.submitError,
      labels.locationError
      );
      return;
    }

    Alert.alert(
      labels.confirmReport,
      labels.confirmReportMessage
        .replace('{radius}', notificationRadius.toString()),
      [
        { text: labels.cancel, style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: submitReport,
        },
      ]
    );
  };

  const resetForm = useCallback(() => {
    setFormData({
      selectedDisease: '',
      affectedPonds: '',
      estimatedLoss: '',
      symptoms: '',
      actionsTaken: '',
      notificationRadius: 50,
    });
  }, []);

  const submitReport = useCallback(async () => {
    if (!canSubmitDiseaseReports) return;
    try {
      setLoading(true);
      const diseaseInfo = DISEASE_TYPES.find(d => d.id === formData.selectedDisease);
      const locationAddress = company?.primaryLocation && typeof company.primaryLocation !== 'string'
        ? company.primaryLocation.address
        : labels.yourLocation;
      
      const reportData = {
        companyId: company?.id || '',
        companyName: company?.companyName || 'Unknown Farm',
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
      
      if (!user?.uid || !company?.id) throw new Error('No active farm account');
      const reportRef = doc(collection(db, 'diseaseReports'));
      await saveDurableMutation({
        id: createOfflineOperationId(`disease-create-${reportRef.id}`),
        userId: user.uid,
        companyId: company.id,
        createdAt: Date.now(),
        kind: 'set',
        path: ['diseaseReports', reportRef.id],
        data: { id: reportRef.id, ...reportData } as unknown as Record<string, unknown>,
        merge: false,
        createOnly: true,
        serverTimestampFields: ['createdAt', 'updatedAt', 'reportDate'],
      }, { deferFlush: true });
      const nextReports = [{
        id: reportRef.id,
        ...reportData,
        reportDate: reportData.reportDate.toDate().toISOString(),
      } as DiseaseReport, ...reports];
      setReports(nextReports);
      await persistOfflineCollection(user.uid, company.id, 'disease-reports-v2', nextReports);
      requestOfflineMutationFlush(user.uid, company.id);
      Alert.alert(labels.reportSubmitted, labels.reportSubmitted);
      
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
        labels.submitError,
        labels.reportError
      );
    } finally {
      setLoading(false);
    }
  }, [canSubmitDiseaseReports, formData, company, currentLocation, labels, reports, mapReady, resetForm, user?.uid]);



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
    if (!selectedReport || !canResolveDiseaseReports) return;

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
              if (!user?.uid || !company?.id) throw new Error('No active farm account');
              const now = Timestamp.now();
              await saveDurableMutation({
                id: createOfflineOperationId(`disease-status-${selectedReport.id}`),
                userId: user.uid,
                companyId: company.id,
                createdAt: Date.now(),
                kind: 'set',
                path: ['diseaseReports', selectedReport.id],
                data: {
                status: newStatus,
                  updatedAt: now,
                },
                merge: true,
                serverTimestampFields: ['updatedAt'],
              }, { deferFlush: true });
              const nextReports = reports.map((report) => report.id === selectedReport.id ? { ...report, status: newStatus } : report);
              setReports(nextReports);
              await persistOfflineCollection(user.uid, company.id, 'disease-reports-v2', nextReports);
              requestOfflineMutationFlush(user.uid, company.id);
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
    <Header 
      title={labels.title} 
      onBack={() => router.back()} 
      onReport={() => setShowReportModal(true)}
    />
  );

  const stats = React.useMemo(() => ({
    critical: reports.filter(r => r.severity === 'critical').length,
    high: reports.filter(r => r.severity === 'high').length,
    medium: reports.filter(r => r.severity === 'medium').length,
  }), [reports]);

  const renderStatsBar = () => (
    <View style={styles.statsBar}>
      {[
        { severity: 'critical' as const, count: stats.critical, color: '#e74c3c' },
        { severity: 'high' as const, count: stats.high, color: '#f39c12' },
        { severity: 'medium' as const, count: stats.medium, color: '#f1c40f' },
      ].map((item, idx) => (
        <TouchableOpacity 
          key={item.severity} 
          style={styles.statItem}
          onPress={() => {
            setSelectedSeverity(item.severity);
            setShowStatsModal(true);
          }}
        >
          <Ionicons 
            name={idx === 0 ? "warning" : "alert-circle"} 
            size={Platform.OS === 'android' ? 18 : 20} 
            color={item.color} 
          />
          <Text style={styles.statNumber}>{item.count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMap = () => (
    <MapSection
      mapRef={mapRef}
      currentLocation={currentLocation}
      reports={reports}
      onMapReady={() => {
        console.log('✅ Map is ready');
        setMapReady(true);
        setError(null);
      }}
      onMarkerPress={handleMarkerPress}
      userMarkerTitle={labels.yourLocation}
      userMarkerDescription={company?.companyName || labels.myFarm}
      diseaseTypes={DISEASE_TYPES}
    />
  );

  const renderDetailsModal = () => (
    <DetailsModal
      visible={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      selectedReport={selectedReport}
      currentLocation={currentLocation}
      companyId={company?.id}
      labels={labels}
      insets={insets}
      onUpdateStatus={handleUpdateStatus}
      getDistanceFromUser={getDistanceFromUser}
      getDaysAgo={getDaysAgo}
    />
  );

  const renderReportModal = () => (
    <ReportModal
      visible={showReportModal}
      onClose={() => setShowReportModal(false)}
      formData={formData}
      loading={loading}
      labels={labels}
      insets={insets}
      diseaseTypes={DISEASE_TYPES}
      onUpdateFormData={updateFormData}
      onSubmit={handleSubmitReport}
    />
  );

  const renderStatsModal = () => (
    <StatsModal
      visible={showStatsModal}
      onClose={() => setShowStatsModal(false)}
      severity={selectedSeverity}
      reports={reports.filter(r => r.severity === selectedSeverity)}
      labels={labels}
      insets={insets}
      onReportPress={(report: DiseaseReport) => {
        setShowStatsModal(false);
        handleMarkerPress(report);
      }}
    />
  );

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle" size={48} color="#e74c3c" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center', paddingHorizontal: 32 }}>
          {error}
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 24, backgroundColor: '#0d2137', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
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
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      {renderHeader()}
      {renderMap()}
      {renderStatsBar()}
      {renderStatsModal()}


      {renderDetailsModal()}
      {renderReportModal()}
    </View>
  );
}

// --- Sub-components ---

const Header = React.memo(({ title, onBack, onReport }: any) => (
  <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#0d2137" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.legendButton}
        onPress={onReport}
        accessibilityRole="button"
        accessibilityLabel="Report disease outbreak"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="add-circle" size={Platform.OS === 'android' ? 28 : 32} color="#e74c3c" />
      </TouchableOpacity>
    </View>
  </SafeAreaView>
));
Header.displayName = 'Header';

const MapSection = React.memo(({ 
  mapRef, currentLocation, reports, onMapReady, onMarkerPress, 
  userMarkerTitle, userMarkerDescription, diseaseTypes 
}: any) => {
  if (!currentLocation) {
    return (
      <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0d2137" />
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
      onMapReady={onMapReady}
      loadingEnabled={true}
      loadingIndicatorColor="#0d2137"
      loadingBackgroundColor="#F5F5F5"
      showsCompass={true}
      showsScale={true}
      rotateEnabled={true}
      scrollEnabled={true}
      zoomEnabled={true}
    >
      <Marker
        coordinate={currentLocation}
        title={userMarkerTitle}
        description={userMarkerDescription}
      >
        <View style={styles.userMarker}>
          <Ionicons name="home" size={Platform.OS === 'android' ? 20 : 24} color="#0d2137" />
        </View>
      </Marker>

      {reports.map((report: any) => (
        <ReportMarker 
          key={report.id} 
          report={report} 
          onPress={() => onMarkerPress(report)}
          iconName={diseaseTypes.find((d: any) => d.id === report.diseaseType)?.icon || 'alert-circle'}
        />
      ))}
    </MapView>
  );
});
MapSection.displayName = 'MapSection';

const ReportMarker = React.memo(({ report, onPress, iconName }: any) => {
  if (!report?.location?.latitude || !report?.location?.longitude) return null;
  
  return (
    <React.Fragment>
      <Marker
        coordinate={{ 
          latitude: report.location.latitude, 
          longitude: report.location.longitude 
        }}
        onPress={onPress}
      >
        <View style={[styles.diseaseMarker, { backgroundColor: report.color }]}>
          <Ionicons 
            name={iconName as any} 
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
        radius={(report.notificationRadius || 0) * 1000}
        fillColor={`${report.color}20`}
        strokeColor={report.color}
        strokeWidth={2}
      />
    </React.Fragment>
  );
});
ReportMarker.displayName = 'ReportMarker';

const DetailsModal = React.memo(({ 
  visible, onClose, selectedReport, currentLocation, companyId, 
  labels, insets, onUpdateStatus, getDistanceFromUser, getDaysAgo 
}: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.detailsModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={[styles.severityIndicator, { backgroundColor: selectedReport?.color }]} />
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedReport?.diseaseName}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={Platform.OS === 'android' ? 24 : 28} color="#0d2137" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.detailsContent} 
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <DetailCard label={labels.farm} value={selectedReport?.companyName || 'Private farm'} />
          <DetailCard 
            label={labels.location} 
            value={selectedReport?.location.address}
            extra={currentLocation && selectedReport && !selectedReport.isPublic && (
              <Text style={styles.distanceText}>
                {labels.distanceFromYou.replace('{distance}', getDistanceFromUser(selectedReport).toFixed(1))}
              </Text>
            )}
          />
          {!selectedReport?.isPublic && <>
          <DetailCard 
            label={labels.impact} 
            value={`${labels.pondsAffected.replace('{count}', selectedReport?.affectedPonds?.toString() || 'Not public')} • ${labels.estimatedLossValue.replace('{loss}', selectedReport?.estimatedLoss || '')}`}
          />
          <DetailCard label={labels.symptoms} value={selectedReport?.symptoms} />
          {selectedReport?.actionsTaken && (
            <DetailCard label={labels.actionsTaken} value={selectedReport.actionsTaken} />
          )}
          </>}
          <DetailCard 
            label={labels.reported} 
            value={selectedReport && getDaysAgo(selectedReport.reportDate) === 0 
              ? labels.today
              : labels.daysAgo.replace('{days}', getDaysAgo(selectedReport?.reportDate || '').toString())}
          />

          {selectedReport?.companyId === companyId && selectedReport?.status === 'active' && (
            <View style={styles.statusUpdateCard}>
              <Text style={styles.statusLabel}>Update Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#f39c12' }]}
                  onPress={() => onUpdateStatus('contained')}
                >
                  <Ionicons name="shield-checkmark" size={Platform.OS === 'android' ? 16 : 18} color="#FFFFFF" />
                  <Text style={styles.statusButtonText}>Mark as Contained</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statusButton, { backgroundColor: '#27ae60' }]}
                  onPress={() => onUpdateStatus('resolved')}
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
              <Ionicons name="share-social-outline" size={Platform.OS === 'android' ? 18 : 20} color="#315f57" />
              <Text style={styles.shareButtonText}>{labels.shareAlert}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directionsButton}>
              <Ionicons name="navigate-outline" size={Platform.OS === 'android' ? 18 : 20} color="#FFFFFF" />
              <Text style={styles.directionsButtonText}>{labels.getDirections}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
));
DetailsModal.displayName = 'DetailsModal';

const ReportModal = React.memo(({ 
  visible, onClose, formData, loading, labels, insets, 
  diseaseTypes, onUpdateFormData, onSubmit 
}: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.reportModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{labels.reportOutbreak}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={Platform.OS === 'android' ? 24 : 28} color="#0d2137" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.formContent} 
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formDescription}>{labels.formDescription}</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{labels.diseaseType} *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diseaseScroll}>
              {diseaseTypes.map((disease: any) => (
                <TouchableOpacity
                  key={disease.id}
                  style={[
                    styles.diseaseChip,
                    formData.selectedDisease === disease.id && { backgroundColor: disease.color }
                  ]}
                  onPress={() => onUpdateFormData('selectedDisease', disease.id)}
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
              <Text style={styles.formLabel}>{labels.affectedPonds}</Text>
              <TextInput
                style={styles.input}
                placeholder={labels.affectedPondsPlaceholder}
                placeholderTextColor="#6b8aa0"
                keyboardType="numeric"
                value={formData.affectedPonds}
                onChangeText={(val) => onUpdateFormData('affectedPonds', val)}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.formLabel}>{labels.estimatedLoss}</Text>
              <TextInput
                style={styles.input}
                placeholder={labels.estimatedLossPlaceholder}
                placeholderTextColor="#6b8aa0"
                value={formData.estimatedLoss}
                onChangeText={(val) => onUpdateFormData('estimatedLoss', val)}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{labels.symptomsObserved} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={labels.describeSymptomsPlaceholder}
              placeholderTextColor="#6b8aa0"
              multiline
              numberOfLines={4}
              value={formData.symptoms}
              onChangeText={(val) => onUpdateFormData('symptoms', val)}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{labels.actionsTaken}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={labels.containmentActionsPlaceholder}
              placeholderTextColor="#6b8aa0"
              multiline
              numberOfLines={3}
              value={formData.actionsTaken}
              onChangeText={(val) => onUpdateFormData('actionsTaken', val)}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>{labels.alertRadius}</Text>
            <View style={styles.radiusButtons}>
              {NOTIFICATION_RADIUS.map(radius => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusButton,
                    formData.notificationRadius === radius && styles.radiusButtonActive
                  ]}
                  onPress={() => onUpdateFormData('notificationRadius', radius)}
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
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="warning" size={Platform.OS === 'android' ? 18 : 20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{labels.submitReport}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  </Modal>
));
ReportModal.displayName = 'ReportModal';

const DetailCard = React.memo(({ label, value, extra }: { label: string; value?: string; extra?: React.ReactNode }) => (
  <View style={styles.detailCard}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || 'Not specified'}</Text>
    {extra}
  </View>
));
DetailCard.displayName = 'DetailCard';

const StatsModal = React.memo(({ 
  visible, onClose, severity, reports, labels, insets, onReportPress 
}: any) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={[styles.detailsModal, { paddingBottom: Math.max(insets.bottom, 20), minHeight: height * 0.4 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{severity?.toUpperCase()} Reports</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#0d2137" />
          </TouchableOpacity>
        </View>
        <FlatList 
          style={styles.detailsContent}
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item: report }) => (
            <TouchableOpacity 
              style={styles.reportListItem}
              onPress={() => onReportPress(report)}
            >
              <View style={[styles.severityDot, { backgroundColor: report.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reportListTitle}>{report.diseaseName}</Text>
                <Text style={styles.reportListSubtitle}>{report.companyName || 'Regional alert'}</Text>
                <Text style={styles.reportListTime}>
                  {new Date(report.reportDate).toLocaleString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#315f57" />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#666' }}>No recent reports for this level.</Text>
          }
        />
      </View>
    </View>
  </Modal>
));
StatsModal.displayName = 'StatsModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topSafeArea: { backgroundColor: '#dce8f2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dce8f2',
    paddingHorizontal: Platform.OS === 'android' ? 12 : 16,
    paddingBottom: Platform.OS === 'android' ? 10 : 12,
    borderBottomLeftRadius: Platform.OS === 'android' ? 16 : 20,
    borderBottomRightRadius: Platform.OS === 'android' ? 16 : 20,
    shadowColor: '#dce8f2',
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
    color: '#0d2137',
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
    shadowColor: '#dce8f2',
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
    color: '#0d2137',
  },
  userMarker: {
    backgroundColor: '#FFFFFF',
    padding: Platform.OS === 'android' ? 6 : 8,
    borderRadius: Platform.OS === 'android' ? 18 : 20,
    borderWidth: 3,
    borderColor: '#0d2137',
    shadowColor: '#dce8f2',
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
    shadowColor: '#dce8f2',
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
    shadowColor: '#dce8f2',
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
    minHeight: height * 0.5, // Added minHeight to prevent content from being hidden
  },
  reportModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24,
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24,
    maxHeight: height * 0.9,
    minHeight: height * 0.7, // Added minHeight
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
    color: '#0d2137',
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
    color: '#0d2137',
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  distanceText: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#315f57',
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
    color: '#315f57',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d2137',
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
    color: '#0d2137',
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
    color: '#0d2137',
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
    color: '#0d2137',
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
    backgroundColor: '#0d2137',
    borderColor: '#0d2137',
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
  reportListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reportListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d2137',
  },
  reportListSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reportListTime: {
    fontSize: 11,
    color: '#315f57',
    marginTop: 4,
  },
});
