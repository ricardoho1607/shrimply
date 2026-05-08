// app/company-setup2.tsx - With location coordinates and i18n support
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';

interface CompanyData {
  companyName: string;
  primaryLocation: string;
  farmType: string;
  businessSize: 'small' | 'medium' | 'large' | '';
  description: string;
  contactPhone: string;
  isPublicProfile: boolean;
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

export default function CompanySetupScreen() {
  const { company, completeCompanySetup, loading, refreshUserData } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const isEditMode = params.edit === 'true';

  if (isEditMode && !company) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f8fc' }}>
        <ActivityIndicator size="large" color="#0d2137" />
      </View>
    );
  }

  const [formData, setFormData] = useState<CompanyData>({
    companyName: '',
    primaryLocation: '',
    farmType: '',
    businessSize: '',
    description: '',
    contactPhone: '',
    isPublicProfile: false,
  });

  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Business sizes with translations
  const businessSizes = useMemo(() => [
    { id: 'small', label: t.companySetup.smallOperation, description: t.companySetup.smallDescription },
    { id: 'medium', label: t.companySetup.mediumFarm, description: t.companySetup.mediumDescription },
    { id: 'large', label: t.companySetup.largeEnterprise, description: t.companySetup.largeDescription },
  ], [t]);

  // Prefill form in edit mode
  useEffect(() => {
    if (isEditMode && company) {
      setFormData({
        companyName: company.companyName,
        primaryLocation: typeof company.primaryLocation === 'string' ? company.primaryLocation : company.primaryLocation?.address || '',
        farmType: company.farmType,
        businessSize: company.businessSize,
        description: company.description,
        contactPhone: company.contactPhone,
        isPublicProfile: company.isPublicProfile,
      });

      // If editing and location is already an object, preserve coordinates
      if (company.primaryLocation && typeof company.primaryLocation !== 'string') {
        setLocationCoordinates({
          address: company.primaryLocation.address,
          latitude: company.primaryLocation.latitude,
          longitude: company.primaryLocation.longitude,
          city: company.primaryLocation.city || '',
          state: company.primaryLocation.state || '',
          country: company.primaryLocation.country || '',
          placeId: company.primaryLocation.placeId,
        });
      }
    }
  }, [isEditMode, company]);

  const updateForm = useCallback(
    (key: keyof CompanyData, value: any) => setFormData(prev => ({ ...prev, [key]: value })),
    []
  );

  // Get current location coordinates
  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.messages.error, t.companySetup.locationPermissionDenied || 'Please allow location access to use this feature.');
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

        setFormData(prev => ({ ...prev, primaryLocation: addressString }));
        setLocationCoordinates({
          address: addressString,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address.city || '',
          state: address.region || '',
          country: address.country || '',
        });

        Alert.alert(t.messages.success, t.companySetup.locationDetected);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(t.messages.error, t.companySetup.locationError);
    } finally {
      setGettingLocation(false);
    }
  };

  const validateForm = useCallback(() => {
    if (!formData.companyName.trim()) {
      Alert.alert(t.messages.error, t.companySetup.companyNameRequired);
      return false;
    }
    if (!formData.primaryLocation.trim()) {
      Alert.alert(t.messages.error, t.companySetup.locationRequired);
      return false;
    }
    if (!formData.businessSize) {
      Alert.alert(t.messages.error, t.companySetup.businessSizeRequired);
      return false;
    }
    return true;
  }, [formData, t]);

  const handleSetupComplete = useCallback(async () => {
    if (!validateForm()) return;

    try {
      // Prepare location data
      let locationData: LocationCoordinates | string;
      
      if (locationCoordinates) {
        // Use existing coordinates
        locationData = {
          address: formData.primaryLocation,
          latitude: locationCoordinates.latitude,
          longitude: locationCoordinates.longitude,
          city: locationCoordinates.city,
          state: locationCoordinates.state,
          country: locationCoordinates.country,
          placeId: locationCoordinates.placeId,
        };
      } else {
        // If no coordinates, try to get current location or use a default
        Alert.alert(
          t.companySetup.addCoordinates,
          t.companySetup.coordinatesPrompt,
          [
            {
              text: t.companySetup.useCurrentLocation,
              onPress: async () => {
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
                        address: formData.primaryLocation,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        city: address?.city || '',
                        state: address?.region || '',
                        country: address?.country || '',
                      };
                    } catch (geocodeError) {
                      // If geocoding fails, just use coordinates
                      locationData = {
                        address: formData.primaryLocation,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        city: '',
                        state: '',
                        country: '',
                      };
                    }
                  } else {
                    // If permission denied, save without coordinates (string)
                    locationData = formData.primaryLocation;
                  }
                  
                  await saveCompanyData(locationData);
                } catch (error) {
                  console.error('Error getting location:', error);
                  // If error, save without coordinates
                  await saveCompanyData(formData.primaryLocation);
                } finally {
                  setGettingLocation(false);
                }
              },
            },
            {
              text: t.companySetup.skipForNow,
              onPress: async () => {
                await saveCompanyData(formData.primaryLocation);
              },
            },
          ]
        );
        return; // Exit early, will continue in alert handlers
      }

      await saveCompanyData(locationData);
    } catch (error: any) {
      console.error('Company setup failed:', error);
      Alert.alert(t.messages.error, t.companySetup.saveFailed);
    }
  }, [completeCompanySetup, formData, validateForm, isEditMode, company, router, locationCoordinates, refreshUserData, t]);

  const saveCompanyData = async (locationData: LocationCoordinates | string) => {
    try {
      // Clean location data to remove undefined fields
      let cleanedLocationData: LocationCoordinates | string;
      let country = '';  // ADD THIS LINE
      
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
        country = locationData.country;  // ADD THIS LINE
      } else {
        cleanedLocationData = locationData;
      }

      console.log('Saving company data:', {
        companyName: formData.companyName,
        primaryLocation: cleanedLocationData,
        isEditMode,
      });

      if (isEditMode && company) {
        // Update existing company
        await updateDoc(doc(db, 'companies', company.id), {
          companyName: formData.companyName,
          primaryLocation: cleanedLocationData,
          country: country || company.country || '',
          farmType: formData.farmType,
          businessSize: formData.businessSize,
          description: formData.description,
          contactPhone: formData.contactPhone,
          isPublicProfile: formData.isPublicProfile,
        });
        console.log('Company updated successfully');
        Alert.alert(t.messages.success, t.companySetup.updateSuccess);
        router.back();
        return;
      }

      // Normal setup flow
      const setupData = {
        companyName: formData.companyName,
        primaryLocation: cleanedLocationData,
        country: country,
        farmType: formData.farmType,
        businessSize: formData.businessSize as 'small' | 'medium' | 'large',
        description: formData.description,
        contactPhone: formData.contactPhone,
        isPublicProfile: formData.isPublicProfile,
      };

      console.log('Calling completeCompanySetup with:', setupData);
      
      await completeCompanySetup(setupData);

      console.log('Company setup completed successfully');

      // Wait a moment for Firestore to sync
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh user data to ensure company is loaded
      if (refreshUserData) {
        try {
          await refreshUserData();
        } catch (refreshError) {
          console.log('Non-critical: Could not refresh user data:', refreshError);
        }
      }

      Alert.alert(
        t.messages.success,
        t.companySetup.setupSuccess,
        [{ 
          text: t.companySetup.getStarted, 
          onPress: () => {
            // Navigate to home which will redirect properly
            router.replace('/(tabs)' as any);
          }
        }]
      );
    } catch (error: any) {
      throw error;
    }
  };

  const renderInput = useCallback(
    (
      label: string,
      key: keyof CompanyData,
      placeholder: string,
      multiline = false,
      keyboardType: 'default' | 'phone-pad' = 'default'
    ) => (
      <View style={styles.inputContainer}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.inputLabel}>{label}</Text>
          {key === 'primaryLocation' && (
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#0d2137" />
              ) : (
                <>
                  <Ionicons name="location" size={16} color="#0d2137" />
                  <Text style={styles.locationButtonText}>{t.companySetup.useCurrent}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          placeholder={placeholder}
          value={formData[key] as string}
          onChangeText={value => {
            updateForm(key, value);
            // Clear coordinates if manually editing location
            if (key === 'primaryLocation') {
              setLocationCoordinates(null);
            }
          }}
          placeholderTextColor="#6b8aa0"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
        />
        {key === 'primaryLocation' && locationCoordinates && (
          <View style={styles.coordinatesInfo}>
            <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
            <Text style={styles.coordinatesText}>
              {t.companySetup.coordinates}: {locationCoordinates.latitude.toFixed(6)}, {locationCoordinates.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    ),
    [formData, updateForm, gettingLocation, locationCoordinates, t]
  );

  const BusinessSizeOption = useCallback(
    ({ option }: { option: typeof businessSizes[0] }) => {
      const selected = formData.businessSize === option.id;
      return (
        <TouchableOpacity
          style={[styles.sizeOption, selected && styles.sizeOptionSelected]}
          onPress={() => updateForm('businessSize', option.id)}
        >
          <View style={styles.sizeOptionContent}>
            <Text style={[styles.sizeOptionTitle, selected && styles.sizeOptionTitleSelected]}>
              {option.label}
            </Text>
            <Text style={[styles.sizeOptionDescription, selected && styles.sizeOptionDescriptionSelected]}>
              {option.description}
            </Text>
          </View>
          <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
            {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
      );
    },
    [formData.businessSize, updateForm]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={32} color="#0d2137" />
          </View>
          <Text style={styles.title}>
            {isEditMode ? t.companySetup.editTitle : t.companySetup.title}
          </Text>
          <Text style={styles.subtitle}>
            {isEditMode ? t.companySetup.editSubtitle : t.companySetup.subtitle}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.companySetup.companyInformation}</Text>
            {renderInput(
              `${t.companySetup.companyName} ${t.companySetup.required}`,
              'companyName',
              t.companySetup.companyNamePlaceholder
            )}
            {renderInput(
              `${t.companySetup.primaryLocation} ${t.companySetup.required}`,
              'primaryLocation',
              t.companySetup.locationPlaceholder
            )}
            {renderInput(
              t.companySetup.farmSpecialization,
              'farmType',
              t.companySetup.farmTypePlaceholder
            )}
            {renderInput(
              t.companySetup.description,
              'description',
              t.companySetup.descriptionPlaceholder,
              true
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.companySetup.businessSize} {t.companySetup.required}
            </Text>
            <Text style={styles.sectionDescription}>
              {t.companySetup.businessSizeHelp}
            </Text>
            {businessSizes.map(option => (
              <BusinessSizeOption key={option.id} option={option} />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.companySetup.contactVisibility}</Text>
            {renderInput(
              t.companySetup.contactPhone,
              'contactPhone',
              t.companySetup.phonePlaceholder,
              false,
              'phone-pad'
            )}
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>{t.companySetup.publicProfile}</Text>
                <Text style={styles.switchDescription}>
                  {t.companySetup.publicProfileDescription}
                </Text>
              </View>
              <Switch
                value={formData.isPublicProfile}
                onValueChange={value => updateForm('isPublicProfile', value)}
                trackColor={{ false: '#dbe7df', true: '#315f57' }}
                thumbColor={formData.isPublicProfile ? '#0d2137' : '#f4f3f4'}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.setupButton, (loading || gettingLocation) && styles.setupButtonDisabled]}
            onPress={handleSetupComplete}
            disabled={loading || gettingLocation}
          >
            {(loading || gettingLocation) ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.setupButtonText}>
                  {isEditMode ? t.companySetup.saveChanges : t.companySetup.completeSetup}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            {t.companySetup.disclaimer}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fc',
  },
  scrollContent: {
    padding: Platform.OS === 'android' ? 18 : 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 28 : 32,
  },
  headerIcon: {
    width: Platform.OS === 'android' ? 76 : 80,
    height: Platform.OS === 'android' ? 76 : 80,
    borderRadius: Platform.OS === 'android' ? 38 : 40,
    backgroundColor: '#dce8f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 26 : 28,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: Platform.OS === 'android' ? 7 : 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#315f57',
    textAlign: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  form: {
    gap: Platform.OS === 'android' ? 22 : 24,
  },
  section: {
    gap: Platform.OS === 'android' ? 14 : 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: '600',
    color: '#0d2137',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748b',
    marginBottom: Platform.OS === 'android' ? 7 : 8,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  inputContainer: {
    gap: Platform.OS === 'android' ? 7 : 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '500',
    color: '#334155',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
    backgroundColor: '#dce8f2',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
  },
  locationButtonText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: '#0d2137',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    fontSize: Platform.OS === 'android' ? 15 : 16,
    color: '#0d2137',
  },
  multilineInput: {
    height: Platform.OS === 'android' ? 90 : 100,
    textAlignVertical: 'top',
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 5 : 6,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 7 : 8,
    backgroundColor: '#f0fdf4',
    borderRadius: Platform.OS === 'android' ? 7 : 8,
  },
  coordinatesText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#15803d',
    fontWeight: '500',
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Platform.OS === 'android' ? 14 : 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  sizeOptionSelected: {
    borderColor: '#0d2137',
    backgroundColor: '#EBF5FB',
  },
  sizeOptionContent: {
    flex: 1,
  },
  sizeOptionTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    color: '#0d2137',
    marginBottom: 4,
  },
  sizeOptionTitleSelected: {
    color: '#0d2137',
  },
  sizeOptionDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748b',
  },
  sizeOptionDescriptionSelected: {
    color: '#315f57',
  },
  radioButton: {
    width: Platform.OS === 'android' ? 22 : 24,
    height: Platform.OS === 'android' ? 22 : 24,
    borderRadius: Platform.OS === 'android' ? 11 : 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#0d2137',
    borderColor: '#0d2137',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 14 : 16,
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchInfo: {
    flex: 1,
    marginRight: Platform.OS === 'android' ? 14 : 16,
  },
  switchLabel: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '500',
    color: '#0d2137',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748b',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  setupButton: {
    backgroundColor: '#0d2137',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'android' ? 7 : 8,
    padding: Platform.OS === 'android' ? 16 : 18,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    marginTop: Platform.OS === 'android' ? 7 : 8,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'android' ? 17 : 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
