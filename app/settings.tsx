// app/settings.tsx - Optimized with consistent Android styles
import { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { migrateOwnCompany } from './utils/migrateOwnCompany';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' }
];

export default function Settings() {
  const router = useRouter();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { company } = useAuth();
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      setIsChangingLanguage(true);
      setShowLanguageOptions(false);
      await setLanguage(languageCode as any);
      Alert.alert(t.messages.success || 'Success', t.settings?.languageChanged || 'Language has been changed successfully!');
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(t.messages.error || 'Error', 'Failed to change language. Please try again.');
      setShowLanguageOptions(true);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  const handleMigration = async () => {
    if (!company) {
      Alert.alert('Error', 'No company found. Please set up your company first.');
      return;
    }

    if (typeof company.primaryLocation === 'object' && company.primaryLocation !== null) {
      Alert.alert(
        'Already Migrated',
        'Your company location is already using the new format with coordinates. No migration needed!',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Migrate Your Company Location?',
      'This will update your company to use the new location format with coordinates. This is necessary for disease outbreak notifications to work properly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate Now',
          onPress: async () => {
            try {
              setIsMigrating(true);
              console.log('Starting migration for company:', company.id);
              
              const result = await migrateOwnCompany(company.id);
              console.log('Migration result:', result);
              
              if (result.needsManualUpdate) {
                Alert.alert(
                  'Migration Partially Complete',
                  result.message,
                  [
                    { text: 'Update Location', onPress: () => router.push('/company-setup2?edit=true' as any) },
                    { text: 'Later', style: 'cancel' },
                  ]
                );
              } else if (result.alreadyMigrated) {
                Alert.alert('Already Up to Date', result.message);
              } else {
                Alert.alert('Migration Complete!', result.message + '\n\nYour farm will now receive disease outbreak notifications based on proximity.');
              }
            } catch (error: any) {
              console.error('Migration failed:', error);
              Alert.alert(
                'Migration Failed', 
                error.message || 'An error occurred during migration. Please try updating your location manually in Company Settings.'
              );
            } finally {
              setIsMigrating(false);
            }
          },
        },
      ]
    );
  };

  const currentLangInfo = AVAILABLE_LANGUAGES.find(lang => lang.code === currentLanguage);

  const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, rightComponent }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={Platform.OS === 'android' ? 20 : 22} color="#3282B8" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && <Ionicons name="chevron-forward" size={Platform.OS === 'android' ? 16 : 18} color="#3282B8" />}
      </View>
    </TouchableOpacity>
  );

  const LanguageSelector = () => (
    <View style={styles.languageSection}>
      <Text style={styles.sectionTitle}>{t.settings?.selectLanguage || 'Select Language'}</Text>
      {AVAILABLE_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.languageOption, currentLanguage === lang.code && styles.selectedLanguageOption]}
          onPress={() => handleLanguageSelect(lang.code)}
          disabled={isChangingLanguage}
        >
          <Text style={styles.languageFlag}>{lang.flag}</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageText, currentLanguage === lang.code && styles.selectedLanguageText]}>
              {lang.nativeName}
            </Text>
            <Text style={styles.languageSubtext}>{lang.name}</Text>
          </View>
          {currentLanguage === lang.code && <Ionicons name="checkmark-circle" size={24} color="#3282B8" />}
          {isChangingLanguage && currentLanguage !== lang.code && <ActivityIndicator size="small" color="#3282B8" />}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#BBE1FA" />
      <SafeAreaView style={styles.topSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B262C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.nav?.settings || 'Settings'}</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.language || 'LANGUAGE & REGION'}</Text>
            <SettingItem
              icon="language-outline"
              title={t.settings?.language || 'Language'}
              subtitle={currentLangInfo?.nativeName || 'English'}
              onPress={() => setShowLanguageOptions(!showLanguageOptions)}
              rightComponent={
                <View style={styles.languageRightContainer}>
                  {isChangingLanguage && <ActivityIndicator size="small" color="#3282B8" style={{ marginRight: 8 }} />}
                  <Text style={styles.currentValue}>{currentLangInfo?.flag} {currentLangInfo?.nativeName}</Text>
                </View>
              }
            />
            {showLanguageOptions && <LanguageSelector />}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.notifications || 'NOTIFICATIONS'}</Text>
            <SettingItem
              icon="notifications-outline"
              title={t.settings?.pushNotifications || 'Push Notifications'}
              subtitle={t.settings?.notificationsSubtitle || 'Receive alerts for pond conditions'}
              showArrow={false}
              rightComponent={
                <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#BBE1FA', true: '#3282B8' }} thumbColor={notificationsEnabled ? '#FFFFFF' : '#F8FAFC'} />
              }
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.dataBackup || 'DATA & BACKUP'}</Text>
            <SettingItem
              icon="cloud-outline"
              title={t.settings?.autoBackup || 'Auto Backup'}
              subtitle={t.settings?.autoBackupSubtitle || 'Automatically sync data to cloud'}
              showArrow={false}
              rightComponent={
                <Switch value={autoBackupEnabled} onValueChange={setAutoBackupEnabled}
                  trackColor={{ false: '#BBE1FA', true: '#3282B8' }} thumbColor={autoBackupEnabled ? '#FFFFFF' : '#F8FAFC'} />
              }
            />
            <SettingItem
              icon="download-outline"
              title={t.settings?.exportData || 'Export Data'}
              subtitle={t.settings?.exportDataSubtitle || 'Download your pond data as CSV'}
              onPress={() => Alert.alert('Export Data', 'Feature coming soon!')}
            />
          </View>

          {company && typeof company.primaryLocation === 'string' && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>DATABASE MIGRATION</Text>
              <View style={styles.migrationCard}>
                <View style={styles.migrationHeader}>
                  <Ionicons name="warning" size={24} color="#f39c12" />
                  <Text style={styles.migrationTitle}>Location Update Required</Text>
                </View>
                <Text style={styles.migrationDescription}>
                  Your company location needs to be updated to the new format. This is required for disease outbreak notifications to work.
                </Text>
                <TouchableOpacity
                  style={[styles.migrationButton, isMigrating && styles.migrationButtonDisabled]}
                  onPress={handleMigration}
                  disabled={isMigrating}
                >
                  {isMigrating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={20} color="#fff" />
                      <Text style={styles.migrationButtonText}>Update My Company Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.app || 'APP'}</Text>
            <SettingItem
              icon="information-circle-outline"
              title={t.settings?.about || 'About investaShrimp'}
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('About', 'investaShrimp v1.0.0\nAquaculture Management System')}
            />
            <SettingItem
              icon="help-circle-outline"
              title={t.settings?.help || 'Help & Support'}
              onPress={() => Alert.alert('Help', 'Contact support: help@investashrimp.com')}
            />
            <SettingItem
              icon="document-text-outline"
              title={t.settings?.privacy || 'Privacy Policy'}
              onPress={() => Alert.alert('Privacy Policy', 'Feature coming soon!')}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>investaShrimp © 2024</Text>
            <Text style={styles.footerSubtext}>
              {t.settings?.madeWith || 'Made with'} 💚 {t.settings?.forAquaculture || 'for aquaculture'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  topSafeArea: { backgroundColor: '#BBE1FA' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#BBE1FA', 
    borderBottomWidth: 0, 
    borderBottomColor: '#3282B8' 
  },
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: '600' 
  },
  headerRight: { width: Platform.OS === 'android' ? 36 : 40 },
  scrollContainer: { flex: 1 },
  section: { marginBottom: Platform.OS === 'android' ? 28 : 32 },
  sectionHeader: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 12 : 13, 
    fontWeight: '600', 
    letterSpacing: 0.5, 
    marginLeft: Platform.OS === 'android' ? 14 : 16, 
    marginBottom: Platform.OS === 'android' ? 7 : 8, 
    marginTop: Platform.OS === 'android' ? 14 : 16 
  },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#BBE1FA' 
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { 
    width: Platform.OS === 'android' ? 30 : 32, 
    height: Platform.OS === 'android' ? 30 : 32, 
    borderRadius: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#F8FAFC', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 1, 
    borderColor: '#BBE1FA' 
  },
  textContainer: { flex: 1 },
  settingTitle: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '500' 
  },
  settingSubtitle: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    marginTop: 2 
  },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  languageRightContainer: { flexDirection: 'row', alignItems: 'center' },
  currentValue: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    marginRight: Platform.OS === 'android' ? 7 : 8 
  },
  languageSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: Platform.OS === 'android' ? 7 : 8, 
    borderWidth: 1, 
    borderColor: '#BBE1FA', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    marginHorizontal: Platform.OS === 'android' ? 14 : 16, 
    overflow: 'hidden' 
  },
  sectionTitle: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#F8FAFC', 
    borderBottomWidth: 1, 
    borderBottomColor: '#BBE1FA' 
  },
  languageOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#BBE1FA' 
  },
  selectedLanguageOption: { backgroundColor: 'rgba(50, 130, 184, 0.1)' },
  languageFlag: { 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    marginRight: Platform.OS === 'android' ? 10 : 12 
  },
  languageTextContainer: { flex: 1 },
  languageText: { 
    color: '#1B262C', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '500' 
  },
  selectedLanguageText: { color: '#0F4C75' },
  languageSubtext: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    marginTop: 2 
  },
  migrationCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Platform.OS === 'android' ? 14 : 16,
    borderRadius: Platform.OS === 'android' ? 10 : 12,
    padding: Platform.OS === 'android' ? 14 : 16,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  migrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 12,
  },
  migrationTitle: {
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '600',
    color: '#1B262C',
    marginLeft: Platform.OS === 'android' ? 10 : 12,
  },
  migrationDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748b',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  migrationButton: {
    backgroundColor: '#3282B8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'android' ? 7 : 8,
    padding: Platform.OS === 'android' ? 12 : 14,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
  },
  migrationButtonDisabled: { opacity: 0.6 },
  migrationButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '600',
  },
  footer: { 
    alignItems: 'center', 
    paddingVertical: Platform.OS === 'android' ? 28 : 32, 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16 
  },
  footerText: { 
    color: '#3282B8', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '500' 
  },
  footerSubtext: { 
    color: '#0F4C75', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginTop: 4 
  },
});