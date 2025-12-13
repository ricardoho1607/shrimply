// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { LanguageCurrencySync } from '../context/LanguageCurrencySync';
import { SidebarProvider } from '../context/sidebarContext';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { RegularSidebar, BuyerSidebar } from './components/sidebarComponents';

function RootLayoutNav() {
  const { user, loading, isAuthenticated, needsRoleSelection, needsCompanySetup, isBuyer } = useAuth();
  const { t } = useLanguage();
  const segments = useSegments() as string[];
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments?.[0] ?? null;
    const isInTabs = firstSegment === '(tabs)' || segments?.includes('(tabs)');
    const isInAuth = firstSegment === 'auth' || segments?.includes('auth');
    const isInRoleSelection = segments?.includes('roleselection');
    const isInCompanySetup = segments?.includes('company-setup');

    console.log('Auth state:', { isAuthenticated, needsRoleSelection, needsCompanySetup, segments });

    const handleRedirect = (path: string) => {
      setRedirecting(true);
      router.replace(path as any);
    };

    // Authentication flow logic
    if (!isAuthenticated) {
      if (!isInAuth) {
        console.log('Redirecting to auth');
        handleRedirect('/auth');
      }
      return;
    }

    if (needsRoleSelection) {
      if (!isInRoleSelection) {
        console.log('Redirecting to role selection');
        handleRedirect('/roleselection');
      }
      return;
    }

    if (needsCompanySetup) {
      if (!isInCompanySetup) {
        console.log('Redirecting to company setup');
        handleRedirect('/company-setup');
      }
      return;
    }

    if (isInAuth || isInRoleSelection || isInCompanySetup) {
      console.log('Redirecting to main app');
      handleRedirect('/(tabs)');
      return;
    }

    setRedirecting(false);
  }, [isAuthenticated, needsRoleSelection, needsCompanySetup, segments, loading, router]);

  if (loading || redirecting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0F4C75" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#0F4C75' }}>
          {loading ? 'Loading...' : 'Signing in...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#BBE1FA" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="roleselection" />
        <Stack.Screen name="company-setup" />
        <Stack.Screen name="settings" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen
          name="AIChat"
          options={{
            presentation: 'modal',
            headerShown: false,
            headerStyle: { backgroundColor: '#0F4C75' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: t.actions.back,
            title: t.sidebar.aiAssistant
          }}
        />
        <Stack.Screen
          name="ponddetails"
          options={{
            presentation: 'card',
            headerShown: true,
            headerStyle: { backgroundColor: '#0F4C75' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: t.actions.back,
            title: t.shrimp.pondDetails
          }}
        />
        <Stack.Screen
          name="water-quality"
          options={{
            presentation: 'card',
            headerShown: true,
            headerStyle: { backgroundColor: '#0F4C75' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: t.actions.back,
            title: t.nav.waterQuality
          }}
        />
        <Stack.Screen
          name="water-quality-history"
          options={{
            presentation: 'card',
            headerShown: true,
            headerStyle: { backgroundColor: '#0F4C75' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: t.actions.back,
            title: t.shrimp.waterQualityHistory
          }}
        />
        <Stack.Screen
          name="feed-history"
          options={{
            presentation: 'card',
            headerShown: true,
            headerStyle: { backgroundColor: '#0F4C75' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: t.actions.back,
            title: t.shrimp.feedHistory
          }}
        />
        <Stack.Screen
          name="harvestdetails"
          options={{
            presentation: 'card',
            headerShown: true,
            headerStyle: { backgroundColor: '#BBE1FA' },
            headerTintColor: '#1B262C',
            headerBackTitle: t.actions.back,
            title: t.shrimp.harvestDetails
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
      
      {/* Render sidebars at root level - outside of tabs */}
      {isBuyer ? <BuyerSidebar /> : <RegularSidebar />}
    </>
  );
}

export default function RootLayout() {
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
