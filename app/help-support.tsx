import { AppAlert as Alert } from '../components/alerts/appAlert';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const COLORS = {
  background: '#f4f8fc',
  surface: '#FFFFFF',
  navy: '#0F4C75',
  dark: '#0d2137',
  blue: '#3282B8',
  paleBlue: '#EAF4FB',
  border: '#dce8f2',
  muted: '#486581',
  faint: '#627d98',
};

const SUPPORT_EMAIL = 'shrimply.tech@gmail.com';

type HelpTopic = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  details: string[];
};

const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    icon: 'rocket-outline',
    title: 'Getting started',
    description: 'Set up your farm workspace and begin recording reliable data.',
    details: [
      'Complete your company profile and invite the people who work on the farm.',
      'Create a pond and start its cycle before adding daily records.',
      'Use the home dashboard to open a pond, add sampling, mortality, water quality, or feed records.',
    ],
  },
  {
    id: 'pond-operations',
    icon: 'water-outline',
    title: 'Pond operations',
    description: 'Keep daily pond records in one place.',
    details: [
      'Record water quality, feeding, sampling, mortality, and siphon observations by pond.',
      'Review pond history to understand changes across the current cycle.',
      'Use Daily Operations and Cycle Reports when you need a wider farm view.',
    ],
  },
  {
    id: 'orson',
    icon: 'sparkles-outline',
    title: 'Orson AI',
    description: 'Ask questions about your farm and receive context-aware guidance.',
    details: [
      'Orson can use your recent pond, sampling, water-quality, and feed history to explain trends.',
      'Ask focused questions such as what changed, what to check next, or how to prepare for harvest.',
      'Use the AI screen from the quick actions below for a natural back-and-forth conversation.',
    ],
  },
  {
    id: 'water-sampling',
    icon: 'flask-outline',
    title: 'Water quality & sampling',
    description: 'Build a clear picture of shrimp health and growth.',
    details: [
      'Save water-quality observations and sampling records from the pond workspace.',
      'Review growth, MBW, ADG, survival, and feed trends over time.',
      'Upload or confirm lab reports when available so pond alerts and Orson insights have stronger evidence.',
    ],
  },
  {
    id: 'feed-inventory',
    icon: 'fish-outline',
    title: 'Feed & inventory',
    description: 'Track feed usage, stock, additives, and farm assets.',
    details: [
      'Add feed and additives to inventory before recording usage.',
      'Daily feeding reduces the selected inventory stock once the record is saved.',
      'Asset Management keeps equipment ownership, maintenance, photos, and QR history together.',
    ],
  },
  {
    id: 'harvest-finance',
    icon: 'stats-chart-outline',
    title: 'Harvest, finance & reports',
    description: 'Turn production records into decisions and shareable reports.',
    details: [
      'Record partial or final harvests with biomass, size, and pricing details.',
      'Finance brings expenses and revenue together, while projections help with planning.',
      'Export professional pond, sampling, daily operations, cycle, and financial reports when you need them.',
    ],
  },
  {
    id: 'team-sync',
    icon: 'people-outline',
    title: 'Team access & data sync',
    description: 'Keep everyone working from the same farm data.',
    details: [
      'Role-based access keeps each team member focused on the work they are allowed to manage.',
      'The app can keep changes on the device while offline and sync them when the connection returns.',
      'Use Settings for language, backup, restore, and account controls.',
    ],
  },
];

const QUICK_ACTIONS: {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  { id: 'orson', icon: 'sparkles-outline', title: 'Ask Orson', subtitle: 'Talk through a farm question' },
  { id: 'settings', icon: 'settings-outline', title: 'Sync & settings', subtitle: 'Manage backup and app options' },
  { id: 'email', icon: 'mail-outline', title: 'Email support', subtitle: 'Get help from the Shrimply team' },
  { id: 'report', icon: 'bug-outline', title: 'Report a problem', subtitle: 'Send details so we can investigate' },
];

