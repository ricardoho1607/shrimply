// app/buyersetup.tsx - With location coordinates and country
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';

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
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    location: '',
    contactPhone: '',
    businessType: 'Wholesale Distributor',
  });
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (key: keyof FormData, value: string) => 
    setFormData(prev => ({ ...prev, [key]: value }));

  // Get current location coordinates
  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature.');
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

        Alert.alert('Success', 'Location detected successfully!');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please enter it manually.');
    } finally {
      setGettingLocation(false);
    }
  };

  const validateAndSubmit = async () => {
    const { companyName, location } = formData;

    if (!companyName.trim() || companyName.trim().length < 2) {
      Alert.alert('Validation Error', 'Company name must be at least 2 characters');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Location is required');
      return;
    }
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated. Please sign in again.');
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
            'Add Location Coordinates?',
            'For better marketplace filtering, we recommend adding your location coordinates. Would you like to use your current location?',
            [
              {
                text: 'Use Current Location',
                onPress: () => resolve(true),
              },
              {
                text: 'Skip for Now',
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
              } catch (geocodeError) {
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
        businessType: formData.businessType.trim() || 'Shrimp Buyer',
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
        updatedAt: new Date().toISOString(),
      });

      if (refreshUserData) await refreshUserData();

      Alert.alert(
        'Setup Complete!',
        'Your buyer profile has been created successfully. You can now start monitoring suppliers!',
        [{ text: 'Get Started', onPress: () => router.replace('/(tabs)/indexbuyer') }]
      );
    } catch (error) {
      console.error('Error setting up buyer profile:', error);
      Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Failed to set up buyer profile. Please try again.');
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
              <ActivityIndicator size="small" color="#0F4C75" />
            ) : (
              <>
                <Ionicons name="location" size={16} color="#27AE60" />
                <Text style={styles.locationButtonText}>Use Current</Text>
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
        placeholderTextColor="#BBE1FA"
        keyboardType={keyboardType}
        autoCapitalize={key === 'contactPhone' ? 'none' : 'words'}
      />
      {key === 'location' && locationCoordinates && (
        <View style={styles.coordinatesInfo}>
          <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
          <Text style={styles.coordinatesText}>
            Coordinates: {locationCoordinates.latitude.toFixed(6)}, {locationCoordinates.longitude.toFixed(6)}
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#3282B8" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="cart-outline" size={32} color="#27AE60" />
          </View>
          <Text style={styles.title}>Set Up Your Buyer Profile</Text>
          <Text style={styles.subtitle}>Tell us about your business to start monitoring suppliers</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <Text style={styles.sectionDescription}>This information helps suppliers identify and contact you</Text>
          {renderInput('Company Name', 'companyName', 'e.g., Pacific Seafood Trading', true)}
          {renderInput('Location', 'location', 'e.g., Jakarta, Indonesia', true)}
          {renderInput('Contact Phone', 'contactPhone', 'Your business contact number', false, 'phone-pad')}
          {renderInput('Business Type', 'businessType', 'e.g., Wholesale Distributor, Restaurant Chain')}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#3282B8" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>About Buyer Accounts</Text>
            <Text style={styles.infoText}>
              As a buyer, you can monitor supplier farms in real-time, track shrimp availability, and communicate directly with suppliers.
            </Text>
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
              <Text style={styles.setupButtonText}>Complete Setup</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>You can modify these settings anytime from your profile</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingTop: 20, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingVertical: 8 },
  backButtonText: { fontSize: 16, color: '#3282B8', marginLeft: 8, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 40 },
  headerIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20, 
    borderWidth: 2, 
    borderColor: '#27AE60', 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B262C', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#3282B8', textAlign: 'center', marginHorizontal: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B262C', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#3282B8', marginBottom: 16, lineHeight: 20 },
  inputContainer: { marginBottom: 20 },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1B262C' },
  required: { color: '#e74c3c', fontWeight: 'bold' },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  locationButtonText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    color: '#1B262C', 
    fontSize: 16 
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  coordinatesText: {
    fontSize: 11,
    color: '#27ae60',
    marginLeft: 4,
    fontWeight: '600',
  },
  infoBox: { 
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: '#E3F2FD', 
    borderRadius: 12, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#BBE1FA' 
  },
  infoTextContainer: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1B262C', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#3282B8', lineHeight: 18 },
  setupButton: { 
    backgroundColor: '#27AE60', 
    paddingVertical: 18, 
    paddingHorizontal: 32, 
    borderRadius: 14, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 16, 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  setupButtonDisabled: { opacity: 0.6, shadowOpacity: 0, elevation: 0 },
  setupButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  disclaimer: { fontSize: 12, color: '#3282B8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});