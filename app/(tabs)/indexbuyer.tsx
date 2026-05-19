// app/(tabs)/indexbuyer.tsx - Buyer home page for monitoring suppliers
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBuyerStore, type MonitoredCompany } from '../store/buyerStore';

interface CompanyMetrics {
  id: string;
  companyName: string;
  location: string;
  distance?: number;
  totalPonds?: number;
  averageDOC?: number;
  averageSize?: number;
  averageBiomass?: number;
  farmType?: string;
  businessSize?: string;
  contactPhone?: string;
}

const DetailItem = ({ 
  iconName, 
  label, 
  value 
}: { 
  iconName?: string; 
  label?: string; 
  value?: string; 
}) => {
  if (!iconName && !label && !value) return <View style={styles.detailItem} />;
  return (
    <View style={styles.detailItem}>
      {iconName ? (
        <Ionicons name={iconName as any} size={16} color="#dce8f2" />
      ) : (
        <View style={{ width: 16 }} />
      )}
      <Text style={styles.detailLabel}>{label || ''}</Text>
      <Text style={styles.detailValue}>{value || ''}</Text>
    </View>
  );
};

export default function BuyerHomeScreen() {
  const { t } = useLanguage();
  const { user, company } = useAuth(); // ADDED: company from useAuth
  
  const {
    monitoredCompanies,
    addMonitoredCompany,
    removeMonitoredCompany,
    switchUser
  } = useBuyerStore();
  
  const [availableCompanies, setAvailableCompanies] = useState<CompanyMetrics[]>([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<MonitoredCompany | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [companyMetrics, setCompanyMetrics] = useState<Map<string, CompanyMetrics>>(new Map());

  // Initialize and load monitored companies when component mounts or user changes
  useEffect(() => {
    if (user?.uid) {
      console.log('Initializing buyer for user:', user.uid);
      switchUser(user.uid);
    }
  }, [user?.uid, switchUser]);

  // Fetch metrics for monitored companies
  const fetchCompanyMetrics = useCallback(async (companyId: string): Promise<CompanyMetrics | null> => {
    try {
      const companyDoc = await getDocs(query(collection(db, 'companies'), where('__name__', '==', companyId)));
      if (companyDoc.empty) return null;
      
      const data = companyDoc.docs[0].data();
      
      const pondsRef = collection(db, 'companies', companyId, 'ponds');
      const pondsSnapshot = await getDocs(pondsRef);
      
      let totalPonds = pondsSnapshot.size;
      let totalDOC = 0;
      let totalSize = 0;
      let sumOfBiomass = 0;
      let pondsWithBiomass = 0;
      let validPondsForSize = 0;
      let validPondsForDOC = 0;
      
      pondsSnapshot.forEach((pondDoc) => {
        const pond = pondDoc.data();
        
        // Calculate DOC
        if (pond.docStart) {
          const docStartDate = new Date(pond.docStart).getTime();
          const now = Date.now();
          const doc = Math.floor((now - docStartDate) / (1000 * 60 * 60 * 24));
          if (doc >= 0) {
            totalDOC += doc;
            validPondsForDOC++;
          }
        }
        
        // Get size and biomass from latest sampling
        if (pond.samplings && Array.isArray(pond.samplings) && pond.samplings.length > 0) {
          const validSamplings = pond.samplings.filter((s: any) => s.mbw && s.mbw > 0);
          
          if (validSamplings.length > 0) {
            const sortedSamplings = [...validSamplings].sort((a: any, b: any) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const latestSampling = sortedSamplings[0];
            
            // Calculate size (pieces per kg)
            totalSize += (1000 / latestSampling.mbw);
            validPondsForSize++;
            
            // Calculate biomass for this pond
            const initialPopulation = pond.initialPopulation || 0;
            const harvestedPopulation = pond.totalHarvestedPopulation || 0;
            let totalMortality = 0;
            
            pond.samplings.forEach((s: any) => {
              if (s.mortality && s.mortality > 0) {
                totalMortality += Number(s.mortality);
              }
            });
            
            const currentPopulation = Math.max(0, initialPopulation - harvestedPopulation - totalMortality);
            const pondBiomass = (currentPopulation * latestSampling.mbw) / 1000;
            
            // Only add if biomass is positive
            if (pondBiomass > 0) {
              sumOfBiomass += pondBiomass;
              pondsWithBiomass++;
            }
          }
        }
      });
      
      const formattedBusinessSize = data.businessSize 
        ? data.businessSize.charAt(0).toUpperCase() + data.businessSize.slice(1).toLowerCase()
        : undefined;
      
      return {
        id: companyId,
        companyName: data.companyName || 'Unknown Company',
        location: typeof data.primaryLocation === 'string' 
          ? data.primaryLocation 
          : data.primaryLocation?.address || 'Unknown Location',
        farmType: data.farmType,
        businessSize: formattedBusinessSize,
        contactPhone: data.contactPhone,
        totalPonds: totalPonds,
        averageDOC: validPondsForDOC > 0 ? Math.round(totalDOC / validPondsForDOC) : 0,
        averageSize: validPondsForSize > 0 ? Math.round(totalSize / validPondsForSize) : 0,
        averageBiomass: totalPonds > 0 ? sumOfBiomass / totalPonds : 0,
        distance: 0,
      };
    } catch (error) {
      console.error('Error fetching company metrics:', error);
      return null;
    }
  }, []);

  // Load metrics for all monitored companies when they change
  useEffect(() => {
    const loadAllMetrics = async () => {
      const metricsMap = new Map<string, CompanyMetrics>();
      
      for (const company of monitoredCompanies) {
        const metrics = await fetchCompanyMetrics(company.id);
        if (metrics) {
          metricsMap.set(company.id, metrics);
        }
      }
      
      setCompanyMetrics(metricsMap);
    };
    
    if (monitoredCompanies.length > 0) {
      console.log('Loading metrics for', monitoredCompanies.length, 'companies');
      loadAllMetrics();
    }
  }, [monitoredCompanies, fetchCompanyMetrics]);

  // Fetch public companies from Firebase with their pond data
  const fetchPublicCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('isPublicProfile', '==', true));
      const querySnapshot = await getDocs(q);
      
      const companies: CompanyMetrics[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const companyId = doc.id;
        
        const pondsRef = collection(db, 'companies', companyId, 'ponds');
        const pondsSnapshot = await getDocs(pondsRef);
        
        let totalPonds = pondsSnapshot.size;
        let totalDOC = 0;
        let totalSize = 0;
        let totalBiomass = 0;
        let pondsWithBiomass = 0;
        let validPondsForSize = 0;
        let validPondsForDOC = 0;
        
        pondsSnapshot.forEach((pondDoc) => {
          const pond = pondDoc.data();
          
          if (pond.docStart) {
            const docStartDate = new Date(pond.docStart).getTime();
            const now = Date.now();
            const doc = Math.floor((now - docStartDate) / (1000 * 60 * 60 * 24));
            if (doc >= 0) {
              totalDOC += doc;
              validPondsForDOC++;
            }
          }
          
          if (pond.samplings && Array.isArray(pond.samplings) && pond.samplings.length > 0) {
            const validSamplings = pond.samplings.filter((s: any) => s.mbw && s.mbw > 0);
            
            if (validSamplings.length > 0) {
              const sortedSamplings = [...validSamplings].sort((a: any, b: any) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              const latestSampling = sortedSamplings[0];
              
              totalSize += (1000 / latestSampling.mbw);
              validPondsForSize++;
              
              const initialPopulation = pond.initialPopulation || 0;
              const harvestedPopulation = pond.totalHarvestedPopulation || 0;
              
              let totalMortality = 0;
              if (pond.samplings && Array.isArray(pond.samplings)) {
                pond.samplings.forEach((s: any) => {
                  if (s.mortality && s.mortality > 0) {
                    totalMortality += Number(s.mortality);
                  }
                });
              }
              
              const currentPopulation = Math.max(0, initialPopulation - harvestedPopulation - totalMortality);
              
              if (currentPopulation > 0 && latestSampling.mbw > 0) {
                const pondBiomass = (currentPopulation * latestSampling.mbw) / 1000;
                totalBiomass += pondBiomass;
                pondsWithBiomass++;
              }
            }
          }
        });
        
        const formattedBusinessSize = data.businessSize 
          ? data.businessSize.charAt(0).toUpperCase() + data.businessSize.slice(1).toLowerCase()
          : undefined;
        
        companies.push({
          id: companyId,
          companyName: data.companyName || 'Unknown Company',
          location: typeof data.primaryLocation === 'string' 
            ? data.primaryLocation 
            : data.primaryLocation?.address || 'Unknown Location',
          farmType: data.farmType,
          businessSize: formattedBusinessSize,
          contactPhone: data.contactPhone,
          totalPonds: totalPonds,
          averageDOC: validPondsForDOC > 0 ? Math.round(totalDOC / validPondsForDOC) : 0,
          averageSize: validPondsForSize > 0 ? Math.round(totalSize / validPondsForSize) : 0,
          averageBiomass: pondsWithBiomass > 0 ? totalBiomass / pondsWithBiomass : 0,
          distance: 0,
        });
      }
      
      setAvailableCompanies(companies);
    } catch (error) {
      console.error('Error fetching public companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  // Load companies when search modal opens
  useEffect(() => {
    if (searchModalVisible) {
      fetchPublicCompanies();
    }
  }, [searchModalVisible, fetchPublicCompanies]);

  // Filter search results based on query
  const searchResults = useMemo(() => {
    return availableCompanies.filter(company => {
      const matchesQuery = company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company.location.toLowerCase().includes(searchQuery.toLowerCase());
      const notMonitored = !monitoredCompanies.find(m => m.id === company.id);
      return matchesQuery && notMonitored;
    });
  }, [searchQuery, availableCompanies, monitoredCompanies]);

  const getDOCColor = useCallback((doc: number): string => {
    if (doc < 30) return '#0d2137';
    if (doc < 60) return '#315f57';
    if (doc < 90) return '#dbe7df';
    return '#0d2137';
  }, []);

  const handleAddCompany = useCallback(async (monitoredCompany: MonitoredCompany) => {
    if (!user?.uid) {
      console.error('No user logged in');
      return;
    }
    
    try {
      await addMonitoredCompany(monitoredCompany, user.uid);
      setSearchModalVisible(false);
      setSearchQuery('');
      console.log('Company added successfully');
    } catch (error) {
      console.error('Failed to add company:', error);
    }
  }, [user?.uid, addMonitoredCompany]);

  const handleDeleteCompany = useCallback((company: MonitoredCompany) => {
    setCompanyToDelete(company);
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteCompany = useCallback(async () => {
    if (companyToDelete && user?.uid) {
      await removeMonitoredCompany(companyToDelete.id, user.uid);
      setDeleteModalVisible(false);
      setCompanyToDelete(null);
    }
  }, [companyToDelete, removeMonitoredCompany, user?.uid]);

  const cancelDeleteCompany = useCallback(() => {
    setDeleteModalVisible(false);
    setCompanyToDelete(null);
  }, []);

  const CompanyCard = ({ company }: { company: MonitoredCompany }) => {
    const metrics = companyMetrics.get(company.id);
    
    return (
      <TouchableOpacity 
        style={styles.companyCard}
        onPress={() => console.log('Navigate to company details:', company.id)}
      >
        <View style={styles.companyHeader}>
          <View style={styles.companyNameContainer}>
            <Text style={styles.companyName}>{company.companyName}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={12} color="#315f57" />
              <Text style={styles.locationText}>{company.location}</Text>
            </View>
            {company.farmType && (
              <Text style={styles.farmTypeText}>{company.farmType}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {metrics && metrics.averageDOC !== undefined && metrics.averageDOC > 0 && (
              <View style={[styles.docBadge, { backgroundColor: getDOCColor(metrics.averageDOC) }]}>
                <Text style={styles.docText}>AVG DOC {metrics.averageDOC}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteCompany(company);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.companyDetails}>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="water-outline" 
              label="Ponds" 
              value={metrics?.totalPonds?.toString() || '0'} 
            />
            <DetailItem 
              iconName="resize-outline" 
              label="Avg Size" 
              value={metrics && metrics.averageSize && metrics.averageSize > 0 ? `${metrics.averageSize} pcs/kg` : 'N/A'} 
            />
          </View>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="scale-outline" 
              label="Avg Biomass" 
              value={metrics && metrics.averageBiomass && metrics.averageBiomass > 0 ? `${metrics.averageBiomass.toFixed(1)} kg` : 'N/A'} 
            />
            <DetailItem 
              iconName="calendar-outline" 
              label="Avg DOC" 
              value={metrics && metrics.averageDOC && metrics.averageDOC > 0 ? metrics.averageDOC.toString() : 'N/A'} 
            />
          </View>
          <View style={styles.detailRow}>
            <DetailItem 
              iconName="business-outline" 
              label="Size" 
              value={company.businessSize || 'N/A'} 
            />
            <DetailItem 
              iconName="call-outline" 
              label="Phone" 
              value={company.contactPhone || 'N/A'} 
            />
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              console.log('Contact company:', company.id);
            }}
          >
            <Ionicons name="mail-outline" size={16} color="#0d2137" />
            <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={(e) => {
              e.stopPropagation();
              console.log('View details:', company.id);
            }}
          >
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const SearchResultCard = ({ company }: { company: CompanyMetrics }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.searchResultHeader}>
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultName}>{company.companyName}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={12} color="#315f57" />
            <Text style={styles.locationText}>{company.location}</Text>
          </View>
          {company.farmType && (
            <Text style={styles.farmTypeText}>{company.farmType}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            const monitoredCompany: MonitoredCompany = {
              id: company.id,
              companyName: company.companyName,
              location: company.location,
              farmType: company.farmType,
              businessSize: company.businessSize,
              contactPhone: company.contactPhone,
              dateAdded: new Date().toISOString()
            };
            handleAddCompany(monitoredCompany);
          }}
        >
          <Ionicons name="add-circle" size={32} color="#315f57" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchResultStats}>
        <Text style={styles.searchResultStat}>
          {company.totalPonds} pond{company.totalPonds !== 1 ? 's' : ''}
        </Text>
        {company.averageDOC !== undefined && company.averageDOC > 0 && (
          <>
            <Text style={styles.searchResultStat}>•</Text>
            <Text style={styles.searchResultStat}>DOC {company.averageDOC}</Text>
          </>
        )}
        {company.averageSize !== undefined && company.averageSize > 0 && (
          <>
            <Text style={styles.searchResultStat}>•</Text>
            <Text style={styles.searchResultStat}>{company.averageSize} pcs/kg</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f8fc" />
      <View style={styles.container}>
        <FlatList
          data={monitoredCompanies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.headerSection}>
                <Text style={styles.welcomeText}>
                  Welcome, {company?.companyName || 'Buyer'}
                </Text>
                <Text style={styles.subtitleText}>Monitor your suppliers in real-time</Text>
              </View>
              {monitoredCompanies.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Monitored Suppliers</Text>
                  <Text style={styles.sectionCount}>{monitoredCompanies.length}</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={80} color="#315f57" />
              <Text style={styles.emptyTitle}>No suppliers monitored yet</Text>
              <Text style={styles.emptySubtitle}>
                Search for companies in your area to start monitoring their farms
              </Text>
            </View>
          }
          renderItem={({ item }) => <CompanyCard company={item} />}
        />

        <TouchableOpacity 
          style={styles.floatingButton} 
          onPress={() => setSearchModalVisible(true)}
        >
          <Ionicons name="search" size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={deleteModalVisible} animationType="fade" transparent>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <View style={styles.deleteModalIcon}>
                <Ionicons name="warning-outline" size={48} color="#e74c3c" />
              </View>
              <Text style={styles.deleteModalTitle}>Remove Supplier</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to stop monitoring "{companyToDelete?.companyName}"?
              </Text>
              <Text style={styles.deleteModalWarning}>
                You can add them back anytime from the search.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity 
                  style={styles.deleteModalCancelButton} 
                  onPress={cancelDeleteCompany}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteModalConfirmButton} 
                  onPress={confirmDeleteCompany}
                >
                  <Text style={styles.deleteModalConfirmText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={searchModalVisible} animationType="slide" transparent>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalContent}>
              <View style={styles.searchModalHeader}>
                <Text style={styles.searchModalTitle}>Find Suppliers</Text>
                <TouchableOpacity 
                  onPress={() => setSearchModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#dce8f2" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color="#315f57" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by company name or location"
                  placeholderTextColor="#6b8aa0"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsTitle}>
                  {isLoadingCompanies ? 'Loading...' : `${searchResults.length} companies found`}
                </Text>
              </View>

              {isLoadingCompanies ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0d2137" />
                  <Text style={styles.loadingText}>Searching for suppliers...</Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <SearchResultCard company={item} />}
                  style={styles.searchResultsList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.noResultsContainer}>
                      <Ionicons name="business-outline" size={48} color="#dce8f2" />
                      <Text style={styles.noResultsText}>
                        {searchQuery ? 'No companies match your search' : 'No public companies available'}
                      </Text>
                      <Text style={styles.noResultsSubtext}>
                        Companies must enable "Public Profile" to appear here
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingTop: Platform.OS === 'android' ? 8 : 10, paddingBottom: 100 },
  headerSection: { marginBottom: Platform.OS === 'android' ? 20 : 24, paddingBottom: Platform.OS === 'android' ? 14 : 16, borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  welcomeText: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  subtitleText: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 14 : 16 },
  sectionTitle: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137' },
  sectionCount: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#315f57', backgroundColor: '#dce8f2', paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: 4, borderRadius: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', marginTop: Platform.OS === 'android' ? 16 : 20 },
  emptySubtitle: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 15 : 16, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  companyCard: { backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 16 : 20, borderRadius: 16, marginBottom: Platform.OS === 'android' ? 12 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  companyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Platform.OS === 'android' ? 12 : 16 },
  companyNameContainer: { flex: 1 },
  companyName: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', marginLeft: 4 },
  farmTypeText: { fontSize: Platform.OS === 'android' ? 10 : 11, color: '#0d2137', fontStyle: 'italic' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  docBadge: { paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 5 : 6, borderRadius: 12, marginLeft: Platform.OS === 'android' ? 10 : 12 },
  docText: { color: '#fff', fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: 'bold' },
  deleteButton: { padding: Platform.OS === 'android' ? 6 : 8, marginLeft: 8, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  companyDetails: { marginBottom: Platform.OS === 'android' ? 10 : 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  detailLabel: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 6, width: Platform.OS === 'android' ? 65 : 70, flexShrink: 0 },
  detailValue: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', textAlign: 'right', flex: 1 },
  actionsContainer: { flexDirection: 'row', gap: 8, paddingTop: Platform.OS === 'android' ? 10 : 12, borderTopWidth: 1, borderTopColor: '#dce8f2' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 9 : 10, borderRadius: 10, backgroundColor: '#f4f8fc', borderWidth: 1, borderColor: '#e8f2f9' },
  primaryActionButton: { backgroundColor: '#315f57', borderColor: '#315f57' },
  actionButtonText: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', marginLeft: 6 },
  primaryActionButtonText: { color: '#FFFFFF' },
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#dce8f2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#315f57' },
  deleteModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { backgroundColor: '#0d2137', padding: Platform.OS === 'android' ? 20 : 24, borderRadius: 20, width: '90%', maxWidth: 400, borderWidth: 1, borderColor: '#315f57', alignItems: 'center' },
  deleteModalIcon: { marginBottom: Platform.OS === 'android' ? 12 : 16 },
  deleteModalTitle: { fontSize: Platform.OS === 'android' ? 20 : 22, fontWeight: 'bold', color: '#f4f8fc', marginBottom: 12, textAlign: 'center' },
  deleteModalMessage: { fontSize: Platform.OS === 'android' ? 15 : 16, color: '#f4f8fc', textAlign: 'center', marginBottom: 12, lineHeight: Platform.OS === 'android' ? 20 : 22 },
  deleteModalWarning: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#dce8f2', textAlign: 'center', marginBottom: Platform.OS === 'android' ? 20 : 24, fontStyle: 'italic', lineHeight: Platform.OS === 'android' ? 18 : 20 },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalCancelButton: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, paddingHorizontal: Platform.OS === 'android' ? 16 : 20, borderRadius: 12, backgroundColor: '#315f57', alignItems: 'center' },
  deleteModalCancelText: { color: '#f4f8fc', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
  deleteModalConfirmButton: { flex: 1, paddingVertical: Platform.OS === 'android' ? 12 : 14, paddingHorizontal: Platform.OS === 'android' ? 16 : 20, borderRadius: 12, backgroundColor: '#e74c3c', alignItems: 'center' },
  deleteModalConfirmText: { color: '#fff', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold' },
  searchModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'flex-end' },
  searchModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', borderWidth: 1, borderColor: '#e8f2f9' },
  searchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Platform.OS === 'android' ? 20 : 24, paddingBottom: Platform.OS === 'android' ? 14 : 16, borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  searchModalTitle: { fontSize: Platform.OS === 'android' ? 22 : 24, fontWeight: 'bold', color: '#0d2137' },
  closeButton: { padding: 4 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Platform.OS === 'android' ? 20 : 24, marginTop: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 10 : 12, paddingHorizontal: Platform.OS === 'android' ? 14 : 16, paddingVertical: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#f4f8fc', borderRadius: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: Platform.OS === 'android' ? 15 : 16, color: '#0d2137' },
  searchResultsHeader: { paddingHorizontal: Platform.OS === 'android' ? 20 : 24, paddingVertical: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#f4f8fc', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e8f2f9' },
  searchResultsTitle: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137' },
  searchResultsList: { flex: 1 },
  searchResultCard: { padding: Platform.OS === 'android' ? 14 : 16, marginHorizontal: Platform.OS === 'android' ? 20 : 24, marginVertical: Platform.OS === 'android' ? 6 : 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#e8f2f9' },
  searchResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 6 : 8 },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  addButton: { marginLeft: 12 },
  searchResultStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchResultStat: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57' },
  noResultsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 50 : 60, paddingHorizontal: 40 },
  noResultsText: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', marginTop: 12, textAlign: 'center' },
  noResultsSubtext: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#dce8f2', marginTop: 8, textAlign: 'center' },
});
