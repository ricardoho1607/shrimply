// app/marketplace/create-buyer-listing.tsx - Android Optimized
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useMarketplaceStore } from '../store/marketplaceStore';
import * as Location from 'expo-location';
import AppDatePicker from '../components/forms/AppDatePicker';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface PriceList {
  size20: string;
  size30: string;
  size40: string;
  size50: string;
  size60: string;
  size70: string;
  size80: string;
  size90: string;
  size100: string;
  size100Plus: string;
}

interface FormData {
  buyerName: string;
  companyName: string;
  contactPhone: string;
  contactEmail: string;
  deliveryLocation: string;
  city: string;
  latitude: number;
  longitude: number;
  priceList: PriceList;
  paymentMethod: 'cash' | 'top';
  topDays: 7 | 14 | 21;
  additionalNotes: string;
  expiryDate: Date;
}

const SHRIMP_SIZES = [
  { label: '20', key: 'size20' },
  { label: '30', key: 'size30' },
  { label: '40', key: 'size40' },
  { label: '50', key: 'size50' },
  { label: '60', key: 'size60' },
  { label: '70', key: 'size70' },
  { label: '80', key: 'size80' },
  { label: '90', key: 'size90' },
  { label: '100', key: 'size100' },
  { label: '100+', key: 'size100Plus' },
];

