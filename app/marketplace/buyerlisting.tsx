import React, { useState, useEffect, useMemo } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, StatusBar, RefreshControl, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMarketplaceStore, type BuyerListing } from '../store/marketplaceStore';
import { useAuth } from '../../context/AuthContext';

const SortButton = React.memo(({ title, value, active, onPress }: any) => (
  <TouchableOpacity style={[styles.sortButton, active && styles.sortButtonActive]} onPress={onPress}>
    <Text style={[styles.sortText, active && styles.sortTextActive]}>{title}</Text>
  </TouchableOpacity>
));

const MyListingCard = React.memo(({ listing, onViewDetails, onDelete, getSellerResponsesForListing }: any) => {
  const responseCount = getSellerResponsesForListing(listing.id).length;
  const getListingStatus = (expiryDate: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiryDate).getTime();
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'Expired', color: '#95a5a6', daysLeft: 0 };
    else if (daysLeft <= 3) return { status: 'Expiring Soon', color: '#e74c3c', daysLeft };
    else if (daysLeft <= 7) return { status: 'Active', color: '#f39c12', daysLeft };
    else return { status: 'Active', color: '#27ae60', daysLeft };
  };

  const { status, color, daysLeft } = getListingStatus(listing.expiryDate);
  const isExpired = status === 'Expired';

  const availableSizes = listing.priceList 
    ? Object.entries(listing.priceList)
        .filter(([_, price]) => price !== undefined)
        .map(([size, price]) => ({ size: size.replace('size', '').replace('Plus', '+'), price: price as number }))
    : [];

  return (
    <View style={[styles.card, isExpired && styles.expiredCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.listingTitleSection}>
          <Text style={[styles.listingTitle, isExpired && styles.expiredText]}>{listing.companyName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>{isExpired ? 'Expired' : `${daysLeft}d left`}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => onViewDetails(listing)}>
            <Ionicons name="eye-outline" size={20} color="#315f57" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={() => onDelete(listing)}>
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.paymentSection}>
        <View style={styles.paymentBadge}>
          <Ionicons name={listing.paymentMethod === 'cash' ? 'cash-outline' : 'calendar-outline'} size={14} color="#FFFFFF" />
          <Text style={styles.paymentBadgeText}>{listing.paymentMethod === 'cash' ? 'COD' : `T.O.P ${listing.topDays}d`}</Text>
        </View>
      </View>

      <View style={styles.priceListContainer}>
        <Text style={styles.priceListTitle}>Price List (per kg)</Text>
        <View style={styles.priceGrid}>
          {availableSizes.map(({ size, price }, index) => (
            <View key={index} style={styles.priceItem}>
              <Text style={styles.priceSize}>Size {size}</Text>
              <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.locationSection}>
        <Ionicons name="location-outline" size={14} color="#315f57" />
        <Text style={styles.locationText}>{listing.deliveryLocation}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={14} color="#315f57" />
            <Text style={styles.statText}>{listing.viewCount} views</Text>
          </View>
          {responseCount > 0 && (
            <View style={styles.stat}>
              <Ionicons name="chatbubbles-outline" size={14} color="#27ae60" />
              <Text style={[styles.statText, { color: '#27ae60' }]}>{responseCount} offers</Text>
            </View>
          )}
        </View>
        <Text style={styles.postedDate}>Posted: {new Date(listing.postedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
      </View>
    </View>
  );
});

const MyListingsScreen = () => {
  const router = useRouter();
  const { company } = useAuth();
  const { buyerListings, deleteBuyerListing, getSellerResponsesForListing, switchAccount } = useMarketplaceStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'expiring' | 'views'>('newest');

  useEffect(() => {
    if (company?.id) {
      let userCountry = company.country;
      if (!userCountry && typeof company.primaryLocation === 'object') {
        userCountry = company.primaryLocation.country;
      }
      switchAccount(company.id, userCountry || '');
    }
  }, [company?.id, company?.country, switchAccount]);

  const myListings = useMemo(() => {
    if (!company?.id) return [];
    const userListings = buyerListings.filter(listing => listing.companyId === company.id);
    return userListings.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        case 'expiring': return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'views': return b.viewCount - a.viewCount;
        default: return 0;
      }
    });
  }, [buyerListings, company?.id, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteListing = (listing: BuyerListing) => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteBuyerListing(listing.id);
          Alert.alert('Success', 'Listing deleted successfully');
        } catch (error) {
          Alert.alert('Error', 'Failed to delete listing');
        }
      }},
    ]);
  };

  const handleViewDetails = (listing: BuyerListing) => {
    const priceListText = listing.priceList
      ? Object.entries(listing.priceList)
          .filter(([_, price]) => price !== undefined)
          .map(([size, price]) => {
            const sizeLabel = size.replace('size', '').replace('Plus', '+');
            return `Size ${sizeLabel}: ${price!.toFixed(2)}/kg`;
          }).join('\n')
      : 'No prices available';
    
    const paymentText = listing.paymentMethod === 'cash' ? 'Cash on Delivery' : `Terms of Payment (${listing.topDays} days)`;
    
    Alert.alert('Listing Details',
      `Price List:\n${priceListText}\n\nDelivery: ${listing.deliveryLocation}\nPayment: ${paymentText}\n\nContact: ${listing.contactPhone}\nEmail: ${listing.contactEmail}${listing.additionalNotes ? `\n\nNotes: ${listing.additionalNotes}` : ''}`,
      [{ text: 'Close' }]
    );
  };

  const activeCount = myListings.filter(l => new Date(l.expiryDate).getTime() > new Date().getTime()).length;
  const expiredCount = myListings.length - activeCount;
  const totalViews = myListings.reduce((sum, l) => sum + l.viewCount, 0);

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
          <Text style={styles.headerTitle}>My Listings</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/marketplace/create-buyer-listing')}
            accessibilityRole="button"
            accessibilityLabel="Create buyer listing"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color="#0d2137" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#95a5a6' }]}>{expiredCount}</Text>
            <Text style={styles.summaryLabel}>Expired</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{totalViews}</Text>
            <Text style={styles.summaryLabel}>Views</Text>
          </View>
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortTitle}>Sort by</Text>
          <View style={styles.sortButtons}>
            <SortButton title="Newest" value="newest" active={sortBy === 'newest'} onPress={() => setSortBy('newest')} />
            <SortButton title="Expiring" value="expiring" active={sortBy === 'expiring'} onPress={() => setSortBy('expiring')} />
            <SortButton title="Views" value="views" active={sortBy === 'views'} onPress={() => setSortBy('views')} />
          </View>
        </View>

        <FlatList
          style={styles.content}
          data={myListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={<Text style={styles.resultsCount}>{myListings.length} total listings</Text>}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={80} color="#dce8f2" />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySubtitle}>Create your first listing to start receiving offers from suppliers</Text>
              <TouchableOpacity style={styles.createFirstButton} onPress={() => router.push('/marketplace/create-buyer-listing')}>
                <Text style={styles.createFirstButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <MyListingCard
              listing={item}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteListing}
              getSellerResponsesForListing={getSellerResponsesForListing}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#dce8f2', 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  backButton: { padding: 8, marginLeft: -4 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 19 : 20, fontWeight: 'bold', color: '#0d2137' },
  addButton: { padding: 8, marginRight: -4 },
  summaryBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: Platform.OS === 'android' ? 10 : 12, paddingHorizontal: Platform.OS === 'android' ? 16 : 20, borderBottomWidth: 1, borderBottomColor: '#dce8f2', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#dce8f2' },
  summaryNumber: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#27ae60', marginBottom: 2 },
  summaryLabel: { fontSize: Platform.OS === 'android' ? 10 : 11, color: '#315f57', textTransform: 'uppercase', fontWeight: '600' },
  sortContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'android' ? 16 : 20, paddingVertical: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  sortTitle: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137' },
  sortButtons: { flexDirection: 'row', gap: 8 },
  sortButton: { paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 5 : 6, backgroundColor: '#f4f8fc', borderRadius: 16, borderWidth: 1, borderColor: '#e8f2f9' },
  sortButtonActive: { backgroundColor: '#315f57', borderColor: '#315f57' },
  sortText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600' },
  sortTextActive: { color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: Platform.OS === 'android' ? 16 : 20 },
  resultsCount: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600', color: '#0d2137', paddingVertical: Platform.OS === 'android' ? 14 : 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  expiredCard: { opacity: 0.7, borderColor: '#95a5a6', backgroundColor: '#f4f8fc' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  listingTitleSection: { flex: 1 },
  listingTitle: { fontSize: Platform.OS === 'android' ? 17 : 18, fontWeight: 'bold', color: '#0d2137', marginBottom: 6 },
  expiredText: { color: '#95a5a6' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Platform.OS === 'android' ? 9 : 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 8, backgroundColor: '#f4f8fc', borderRadius: 8, borderWidth: 1, borderColor: '#e8f2f9' },
  deleteButton: { backgroundColor: '#fee', borderColor: '#fcc' },
  paymentSection: { marginBottom: Platform.OS === 'android' ? 10 : 12 },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: Platform.OS === 'android' ? 9 : 10, paddingVertical: Platform.OS === 'android' ? 5 : 6, borderRadius: 12, backgroundColor: '#0d2137', gap: 4 },
  paymentBadgeText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 10 : 11, fontWeight: 'bold' },
  priceListContainer: { marginBottom: Platform.OS === 'android' ? 10 : 12 },
  priceListTitle: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: '600', color: '#0d2137', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceItem: { backgroundColor: '#f4f8fc', paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 7 : 8, borderRadius: 8, borderWidth: 1, borderColor: '#e8f2f9', width: '48%' },
  priceSize: { fontSize: Platform.OS === 'android' ? 10 : 11, color: '#315f57', fontWeight: '600' },
  priceValue: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#27ae60', fontWeight: 'bold', marginTop: 2 },
  locationSection: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 10 : 12, paddingBottom: Platform.OS === 'android' ? 10 : 12, borderTopWidth: 1, borderTopColor: '#dce8f2' },
  locationText: { color: '#315f57', fontSize: Platform.OS === 'android' ? 11 : 12, marginLeft: 4, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 10 : 12, borderTopWidth: 1, borderTopColor: '#dce8f2' },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', fontWeight: '600' },
  postedDate: { color: '#0d2137', fontSize: Platform.OS === 'android' ? 10 : 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 60 : 80 },
  emptyTitle: { fontSize: Platform.OS === 'android' ? 19 : 20, fontWeight: 'bold', color: '#0d2137', marginTop: Platform.OS === 'android' ? 14 : 16 },
  emptySubtitle: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: Platform.OS === 'android' ? 19 : 20 },
  createFirstButton: { marginTop: Platform.OS === 'android' ? 20 : 24, paddingHorizontal: Platform.OS === 'android' ? 28 : 32, paddingVertical: Platform.OS === 'android' ? 12 : 14, backgroundColor: '#315f57', borderRadius: 12 },
  createFirstButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: '600' },
});

export default MyListingsScreen;
