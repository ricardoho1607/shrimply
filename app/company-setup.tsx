// app/company-setup.tsx - Fixed to save location with coordinates
import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';

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
  const { company, completeCompanySetup, loading } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const isEditMode = params.edit === 'true';

  if (isEditMode && !company) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0F4C75" />
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

  const businessSizes = [
    { id: 'small', label: 'Small Operation', description: '1-5 ponds' },
    { id: 'medium', label: 'Medium Farm', description: '6-20 ponds' },
    { id: 'large', label: 'Large Enterprise', description: '20+ ponds' },
  ];

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

        setFormData(prev => ({ ...prev, primaryLocation: addressString }));
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

  const validateForm = useCallback(() => {
    if (!formData.companyName.trim()) return Alert.alert('Error', 'Company name is required'), false;
    if (!formData.primaryLocation.trim()) return Alert.alert('Error', 'Primary location is required'), false;
    if (!formData.businessSize) return Alert.alert('Error', 'Please select your business size'), false;
    return true;
  }, [formData]);

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
          'Add Location Coordinates?',
          'For disease outbreak notifications to work, we need your farm coordinates. Would you like to use your current location?',
          [
            {
              text: 'Use Current Location',
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
              text: 'Skip for Now',
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
      Alert.alert('Error', error.message || 'Failed to set up your company. Please try again.');
    }
  }, [completeCompanySetup, formData, validateForm, isEditMode, company, router, locationCoordinates]);

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
        Alert.alert('Success!', 'Company information updated successfully!');
        router.back();
        return;
      }

      // Normal setup flow
      await completeCompanySetup({
        companyName: formData.companyName,
        primaryLocation: cleanedLocationData,
        country: country, 
        farmType: formData.farmType,
        businessSize: formData.businessSize as 'small' | 'medium' | 'large',
        description: formData.description,
        contactPhone: formData.contactPhone,
        isPublicProfile: formData.isPublicProfile,
      });

      Alert.alert(
        'Success!',
        'Your company has been set up successfully. You can now start managing your ponds!',
        [{ text: 'Get Started', onPress: () => router.push('/companydetails') }]
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
                <ActivityIndicator size="small" color="#0F4C75" />
              ) : (
                <>
                  <Ionicons name="location" size={16} color="#0F4C75" />
                  <Text style={styles.locationButtonText}>Use Current</Text>
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
          placeholderTextColor="#BBE1FA"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          keyboardType={keyboardType}
        />
        {key === 'primaryLocation' && locationCoordinates && (
          <View style={styles.coordinatesInfo}>
            <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
            <Text style={styles.coordinatesText}>
              Coordinates: {locationCoordinates.latitude.toFixed(6)}, {locationCoordinates.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
    ),
    [formData, updateForm, gettingLocation, locationCoordinates]
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={32} color="#0F4C75" />
          </View>
          <Text style={styles.title}>{isEditMode ? 'Edit Company Information' : 'Set Up Your Company'}</Text>
          <Text style={styles.subtitle}>
            {isEditMode ? 'Update your aquaculture business profile' : "Let's get your aquaculture business profile ready"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            {renderInput('Company/Farm Name *', 'companyName', 'e.g., Blue Ocean Shrimp Farm')}
            {renderInput('Primary Location *', 'primaryLocation', 'e.g., Jakarta, Indonesia')}
            {renderInput('Farm Specialization', 'farmType', 'e.g., Vannamei Shrimp, Intensive Culture')}
            {renderInput('Description', 'description', 'Brief description of your operation (optional)', true)}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Size *</Text>
            <Text style={styles.sectionDescription}>
              This helps us customize features for your operation
            </Text>
            {businessSizes.map(option => (
              <BusinessSizeOption key={option.id} option={option} />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact & Visibility</Text>
            {renderInput('Contact Phone', 'contactPhone', 'Your business contact number', false, 'phone-pad')}
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Public Profile</Text>
                <Text style={styles.switchDescription}>
                  Allow shrimp buyers to discover and contact your farm
                </Text>
              </View>
              <Switch
                value={formData.isPublicProfile}
                onValueChange={value => updateForm('isPublicProfile', value)}
                trackColor={{ false: '#BBE1FA', true: '#3282B8' }}
                thumbColor={formData.isPublicProfile ? '#0F4C75' : '#f4f3f4'}
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
                  {isEditMode ? 'Save Changes' : 'Complete Setup'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            You can modify these settings anytime from your profile
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#BBE1FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#3282B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    gap: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B262C',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#BBE1FA',
    borderRadius: 12,
  },
  locationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F4C75',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1B262C',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '500',
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
  },
  sizeOptionSelected: {
    borderColor: '#0F4C75',
    backgroundColor: '#EBF5FB',
  },
  sizeOptionContent: {
    flex: 1,
  },
  sizeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B262C',
    marginBottom: 4,
  },
  sizeOptionTitleSelected: {
    color: '#0F4C75',
  },
  sizeOptionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  sizeOptionDescriptionSelected: {
    color: '#3282B8',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#0F4C75',
    borderColor: '#0F4C75',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B262C',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  setupButton: {
    backgroundColor: '#0F4C75',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 12,
    marginTop: 8,
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});