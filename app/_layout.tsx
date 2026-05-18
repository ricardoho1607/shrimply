// app/_layout.tsx
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { LanguageCurrencySync } from '../context/LanguageCurrencySync';
import { SidebarProvider } from '../context/sidebarContext';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, useWindowDimensions, View } from 'react-native';
import { RegularSidebar, BuyerSidebar, StaticSidebar, StaticBuyerSidebar } from './components/sidebarComponents';

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  });

  const manifest = Updates.manifest;
  const metadata = manifest && 'metadata' in manifest ? manifest.metadata : undefined;
  const extra = manifest && 'extra' in manifest ? manifest.extra : undefined;
  const updateGroup = metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined;
  const scope = Sentry.getGlobalScope();

  scope.setTag('expo-update-id', Updates.updateId ?? 'embedded');
  scope.setTag('expo-is-embedded-update', String(Updates.isEmbeddedLaunch));

  if (typeof updateGroup === 'string') {
    const owner = extra?.expoClient?.owner ?? 'unknown';
    const slug = extra?.expoClient?.slug ?? 'unknown';
    scope.setTag('expo-update-group-id', updateGroup);
    scope.setTag('expo-update-debug-url', `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`);
  } else if (Updates.isEmbeddedLaunch) {
    scope.setTag('expo-update-debug-url', 'embedded-release');
  }
}

if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('findDOMNode')) return;
    originalWarn(...args);
  };
}

function RootLayoutNav() {
  const { user, loading, isAuthenticated, needsRoleSelection, needsSetup, isBuyer } = useAuth();
  const { t } = useLanguage();
  const segments = useSegments() as string[];
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (loading || !rootNavigationState?.key) return;

    const firstSegment = segments?.[0] ?? null;
    const isInAuth = firstSegment === 'auth' || segments?.includes('auth');
    const isInRoleSelection = segments?.includes('roleselection');

    const handleRedirect = (path: string) => {
      router.replace(path as any);
    };

    // Authentication flow logic
    if (!isAuthenticated) {
      if (!isInAuth) {
        handleRedirect('/auth');
      }
      return;
    }

    if (needsRoleSelection) {
      if (!isInRoleSelection) {
        handleRedirect('/roleselection');
      }
      return;
    }

    if (needsSetup) {
      let setupPath = '/company-setup'; // Default for owners

      if (user?.role === 'buyer') {
        setupPath = '/buyersetup';
      } else if (user?.role === 'technician' || user?.role === 'manager' || user?.role === 'admin' || user?.role === 'mechanic') {
        setupPath = '/companysearch';
      }

      const isInSetup = segments?.includes(setupPath.replace('/', ''));
      
      if (!isInSetup) {
        handleRedirect(setupPath);
      }
      return;
    }

    const isInSetup = segments?.includes('company-setup') || segments?.includes('buyersetup') || segments?.includes('companysearch');

    if (isInAuth || isInRoleSelection || isInSetup) {
      handleRedirect(isBuyer ? '/(tabs)/indexbuyer' : '/(tabs)/index');
      return;
    }
  }, [isAuthenticated, needsRoleSelection, needsSetup, segments, loading, router, rootNavigationState?.key, user?.role, isBuyer]);

  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && width > 1024;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f8fc' }}>
        <ActivityIndicator size="large" color="#0d2137" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#0d2137' }}>
          {loading ? 'Loading...' : 'Signing in...'}
        </Text>
      </View>
    );
  }

  const content = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      {/* ... other screens ... */}
      <Stack.Screen name="auth" />
      <Stack.Screen name="roleselection" />
      <Stack.Screen name="company-setup" />
      <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
      <Stack.Screen
        name="AIChat"
        options={{
          presentation: 'modal',
          headerShown: false,
          headerStyle: { backgroundColor: '#0d2137' },
          headerTintColor: '#f4f8fc',
          headerBackTitle: t.actions.back,
          title: t.sidebar.aiAssistant
        }}
      />
      <Stack.Screen
        name="ponddetails"
        options={{
          presentation: 'card',
          headerShown: true,
          headerStyle: { backgroundColor: '#0d2137' },
          headerTintColor: '#f4f8fc',
          headerBackTitle: t.actions.back,
          title: t.shrimp.pondDetails
        }}
      />
      <Stack.Screen
        name="water-quality-history"
        options={{
          presentation: 'card',
          headerShown: true,
          headerStyle: { backgroundColor: '#0d2137' },
          headerTintColor: '#f4f8fc',
          headerBackTitle: t.actions.back,
          title: t.shrimp.waterQualityHistory
        }}
      />
      <Stack.Screen
        name="feed-history"
        options={{
          presentation: 'card',
          headerShown: true,
          headerStyle: { backgroundColor: '#0d2137' },
          headerTintColor: '#f4f8fc',
          headerBackTitle: t.actions.back,
          title: t.shrimp.feedHistory
        }}
      />
      <Stack.Screen
        name="harvestdetails"
        options={{
          presentation: 'card',
          headerShown: true,
          headerStyle: { backgroundColor: '#dce8f2' },
          headerTintColor: '#0d2137',
          headerBackTitle: t.actions.back,
          title: t.shrimp.harvestDetails
        }}
      />
      <Stack.Screen
        name="cycle-report"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="companydetails"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
    </Stack>
  );

  if (isLargeScreen) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#f4f8fc' }}>
        <StatusBar style="dark" backgroundColor="#dce8f2" />
        {isBuyer ? <StaticBuyerSidebar /> : <StaticSidebar />}
        <View style={{ flex: 1 }}>
          {content}
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#dce8f2" />
      {content}
      {/* Render sidebars at root level - outside of tabs */}
      {isBuyer ? <BuyerSidebar /> : <RegularSidebar />}
    </>
  );
}

function RootLayout() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <LanguageCurrencySync>
          <AuthProvider>
            <SidebarProvider>
              <RootLayoutNav />
            </SidebarProvider>
          </AuthProvider>
        </LanguageCurrencySync>
      </CurrencyProvider>
    </LanguageProvider>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
