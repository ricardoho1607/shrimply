// app/(tabs)/indexbuyer.tsx - Buyer home page for monitoring suppliers
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Modal, 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
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
        <Ionicons name={iconName as any} size={16} color="#BBE1FA" />
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
    if (doc < 30) return '#0F4C75';
    if (doc < 60) return '#3282B8';
    if (doc < 90) return '#BBE1FA';
    return '#1B262C';
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
              <Ionicons name="location-outline" size={12} color="#3282B8" />
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
            <Ionicons name="mail-outline" size={16} color="#0F4C75" />
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
            <Ionicons name="location-outline" size={12} color="#3282B8" />
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
          <Ionicons name="add-circle" size={32} color="#3282B8" />
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
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <Text style={styles.welcomeText}>
              Welcome, {company?.companyName || 'Buyer'}
            </Text>
            <Text style={styles.subtitleText}>Monitor your suppliers in real-time</Text>
          </View>

          {monitoredCompanies.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={80} color="#3282B8" />
              <Text style={styles.emptyTitle}>No suppliers monitored yet</Text>
              <Text style={styles.emptySubtitle}>
                Search for companies in your area to start monitoring their farms
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Monitored Suppliers</Text>
                <Text style={styles.sectionCount}>{monitoredCompanies.length}</Text>
              </View>
              {monitoredCompanies.map(company => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </>
          )}
        </ScrollView>

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
                  <Ionicons name="close" size={24} color="#BBE1FA" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color="#3282B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by company name or location"
                  placeholderTextColor="#BBE1FA"
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
                  <ActivityIndicator size="large" color="#0F4C75" />
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
                      <Ionicons name="business-outline" size={48} color="#BBE1FA" />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingTop: 10, paddingBottom: 100 },
  headerSection: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#BBE1FA' },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#1B262C', marginBottom: 4 },
  subtitleText: { fontSize: 14, color: '#3282B8' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1B262C' },
  sectionCount: { fontSize: 14, fontWeight: '600', color: '#3282B8', backgroundColor: '#BBE1FA', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#1B262C', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  emptySubtitle: { color: '#0F4C75', fontSize: 16, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  companyCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#BBE1FA', shadowColor: '#0F4C75', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  companyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  companyNameContainer: { flex: 1 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: '#1B262C', marginBottom: 4 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: 12, color: '#3282B8', marginLeft: 4 },
  farmTypeText: { fontSize: 11, color: '#0F4C75', fontStyle: 'italic' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  docBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 12 },
  docText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  deleteButton: { padding: 8, marginLeft: 8, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(231, 76, 60, 0.3)' },
  companyDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 4, minWidth: 0 },
  detailLabel: { color: '#0F4C75', fontSize: 12, marginLeft: 6, width: 70, flexShrink: 0 },
  detailValue: { color: '#1B262C', fontSize: 12, fontWeight: '600', textAlign: 'right', flex: 1 },
  actionsContainer: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#BBE1FA' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#BBE1FA' },
  primaryActionButton: { backgroundColor: '#3282B8', borderColor: '#3282B8' },
  actionButtonText: { color: '#0F4C75', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  primaryActionButtonText: { color: '#FFFFFF' },
  floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0F4C75', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#3282B8' },
  deleteModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  deleteModalContent: { backgroundColor: '#0F4C75', padding: 24, borderRadius: 20, width: '90%', maxWidth: 400, borderWidth: 1, borderColor: '#3282B8', alignItems: 'center' },
  deleteModalIcon: { marginBottom: 16 },
  deleteModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12, textAlign: 'center' },
  deleteModalMessage: { fontSize: 16, color: '#F8FAFC', textAlign: 'center', marginBottom: 12 },
  deleteModalWarning: { fontSize: 14, color: '#BBE1FA', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  deleteModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  deleteModalCancelButton: { flex: 1, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#3282B8', alignItems: 'center' },
  deleteModalCancelText: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  deleteModalConfirmButton: { flex: 1, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#e74c3c', alignItems: 'center' },
  deleteModalConfirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  searchModalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'flex-end' },
  searchModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', borderWidth: 1, borderColor: '#BBE1FA' },
  searchModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#BBE1FA' },
  searchModalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1B262C' },
  closeButton: { padding: 4 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#BBE1FA' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1B262C' },
  searchResultsHeader: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#BBE1FA' },
  searchResultsTitle: { fontSize: 14, fontWeight: '600', color: '#0F4C75' },
  searchResultsList: { flex: 1 },
  searchResultCard: { padding: 16, marginHorizontal: 24, marginVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#BBE1FA' },
  searchResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 16, fontWeight: 'bold', color: '#1B262C', marginBottom: 4 },
  addButton: { marginLeft: 12 },
  searchResultStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchResultStat: { fontSize: 12, color: '#3282B8' },
  noResultsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  noResultsText: { fontSize: 14, color: '#3282B8', marginTop: 12, textAlign: 'center' },
  noResultsSubtext: { fontSize: 12, color: '#BBE1FA', marginTop: 8, textAlign: 'center' },
});