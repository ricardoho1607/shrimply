// app/settings.tsx - Optimized with consistent Android styles
import { useEffect, useMemo, useState } from 'react';
import { getPondSummaryScope } from '../shared/pondSummaryScope';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency, CURRENCIES, Currency } from '../context/CurrencyContext';
import { migrateOwnCompany } from './utils/migrateOwnCompany';
import { useAuth } from '../context/AuthContext';
import { getPondCurrentDoc, hasWaterQualityData, usePondStore } from './store/pondStore';
import { exportPondReportPDF } from './services/pondReportExportService';
import { useCurrentTime } from './hooks/useCurrentTime';
import { useFarmDateKey } from './hooks/useFarmDateKey';
import { useDataBackup } from './hooks/useDataBackup';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import firebaseApp, { db } from '../config/firebase';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ไทย' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', nativeName: 'Tiếng Việt' }
];

interface ActivitySummary {
  totalSeconds: number;
  lastSeenAt: Date | null;
}

interface CompanyPlanSummary {
  entitlements: {
    planId: string;
    planName: string;
    pondLimit: number | null;
    orson: { monthlyTotal: number | null };
    complimentaryAccess?: { planId: string; expiresAt: string; basePlanId: string } | null;
  };
  usage: { physicalPonds: number; orsonMonthly: number };
}

const ACTIVITY_ACTIVE_WINDOW_MS = 5 * 60 * 1000;

const toActivityDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const formatActivityHours = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0h';
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
  return `${Math.max(1, Math.round(seconds / 60))}m`;
};

const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, rightComponent }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={Platform.OS === 'android' ? 20 : 22} color="#315f57" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && <Ionicons name="chevron-forward" size={Platform.OS === 'android' ? 16 : 18} color="#315f57" />}
      </View>
    </TouchableOpacity>
  );