const formatRole = (role?: string) => {
  if (!role) return 'Team member';
  return role
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default function HelpSupportPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { company, user } = useAuth();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>('getting-started');

  const version = Constants.expoConfig?.version || '3.2.0';
  const companyName = company?.companyName?.trim() || 'Farm workspace';
  const userName = user?.name?.trim() || user?.email?.split('@')[0] || 'Shrimply user';

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return HELP_TOPICS;
    return HELP_TOPICS.filter((topic) => [topic.title, topic.description, ...topic.details].join(' ').toLowerCase().includes(query));
  }, [searchQuery]);

  const openSupportEmail = async (kind: 'support' | 'problem') => {
    const subject = kind === 'problem' ? 'Shrimply problem report' : 'Shrimply support request';
    const body = [
      kind === 'problem' ? 'What happened?\n\n' : '',
      'Please add any useful details below. Do not include passwords, one-time codes, or payment card details.\n\n',
      `Account: ${user?.email || 'Not available'}\n`,
      `Workspace: ${companyName}\n`,
      `Role: ${formatRole(user?.role)}\n`,
      `App version: ${version}\n`,
    ].join('');
    const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      if (await Linking.canOpenURL(emailUrl)) {
        await Linking.openURL(emailUrl);
        return;
      }
    } catch {
      // Fall through to the visible support address when no mail app is available.
    }

    Alert.alert('Contact support', `Email us at ${SUPPORT_EMAIL}`);
  };

  const handleQuickAction = (id: string) => {
    if (id === 'orson') {
      router.push('/AIChat' as any);
      return;
    }
    if (id === 'settings') {
      router.push('/settings' as any);
      return;
    }
    void openSupportEmail(id === 'report' ? 'problem' : 'support');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <SafeAreaView style={styles.topSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel={t.actions?.back || 'Go back'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.sidebar?.helpSupport || 'Help & Support'}</Text>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 40) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.faint} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search help topics"
            placeholderTextColor={COLORS.faint}
            style={styles.searchInput}
            accessibilityLabel="Search help topics"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Clear help search">
              <Ionicons name="close-circle" size={20} color={COLORS.faint} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionCaption}>Go straight to the support path you need.</Text>
        </View>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              onPress={() => handleQuickAction(action.id)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={action.title}
            >
              <View style={styles.quickIcon}>
                <Ionicons name={action.icon} size={21} color={COLORS.navy} />
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Learn the workflow</Text>
          <Text style={styles.sectionCaption}>
            {searchQuery ? `${filteredTopics.length} ${filteredTopics.length === 1 ? 'topic' : 'topics'} found` : 'Practical answers for the features you use every day.'}
          </Text>
        </View>

        {filteredTopics.length > 0 ? filteredTopics.map((topic) => {
          const isExpanded = expandedTopic === topic.id;
          return (
            <TouchableOpacity
              key={topic.id}
              style={[styles.topicCard, isExpanded && styles.topicCardExpanded]}
              onPress={() => setExpandedTopic(isExpanded ? null : topic.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
              accessibilityLabel={`${topic.title}. ${isExpanded ? 'Collapse' : 'Expand'}`}
            >
              <View style={styles.topicHeader}>
                <View style={styles.topicIcon}>
                  <Ionicons name={topic.icon} size={21} color={COLORS.navy} />
                </View>
                <View style={styles.topicCopy}>
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  <Text style={styles.topicDescription}>{topic.description}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={19} color={COLORS.faint} />
              </View>
              {isExpanded && (
                <View style={styles.details}>
                  {topic.details.map((detail) => (
                    <View key={detail} style={styles.detailRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.blue} />
                      <Text style={styles.detailText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={26} color={COLORS.blue} />
            <Text style={styles.emptyTitle}>No matching help topics</Text>
            <Text style={styles.emptyText}>Try a broader search or email support with your question.</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={() => void openSupportEmail('support')}>
              <Text style={styles.emptyActionText}>Email support</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.workspaceCard}>
          <View style={styles.workspaceHeader}>
            <View style={styles.workspaceIcon}>
              <Ionicons name="business-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={styles.workspaceHeaderCopy}>
              <Text style={styles.workspaceEyebrow}>YOUR WORKSPACE</Text>
              <Text style={styles.workspaceTitle}>{companyName}</Text>
            </View>
          </View>
          <View style={styles.workspaceRows}>
            <View style={styles.workspaceRow}>
              <Text style={styles.workspaceLabel}>Signed in as</Text>
              <Text style={styles.workspaceValue} numberOfLines={1}>{userName}</Text>
            </View>
            <View style={styles.workspaceRow}>
              <Text style={styles.workspaceLabel}>Role</Text>
              <Text style={styles.workspaceValue}>{formatRole(user?.role)}</Text>
            </View>
            <View style={styles.workspaceRow}>
              <Text style={styles.workspaceLabel}>App version</Text>
              <Text style={styles.workspaceValue}>{version}</Text>
            </View>
          </View>
        </View>

        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Ionicons name="chatbubbles-outline" size={24} color={COLORS.navy} />
          </View>
          <Text style={styles.supportTitle}>Still need a hand?</Text>
          <Text style={styles.supportText}>
            Send us a message and include what you were trying to do. Your workspace, role, and app version will be added automatically.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => void openSupportEmail('support')} accessibilityRole="button" accessibilityLabel="Contact Shrimply support">
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact support</Text>
          </TouchableOpacity>
          <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Shrimply</Text>
          <Text style={styles.footerText}>Aquaculture management for better daily decisions.</Text>
          <Text style={styles.versionText}>Version {version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topSafeArea: { backgroundColor: COLORS.background },
  header: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: COLORS.dark, fontSize: 19, fontWeight: '700' },
  content: { padding: 18, gap: 16 },
  searchBox: { minHeight: 52, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  searchInput: { flex: 1, color: COLORS.dark, fontSize: 15, paddingHorizontal: 10, paddingVertical: Platform.OS === 'android' ? 8 : 12 },
  sectionHeading: { marginTop: 2 },
  sectionTitle: { color: COLORS.dark, fontSize: 18, fontWeight: '800' },
  sectionCaption: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: { width: '48%', minHeight: 124, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  quickIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue, marginBottom: 10 },
  quickTitle: { color: COLORS.dark, fontSize: 14, fontWeight: '800' },
  quickSubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  topicCard: { padding: 14, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  topicCardExpanded: { borderColor: '#b7d4e7' },
  topicHeader: { flexDirection: 'row', alignItems: 'center' },
  topicIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue, marginRight: 12 },
  topicCopy: { flex: 1, paddingRight: 10 },
  topicTitle: { color: COLORS.dark, fontSize: 15, fontWeight: '800' },
  topicDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  details: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText: { flex: 1, color: COLORS.dark, fontSize: 13, lineHeight: 19 },
  emptyState: { padding: 24, alignItems: 'center', borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  emptyTitle: { color: COLORS.dark, fontSize: 15, fontWeight: '800', marginTop: 10 },
  emptyText: { color: COLORS.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  emptyAction: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9, backgroundColor: COLORS.paleBlue },
  emptyActionText: { color: COLORS.navy, fontSize: 13, fontWeight: '800' },
  workspaceCard: { padding: 16, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  workspaceHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  workspaceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue, marginRight: 11 },
  workspaceHeaderCopy: { flex: 1 },
  workspaceEyebrow: { color: COLORS.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  workspaceTitle: { color: COLORS.dark, fontSize: 16, fontWeight: '800', marginTop: 3 },
  workspaceRows: { paddingTop: 2 },
  workspaceRow: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  workspaceLabel: { color: COLORS.muted, fontSize: 12 },
  workspaceValue: { flex: 1, color: COLORS.dark, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  supportCard: { padding: 20, alignItems: 'center', borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  supportIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.paleBlue },
  supportTitle: { color: COLORS.dark, fontSize: 18, fontWeight: '800', marginTop: 12 },
  supportText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  contactButton: { minHeight: 46, paddingHorizontal: 20, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.navy },
  contactButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginLeft: 8 },
  supportEmail: { color: COLORS.blue, fontSize: 12, fontWeight: '700', marginTop: 11 },
  footer: { alignItems: 'center', paddingTop: 4 },
  footerTitle: { color: COLORS.dark, fontSize: 14, fontWeight: '800' },
  footerText: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  versionText: { color: COLORS.faint, fontSize: 10, marginTop: 5 },
});
