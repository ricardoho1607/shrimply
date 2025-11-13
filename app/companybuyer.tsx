// app/companybuyer.tsx - Buyer company details screen with edit support
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar } from 'react-native';
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
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B262C" />
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
      {icon && <Ionicons name={icon as any} size={14} color="#3282B8" style={{ marginRight: 4 }} />}
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
  outerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  topSafeArea: { backgroundColor: '#BBE1FA' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    backgroundColor: '#BBE1FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B262C' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Cards
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    shadowColor: '#27AE60', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginLeft: 10, 
    flex: 1 
  },
  editButton: { 
    padding: 8, 
    backgroundColor: 'rgba(39, 174, 96, 0.1)', 
    borderRadius: 8 
  },

  // Company Info
  infoGrid: { marginBottom: 16 },
  infoItem: { marginBottom: 16 },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#3282B8', 
    textTransform: 'uppercase' 
  },
  infoValue: { 
    fontSize: 16, 
    color: '#1B262C', 
    fontWeight: '500' 
  },
  
  // Location Status
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  locationStatusWarning: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFE4A3',
  },
  locationStatusText: {
    fontSize: 12,
    color: '#27AE60',
    marginLeft: 8,
    flex: 1,
  },
  addLocationButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  addLocationButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  descriptionContainer: { 
    marginTop: 8, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#BBE1FA' 
  },
  description: { 
    fontSize: 14, 
    color: '#0F4C75', 
    lineHeight: 20 
  },

  // Info Box
  infoBox: {
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  infoBoxIcon: {
    marginRight: 12,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#22543D',
    lineHeight: 20,
  },

  // Features List
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#1B262C',
    marginLeft: 12,
    fontWeight: '500',
  },

  // Marketplace Section
  marketplaceDescription: {
    fontSize: 14,
    color: '#3282B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  marketplaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  marketplaceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});