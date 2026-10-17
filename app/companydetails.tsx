import { useCurrentTime } from './hooks/useCurrentTime';
// app/companydetails.tsx - Android Optimized with Safe Area
// app/companydetails.tsx - Android Optimized with Safe Area
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator, RefreshControl, StatusBar, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hasFarmPermission } from '../shared/permissions';

const { width } = Dimensions.get('window');

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'co-owner' | 'manager' | 'technician' | 'admin' | 'buyer' | 'mechanic';
  status: 'active' | 'pending' | 'inactive';
  joinedDate: string;
  lastActive?: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: 'co-owner' | 'manager' | 'technician' | 'admin' | 'mechanic';
  message?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

type RoleKey = 'owner' | 'co-owner' | 'manager' | 'technician' | 'admin' | 'buyer' | 'mechanic';

export default function CompanyDetailsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, company, getTeamMembers, getCompanyLocationString, getJoinRequests, approveJoinRequest, rejectJoinRequest, removeMember, requestCompanyDeletion, approveCompanyDeletion, cancelCompanyDeletion } = useAuth();
  const canEditCompany = hasFarmPermission(user, 'editCompanySettings', company?.ownerId);
  const canManageTeam = hasFarmPermission(user, 'manageTeam', company?.ownerId);
  const canManageCompanyDeletion = hasFarmPermission(user, 'manageCompanyDeletion', company?.ownerId);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequestsTab, setShowRequestsTab] = useState(false);

  // Role definitions with translations
  const ROLE_DEFINITIONS = useMemo(() => ({
    owner: {
      title: t.companyDetails.farmOwner,
      description: t.companyDetails.fullAccess,
      permissions: [t.companyDetails.allPermissions, t.companyDetails.inviteMembers, t.companyDetails.manageFinances, t.companyDetails.exportData],
      color: '#0d2137',
      icon: 'business' as const,
      maxCount: 1
    },
    'co-owner': {
      title: t.companyDetails.coOwner || 'Co-owner',
      description: t.companyDetails.coOwnerAccess || 'Full access except removing owners and co-owners',
      permissions: [t.companyDetails.allPermissions, t.companyDetails.inviteMembers, t.companyDetails.manageFinances, t.companyDetails.exportData],
      color: '#0F4C75',
      icon: 'shield-checkmark' as const,
      maxCount: 10
    },
    manager: {
      title: t.companyDetails.farmManager,
      description: t.companyDetails.overseeOperations,
      permissions: [t.companyDetails.managePonds, t.companyDetails.viewReports, t.companyDetails.manageHarvest, t.companyDetails.superviseTeam],
      color: '#315f57',
      icon: 'people' as const,
      maxCount: 3
    },
    technician: {
      title: t.companyDetails.aquacultureTechnician,
      description: t.companyDetails.handsOnManagement,
      permissions: [t.companyDetails.addSamplingData, t.companyDetails.monitorWaterQuality, t.companyDetails.recordFeeding, t.companyDetails.basicReports],
      color: '#315f57',
      icon: 'flask' as const,
      maxCount: 10
    },
    mechanic: {
      title: t.companyDetails.mechanic || 'Mechanic',
      description: t.companyDetails.assetMaintenance || 'Maintains farm assets and equipment without editing pond operations.',
      permissions: [
        t.companyDetails.viewPonds || 'View ponds',
        t.companyDetails.viewAssetInventory || 'View asset inventory',
        t.companyDetails.logMaintenance || 'Log maintenance',
        t.companyDetails.updateServiceRecords || 'Update service records',
      ],
      color: '#607D8B',
      icon: 'construct' as const,
      maxCount: 8
    },
    admin: {
      title: t.companyDetails.systemAdministrator,
      description: t.companyDetails.technicalSupport,
      permissions: [t.companyDetails.userManagement, t.companyDetails.systemSettings, t.companyDetails.troubleshoot, t.companyDetails.dataBackup],
      color: '#315f57',
      icon: 'settings' as const,
      maxCount: 2
    },
    buyer: {
      title: 'Buyer',
      description: 'Purchasing and procurement',
      permissions: ['View harvests'],
      color: '#27ae60',
      icon: 'cart' as const,
      maxCount: 5
    }
  }), [t]);

  const filledRoles = useMemo(() => 
    teamMembers.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [teamMembers]
  );

  const loadData = useCallback(async () => {
    try {
      if (getTeamMembers) {
        try {
          const members = await getTeamMembers();
          setTeamMembers(members);
        } catch (memberError: any) {
          console.error('Error loading team members:', memberError);
          setTeamMembers([]);
        }
      } else {
        setTeamMembers([]);
      }
      
      if (canManageTeam && getJoinRequests) {
        try {
          const requests = await getJoinRequests();
          const pending = requests.filter(r => r.status === 'pending');
          setJoinRequests(pending);
        } catch (requestError: any) {
          console.error('Error loading join requests:', requestError);
          setJoinRequests([]);
        }
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
    }
  }, [canManageTeam, company?.id, company?.teamMembers, getTeamMembers, getJoinRequests]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleApproveRequest = useCallback(async (request: JoinRequest) => {
    const currentCount = filledRoles[request.requestedRole] || 0;
    const maxCount = ROLE_DEFINITIONS[request.requestedRole].maxCount;
    
    if (currentCount >= maxCount) {
      Alert.alert(
        t.companyDetails.roleLimit,
        `${t.companyDetails.roleLimitReached} ${ROLE_DEFINITIONS[request.requestedRole].title}s (${maxCount}) ${t.companyDetails.maxReached}`
      );
      return;
    }

    Alert.alert(
      t.companyDetails.approveRequest,
      `${t.companyDetails.approve} ${request.userName} as ${ROLE_DEFINITIONS[request.requestedRole].title}?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.companyDetails.approve,
          onPress: async () => {
            try {
              setLoading(true);
              
              if (approveJoinRequest) {
                await approveJoinRequest(request.id);
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              await loadData();
              
              Alert.alert(t.messages.success, `${request.userName} ${t.companyDetails.hasBeenAdded}`);
              setShowRequestModal(false);
            } catch (error: any) {
              console.error('Failed to approve request:', error);
              Alert.alert(t.messages.error, 'Failed to approve request. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [approveJoinRequest, loadData, filledRoles, ROLE_DEFINITIONS, t]);

  const handleRejectRequest = useCallback(async (request: JoinRequest) => {
    Alert.alert(
      t.companyDetails.rejectRequest,
      `${t.companyDetails.reject} ${request.userName}'s request?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.companyDetails.reject,
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (rejectJoinRequest) await rejectJoinRequest(request.id);
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              await loadData();
              
              Alert.alert(t.companyDetails.reject, t.companyDetails.requestRejected);
              setShowRequestModal(false);
            } catch (error: any) {
              console.error('Failed to reject request:', error);
              Alert.alert(t.messages.error, 'Failed to reject request. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [rejectJoinRequest, loadData, t]);

  const handleRemoveMember = useCallback(async (member: TeamMember) => {
    if (member.role === 'owner' || member.role === 'co-owner') {
      Alert.alert(t.messages.error, t.companyDetails.cannotRemoveOwner);
      return;
    }

    Alert.alert(
      t.companyDetails.removeMember,
      `${t.companyDetails.remove} ${member.name}?`,
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: t.companyDetails.remove,
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              if (removeMember) {
                await removeMember(member.id);
              }
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              await loadData();
              
              Alert.alert(t.messages.success, `${member.name} ${t.companyDetails.removed}`);
            } catch (error: any) {
              console.error('Failed to remove member:', error);
              Alert.alert(t.messages.error, 'Failed to remove member. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [removeMember, loadData, t]);

  const handleRequestCompanyDeletion = useCallback(async () => {
    Alert.alert(
      'Delete Company',
      'Deleting this company requires approval from all owners and co-owners. Once all approve, the company and all its data will be permanently deleted.\n\nDo you want to initiate a deletion request?',
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: 'Request Deletion',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (requestCompanyDeletion) {
                const res = await requestCompanyDeletion();
                if (res.status === 'deleted') {
                  Alert.alert('Company Deleted', 'The company has been permanently deleted.');
                  router.replace('/roleselection');
                } else {
                  Alert.alert('Deletion Requested', 'A deletion request has been created. All owners and co-owners must approve before the company is deleted.');
                  await loadData();
                }
              }
            } catch (error: any) {
              console.error('Failed to request deletion:', error);
              Alert.alert(t.messages.error, error?.message || 'Failed to request company deletion.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [requestCompanyDeletion, loadData, router, t]);

  const handleApproveCompanyDeletion = useCallback(async () => {
    Alert.alert(
      'Approve Company Deletion',
      'Are you sure you want to approve deleting this company? This action cannot be undone once all owners and co-owners approve.',
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: 'Approve Deletion',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (approveCompanyDeletion) {
                const res = await approveCompanyDeletion();
                if (res.status === 'deleted') {
                  Alert.alert('Company Deleted', 'All owners approved and the company has been permanently deleted.');
                  router.replace('/roleselection');
                } else {
                  Alert.alert('Approval Recorded', `Your approval has been recorded (${res.approvedCount || 0}/${res.totalRequired || 0} approved).`);
                  await loadData();
                }
              }
            } catch (error: any) {
              console.error('Failed to approve deletion:', error);
              Alert.alert(t.messages.error, error?.message || 'Failed to approve company deletion.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [approveCompanyDeletion, loadData, router, t]);

  const handleCancelCompanyDeletion = useCallback(async () => {
    Alert.alert(
      'Cancel Deletion Request',
      'Are you sure you want to cancel the pending company deletion request?',
      [
        { text: t.actions.cancel, style: 'cancel' },
        {
          text: 'Cancel Request',
          onPress: async () => {
            try {
              setLoading(true);
              if (cancelCompanyDeletion) {
                await cancelCompanyDeletion();
                Alert.alert('Cancelled', 'Company deletion request has been cancelled.');
                await loadData();
              }
            } catch (error: any) {
              console.error('Failed to cancel deletion:', error);
              Alert.alert(t.messages.error, error?.message || 'Failed to cancel deletion request.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [cancelCompanyDeletion, loadData, t]);

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
            <Ionicons name="arrow-back" size={Platform.OS === 'android' ? 22 : 24} color="#0d2137" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.companyDetails.title}</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#0d2137" />
            ) : (
              <Ionicons name="refresh" size={Platform.OS === 'android' ? 22 : 24} color="#0d2137" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0d2137']} />
        }
      >
        {/* Company Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={Platform.OS === 'android' ? 20 : 24} color="#0d2137" />
            <Text style={styles.cardTitle}>{t.companyDetails.companyInformation}</Text>
            {canEditCompany && <TouchableOpacity style={styles.editButton} onPress={() => router.push('/company-setup2?edit=true' as any)}>
              <Ionicons name="pencil-outline" size={Platform.OS === 'android' ? 16 : 18} color="#315f57" />
            </TouchableOpacity>}
          </View>
          
          <View style={styles.infoGrid}>
            <InfoItem label={t.companyDetails.companyName} value={company?.companyName || t.companyDetails.notSet} />
            <InfoItem label={t.companyDetails.location} value={getCompanyLocationString() || t.companyDetails.notSet} />
            <InfoItem label={t.companyDetails.farmType} value={company?.farmType || t.companyDetails.notSpecified} />
          </View>
          
          {company?.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.infoLabel}>{t.companyDetails.description}</Text>
              <Text style={styles.description}>{company.description}</Text>
            </View>
          )}
        </View>

        {/* Join Requests Section */}
        {canManageTeam && joinRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <TouchableOpacity style={styles.requestsHeader} onPress={() => setShowRequestsTab(!showRequestsTab)}>
              <View style={styles.requestsHeaderLeft}>
                <Ionicons name="mail" size={Platform.OS === 'android' ? 18 : 20} color="#0d2137" />
                <Text style={styles.requestsHeaderText}>{t.companyDetails.joinRequests} ({joinRequests.length})</Text>
              </View>
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>{joinRequests.length}</Text>
              </View>
              <Ionicons name={showRequestsTab ? 'chevron-up' : 'chevron-down'} size={Platform.OS === 'android' ? 18 : 20} color="#315f57" />
            </TouchableOpacity>

            {showRequestsTab && (
              <View style={styles.requestsList}>
                {joinRequests.map((request) => (
                  <TouchableOpacity
                    key={request.id}
                    style={styles.requestCard}
                    onPress={() => {
                      setSelectedRequest(request);
                      setShowRequestModal(true);
                    }}
                  >
                    <View style={styles.requestHeader}>
                      <View style={styles.requestUserInfo}>
                        <Text style={styles.requestUserName}>{request.userName}</Text>
                        <Text style={styles.requestUserEmail}>{request.userEmail}</Text>
                      </View>
                      <View style={[styles.requestRoleBadge, { backgroundColor: ROLE_DEFINITIONS[request.requestedRole].color }]}>
                        <Text style={styles.requestRoleBadgeText}>{ROLE_DEFINITIONS[request.requestedRole].title}</Text>
                      </View>
                    </View>
                    {request.message && <Text style={styles.requestMessage} numberOfLines={2}>{request.message}</Text>}
                    <Text style={styles.requestTime}>{new Date(request.requestedAt).toLocaleDateString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Organization Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={Platform.OS === 'android' ? 20 : 24} color="#0d2137" />
            <Text style={styles.cardTitle}>{t.companyDetails.organizationStructure}</Text>
            <View style={styles.teamStats}>
              <Text style={styles.teamCount}>{teamMembers.length} {t.companyDetails.members}</Text>
            </View>
          </View>

          {loading && teamMembers.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0d2137" />
              <Text style={styles.loadingText}>{t.companyDetails.loadingTeam}</Text>
            </View>
          ) : (
            <>
              {Object.entries(ROLE_DEFINITIONS).map(([roleKey, role]) => {
                const filled = filledRoles[roleKey] || 0;
                const roleMembers = teamMembers.filter(member => member.role === roleKey);
                
                return (
                  <RoleCard
                    key={roleKey}
                    roleKey={roleKey as RoleKey}
                    role={role}
                    filled={filled}
                    members={roleMembers}
                    onRemoveMember={handleRemoveMember}
                    isOwner={canManageTeam}
                    t={t}
                  />
                );
              })}
            </>
          )}
        </View>

        {/* Deletion Request Banner / Card */}
        {company?.deletionRequest?.status === 'pending' && (
          <View style={styles.deletionBanner}>
            <View style={styles.deletionBannerHeader}>
              <Ionicons name="warning" size={22} color="#e74c3c" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.deletionBannerTitle}>Company Deletion Requested</Text>
                <Text style={styles.deletionBannerSubtitle}>
                  Requested by {company.deletionRequest.requestedByName || 'an owner'}. All owners and co-owners must approve before the company is deleted.
                </Text>
              </View>
            </View>

            <View style={styles.deletionProgressContainer}>
              <Text style={styles.deletionProgressText}>
                Approvals: {company.deletionRequest.approvedByIds?.length || 0} / {company.deletionRequest.requiredApproverIds?.length || 0} owners & co-owners
              </Text>
            </View>

            <View style={styles.deletionActionsRow}>
              {canManageCompanyDeletion && !company.deletionRequest.approvedByIds?.includes(user?.uid || '') && (
                <TouchableOpacity
                  style={styles.deletionApproveBtn}
                  onPress={handleApproveCompanyDeletion}
                  disabled={loading}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.deletionApproveBtnText}>Approve Deletion</Text>
                </TouchableOpacity>
              )}
              {canManageCompanyDeletion && (
                <TouchableOpacity
                  style={styles.deletionCancelBtn}
                  onPress={handleCancelCompanyDeletion}
                  disabled={loading}
                >
                  <Text style={styles.deletionCancelBtnText}>Cancel Request</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Danger Zone: Delete Company for Owners & Co-owners */}
        {canManageCompanyDeletion && company?.deletionRequest?.status !== 'pending' && (
          <View style={styles.dangerZoneCard}>
            <View style={styles.dangerZoneHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#e74c3c" />
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerZoneDesc}>
              Permanently delete this company and all associated records. Requires approval from all owners and co-owners.
            </Text>
            <TouchableOpacity
              style={styles.dangerZoneDeleteBtn}
              onPress={handleRequestCompanyDeletion}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
              <Text style={styles.dangerZoneDeleteBtnText}>Delete Company</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Request Modal */}
      {selectedRequest && (
        <Modal visible={showRequestModal} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.companyDetails.joinRequestDetails}</Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                  <Ionicons name="close" size={Platform.OS === 'android' ? 22 : 24} color="#dce8f2" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.requestDetailCard}>
                  <Text style={styles.requestDetailLabel}>{t.companyDetails.applicant}</Text>
                  <Text style={styles.requestDetailName}>{selectedRequest.userName}</Text>
                  <Text style={styles.requestDetailEmail}>{selectedRequest.userEmail}</Text>
                </View>

                <View style={styles.requestDetailCard}>
                  <Text style={styles.requestDetailLabel}>{t.companyDetails.requestedRole}</Text>
                  <View style={styles.requestDetailRole}>
                    <Ionicons name={ROLE_DEFINITIONS[selectedRequest.requestedRole].icon} size={Platform.OS === 'android' ? 18 : 20} color={ROLE_DEFINITIONS[selectedRequest.requestedRole].color} />
                    <Text style={styles.requestDetailRoleText}>{ROLE_DEFINITIONS[selectedRequest.requestedRole].title}</Text>
                  </View>
                  <Text style={styles.requestDetailDescription}>{ROLE_DEFINITIONS[selectedRequest.requestedRole].description}</Text>
                </View>

                {selectedRequest.message && (
                  <View style={styles.requestDetailCard}>
                    <Text style={styles.requestDetailLabel}>{t.companyDetails.message}</Text>
                    <Text style={styles.requestDetailMessage}>{selectedRequest.message}</Text>
                  </View>
                )}

                <View style={styles.requestDetailCard}>
                  <Text style={styles.requestDetailLabel}>{t.companyDetails.permissions}</Text>
                  {ROLE_DEFINITIONS[selectedRequest.requestedRole].permissions.map((permission, index) => (
                    <View key={index} style={styles.permissionItemModal}>
                      <Ionicons name="checkmark-circle" size={Platform.OS === 'android' ? 14 : 16} color="#27ae60" />
                      <Text style={styles.permissionText}>{permission}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.requestDetailCard}>
                  <Text style={styles.requestDetailLabel}>{t.companyDetails.currentTeamStatus}</Text>
                  <Text style={styles.teamStatusText}>
                    {filledRoles[selectedRequest.requestedRole] || 0} / {ROLE_DEFINITIONS[selectedRequest.requestedRole].maxCount} {ROLE_DEFINITIONS[selectedRequest.requestedRole].title}s
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.rejectButton} onPress={() => handleRejectRequest(selectedRequest)} disabled={loading}>
                  {loading ? <ActivityIndicator color="#e74c3c" size="small" /> : (
                    <>
                      <Ionicons name="close-circle-outline" size={Platform.OS === 'android' ? 16 : 18} color="#e74c3c" />
                      <Text style={styles.rejectButtonText}>{t.companyDetails.reject}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveRequest(selectedRequest)} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={Platform.OS === 'android' ? 16 : 18} color="#fff" />
                      <Text style={styles.approveButtonText}>{t.companyDetails.approve}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// Helper Components
const InfoItem = React.memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));
InfoItem.displayName = 'InfoItem';

const MemberItem = React.memo(({ member, onRemove, isOwner, t }: { member: TeamMember; onRemove: (member: TeamMember) => void; isOwner: boolean; t: any }) => {
  const nowMs = useCurrentTime();
  const formatLastActive = (lastActive?: string | any) => {
    if (!lastActive) return t.companyDetails.recentlyActive;
    
    try {
      if (typeof lastActive === 'object' && lastActive.toDate) {
        const date = lastActive.toDate();
        const diffMs = nowMs - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return t.companyDetails.justNow;
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
      }
      
      if (typeof lastActive === 'string') {
        if (lastActive.includes('Timestamp')) return t.companyDetails.recentlyActive;
        
        const date = new Date(lastActive);
        if (isNaN(date.getTime())) return t.companyDetails.recentlyActive;
        
        const diffMs = nowMs - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return t.companyDetails.justNow;
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
      }
      
      return t.companyDetails.recentlyActive;
    } catch {
      return t.companyDetails.recentlyActive;
    }
  };

  return (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <View style={[styles.memberStatus, { backgroundColor: member.status === 'active' ? '#27ae60' : member.status === 'pending' ? '#f39c12' : '#e74c3c' }]} />
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberEmail}>{member.email}</Text>
        </View>
      </View>
      <View style={styles.memberActions}>
        <Text style={styles.memberJoinDate}>
          {member.status === 'pending' ? t.companyDetails.invited : formatLastActive(member.lastActive) || `${t.companyDetails.joined} ${new Date(member.joinedDate).toLocaleDateString()}`}
        </Text>
        {isOwner && member.role !== 'owner' && member.role !== 'co-owner' && (
          <TouchableOpacity style={styles.removeMemberButton} onPress={() => onRemove(member)}>
            <Ionicons name="trash-outline" size={Platform.OS === 'android' ? 14 : 16} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});
MemberItem.displayName = 'MemberItem';

const RoleCard = React.memo(({ roleKey, role, filled, members, onRemoveMember, isOwner, t }: { roleKey: RoleKey; role: any; filled: number; members: TeamMember[]; onRemoveMember: (member: TeamMember) => void; isOwner: boolean; t: any }) => (
  <View style={styles.roleCard}>
    <View style={styles.roleHeader}>
      <View style={styles.roleIconContainer}>
        <Ionicons name={role.icon} size={Platform.OS === 'android' ? 18 : 20} color={role.color} />
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleTitle}>{role.title}</Text>
        <Text style={styles.roleDescription}>{role.description}</Text>
      </View>
      <View style={styles.roleStatus}>
        <Text style={[styles.roleCount, { color: filled > 0 ? '#27ae60' : '#e74c3c' }]}>{filled}/{role.maxCount}</Text>
      </View>
    </View>

    {members.length > 0 ? (
      members.map(member => <MemberItem key={member.id} member={member} onRemove={onRemoveMember} isOwner={isOwner} t={t} />)
    ) : (
      <View style={styles.emptyRole}>
        <Text style={styles.emptyRoleText}>{t.companyDetails.noMembersYet.replace('{role}', role.title)}</Text>
      </View>
    )}

    <View style={styles.permissionsContainer}>
      <Text style={styles.permissionsTitle}>{t.companyDetails.keyResponsibilities}</Text>
      <View style={styles.permissionsList}>
        {role.permissions.map((permission: string, index: number) => (
          <Text key={index} style={styles.permissionItem}>• {permission}</Text>
        ))}
      </View>
    </View>
  </View>
));
RoleCard.displayName = 'RoleCard';

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
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
  backButton: { padding: Platform.OS === 'android' ? 6 : 8 },
  refreshButton: { padding: Platform.OS === 'android' ? 6 : 8 },
  headerTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  scrollView: { flex: 1 },
  scrollContent: { padding: Platform.OS === 'android' ? 16 : 20, paddingBottom: Platform.OS === 'android' ? 32 : 40 },
  loadingContainer: { padding: Platform.OS === 'android' ? 32 : 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Platform.OS === 'android' ? 10 : 12, fontSize: Platform.OS === 'android' ? 13 : 14, color: '#315f57' },
  card: { backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 16 : 20, marginBottom: Platform.OS === 'android' ? 16 : 20, borderWidth: 1, borderColor: '#e8f2f9', shadowColor: '#315f57', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 16 : 20 },
  cardTitle: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 8 : 10, flex: 1 },
  editButton: { padding: Platform.OS === 'android' ? 6 : 8, backgroundColor: 'rgba(50, 130, 184, 0.1)', borderRadius: Platform.OS === 'android' ? 6 : 8 },
  infoGrid: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  infoItem: { marginBottom: Platform.OS === 'android' ? 14 : 16 },
  infoLabel: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#315f57', marginBottom: 4, textTransform: 'uppercase' },
  infoValue: { fontSize: Platform.OS === 'android' ? 14 : 16, color: '#0d2137', fontWeight: '500' },
  descriptionContainer: { marginTop: Platform.OS === 'android' ? 6 : 8, paddingTop: Platform.OS === 'android' ? 14 : 16, borderTopWidth: 1, borderTopColor: '#dce8f2' },
  description: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#0d2137', lineHeight: Platform.OS === 'android' ? 18 : 20 },
  teamStats: { backgroundColor: '#F0F7FF', paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 5 : 6, borderRadius: Platform.OS === 'android' ? 10 : 12 },
  teamCount: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#0d2137' },
  requestsSection: { backgroundColor: '#FFF9E6', borderRadius: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 16 : 20, borderWidth: 2, borderColor: '#f39c12', overflow: 'hidden' },
  requestsHeader: { flexDirection: 'row', alignItems: 'center', padding: Platform.OS === 'android' ? 14 : 16 },
  requestsHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  requestsHeaderText: { fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 6 : 8 },
  requestsBadge: { backgroundColor: '#f39c12', borderRadius: Platform.OS === 'android' ? 10 : 12, paddingHorizontal: Platform.OS === 'android' ? 7 : 8, paddingVertical: 4, marginRight: Platform.OS === 'android' ? 6 : 8 },
  requestsBadgeText: { color: '#fff', fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: 'bold' },
  requestsList: { padding: Platform.OS === 'android' ? 14 : 16, paddingTop: 0 },
  requestCard: { backgroundColor: '#fff', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#e8f2f9' },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Platform.OS === 'android' ? 6 : 8 },
  requestUserInfo: { flex: 1 },
  requestUserName: { fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: 2 },
  requestUserEmail: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#315f57' },
  requestRoleBadge: { paddingHorizontal: Platform.OS === 'android' ? 10 : 12, paddingVertical: Platform.OS === 'android' ? 5 : 6, borderRadius: Platform.OS === 'android' ? 6 : 8 },
  requestRoleBadgeText: { color: '#fff', fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600' },
  requestMessage: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#0d2137', marginTop: Platform.OS === 'android' ? 6 : 8, fontStyle: 'italic' },
  requestTime: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57', marginTop: Platform.OS === 'android' ? 6 : 8 },
  roleCard: { backgroundColor: '#f4f8fc', borderRadius: Platform.OS === 'android' ? 10 : 12, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 14 : 16, borderWidth: 1, borderColor: '#E2E8F0' },
  roleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 10 : 12 },
  roleIconContainer: { width: Platform.OS === 'android' ? 32 : 36, height: Platform.OS === 'android' ? 32 : 36, borderRadius: Platform.OS === 'android' ? 16 : 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#e8f2f9' },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: 'bold', color: '#0d2137', marginBottom: 2 },
  roleDescription: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57' },
  roleStatus: { alignItems: 'center' },
  roleCount: { fontSize: Platform.OS === 'android' ? 13 : 14, fontWeight: 'bold' },
  emptyRole: { padding: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 6 : 8, marginBottom: Platform.OS === 'android' ? 6 : 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyRoleText: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#dce8f2', fontStyle: 'italic' },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: Platform.OS === 'android' ? 10 : 12, borderRadius: Platform.OS === 'android' ? 6 : 8, marginBottom: Platform.OS === 'android' ? 6 : 8, borderWidth: 1, borderColor: '#e8f2f9' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  memberStatus: { width: Platform.OS === 'android' ? 7 : 8, height: Platform.OS === 'android' ? 7 : 8, borderRadius: 4, marginRight: Platform.OS === 'android' ? 10 : 12 },
  memberDetails: { flex: 1 },
  memberName: { fontSize: Platform.OS === 'android' ? 13 : 14, color: '#0d2137', fontWeight: '600', marginBottom: 2 },
  memberEmail: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57' },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'android' ? 10 : 12 },
  memberJoinDate: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#315f57' },
  removeMemberButton: { padding: Platform.OS === 'android' ? 5 : 6, backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: Platform.OS === 'android' ? 5 : 6 },
  permissionsContainer: { marginTop: Platform.OS === 'android' ? 6 : 8, paddingTop: Platform.OS === 'android' ? 10 : 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  permissionsTitle: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#315f57', marginBottom: Platform.OS === 'android' ? 5 : 6, textTransform: 'uppercase' },
  permissionsList: { marginLeft: Platform.OS === 'android' ? 6 : 8 },
  permissionItem: { fontSize: Platform.OS === 'android' ? 11 : 12, color: '#0d2137', marginBottom: 2 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(15, 76, 117, 0.8)', justifyContent: 'center', padding: Platform.OS === 'android' ? 16 : 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 18 : 20, maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Platform.OS === 'android' ? 16 : 20, borderBottomWidth: 1, borderBottomColor: '#dce8f2' },
  modalTitle: { fontSize: Platform.OS === 'android' ? 18 : 20, fontWeight: 'bold', color: '#0d2137' },
  modalBody: { maxHeight: Platform.OS === 'android' ? 450 : 500, padding: Platform.OS === 'android' ? 16 : 20 },
  requestDetailCard: { marginBottom: Platform.OS === 'android' ? 16 : 20, padding: Platform.OS === 'android' ? 14 : 16, backgroundColor: '#f4f8fc', borderRadius: Platform.OS === 'android' ? 10 : 12, borderWidth: 1, borderColor: '#e8f2f9' },
  requestDetailLabel: { fontSize: Platform.OS === 'android' ? 11 : 12, fontWeight: '600', color: '#315f57', marginBottom: Platform.OS === 'android' ? 6 : 8, textTransform: 'uppercase' },
  requestDetailName: { fontSize: Platform.OS === 'android' ? 16 : 18, fontWeight: 'bold', color: '#0d2137', marginBottom: 4 },
  requestDetailEmail: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#315f57' },
  requestDetailRole: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 6 : 8 },
  requestDetailRoleText: { fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: 'bold', color: '#0d2137', marginLeft: Platform.OS === 'android' ? 6 : 8 },
  requestDetailDescription: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#315f57' },
  requestDetailMessage: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#0d2137', lineHeight: Platform.OS === 'android' ? 18 : 20 },
  teamStatusText: { fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: '600', color: '#0d2137' },
  permissionItemModal: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 6 : 8 },
  permissionText: { fontSize: Platform.OS === 'android' ? 12 : 14, color: '#0d2137', marginLeft: Platform.OS === 'android' ? 6 : 8, flex: 1 },
  modalFooter: { flexDirection: 'row', padding: Platform.OS === 'android' ? 16 : 20, borderTopWidth: 1, borderTopColor: '#dce8f2', gap: Platform.OS === 'android' ? 10 : 12 },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#e74c3c', gap: Platform.OS === 'android' ? 5 : 6 },
  rejectButtonText: { color: '#e74c3c', fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: '600' },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Platform.OS === 'android' ? 12 : 14, borderRadius: Platform.OS === 'android' ? 10 : 12, backgroundColor: '#27ae60', gap: Platform.OS === 'android' ? 5 : 6 },
  approveButtonText: { color: '#FFFFFF', fontSize: Platform.OS === 'android' ? 14 : 16, fontWeight: '600' },
  deletionBanner: { backgroundColor: '#FFF5F5', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 14 : 16, marginBottom: Platform.OS === 'android' ? 16 : 20, borderWidth: 2, borderColor: '#e74c3c' },
  deletionBannerHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  deletionBannerTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#e74c3c' },
  deletionBannerSubtitle: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#0d2137', marginTop: 3, lineHeight: 18 },
  deletionProgressContainer: { backgroundColor: '#FFEAEA', borderRadius: 8, padding: 8, marginTop: 10, alignItems: 'center' },
  deletionProgressText: { fontSize: Platform.OS === 'android' ? 12 : 13, fontWeight: '600', color: '#e74c3c' },
  deletionActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  deletionApproveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 10, gap: 6 },
  deletionApproveBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  deletionCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 10 },
  deletionCancelBtnText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  dangerZoneCard: { backgroundColor: '#FFFFFF', borderRadius: Platform.OS === 'android' ? 14 : 16, padding: Platform.OS === 'android' ? 16 : 18, marginBottom: Platform.OS === 'android' ? 16 : 20, borderWidth: 1, borderColor: '#FECDCA' },
  dangerZoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dangerZoneTitle: { fontSize: Platform.OS === 'android' ? 15 : 16, fontWeight: 'bold', color: '#e74c3c' },
  dangerZoneDesc: { fontSize: Platform.OS === 'android' ? 12 : 13, color: '#64748b', lineHeight: 18, marginBottom: 12 },
  dangerZoneDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#e74c3c', borderRadius: 10, paddingVertical: 11, backgroundColor: '#FFF5F5' },
  dangerZoneDeleteBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
});
