// app/help-support.tsx - Optimized with Compact Header
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';

interface Feature {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  description: string;
  details: string[];
}

const FEATURES: Feature[] = [
  {
    id: 'dashboard',
    icon: 'home',
    title: 'Smart Dashboard',
    color: '#0d2137',
    description: 'Get a comprehensive overview of your farm operations at a glance',
    details: [
      'View summarized data for all ponds on your home screen',
      'Click on any pond to dive into detailed metrics',
      'Real-time updates on pond status and performance',
      'Quick access to critical information'
    ]
  },
  {
    id: 'roles',
    icon: 'people',
    title: 'Role-Based Access Control',
    color: '#315f57',
    description: 'Ensure team accountability with customized access levels',
    details: [
      'Assign specific roles to team members (Owner, Manager, Admin, Technician)',
      'Technicians: Focus on pond operations without finance access',
      'Managers & Admins: View reports without editing pond data',
      'Owners: Full system access and control',
      'Maintain data integrity and operational security'
    ]
  },
  {
    id: 'ai',
    icon: 'sparkles-outline',
    title: 'Shrimply AI Assistant',
    color: '#8E44AD',
    description: 'Your intelligent aquaculture advisor available 24/7',
    details: [
      'Get instant answers to general aquaculture questions',
      'Receive expert guidance on best practices',
      'AI-powered recommendations for pond management',
      'Learn from industry knowledge base'
    ]
  },
  {
    id: 'bioshield',
    icon: 'shield-checkmark',
    title: 'BioShield Disease Tracking',
    color: '#E74C3C',
    description: 'Protect your farm with community-powered disease prevention',
    details: [
      'Track disease outbreaks in your area',
      'Report incidents to alert nearby farms',
      'Receive real-time notifications about threats',
      'Prevent contamination through early warning',
      'Community collaboration for farm safety'
    ]
  },
  {
    id: 'finance',
    icon: 'wallet-outline',
    title: 'Finance Dashboard',
    color: '#27AE60',
    description: 'Comprehensive financial management in one place',
    details: [
      'Track all expenses and revenues centrally',
      'Auto-sync revenue data from Harvest page',
      'Auto-sync expenses from Inventory management',
      'Easy-to-understand financial overview',
      'Make informed business decisions'
    ]
  },
  {
    id: 'financial-reports',
    icon: 'stats-chart-outline',
    title: 'Financial Reports',
    color: '#9B59B6',
    description: 'Generate professional financial reports instantly',
    details: [
      'Create comprehensive financial reports',
      'Export reports in PDF format',
      'Share reports with stakeholders',
      'Multiple report templates available',
      'Professional presentation of financial data'
    ]
  },
  {
    id: 'shrimp-reports',
    icon: 'bar-chart-outline',
    title: 'Shrimp Sampling Reports',
    color: '#9B59B6',
    description: 'Detailed documentation of your shrimp production',
    details: [
      'Generate detailed sampling data reports',
      'Track growth and health metrics over time',
      'Export comprehensive reports in PDF',
      'Share production data with buyers or partners',
      'Maintain complete production records'
    ]
  },
  {
    id: 'feed-inventory',
    icon: 'fish-outline',
    title: 'Feed & Additives Inventory',
    color: '#315f57',
    description: 'Smart inventory management for your feed supplies',
    details: [
      'Track stock levels, prices, and total values',
      'Automatic restock alerts when supplies run low',
      'Calculate monetary value of current inventory',
      'Monitor usage patterns and optimize ordering',
      'Prevent stockouts and reduce waste'
    ]
  },
  {
    id: 'asset-inventory',
    icon: 'construct-outline',
    title: 'Asset Management System',
    color: '#315f57',
    description: 'Complete tracking and management of farm equipment',
    details: [
      'Generate QR codes for each asset',
      'Track maintenance history by scanning QR codes',
      'Transfer assets between team members',
      'View who last used each asset and return dates',
      'Add photos for clear asset identification',
      'Complete audit trail of asset usage'
    ]
  },
  {
    id: 'marketplace',
    icon: 'storefront-outline',
    title: 'Marketplace',
    color: '#F39C12',
    description: 'Connect with buyers and suppliers',
    details: [
      'List your products for sale',
      'Browse available supplies and equipment',
      'Connect with verified buyers',
      'Streamline your sales process',
      'Expand your business network'
    ]
  },
  {
    id: 'languages',
    icon: 'language-outline',
    title: 'Multi-Language Support',
    color: '#16A085',
    description: 'Use the app in your preferred language',
    details: [
      'Available in 5 languages',
      'Switch languages instantly from settings',
      'Full localization of all features',
      'Accessible to diverse teams',
      'No language barriers in farm management'
    ]
  }
];

export default function HelpSupportPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const router = useRouter();

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const contactSupport = async () => {
    const emailUrl = 'mailto:shrimply.tech@gmail.com?subject=Shrimply%20Support%20Request';
    const canOpen = await Linking.canOpenURL(emailUrl);

    if (canOpen) {
      await Linking.openURL(emailUrl);
      return;
    }

    Alert.alert('Contact Support', 'Email us at shrimply.tech@gmail.com');
  };

  const FeatureCard = ({ feature }: { feature: Feature }) => {
    const isExpanded = expandedSection === feature.id;

    return (
      <TouchableOpacity style={styles.featureCard} onPress={() => toggleSection(feature.id)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
            <Ionicons name={feature.icon} size={Platform.OS === 'android' ? 24 : 26} color={feature.color} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={1}>{feature.description}</Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#315f57" />
        </View>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            {feature.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <View style={[styles.bullet, { backgroundColor: feature.color }]} />
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0d2137" />
          </TouchableOpacity>
          <Ionicons name="help-circle" size={24} color="#0d2137" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Discover all the powerful features of Shrimply
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Ionicons name="information-circle" size={20} color="#0d2137" />
          <Text style={styles.welcomeText}>
            Tap on any feature below to learn more about how it can help you manage your aquaculture operations more efficiently.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Features Overview</Text>

        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}

        <View style={styles.supportCard}>
          <Ionicons name="mail-outline" size={24} color="#0d2137" />
          <Text style={styles.supportTitle}>Need More Help?</Text>
          <Text style={styles.supportText}>
            Cannot find what you are looking for? Our support team is here to help you.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={contactSupport}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Shrimply Aquaculture Management</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { 
    backgroundColor: '#f4f8fc', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'android' ? 10 : 12,
    paddingBottom: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#0d2137', 
    flex: 1,
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: '#315f57', 
    marginTop: 4,
    marginLeft: 40, 
  },
  scrollView: { flex: 1 },
  scrollContent: { 
    padding: 16, 
    paddingBottom: 32 
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#0d2137',
    alignItems: 'center'
  },
  welcomeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#0d2137',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d2137',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8f2f9',
    shadowColor: '#315f57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0d2137',
  },
  cardDescription: {
    fontSize: 12,
    color: '#315f57',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dce8f2',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: '#0d2137',
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8f2f9',
    shadowColor: '#315f57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d2137',
    marginTop: 10,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 13,
    color: '#315f57',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#0d2137',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dce8f2',
  },
  footerText: {
    fontSize: 13,
    color: '#315f57',
    fontWeight: '600',
  },
  versionText: {
    fontSize: 11,
    color: '#dce8f2',
    marginTop: 4,
  },
});
