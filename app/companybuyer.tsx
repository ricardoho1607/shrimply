// app/companybuyer.tsx - Buyer company details screen with edit support
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function CompanyBuyerScreen() {
  const router = useRouter();
  const { company, getCompanyLocationString, getCompanyLocationData } = useAuth();

  const locationData = getCompanyLocationData();
  const hasCoordinates = locationData && locationData.latitude !== 0 && locationData.longitude !== 0;

  const handleEdit = () => {
    router.push('/buyersetup?edit=true');
  };

  const CompanyInfoCard = useMemo(() => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="business" size={24} color="#27AE60" />
        <Text style={styles.cardTitle}>Company Information</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={handleEdit}
        > 
          <Ionicons name="pencil-outline" size={18} color="#27AE60" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoGrid}>
        <InfoItem label="Company Name" value={company?.companyName || 'Not set'} />
        <InfoItem label="Location" value={getCompanyLocationString() || 'Not set'} />
        
        {/* Show Country if available */}
        {(company?.country || locationData?.country) && (
          <InfoItem 
            label="Country" 
            value={company?.country || locationData?.country || 'Not set'}
            icon="flag-outline"
          />
        )}
        
        <InfoItem label="Business Type" value={(company as any)?.businessType || 'Shrimp Buyer'} />
        <InfoItem 
          label="Company Size" 
          value={company?.businessSize ? 
            company.businessSize.charAt(0).toUpperCase() + company.businessSize.slice(1) + ' Operation' : 
            'Not set'
          } 
        />
        
        {/* Contact Info */}
        {(company as any)?.contactPhone && (
          <InfoItem 
            label="Contact Phone" 
            value={(company as any).contactPhone}
            icon="call-outline"
          />
        )}
      </View>

      {/* Location Status */}
      {hasCoordinates ? (
        <View style={styles.locationStatus}>
          <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
          <Text style={styles.locationStatusText}>
            Location coordinates verified ({locationData?.latitude.toFixed(4)}, {locationData?.longitude.toFixed(4)})
          </Text>
        </View>
      ) : (
        <View style={[styles.locationStatus, styles.locationStatusWarning]}>
          <Ionicons name="warning-outline" size={16} color="#f39c12" />
          <Text style={[styles.locationStatusText, { color: '#f39c12' }]}>
            Location coordinates not set. Marketplace filtering may be limited.
          </Text>
          <TouchableOpacity 
            style={styles.addLocationButton}
            onPress={() => router.push('/buyersetup?edit=true')}
          >
            <Text style={styles.addLocationButtonText}>Add Now</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {company?.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.infoLabel}>Description</Text>
          <Text style={styles.description}>{company.description}</Text>
        </View>
      )}
    </View>
  ), [company, router, getCompanyLocationString, locationData, hasCoordinates]);

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Company Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
        {CompanyInfoCard}
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color="#27AE60" />
            <Text style={styles.cardTitle}>Buyer Information</Text>
          </View>
          
          <View style={styles.infoBox}>
            <Ionicons name="cart" size={32} color="#27AE60" style={styles.infoBoxIcon} />
            <Text style={styles.infoBoxText}>
              As a buyer, you have access to monitor your suppliers and track their aquaculture operations in real-time.
            </Text>
          </View>

          <View style={styles.featuresList}>
            <FeatureItem icon="eye-outline" text="Monitor supplier operations" />
            <FeatureItem icon="stats-chart" text="Track harvest data" />
            <FeatureItem icon="water" text="View water quality metrics" />
            <FeatureItem icon="fish" text="Monitor feeding schedules" />
            <FeatureItem icon="location" text="Location-based marketplace filtering" />
          </View>
        </View>

        {/* Marketplace Quick Access */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="storefront" size={24} color="#27AE60" />
            <Text style={styles.cardTitle}>Marketplace</Text>
          </View>
          
          <Text style={styles.marketplaceDescription}>
            {company?.country 
              ? `Browse listings from suppliers in ${company.country}`
              : 'Set your country to see relevant marketplace listings'}
          </Text>

          <TouchableOpacity 
            style={styles.marketplaceButton}
            onPress={() => router.push('/marketplace')}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.marketplaceButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const InfoItem = React.memo(({ label, value, icon }: { label: string; value: string; icon?: string }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoLabelRow}>
      {icon && <Ionicons name={icon as any} size={14} color="#315f57" style={{ marginRight: 4 }} />}
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));

const FeatureItem = React.memo(({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon as any} size={20} color="#27AE60" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
));

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20, 
    paddingVertical: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#dce8f2', 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Platform.OS === 'android' ? 18 : 20, paddingBottom: Platform.OS === 'android' ? 36 : 40 },

  // Cards
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: Platform.OS === 'android' ? 14 : 16, 
    padding: Platform.OS === 'android' ? 18 : 20, 
    marginBottom: Platform.OS === 'android' ? 18 : 20, 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Platform.OS === 'android' ? 18 : 20 
  },
  cardTitle: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    marginLeft: Platform.OS === 'android' ? 9 : 10, 
    flex: 1 
  },
  editButton: { 
    padding: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: 'rgba(39, 174, 96, 0.1)', 
    borderRadius: Platform.OS === 'android' ? 7 : 8 
  },

  // Company Info
  infoGrid: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  infoItem: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    fontWeight: '600', 
    color: '#315f57', 
    textTransform: 'uppercase' 
  },
  infoValue: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    color: '#0d2137', 
    fontWeight: '500' 
  },
  
  // Location Status
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 10 : 12,
    backgroundColor: '#F0FFF4',
    borderRadius: Platform.OS === 'android' ? 7 : 8,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  locationStatusWarning: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFE4A3',
  },
  locationStatusText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#27AE60',
    marginLeft: Platform.OS === 'android' ? 7 : 8,
    flex: 1,
  },
  addLocationButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    paddingVertical: Platform.OS === 'android' ? 5 : 6,
    borderRadius: Platform.OS === 'android' ? 5 : 6,
    marginLeft: Platform.OS === 'android' ? 7 : 8,
  },
  addLocationButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '600',
  },

  descriptionContainer: { 
    marginTop: Platform.OS === 'android' ? 7 : 8, 
    paddingTop: Platform.OS === 'android' ? 14 : 16, 
    borderTopWidth: 1, 
    borderTopColor: '#dce8f2' 
  },
  description: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#0d2137', 
    lineHeight: Platform.OS === 'android' ? 18 : 20 
  },

  // Info Box
  infoBox: {
    backgroundColor: '#F0FFF4',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  infoBoxIcon: {
    marginRight: Platform.OS === 'android' ? 10 : 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#22543D',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },

  // Features List
  featuresList: {
    marginTop: Platform.OS === 'android' ? 7 : 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16,
    backgroundColor: '#f4f8fc',
    borderRadius: Platform.OS === 'android' ? 7 : 8,
    marginBottom: Platform.OS === 'android' ? 7 : 8,
  },
  featureText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#0d2137',
    marginLeft: Platform.OS === 'android' ? 10 : 12,
    fontWeight: '500',
  },

  // Marketplace Section
  marketplaceDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#315f57',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  marketplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  marketplaceButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    marginLeft: Platform.OS === 'android' ? 7 : 8,
  },
});