export default function Settings() {
  const router = useRouter();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { currentCurrency, currencyConfig, setCurrency, autoSyncEnabled, setAutoSyncEnabled } = useCurrency();
  const { company, user } = useAuth();
  const canViewActivity = Platform.OS !== 'web' && ['owner', 'co-owner', 'manager', 'admin'].includes(user?.role || '');
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [isChangingCurrency, setIsChangingCurrency] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const { ponds, physicalPonds, calculatePondMetricsWithHarvest } = usePondStore();
  const { manualRestore, isRestoring } = useDataBackup();
  const [isExporting, setIsExporting] = useState(false);
  const [activitySource, setActivitySource] = useState<{ companyId: string; rows: ActivitySummary[] } | null>(null);
  const activitySummaries = canViewActivity && activitySource && activitySource.companyId === company?.id ? activitySource.rows : [];
  const [planSummary, setPlanSummary] = useState<CompanyPlanSummary | null>(null);
  const farmToday = useFarmDateKey(company?.timeZone);
  const currentCompanyId = company?.id;

  useEffect(() => {
    let active = true;
    if (!currentCompanyId) {
      queueMicrotask(() => setPlanSummary(null));
      return () => { active = false; };
    }
    const loadPlan = async () => {
      try {
        const callable = httpsCallable<{ companyId: string }, CompanyPlanSummary>(
          getFunctions(firebaseApp),
          'getCompanyBillingSummary',
        );
        const result = await callable({ companyId: currentCompanyId });
        if (active) setPlanSummary(result.data);
      } catch (error) {
        console.log('Failed to load company plan:', error);
      }
    };
    void loadPlan();
    const refresh = setInterval(() => void loadPlan(), 60000);
    return () => { active = false; clearInterval(refresh); };
  }, [currentCompanyId]);

  useEffect(() => {
    if (!canViewActivity || !company?.id) {
      return;
    }

    const activityQuery = query(
      collection(db, 'companies', company.id, 'userActivityDaily'),
      where('dateKey', '==', farmToday)
    );

    const unsubscribe = onSnapshot(activityQuery, (snapshot) => {
      setActivitySource({ companyId: company.id, rows: snapshot.docs.map((summaryDoc) => {
        const data = summaryDoc.data();
        return {
          totalSeconds: typeof data.totalSeconds === 'number' && Number.isFinite(data.totalSeconds) ? data.totalSeconds : 0,
          lastSeenAt: toActivityDate(data.lastSeenAt),
        };
      }) });
    }, (error) => {
      console.log('Failed to load settings activity summary:', error);
      setActivitySource({ companyId: company.id, rows: [] });
    });

    return unsubscribe;
  }, [canViewActivity, company?.id, farmToday]);

  const nowMs = useCurrentTime();
  const activityStatusLine = useMemo(() => {
    const totalSeconds = activitySummaries.reduce((sum, summary) => sum + summary.totalSeconds, 0);
    const activeNow = activitySummaries.filter((summary) => {
      const lastSeenMs = summary.lastSeenAt?.getTime() ?? 0;
      return lastSeenMs > 0 && nowMs - lastSeenMs <= ACTIVITY_ACTIVE_WINDOW_MS;
    }).length;

    if (activitySummaries.length === 0) return t.activityTracker?.noActivityToday || 'No mobile activity tracked today.';
    return `${activeNow} active now · ${formatActivityHours(totalSeconds)} today`;
  }, [nowMs, activitySummaries, t.activityTracker?.noActivityToday]);

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

  const handleCurrencySelect = async (currencyCode: Currency) => {
    try {
      setIsChangingCurrency(true);
      setShowCurrencyOptions(false);
      await setCurrency(currencyCode);
      Alert.alert(
        t.messages.success || 'Success',
        `Currency changed to ${CURRENCIES[currencyCode].name}.\n\n⚠️ Note: Only the currency symbol is changed. Your numeric values remain unchanged.`
      );
    } catch (error) {
      console.error('Failed to change currency:', error);
      Alert.alert(t.messages.error || 'Error', 'Failed to change currency. Please try again.');
      setShowCurrencyOptions(true);
    } finally {
      setIsChangingCurrency(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    await setAutoSyncEnabled(enabled);
    if (enabled) {
      Alert.alert(
        'Auto-sync Enabled',
        'Currency will now automatically change when you select a different language.'
      );
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
                'An error occurred during migration. Please try updating your location manually in Company Settings.'
              );
            } finally {
              setIsMigrating(false);
            }
          },
        },
      ]
    );
  };

  const handleExportPondData = async () => {
    if (ponds.length === 0 && physicalPonds.length === 0) {
      Alert.alert(t.messages.error || 'Error', 'No pond data available to export.');
      return;
    }

    try {
      setIsExporting(true);
      
      const scope = getPondSummaryScope(ponds, physicalPonds);
      const reportPonds = scope.activePonds.map(pond => {
        const metrics = calculatePondMetricsWithHarvest(pond);
        const doc = getPondCurrentDoc(pond, company?.timeZone);
        
        // Get latest water quality record
        const latestWQ = pond.samplings
          .filter(hasWaterQualityData)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          name: pond.pondName,
          area: pond.pondArea,
          density: pond.density,
          doc: doc,
          population: metrics.currentPopulation,
          biomass: metrics.currentBiomass,
          sr: metrics.adjustedSR.toFixed(1),
          fcr: metrics.adjustedFCR.toFixed(2),
          waterQuality: {
            doMorning: latestWQ?.doMorning || '',
            doEvening: latestWQ?.doEvening || '',
            phMorning: latestWQ?.phMorning || '',
            phEvening: latestWQ?.phEvening || '',
            transparency: latestWQ?.transparency || '',
            salinity: latestWQ?.salinity || '',
          }
        };
      });

      const totalArea = scope.totalArea;
      const totalBiomass = reportPonds.reduce((sum, p) => sum + p.biomass, 0);
      const avgSR = reportPonds.length ? reportPonds.reduce((sum, p) => sum + parseFloat(p.sr), 0) / reportPonds.length : null;

      await exportPondReportPDF({
        companyName: company?.companyName || 'My Farm',
        reportDate: new Date().toISOString(),
        totalPonds: scope.totalPonds,
        totalArea,
        totalBiomass,
        avgSR,
        ponds: reportPonds,
      }, currentLanguage);

    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(t.messages.error || 'Error', error instanceof Error ? error.message : 'Failed to generate pond report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualRestore = () => {
    Alert.alert('Restore Data', 'This will replace your current local data with data from the cloud. Only use this if you are recovering data or fixing a sync issue.', [
      { text: t.actions?.cancel || 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        style: 'destructive',
        onPress: async () => {
          try {
            await manualRestore();
            Alert.alert(t.messages?.success || 'Success', 'Data restored successfully.');
          } catch (error: any) {
            console.error('Restore failed:', error);
            Alert.alert('Restore Failed', 'Failed to restore data. Please try again.');
          }
        }
      }
    ]);
  };

  const currentLangInfo = AVAILABLE_LANGUAGES.find(lang => lang.code === currentLanguage);



  const renderLanguageSelector = () => (
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
          {currentLanguage === lang.code && <Ionicons name="checkmark-circle" size={24} color="#315f57" />}
          {isChangingLanguage && currentLanguage !== lang.code && <ActivityIndicator size="small" color="#315f57" />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCurrencySelector = () => (
    <View style={styles.languageSection}>
      <Text style={styles.sectionTitle}>{'Select Currency'}</Text>
      {Object.values(CURRENCIES).map((curr) => (
        <TouchableOpacity
          key={curr.code}
          style={[styles.languageOption, currentCurrency === curr.code && styles.selectedLanguageOption]}
          onPress={() => handleCurrencySelect(curr.code)}
          disabled={isChangingCurrency}
        >
          <Text style={styles.languageFlag}>{curr.flag}</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageText, currentCurrency === curr.code && styles.selectedLanguageText]}>
              {curr.name}
            </Text>
            <Text style={styles.languageSubtext}>{curr.symbol} ({curr.code})</Text>
          </View>
          {currentCurrency === curr.code && <Ionicons name="checkmark-circle" size={24} color="#315f57" />}
          {isChangingCurrency && currentCurrency !== curr.code && <ActivityIndicator size="small" color="#315f57" />}
        </TouchableOpacity>
      ))}
    </View>
  );

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
          <Text style={styles.headerTitle}>{t.nav?.settings || 'Settings'}</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
                  {isChangingLanguage && <ActivityIndicator size="small" color="#315f57" style={{ marginRight: 8 }} />}
                  <Text style={styles.currentValue}>{currentLangInfo?.flag} {currentLangInfo?.nativeName}</Text>
                </View>
              }
            />
            {showLanguageOptions && renderLanguageSelector()}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{'CURRENCY & FORMAT'}</Text>
            <SettingItem
              icon="cash-outline"
              title={'Currency'}
              subtitle={currencyConfig.name}
              onPress={() => setShowCurrencyOptions(!showCurrencyOptions)}
              rightComponent={
                <View style={styles.languageRightContainer}>
                  {isChangingCurrency && <ActivityIndicator size="small" color="#315f57" style={{ marginRight: 8 }} />}
                  <Text style={styles.currentValue}>{currencyConfig.symbol} {currencyConfig.code}</Text>
                </View>
              }
            />
            {showCurrencyOptions && renderCurrencySelector()}
            
            <SettingItem
              icon="sync-outline"
              title={'Auto-sync with Language'}
              subtitle={'Currency changes when language changes'}
              showArrow={false}
              rightComponent={
                <Switch 
                  value={autoSyncEnabled} 
                  onValueChange={handleAutoSyncToggle}
                  trackColor={{ false: '#dbe7df', true: '#315f57' }} 
                  thumbColor={autoSyncEnabled ? '#FFFFFF' : '#f4f8fc'} 
                />
              }
            />
            
            <View style={styles.currencyNote}>
              <Ionicons name="information-circle-outline" size={16} color="#95A5A6" />
              <Text style={styles.currencyNoteText}>
                ⚠️ Changing currency only updates the symbol. Your numeric values remain unchanged.
              </Text>
            </View>
          </View>

          {planSummary && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>COMPANY PLAN</Text>
              <SettingItem
                icon="card-outline"
                title={`${planSummary.entitlements.planName} plan`}
                subtitle={`${planSummary.usage.physicalPonds} / ${planSummary.entitlements.pondLimit ?? 'Unlimited'} ponds · ${planSummary.usage.orsonMonthly} / ${planSummary.entitlements.orson.monthlyTotal ?? 'Unlimited'} Orson requests this month${planSummary.entitlements.planId === 'lifetime' ? ' · No payment or renewal required' : ''}${planSummary.entitlements.complimentaryAccess ? ` · Complimentary ${planSummary.entitlements.complimentaryAccess.planId} until ${new Date(planSummary.entitlements.complimentaryAccess.expiresAt).toLocaleDateString()}` : ''}`}
                showArrow={false}
              />
              <View style={styles.planNote}>
                <Ionicons name="people-outline" size={17} color="#0F4C75" />
                <Text style={styles.planNoteText}>Unlimited company users. The company owner manages payments on the Shrimply website.</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.notifications || 'NOTIFICATIONS'}</Text>
            <SettingItem
              icon="notifications-outline"
              title={t.settings?.notifications || 'Notifications'}
              subtitle="Review farm alerts in Notifications. Device notification permissions are managed in your phone settings."
              showArrow={false}
            />
            {canViewActivity && (
              <SettingItem
                icon="time-outline"
                title={t.activityTracker?.title || 'Team activity'}
                subtitle={activityStatusLine}
                showArrow={false}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{t.settings?.dataBackup || 'DATA & BACKUP'}</Text>
            <SettingItem
              icon="cloud-outline"
              title="Cloud synchronization"
              subtitle="Farm records sync automatically when connected. Pending changes remain on this device until synchronized."
              showArrow={false}
            />
            <SettingItem
              icon="document-text-outline"
              title={t.settings?.exportData || 'Export Data'}
              subtitle={'Download comprehensive pond report as PDF'}
              onPress={handleExportPondData}
              rightComponent={isExporting ? <ActivityIndicator size="small" color="#315f57" /> : null}
            />
            <SettingItem
              icon="cloud-download-outline"
              title={t.sidebar?.restoreFromCloud || t.settings?.restoreFromCloud || 'Restore from Cloud'}
              subtitle={'Advanced recovery option. This can overwrite local data.'}
              onPress={handleManualRestore}
              rightComponent={isRestoring ? <ActivityIndicator size="small" color="#315f57" /> : null}
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
              title={t.settings?.about || 'About Shrimply'}
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('About', 'Shrimply v1.0.0\nAquaculture Management System')}
            />
            <SettingItem
              icon="help-circle-outline"
              title={t.settings?.help || 'Help & Support'}
              onPress={() => Alert.alert('Help', 'Contact support: shrimply.tech@gmail.com')}
            />
            <SettingItem
              icon="document-text-outline"
              title={t.settings?.privacy || 'Privacy Policy'}
              onPress={() => Alert.alert(
                'Privacy Policy',
                'Shrimply uses account, farm, marketplace, and permission data only to provide app features. For privacy questions, contact shrimply.tech@gmail.com.'
              )}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Shrimply © 2024</Text>
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
  outerContainer: { flex: 1, backgroundColor: '#f4f8fc' },
  topSafeArea: { backgroundColor: '#dce8f2' },
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  header: { 
  flexDirection: 'row', 
  alignItems: 'center', 
  justifyContent: 'space-between', 
  paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
  paddingTop: Platform.OS === 'android' ? 14 : 16, 
  paddingBottom: Platform.OS === 'android' ? 7 : 8, 
  backgroundColor: '#dce8f2', 
  borderBottomWidth: 0, 
  borderBottomColor: '#315f57' 
},
  backButton: { padding: Platform.OS === 'android' ? 7 : 8 },
  headerTitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 17 : 18, 
    fontWeight: '600' 
  },
  headerRight: { width: Platform.OS === 'android' ? 36 : 40 },
  scrollContainer: { flex: 1 },
  section: { marginBottom: Platform.OS === 'android' ? 28 : 32 },
  sectionHeader: { 
    color: '#315f57', 
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
    borderBottomColor: '#dce8f2' 
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { 
    width: Platform.OS === 'android' ? 30 : 32, 
    height: Platform.OS === 'android' ? 30 : 32, 
    borderRadius: Platform.OS === 'android' ? 7 : 8, 
    backgroundColor: '#f4f8fc', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Platform.OS === 'android' ? 10 : 12, 
    borderWidth: 1, 
    borderColor: '#e8f2f9' 
  },
  textContainer: { flex: 1 },
  settingTitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '500' 
  },
  settingSubtitle: { 
    color: '#315f57', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    marginTop: 2 
  },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  languageRightContainer: { flexDirection: 'row', alignItems: 'center' },
  currentValue: { 
    color: '#315f57', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    marginRight: Platform.OS === 'android' ? 7 : 8 
  },
  languageSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: Platform.OS === 'android' ? 7 : 8, 
    borderWidth: 1, 
    borderColor: '#e8f2f9', 
    borderRadius: Platform.OS === 'android' ? 10 : 12, 
    marginHorizontal: Platform.OS === 'android' ? 14 : 16, 
    overflow: 'hidden' 
  },
  sectionTitle: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '600', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    backgroundColor: '#f4f8fc', 
    borderBottomWidth: 1, 
    borderBottomColor: '#dce8f2' 
  },
  languageOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: Platform.OS === 'android' ? 14 : 16, 
    paddingVertical: Platform.OS === 'android' ? 10 : 12, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#dce8f2' 
  },
  selectedLanguageOption: { backgroundColor: 'rgba(50, 130, 184, 0.1)' },
  languageFlag: { 
    fontSize: Platform.OS === 'android' ? 22 : 24, 
    marginRight: Platform.OS === 'android' ? 10 : 12 
  },
  languageTextContainer: { flex: 1 },
  languageText: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 15 : 16, 
    fontWeight: '500' 
  },
  selectedLanguageText: { color: '#0d2137' },
  languageSubtext: { 
    color: '#315f57', 
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
    color: '#0d2137',
    marginLeft: Platform.OS === 'android' ? 10 : 12,
  },
  migrationDescription: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    color: '#64748b',
    marginBottom: Platform.OS === 'android' ? 14 : 16,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  migrationButton: {
    backgroundColor: '#315f57',
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
    color: '#315f57', 
    fontSize: Platform.OS === 'android' ? 13 : 14, 
    fontWeight: '500' 
  },
  footerSubtext: { 
    color: '#0d2137', 
    fontSize: Platform.OS === 'android' ? 11 : 12, 
    marginTop: 4 
  },
  currencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: Platform.OS === 'android' ? 12 : 14,
    marginHorizontal: Platform.OS === 'android' ? 14 : 16,
    marginTop: Platform.OS === 'android' ? 10 : 12,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    borderWidth: 1,
    borderColor: '#FFE066',
    gap: Platform.OS === 'android' ? 9 : 10,
  },
  currencyNoteText: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 12 : 13,
    color: '#856404',
    lineHeight: Platform.OS === 'android' ? 16 : 18,
  },
  planNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EAF5FC',
    padding: Platform.OS === 'android' ? 12 : 14,
    marginHorizontal: Platform.OS === 'android' ? 14 : 16,
    marginTop: Platform.OS === 'android' ? 8 : 10,
    borderRadius: Platform.OS === 'android' ? 9 : 10,
    gap: Platform.OS === 'android' ? 8 : 10,
  },
  planNoteText: {
    flex: 1,
    color: '#0F4C75',
    fontSize: Platform.OS === 'android' ? 12 : 13,
    lineHeight: Platform.OS === 'android' ? 17 : 19,
  },
});
