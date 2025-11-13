// app/help-support.tsx - Optimized with consistent Android styles
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';

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
    color: '#0F4C75',
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
    color: '#3282B8',
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
    color: '#3282B8',
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
    color: '#3282B8',
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

  const FeatureCard = ({ feature }: { feature: Feature }) => {
    const isExpanded = expandedSection === feature.id;

    return (
      <TouchableOpacity style={styles.featureCard} onPress={() => toggleSection(feature.id)} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: feature.color + '15' }]}>
            <Ionicons name={feature.icon} size={Platform.OS === 'android' ? 26 : 28} color={feature.color} />
          </View>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color="#3282B8" />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F4C75" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="help-circle" size={Platform.OS === 'android' ? 30 : 32} color="#0F4C75" />
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Discover all the powerful features of Shrimply
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Ionicons name="information-circle" size={24} color="#0F4C75" />
          <Text style={styles.welcomeText}>
            Tap on any feature below to learn more about how it can help you manage your aquaculture operations more efficiently.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Features Overview</Text>

        {FEATURES.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}

        <View style={styles.supportCard}>
          <Ionicons name="mail-outline" size={24} color="#0F4C75" />
          <Text style={styles.supportTitle}>Need More Help?</Text>
          <Text style={styles.supportText}>
            Can't find what you're looking for? Our support team is here to help you.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24, 
    paddingVertical: Platform.OS === 'android' ? 16 : 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  backButton: { marginBottom: Platform.OS === 'android' ? 10 : 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { 
    fontSize: Platform.OS === 'android' ? 26 : 28, 
    fontWeight: 'bold', 
    color: '#1B262C', 
    marginLeft: Platform.OS === 'android' ? 10 : 12 
  },
  headerSubtitle: { 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    color: '#3282B8', 
    marginTop: 4 
  },
  scrollView: { flex: 1 },
  scrollContent: { 
    padding: Platform.OS === 'android' ? 14 : 16, 
    paddingBottom: Platform.OS === 'android' ? 28 : 32 
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 20 : 24,
    borderLeftWidth: 4,
    borderLeftColor: '#0F4C75',
  },
  welcomeText: {
    flex: 1,
    marginLeft: Platform.OS === 'android' ? 10 : 12,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#1B262C',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 20,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    paddingHorizontal: 4,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    marginBottom: Platform.OS === 'android' ? 10 : 12,
    borderWidth: 1,
    borderColor: '#BBE1FA',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: Platform.OS === 'android' ? 52 : 56,
    height: Platform.OS === 'android' ? 52 : 56,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'android' ? 10 : 12,
  },
  cardTitleContainer: { flex: 1 },
  cardTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: 'bold',
    color: '#1B262C',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#3282B8',
    lineHeight: Platform.OS === 'android' ? 16 : 18,
  },
  detailsContainer: {
    marginTop: Platform.OS === 'android' ? 14 : 16,
    paddingTop: Platform.OS === 'android' ? 14 : 16,
    borderTopWidth: 1,
    borderTopColor: '#BBE1FA',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  bullet: {
    width: Platform.OS === 'android' ? 5 : 6,
    height: Platform.OS === 'android' ? 5 : 6,
    borderRadius: 3,
    marginTop: Platform.OS === 'android' ? 5 : 6,
    marginRight: Platform.OS === 'android' ? 10 : 12,
  },
  detailText: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#1B262C',
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  supportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 20 : 24,
    marginTop: Platform.OS === 'android' ? 20 : 24,
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBE1FA',
    shadowColor: '#0F4C75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  supportTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: 'bold',
    color: '#1B262C',
    marginTop: Platform.OS === 'android' ? 10 : 12,
    marginBottom: Platform.OS === 'android' ? 7 : 8,
  },
  supportText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#3282B8',
    textAlign: 'center',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  contactButton: {
    flexDirection: 'row',
    backgroundColor: '#0F4C75',
    paddingHorizontal: Platform.OS === 'android' ? 20 : 24,
    paddingVertical: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 7 : 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    marginLeft: Platform.OS === 'android' ? 7 : 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 14 : 16,
    paddingTop: Platform.OS === 'android' ? 14 : 16,
    borderTopWidth: 1,
    borderTopColor: '#BBE1FA',
  },
  footerText: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#3282B8',
    fontWeight: '600',
  },
  versionText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    color: '#BBE1FA',
    marginTop: 4,
  },
});