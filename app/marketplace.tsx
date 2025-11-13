import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, 
  RefreshControl, Alert, Switch, Platform, Modal, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarketplaceStore, type BuyerListing } from './store/marketplaceStore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const LocationFilterControls = React.memo(({ locationFilter, setLocationFilter, t }: any) => (
  <View style={styles.filterControls}>
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{t.MarketplaceScreen.showNearbyOnly}</Text>
      <Switch 
        value={locationFilter.enabled}
        onValueChange={(enabled) => setLocationFilter((prev: any) => ({ ...prev, enabled }))}
        trackColor={{ false: '#BBE1FA', true: '#3282B8' }}
        thumbColor={locationFilter.enabled ? '#0F4C75' : '#f4f3f4'} 
      />
    </View>
    {locationFilter.enabled && (
      <View style={styles.radiusSelector}>
        <Text style={styles.filterLabel}>{t.MarketplaceScreen.withinRadius}</Text>
        {[25, 50, 100, 200].map(radius => (
          <TouchableOpacity 
            key={radius}
            style={[styles.radiusButton, locationFilter.radius === radius && styles.radiusButtonActive]}
            onPress={() => setLocationFilter((prev: any) => ({ ...prev, radius }))}
            activeOpacity={0.7}
          >
            <Text style={[styles.radiusButtonText, locationFilter.radius === radius && styles.radiusButtonTextActive]}>
              {radius}km
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
));

const SortButton = React.memo(({ title, value, active, onPress }: any) => (
  <TouchableOpacity 
    style={[styles.sortButton, active && styles.sortButtonActive]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.sortText, active && styles.sortTextActive]}>{title}</Text>
  </TouchableOpacity>
));

const BuyerListingCard = React.memo(({ listing, onPress, responseCount, locationFilter, t }: any) => {
  const daysLeft = Math.ceil((new Date(listing.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgencyColor = daysLeft <= 3 ? '#e74c3c' : daysLeft <= 7 ? '#f39c12' : '#27ae60';

  const availableSizes = useMemo(() => {
    if (!listing.priceList) return [];
    return Object.entries(listing.priceList)
      .filter(([_, price]) => price !== undefined && typeof price === 'number')
      .map(([size, price]) => ({
        size: size.replace('size', '').replace('Plus', '+'),
        price: price as number
      }));
  }, [listing.priceList]);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.buyerInfo}>
          <Text style={styles.buyerName} numberOfLines={1}>{listing.buyerName}</Text>
          <Text style={styles.companyName} numberOfLines={1}>{listing.companyName}</Text>
        </View>
        <View style={styles.paymentBadge}>
          <Ionicons 
            name={listing.paymentMethod === 'cash' ? 'cash-outline' : 'calendar-outline'} 
            size={14} 
            color="#FFFFFF" 
          />
          <Text style={styles.paymentBadgeText}>
            {listing.paymentMethod === 'cash' 
              ? t.MarketplaceScreen.cod 
              : `${t.MarketplaceScreen.top} ${listing.topDays}${t.MarketplaceScreen.days}`}
          </Text>
        </View>
      </View>

      <View style={styles.priceListContainer}>
        <Text style={styles.priceListTitle}>{t.MarketplaceScreen.priceListPerKg}</Text>
        <View style={styles.priceGrid}>
          {availableSizes.map(({ size, price }, index) => (
            <View key={index} style={styles.priceItem}>
              <Text style={styles.priceSize}>{t.MarketplaceScreen.size} {size}</Text>
              <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.locationDelivery}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color="#3282B8" />
          <Text style={styles.locationText} numberOfLines={1}>{listing.deliveryLocation}</Text>
        </View>
      </View>

      {locationFilter.showDistances && (
        <View style={styles.distanceInfo}>
          <Ionicons name="location" size={16} color="#3282B8" />
          <Text style={styles.distanceText}>
            {t.MarketplaceScreen.kmAway.replace('{distance}', '50')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.postedDate}>
            {t.MarketplaceScreen.posted}: {new Date(listing.postedDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
          <Text style={styles.viewCount}>{listing.viewCount} {t.MarketplaceScreen.views}</Text>
        </View>
        <View style={styles.footerRight}>
          {responseCount > 0 && (
            <View style={styles.responseCount}>
              <Ionicons name="chatbubbles-outline" size={12} color="#3282B8" />
              <Text style={styles.responseText}>{responseCount} {t.MarketplaceScreen.offers}</Text>
            </View>
          )}
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
            <Text style={styles.urgencyText}>{daysLeft}{t.MarketplaceScreen.daysLeft}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.listing.id === nextProps.listing.id &&
    prevProps.listing.viewCount === nextProps.listing.viewCount &&
    prevProps.responseCount === nextProps.responseCount
  );
});

const ListingDetailModal = React.memo(({ visible, listing, onClose, t }: any) => {
  const insets = useSafeAreaInsets();

  if (!listing) return null;

  const priceListText = listing.priceList
    ? Object.entries(listing.priceList)
        .filter(([_, price]) => price !== undefined)
        .map(([size, price]) => {
          const sizeLabel = size.replace('size', '').replace('Plus', '+');
          return `${t.MarketplaceScreen.size} ${sizeLabel}: $${typeof price === 'number' ? price.toFixed(2) : '0.00'}/kg`;
        }).join('\n')
    : t.MarketplaceScreen.noPricesAvailable;
  
  const paymentText = listing.paymentMethod === 'cash' 
    ? t.MarketplaceScreen.cashOnDelivery
    : t.MarketplaceScreen.termsOfPayment.replace('{days}', listing.topDays?.toString() || '0');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle} numberOfLines={1}>{listing.buyerName}</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>{listing.companyName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1B262C" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                <Ionicons name="pricetag-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.priceList}
              </Text>
              <Text style={styles.modalSectionText}>{priceListText}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                <Ionicons name="location-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.delivery}
              </Text>
              <Text style={styles.modalSectionText}>{listing.deliveryLocation}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                <Ionicons name="cash-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.payment}
              </Text>
              <Text style={styles.modalSectionText}>{paymentText}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                <Ionicons name="call-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.contact}
              </Text>
              <Text style={styles.modalSectionText}>{listing.contactPhone}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                <Ionicons name="mail-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.email}
              </Text>
              <Text style={styles.modalSectionText}>{listing.contactEmail}</Text>
            </View>

            {listing.additionalNotes && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  <Ionicons name="document-text-outline" size={16} color="#0F4C75" /> {t.MarketplaceScreen.notes}
                </Text>
                <Text style={styles.modalSectionText}>{listing.additionalNotes}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>{t.MarketplaceScreen.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const MarketplaceScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { company } = useAuth();
  const { t } = useLanguage();
  const { 
    buyerListings, 
    getAllActiveListings, 
    incrementViewCount, 
    getSellerResponsesForListing, 
    switchAccount, 
    loadAllListings 
  } = useMarketplaceStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price'>('newest');
  const [locationFilter, setLocationFilter] = useState({ 
    enabled: false, 
    radius: 100, 
    showDistances: false 
  });
  const [selectedListing, setSelectedListing] = useState<BuyerListing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (company?.id) {
      let userCountry = company.country;
      if (!userCountry && typeof company.primaryLocation === 'object') {
        userCountry = company.primaryLocation.country;
      }
      switchAccount(company.id, userCountry || '');
      loadAllListings();
    }
  }, [company?.id, company?.country]);

  // Memoize response counts to avoid recalculating on every render
  const responseCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    buyerListings.forEach(listing => {
      map.set(listing.id, getSellerResponsesForListing(listing.id).length);
    });
    return map;
  }, [buyerListings, getSellerResponsesForListing]);

  const sortedListings = useMemo(() => {
    const listings = getAllActiveListings();
    let filteredListings = listings;
    
    if (locationFilter.enabled && company?.primaryLocation) {
      filteredListings = listings.filter(() => true);
    }
    
    return filteredListings.sort((a, b) => {
      switch (sortBy) {
        case 'newest': 
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        case 'price': {
          const pricesA = a.priceList ? Object.values(a.priceList).filter(p => p !== undefined) : [];
          const pricesB = b.priceList ? Object.values(b.priceList).filter(p => p !== undefined) : [];
          const avgPriceA = pricesA.length > 0 
            ? pricesA.reduce((sum, p) => sum + (p || 0), 0) / pricesA.length 
            : 0;
          const avgPriceB = pricesB.length > 0 
            ? pricesB.reduce((sum, p) => sum + (p || 0), 0) / pricesB.length 
            : 0;
          return avgPriceB - avgPriceA;
        }
        default: 
          return 0;
      }
    });
  }, [buyerListings, sortBy, locationFilter, company, getAllActiveListings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAllListings();
    } catch (error) {
      console.error('Error refreshing listings:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadAllListings]);

  const handleViewListing = useCallback(async (listing: BuyerListing) => {
    // Immediately show the modal with current data
    setSelectedListing(listing);
    setShowDetailModal(true);
    
    // Update view count in background (non-blocking)
    incrementViewCount(listing.id).catch(error => {
      console.error('Error incrementing view count:', error);
    });
  }, [incrementViewCount]);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    // Delay clearing to allow animation to complete
    setTimeout(() => setSelectedListing(null), 300);
  }, []);

  const handleCreateListing = useCallback(() => {
    router.push('/marketplace/create-buyer-listing');
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      
      <View style={[styles.header, { 
        paddingTop: Platform.OS === 'android' ? insets.top + 10 : insets.top + 12 
      }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1B262C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.MarketplaceScreen.title}</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleCreateListing} 
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#1B262C" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <LocationFilterControls 
          locationFilter={locationFilter} 
          setLocationFilter={setLocationFilter} 
          t={t} 
        />

        <View style={styles.sortContainer}>
          <Text style={styles.sortTitle}>{t.MarketplaceScreen.sortBy}</Text>
          <View style={styles.sortButtons}>
            <SortButton 
              title={t.MarketplaceScreen.newest} 
              value="newest" 
              active={sortBy === 'newest'} 
              onPress={() => setSortBy('newest')} 
            />
            <SortButton 
              title={t.MarketplaceScreen.price} 
              value="price" 
              active={sortBy === 'price'} 
              onPress={() => setSortBy('price')} 
            />
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false} 
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#3282B8']}
              tintColor="#3282B8"
            />
          }
        >
          <Text style={styles.resultsCount}>
            {sortedListings.length} {locationFilter.enabled 
              ? t.MarketplaceScreen.nearbyListings 
              : t.MarketplaceScreen.activeListings}
          </Text>

          {sortedListings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={80} color="#BBE1FA" />
              <Text style={styles.emptyTitle}>{t.MarketplaceScreen.noListingsAvailable}</Text>
              <Text style={styles.emptySubtitle}>
                {locationFilter.enabled 
                  ? t.MarketplaceScreen.expandSearchRadius 
                  : t.MarketplaceScreen.beFirstToPost}
              </Text>
              <TouchableOpacity 
                style={styles.createFirstButton} 
                onPress={handleCreateListing}
                activeOpacity={0.7}
              >
                <Text style={styles.createFirstButtonText}>
                  {t.MarketplaceScreen.createListing}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedListings.map((listing) => (
              <BuyerListingCard 
                key={listing.id} 
                listing={listing} 
                onPress={() => handleViewListing(listing)}
                responseCount={responseCountsMap.get(listing.id) || 0}
                locationFilter={locationFilter} 
                t={t} 
              />
            ))
          )}
        </ScrollView>
      </View>

      <ListingDetailModal
        visible={showDetailModal}
        listing={selectedListing}
        onClose={handleCloseModal}
        t={t}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#BBE1FA', 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: { 
    fontSize: Platform.OS === 'android' ? 19 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C' 
  },
  addButton: { padding: 8, marginRight: -4 },
  filterControls: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingTop: Platform.OS === 'android' ? 9 : 10, 
    paddingBottom: Platform.OS === 'android' ? 9 : 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  filterRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  filterLabel: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#1B262C' 
  },
  radiusSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    flexWrap: 'wrap', 
    marginTop: Platform.OS === 'android' ? 10 : 12 
  },
  radiusButton: { 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    marginLeft: 8 
  },
  radiusButtonActive: { backgroundColor: '#3282B8', borderColor: '#3282B8' },
  radiusButtonText: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#3282B8', 
    fontWeight: '600' 
  },
  radiusButtonTextActive: { color: '#FFFFFF' },
  distanceInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8, 
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: '#BBE1FA' 
  },
  distanceText: { 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    color: '#3282B8', 
    marginLeft: 4, 
    fontWeight: '600' 
  },
  sortContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  sortTitle: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#1B262C' 
  },
  sortButtons: { flexDirection: 'row' },
  sortButton: { 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    marginLeft: 8, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#BBE1FA' 
  },
  sortButtonActive: { backgroundColor: '#3282B8', borderColor: '#3282B8' },
  sortText: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    fontWeight: '600' 
  },
  sortTextActive: { color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: Platform.OS === 'android' ? 16 : 20 },
  resultsCount: { 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    color: '#1B262C', 
    paddingVertical: Platform.OS === 'android' ? 14 : 16 
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: Platform.OS === 'android' ? 14 : 16, 
    marginBottom: Platform.OS === 'android' ? 14 : 16, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    shadowColor: '#0F4C75', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: Platform.OS === 'android' ? 14 : 16 
  },
  buyerInfo: { flex: 1, marginRight: 8 },
  buyerName: { 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: 'bold', 
    color: '#1B262C' 
  },
  companyName: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#3282B8', 
    marginTop: 2 
  },
  paymentBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: Platform.OS === 'android' ? 9 : 10, 
    paddingVertical: Platform.OS === 'android' ? 5 : 6, 
    borderRadius: 12, 
    backgroundColor: '#0F4C75', 
    gap: 4 
  },
  paymentBadgeText: { 
    color: '#FFFFFF', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    fontWeight: 'bold' 
  },
  priceListContainer: { marginBottom: Platform.OS === 'android' ? 10 : 12 },
  priceListTitle: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '600', 
    color: '#0F4C75', 
    marginBottom: Platform.OS === 'android' ? 7 : 8 
  },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceItem: { 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12, 
    paddingVertical: Platform.OS === 'android' ? 7 : 8, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    width: '48%' 
  },
  priceSize: { 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    color: '#3282B8', 
    fontWeight: '600' 
  },
  priceValue: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#27ae60', 
    fontWeight: 'bold', 
    marginTop: 2 
  },
  detailItem: { flexDirection: 'row', alignItems: 'center' },
  locationDelivery: { 
    paddingTop: Platform.OS === 'android' ? 10 : 12, 
    paddingBottom: Platform.OS === 'android' ? 10 : 12, 
    borderTopWidth: 1, 
    borderTopColor: '#BBE1FA' 
  },
  locationText: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginLeft: 4, 
    flex: 1 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'android' ? 10 : 12, 
    borderTopWidth: 1, 
    borderTopColor: '#BBE1FA' 
  },
  postedDate: { 
    color: '#0F4C75', 
    fontSize: Platform.OS === 'android' ? 11 : 12 
  },
  viewCount: { 
    color: '#BBE1FA', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    marginTop: 2 
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  responseCount: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: Platform.OS === 'android' ? 7 : 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  responseText: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    marginLeft: 4, 
    fontWeight: '600' 
  },
  urgencyBadge: { 
    paddingHorizontal: Platform.OS === 'android' ? 7 : 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  urgencyText: { 
    color: '#FFFFFF', 
    fontSize: Platform.OS === 'android' ? 10 : 11, 
    fontWeight: 'bold' 
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Platform.OS === 'android' ? 60 : 80 
  },
  emptyTitle: { 
    fontSize: Platform.OS === 'android' ? 19 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginTop: Platform.OS === 'android' ? 14 : 16 
  },
  emptySubtitle: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#3282B8', 
    textAlign: 'center', 
    marginTop: 8, 
    paddingHorizontal: 40, 
    lineHeight: Platform.OS === 'android' ? 19 : 20 
  },
  createFirstButton: { 
    marginTop: Platform.OS === 'android' ? 20 : 24, 
    paddingHorizontal: Platform.OS === 'android' ? 28 : 32, 
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    backgroundColor: '#3282B8', 
    borderRadius: 12 
  },
  createFirstButtonText: { 
    color: '#FFFFFF', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600' 
  },
  // Modal styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: Platform.OS === 'android' ? 20 : 24, 
    borderTopRightRadius: Platform.OS === 'android' ? 20 : 24, 
    maxHeight: '90%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    paddingVertical: Platform.OS === 'android' ? 16 : 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  modalHeaderLeft: { 
    flex: 1, 
    marginRight: 12 
  },
  modalTitle: { 
    fontSize: Platform.OS === 'android' ? 18 : 20, 
    fontWeight: 'bold', 
    color: '#1B262C' 
  },
  modalSubtitle: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#3282B8', 
    marginTop: 2 
  },
  closeButton: { 
    padding: 8, 
    marginRight: -8 
  },
  modalScroll: { 
    flex: 1 
  },
  modalScrollContent: { 
    paddingHorizontal: Platform.OS === 'android' ? 16 : 20, 
    paddingTop: Platform.OS === 'android' ? 16 : 20,
    paddingBottom: 20,
  },
  modalSection: { 
    marginBottom: Platform.OS === 'android' ? 16 : 20 
  },
  modalSectionTitle: { 
    fontSize: Platform.OS === 'android' ? 14 : 15, 
    fontWeight: '600', 
    color: '#0F4C75', 
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSectionText: { 
    fontSize: Platform.OS === 'android' ? 14 : 15, 
    color: '#1B262C', 
    lineHeight: Platform.OS === 'android' ? 20 : 22 
  },
  modalCloseButton: { 
    marginHorizontal: Platform.OS === 'android' ? 16 : 20, 
    marginTop: Platform.OS === 'android' ? 12 : 16,
    marginBottom: Platform.OS === 'android' ? 8 : 12,
    paddingVertical: Platform.OS === 'android' ? 12 : 14, 
    backgroundColor: '#3282B8', 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  modalCloseButtonText: { 
    color: '#FFFFFF', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600' 
  },
});

export default MarketplaceScreen;