const CreateBuyerListingScreen = () => {
  const router = useRouter();
  const { user, company } = useAuth();
  const { t } = useLanguage();
  const { currencyConfig } = useCurrency();
  const { addBuyerListing } = useMarketplaceStore();

  const [formData, setFormData] = useState<FormData>({
    buyerName: user?.email?.split('@')[0] || '',
    companyName: company?.companyName || '',
    contactPhone: '',
    contactEmail: user?.email || '',
    deliveryLocation: '',
    city: '',
    latitude: 0,
    longitude: 0,
    priceList: {
      size20: '', size30: '', size40: '', size50: '', size60: '',
      size70: '', size80: '', size90: '', size100: '', size100Plus: '',
    },
    paymentMethod: 'cash',
    topDays: 7,
    additionalNotes: '',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const [gettingLocation, setGettingLocation] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateForm = useCallback((key: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePriceList = useCallback((sizeKey: keyof PriceList, value: string) => {
    setFormData(prev => ({
      ...prev,
      priceList: { ...prev.priceList, [sizeKey]: value }
    }));
  }, []);

  const useCompanyLocation = useCallback(() => {
    const loc = company?.primaryLocation;
    if (loc && typeof loc !== 'string') {
      setFormData(prev => ({
        ...prev,
        deliveryLocation: loc.address,
        city: (loc as any).city || '',
        latitude: (loc as any).latitude || 0,
        longitude: (loc as any).longitude || 0,
      }));
      Alert.alert(t.messages.success, t.companySetup.locationDetected);
    } else {
      Alert.alert(t.messages.error, t.companySetup.locationRequired);
    }
  }, [company, t]);

  const detectCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.messages.error, t.companySetup.locationPermissionDenied);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
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

        setFormData(prev => ({
          ...prev,
          deliveryLocation: addressString,
          city: address.city || '',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
        Alert.alert(t.messages.success, t.companySetup.locationDetected);
      }
    } catch (error) {
      console.error('Error detecting location:', error);
      Alert.alert(t.messages.error, t.companySetup.locationError);
    } finally {
      setGettingLocation(false);
    }
  };

  const validateForm = useCallback((): boolean => {
    if (!formData.buyerName.trim() || !formData.companyName.trim() || 
        !formData.contactPhone.trim() || !formData.contactEmail.trim() || 
        !formData.deliveryLocation.trim()) {
      Alert.alert(t.CreateBuyerListingScreen.validationError, t.CreateBuyerListingScreen.fillContactInfo);
      return false;
    }

    const hasPrices = Object.values(formData.priceList).some(price => price.trim() !== '');
    if (!hasPrices) {
      Alert.alert(t.CreateBuyerListingScreen.validationError, t.CreateBuyerListingScreen.enterAtLeastOnePrice);
      return false;
    }

    for (const [key, value] of Object.entries(formData.priceList)) {
      if (value.trim() !== '') {
        const price = parseFloat(value);
        if (isNaN(price) || price <= 0) {
          Alert.alert(
            t.CreateBuyerListingScreen.validationError, 
            `${t.CreateBuyerListingScreen.enterValidPrice} ${key.replace('size', '')}`
          );
          return false;
        }
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      Alert.alert(t.CreateBuyerListingScreen.validationError, t.CreateBuyerListingScreen.enterValidEmail);
      return false;
    }

    if (!/^\+?[\d\s\-\(\)]+$/.test(formData.contactPhone)) {
      Alert.alert(t.CreateBuyerListingScreen.validationError, t.CreateBuyerListingScreen.enterValidPhone);
      return false;
    }

    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (formData.expiryDate > maxDate) {
      Alert.alert(t.CreateBuyerListingScreen.validationError, t.CreateBuyerListingScreen.expiryCannotExceed);
      return false;
    }

    return true;
  }, [formData, t]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const priceListData: any = {};
      Object.entries(formData.priceList).forEach(([key, value]) => {
        if (value.trim() !== '') {
          priceListData[key] = parseFloat(value);
        }
      });

      let country = company?.country;
      
      if (!country && company?.primaryLocation && typeof company.primaryLocation === 'object') {
        country = company.primaryLocation.country;
      }

      await addBuyerListing({
        companyId: company?.id || '',
        buyerName: formData.buyerName.trim(),
        companyName: formData.companyName.trim(),
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim(),
        deliveryLocation: formData.deliveryLocation.trim(),
        city: formData.city.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        country: country || '',
        priceList: priceListData,
        paymentMethod: formData.paymentMethod,
        topDays: formData.paymentMethod === 'top' ? formData.topDays : undefined,
        additionalNotes: formData.additionalNotes.trim(),
        expiryDate: formData.expiryDate.toISOString(),
        userId: user?.uid,
      });

      Alert.alert(
        t.CreateBuyerListingScreen.success,
        t.CreateBuyerListingScreen.listingPostedSuccess,
        [{ text: t.CreateBuyerListingScreen.ok, onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert(t.CreateBuyerListingScreen.error, t.CreateBuyerListingScreen.errorCreatingListing);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, addBuyerListing, router, company, t]);

  const maxExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.CreateBuyerListingScreen.createBuyingRequest}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.formContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.CreateBuyerListingScreen.contactInformation}</Text>
          <Input 
            label={t.CreateBuyerListingScreen.buyerName} 
            value={formData.buyerName} 
            onChangeText={(v) => updateForm('buyerName', v)} 
            placeholder={t.CreateBuyerListingScreen.yourFullName} 
            required 
            t={t}
          />
          <Input 
            label={t.CreateBuyerListingScreen.companyName} 
            value={formData.companyName} 
            onChangeText={(v) => updateForm('companyName', v)} 
            placeholder={t.CreateBuyerListingScreen.yourCompanyName} 
            required 
            t={t}
          />
          <Input 
            label={t.CreateBuyerListingScreen.phoneNumber} 
            value={formData.contactPhone} 
            onChangeText={(v) => updateForm('contactPhone', v)} 
            placeholder={t.CreateBuyerListingScreen.phoneExample} 
            keyboardType="phone-pad" 
            required 
            t={t}
          />
          <Input 
            label={t.CreateBuyerListingScreen.emailAddress} 
            value={formData.contactEmail} 
            onChangeText={(v) => updateForm('contactEmail', v)} 
            placeholder={t.CreateBuyerListingScreen.emailExample} 
            keyboardType="email-address" 
            required 
            t={t}
          />
          <Input 
            label={t.CreateBuyerListingScreen.deliveryLocation} 
            value={formData.deliveryLocation} 
            onChangeText={(v) => updateForm('deliveryLocation', v)} 
            placeholder={t.CreateBuyerListingScreen.cityStateAddress} 
            required 
            t={t}
          />
          <View style={styles.locationActionButtons}>
            <TouchableOpacity 
              style={styles.locationActionBtn} 
              onPress={useCompanyLocation}
              activeOpacity={0.7}
            >
              <Ionicons name="business" size={16} color="#0d2137" />
              <Text style={styles.locationActionText}>{t.companySetup.useCurrent}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.locationActionBtn} 
              onPress={detectCurrentLocation}
              disabled={gettingLocation}
              activeOpacity={0.7}
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#0d2137" />
              ) : (
                <>
                  <Ionicons name="location" size={16} color="#0d2137" />
                  <Text style={styles.locationActionText}>Detect</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {formData.city ? (
            <View style={styles.cityBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#27ae60" />
              <Text style={styles.cityBadgeText}>City detected: {formData.city}</Text>
            </View>
          ) : null}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Country <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.countryDisplay}>
              <Ionicons name="flag-outline" size={Platform.OS === 'android' ? 14 : 16} color="#315f57" />
              <Text style={styles.countryText}>
                {company?.country || 
                 (typeof company?.primaryLocation === 'object' ? company.primaryLocation.country : 'Not set')}
              </Text>
            </View>
            <Text style={styles.inputHint}>
              Country is automatically set from your company profile
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.CreateBuyerListingScreen.priceListPerKg}</Text>
          <Text style={styles.sectionDescription}>{t.CreateBuyerListingScreen.enterBuyingPrice}</Text>
          
          <View style={styles.priceTable}>
            {[0, 1, 2, 3, 4].map((rowIndex) => (
              <View key={rowIndex} style={styles.priceRow}>
                <View style={styles.priceCell}>
                  <Text style={styles.sizeLabel}>{SHRIMP_SIZES[rowIndex * 2].label}</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>{currencyConfig.symbol}</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={formData.priceList[SHRIMP_SIZES[rowIndex * 2].key as keyof PriceList]}
                      onChangeText={(v) => updatePriceList(SHRIMP_SIZES[rowIndex * 2].key as keyof PriceList, v)}
                      placeholder="0.00"
                      placeholderTextColor="#6b8aa0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.priceCell}>
                  <Text style={styles.sizeLabel}>{SHRIMP_SIZES[rowIndex * 2 + 1].label}</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>{currencyConfig.symbol}</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={formData.priceList[SHRIMP_SIZES[rowIndex * 2 + 1].key as keyof PriceList]}
                      onChangeText={(v) => updatePriceList(SHRIMP_SIZES[rowIndex * 2 + 1].key as keyof PriceList, v)}
                      placeholder="0.00"
                      placeholderTextColor="#6b8aa0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.CreateBuyerListingScreen.additionalInformation}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t.CreateBuyerListingScreen.paymentMethod} <Text style={styles.required}>{t.CreateBuyerListingScreen.required}</Text>
            </Text>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[styles.paymentButton, formData.paymentMethod === 'cash' && styles.paymentButtonActive]}
                onPress={() => updateForm('paymentMethod', 'cash')}
              >
                <Ionicons name="cash-outline" size={Platform.OS === 'android' ? 18 : 20} color={formData.paymentMethod === 'cash' ? '#FFFFFF' : '#0d2137'} />
                <Text style={[styles.paymentText, formData.paymentMethod === 'cash' && styles.paymentTextActive]}>
                  {t.CreateBuyerListingScreen.cashOnDelivery}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentButton, formData.paymentMethod === 'top' && styles.paymentButtonActive]}
                onPress={() => updateForm('paymentMethod', 'top')}
              >
                <Ionicons name="calendar-outline" size={Platform.OS === 'android' ? 18 : 20} color={formData.paymentMethod === 'top' ? '#FFFFFF' : '#0d2137'} />
                <Text style={[styles.paymentText, formData.paymentMethod === 'top' && styles.paymentTextActive]}>
                  {t.CreateBuyerListingScreen.termsOfPayment}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {formData.paymentMethod === 'top' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.CreateBuyerListingScreen.paymentTerms}</Text>
              <View style={styles.topDaysOptions}>
                {[7, 14, 21].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[styles.topDayButton, formData.topDays === days && styles.topDayButtonActive]}
                    onPress={() => updateForm('topDays', days)}
                  >
                    <Text style={[styles.topDayText, formData.topDays === days && styles.topDayTextActive]}>
                      {days} {t.CreateBuyerListingScreen.days}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <Input 
            label={t.CreateBuyerListingScreen.additionalNotes} 
            value={formData.additionalNotes} 
            onChangeText={(v) => updateForm('additionalNotes', v)} 
            placeholder={t.CreateBuyerListingScreen.specialRequirements}
            multiline 
            hint={t.CreateBuyerListingScreen.optionalRequirements}
            t={t}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t.CreateBuyerListingScreen.listingExpiresOn} <Text style={styles.required}>{t.CreateBuyerListingScreen.required}</Text>
            </Text>
            <Text style={styles.inputHint}>{t.CreateBuyerListingScreen.maximum30Days}</Text>
            <AppDatePicker
              value={formData.expiryDate}
              minimumDate={new Date()}
              maximumDate={maxExpiryDate}
              onChange={(date) => updateForm('expiryDate', date > maxExpiryDate ? maxExpiryDate : date)}
              cancelLabel={t.actions.cancel}
              confirmLabel={t.actions.confirm}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>{t.CreateBuyerListingScreen.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit} 
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t.CreateBuyerListingScreen.posting : t.CreateBuyerListingScreen.postListing}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  );
};

