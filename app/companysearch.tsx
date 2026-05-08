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
  Platform,
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { searchCompanies, requestToJoinCompany, user, signOut } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('technician');
  const [requestMessage, setRequestMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  React.useEffect(() => {
    const checkPending = async () => {
      if (!user) return;
      const q = query(collection(db, 'joinRequests'), 
        where('userId', '==', user.uid), 
        where('status', '==', 'pending')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPendingRequest(snap.docs[0].data());
      }
    };
    checkPending();
  }, [user]);

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
      Alert.alert('Error', 'Failed to search companies. Please try again.');
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
      Alert.alert('Error', 'Failed to send your join request. Please try again.');
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
      <StatusBar barStyle="dark-content" backgroundColor="#dce8f2" />
      <SafeAreaView style={styles.topSafeArea}>
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
          <Text style={styles.headerTitle}>Find Company</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.searchRow}>
            <View style={styles.searchInput}>
              <Ionicons name="search" size={20} color="#315f57" />
              <TextInput
                style={styles.input}
                placeholder="Search by company name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholderTextColor="#6b8aa0"
              />
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={async () => {
              try {
                await signOut();
                router.replace('/auth');
              } catch (e) {
                Alert.alert('Error', 'Failed to logout');
              }
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>

          {pendingRequest ? (
            <View style={[styles.card, { marginTop: 20, alignItems: 'center' }]}>
              <Ionicons name="time-outline" size={48} color="#f39c12" />
              <Text style={[styles.name, { marginTop: 10 }]}>Request Pending</Text>
              <Text style={[styles.locationText, { textAlign: 'center', marginTop: 5 }]}>
                You have sent a request to join a company. Please wait for the owner to approve your request.
              </Text>
              <View style={[styles.details, { width: '100%', marginTop: 15 }]}>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Requested Role</Text>
                  <Text style={styles.detailValue}>{pendingRequest.requestedRole}</Text>
                </View>
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>Sent On</Text>
                  <Text style={styles.detailValue}>{new Date(pendingRequest.requestedAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
              {companies.length === 0 && !loading && searchQuery && (
                <View style={styles.empty}>
                  <Ionicons name="business-outline" size={64} color="#dce8f2" />
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
                        <Ionicons name="business" size={24} color="#0d2137" />
                      )}
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{company.companyName}</Text>
                      {(company.region || company.country) && (
                        <View style={styles.location}>
                          <Ionicons name="location-outline" size={14} color="#315f57" />
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
          )}
        </View>
      </SafeAreaView>

      {showModal && selectedCompany && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Request</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#315f57" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.companyName}>{selectedCompany.companyName}</Text>
              <Text style={styles.label}>Select Your Role *</Text>
              
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[styles.role, selectedRole === role.id && styles.roleSelected]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <Ionicons name={role.icon as any} size={20} color={selectedRole === role.id ? '#fff' : '#315f57'} />
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
                placeholderTextColor="#6b8aa0"
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
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 7 : 8, backgroundColor: '#dce8f2', borderBottomWidth: 1, borderBottomColor: '#315f57' },
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: '600' },
  headerRight: { width: Platform.OS === 'android' ? 36 : 40 },
  content: { flex: 1, padding: Platform.OS === 'android' ? 18 : 20 },
  
  searchRow: { flexDirection: 'row', marginBottom: Platform.OS === 'android' ? 18 : 20, gap: Platform.OS === 'android' ? 10 : 12 },
  searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Platform.OS === 'android' ? 10 : 12, paddingHorizontal: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#e8f2f9' },
  input: { flex: 1, fontSize: Platform.OS === 'android' ? 15 : 16, color: '#0d2137', marginLeft: Platform.OS === 'android' ? 7 : 8, paddingVertical: Platform.OS === 'android' ? 10 : 12 },
  searchBtn: { backgroundColor: '#0d2137', paddingHorizontal: Platform.OS === 'android' ? 22 : 24, borderRadius: Platform.OS === 'android' ? 10 : 12, justifyContent: 'center', minWidth: Platform.OS === 'android' ? 90 : 100 },
  searchBtnText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },

  results: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: Platform.OS === 'android' ? 54 : 60 },
  emptyText: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: '600', color: '#0d2137', marginTop: Platform.OS === 'android' ? 14 : 16 },
  emptySubtext: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginTop: Platform.OS === 'android' ? 7 : 8 },

  card: { backgroundColor: '#fff', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 18 : 20, marginBottom: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  icon: { width: Platform.OS === 'android' ? 44 : 48, height: Platform.OS === 'android' ? 44 : 48, borderRadius: Platform.OS === 'android' ? 22 : 24, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginRight: Platform.OS === 'android' ? 10 : 12, overflow: 'hidden' },
  companyLogo: { width: Platform.OS === 'android' ? 44 : 48, height: Platform.OS === 'android' ? 44 : 48, borderRadius: Platform.OS === 'android' ? 22 : 24 },
  info: { flex: 1 },
  name: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  location: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginLeft: 4 },
  
  details: { flexDirection: 'row', paddingVertical: Platform.OS === 'android' ? 10 : 12, marginBottom: Platform.OS === 'android' ? 14 : 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8f2f9' },
  detail: { flex: 1 },
  detailLabel: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', marginBottom: 4 },
  detailValue: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137' },

  applyBtn: { flexDirection: 'row', backgroundColor: '#0d2137', paddingVertical: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 10 : 12, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', marginLeft: Platform.OS === 'android' ? 7 : 8 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', padding: Platform.OS === 'android' ? 18 : 20 },
  modal: { backgroundColor: '#fff', borderRadius: Platform.OS === 'android' ? 18 : 20, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Platform.OS === 'android' ? 18 : 20, borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  modalTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  modalBody: { padding: Platform.OS === 'android' ? 18 : 20 },
  companyName: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 18 : 20 },
  label: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 10 : 12 },

  role: { flexDirection: 'row', alignItems: 'center', padding: Platform.OS === 'android' ? 14 : 16, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#e8f2f9', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  roleSelected: { backgroundColor: '#0d2137', borderColor: '#0d2137' },
  roleText: { flex: 1, fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 10 : 12 },
  roleTextSelected: { color: '#fff' },

  messageInput: { borderWidth: 1, borderColor: '#e8f2f9', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, fontSize: Platform.OS === 'android' ? 15 : 16, color: '#0d2137', height: Platform.OS === 'android' ? 90 : 100, textAlignVertical: 'top', marginBottom: Platform.OS === 'android' ? 18 : 20 },

  footer: { flexDirection: 'row', padding: Platform.OS === 'android' ? 18 : 20, borderTopWidth: 1, borderTopColor: '#dce8f2', gap: Platform.OS === 'android' ? 10 : 12 },
  cancelBtn: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#e74c3c', alignItems: 'center' },
  cancelBtnText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#0d2137', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  logoutBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});
