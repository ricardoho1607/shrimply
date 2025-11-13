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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';

interface RoleOption {
  id: 'owner' | 'technician' | 'manager' | 'admin' | 'buyer';
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  requiresCompany: boolean;
}

export default function RoleSelectionScreen() {
  const { completeRoleSelection, user } = useAuth();
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
      color: '#0F4C75',
      features: [
        t.roleSelection.ownerFeature1,
        t.roleSelection.ownerFeature2,
        t.roleSelection.ownerFeature3,
        t.roleSelection.ownerFeature4,
      ],
      requiresCompany: false
    },
    {
      id: 'technician',
      title: t.roleSelection.aquacultureTechnician,
      description: t.roleSelection.technicianDesc,
      icon: 'flask-outline',
      color: '#3282B8',
      features: [
        t.roleSelection.technicianFeature1,
        t.roleSelection.technicianFeature2,
        t.roleSelection.technicianFeature3,
        t.roleSelection.technicianFeature4,
      ],
      requiresCompany: true
    },
    {
      id: 'manager',
      title: t.roleSelection.manager,
      description: t.roleSelection.managerDesc,
      icon: 'people-outline',
      color: '#BBE1FA',
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
      color: '#1B262C',
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

      // If role requires company (technician, manager, admin), navigate to company search
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
        error.message || t.roleSelection.failedToSetup,
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/iShrimpLogo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{t.roleSelection.welcomeTitle}</Text>
          <Text style={styles.subtitle}>{t.roleSelection.welcomeSubtitle}</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#0F4C75',
    overflow: 'hidden',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#3282B8',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  // Role cards
  rolesContainer: {
    gap: 20,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#BBE1FA',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: '#0F4C75',
    shadowOpacity: 0.1,
    elevation: 4,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#3282B8',
  },
  // Features
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#1B262C',
    marginLeft: 8,
    flex: 1,
  },
  // Company required badge
  companyRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  companyRequiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f39c12',
    marginLeft: 6,
  },
  // Select button
  selectButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Help section
  helpSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBE1FA',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#3282B8',
    lineHeight: 22,
  },
  helpBold: {
    fontWeight: '600',
    color: '#0F4C75',
  },
});