const Input = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, hint, required = false, t }: {
  label: string; value: string; onChangeText: (text: string) => void; placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'decimal-pad'; multiline?: boolean; hint?: string; required?: boolean; t: any;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.required}>{t.CreateBuyerListingScreen.required}</Text>}
    </Text>
    <TextInput 
      style={[styles.input, multiline && styles.multilineInput]} 
      value={value} 
      onChangeText={onChangeText}
      placeholder={placeholder} 
      placeholderTextColor="#6b8aa0" 
      keyboardType={keyboardType} 
      multiline={multiline} 
      numberOfLines={multiline ? 3 : 1}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
    {hint && <Text style={styles.inputHint}>{hint}</Text>}
  </View>
);

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  backButton: { padding: Platform.OS === 'android' ? 6 : 8 },
  headerTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#0d2137',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8
  },
  placeholder: { width: Platform.OS === 'android' ? 36 : 40 },
  formContainer: { 
    flex: 1, 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20 
  },
  section: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: Platform.OS === 'android' ? 14 : 16, 
    padding: Platform.OS === 'android' ? 16 : 20, 
    marginTop: Platform.OS === 'android' ? 16 : 20, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  sectionTitle: { 
    fontSize: Platform.OS === 'android' ? 16 : 18, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    marginBottom: Platform.OS === 'android' ? 6 : 8 
  },
  sectionDescription: { 
    fontSize: Platform.OS === 'android' ? 12 : 14, 
    color: '#315f57', 
    marginBottom: Platform.OS === 'android' ? 14 : 16 
  },
  inputContainer: { 
    marginBottom: Platform.OS === 'android' ? 14 : 16 
  },
  inputLabel: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#0d2137', 
    marginBottom: Platform.OS === 'android' ? 6 : 8 
  },
  required: { color: '#e74c3c' },
  input: { 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    padding: Platform.OS === 'android' ? 14 : 16, 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    color: '#0d2137', 
    backgroundColor: '#FFFFFF',
    includeFontPadding: false 
  },
  multilineInput: { 
    height: Platform.OS === 'android' ? 70 : 80, 
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'android' ? 14 : 16 
  },
  inputHint: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#315f57', 
    marginTop: 4, 
    fontStyle: 'italic' 
  },
  countryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'android' ? 6 : 8,
    backgroundColor: '#f4f8fc',
    padding: Platform.OS === 'android' ? 12 : 14,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  countryText: {
    fontSize: Platform.OS === 'android' ? 13 : 15,
    color: '#0d2137',
    fontWeight: '600',
  },
  priceTable: { marginTop: Platform.OS === 'android' ? 6 : 8 },
  priceRow: { 
    flexDirection: 'row', 
    gap: Platform.OS === 'android' ? 10 : 12, 
    marginBottom: Platform.OS === 'android' ? 10 : 12 
  },
  priceCell: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f4f8fc', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    padding: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  sizeLabel: { 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    width: Platform.OS === 'android' ? 40 : 45 
  },
  priceInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    fontWeight: '600', 
    color: '#315f57', 
    marginRight: 4 
  },
  priceInput: { 
    flex: 1, 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    color: '#0d2137', 
    padding: 0,
    includeFontPadding: false 
  },
  
  paymentOptions: { 
    flexDirection: 'row', 
    gap: Platform.OS === 'android' ? 10 : 12 
  },
  paymentButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: Platform.OS === 'android' ? 12 : 14, 
    backgroundColor: '#f4f8fc', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 2, 
    borderColor: '#e8f2f9', 
    gap: Platform.OS === 'android' ? 6 : 8 
  },
  paymentButtonActive: { backgroundColor: '#0d2137', borderColor: '#0d2137' },
  paymentText: { 
    fontSize: Platform.OS === 'android' ? 12 : 14, 
    fontWeight: '600', 
    color: '#0d2137' 
  },
  paymentTextActive: { color: '#FFFFFF' },
  
  topDaysOptions: { 
    flexDirection: 'row', 
    gap: Platform.OS === 'android' ? 6 : 8 
  },
  topDayButton: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#f4f8fc', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    alignItems: 'center' 
  },
  topDayButtonActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  topDayText: { 
    fontSize: Platform.OS === 'android' ? 12 : 14, 
    fontWeight: '600', 
    color: '#315f57' 
  },
  topDayTextActive: { color: '#FFFFFF' },
  
  buttonContainer: { 
    flexDirection: 'row', 
    gap: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 28 : 32, 
    paddingBottom: Platform.OS === 'android' ? 32 : 40 
  },
  cancelButton: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 2, 
    borderColor: '#e74c3c', 
    alignItems: 'center' 
  },
  cancelButtonText: { 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    fontWeight: '600', 
    color: '#e74c3c' 
  },
  submitButton: { 
    flex: 1, 
    paddingVertical: Platform.OS === 'android' ? 14 : 16, 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#315f57', 
    alignItems: 'center', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  submitButtonDisabled: { 
    backgroundColor: '#dce8f2', 
    shadowOpacity: 0, 
    elevation: 0 
  },
  submitButtonText: { 
    fontSize: Platform.OS === 'android' ? 14 : 16, 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
  locationActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  locationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  locationActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d2137',
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bcf0da',
  },
  cityBadgeText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '500',
  },
});

export default CreateBuyerListingScreen;
