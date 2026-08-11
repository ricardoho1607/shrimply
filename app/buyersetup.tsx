// app/buyersetup.tsx - With location coordinates and country
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import OnboardingProgress from './components/onboarding/OnboardingProgress';
import { getBuyerSetupProgress } from '../shared/onboarding';

interface FormData {
  companyName: string;
  location: string;
  contactPhone: string;
  businessType: string;
}

interface LocationCoordinates {
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  placeId?: string;
}

export default function BuyerSetupScreen() {
  const { user, refreshUserData, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    location: '',
    contactPhone: '',
    businessType: t.buyerSetup.businessTypeDefault,
  });
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const setupProgress = getBuyerSetupProgress([
    Boolean(formData.companyName.trim()),
    Boolean(formData.location.trim()),
    Boolean(formData.contactPhone.trim()),
    Boolean(formData.businessType.trim()),
  ]);

  const updateField = (key: keyof FormData, value: string) => 
    setFormData(prev => ({ ...prev, [key]: value }));

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/auth');
    } catch {
      Alert.alert(t.buyerSetup.error, t.sidebar.signOutFailed);
    } finally {
      setSigningOut(false);
    }
  };

  // Get current location coordinates
  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.buyerSetup.permissionDenied, t.buyerSetup.allowLocationAccess);
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // Get address from coordinates (reverse geocoding)
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const addressString = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');

        setFormData(prev => ({ ...prev, location: addressString }));
        setLocationCoordinates({
          address: addressString,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address.city || '',
          state: address.region || '',
          country: address.country || '',
        });

        Alert.alert(t.buyerSetup.success, t.buyerSetup.locationDetected);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t.buyerSetup.error, t.buyerSetup.locationFailed);
    } finally {
      setGettingLocation(false);
    }
  };

  const validateAndSubmit = async () => {
    const { companyName, location } = formData;

    if (!companyName.trim() || companyName.trim().length < 2) {
      Alert.alert(t.buyerSetup.validationError, t.buyerSetup.companyNameTooShort);
      return;
    }
    if (!location.trim()) {
      Alert.alert(t.buyerSetup.validationError, t.buyerSetup.locationRequired);
      return;
    }
    if (!user?.uid) {
      Alert.alert(t.buyerSetup.error, t.buyerSetup.userNotAuthenticated);
      return;
    }

    setIsLoading(true);
    try {
      // Prepare location data
      let locationData: LocationCoordinates | string;
      let country = '';
      
      if (locationCoordinates) {
        // Use existing coordinates
        locationData = {
          address: formData.location,
          latitude: locationCoordinates.latitude,
          longitude: locationCoordinates.longitude,
          city: locationCoordinates.city,
          state: locationCoordinates.state,
          country: locationCoordinates.country,
          placeId: locationCoordinates.placeId,
        };
        country = locationCoordinates.country;
      } else {
        // If no coordinates, ask user if they want to add them
        const shouldGetLocation = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t.buyerSetup.addCoordinatesTitle,
            t.buyerSetup.addCoordinatesMessage,
            [
              {
                text: t.buyerSetup.useCurrentLocation,
                onPress: () => resolve(true),
              },
              {
                text: t.buyerSetup.skipForNow,
                onPress: () => resolve(false),
              },
            ]
          );
        });

        if (shouldGetLocation) {
          try {
            setGettingLocation(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status === 'granted') {
              const location = await Location.getCurrentPositionAsync({});
              
              // Try to get address details
              try {
                const addresses = await Location.reverseGeocodeAsync({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                });
                
                const address = addresses && addresses.length > 0 ? addresses[0] : null;
                
                locationData = {
                  address: formData.location,
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  city: address?.city || '',
                  state: address?.region || '',
                  country: address?.country || '',
                };
                country = address?.country || '';
              } catch {
                // If geocoding fails, just use coordinates
                locationData = {
                  address: formData.location,
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  city: '',
                  state: '',
                  country: '',
                };
              }
            } else {
              // If permission denied, save without coordinates (string)
              locationData = formData.location;
            }
          } catch (error) {
            console.error('Error getting location:', error);
            // If error, save without coordinates
            locationData = formData.location;
          } finally {
            setGettingLocation(false);
          }
        } else {
          locationData = formData.location;
        }
      }

      // Clean location data to remove undefined fields
      let cleanedLocationData: LocationCoordinates | string;
      if (typeof locationData === 'object' && locationData !== null) {
        cleanedLocationData = {
          address: locationData.address,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          ...(locationData.placeId ? { placeId: locationData.placeId } : {}),
        };
      } else {
        cleanedLocationData = locationData;
      }

      const companyData: any = {
        id: user.uid,
        companyName: companyName.trim(),
        primaryLocation: cleanedLocationData,
        country: country || '',
        contactPhone: formData.contactPhone.trim() || '',
        businessType: formData.businessType.trim() || t.buyerSetup.fallbackBusinessType,
        farmType: 'buyer',
        businessSize: 'medium',
        description: '',
        ownerId: user.uid,
        teamMembers: [user.uid],
        pendingInvites: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublicProfile: false,
      };

      // Add locationData if available
      if (typeof cleanedLocationData === 'object') {
        companyData.locationData = cleanedLocationData;
      }

      await setDoc(doc(db, 'companies', user.uid), companyData);
      await updateDoc(doc(db, 'users', user.uid), {
        companyId: user.uid,
        hasCompletedSetup: true,
        lastActive: serverTimestamp(),
      });

      if (refreshUserData) await refreshUserData();

      Alert.alert(
        t.buyerSetup.setupCompleteTitle,
        t.buyerSetup.setupCompleteMessage,
        [{ text: t.buyerSetup.getStarted, onPress: () => router.replace('/indexbuyer') }]
      );
    } catch (error) {
      console.error('Error setting up buyer profile:', error);
      Alert.alert(t.buyerSetup.setupFailedTitle, t.buyerSetup.setupFailedMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    label: string, 
    key: keyof FormData, 
    placeholder: string, 
    required = false, 
    keyboardType: 'default' | 'phone-pad' = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {key === 'location' && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#0d2137" />
            ) : (
              <>
                <Ionicons name="location" size={16} color="#27AE60" />
                <Text style={styles.locationButtonText}>{t.buyerSetup.useCurrent}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={formData[key]}
        onChangeText={value => {
          updateField(key, value);
          // Clear coordinates if manually editing location
          if (key === 'location') {
            setLocationCoordinates(null);
          }
        }}
        placeholderTextColor="#6b8aa0"
        keyboardType={keyboardType}
        autoCapitalize={key === 'contactPhone' ? 'none' : 'words'}
      />
      {key === 'location' && locationCoordinates && (
        <View style={styles.coordinatesInfo}>
          <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
          <Text style={styles.coordinatesText}>
            {t.buyerSetup.coordinates}: {locationCoordinates.latitude.toFixed(6)}, {locationCoordinates.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#315f57" />
            <Text style={styles.backButtonText}>{t.buyerSetup.back}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleSignOut}
            disabled={signingOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#e74c3c" />
            ) : (
              <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
            )}
            <Text style={styles.logoutButtonText}>{t.sidebar.signOut}</Text>
          </TouchableOpacity>
        </View>

        <OnboardingProgress
          percent={setupProgress}
          title={t.onboardingProgress.buyer}
          detail={t.onboardingProgress.buyerDetail}
        />

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="cart-outline" size={32} color="#27AE60" />
          </View>
          <Text style={styles.title}>{t.buyerSetup.title}</Text>
          <Text style={styles.subtitle}>{t.buyerSetup.subtitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.buyerSetup.companyInformation}</Text>
          <Text style={styles.sectionDescription}>{t.buyerSetup.sectionDescription}</Text>
          {renderInput(t.buyerSetup.companyName, 'companyName', t.buyerSetup.companyNamePlaceholder, true)}
          {renderInput(t.buyerSetup.location, 'location', t.buyerSetup.locationPlaceholder, true)}
          {renderInput(t.buyerSetup.contactPhone, 'contactPhone', t.buyerSetup.contactPhonePlaceholder, false, 'phone-pad')}
          {renderInput(t.buyerSetup.businessType, 'businessType', t.buyerSetup.businessTypePlaceholder)}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#315f57" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>{t.buyerSetup.aboutTitle}</Text>
            <Text style={styles.infoText}>{t.buyerSetup.aboutText}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.setupButton, (isLoading || gettingLocation) && styles.setupButtonDisabled]} 
          onPress={validateAndSubmit} 
          disabled={isLoading || gettingLocation} 
          activeOpacity={0.8}
        >
          {(isLoading || gettingLocation) ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.setupButtonText}>{t.buyerSetup.completeSetup}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t.buyerSetup.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  scrollContent: { padding: Platform.OS === 'android' ? 18 : 20, paddingTop: Platform.OS === 'android' ? 18 : 20, paddingBottom: Platform.OS === 'android' ? 36 : 40 },
  topActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: Platform.OS === 'android' ? 18 : 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: Platform.OS === 'android' ? 7 : 8 },
  backButtonText: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#315f57', marginLeft: Platform.OS === 'android' ? 7 : 8, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Platform.OS === 'android' ? 7 : 8, paddingHorizontal: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#FECDCA', backgroundColor: '#FEF3F2' },
  logoutButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '700' },
  header: { alignItems: 'center', marginBottom: Platform.OS === 'android' ? 36 : 40 },
  headerIcon: { 
    width: Platform.OS === 'android' ? 76 : 80, 
    height: Platform.OS === 'android' ? 76 : 80, 
    borderRadius: Platform.OS === 'android' ? 38 : 40, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 18 : 20, 
    borderWidth: 2, 
    borderColor: '#27AE60', 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  title: { fontSize: Platform.OS === 'android' ? 26 : 28, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 7 : 8, textAlign: 'center' },
  subtitle: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#315f57', textAlign: 'center', marginHorizontal: Platform.OS === 'android' ? 18 : 20, lineHeight: Platform.OS === 'android' ? 20 : 22 },
  section: { marginBottom: Platform.OS === 'android' ? 22 : 24 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  sectionDescription: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginBottom: Platform.OS === 'android' ? 14 : 16, lineHeight: Platform.OS === 'android' ? 18 : 20 },
  inputContainer: { marginBottom: Platform.OS === 'android' ? 18 : 20 },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 7 : 8,
  },
  inputLabel: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137' },
  required: { color: '#e74c3c', fontWeight: 'bold' },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Platform.OS === 'android' ? 7 : 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: Platform.OS === 'android' ? 7 : 8,
  },
  locationButtonText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#FFFFFF', 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16 
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 7 : 8,
    paddingHorizontal: Platform.OS === 'android' ? 7 : 8,
  },
  coordinatesText: {
    fontSize: Platform.OS === 'android' ? 10 : 11,
    color: '#27ae60',
    marginLeft: 4,
    fontWeight: '600',
  },
  infoBox: { 
    flexDirection: 'row', 
    padding: Platform.OS === 'android' ? 14 : 16, 
    backgroundColor: '#E3F2FD', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    marginBottom: Platform.OS === 'android' ? 22 : 24, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  infoTextContainer: { flex: 1, marginLeft: Platform.OS === 'android' ? 10 : 12 },
  infoTitle: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137', marginBottom: 4 },
  infoText: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#315f57', lineHeight: Platform.OS === 'android' ? 16 : 18 },
  setupButton: { 
    backgroundColor: '#27AE60', 
    paddingVertical: Platform.OS === 'android' ? 16 : 18, 
    paddingHorizontal: Platform.OS === 'android' ? 28 : 32, 
    borderRadius: Platform.OS === 'android' ? 12 : 14, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: Platform.OS === 'android' ? 14 : 16, 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  setupButtonDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  setupButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', marginLeft: Platform.OS === 'android' ? 7 : 8 },
  disclaimer: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', textAlign: 'center', marginTop: Platform.OS === 'android' ? 10 : 12, fontStyle: 'italic' },
});
