// app/roleselection.tsx - Updated with translations
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import OnboardingProgress from './components/onboarding/OnboardingProgress';

interface RoleOption {
  id: 'owner' | 'co-owner' | 'technician' | 'manager' | 'admin' | 'buyer' | 'mechanic';
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  requiresCompany: boolean;
}

export default function RoleSelectionScreen() {
  const { completeRoleSelection, user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles: RoleOption[] = [
    {
      id: 'owner',
      title: t.roleSelection.farmOwner,
      description: t.roleSelection.farmOwnerDesc,
      icon: 'business-outline',
      color: '#0d2137',
      features: [
        t.roleSelection.ownerFeature1,
        t.roleSelection.ownerFeature2,
        t.roleSelection.ownerFeature3,
        t.roleSelection.ownerFeature4,
      ],
      requiresCompany: false
    },
    {
      id: 'co-owner',
      title: t.roleSelection.coOwner || 'Co-owner',
      description: t.roleSelection.coOwnerDesc || 'I co-own or jointly manage a shrimp farm',
      icon: 'shield-checkmark-outline',
      color: '#0F4C75',
      features: [
        t.roleSelection.coOwnerFeature1 || 'Join an existing company',
        t.roleSelection.coOwnerFeature2 || 'Approve team member requests',
        t.roleSelection.coOwnerFeature3 || 'Access operations and finance',
        t.roleSelection.coOwnerFeature4 || 'Edit company profile details',
      ],
      requiresCompany: true
    },
    {
      id: 'technician',
      title: t.roleSelection.aquacultureTechnician,
      description: t.roleSelection.technicianDesc,
      icon: 'flask-outline',
      color: '#315f57',
      features: [
        t.roleSelection.technicianFeature1,
        t.roleSelection.technicianFeature2,
        t.roleSelection.technicianFeature3,
        t.roleSelection.technicianFeature4,
      ],
      requiresCompany: true
    },
    {
      id: 'mechanic',
      title: t.roleSelection.mechanic || 'Mechanic',
      description: t.roleSelection.mechanicDesc || 'I maintain farm assets and equipment',
      icon: 'construct-outline',
      color: '#607D8B',
      features: [
        t.roleSelection.mechanicFeature1 || 'Join existing companies',
        t.roleSelection.mechanicFeature2 || 'View pond status',
        t.roleSelection.mechanicFeature3 || 'Log asset maintenance',
        t.roleSelection.mechanicFeature4 || 'Update equipment service records',
      ],
      requiresCompany: true
    },
    {
      id: 'manager',
      title: t.roleSelection.manager,
      description: t.roleSelection.managerDesc,
      icon: 'people-outline',
      color: '#dce8f2',
      features: [
        t.roleSelection.managerFeature1,
        t.roleSelection.managerFeature2,
        t.roleSelection.managerFeature3,
        t.roleSelection.managerFeature4,
      ],
      requiresCompany: true
    },
    {
      id: 'buyer',
      title: t.roleSelection.shrimpBuyer,
      description: t.roleSelection.buyerDesc,
      icon: 'cart-outline',
      color: '#27AE60',
      features: [
        t.roleSelection.buyerFeature1,
        t.roleSelection.buyerFeature2,
        t.roleSelection.buyerFeature3,
        t.roleSelection.buyerFeature4,
      ],
      requiresCompany: false
    },
    {
      id: 'admin',
      title: t.roleSelection.administrator,
      description: t.roleSelection.adminDesc,
      icon: 'shield-checkmark-outline',
      color: '#0d2137',
      features: [
        t.roleSelection.adminFeature1,
        t.roleSelection.adminFeature2,
        t.roleSelection.adminFeature3,
        t.roleSelection.adminFeature4,
      ],
      requiresCompany: true
    }
  ];

  const handleRoleSelect = async (role: RoleOption) => {
    if (loading) return;
    setSelectedRole(role.id);
    setLoading(true);
    console.log('Role selection started:', role.id);

    try {
      // If buyer role is selected, navigate to buyer setup
      if (role.id === 'buyer') {
        await completeRoleSelection(role.id);
        console.log('Buyer role set, navigating to setup');
        router.push('/buyersetup');
        return;
      }

      // If role requires company (technician, mechanic, manager, admin), navigate to company search
      if (role.requiresCompany) {
        await completeRoleSelection(role.id);
        console.log(`${role.title} role set, navigating to company search`);
        Alert.alert(
          t.roleSelection.findYourCompany,
          `${t.roleSelection.asA} ${role.title}, ${t.roleSelection.needToJoin}`,
          [
            {
              text: t.roleSelection.searchCompanies,
              onPress: () => router.push('/companysearch'),
            }
          ]
        );
        return;
      }

      // For owner role, continue with normal setup flow (create company)
      const roleSelectionPromise = completeRoleSelection(role.id);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Role selection timeout')), 15000)
      );

      await Promise.race([roleSelectionPromise, timeoutPromise]);
      console.log('Owner role selection completed, will navigate to company setup');
    } catch (error: any) {
      console.error('Role selection failed:', error);
      Alert.alert(
        t.messages.error,
        t.roleSelection.failedToSetup,
        [
          { text: 'OK', onPress: () => {
            setSelectedRole(null);
            setLoading(false);
          }}
        ]
      );
      return;
    }

    setSelectedRole(null);
    setLoading(false);
  };

  const RoleCard = ({ role }: { role: RoleOption }) => (
    <TouchableOpacity
      style={[
        styles.roleCard,
        selectedRole === role.id && styles.roleCardSelected
      ]}
      onPress={() => handleRoleSelect(role)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={styles.roleHeader}>
        <View style={[styles.roleIcon, { backgroundColor: role.color }]}>
          <Ionicons name={role.icon as any} size={28} color="#fff" />
        </View>
        <View style={styles.roleInfo}>
          <Text style={styles.roleTitle}>{role.title}</Text>
          <Text style={styles.roleDescription}>{role.description}</Text>
        </View>
        {selectedRole === role.id && loading && (
          <ActivityIndicator color={role.color} size="small" />
        )}
      </View>

      <View style={styles.featuresContainer}>
        {role.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={role.color} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {role.requiresCompany && (
        <View style={styles.companyRequiredBadge}>
          <Ionicons name="search" size={14} color="#f39c12" />
          <Text style={styles.companyRequiredText}>{t.roleSelection.joinExistingCompany}</Text>
        </View>
      )}

      <View style={[styles.selectButton, { backgroundColor: role.color }]}>
        <Text style={styles.selectButtonText}>
          {selectedRole === role.id && loading ? t.roleSelection.settingUp : `${t.roleSelection.continueAs} ${role.title}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress
          percent={25}
          title={t.onboardingProgress.role}
          detail={t.onboardingProgress.roleDetail}
        />
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/Shrimply2Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{t.roleSelection.welcomeTitle}</Text>
          <Text style={styles.subtitle}>{t.roleSelection.welcomeSubtitle}</Text>
          
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15 }} 
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
            <Text style={{ color: '#e74c3c', marginLeft: 5, fontWeight: '600' }}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {roles.map(role => (
            <RoleCard key={role.id} role={role} />
          ))}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>{t.roleSelection.needHelp}</Text>
          <Text style={styles.helpText}>
            • <Text style={styles.helpBold}>{t.roleSelection.farmOwner}:</Text> {t.roleSelection.helpOwner}{'\n'}
            • <Text style={styles.helpBold}>{t.roleSelection.helpTechManagerAdmin}:</Text> {t.roleSelection.helpTechDesc}{'\n'}
            • <Text style={styles.helpBold}>{t.roleSelection.shrimpBuyer}:</Text> {t.roleSelection.helpBuyerDesc}{'\n\n'}
            {t.roleSelection.helpFooter}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8fc',
  },
  scrollContent: {
    padding: Platform.OS === 'android' ? 18 : 20,
    paddingTop: Platform.OS === 'android' ? 36 : 40,
    paddingBottom: Platform.OS === 'android' ? 36 : 40,
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 36 : 40,
  },
  logoContainer: {
    width: Platform.OS === 'android' ? 140 : 160,
    height: Platform.OS === 'android' ? 140 : 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 12 : 15,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: Platform.OS === 'android' ? 28 : 32,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: Platform.OS === 'android' ? 6 : 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    color: '#315f57',
    textAlign: 'center',
    marginHorizontal: Platform.OS === 'android' ? 18 : 20,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
    fontWeight: '500',
  },
  // Role cards
  rolesContainer: {
    gap: Platform.OS === 'android' ? 18 : 20,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 14 : 16,
    padding: Platform.OS === 'android' ? 18 : 20,
    borderWidth: 2,
    borderColor: '#e8f2f9',
    shadowColor: '#315f57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: '#0d2137',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
  },
  roleIcon: {
    width: Platform.OS === 'android' ? 52 : 56,
    height: Platform.OS === 'android' ? 52 : 56,
    borderRadius: Platform.OS === 'android' ? 26 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 14 : 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: Platform.OS === 'android' ? 17 : 18,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#315f57',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  // Features
  featuresContainer: {
    marginBottom: Platform.OS === 'android' ? 14 : 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 7 : 8,
  },
  featureText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#0d2137',
    marginLeft: Platform.OS === 'android' ? 7 : 8,
    flex: 1,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  // Company required badge
  companyRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: Platform.OS === 'android' ? 7 : 8,
    paddingHorizontal: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 7 : 8,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  companyRequiredText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: '#f39c12',
    marginLeft: Platform.OS === 'android' ? 5 : 6,
  },
  // Select button
  selectButton: {
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
  },
  // Help section
  helpSection: {
    marginTop: Platform.OS === 'android' ? 36 : 40,
    padding: Platform.OS === 'android' ? 18 : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: '#e8f2f9',
  },
  helpTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: Platform.OS === 'android' ? 7 : 8,
  },
  helpText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#315f57',
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  helpBold: {
    fontWeight: '600',
    color: '#0d2137',
  },
});
