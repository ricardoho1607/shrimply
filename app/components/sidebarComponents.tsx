// app/components/SidebarComponents.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, Modal,
  Platform,
  SafeAreaView,
  ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSidebar } from '../../context/sidebarContext';
import { useDataBackup } from '../hooks/useDataBackup';

interface MenuButtonProps {
  icon: string;
  text: string;
  onPress: () => void;
  color?: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  badge?: number;
}

export const MenuButton = ({ icon, text, onPress, color = "#0d2137", active = false, disabled = false, loading = false, badge }: MenuButtonProps) => (
  <TouchableOpacity
    style={[styles.menuItem, active && styles.activeMenuItem, disabled && styles.disabledMenuItem]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon as any} size={22} color={disabled ? "#dbe7df" : color} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.menuText, { color: disabled ? "#dbe7df" : (active ? "#0d2137" : color) }]}>
      {text}
    </Text>
    {loading && <ActivityIndicator size="small" color="#dce8f2" />}
  </TouchableOpacity>
);

export const RegularSidebar: React.FC = () => {
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef(0);
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const { user, company, signOut, getTeamMembers, getCompanyLocationString } = useAuth();
  const { t } = useLanguage();
  const { manualBackup, isLoggedIn, isBackingUp, isRestoring, lastBackupDisplay } = useDataBackup();
  const {
    sidebarVisible,
    setSidebarVisible,
    reportsExpanded,
    inventoryExpanded,
    toggleReports,
    toggleInventory,
    slideAnimRef
  } = useSidebar();

  const hasFinanceAccess = ['owner', 'manager', 'admin'].includes(user?.role || '');

  const loadTeamStats = useCallback(async () => {
    if (!company || !company.id) return;
    if (!getTeamMembers) return;

    try {
      const members = await getTeamMembers();
      const activeCount = members.filter((m: any) => m.status === 'active').length;
      const pendingCount = members.filter((m: any) => m.status === 'pending').length;

      setTeamMemberCount(activeCount);
      setPendingInviteCount(pendingCount);
    } catch (error) {
      console.error('Error loading team stats:', error);
    }
  }, [company?.id, getTeamMembers]);

  useEffect(() => {
    if (company?.id) {
      loadTeamStats();
    }
  }, [company?.id]);

  useEffect(() => {
    if (sidebarVisible) {
      const timer = setTimeout(() => {
        loadTeamStats();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sidebarVisible, loadTeamStats]);

  const navigateAndClose = (route: string) => {
    router.push(route as any);
    setSidebarVisible(false);
  };

  const handleManualBackup = async () => {
    try {
      await manualBackup();
      Alert.alert(t.messages.success, t.messages.saveSuccess);
    } catch (error: any) {
      console.error('Backup failed:', error);
      Alert.alert('Backup Failed', 'Failed to back up data. Please try again.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(t.sidebar.signOut, 'Are you sure you want to sign out?', [
      { text: t.actions.cancel, style: 'cancel' },
      {
        text: t.sidebar.signOut,
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            setSidebarVisible(false);
          } catch (error: any) {
            console.error('Sign out failed:', error);
            Alert.alert(t.messages.error, 'Failed to sign out. Please try again.');
          }
        }
      }
    ]);
  };




  const InventoryMenuButton = () => (
    <TouchableOpacity
      style={[styles.menuItem, inventoryExpanded && styles.activeMenuItem]}
      onPress={toggleInventory}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name="cube-outline" size={22} color="#0d2137" />
      </View>
      <Text style={[styles.menuText, { color: '#0d2137' }]}>Inventory</Text>
      <Ionicons
        name={inventoryExpanded ? "chevron-up" : "chevron-down"}
        size={20}
        color="#0d2137"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const ReportsMenuButton = () => (
    <TouchableOpacity
      style={[styles.menuItem, reportsExpanded && styles.activeMenuItem]}
      onPress={toggleReports}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name="document-text-outline" size={22} color="#9B59B6" />
      </View>
      <Text style={[styles.menuText, { color: '#9B59B6' }]}>Reports</Text>
      <Ionicons
        name={reportsExpanded ? "chevron-up" : "chevron-down"}
        size={20}
        color="#9B59B6"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const CompanyInfoCard = () => {
    const isOwner = user?.role === 'owner';
    const hasCompany = !!company;

    if (isOwner && hasCompany) {
      return (
        <TouchableOpacity style={styles.companyCard} onPress={() => navigateAndClose('/companydetails')}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={20} color="#0d2137" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{company.companyName}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {getCompanyLocationString() || 'Complete your profile'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#315f57" />
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{teamMemberCount}</Text>
              <Text style={styles.statLabel}>Team</Text>
            </View>
            {pendingInviteCount > 0 && (
              <View style={styles.stat}>
                <Text style={[styles.statNumber, styles.pendingNumber]}>{pendingInviteCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    }

    if (isOwner && !hasCompany) {
      return (
        <TouchableOpacity style={styles.companyCard} onPress={() => navigateAndClose('/companydetails')}>
          <View style={styles.cardHeader}>
            <Ionicons name="add-circle" size={20} color="#0d2137" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Set up company</Text>
              <Text style={styles.cardSubtitle}>Create your company profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#315f57" />
          </View>
        </TouchableOpacity>
      );
    }

    if (!isOwner && hasCompany) {
      return (
        <View style={styles.companyCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={20} color="#0d2137" />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{company.companyName}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{getCompanyLocationString()}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{teamMemberCount}</Text>
              <Text style={styles.statLabel}>Team</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity style={[styles.companyCard, styles.searchCard]} onPress={() => navigateAndClose('/companysearch')}>
        <View style={styles.cardHeader}>
          <Ionicons name="search" size={20} color="#0d2137" />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Find your company</Text>
            <Text style={styles.cardSubtitle}>Search and join a company</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#315f57" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal animationType="none" transparent visible={sidebarVisible} onRequestClose={() => setSidebarVisible(false)}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnimRef }] }]}>
          <View style={styles.sidebarContainer}>
            <SafeAreaView style={styles.topSafeArea}>
              <View style={styles.profileSection}>
                <TouchableOpacity
                  style={styles.profileAvatar}
                  onPress={() => navigateAndClose('/userprofile')}
                >
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person" size={32} color="#FFFFFF" />
                  )}
                  <View style={styles.editProfileIcon}>
                    <Ionicons name="pencil" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.userName}>{user?.name || user?.email.split('@')[0]}</Text>
                <Text style={styles.userRole}>
                  {user?.role === 'owner' || (company && company.ownerId === user?.uid) ? 'Farm Owner' :
                    user?.role === 'technician' ? 'Aquaculture Technician' :
                      user?.role === 'manager' ? 'Manager' :
                        user?.role === 'admin' ? 'Administrator' : 
                          user?.role === 'buyer' ? 'Shrimp Buyer' : 'No Role Assigned'}
                </Text>
                <Text style={styles.companyNameSmall}>{company?.companyName || 'My Company'}</Text>
                <Text style={styles.systemTitle}>Shrimply Aquaculture Management</Text>

                {isLoggedIn && (
                  <View style={styles.backupStatus}>
                    <Text style={styles.backupStatusText}>{t.sidebar.lastBackup} {lastBackupDisplay}</Text>
                    {(isBackingUp || isRestoring) && (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#0d2137" />
                        <Text style={styles.loadingText}>{isBackingUp ? t.sidebar.backingUp : t.sidebar.restoring}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </SafeAreaView>

            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContentContainer,
                { paddingBottom: Math.max(insets.bottom, 20) + 40 }
              ]}
              onScroll={(event) => {
                scrollPositionRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                if (scrollViewRef.current && scrollPositionRef.current > 0) {
                  scrollViewRef.current.scrollTo({
                    y: scrollPositionRef.current,
                    animated: false
                  });
                }
              }}
            >
              <View style={styles.companySection}>
                <CompanyInfoCard />
              </View>

              <View style={styles.menuContainer}>
                <MenuButton icon="home" text={t.nav.home} onPress={() => navigateAndClose('/')} active />
                <MenuButton icon="storefront-outline" text="Marketplace" onPress={() => navigateAndClose('/marketplace')} />
                <MenuButton icon="map-outline" text={t.diseaseReport?.title || "Disease Report"} onPress={() => navigateAndClose('/disease-report')} />
                <MenuButton icon="sparkles-outline" text="Orson AI" onPress={() => navigateAndClose('/AIChat')} />
                <MenuButton icon="notifications-outline" text="Notifications" onPress={() => navigateAndClose('/notifications')} />

                {hasFinanceAccess && (
                  <>
                    <View style={styles.separator} />
                    <MenuButton
                      icon="wallet-outline"
                      text="Finance"
                      onPress={() => navigateAndClose('/finance')}
                      color="#27AE60"
                    />
                  </>
                )}

                {hasFinanceAccess && (
                  <>
                    <View style={styles.separator} />
                    <ReportsMenuButton />

                    {reportsExpanded && (
                      <View style={styles.submenuContainer}>
                        <MenuButton
                          icon="stats-chart-outline"
                          text="Financial Reports"
                          onPress={() => navigateAndClose('/financial-reports')}
                          color="#9B59B6"
                        />
                        <MenuButton
                          icon="bar-chart-outline"
                          text="Shrimp Reports"
                          onPress={() => navigateAndClose('/shrimp-reports')}
                          color="#9B59B6"
                        />
                        <MenuButton
                          icon="file-tray-full-outline"
                          text={t.sidebar.cycleReports}
                          onPress={() => navigateAndClose('/cycle-report')}
                          color="#9B59B6"
                        />
                      </View>
                    )}
                  </>
                )}

                <View style={styles.separator} />
                <InventoryMenuButton />

                {inventoryExpanded && (
                  <View style={styles.submenuContainer}>
                    <MenuButton
                      icon="fish-outline"
                      text="Feeds & Additives"
                      onPress={() => navigateAndClose('/inventory/feedAdditives')}
                      color="#315f57"
                    />
                    <MenuButton
                      icon="construct-outline"
                      text="Assets"
                      onPress={() => navigateAndClose('/inventory/assetInventory')}
                      color="#315f57"
                    />
                  </View>
                )}

                {isLoggedIn && (
                  <>
                    <View style={styles.separator} />
                    <Text style={styles.sectionHeader}>{t.nav.dataSync}</Text>
                    <MenuButton
                      icon="cloud-upload-outline"
                      text={t.sidebar.backupToCloud}
                      onPress={handleManualBackup}
                      disabled={isBackingUp || isRestoring}
                      loading={isBackingUp}
                    />
                  </>
                )}

                <View style={styles.separator} />
                <MenuButton icon="settings-outline" text={t.nav.settings} onPress={() => navigateAndClose('/settings')} color="#0d2137" />
                <MenuButton icon="help-circle-outline" text={t.sidebar.helpSupport} onPress={() => navigateAndClose('/help-support')} color="#0d2137" />
                <MenuButton icon="log-out-outline" text={t.sidebar.signOut} onPress={handleSignOut} color="#ff3b30" />
              </View>
            </ScrollView>
          </View>
        </Animated.View>
        <TouchableOpacity style={styles.overlay} onPress={() => setSidebarVisible(false)} />
      </View>
    </Modal>
  );
};

export const BuyerSidebar: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, company, signOut, getCompanyLocationString } = useAuth();
  const { t } = useLanguage();
  const { sidebarVisible, setSidebarVisible, slideAnimRef } = useSidebar();

  const navigateAndClose = (route: string) => {
    router.push(route as any);
    setSidebarVisible(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            setSidebarVisible(false);
          } catch (error: any) {
            console.error('Sign out failed:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }
      }
    ]);
  };



  const BuyerCompanyCard = () => (
    <TouchableOpacity style={styles.companyCard} onPress={() => navigateAndClose('/companybuyer')}>
      <View style={styles.cardHeader}>
        <Ionicons name="business" size={20} color="#27AE60" />
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {company?.companyName || 'Set up company'}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {getCompanyLocationString() || 'Complete your profile'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#27AE60" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal animationType="none" transparent visible={sidebarVisible} onRequestClose={() => setSidebarVisible(false)}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnimRef }] }]}>
          <View style={styles.sidebarContainer}>
            <SafeAreaView style={styles.topSafeArea}>
              <View style={styles.profileSection}>
                <TouchableOpacity
                  style={[styles.profileAvatar, { backgroundColor: '#27AE60' }]}
                  onPress={() => navigateAndClose('/userprofile')}
                >
                  {user?.profileImage ? (
                    <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
                  ) : (
                    <Ionicons name="person" size={32} color="#FFFFFF" />
                  )}
                  <View style={styles.editProfileIcon}>
                    <Ionicons name="pencil" size={12} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.userName}>{user?.name || user?.email.split('@')[0]}</Text>
                <Text style={[styles.userRole, { color: '#27AE60' }]}>Shrimp Buyer</Text>
                <Text style={styles.companyNameSmall}>{company?.companyName || 'My Company'}</Text>
                <Text style={styles.systemTitle}>Supplier Monitoring</Text>
              </View>
            </SafeAreaView>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContentContainer,
                { paddingBottom: Math.max(insets.bottom, 20) + 40 }
              ]}
            >
              <View style={styles.companySection}>
                <BuyerCompanyCard />
              </View>

              <View style={styles.menuContainer}>
                <MenuButton icon="business" text="Suppliers" onPress={() => navigateAndClose('/indexbuyer')} active />
                <MenuButton icon="storefront-outline" text="Marketplace" onPress={() => navigateAndClose('/marketplace')} />
                <MenuButton icon="map-outline" text={t.diseaseReport?.title || "Disease Report"} onPress={() => navigateAndClose('/disease-report')} />
                <MenuButton icon="document-text-outline" text="My Listings" onPress={() => navigateAndClose('/marketplace/buyerlisting')} />
                <MenuButton icon="notifications-outline" text="Notifications" onPress={() => navigateAndClose('/notifications')} />

                <View style={styles.separator} />
                <MenuButton icon="settings-outline" text="Settings" onPress={() => navigateAndClose('/settings')} color="#0d2137" />
                <MenuButton icon="help-circle-outline" text="Help & Support" onPress={() => navigateAndClose('/help-support')} color="#0d2137" />
                <MenuButton icon="log-out-outline" text="Sign Out" onPress={handleSignOut} color="#ff3b30" />
              </View>
            </ScrollView>
          </View>
        </Animated.View>
        <TouchableOpacity style={styles.overlay} onPress={() => setSidebarVisible(false)} />
      </View>
    </Modal>
  );
};

export const StaticSidebar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, company, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { reportsExpanded, inventoryExpanded, toggleReports, toggleInventory } = useSidebar();
  const hasFinanceAccess = ['owner', 'manager', 'admin'].includes(user?.role || '');

  const navigateTo = (route: string) => router.push(route as any);
  const StaticReportsMenuButton = () => (
    <TouchableOpacity
      style={[styles.menuItem, reportsExpanded && styles.activeMenuItem]}
      onPress={toggleReports}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name="document-text-outline" size={22} color="#9B59B6" />
      </View>
      <Text style={[styles.menuText, { color: '#9B59B6' }]}>Reports</Text>
      <Ionicons
        name={reportsExpanded ? "chevron-up" : "chevron-down"}
        size={20}
        color="#9B59B6"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.staticSidebar}>
      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.profileAvatar} onPress={() => navigateTo('/userprofile')}>
          {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={styles.profileImage} /> : <Ionicons name="person" size={32} color="#FFFFFF" />}
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.name || user?.email.split('@')[0]}</Text>
        <Text style={styles.userRole}>{user?.role || 'User'}</Text>
      </View>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          <MenuButton icon="home" text={t.nav.home} onPress={() => navigateTo('/')} active />
          <MenuButton icon="storefront-outline" text="Marketplace" onPress={() => navigateTo('/marketplace')} />
          <MenuButton icon="sparkles-outline" text="Orson AI" onPress={() => navigateTo('/AIChat')} />
          {hasFinanceAccess && (
            <>
              <View style={styles.separator} />
              <MenuButton icon="wallet-outline" text="Finance" onPress={() => navigateTo('/finance')} color="#27AE60" />
              <StaticReportsMenuButton />
              {reportsExpanded && (
                <View style={styles.submenuContainer}>
                  <MenuButton icon="stats-chart-outline" text="Financial Reports" onPress={() => navigateTo('/financial-reports')} color="#9B59B6" />
                  <MenuButton icon="bar-chart-outline" text="Shrimp Reports" onPress={() => navigateTo('/shrimp-reports')} color="#9B59B6" />
                  <MenuButton icon="file-tray-full-outline" text={t.sidebar.cycleReports} onPress={() => navigateTo('/cycle-report')} color="#9B59B6" />
                </View>
              )}
            </>
          )}
          <View style={styles.separator} />
          <MenuButton icon="settings-outline" text={t.nav.settings} onPress={() => navigateTo('/settings')} color="#0d2137" />
          <MenuButton icon="log-out-outline" text={t.sidebar.signOut} onPress={signOut} color="#ff3b30" />
        </View>
      </ScrollView>
    </View>
  );
};

export const StaticBuyerSidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const navigateTo = (route: string) => router.push(route as any);

  return (
    <View style={styles.staticSidebar}>
      <View style={[styles.profileSection, { borderBottomColor: '#27AE60' }]}>
        <TouchableOpacity style={[styles.profileAvatar, { backgroundColor: '#27AE60' }]} onPress={() => navigateTo('/userprofile')}>
          {user?.profileImage ? <Image source={{ uri: user.profileImage }} style={styles.profileImage} /> : <Ionicons name="person" size={32} color="#FFFFFF" />}
        </TouchableOpacity>
        <Text style={styles.userName}>{user?.name || user?.email.split('@')[0]}</Text>
        <Text style={[styles.userRole, { color: '#27AE60' }]}>Shrimp Buyer</Text>
      </View>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          <MenuButton icon="business" text="Suppliers" onPress={() => navigateTo('/indexbuyer')} active color="#27AE60" />
          <MenuButton icon="storefront-outline" text="Marketplace" onPress={() => navigateTo('/marketplace')} color="#27AE60" />
          <View style={styles.separator} />
          <MenuButton icon="settings-outline" text="Settings" onPress={() => navigateTo('/settings')} color="#0d2137" />
          <MenuButton icon="log-out-outline" text="Sign Out" onPress={signOut} color="#ff3b30" />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  companySection: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dce8f2'
  },
  companyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    borderWidth: 1,
    borderColor: '#dce8f2',
    shadowColor: '#0d2137',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  searchCard: {
    borderStyle: 'dashed',
    borderColor: '#315f57',
    backgroundColor: '#f4f8fc'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 6 : 8
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12
  },
  cardTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: 2,
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#315f57',
    includeFontPadding: false,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Platform.OS === 'android' ? 6 : 8,
    borderTopWidth: 1,
    borderTopColor: '#dce8f2'
  },
  stat: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: 'bold',
    color: '#0d2137',
    includeFontPadding: false,
  },
  pendingNumber: {
    color: '#f39c12'
  },
  statLabel: {
    fontSize: Platform.OS === 'android' ? 10 : 11,
    color: '#315f57',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  menuIconContainer: {
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 10 : 11,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(13, 33, 55, 0.42)'
  },
  sidebar: {
    width: 300,
    backgroundColor: '#F7FAFC',
    borderRightWidth: 1,
    borderRightColor: '#d5e2ec'
  },
  staticSidebar: {
    width: 280,
    backgroundColor: '#F7FAFC',
    borderRightWidth: 1,
    borderRightColor: '#d5e2ec',
    height: '100%',
  },
  overlay: {
    flex: 1
  },
  sidebarContainer: {
    flex: 1
  },
  topSafeArea: {
    backgroundColor: '#f4f8fc'
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 24 : 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#dce8f2'
  },
  profileAvatar: {
    width: Platform.OS === 'android' ? 60 : 64,
    height: Platform.OS === 'android' ? 60 : 64,
    borderRadius: Platform.OS === 'android' ? 30 : 32,
    backgroundColor: '#0d2137',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#315f57',
    position: 'relative',
    overflow: 'hidden'
  },
  profileImage: {
    width: Platform.OS === 'android' ? 60 : 64,
    height: Platform.OS === 'android' ? 60 : 64,
    borderRadius: Platform.OS === 'android' ? 30 : 32
  },
  editProfileIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0d2137',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f4f8fc'
  },
  userName: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 17 : 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    includeFontPadding: false,
  },
  userRole: {
    color: '#315f57',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '500',
    marginBottom: 4,
    includeFontPadding: false,
  },
  companyNameSmall: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '500',
    marginBottom: 4,
    includeFontPadding: false,
  },
  systemTitle: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  backupStatus: {
    marginTop: 12,
    alignItems: 'center'
  },
  backupStatusText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  loadingText: {
    color: '#0d2137',
    fontSize: Platform.OS === 'android' ? 11 : 12,
    marginLeft: 8,
    includeFontPadding: false,
  },
  scrollContent: {
    flex: 1
  },
  scrollContentContainer: {
    // paddingBottom removed - applied dynamically with insets
  },
  menuContainer: {
    paddingTop: 8
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: Platform.OS === 'android' ? 13 : 14,
    fontWeight: '600',
    marginLeft: 24,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: Platform.OS === 'android' ? 14 : 16,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
    minHeight: Platform.OS === 'android' ? 48 : 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#cbdbe7'
  },
  disabledMenuItem: {
    opacity: 0.6
  },
  menuText: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    marginLeft: 16,
    fontWeight: '500',
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  chevron: {
    marginLeft: 8
  },
  separator: {
    height: 1,
    backgroundColor: '#dce8f2',
    marginVertical: Platform.OS === 'android' ? 10 : 12,
    marginHorizontal: 24
  },
  submenuContainer: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 2,
    borderLeftColor: '#cbdbe7',
    marginVertical: 4,
    paddingVertical: Platform.OS === 'android' ? 4 : 0,
  },
});
