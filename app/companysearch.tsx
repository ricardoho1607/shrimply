// app/companysearch.tsx - Clean & Optimized with Logo Support
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

interface Company {
  id: string;
  companyName: string;
  region?: string;
  country?: string;
  farmType?: string;
  businessSize?: string;
  memberCount?: number;
  logo?: string;
  logoUrl?: string;
}

type Role = 'manager' | 'technician' | 'admin';

const ROLES = [
  { id: 'technician', title: 'Aquaculture Technician', icon: 'flask' },
  { id: 'manager', title: 'Farm Manager', icon: 'people' },
  { id: 'admin', title: 'System Administrator', icon: 'settings' },
] as const;

export default function CompanySearchScreen() {
  const router = useRouter();
  const { searchCompanies, requestToJoinCompany } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('technician');
  const [requestMessage, setRequestMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a company name to search');
      return;
    }

    setLoading(true);
    try {
      const results = await searchCompanies(searchQuery);
      setCompanies(results);
      
      if (results.length === 0) {
        Alert.alert('No Results', 'No companies found matching your search');
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      Alert.alert('Error', error.message || 'Failed to search companies');
    } finally {
      setLoading(false);
    }
  };

  const submitJoinRequest = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      const requestData: any = {
        companyId: selectedCompany.id,
        requestedRole: selectedRole,
      };

      // Only add message if it has content
      if (requestMessage.trim()) {
        requestData.message = requestMessage.trim();
      }

      await requestToJoinCompany(requestData);

      Alert.alert(
        'Request Sent!',
        `Your request to join ${selectedCompany.companyName} has been sent. The company owner will review your request.`,
        [{ text: 'OK', onPress: () => { setShowModal(false); router.back(); } }]
      );
    } catch (error: any) {
      console.error('Request failed:', error);
      Alert.alert('Error', error.message || 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const openRequestModal = (company: Company) => {
    setSelectedCompany(company);
    setRequestMessage('');
    setSelectedRole('technician');
    setShowModal(true);
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B262C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Company</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search" size={20} color="#3282B8" />
              <TextInput
                style={styles.input}
                placeholder="Search by company name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholderTextColor="#BBE1FA"
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
            {companies.length === 0 && !loading && searchQuery && (
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={64} color="#BBE1FA" />
                <Text style={styles.emptyText}>No companies found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search terms</Text>
              </View>
            )}

            {companies.map((company) => (
              <View key={company.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.icon}>
                    {company.logo || company.logoUrl ? (
                      <Image 
                        source={{ uri: company.logo || company.logoUrl }} 
                        style={styles.companyLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="business" size={24} color="#0F4C75" />
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{company.companyName}</Text>
                    {(company.region || company.country) && (
                      <View style={styles.location}>
                        <Ionicons name="location-outline" size={14} color="#3282B8" />
                        <Text style={styles.locationText}>
                          {[company.region, company.country].filter(Boolean).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {(company.farmType || company.businessSize || company.memberCount) && (
                  <View style={styles.details}>
                    {company.farmType && (
                      <View style={styles.detail}>
                        <Text style={styles.detailLabel}>Farm Type</Text>
                        <Text style={styles.detailValue}>{company.farmType}</Text>
                      </View>
                    )}
                    {company.businessSize && (
                      <View style={styles.detail}>
                        <Text style={styles.detailLabel}>Size</Text>
                        <Text style={styles.detailValue}>
                          {company.businessSize.charAt(0).toUpperCase() + company.businessSize.slice(1)}
                        </Text>
                      </View>
                    )}
                    {company.memberCount !== undefined && (
                      <View style={styles.detail}>
                        <Text style={styles.detailLabel}>Team</Text>
                        <Text style={styles.detailValue}>{company.memberCount} members</Text>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.applyBtn} onPress={() => openRequestModal(company)}>
                  <Ionicons name="send-outline" size={16} color="#fff" />
                  <Text style={styles.applyBtnText}>Request to Join</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {showModal && selectedCompany && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Request</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#3282B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.companyName}>{selectedCompany.companyName}</Text>
              <Text style={styles.label}>Select Your Role *</Text>
              
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.role, selectedRole === role.id && styles.roleSelected]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <Ionicons name={role.icon as any} size={20} color={selectedRole === role.id ? '#fff' : '#3282B8'} />
                  <Text style={[styles.roleText, selectedRole === role.id && styles.roleTextSelected]}>
                    {role.title}
                  </Text>
                  {selectedRole === role.id && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Message (Optional)</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Introduce yourself to the company owner..."
                value={requestMessage}
                onChangeText={setRequestMessage}
                multiline
                numberOfLines={4}
                placeholderTextColor="#BBE1FA"
              />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitJoinRequest} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Send Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  topSafeArea: { backgroundColor: '#BBE1FA' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#BBE1FA', borderBottomWidth: 1, borderBottomColor: '#3282B8' },
  backButton: { padding: 8 },
  headerTitle: { color: '#1B262C', fontSize: 18, fontWeight: '600' },
  headerRight: { width: 40 },
  content: { flex: 1, padding: 20 },
  
  searchRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#BBE1FA' },
  input: { flex: 1, fontSize: 16, color: '#1B262C', marginLeft: 8, paddingVertical: 12 },
  searchBtn: { backgroundColor: '#0F4C75', paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center', minWidth: 100 },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  results: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1B262C', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#3282B8', marginTop: 8 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  companyLogo: { width: 48, height: 48, borderRadius: 24 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1B262C', marginBottom: 4 },
  location: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#3282B8', marginLeft: 4 },
  
  details: { flexDirection: 'row', paddingVertical: 12, marginBottom: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BBE1FA' },
  detail: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#3282B8', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1B262C' },

  applyBtn: { flexDirection: 'row', backgroundColor: '#0F4C75', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#BBE1FA' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B262C' },
  modalBody: { padding: 20 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#0F4C75', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1B262C', marginBottom: 12 },

  role: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#BBE1FA', marginBottom: 12 },
  roleSelected: { backgroundColor: '#0F4C75', borderColor: '#0F4C75' },
  roleText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1B262C', marginLeft: 12 },
  roleTextSelected: { color: '#fff' },

  messageInput: { borderWidth: 1, borderColor: '#BBE1FA', borderRadius: 12, padding: 16, fontSize: 16, color: '#1B262C', height: 100, textAlignVertical: 'top', marginBottom: 20 },

  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#BBE1FA', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#e74c3c', alignItems: 'center' },
  cancelBtnText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#0F4C75', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});